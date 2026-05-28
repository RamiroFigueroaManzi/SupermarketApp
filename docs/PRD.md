# PRD — SuperMarket App
**Versión:** 1.0  
**Fecha:** 2026-05-28  
**Estado:** Borrador para revisión

---

## 1. Resumen ejecutivo

SuperMarket App es una aplicación web para un supermercado hipotético que digitaliza el proceso de pedidos. Los clientes crean pedidos mediante inteligencia artificial (texto o foto), los operadores los procesan físicamente, y el administrador supervisa el rendimiento y el historial.

---

## 2. Objetivos del producto

| # | Objetivo |
|---|----------|
| 1 | Permitir que los clientes realicen pedidos de supermercado sin asistencia presencial |
| 2 | Agilizar la creación de pedidos mediante IA que interpreta listas en lenguaje natural o fotografías |
| 3 | Dar a los operadores una interfaz clara para procesar pedidos en orden de llegada |
| 4 | Proveer al administrador visibilidad sobre el rendimiento operativo y las ventas |

---

## 3. Alcance

### Dentro del alcance
- Autenticación diferenciada por rol (Google OAuth para clientes, legajo + contraseña para empleados)
- Creación de pedidos asistida por IA (Gemini) a partir de texto libre o imagen
- CRUD completo de ítems dentro de un pedido antes de confirmarlo
- Seguimiento de estado del pedido en tiempo real (WebSockets)
- Interfaz de operador para procesar hasta 3 pedidos simultáneos
- Panel de administración: catálogo, empleados, historial, estadísticas
- Exportación de reportes a CSV

### Fuera del alcance
- Procesamiento de pagos (en ninguna de sus formas)
- Aplicación móvil nativa (iOS/Android)
- Integración con sistemas ERP o POS existentes
- Notificaciones push / SMS / email
- Múltiples sucursales

---

## 4. Personas de usuario

### 4.1 Cliente
- **Quién es:** Persona que realiza compras en el supermercado y usa la app para hacer pedidos anticipados
- **Necesidad principal:** Poder indicar su lista de compras de forma rápida y sin fricciones, y saber cuándo su pedido está listo
- **Dispositivo:** Principalmente móvil, también desktop
- **Nivel técnico:** Básico — debe ser intuitivo sin curva de aprendizaje

### 4.2 Operador de pedidos
- **Quién es:** Empleado del supermercado que arma físicamente los pedidos
- **Necesidad principal:** Ver los pedidos pendientes, saber exactamente qué productos incluir, e ir marcando ítems a medida que los carga
- **Dispositivo:** Tablet o desktop en la zona de preparación
- **Nivel técnico:** Medio — usa la app como herramienta de trabajo diaria

### 4.3 Administrador
- **Quién es:** Encargado o gerente del supermercado
- **Necesidad principal:** Mantener el catálogo actualizado, gestionar empleados, y analizar el desempeño del sistema
- **Dispositivo:** Desktop
- **Nivel técnico:** Medio-alto — familiarizado con herramientas de gestión

---

## 5. Requisitos funcionales

### 5.1 Autenticación y sesiones

| ID | Requisito |
|----|-----------|
| AUTH-01 | La pantalla inicial debe ser un login con dos opciones visibles: "Ingresar como cliente" (Google) y "Ingresar como empleado" |
| AUTH-02 | Los clientes se autentican exclusivamente via Google OAuth 2.0 |
| AUTH-03 | Los empleados (operadores y administradores) se autentican con legajo (número entero) y contraseña |
| AUTH-04 | Tras el login, cada rol debe ser redirigido a su interfaz específica |
| AUTH-05 | Las sesiones deben persistir con JWT seguro (httpOnly cookie) |
| AUTH-06 | Debe existir un botón de cierre de sesión accesible en todas las vistas autenticadas |

### 5.2 Módulo Cliente — Creación de pedido

| ID | Requisito |
|----|-----------|
| PED-01 | El cliente puede iniciar un nuevo pedido desde su pantalla principal |
| PED-02 | El cliente puede ingresar su lista por texto libre (ej: "2 litros de leche, 1 kg de manzanas") |
| PED-03 | El cliente puede subir una foto de su lista escrita a mano o impresa |
| PED-04 | El cliente puede tomar una foto con la cámara del dispositivo |
| PED-05 | La IA (Gemini) procesa el input y genera una lista de ítems estructurados mapeados al catálogo |
| PED-06 | Si la IA no puede mapear un ítem del catálogo, lo indica claramente al cliente |
| PED-07 | El cliente puede agregar productos adicionales al pedido generado |
| PED-08 | El cliente puede modificar la cantidad de cualquier ítem |
| PED-09 | El cliente puede eliminar cualquier ítem del pedido |
| PED-10 | El pedido muestra el total calculado (suma de precio × cantidad por ítem) en tiempo real |
| PED-11 | El cliente puede confirmar el pedido, que pasa al estado "Recibido" |
| PED-12 | Un pedido en estado "Borrador" no es visible para los operadores |

### 5.3 Módulo Cliente — Seguimiento

| ID | Requisito |
|----|-----------|
| SEG-01 | El cliente puede ver una lista de todos sus pedidos activos y su estado actual |
| SEG-02 | Los cambios de estado se reflejan en la interfaz del cliente en tiempo real sin recargar |
| SEG-03 | El cliente puede ver el detalle completo de cualquier pedido propio |
| SEG-04 | Cuando el pedido está en estado "Listo", el cliente es notificado visualmente |

