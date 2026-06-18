# Bitácora de prompts (uso de IA)

Este documento deja evidencia de cómo se usó asistencia de IA (Claude) para
construir el proyecto, en reemplazo de las herramientas NotebookLM/Stitch. La
idea es ser transparentes: la IA se usó como apoyo para acelerar el desarrollo,
pero cada decisión de diseño, validación y prueba se revisó manualmente.

> **Buena práctica aplicada:** los prompts fueron específicos (stack, archivos
> exactos, restricciones), y cada entrega se probó antes de avanzar al siguiente
> paso.

---

## Iteración 1 — Estructura inicial

**Intención:** levantar el esqueleto del proyecto y dejar una guía para el
repositorio.

**Prompt (resumen):**
> "Analiza el proyecto y crea un archivo de documentación. La estructura tendrá
> un backend y un frontend."

**Resultado:** definición de la estructura base `backend/` + `frontend/` y notas
del stack elegido (Node + Express, React).

---

## Iteración 2 — Construcción de la aplicación

**Intención:** generar la primera versión funcional completa.

**Prompt (resumen):**
> "Construir 'Pastelería Martina / Dulce Descontrol'. Backend Node + Express con
> CORS, solo express y cors, sin bases de datos externas, datos en memoria en
> `backend/db/connection.js` con 5 clientes, 5 pedidos y 5 insumos. Frontend
> React + Vite con CSS puro y `fetch` real. Estructura y endpoints exactos.
> Vista cliente con formulario de pedido y vista Martina con dashboard."

**Resultado:** backend con endpoints `GET/POST /api/pedidos` y
`GET /api/dashboard/metricas|inventario`; frontend con las dos vistas. Probado
con `curl` (creación de pedidos y métricas correctas).

**Decisiones revisadas a mano:**
- Las fechas de la precarga se generan sobre el mes actual para que el dashboard
  muestre ingresos del mes distintos de cero.
- Los pedidos nuevos entran en cotización y con total 0 ("por cotizar").

---

## Iteración 3 — Mejoras para la pauta (nota máxima)

**Intención:** subir la calidad del proyecto y cumplir la pauta oficial.

**Prompt (resumen):**
> "Revisa y mejora el proyecto: documentación en `/docs`, modelo SQL en `/db`,
> validaciones más claras, respuestas JSON profesionales, endpoint
> `/api/health`, mejores métricas, mejor diseño visual, navegación clara,
> estados de pedido visuales y sección de problema/solución. Mantener solo
> express y cors; no romper lo que ya funciona."

**Resultado:**
- Backend: validación que junta todos los errores, envelope `{ ok, data }`,
  endpoint de salud, métricas ampliadas (ticket promedio, pedidos por estado) y
  `PATCH /api/pedidos/:id/estado`.
- Frontend: portada tipo pastelería, navegación de 3 vistas, dashboard con
  lectura en lenguaje natural, tabla con avance de estado y sección "problema
  detectado / solución propuesta".
- Documentación: `/docs` y modelo relacional en `/db`.

**Verificación:** se probaron todos los endpoints con `curl` (incluyendo casos
de error) y se compiló el frontend con `vite build` sin errores.

---

## Iteración 4 — Funcionalidades de aplicación

**Intención:** acercar el proyecto a un sistema de información completo.

**Prompt (resumen):**
> "Agrega login simple al panel (martina / dulce2026, sesión en localStorage y
> cerrar sesión), una explicación visual del flujo de pedidos, exportación de la
> tabla a CSV y recomendaciones automáticas basadas en pedidos e inventario.
> Mantén React + CSS puro y backend con express y cors."

**Resultado:** acceso al panel, diagrama del flujo, botón de exportar CSV
(con `Blob`, sin librerías) y tarjeta de recomendaciones para la toma de
decisiones. Documentación y `vite build` actualizados.

---

## Iteración 5 — Enfoque de Sistemas de Información

**Intención:** ajustar el proyecto para que calce con la pauta como una
**aplicación web funcional**, no como una página simple.

**Prompt (resumen):**
> "Reformula textos y documentación para hablar de 'aplicación/sistema web'.
> Cambia los estados a cotizado → confirmado → en producción → entregado.
> Confirma /db y /docs. Actualiza el README con problema, oportunidad,
> requerimientos funcionales y no funcionales, arquitectura, endpoints,
> despliegue y credenciales. Presenta la vista cliente como autoatención y el
> panel como dashboard operativo, financiero y de inventario."

**Resultado:**
- Estados renombrados en backend, frontend y modelo SQL.
- Nueva métrica de **ingresos esperados** y lenguaje de SI (trazabilidad, toma
  de decisiones, ingresos esperados, gestión de inventario).
- README reescrito con requerimientos funcionales/no funcionales y arquitectura
  por capas.

**Verificación:** `vite build` y pruebas de la API con `curl`.

---

## Reflexión

La IA aceleró el trabajo repetitivo (scaffolding, estilos, documentación), pero
el criterio sobre el problema de negocio, el modelo de datos y las reglas de
validación se definió y revisó de forma humana. Todo el código es simple a
propósito, para poder explicarlo en la presentación.
