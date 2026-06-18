# 🧁 Pastelería Martina · Dulce Descontrol

Plataforma web para gestionar los pedidos de una pastelería artesanal.
Proyecto del ramo de **Sistemas de Información**.

La aplicación tiene dos caras: una **pública**, donde los clientes encargan sus
pasteles, y una **privada** (el panel de Martina), donde se controla el negocio:
ingresos del mes, pedidos en curso e inventario.

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Problema de negocio](#problema-de-negocio)
- [Solución propuesta](#solución-propuesta)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Endpoints de la API](#endpoints-de-la-api)
- [Cómo ejecutar el backend](#cómo-ejecutar-el-backend)
- [Cómo ejecutar el frontend](#cómo-ejecutar-el-frontend)
- [Cómo desplegar](#cómo-desplegar)
- [Memoria en producción y SQL como respaldo](#memoria-en-producción-y-sql-como-respaldo)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)

---

## Descripción

Pastelería Martina centraliza la toma de pedidos y entrega a la dueña un panel
con la información clave para decidir. Reemplaza el cuaderno y los mensajes
sueltos por una herramienta única, simple y clara. El frontend se comunica con
el backend mediante llamadas `fetch` reales a una API REST.

## Problema de negocio

Los pedidos llegan por teléfono, WhatsApp e Instagram y se anotan a mano. Eso
provoca:

- **Pedidos perdidos o traspapelados** y fechas de entrega que se pasan.
- **Falta de visibilidad**: no se sabe rápido cuánto se vendió ni qué está
  pendiente.
- **Inventario "a ojo"**: faltan insumos a último minuto.

## Solución propuesta

- **Formulario de pedidos** que valida y registra cada encargo.
- **Panel de Martina** con ingresos del mes, ticket promedio, pedidos en curso y
  alertas de inventario, más una lectura del negocio en lenguaje natural.
- **Estados de pedido** (pendiente → confirmado → en preparación → entregado)
  para seguir cada encargo.

### Funcionalidades del Panel de Martina

- **Acceso con login** (sesión recordada en `localStorage`, con botón para
  cerrar sesión).
- **Recomendaciones automáticas** que, a partir de los pedidos pendientes, los
  pedidos en preparación y los insumos críticos, sugieren en qué enfocarse hoy.
- **Diagrama del flujo** de un pedido, para explicar de un vistazo las etapas.
- **Exportar a CSV** la tabla de pedidos, para llevarla a Excel o respaldarla.

> **Acceso de demo:** usuario `martina` · contraseña `dulce2026`. Es un login
> simple a nivel de cliente, pensado para la demostración académica (no es un
> sistema de autenticación de producción).

## Arquitectura

```
  Cliente / Martina (navegador)
            │  HTTP + JSON (fetch)
            ▼
  Frontend React + Vite  ──────►  Backend Node.js + Express
  (CSS puro, :5173)                (API REST + CORS, :3001)
                                          │
                                          ▼
                                Datos en memoria (arreglos)
                                + respaldo SQL documentado (/db)
```

- El **frontend** (`/frontend`) renderiza las vistas y consume la API.
- El **backend** (`/backend`) expone la API REST y mantiene los datos en memoria.
- El directorio **`/db`** contiene el modelo relacional equivalente (respaldo
  académico).

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite, CSS puro |
| Backend | Node.js + Express |
| Comunicación | API REST (JSON) con CORS |
| Datos (producción) | En memoria (arreglos en JavaScript) |
| Datos (respaldo) | SQL relacional documentado (PostgreSQL) |
| Despliegue | Render |

## Endpoints de la API

Base: `http://localhost:3001`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/pedidos` | Lista todos los pedidos |
| POST | `/api/pedidos` | Crea un pedido nuevo |
| PATCH | `/api/pedidos/:id/estado` | Cambia el estado de un pedido |
| GET | `/api/dashboard/metricas` | Indicadores del panel |
| GET | `/api/dashboard/inventario` | Estado de los insumos |

Todas las respuestas usan un formato consistente:

```json
{ "ok": true, "data": { } }
```

```json
{ "ok": false, "error": "mensaje legible", "detalles": [ ] }
```

**Ejemplo — crear un pedido:**

```bash
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Camila","telefono":"+56 9 1234 5678","detalle":"Torta de chocolate","fechaEntrega":"2026-07-15"}'
```

## Cómo ejecutar el backend

Requiere **Node.js 18 o superior**.

```bash
cd backend
npm install
npm start          # http://localhost:3001
```

Para desarrollo con recarga automática: `npm run dev`.

## Cómo ejecutar el frontend

En otra terminal (deja el backend corriendo primero):

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Luego abre **http://localhost:5173** en el navegador.

> Si cambias el puerto del backend, actualiza la constante `API` en
> `frontend/src/App.jsx`.

## Cómo desplegar

El proyecto está pensado para **Render** (plan gratuito):

1. **Backend** → *Web Service*
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Render asigna el puerto vía `process.env.PORT` (ya soportado).
2. **Frontend** → *Static Site*
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Antes de construir, apunta la constante `API` de `App.jsx` a la URL pública
     del backend desplegado.

## Memoria en producción y SQL como respaldo

El backend guarda los datos en **memoria** (arreglos en
`backend/db/connection.js`). Es una decisión deliberada:

- **Producción simple y gratuita:** no se necesita aprovisionar ni pagar una
  base de datos. La demo en Render funciona al instante y los pedidos nuevos
  persisten mientras el servidor esté corriendo. (Al reiniciar, vuelve a la
  precarga inicial: 5 clientes, 5 pedidos y 5 insumos.)
- **Diseño relacional documentado:** en `/db` está la versión SQL equivalente
  (`schema.sql` con el DDL y `seed.sql` con datos de prueba). Cumple la pauta de
  diseñar una base de datos relacional y deja lista la migración a PostgreSQL
  cuando el negocio lo requiera, sin rehacer el modelo.

En una palabra: **memoria** para desplegar fácil hoy, **SQL** como base formal y
escalable para mañana.

## Estructura del proyecto

```
proyecto SI/
├── backend/
│   ├── db/connection.js        # datos en memoria (5 clientes, 5 pedidos, 5 insumos)
│   ├── routes/pedidos.js       # GET / POST / PATCH de pedidos
│   ├── routes/dashboard.js     # métricas e inventario
│   ├── server.js               # Express + CORS + health
│   └── package.json
├── frontend/
│   ├── src/App.jsx             # vistas: cliente, Martina y proyecto
│   ├── src/main.jsx
│   ├── src/styles.css          # CSS puro (paleta de pastelería)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── db/
│   ├── schema.sql              # DDL del modelo relacional
│   └── seed.sql                # datos de prueba (DML)
└── docs/
    ├── informe-ejecutivo.md
    ├── bitacora-prompts.md
    ├── justificacion-stack.md
    └── guia-demo-video.md
```

## Documentación

En `/docs` encontrarás el informe ejecutivo, la bitácora de uso de IA, la
justificación del stack y la guía para grabar el video de demostración.