### 5.4 Módulo Operador

| ID | Requisito |
|----|-----------|
| OP-01 | El operador ve una lista de todos los pedidos en estado "Recibido" o "En preparación", ordenados por hora de confirmación (FIFO) |
| OP-02 | La lista muestra: ID del pedido, nombre del cliente, cantidad de productos, estado |
| OP-03 | El operador puede tomar cualquier pedido de la lista, sin restricción de orden |
| OP-04 | El operador no puede tener más de 3 pedidos simultáneos en estado "En preparación" |
| OP-05 | Al seleccionar un pedido, el operador ve el detalle: ID, nombre cliente, lista de ítems |
| OP-06 | Cada ítem muestra: ID del producto, nombre, categoría, cantidad, checkbox de "cargado" |
| OP-07 | El operador puede marcar/desmarcar el checkbox de cada ítem libremente (sin efecto en el estado del pedido) |
| OP-08 | El operador puede cambiar el estado de "Recibido" a "En preparación" |
| OP-09 | El operador puede cambiar el estado de "En preparación" a "Listo" |
| OP-10 | El operador puede cambiar el estado de "Listo" a "Terminado" (cuando el cliente retira) |
| OP-11 | Un pedido en estado "Terminado" desaparece de la lista activa del operador |

### 5.5 Módulo Administrador — Catálogo

| ID | Requisito |
|----|-----------|
| CAT-01 | El administrador puede crear nuevas categorías de productos |
| CAT-02 | El administrador puede crear productos con: nombre, categoría, descripción, precio |
| CAT-03 | El administrador puede editar cualquier producto existente |
| CAT-04 | El administrador puede eliminar productos (con advertencia si hay pedidos activos que lo contienen) |
| CAT-05 | El catálogo es paginado y filtrable por nombre y categoría |

### 5.6 Módulo Administrador — Empleados

| ID | Requisito |
|----|-----------|
| EMP-01 | El administrador puede crear nuevos empleados con: nombre, legajo, contraseña, rol (operador/administrador) |
| EMP-02 | El administrador puede editar datos de empleados (excepto el legajo propio para evitar auto-bloqueo) |
| EMP-03 | El administrador puede desactivar empleados (no eliminar, para preservar historial) |

### 5.7 Módulo Administrador — Historial y Estadísticas

| ID | Requisito |
|----|-----------|
| HIST-01 | El administrador puede ver todos los pedidos en estado "Terminado" |
| HIST-02 | El historial es filtrable por: fecha (rango), monto total (rango), operador |
| HIST-03 | El administrador puede ver estadísticas: cantidad de pedidos procesados por operador |
| HIST-04 | El administrador puede ver estadísticas: tiempo promedio de preparación por operador |
| HIST-05 | El administrador puede ver gráficos de ventas por producto (top N más vendidos) |
| HIST-06 | El administrador puede ver gráficos de ventas por categoría |
| HIST-07 | El administrador puede exportar el historial filtrado a CSV |

---

## 6. Requisitos no funcionales

| ID | Categoría | Requisito |
|----|-----------|-----------|
| NFR-01 | Seguridad | Las contraseñas de empleados deben almacenarse con hash bcrypt |
| NFR-02 | Seguridad | Las rutas de API deben verificar el rol del usuario en cada request |
| NFR-03 | Seguridad | La clave de API de Gemini no debe exponerse al cliente |
| NFR-04 | Rendimiento | El tiempo de respuesta de la IA no debe superar 10 segundos en condiciones normales |
| NFR-05 | Disponibilidad | La app debe funcionar correctamente en Chrome, Firefox y Safari modernos |
| NFR-06 | Usabilidad | La interfaz del cliente debe ser operable con una sola mano en móvil |
| NFR-07 | Accesibilidad | Los colores deben cumplir contraste WCAG AA mínimo |
| NFR-08 | Escalabilidad | El modelo de datos debe soportar múltiples operadores concurrentes sin race conditions en el límite de 3 pedidos |

---

## 7. Estados del pedido — Máquina de estados

```
                    [cliente confirma]
[BORRADOR] ─────────────────────────────► [RECIBIDO]
                                               │
                                    [operador toma el pedido]
                                               │
                                               ▼
                                        [EN PREPARACIÓN]
                                               │
                                  [operador marca como listo]
                                               │
                                               ▼
                                            [LISTO]
                                               │
                              [cliente retira / operador confirma]
                                               │
                                               ▼
                                          [TERMINADO]
```

**Responsable por transición:**
| Transición | Actor |
|-----------|-------|
| BORRADOR → RECIBIDO | Cliente |
| RECIBIDO → EN PREPARACIÓN | Operador |
| EN PREPARACIÓN → LISTO | Operador |
| LISTO → TERMINADO | Operador (cuando el cliente retira físicamente) |

---

## 8. Criterios de aceptación globales

- Un cliente no puede ver pedidos de otro cliente
- Un operador no puede modificar los ítems de un pedido, solo su estado
- El administrador tiene acceso de lectura a todo, y escritura sobre catálogo y empleados
- Los pedidos terminados no pueden volver a estados anteriores
- La IA puede fallar: si Gemini devuelve error, se muestra mensaje claro al cliente y puede reintentar
