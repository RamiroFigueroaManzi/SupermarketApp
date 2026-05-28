# Modelo de datos — SuperMarket App
**Versión:** 1.1  
**Fecha:** 2026-05-28  
**Estado:** Borrador para revisión

---

## 1. Diagrama entidad-relación

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │   Employee   │       │   Category   │
│  (clientes)  │       │ (empleados)  │       │  (catálogo)  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │       │ id           │       │ id           │
│ name         │       │ legajo       │       │ name         │
│ email        │       │ name         │       │ createdAt    │
│ image        │       │ passwordHash │       └──────┬───────┘
│ createdAt    │       │ role         │              │ 1
└──────┬───────┘       │ isActive     │              │ N
       │ 1             │ createdAt    │       ┌──────▼───────┐
       │               └──────┬───────┘       │   Product    │
       │ N                    │               ├──────────────┤
┌──────▼───────┐              │               │ id           │
│    Order     │              │               │ name         │
│   (pedido)   │◄─────────────┘ operadorId    │ description  │
├──────────────┤  (nullable)                  │ price        │
│ id           │                              │ categoryId   │
│ userId       │                              │ isActive     │
│ operadorId   │                              │ createdAt    │
│ status       │◄──────────────────────┐      └──────┬───────┘
│ totalAmount  │                       │             │ 1
│ createdAt    │                       │             │ N
│ updatedAt    │           ┌───────────┴──────┐  ┌──▼──────────┐
└──────┬───────┘           │OrderStatusHistory│  │  OrderItem  │
       │ 1                 ├──────────────────┤  ├─────────────┤
       ├───────────────────┤ id               │  │ id          │
       │ N                 │ orderId          │  │ orderId     │
       └──────────────────►│ fromStatus       │  │ productId   │
                           │ toStatus         │  │ productName │
                           │ changedByUserId  │  │ unitPrice   │
                           │ changedByEmpId   │  │ quantity    │
                           │ createdAt        │  │ isChecked   │
                           └──────────────────┘  └─────────────┘
```

---

## 2. Esquema Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// AUTENTICACIÓN (NextAuth)
// ─────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  orders        Order[]
  statusChanges OrderStatusHistory[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─────────────────────────────────────────
// EMPLEADOS
// ─────────────────────────────────────────

enum EmployeeRole {
  OPERADOR
  ADMINISTRADOR
}

model Employee {
  id           String       @id @default(cuid())
  legajo       Int          @unique
  name         String
  passwordHash String
  role         EmployeeRole
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  orders        Order[]
  statusChanges OrderStatusHistory[]

  @@map("employees")
}

// ─────────────────────────────────────────
// CATÁLOGO
// ─────────────────────────────────────────

model Category {
  id        String    @id @default(now())
  name      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  products  Product[]

  @@map("categories")
}

model Product {
  id          String      @id @default(cuid())
  name        String
  description String?     @db.Text
  price       Decimal     @db.Decimal(10, 2)
  categoryId  String
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  category    Category    @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]

  @@map("products")
}

// ─────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────

enum OrderStatus {
  BORRADOR        // Creado por IA, aún no confirmado
  RECIBIDO        // Cliente confirmó, visible para operadores
  EN_PREPARACION  // Un operador tomó el pedido
  LISTO           // Operador terminó de prepararlo
  TERMINADO       // Cliente retiró
}

model Order {
  id          String      @id @default(cuid())
  userId      String
  operadorId  String?
  status      OrderStatus @default(BORRADOR)
  totalAmount Decimal     @db.Decimal(10, 2) @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user         User                 @relation(fields: [userId], references: [id])
  operador     Employee?            @relation(fields: [operadorId], references: [id])
  items        OrderItem[]
  statusHistory OrderStatusHistory[]

  @@map("orders")
}

// Historial de cambios de estado de cada pedido
model OrderStatusHistory {
  id                  String      @id @default(cuid())
  orderId             String
  fromStatus          OrderStatus?  // null en la creación inicial
  toStatus            OrderStatus
  // Actor que realizó el cambio (uno de los dos es no-null)
  changedByUserId     String?       // cliente (confirma el pedido)
  changedByEmployeeId String?       // operador o admin
  createdAt           DateTime    @default(now())

  order             Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  changedByUser     User?     @relation(fields: [changedByUserId], references: [id])
  changedByEmployee Employee? @relation(fields: [changedByEmployeeId], references: [id])

  @@map("order_status_history")
}

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  productId   String?  // null si el producto fue eliminado del catálogo
  productName String   // snapshot del nombre al momento del pedido
  unitPrice   Decimal  @db.Decimal(10, 2) // snapshot del precio
  quantity    Int
  isChecked   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@map("order_items")
}
```

