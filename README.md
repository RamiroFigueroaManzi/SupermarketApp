# SuperMarket — Tu supermercado digital

Aplicación web full-stack para gestión de pedidos de supermercado con asistencia de inteligencia artificial, pagos integrados y actualizaciones en tiempo real.

## ¿Qué hace la aplicación?

SuperMarket permite a los clientes realizar pedidos de supermercado de forma digital, mientras el equipo interno los gestiona desde un panel dedicado. La app incorpora IA para facilitar la creación de pedidos y un sistema de pagos integrado con Mercado Pago.

---

## Módulos

### Para clientes
- **Creación de pedidos con IA**: el cliente escribe una lista de compras en texto, sube una foto o usa la cámara. Claude Haiku analiza el contenido y mapea automáticamente los productos al catálogo del supermercado.
- **Asistente de recetas**: el cliente describe lo que quiere cocinar y el sistema busca recetas reales usando RAG (búsqueda semántica con pgvector + Voyage AI). Claude sugiere 3 recetas con los ingredientes ya mapeados al catálogo, listos para agregar al pedido.
- **Selección de método de pago**: al confirmar el pedido, el cliente elige entre efectivo (paga al retirar) o Mercado Pago (Checkout Pro con tarjeta, QR o saldo).
- **Seguimiento en tiempo real**: el pedido muestra su estado actual (Recibido → En preparación → Listo) con tiempo estimado de retiro calculado en base al promedio histórico.

### Para operadores
- **Panel de pedidos activos**: lista en tiempo real de todos los pedidos recibidos, con badge de método de pago (Efectivo / MP Pagado).
- **Gestión de estado**: el operador avanza el pedido por cada etapa y marca los ítems como chequeados durante la preparación.
- **Límite de pedidos simultáneos**: cada operador puede tener hasta 3 pedidos en preparación al mismo tiempo.

### Para administradores
- **Catálogo de productos**: alta, edición y baja de productos con imágenes subidas a Supabase Storage.
- **Gestión de empleados**: creación de cuentas de operadores y administradores con autenticación por legajo y contraseña.
- **Estadísticas**: gráficos de pedidos por estado, productos más pedidos y evolución temporal.
- **Historial**: registro completo de pedidos con tiempos de espera y preparación promedio en formato mm:ss.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Base de datos | PostgreSQL en Supabase |
| ORM | Prisma |
| Autenticación | NextAuth v5 (Google OAuth + credenciales) |
| IA — procesamiento de listas | Claude Haiku (Anthropic) |
| IA — búsqueda de recetas | Voyage AI (embeddings) + pgvector |
| Pagos | Mercado Pago Checkout Pro |
| Tiempo real | Socket.IO |
| Storage | Supabase Storage |
| Deploy | Railway (Docker standalone) |
| PWA | next-pwa (instalable en Android e iOS) |

---

## Roles y acceso

| Rol | Acceso |
|---|---|
| Cliente | Login con Google |
| Operador | Legajo + contraseña |
| Administrador | Legajo + contraseña |

---

## Variables de entorno requeridas

```env
DATABASE_URL              # Supabase pooler (pgbouncer)
DIRECT_URL                # Supabase conexión directa (migraciones)
NEXTAUTH_SECRET           # JWT secret
NEXTAUTH_URL              # URL base de la app
GOOGLE_CLIENT_ID          # OAuth de Google
GOOGLE_CLIENT_SECRET      # OAuth de Google
ANTHROPIC_API_KEY         # Claude Haiku
VOYAGE_API_KEY            # Embeddings para RAG
NEXT_PUBLIC_SUPABASE_URL  # URL del proyecto Supabase
SUPABASE_SERVICE_ROLE_KEY # Clave de servicio Supabase
MP_ACCESS_TOKEN           # Mercado Pago Access Token
NEXT_PUBLIC_MP_PUBLIC_KEY # Mercado Pago Public Key
```

---

## Correr en desarrollo

```bash
npm install
npm run dev:lite     # Next.js sin Turbopack (recomendado)
```

## Importar recetas (RAG)

Para poblar la base de recetas con embeddings semánticos:

```bash
npx tsx scripts/import-recipes.ts
```

Importa ~670 recetas desde TheMealDB, genera embeddings con Voyage AI y los almacena en Supabase con pgvector.
