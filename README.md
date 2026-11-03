# POWER FITNESS · Aplicación web

Panel de administración y kiosko de acceso del gimnasio. React 18 + TypeScript + Vite + Tailwind + TanStack Query + Recharts.
Backend: [powerfitness-backend](https://github.com/JanderC/powerfitness-backend).

## Inicio rápido

```bash
npm install
npm run dev          # http://localhost:5173  (redirige /api a http://localhost:5000)
```

Para apuntar a un backend desplegado, crea `.env` a partir de `.env.example`:

```
VITE_API_URL=https://tu-backend.up.railway.app
```

y agrega ese origen del frontend en `CORS_ORIGIN` del backend.

## Pantallas

| Ruta | Qué es |
|---|---|
| `/` | Dashboard: asistencia, finanzas del mes, por vencer, vencidas, cumpleaños, stock bajo |
| `/membresias` | Mensualidades: por vencer, al día, vencidas, congeladas, historial, renovar, WhatsApp |
| `/clientes`, `/clientes/:id` | Clientes y ficha completa (línea de tiempo, pagos, asistencia, deudas) |
| `/planes` | Planes y precios |
| `/vender`, `/productos` | Punto de venta con carrito e inventario |
| `/deudas` | Saldos pendientes y abonos |
| `/caja` | Caja por sesiones: apertura con base, movimientos del turno, cierre con arqueo por billetes, comprobante imprimible e historial |
| `/caja-fuerte` | Caja fuerte (protegida con contraseña) |
| `/reportes` | Ingresos, por plan, asistencia y horas pico, productos, inactivos |
| `/empleados`, `/usuarios` | Solo administrador |
| `/kiosko` | Registro de entrada por cédula (sin sesión) |

## Identidad visual

Paleta Power Fitness (`tailwind.config.js`): azul `#1E6FE3` / `#3D8EFF`, morado `#6B3FA0`, fondo azul noche `#07071A`.
Tipografías: Bebas Neue (títulos) e Inter (texto). Logo en `public/logo.png`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve el build |
