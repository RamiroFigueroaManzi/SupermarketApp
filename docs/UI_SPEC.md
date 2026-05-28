# Especificación de UI/UX — SuperMarket App
**Versión:** 1.0  
**Fecha:** 2026-05-28  
**Estado:** Borrador para revisión

---

## 1. Principios de diseño

| Principio | Aplicación |
|-----------|-----------|
| **Responsive-first** | Todas las vistas se adaptan a móvil (375px) y desktop (1280px+) |
| **Claridad sobre densidad** | Interfaces simples, sin información innecesaria |
| **Feedback inmediato** | Toda acción tiene respuesta visual (loading, éxito, error) |
| **Jerarquía visual clara** | El estado del pedido siempre es el elemento más prominente |

---

## 2. Sistema de diseño

### 2.1 Paleta de colores

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#16a34a` (verde) | Acciones principales, marca |
| `primary-dark` | `#15803d` | Hover de primary |
| `accent` | `#f97316` (naranja) | Highlights, badges de alerta |
| `background` | `#f9fafb` | Fondo general |
| `surface` | `#ffffff` | Cards, modales |
| `text-primary` | `#111827` | Texto principal |
| `text-muted` | `#6b7280` | Texto secundario |
| `border` | `#e5e7eb` | Bordes de cards |
| `error` | `#dc2626` | Errores |
| `success` | `#16a34a` | Confirmaciones |
| `warning` | `#d97706` | Advertencias |

### 2.2 Tipografía
- **Font:** Inter (Google Fonts)
- Títulos: `font-semibold` o `font-bold`
- Cuerpo: `font-normal`, `text-base` (16px)
- Etiquetas/meta: `text-sm` (14px), `text-muted`

### 2.3 Estados de los badges de pedido

| Estado | Color fondo | Color texto | Ícono |
|--------|-------------|-------------|-------|
| BORRADOR | gris claro | gris | lápiz |
| RECIBIDO | azul claro | azul | reloj |
| EN_PREPARACION | naranja claro | naranja | caja |
| LISTO | verde claro | verde | check-circle |
| TERMINADO | gris oscuro | blanco | check-double |

---

## 3. Flujos de navegación

### 3.1 Flujo general por rol

```
URL /
└── Pantalla de login
    ├── [Google] ─────────────────────► /cliente/pedidos
    └── [Empleado] ──► /login/empleado
                       ├── rol=operador ──► /operador
                       └── rol=admin    ──► /admin
```

### 3.2 Flujo del cliente

```
/cliente/pedidos (home)
├── [+ Nuevo pedido] ──► /cliente/pedido/nuevo
│                         ├── Ingresa lista (texto/foto)
│                         ├── IA procesa → vista previa editable
│                         ├── Edita ítems (CRUD)
│                         ├── [Confirmar pedido] ──► /cliente/pedidos
│                         └── [Cancelar] ──► /cliente/pedidos
│
└── [Ver pedido] ──► /cliente/pedido/:id
                     └── Seguimiento de estado en tiempo real
```

### 3.3 Flujo del operador

```
/operador (lista de pedidos)
└── [Seleccionar pedido] ──► /operador/pedido/:id
                              ├── Ver detalle + ítems
                              ├── Marcar ítems con checkbox
                              └── [Cambiar estado] ──► vuelve a /operador
```

### 3.4 Flujo del administrador

```
/admin (dashboard)
├── /admin/catalogo
│   ├── Lista de productos (filtrable)
│   ├── [Nuevo producto] ──► modal o /admin/catalogo/nuevo
│   └── [Editar] ──► /admin/catalogo/:id
├── /admin/empleados
│   ├── Lista de empleados
│   └── [Nuevo / Editar] ──► modal
├── /admin/historial
│   └── Tabla filtrable + botón exportar CSV
└── /admin/estadisticas
    └── Gráficos + filtro por fecha
```

---

## 4. Pantallas — Especificación detallada

---

### 4.1 Login (`/`)

**Descripción:** Primera pantalla de la app. Dos opciones de acceso.

