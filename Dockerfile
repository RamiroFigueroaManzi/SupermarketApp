# ── Stage 1: deps (solo producción) ──────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: builder ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar Next.js
RUN npm run build

# Compilar server.ts y lib/socket.ts a CommonJS con esbuild
RUN npx esbuild server.ts \
      --platform=node --target=node20 --format=cjs \
      --outfile=server.js
RUN npx esbuild lib/socket.ts \
      --platform=node --target=node20 --format=cjs \
      --outfile=lib/socket.js

# ── Stage 3: runner ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copiar standalone de Next.js (incluye .next/ y node_modules mínimo)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Reemplazar el server.js de standalone con nuestro servidor personalizado (Socket.io)
COPY --from=builder --chown=nextjs:nodejs /app/server.js          ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/lib/socket.js      ./lib/socket.js
# Archivos estáticos y public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static       ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public             ./public
# Prisma
COPY --from=builder /app/prisma ./prisma
# node_modules de producción (incluye socket.io, @prisma/client, etc.)
COPY --from=deps    /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
