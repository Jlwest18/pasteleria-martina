# 🧁 Pastelería Martina · Dulce Descontrol

**Aplicación web funcional de Sistemas de Información** para la gestión de una
pastelería artesanal. No es un sitio informativo: es un **sistema web** que
captura pedidos, los procesa, mantiene su trazabilidad y entrega información para
la toma de decisiones del negocio.

El sistema tiene dos módulos: una **interfaz de autoatención** para que los
clientes registren sus pedidos, y un **dashboard operativo, financiero y de
inventario** (el panel de Martina) para gestionar el negocio.

---

## Tabla de contenidos

- [Problema del negocio](#problema-del-negocio)
- [Oportunidad de mejora](#oportunidad-de-mejora)
- [Requerimientos funcionales](#requerimientos-funcionales)
- [Requerimientos no funcionales](#requerimientos-no-funcionales)
- [Arquitectura](#arquitectura-front-end--back-end--sql)
- [Stack tecnológico](#stack-tecnológico)
- [Endpoints de la API](#endpoints-de-la-api)
- [Cómo ejecutar](#cómo-ejecutar)
- [Cómo desplegar](#cómo-desplegar)
- [Credenciales del panel](#credenciales-del-panel)
- [Datos en memoria + modelo SQL](#datos-en-memoria--modelo-sql-de-respaldo)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)

---

## Problema del negocio

Pastelería Martina recibe pedidos por teléfono, WhatsApp e Instagram y los anota
a mano en un cuaderno. A medida que crece la demanda, ese método informal
provoca:

- **Pérdida de pedidos** y fechas de entrega que se pasan por alto.
- **Falta de visibilidad financiera**: no se sabe con rapidez cuánto se vendió ni
  cuánto está comprometido en pedidos por entregar.
- **Inventario descontrolado**: los insumos se gestionan "a ojo" y faltan
  materias primas a último minuto.
- **Sin trazabilidad**: no hay forma clara de saber en qué etapa va cada encargo.

## Oportunidad de mejora

Centralizar la operación en una sola aplicación web que ordene el flujo completo
—desde que el cliente solicita un pedido hasta que se entrega— y que transforme
los datos dispersos en **información útil para decidir**: cuánto se factura,
cuánto se espera recibir, qué pedidos están en curso y qué insumos reponer. Esto
reduce errores, mejora la planificación y profesionaliza la atención.

## Requerimientos funcionales

| ID | Requerimiento |
|----|---------------|
| RF1 | El cliente puede registrar un pedido (nombre, teléfono, detalle, fecha de entrega) desde la interfaz de autoatención. |
| RF2 | El sistema valida los datos del pedido e informa errores claros. |
| RF3 | El sistema almacena los pedidos y los mantiene disponibles durante la sesión del servidor. |
| RF4 | Martina accede al panel mediante autenticación. |
| RF5 | El panel muestra métricas: ingresos del mes, ingresos esperados, pedidos en curso e inventario crítico. |
| RF6 | El panel lista los pedidos con su estado y permite hacerlos avanzar (trazabilidad). |
| RF7 | El sistema gestiona el inventario, permite editar los insumos desde el panel y alerta de insumos críticos. |
| RF8 | El panel genera recomendaciones de gestión para apoyar la toma de decisiones. |
| RF9 | El panel permite exportar los pedidos a CSV. |

## Requerimientos no funcionales

| ID | Requerimiento |
|----|---------------|
| RNF1 | **Usabilidad:** interfaz clara, en español chileno neutro, responsiva (escritorio y móvil). |
| RNF2 | **Rendimiento:** respuestas de la API prácticamente inmediatas (datos en memoria). |
| RNF3 | **Mantenibilidad:** código simple y comentado, separado en frontend y backend. |
| RNF4 | **Portabilidad:** desplegable en Render sin infraestructura adicional. |
| RNF5 | **Interoperabilidad:** API REST con respuestas JSON consistentes; exportación a CSV. |
| RNF6 | **Compatibilidad:** comunicación frontend–backend habilitada vía CORS. |

## Arquitectura (Front-end / Back-end / SQL)

```
  ┌─────────────────────────────┐         ┌──────────────────────────────┐
  │  FRONT-END (cliente web)    │  HTTP   │  BACK-END (servidor)         │
  │  React + Vite, CSS puro     │  JSON   │  Node.js + Express + CORS    │
  │  · Autoatención de pedidos  │ ──────► │  · API REST /api/...         │
  │  · Dashboard de Martina     │ ◄────── │  · Lógica de negocio         │
  └─────────────────────────────┘         └──────────────┬───────────────┘
                                                          │
                                          ┌───────────────┴───────────────┐
                                          │  DATOS                         │
                                          │  · En memoria (arreglos JS)    │
                                          │  · Modelo SQL relacional (/db) │
                                          └────────────────────────────────┘
```

- **Front-end** (`/frontend`): capa de presentación. Renderiza las dos interfaces
  y consume la API con `fetch`. No contiene lógica de negocio crítica.
- **Back-end** (`/backend`): capa de aplicación. Expone la API REST, valida los
  datos, calcula métricas y mantiene el estado de los pedidos.
- **SQL** (`/db`): capa de datos documentada. Modelo relacional normalizado
  (DDL + datos de prueba) que representa formalmente la persistencia del sistema.
  Su diagrama entidad-relación está en
  [`docs/modelo-er.md`](docs/modelo-er.md).

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Front-end | React + Vite, CSS puro |
| Back-end | Node.js + Express |
| Comunicación | API REST (JSON) con CORS |
| Datos (demo/despliegue) | En memoria (arreglos en JavaScript) |
| Datos (modelo formal) | SQL relacional documentado (PostgreSQL) |
| Despliegue | Render |

## Endpoints de la API

Base: `http://localhost:3001`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/pedidos` | Lista todos los pedidos |
| POST | `/api/pedidos` | Registra un pedido nuevo |
| PATCH | `/api/pedidos/:id/estado` | Hace avanzar el estado de un pedido |
| GET | `/api/dashboard/metricas` | Indicadores del panel |
| GET | `/api/dashboard/inventario` | Estado de los insumos |
| PUT | `/api/dashboard/inventario/:id` | Actualiza un insumo (stock, mínimo, unidad o nombre) |

Todas las respuestas usan un formato consistente:

```json
{ "ok": true, "data": { } }
```

```json
{ "ok": false, "error": "mensaje legible", "detalles": [ ] }
```

**Estados de un pedido (trazabilidad):**
`cotizado → confirmado → en producción → entregado`

**Ejemplo — registrar un pedido:**

```bash
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Camila","telefono":"+56 9 1234 5678","detalle":"Torta de chocolate","fechaEntrega":"2026-07-15"}'
```

**Ejemplo — actualizar un insumo del inventario:**

```bash
curl -X PUT http://localhost:3001/api/dashboard/inventario/4 \
  -H "Content-Type: application/json" \
  -d '{"stock":10,"stockMinimo":4,"unidad":"kg"}'
```

Los campos son opcionales (se actualiza solo lo que llegue) y los valores
numéricos no pueden ser negativos. Al guardar, las métricas y alertas del panel
se recalculan al instante.

## Cómo ejecutar

Requiere **Node.js 18 o superior**. El back-end y el front-end son proyectos npm
independientes; cada uno se ejecuta desde su carpeta.

**Back-end** (en una terminal):

```bash
cd backend
npm install
npm start          # http://localhost:3001
```

**Front-end** (en otra terminal, con el back-end ya corriendo):

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Luego abre **http://localhost:5173**. Si cambias el puerto del back-end,
actualiza la constante `API` en `frontend/src/App.jsx`.

## Cómo desplegar

Pensado para **Render** (plan gratuito):

1. **Back-end** → *Web Service*
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Render asigna el puerto vía `process.env.PORT` (ya soportado).
2. **Front-end** → *Static Site*
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Antes de construir, apunta la constante `API` de `App.jsx` a la URL pública
     del back-end desplegado.

## Credenciales del panel

El dashboard de Martina está protegido por un login simple (la sesión se recuerda
en `localStorage`):

- **Usuario:** `martina`
- **Contraseña:** `dulce2026`

> Es una autenticación a nivel de cliente, apropiada para la demostración
> académica; no corresponde a un sistema de seguridad de producción.

## Datos en memoria + modelo SQL de respaldo

El back-end opera con los datos **en memoria** (arreglos en
`backend/db/connection.js`). Es una decisión deliberada:

- **Demo y despliegue simples:** no se necesita aprovisionar ni pagar una base de
  datos; la aplicación se publica en Render y funciona al instante. Los pedidos
  nuevos persisten mientras el servidor esté corriendo (al reiniciarlo, vuelve a
  la precarga: 5 clientes, 5 pedidos y 5 insumos).
- **Modelo SQL relacional para el requisito académico:** en `/db` se incluye la
  versión SQL equivalente (`schema.sql` con el DDL y `seed.sql` con datos de
  prueba). Cumple el requisito de diseñar una base de datos relacional y deja
  lista la migración a PostgreSQL cuando el negocio lo requiera, sin rehacer el
  modelo.

> **Coherencia con el modelo relacional:** el modelo en memoria refleja la
> relación **pedido–insumo** de forma simplificada: cada pedido lleva un arreglo
> `insumosEstimados` (`{ insumoId, cantidad }`) que representa, embebida, la misma
> relación N:M que en SQL está normalizada en la tabla `pedido_insumos`. Con
> esos datos el panel calcula el stock comprometido y proyectado de cada insumo.
> Ver el [diagrama entidad-relación](docs/modelo-er.md).

En síntesis: **memoria** para desplegar fácil hoy; **SQL** como modelo de datos
formal y escalable.

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
│   ├── public/images/          # fotos del sitio (ver "Fotografías" abajo)
│   ├── src/App.jsx             # vistas: autoatención, dashboard y proyecto
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
    ├── modelo-er.md            # diagrama entidad-relación (Mermaid)
    └── guia-demo-video.md
```

## Fotografías

La vista de cliente usa fotos reales en la portada (hero), las tarjetas de
productos (tortas, cupcakes, mesas dulces) y la sección de pastelería artesanal.

Por defecto apuntan a imágenes públicas y estables de **Unsplash** (libres, sin
atribución obligatoria) solo como referencia visual. Para usar las **fotos
propias de Martina**:

1. Deja tus archivos en `frontend/public/images/` (quedan accesibles como
   `/images/<archivo>`). Ver la guía en `frontend/public/images/README.md`.
2. En `frontend/src/App.jsx`, edita la constante **`IMAGENES`** (cerca del inicio
   del archivo) y reemplaza cada URL de Unsplash por la ruta local, por ejemplo:

   ```js
   const IMAGENES = {
     hero: "/images/hero.jpg",
     tortas: "/images/torta-chocolate.jpg",
     cupcakes: "/images/cupcakes.jpg",
     mesasDulces: "/images/mesa-dulce.jpg",
     artesanal: "/images/pasteleria-artesanal.jpg",
   };
   ```

Recomendación: fotos JPG, ~800 px de ancho y menos de 300 KB para que el sitio
cargue liviano y no dependa de assets pesados.

## Documentación

En `/docs` están el informe ejecutivo, la bitácora de uso de IA, la justificación
del stack, el [diagrama entidad-relación](docs/modelo-er.md) del modelo SQL y la
guía para grabar el video de demostración.