**Layout (centrado, max-width 420px):**
```
┌──────────────────────────────┐
│    🛒  SuperMarket           │
│    Tu supermercado digital   │
│                              │
│  ┌────────────────────────┐  │
│  │  G  Ingresar con       │  │
│  │     Google             │  │
│  └────────────────────────┘  │
│                              │
│  ──────── o ────────         │
│                              │
│  ┌────────────────────────┐  │
│  │  🏢  Acceso empleados  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Comportamiento:**
- Botón Google → inicia flujo NextAuth Google
- Botón Empleados → navega a `/login/empleado`
- Si ya hay sesión activa → redirect automático al home del rol

---

### 4.2 Login empleado (`/login/empleado`)

**Layout:**
```
┌──────────────────────────────┐
│  ← Volver                    │
│                              │
│    Acceso para empleados     │
│                              │
│  Legajo                      │
│  ┌────────────────────────┐  │
│  │  12345                 │  │
│  └────────────────────────┘  │
│                              │
│  Contraseña                  │
│  ┌────────────────────────┐  │
│  │  ••••••••              │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │      Ingresar          │  │
│  └────────────────────────┘  │
│                              │
│  [mensaje de error si falla] │
└──────────────────────────────┘
```

**Validaciones:**
- Legajo: solo números, campo requerido
- Contraseña: mínimo 6 caracteres, campo requerido
- Máximo 5 intentos fallidos → deshabilitar botón 15 minutos con countdown visible

---

### 4.3 Home cliente — Mis pedidos (`/cliente/pedidos`)

**Header:** nombre del usuario + foto de Google + botón cerrar sesión  
**Contenido:**

```
┌─────────────────────────────────────┐
│  Hola, Juan 👋                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  + Nuevo pedido             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Pedidos activos                    │
│  ┌─────────────────────────────┐    │
│  │ #PED-001  [EN PREPARACIÓN]  │    │
│  │ 5 productos · $3.450        │    │
│  │ Hace 20 minutos     [Ver →] │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ #PED-002  [LISTO] ✓         │    │
│  │ 3 productos · $1.200        │    │
│  │ Hace 5 minutos      [Ver →] │    │
│  └─────────────────────────────┘    │
│                                     │
│  Pedidos anteriores                 │
│  [lista colapsada de terminados]    │
└─────────────────────────────────────┘
```

**Comportamiento:**
- El badge de estado se actualiza en tiempo real (Socket.io)
- Pedido en `LISTO` → card se resalta con borde verde y pulsa suavemente (animación)
- Pedidos `TERMINADO` en sección colapsada por defecto

---

### 4.4 Nuevo pedido (`/cliente/pedido/nuevo`)

**Paso 1: Ingresar lista**

```
┌─────────────────────────────────────┐
│  ← Mis pedidos                      │
│  Nuevo pedido                       │
│                                     │
│  ¿Cómo querés ingresar tu lista?    │
│                                     │
│  ┌──────────┐ ┌──────────┐          │
│  │ 📷 Foto  │ │ ✏️ Texto │          │
│  │ existente│ │  libre   │          │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐                       │
│  │ 📸 Cámara│                       │
│  └──────────┘                       │
│                                     │
│  [Si texto libre está seleccionado] │
│  ┌─────────────────────────────┐    │
│  │ 2 litros de leche           │    │
│  │ 1 kg de manzanas            │    │
│  │ pan lactal...               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Procesar con IA  →         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Paso 2: Vista previa editable (post-IA)**

