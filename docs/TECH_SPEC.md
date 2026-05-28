# Especificación Técnica — SuperMarket App
**Versión:** 1.1  
**Fecha:** 2026-05-28  
**Estado:** Borrador para revisión

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión mínima | Justificación |
|------|-----------|----------------|---------------|
| Framework full-stack | Next.js | 14.x (App Router) | SSR/SSG + API Routes en un solo repo, deploy nativo en Vercel |
| Lenguaje | TypeScript | 5.x | Tipado estático, reduce errores en runtime |
| Base de datos | PostgreSQL | 16.x | Relacional, ACID, soporte sólido para consultas complejas de estadísticas |
| ORM | Prisma | 5.x | Type-safe, migraciones declarativas, integración con Next.js |
| Autenticación | NextAuth.js (Auth.js) | 5.x | Google OAuth + Credentials provider en un solo sistema |
| IA | Google Gemini | API v1 (gemini-1.5-flash) | Multimodal (texto + imagen), velocidad adecuada para UX |
| Real-time | Socket.io | 4.x | WebSockets con fallback a polling, fácil integración con Next.js |
| UI Components | shadcn/ui | latest | Componentes accesibles sobre Radix UI, sin lock-in |
| Estilos | Tailwind CSS | 3.x | Utility-first, consistencia de diseño, shadcn/ui lo requiere |
| Gráficos | Recharts | 2.x | Componentes React nativos, liviano, compatible con shadcn |
| Exportación CSV | papaparse | 5.x | Parser/serializer CSV robusto para el lado cliente |
| Validación | Zod | 3.x | Validación de esquemas compartida entre frontend y backend |
| Servidor HTTP | Node.js custom server | 20.x LTS | Necesario para Socket.io persistente (Vercel serverless no lo soporta) |
| Contenedores | Docker + Docker Compose | 24.x / 2.x | Entorno reproducible, misma config en dev y producción |
| Proxy inverso | Nginx | 1.25.x (alpine) | Termina SSL, sirve archivos estáticos, balancea tráfico al app server |
| Hosting app | VPS / cualquier host con Docker | — | Railway, Render, DigitalOcean, AWS EC2 — cualquier host que corra Docker |
| Hosting DB | PostgreSQL en contenedor | 16.x alpine | Contenedor propio en la misma red Docker; datos persistidos en volume |

---

## 2. Arquitectura del sistema

> **Nota importante:** Socket.io requiere una conexión TCP persistente. Vercel (serverless) no lo soporta. Por eso la app corre en un **servidor Node.js custom** dentro de un contenedor Docker, no en Vercel.

```
┌──────────────────────────────────────────────────────┐
│                      CLIENTE                         │
│  Browser (React / Next.js Client Components)         │
│  └── Socket.io Client (WSS)                          │
└───────────────────────┬──────────────────────────────┘
                        │ HTTPS / WSS
┌───────────────────────▼──────────────────────────────┐
│            Contenedor: nginx (puerto 443/80)          │
│  - Termina SSL                                        │
│  - Proxy HTTP  → app:3000                             │
│  - Proxy WSS   → app:3000/socket.io                  │
└───────────────────────┬──────────────────────────────┘
                        │ HTTP (red interna Docker)
┌───────────────────────▼──────────────────────────────┐
│            Contenedor: app (puerto 3000)              │
│                                                       │
│  server.ts (Node.js custom server)                    │
│  ├── Next.js App Router + API Routes                  │
│  │   ├── NextAuth.js (Google + Credentials)           │
│  │   ├── Prisma ORM                                   │
│  │   └── Llamadas a Gemini API (server-side only)     │
│  └── Socket.io Server                                 │
│      ├── Room: cliente:{userId}                       │
│      └── Room: operadores                             │
└───────────────────────┬──────────────────────────────┘
                        │ TCP (red interna Docker)
┌───────────────────────▼──────────────────────────────┐
│         Contenedor: db — PostgreSQL 16                │
│  Volume: postgres_data (persistencia)                 │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│           Google Gemini API (externo)                 │
│  Llamado desde el contenedor app, nunca del browser   │
└──────────────────────────────────────────────────────┘
```

---

## 3. Estructura del proyecto

