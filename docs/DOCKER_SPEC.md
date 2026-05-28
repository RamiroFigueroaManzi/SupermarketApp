# Especificación Docker — SuperMarket App
**Versión:** 1.0  
**Fecha:** 2026-05-28  
**Estado:** Borrador para revisión

---

## 1. Servicios definidos

| Servicio | Imagen base | Puerto expuesto | Descripción |
|----------|------------|-----------------|-------------|
| `app` | node:20-alpine (custom) | 3000 (interno) | Next.js + Socket.io custom server |
| `db` | postgres:16-alpine | 5432 (interno) | PostgreSQL, datos en volume |
| `nginx` | nginx:1.25-alpine | 80, 443 (host) | Proxy inverso, SSL termination |

En desarrollo, `nginx` se omite y el puerto 3000 se expone directamente al host.

---

## 2. Archivos Docker

### 2.1 `Dockerfile` (producción — multi-stage)

```dockerfile
# ── Stage 1: dependencias ──────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# ── Stage 2: build ────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Genera el cliente Prisma y construye Next.js
RUN npx prisma generate
RUN npm run build

# ── Stage 3: runner (imagen final) ────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Usuario sin privilegios de root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Artefactos de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Servidor custom y Prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=deps    /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

# Ejecuta el servidor custom en lugar de `next start`
CMD ["node", "server.js"]
```

> **Nota:** `next build` con `output: 'standalone'` en `next.config.js` genera una carpeta `standalone` que incluye solo las dependencias necesarias para producción, reduciendo el tamaño de la imagen final.

---

### 2.2 `Dockerfile.dev` (desarrollo con hot reload)

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Instala dependencias del sistema para Prisma
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

# Modo desarrollo con hot reload
CMD ["npm", "run", "dev"]
```

---

### 2.3 `docker-compose.yml` (producción)

```yaml
version: '3.9'

services:

  db:
    image: postgres:16-alpine
    container_name: supermarket_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: supermarket_app
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      NODE_ENV: production
    networks:
      - internal
    # Puerto NO expuesto al host — nginx hace de intermediario

  nginx:
    image: nginx:1.25-alpine
    container_name: supermarket_nginx
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/certs:/etc/nginx/certs:ro   # certificados SSL
    networks:
      - internal

volumes:
  postgres_data:

networks:
  internal:
    driver: bridge
```

---

### 2.4 `docker-compose.dev.yml` (desarrollo)

```yaml
version: '3.9'

services:

  db:
    image: postgres:16-alpine
    container_name: supermarket_db_dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: supermarket
      POSTGRES_PASSWORD: supermarket_dev
      POSTGRES_DB: supermarket_dev
    ports:
      - "5432:5432"    # expuesto al host para usar herramientas como DBeaver
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U supermarket -d supermarket_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: supermarket_app_dev
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://supermarket:supermarket_dev@db:5432/supermarket_dev
      NEXTAUTH_SECRET: dev-secret-change-in-prod
      NEXTAUTH_URL: http://localhost:3000
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      NODE_ENV: development
    ports:
      - "3000:3000"    # acceso directo sin nginx en dev
    volumes:
      - .:/app         # mount del código fuente para hot reload
      - /app/node_modules
      - /app/.next
    stdin_open: true
    tty: true

volumes:
  postgres_data_dev:
```

---

### 2.5 `docker/nginx/nginx.conf`

```nginx
events {
  worker_connections 1024;
}

http {
  upstream app {
    server app:3000;
  }

  # Redirige HTTP a HTTPS
  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Límite de tamaño para subida de imágenes (fotos de listas)
    client_max_body_size 10M;

    # Proxy para Socket.io (requiere upgrade de protocolo)
    location /socket.io/ {
      proxy_pass         http://app;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection "upgrade";
      proxy_set_header   Host $host;
      proxy_cache_bypass $http_upgrade;
    }

    # Proxy para el resto de la app
    location / {
      proxy_pass         http://app;
      proxy_http_version 1.1;
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }
  }
}
```

---

### 2.6 `.dockerignore`

```
node_modules
.next
.git
.gitignore
*.md
.env
.env.local
docker-compose*.yml
Dockerfile*
docs/
```

---

### 2.7 `.env.example`

```bash
# PostgreSQL (solo producción — en dev están hardcodeados en docker-compose.dev.yml)
POSTGRES_USER=supermarket
POSTGRES_PASSWORD=CAMBIA_ESTO
POSTGRES_DB=supermarket

# Prisma (construida automáticamente desde las vars de arriba)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

# NextAuth
NEXTAUTH_SECRET=CAMBIA_ESTO_string_larga_aleatoria
NEXTAUTH_URL=https://tu-dominio.com

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# Gemini (https://ai.google.dev)
GEMINI_API_KEY=AIzaSy-xxxx
```

---

## 3. Flujos de uso

### 3.1 Levantar entorno de desarrollo

```bash
# Primera vez
cp .env.example .env
# Completar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GEMINI_API_KEY en .env

docker compose -f docker-compose.dev.yml up --build

# En otra terminal: correr migraciones y seed
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev
docker compose -f docker-compose.dev.yml exec app npx prisma db seed
```

La app queda disponible en `http://localhost:3000`.  
El hot reload funciona porque el código fuente está montado como volume.

---

### 3.2 Levantar entorno de producción

```bash
cp .env.example .env
# Completar TODAS las variables en .env, incluyendo contraseñas seguras

# (Opcional) Agregar certificados SSL en docker/nginx/certs/

docker compose up --build -d

# Migraciones al iniciar (solo primera vez o tras cambios de schema)
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

---

### 3.3 Comandos útiles

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs solo de la app
docker compose logs -f app

# Conectarse al shell de la DB
docker compose exec db psql -U supermarket -d supermarket

# Detener todo
docker compose down

# Detener y eliminar volúmenes (borra los datos de la DB)
docker compose down -v

# Reconstruir la imagen de la app sin cache
docker compose build --no-cache app
```

---

## 4. Servidor Node.js custom (`server.ts`)

Next.js con App Router requiere un servidor custom para integrar Socket.io. El archivo `server.ts` reemplaza `next start`:

```typescript
// server.ts — estructura general (detalle completo en implementación)
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketServer } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // Socket.io se adjunta al mismo servidor HTTP
  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.NEXTAUTH_URL },
  })

  // Autenticación del handshake y rooms
  io.use(/* verificar token de sesión */)
  io.on('connection', (socket) => {
    /* unir al usuario a su room */
  })

  // io queda disponible para los API Routes via global o context
  ;(global as any).io = io

  httpServer.listen(3000, () => {
    console.log('> Servidor en http://localhost:3000')
  })
})
```

---

## 5. Consideraciones de seguridad Docker

| Riesgo | Mitigación |
|--------|-----------|
| Secretos en imagen | Usar `--build-arg` solo para vars de build; secretos de runtime via `.env` en compose |
| Contenedor como root | Usuario `nextjs` sin privilegios en Dockerfile de producción |
| DB expuesta al exterior | Puerto 5432 solo en red interna Docker, no mapeado al host en producción |
| Variables en `.env` en repo | `.env` en `.gitignore` y `.dockerignore`; usar `.env.example` como template |
| Imagen con dependencias de dev | Multi-stage build: la imagen final solo tiene deps de producción |
