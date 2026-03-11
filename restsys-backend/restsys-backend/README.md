# RestSys — Backend NestJS

Sistema de gestión de ventas y caja para restaurante.

## Requisitos previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 3. Crear la base de datos en PostgreSQL
createdb restsys
# O desde psql: CREATE DATABASE restsys;

# 4. Iniciar el servidor (sincroniza el schema automáticamente en desarrollo)
npm run start:dev

# 5. Cargar datos iniciales (categorías, productos y empleados de ejemplo)
npm run seed
```

## URLs

- **API**: http://localhost:3000/api
- **Documentación Swagger**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000

## Estructura del proyecto

```
src/
├── main.ts                    # Punto de entrada
├── app.module.ts              # Módulo raíz
│
├── inventario/                # Contexto: productos y categorías
│   ├── entities/
│   │   ├── categoria.entity.ts
│   │   └── producto.entity.ts
│   ├── dto/
│   ├── inventario.service.ts
│   ├── inventario.controller.ts
│   └── inventario.module.ts
│
├── ventas/                    # Contexto: ventas y órdenes
│   ├── entities/
│   │   ├── venta.entity.ts
│   │   └── item-venta.entity.ts
│   ├── dto/
│   ├── ventas.service.ts
│   ├── ventas.controller.ts
│   └── ventas.module.ts
│
├── pensionados/               # Contexto: empresas y empleados con convenio
│   ├── entities/
│   │   ├── empresa.entity.ts
│   │   ├── empleado.entity.ts
│   │   └── periodo-facturacion.entity.ts
│   ├── dto/
│   ├── pensionados.service.ts
│   ├── pensionados.controller.ts
│   └── pensionados.module.ts
│
├── caja/                      # Contexto: apertura y cierre de caja diaria
│   ├── entities/
│   │   └── caja-diaria.entity.ts
│   ├── dto/
│   ├── caja.service.ts
│   ├── caja.controller.ts
│   └── caja.module.ts
│
├── websocket/                 # WebSocket para comunicación en tiempo real
│   ├── ordenes.gateway.ts     # Gateway Socket.io
│   └── websocket.module.ts
│
└── database/
    ├── seed.ts                # Datos iniciales
    └── data-source.ts         # Config TypeORM CLI
```

## Endpoints principales

### Productos (Inventario)
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | /api/productos | Listar todos |
| GET | /api/productos/disponibles | Solo disponibles (para el POS) |
| POST | /api/productos | Crear producto |
| PUT | /api/productos/:id | Actualizar producto |
| PATCH | /api/productos/:id/disponibilidad | Toggle disponible |
| GET | /api/productos/categorias/todas | Listar categorías |
| POST | /api/productos/categorias | Crear categoría |

### Ventas
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | /api/ventas | Listar con filtros (?desde=&hasta=&tipoCliente=) |
| POST | /api/ventas | Crear venta |
| PATCH | /api/ventas/:id/anular | Anular venta |
| GET | /api/ventas/reportes/dia | Resumen del día |
| GET | /api/ventas/reportes/periodo | Resumen por período |

### Pensionados
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | /api/pensionados/empresas | Listar empresas |
| POST | /api/pensionados/empresas | Crear empresa |
| GET | /api/pensionados/empleados | Listar empleados |
| GET | /api/pensionados/empleados/buscar-rut?rut= | Buscar por RUT |
| POST | /api/pensionados/empleados | Crear empleado |
| GET | /api/pensionados/periodos/empresa/:id | Períodos de una empresa |
| PATCH | /api/pensionados/periodos/:id/estado | Cambiar estado |

### Caja
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | /api/caja | Historial de cajas |
| GET | /api/caja/activa | Caja actual abierta |
| POST | /api/caja/abrir | Abrir caja con monto inicial |
| PATCH | /api/caja/:id/cerrar | Cerrar caja con conteo final |

## WebSocket (Socket.io)

### Eventos que el frontend ESCUCHA:
- `nueva_orden_garzon` — Orden nueva del garzón (cajero)
- `nueva_venta` — Venta procesada (cajero)
- `orden_procesada` — Confirmación de orden (garzón)
- `producto_agotado` — Producto sin stock (garzones)

### Eventos que el frontend EMITE:
- `unirse_sala` — Identificarse: `'cajero'` o `'garzones'`
- `enviar_orden` — Garzón envía nueva orden

## Tipos de cliente

| Tipo | Descripción | Pago |
|------|-------------|------|
| `PENSIONADO` | Empleado con convenio | Cuenta mensual |
| `PARTICULAR` | Cliente externo | Efectivo / Tarjeta / Transferencia |
| `PARTICULAR_FACTURA` | Cliente externo con factura | Requiere RUT |
| `PERSONAL` | Personal del restaurante | Sin cobro |