```
┌─────────────────────────────────────┐
│  Tu pedido                          │
│                                     │
│  ✓ Leche entera 1L    x2  $700  🗑  │
│  ✓ Manzana roja       x1  $450  🗑  │
│  ⚠ "pan lactal esp."  — no encontrado│
│    [Buscar producto manualmente]    │
│                                     │
│  ─────────────────────              │
│  Total:  $1.150                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  + Agregar producto         │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Confirmar pedido           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Comportamiento:**
- Ítem con confianza `"no_encontrado"` → aparece en amarillo con warning
- Tap en cantidad → input numérico inline editable
- Tap en 🗑 → elimina el ítem con animación de salida
- "+ Agregar producto" → abre un buscador de catálogo (modal o drawer)
- "Confirmar pedido" → llama a `PATCH /api/pedidos/:id { status: "RECIBIDO" }` → redirect a `/cliente/pedidos`

---

### 4.5 Detalle de pedido cliente (`/cliente/pedido/:id`)

```
┌─────────────────────────────────────┐
│  ← Mis pedidos                      │
│  Pedido #PED-001                    │
│                                     │
│       [EN PREPARACIÓN]              │
│   Tu pedido está siendo armado      │
│                                     │
│  ●────●────○────○                   │
│  Rec. Prep. Listo Term.             │
│                                     │
│  Productos (5)                      │
│  ─────────────────────              │
│  Leche entera 1L    x2   $700       │
│  Manzana roja       x1   $450       │
│  Queso cremoso      x1   $1.200     │
│  Yogur frutilla     x2   $600       │
│  Pan lactal         x1   $350       │
│  ─────────────────────              │
│  Total:             $3.300          │
│                                     │
└─────────────────────────────────────┘
```

**Comportamiento:**
- La barra de progreso se actualiza en tiempo real
- Cuando pasa a `LISTO`: banner verde "¡Tu pedido está listo para retirar!" + vibración en móvil (navigator.vibrate)
- Solo lectura, no se puede editar (ya fue confirmado)

---

### 4.6 Lista de pedidos — Operador (`/operador`)

```
┌─────────────────────────────────────┐
│  SuperMarket · Operador             │
│  Carlos López  [Cerrar sesión]      │
│                                     │
│  Pedidos activos  (8)               │
│  Mis activos: 2/3                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ #001  Juan Pérez            │    │
│  │ 5 prod.  [EN PREPARACIÓN]   │    │
│  │ Hace 20 min.        [Ver]   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ #002  María García          │    │
│  │ 3 prod.  [RECIBIDO]         │    │
│  │ Hace 5 min.         [Ver]   │    │
│  └─────────────────────────────┘    │
│  ...                                │
└─────────────────────────────────────┘
```

**Comportamiento:**
- "Mis activos: 2/3" → contador de pedidos propios en EN_PREPARACION
- Si llega a 3/3 → el botón "Ver" de pedidos `RECIBIDO` se deshabilita con tooltip "Límite de 3 pedidos alcanzado"
- La lista se actualiza en tiempo real cuando llegan nuevos pedidos (Socket.io)
- Ordenados por `confirmedAt` ASC (primero el más antiguo), pero cualquiera es seleccionable

---

### 4.7 Detalle de pedido — Operador (`/operador/pedido/:id`)

```
┌─────────────────────────────────────┐
│  ← Pedidos                          │
│  Pedido #PED-001                    │
│  Cliente: Juan Pérez                │
│                                     │
│  Estado: [RECIBIDO]                 │
│                                     │
│  Productos (5)                      │
│  ┌─────────────────────────────┐    │
│  │ □  #P045  Leche entera 1L   │    │
│  │    Lácteos  ·  x2           │    │
│  ├─────────────────────────────┤    │
│  │ □  #P012  Manzana roja      │    │
│  │    Frutas y Verduras  ·  x1 │    │
│  ├─────────────────────────────┤    │
│  │ ✓  #P089  Queso cremoso     │    │
│  │    Lácteos  ·  x1           │    │
│  ├─────────────────────────────┤    │
│  │ □  #P034  Yogur frutilla    │    │
│  │    Lácteos  ·  x2           │    │
│  ├─────────────────────────────┤    │
│  │ □  #P067  Pan lactal        │    │
│  │    Panadería  ·  x1         │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Iniciar preparación →      │    │  ← si estado es RECIBIDO
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Comportamiento:**
- El botón inferior cambia según el estado:
  - `RECIBIDO` → "Iniciar preparación" → cambia a `EN_PREPARACION`
  - `EN_PREPARACION` → "Marcar como listo" → cambia a `LISTO`
  - `LISTO` → "Confirmar retiro" → cambia a `TERMINADO`
- El checkbox de cada ítem es independiente del estado del pedido (solo tracking interno del operador)
- Ítems con checkbox marcado ✓ → fila con fondo gris claro
- Una vez en `TERMINADO` → redirect automático a `/operador`