---

## 3. Uso del historial de estados

### 3.1 Obtener el estado actual de un pedido
El campo `status` en `Order` es el estado actual denormalizado (para consultas rápidas sin JOIN). El historial es la fuente de verdad para auditoría.

### 3.2 Calcular tiempo de preparación por operador
```sql
-- Tiempo entre tomar el pedido (EN_PREPARACION) y marcarlo listo (LISTO)
SELECT
  e.name AS operador,
  AVG(
    EXTRACT(EPOCH FROM (h_listo.created_at - h_prep.created_at)) / 60
  ) AS tiempo_promedio_minutos
FROM order_status_history h_prep
JOIN order_status_history h_listo
  ON h_prep.order_id = h_listo.order_id
JOIN employees e
  ON h_prep.changed_by_employee_id = e.id
WHERE h_prep.to_status = 'EN_PREPARACION'
  AND h_listo.to_status = 'LISTO'
GROUP BY e.id, e.name;
```

### 3.3 Obtener fecha de confirmación de un pedido
```sql
SELECT created_at AS confirmed_at
FROM order_status_history
WHERE order_id = :orderId
  AND to_status = 'RECIBIDO'
LIMIT 1;
```

### 3.4 Auditoría completa de un pedido
```sql
SELECT
  h.created_at,
  h.from_status,
  h.to_status,
  COALESCE(u.name, e.name) AS actor,
  COALESCE(u.email, CAST(e.legajo AS TEXT)) AS identificador
FROM order_status_history h
LEFT JOIN users u ON h.changed_by_user_id = u.id
LEFT JOIN employees e ON h.changed_by_employee_id = e.id
WHERE h.order_id = :orderId
ORDER BY h.created_at ASC;
```

---

## 4. Decisiones de diseño

### 4.1 status en Order (denormalizado)
Se mantiene `status` en la tabla `Order` para que las consultas de la lista del operador (`WHERE status = 'RECIBIDO'`) sean eficientes sin necesidad de una subquery al historial.

### 4.2 fromStatus nullable
La primera entrada del historial (creación del pedido como BORRADOR) no tiene `fromStatus`. Todas las transiciones posteriores sí lo tienen, lo que permite reconstruir la secuencia completa.

### 4.3 Actor del cambio: dos FK opcionales
En lugar de una relación polimórfica (más compleja), se usan dos campos nullable: `changedByUserId` y `changedByEmployeeId`. La invariante es que exactamente uno de los dos debe ser no-null por registro.

### 4.4 Snapshot de precio y nombre en OrderItem
`unitPrice` y `productName` se copian al momento de crear el pedido. Si el precio del producto cambia, el historial de pedidos no se altera.

### 4.5 Soft delete en Product y Employee
`isActive = false` en lugar de DELETE físico, para preservar integridad referencial en pedidos históricos.

---

## 5. Índices recomendados

```sql
-- Lista del operador: pedidos activos ordenados por llegada
CREATE INDEX idx_orders_status_confirmed ON orders(status, updated_at);

-- Límite de 3 pedidos por operador
CREATE INDEX idx_orders_operador_status ON orders(operador_id, status);

-- Historial de un pedido (auditoría y estadísticas)
CREATE INDEX idx_history_order_id ON order_status_history(order_id);

-- Estadísticas por operador
CREATE INDEX idx_history_employee ON order_status_history(changed_by_employee_id, to_status);

-- Catálogo: búsqueda por categoría
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
```

---

## 6. Datos semilla (seed)

**Categorías:**
Frutas y Verduras, Lácteos, Bebidas, Carnes y Fiambres, Panadería y Pastas, Limpieza y Hogar, Congelados, Snacks y Golosinas

**Empleado administrador inicial:**
- Legajo: `1`
- Nombre: `Administrador`
- Contraseña: `admin123` *(cambiar en producción)*
- Rol: `ADMINISTRADOR`

**Productos de ejemplo:** 30 productos distribuidos entre las categorías, con precios en ARS.
