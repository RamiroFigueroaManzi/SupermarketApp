# Especificación de API — SuperMarket App
**Versión:** 1.0  
**Fecha:** 2026-05-28  
**Estado:** Borrador para revisión

---

## 1. Convenciones generales

- Base URL: `/api`
- Formato de respuesta: `application/json`
- Autenticación: sesión NextAuth verificada via middleware en cada request
- Errores siguen el formato:
```json
{
  "error": "Mensaje descriptivo del error",
  "code": "CODIGO_INTERNO"
}
```
- Fechas en ISO 8601: `"2026-05-28T14:30:00.000Z"`
- Precios como string decimal: `"1250.50"` (evita problemas de precisión flotante en JSON)
- IDs como string (cuid)

---

## 2. Códigos de estado HTTP utilizados

| Código | Significado |
|--------|-----------|
| 200 | OK — respuesta exitosa con cuerpo |
| 201 | Created — recurso creado |
| 204 | No Content — éxito sin cuerpo |
| 400 | Bad Request — payload inválido |
| 401 | Unauthorized — no autenticado |
| 403 | Forbidden — autenticado pero sin permiso para el recurso |
| 404 | Not Found |
| 409 | Conflict — regla de negocio violada (ej: límite de 3 pedidos) |
| 500 | Internal Server Error |

---

## 3. Auth

### `GET /api/auth/session`
Devuelve la sesión actual (manejado por NextAuth, no se implementa manualmente).

**Respuesta (cliente autenticado):**
```json
{
  "user": {
    "id": "clxxx",
    "name": "Juan Pérez",
    "email": "juan@gmail.com",
    "image": "https://...",
    "role": "cliente"
  }
}
```

**Respuesta (empleado autenticado):**
```json
{
  "user": {
    "id": "clxxx",
    "legajo": 1042,
    "name": "María González",
    "role": "operador"
  }
}
```

---

## 4. Pedidos

### `GET /api/pedidos`
Lista de pedidos según el rol del usuario autenticado.

**Rol cliente:** devuelve sus propios pedidos, ordenados por `createdAt DESC`.  
**Rol operador:** devuelve todos los pedidos en estado `RECIBIDO` o `EN_PREPARACION`, ordenados por fecha de confirmación ASC (FIFO).  
**Rol administrador:** igual que operador.

**Query params (operador/admin):**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | Filtrar por estado |

**Respuesta 200:**
```json
{
  "pedidos": [
    {
      "id": "clxxx",
      "status": "RECIBIDO",
      "totalAmount": "3450.00",
      "clienteNombre": "Juan Pérez",
      "cantidadItems": 5,
      "confirmedAt": "2026-05-28T14:00:00.000Z",
      "createdAt": "2026-05-28T13:55:00.000Z"
    }
  ]
}
```

---

### `POST /api/pedidos`
Crea un nuevo pedido en estado `BORRADOR`. Requiere rol `cliente`.

**Body:**
```json
{
  "items": [
    {
      "productId": "clprod123",
      "quantity": 2
    }
  ]
}
```

**Respuesta 201:**
```json
{
  "pedido": {
    "id": "clxxx",
    "status": "BORRADOR",
    "totalAmount": "1200.00",
    "items": [...]
  }
}
```

---

### `GET /api/pedidos/:id`
Detalle completo de un pedido.

**Autorización:**
- Cliente: solo sus propios pedidos
- Operador/Admin: cualquier pedido

**Respuesta 200:**
```json
{
  "pedido": {
    "id": "clxxx",
    "status": "EN_PREPARACION",
    "totalAmount": "3450.00",
    "createdAt": "2026-05-28T13:55:00.000Z",
    "cliente": {
      "id": "cluser",
      "name": "Juan Pérez",
      "email": "juan@gmail.com"
    },
    "operador": {
      "id": "clemp",
      "name": "Carlos López",
      "legajo": 1042
    },
    "items": [
      {
        "id": "clitem",
        "productId": "clprod",
        "productName": "Leche entera 1L",
        "unitPrice": "350.00",
        "quantity": 2,
        "subtotal": "700.00",
        "isChecked": false,
        "product": {
          "category": { "id": "clcat", "name": "Lácteos" }
        }
      }
    ],
    "statusHistory": [
      {
        "fromStatus": null,
        "toStatus": "BORRADOR",
        "actor": "Juan Pérez",
        "createdAt": "2026-05-28T13:55:00.000Z"
      },
      {
        "fromStatus": "BORRADOR",
        "toStatus": "RECIBIDO",
        "actor": "Juan Pérez",
        "createdAt": "2026-05-28T14:00:00.000Z"
      }
    ]
  }
}
```

---

### `PATCH /api/pedidos/:id`
Actualiza un pedido. Dos usos:

#### a) Modificar ítems (rol `cliente`, solo pedidos en `BORRADOR`)