```
supermarket-app/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Pantalla de login unificada
│   │   └── login/empleado/
│   │       └── page.tsx          # Login por legajo
│   ├── (cliente)/
│   │   ├── layout.tsx            # Layout autenticado cliente
│   │   ├── page.tsx              # Home cliente
│   │   ├── pedido/
│   │   │   ├── nuevo/page.tsx    # Crear pedido con IA
│   │   │   └── [id]/page.tsx     # Detalle / seguimiento pedido
│   │   └── mis-pedidos/
│   │       └── page.tsx          # Lista de pedidos del cliente
│   ├── (operador)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Lista de pedidos activos
│   │   └── pedido/[id]/page.tsx  # Detalle pedido para operador
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard admin
│   │   ├── catalogo/
│   │   │   ├── page.tsx          # Lista de productos
│   │   │   └── [id]/page.tsx     # Editar producto
│   │   ├── empleados/
│   │   │   └── page.tsx
│   │   ├── historial/
│   │   │   └── page.tsx
│   │   └── estadisticas/
│   │       └── page.tsx
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── pedidos/              # CRUD pedidos
│       ├── productos/            # CRUD catálogo
│       ├── empleados/            # CRUD empleados
│       ├── ia/procesar/          # Endpoint Gemini
│       └── socket/               # Socket.io init
├── components/
│   ├── ui/                       # shadcn/ui generados
│   ├── pedido/                   # Componentes de pedido
│   ├── operador/                 # Componentes operador
│   └── admin/                    # Componentes admin
├── lib/
│   ├── auth.ts                   # Configuración NextAuth
│   ├── db.ts                     # Cliente Prisma singleton
│   ├── gemini.ts                 # Cliente Gemini + prompts
│   ├── socket.ts                 # Configuración Socket.io
│   └── validations.ts            # Esquemas Zod compartidos
├── prisma/
│   ├── schema.prisma             # Esquema de la base de datos
│   ├── seed.ts                   # Datos semilla
│   └── migrations/               # Migraciones generadas
├── docker/
│   └── nginx/
│       └── nginx.conf            # Configuración del proxy inverso
├── docs/                         # Documentación del proyecto
├── server.ts                     # Servidor Node.js custom (Next.js + Socket.io)
├── Dockerfile                    # Imagen de producción (multi-stage)
├── Dockerfile.dev                # Imagen de desarrollo (hot reload)
├── docker-compose.yml            # Stack completo de producción
├── docker-compose.dev.yml        # Stack de desarrollo
├── .env                          # Variables de entorno (no commitear)
├── .env.example                  # Template de variables
├── .dockerignore
└── middleware.ts                 # Protección de rutas por rol
```

---

## 4. Autenticación

### 4.1 Flujo Cliente (Google OAuth)
```
1. Cliente hace click en "Ingresar con Google"
2. NextAuth redirige a accounts.google.com/o/oauth2/auth
3. Usuario aprueba permisos (nombre, email, foto)
4. Google redirige a /api/auth/callback/google
5. NextAuth crea o actualiza el registro en tabla User
6. Se crea sesión JWT (httpOnly cookie)
7. Redirect a /mis-pedidos (home cliente)
```

### 4.2 Flujo Empleado (Credentials)
```
1. Empleado ingresa legajo (número) + contraseña en /login/empleado
2. POST a /api/auth/callback/credentials
3. NextAuth busca empleado en tabla Employee por legajo
4. bcrypt.compare(password, employee.passwordHash)
5. Si válido: sesión JWT con { id, legajo, nombre, rol }
6. Redirect según rol:
   - "operador" → /operador
   - "administrador" → /admin
```

### 4.3 Middleware de protección de rutas

```typescript
// middleware.ts — rutas protegidas por rol
const roleRoutes = {
  '/cliente':  ['cliente'],
  '/operador': ['operador', 'administrador'],
  '/admin':    ['administrador'],
}
```

---

## 5. Integración con Gemini

### 5.1 Endpoint
`POST /api/ia/procesar`  
Requiere: sesión válida con rol "cliente"

### 5.2 Inputs soportados

| Tipo | Content-Type | Procesamiento |
|------|-------------|---------------|
| Texto | `application/json` | Prompt directo |
| Imagen | `multipart/form-data` | Base64 → Gemini Vision |

