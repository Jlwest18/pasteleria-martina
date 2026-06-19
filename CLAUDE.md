# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Pastelería Martina" (slogan: *Dulce Descontrol*) — a web app for a bakery, built for a university Sistemas de Información course. Three views in one React app: a **client** order form (`VistaCliente`), **Martina's** admin dashboard (`VistaMartina`), and an academic **project** view (`VistaProyecto`, problema/solución + stack). Code and comments are in neutral Chilean Spanish and kept simple enough to explain in class.

Companion docs live outside the two apps: `/db` (relational SQL backup — `schema.sql` DDL + `seed.sql` DML, not executed at runtime; the in-memory model mirrors it, including the `pedido_insumos` N:M relation via each pedido's `insumosEstimados` array) and `/docs` (informe ejecutivo, bitácora de prompts, justificación de stack, modelo ER en Mermaid, guía de demo). `README.md` is the full project writeup.

## Hard constraints (do not violate)

- **Backend deps:** only `express` and `cors`. No database packages of any kind — no `sqlite3`, `better-sqlite3`, Prisma, MongoDB, or any external DB.
- **Data lives in memory** as plain arrays in `backend/db/connection.js`. New orders persist only while the server process runs; restarting reverts to the seeded data (5 clientes, 5 pedidos, 5 insumos).
- **Frontend:** React + Vite with **plain CSS only**. No Tailwind, no Bootstrap, no UI kit. Data comes from the backend via real `fetch` calls.

## Commands

Backend and frontend are **separate npm projects**; run each from its own folder.

```bash
# Backend (http://localhost:3001)
cd backend && npm install && npm start     # or: npm run dev  (node --watch)

# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```

Start the backend first — the frontend calls it directly. There is no test/lint setup.

## API contract

Every `/api` response uses an envelope. Success: `{ ok: true, data: ... }` (POST also adds `mensaje`). Error: `{ ok: false, error: "...", detalles?: [{campo, mensaje}] }`. The frontend's `leerRespuesta()` helper unwraps this — **if you change the envelope shape, update that helper too.** Endpoints: `GET /api/health`, `GET|POST /api/pedidos`, `PATCH /api/pedidos/:id/estado`, `GET /api/dashboard/metricas`, `GET /api/dashboard/inventario`, `PUT /api/dashboard/inventario/:id` (edits an insumo: `nombre`/`unidad`/`stock`/`stockMinimo`, all optional, numbers non-negative).

## Architecture

**Backend (`backend/`)** — Express API, port `process.env.PORT || 3001`.
- `server.js` mounts CORS + JSON parsing, the `/api/health` check, both routers, and a catch-all `/api` 404.
- `db/connection.js` is the single source of truth: exports `ESTADOS` (the 4-state flow `cotizado → confirmado → en producción → entregado`), the `clientes`/`pedidos`/`insumos` arrays, and `siguienteIdPedido()`. Each pedido carries `insumosEstimados: [{insumoId, cantidad}]` (the embedded N:M pedido–insumo relation). Seed dates are generated for the **current month** (via `new Date()`) so "ingresos del mes" is non-zero. Routes mutate these arrays in place.
- `routes/pedidos.js` — `GET /` lists; `POST /` runs `validarPedido()` which collects **all** field errors at once (name 2–60, phone ≥8 digits, detail 5–300, date valid + not past), then appends `estado: "cotizado"`, `total: 0`; `PATCH /:id/estado` validates against `db.ESTADOS` and updates in place.
- `routes/dashboard.js` — `consumoComprometido()` sums each insumo's `cantidad` across non-entregado pedidos. `GET /metricas` returns `ingresosMes`, `ingresosEsperados` (sum of `total` for non-entregado pedidos), `ticketPromedio`, `pedidosEntregadosMes`, `pedidosEnCurso` (not entregado), `pedidosPorConfirmar` (estado `cotizado`), `porEstado`, `alertasInventario`, `insumosCriticos`, `insumosBajoCompromiso` (non-critical insumos whose `stock − comprometido < stockMinimo`). `GET /inventario` returns per-insumo `estado` via `clasificarInsumo()` (`crítico` stock ≤ min, `bajo` stock ≤ min×1.5, else `ok`) plus `comprometido` and `stockProyectado`. `PUT /inventario/:id` runs `validarInventario()` (collects all errors; only sent fields are updated; numbers must be ≥ 0) and `Object.assign`s them onto the in-memory insumo, returning it recomputed like `GET /inventario`. The frontend's `ItemInventario` component edits stock/mínimo/unidad inline and reloads the panel so metrics/alerts update.

**Frontend (`frontend/`)** — single React app, everything in `src/App.jsx`.
- `App` switches between `VistaCliente`, `VistaMartina`, `VistaProyecto`. `VistaMartina` is a **login gate** (client-side only): it checks `localStorage[CLAVE_SESION]` and renders `LoginMartina` (validates `CREDENCIALES` = `martina`/`dulce2026`) or `PanelMartina`. This is demo-level auth, not real security — there is no backend auth.
- `PanelMartina` fetches the 3 endpoints in parallel (`Promise.all`) and renders: `ResumenMetricas` (natural language), metric cards, `Recomendaciones` (decision-support text from `generarRecomendaciones()`), `FlujoPedidos` (state diagram), the pedidos table with a CSV export button (`exportarPedidosCSV()`, native `Blob`) and a **"→ next state" button** that PATCHes `/api/pedidos/:id/estado` then reloads so metrics update live, plus inventory.
- Top-of-file constants/helpers: `API` base URL, `FLUJO_ESTADOS`, `CREDENCIALES`, `CLAVE_SESION`, `formatoCLP`, `claseEstado()` (accented states → ASCII CSS suffixes), `siguienteEstado()`, `leerRespuesta()`, `generarRecomendaciones()`, `exportarPedidosCSV()`.
- `src/styles.css` — all styling. Warm bakery palette as CSS variables in `:root`; responsive via grid + media queries.

## Conventions

- The 4-state flow lives in two places that must stay in sync: `ESTADOS` in `backend/db/connection.js` and `FLUJO_ESTADOS` in `App.jsx`. Adding a state also means adding a `claseEstado()` mapping + matching `.pildora--`/`.chip--` CSS.
- `estado` strings carry accents/spaces ("en producción", "crítico"); `claseEstado()` normalizes to ASCII class suffixes (`produccion`, `critico`).
- If the backend port changes, update the `API` constant in `App.jsx`.
- Keep the apps decoupled: HTTP-only, no cross-imports between `backend/` and `frontend/`. `/db` and `/docs` are documentation, never imported by either app.