---

### 4.8 Dashboard Admin (`/admin`)

```
┌─────────────────────────────────────┐
│  SuperMarket · Admin                │
│  ─────────────────────────          │
│  │ 📦 Catálogo       │              │
│  │ 👤 Empleados      │              │
│  │ 📋 Historial      │              │
│  │ 📊 Estadísticas   │              │
│  ─────────────────────────          │
│                                     │
│  Resumen del día                    │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │  12  │ │  8   │ │  3   │        │
│  │ped.  │ │term. │ │activ.│        │
│  └──────┘ └──────┘ └──────┘        │
└─────────────────────────────────────┘
```

---

### 4.9 Catálogo — Admin (`/admin/catalogo`)

```
┌─────────────────────────────────────┐
│  Catálogo de productos              │
│                                     │
│  [Buscar...] [Categoría ▼] [+ Nuevo]│
│                                     │
│  ┌───┬──────────────┬──────┬──────┐ │
│  │ # │ Producto     │ Cat. │Precio│ │
│  ├───┼──────────────┼──────┼──────┤ │
│  │ 1 │ Leche 1L     │Láct. │$350  │ │
│  │   │              │      │ ✏️ 🗑 │ │
│  ├───┼──────────────┼──────┼──────┤ │
│  │ 2 │ Manzana roja │F&V   │$450  │ │
│  └───┴──────────────┴──────┴──────┘ │
│  Mostrando 1-20 de 85  [< 1 2 3 >]  │
└─────────────────────────────────────┘
```

**Crear/Editar producto:** modal con formulario (nombre, categoría, descripción, precio).

---

### 4.10 Historial — Admin (`/admin/historial`)

```
┌─────────────────────────────────────┐
│  Historial de pedidos               │
│                                     │
│  Desde [──────] Hasta [──────]      │
│  Operador [todos ▼]                 │
│  Monto $[───] a $[───]              │
│  [Filtrar]  [Exportar CSV]          │
│                                     │
│  ┌────┬────────┬────────┬─────────┐ │
│  │ ID │Cliente │Operador│  Total  │ │
│  ├────┼────────┼────────┼─────────┤ │
│  │001 │Juan P. │Carlos L│ $3.450  │ │
│  │002 │María G.│Ana R.  │ $1.200  │ │
│  └────┴────────┴────────┴─────────┘ │
└─────────────────────────────────────┘
```

---

### 4.11 Estadísticas — Admin (`/admin/estadisticas`)

**Sección 1: Rendimiento de operadores**
- Tabla: nombre, pedidos procesados, tiempo promedio
- Gráfico de barras: pedidos por operador

**Sección 2: Ventas por producto**
- Gráfico de barras horizontales: top 10 productos más vendidos (por cantidad)

**Sección 3: Ventas por categoría**
- Gráfico de torta/donut: distribución de ventas por categoría (por monto)

Filtro de rango de fechas aplica a todas las secciones simultáneamente.

---

## 5. Componentes reutilizables clave

| Componente | Uso |
|-----------|-----|
| `<StatusBadge status={...} />` | Badge de color por estado en todas las vistas |
| `<OrderCard order={...} />` | Card de pedido en listas (cliente y operador) |
| `<OrderItemRow item={...} />` | Fila de ítem en detalle de pedido |
| `<ProductSearchModal />` | Buscador de catálogo para agregar ítems |
| `<ConfirmDialog />` | Modal de confirmación para acciones destructivas |
| `<StatCard value label />` | Tarjeta de métrica numérica (dashboard admin) |

---

## 6. Manejo de estados de carga y error

| Situación | Comportamiento UI |
|-----------|-----------------|
| Cargando lista de pedidos | Skeleton placeholders (3 cards) |
| Procesando con IA | Spinner + texto "Analizando tu lista..." + barra de progreso animada |
| Error de red | Toast "Error de conexión. Reintentá." |
| Error de IA (timeout) | Banner amarillo inline con botón "Reintentar" |
| Acción exitosa | Toast verde de 3 segundos |
| Límite de 3 pedidos | Toast naranja de aviso |