**Body:**
```json
{
  "items": [
    { "productId": "clprod1", "quantity": 3 },
    { "productId": "clprod2", "quantity": 1 }
  ]
}
```
Reemplaza todos los ítems del pedido. El `totalAmount` se recalcula automáticamente.

#### b) Cambiar estado (rol `cliente` o `operador` según la transición)

**Body:**
```json
{
  "status": "RECIBIDO"
}
```

**Reglas de transición:**

| De | A | Rol permitido |
|----|---|---------------|
| BORRADOR | RECIBIDO | cliente |
| RECIBIDO | EN_PREPARACION | operador |
| EN_PREPARACION | LISTO | operador |
| LISTO | TERMINADO | operador |

**Error 409** si el operador ya tiene 3 pedidos `EN_PREPARACION`:
```json
{
  "error": "Límite de pedidos simultáneos alcanzado",
  "code": "MAX_ORDERS_REACHED"
}
```

**Respuesta 200:** el pedido actualizado completo.

**Efecto secundario:** emite evento Socket.io `pedido:estado_cambiado` al room correspondiente.

---

### `DELETE /api/pedidos/:id`
Elimina un pedido. Solo pedidos en estado `BORRADOR`. Solo el cliente dueño.

**Respuesta 204:** sin cuerpo.

---

## 5. Ítems del pedido

### `POST /api/pedidos/:id/items`
Agrega un ítem a un pedido en `BORRADOR`. Rol `cliente`, solo pedido propio.

**Body:**
```json
{
  "productId": "clprod123",
  "quantity": 2
}
```

**Error 400** si el producto no existe o está inactivo.  
**Respuesta 201:** el ítem creado con `subtotal` calculado.

---

### `PATCH /api/pedidos/:id/items/:itemId`
Actualiza un ítem. Dos usos:

#### a) Cambiar cantidad (rol `cliente`, pedido en `BORRADOR`)
```json
{ "quantity": 5 }
```

#### b) Marcar/desmarcar checkbox (rol `operador`, pedido en `EN_PREPARACION`)
```json
{ "isChecked": true }
```

**Respuesta 200:** el ítem actualizado.

---

### `DELETE /api/pedidos/:id/items/:itemId`
Elimina un ítem. Solo pedidos en `BORRADOR`. Solo el cliente dueño.

**Respuesta 204:** sin cuerpo.

---

## 6. IA — Procesamiento de lista

### `POST /api/ia/procesar`
Procesa una lista de compras con Gemini y devuelve ítems estructurados.  
Requiere rol `cliente`.

**Body (texto):**
```json
{
  "type": "text",
  "content": "2 litros de leche, 1 kg de manzanas, pan lactal"
}
```

**Body (imagen):** `multipart/form-data`
```
type: "image"
file: <archivo imagen>
```

**Respuesta 200:**
```json
{
  "items": [
    {
      "productoId": "clprod45",
      "nombreDetectado": "leche",
      "productoNombre": "Leche entera 1L",
      "cantidad": 2,
      "precio": "350.00",
      "confianza": "alta"
    },
    {
      "productoId": null,
      "nombreDetectado": "pan lactal especial",
      "productoNombre": null,
      "cantidad": 1,
      "precio": null,
      "confianza": "no_encontrado"
    }
  ],
  "observaciones": "No se encontró 'pan lactal especial' en el catálogo."
}
```

**Error 504** si Gemini supera el timeout.  
**Error 422** si la imagen no puede procesarse (formato inválido, muy oscura, etc.).

---

## 7. Catálogo — Categorías

### `GET /api/categorias`
Lista todas las categorías activas. Público (no requiere auth para facilitar búsqueda de productos).

**Respuesta 200:**
```json
{
  "categorias": [
    { "id": "clcat1", "name": "Lácteos" },
    { "id": "clcat2", "name": "Frutas y Verduras" }
  ]
}
```

---

### `POST /api/categorias`
Crea una categoría. Rol `administrador`.

**Body:** `{ "name": "Nueva Categoría" }`  
**Respuesta 201:** la categoría creada.

---

### `PATCH /api/categorias/:id`
Edita el nombre de una categoría. Rol `administrador`.

**Respuesta 200:** la categoría actualizada.

---

### `DELETE /api/categorias/:id`
Elimina una categoría. Rol `administrador`. Error 409 si tiene productos asociados.

---

## 8. Catálogo — Productos

### `GET /api/productos`
Lista de productos con paginación y filtros.

**Query params:**
| Param | Tipo | Default |
|-------|------|---------|
| `page` | number | 1 |
| `limit` | number | 20 |
| `categoria` | string (id) | — |
| `q` | string | — |
| `activo` | boolean | true |

**Respuesta 200:**
```json
{
  "productos": [...],
  "total": 85,
  "page": 1,
  "totalPages": 5
}
```