### 5.3 Prompt del sistema (system prompt)
```
Sos un asistente de supermercado. Tu tarea es interpretar listas de compras 
y convertirlas en pedidos estructurados.

Dado el catálogo de productos disponibles (se inyecta dinámicamente), 
analiza el input del usuario y devuelve un JSON con el siguiente esquema:

{
  "items": [
    {
      "productoId": number | null,  // null si no se encontró match
      "nombreDetectado": string,    // nombre que el usuario escribió/fotografió
      "cantidad": number,
      "unidad": string,
      "confianza": "alta" | "media" | "baja" | "no_encontrado"
    }
  ],
  "observaciones": string          // notas generales sobre el pedido
}

Solo devolvé el JSON, sin texto adicional.
```

### 5.4 Lógica de mapeo
1. Se obtiene el catálogo completo de la DB antes de llamar a Gemini
2. Se inyecta el catálogo en el prompt como contexto
3. Gemini devuelve el JSON con `productoId` mapeado o `null`
4. Los ítems con `productoId: null` se muestran al cliente con advertencia
5. El cliente puede buscar manualmente y asignar el producto correcto

### 5.5 Manejo de errores Gemini
- Timeout > 15s → error 504 con mensaje "La IA tardó demasiado, reintentá"
- Respuesta no parseable → reintentar 1 vez, luego error con fallback manual
- Rate limit → error 429 con mensaje apropiado

---

## 6. WebSockets — Actualización de estado en tiempo real

### 6.1 Eventos emitidos por el servidor

| Evento | Payload | Destinatario |
|--------|---------|-------------|
| `pedido:estado_cambiado` | `{ pedidoId, nuevoEstado, timestamp }` | Room del cliente dueño del pedido |
| `pedidos:actualizado` | `{ pedidoId, estado, clienteNombre, cantidadItems }` | Room "operadores" |

### 6.2 Rooms de Socket.io

| Room | Participantes |
|------|-------------|
| `cliente:{userId}` | El cliente dueño del pedido |
| `operadores` | Todos los operadores conectados |

### 6.3 Flujo de conexión
```
1. Usuario autenticado se conecta al servidor de Socket.io
2. Servidor verifica token de sesión en el handshake
3. Servidor une al usuario a su room correspondiente
4. Al cambiar estado de un pedido (via API), el servidor emite evento al room
```

---

## 7. Variables de entorno

```bash
# .env.example

# Base de datos
DATABASE_URL="postgresql://user:pass@host/supermarket"

# NextAuth
NEXTAUTH_SECRET="string-aleatorio-largo"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"

# Gemini
GEMINI_API_KEY="AIzaSy-xxxx"

# Socket.io (si se usa servidor separado)
SOCKET_SECRET="string-para-verificar-tokens"
```

---

## 8. Seguridad

| Riesgo | Mitigación |
|--------|-----------|
| Acceso no autorizado a rutas | middleware.ts verifica sesión + rol en cada request |
| Exposición de API key Gemini | Llamada a Gemini solo desde API Routes del servidor |
| XSS en inputs de texto | Sanitización con DOMPurify antes de renderizar |
| SQL Injection | Prisma usa prepared statements nativamente |
| CSRF | NextAuth maneja tokens CSRF automáticamente |
| Brute force en login empleado | Rate limiting: máx 5 intentos por IP cada 15 minutos |
| Passwords en texto plano | bcrypt con salt rounds = 12 |

---

## 9. Decisiones técnicas relevantes

### 9.1 ¿Por qué Socket.io y no Server-Sent Events?
SSE es unidireccional (servidor → cliente). Socket.io permite bidireccionalidad futura y tiene mejor soporte de rooms para broadcast selectivo (solo notificar al cliente dueño del pedido).

### 9.2 ¿Por qué Neon para PostgreSQL?
Neon ofrece PostgreSQL serverless con branching (útil para desarrollo), free tier generoso, y driver HTTP compatible con Vercel Edge. Prisma tiene soporte oficial.

### 9.3 ¿Por qué gemini-1.5-flash y no gemini-1.5-pro?
Flash es significativamente más rápido y económico. Para mapeo de lista de compras contra catálogo, la velocidad es prioritaria sobre el razonamiento complejo. Se puede actualizar a pro si la precisión resulta insuficiente.

### 9.4 Límite de 3 pedidos simultáneos por operador
Implementado a nivel de API con una transacción Prisma:
```sql
SELECT COUNT(*) FROM pedidos 
WHERE operadorId = :id AND estado = 'EN_PREPARACION'
```
Si el count >= 3, la API devuelve 409 Conflict. El frontend deshabilita el botón de tomar pedido.
