# RestSys — Frontend React

Interfaz web del cajero para el sistema RestSys.

## Requisitos

- Node.js 18+
- Backend RestSys corriendo en `http://localhost:3000`

## Instalación

```bash
npm install
npm run dev
```

La app queda disponible en: **http://localhost:5173**

## Pantallas

| Pantalla | Descripción |
|----------|-------------|
| **POS** | Punto de venta. Recibe órdenes del garzón vía WebSocket, gestión del carrito, verificación de tipo de cliente y cobro |
| **Ventas** | Listado de ventas del día con filtros por fecha y tipo de cliente. Exportación CSV |
| **Reportes** | Gráficos por período: tortas de tipo de cliente y método de pago, barras diarias |
| **Pensionados** | Gestión de empresas y empleados. Períodos de facturación con flujo PENDIENTE → FACTURADO → PAGADO |
| **Caja** | Apertura con monto inicial, resumen acumulado en tiempo real, cierre con conteo y cálculo de diferencia |

## Conexión con el backend

El proxy de Vite enruta automáticamente:
- `/api/*` → `http://localhost:3000/api`
- `/socket.io` → WebSocket en `http://localhost:3000`

Para producción, cambiar `baseURL` en `src/services/api.ts`.

## Estructura

```
src/
├── main.tsx              # Punto de entrada
├── App.tsx               # Layout + topbar + navegación
├── index.css             # Variables de diseño y estilos globales
├── types/index.ts        # Tipos TypeScript (espejo del backend)
├── services/
│   ├── api.ts            # Todas las llamadas REST con axios
│   └── socket.ts         # Cliente Socket.io
├── context/AppContext.tsx # Estado global (caja, órdenes garzón, hora)
├── utils/format.ts       # Formateo de pesos, fechas, labels
└── pages/
    ├── PosPage.tsx        # Pantalla principal de ventas
    ├── VentasPage.tsx     # Historial de ventas
    ├── ReportesPage.tsx   # Gráficos con Recharts
    ├── PensionadosPage.tsx# Empresas y períodos
    └── CajaPage.tsx       # Apertura y cierre
```