---

### `POST /api/productos`
Crea un producto. Rol `administrador`.

**Body:**
```json
{
  "name": "Leche entera 1L",
  "description": "Leche fresca entera de 1 litro",
  "price": "350.00",
  "categoryId": "clcat1"
}
```
**Respuesta 201:** el producto creado.

---

### `PATCH /api/productos/:id`
Edita un producto. Rol `administrador`.

**Body:** cualquier subconjunto de los campos del producto.  
**Respuesta 200:** el producto actualizado.

---

### `DELETE /api/productos/:id`
Desactiva un producto (`isActive = false`). Rol `administrador`.  
Responde 409 con advertencia si hay pedidos activos que lo contienen.

**Respuesta 200:**
```json
{
  "message": "Producto desactivado correctamente",
  "pedidosActivos": 0
}
```

---

## 9. Empleados

### `GET /api/empleados`
Lista de empleados. Rol `administrador`.

**Query params:** `activo` (boolean), `rol` (string), `page`, `limit`.

**Respuesta 200:**
```json
{
  "empleados": [
    {
      "id": "clemp1",
      "legajo": 1042,
      "name": "Carlos López",
      "role": "OPERADOR",
      "isActive": true,
      "createdAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "total": 12
}
```

---

### `POST /api/empleados`
Crea un empleado. Rol `administrador`.

**Body:**
```json
{
  "legajo": 1043,
  "name": "Ana Rodríguez",
  "password": "contraseña-segura",
  "role": "OPERADOR"
}
```
La contraseña se hashea con bcrypt (rounds: 12) antes de guardar.  
**Error 409** si el legajo ya existe.  
**Respuesta 201:** el empleado creado (sin `passwordHash`).

---

### `PATCH /api/empleados/:id`
Edita un empleado. Rol `administrador`.

**Body:** subconjunto de `{ name, password, role, isActive }`.  
**Error 403** si el admin intenta desactivar su propio legajo.  
**Respuesta 200:** el empleado actualizado.

---

## 10. Historial y estadísticas (Admin)

### `GET /api/admin/historial`
Historial de pedidos terminados con filtros. Rol `administrador`.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `desde` | ISO date | Fecha inicio |
| `hasta` | ISO date | Fecha fin |
| `operadorId` | string | Filtrar por operador |
| `montoMin` | decimal | Monto mínimo |
| `montoMax` | decimal | Monto máximo |
| `page` | number | Paginación |
| `limit` | number | Default 50 |

**Respuesta 200:**
```json
{
  "pedidos": [
    {
      "id": "clxxx",
      "clienteNombre": "Juan Pérez",
      "operadorNombre": "Carlos López",
      "totalAmount": "3450.00",
      "cantidadItems": 5,
      "confirmedAt": "2026-05-28T14:00:00.000Z",
      "completedAt": "2026-05-28T14:45:00.000Z",
      "tiempoPreparacionMinutos": 32
    }
  ],
  "total": 234,
  "page": 1
}
```

---

### `GET /api/admin/historial/exportar`
Devuelve el historial como CSV. Mismos filtros que el endpoint anterior.

**Respuesta 200:** `Content-Type: text/csv`, archivo descargable.

---

### `GET /api/admin/estadisticas`
Estadísticas agregadas. Rol `administrador`.

**Query params:** `desde`, `hasta` (rango de fechas).

**Respuesta 200:**
```json
{
  "operadores": [
    {
      "id": "clemp1",
      "nombre": "Carlos López",
      "legajo": 1042,
      "totalPedidos": 47,
      "tiempoPromedioMinutos": 28.5
    }
  ],
  "productosMasVendidos": [
    {
      "productId": "clprod1",
      "nombre": "Leche entera 1L",
      "categoria": "Lácteos",
      "totalVendido": 312,
      "montoTotal": "109200.00"
    }
  ],
  "ventasPorCategoria": [
    {
      "categoriaId": "clcat1",
      "nombre": "Lácteos",
      "totalItems": 520,
      "montoTotal": "185400.00"
    }
  ]
}
```

---

## 11. WebSocket — Eventos

El servidor Socket.io corre como custom server o middleware de Next.js.

### Conexión
```
wss://supermarket-app.vercel.app/socket.io
```

El cliente debe enviar el token de sesión en el handshake:
```javascript
const socket = io({ auth: { token: session.token } })
```

### Eventos del servidor → cliente

| Evento | Room | Payload |
|--------|------|---------|
| `pedido:estado_cambiado` | `cliente:{userId}` | `{ pedidoId, nuevoEstado, timestamp }` |
| `pedidos:lista_actualizada` | `operadores` | `{ pedidoId, estado, clienteNombre, cantidadItems }` |

### Eventos del cliente → servidor
Ninguno (solo lectura). Todas las acciones van por la API REST.
