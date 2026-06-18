# Guía para el video de demostración

Pauta sugerida para grabar una demo clara y profesional de **3 a 5 minutos**.
La idea es contar una historia: primero el problema, después cómo el sistema lo
resuelve. Habla con naturalidad; esto es un guion, no un libreto para leer.

## Antes de grabar

- [ ] Backend corriendo (`cd backend && npm start`).
- [ ] Frontend corriendo (`cd frontend && npm run dev`).
- [ ] Navegador abierto en `http://localhost:5173`.
- [ ] Cierra pestañas y notificaciones que distraigan.

## Guion paso a paso

### 1. Presentación (20–30 s)
- Muéstrate o presenta el proyecto: *"Esta es Pastelería Martina, una plataforma
  para ordenar los pedidos de una pastelería artesanal."*
- Abre la pestaña **"Sobre el proyecto"** y explica brevemente el **problema
  detectado** y la **solución propuesta**.

### 2. Vista cliente (60–80 s)
- Vuelve a **"Encargar pastel"**. Muestra la portada y las especialidades.
- Llena el formulario con un pedido de ejemplo (nombre, teléfono, detalle, fecha).
- Envía y muestra el **mensaje de éxito**.
- *Opcional:* intenta enviar con un dato malo (por ejemplo, fecha pasada o
  teléfono corto) para mostrar las **validaciones claras**.

### 3. Panel de Martina (90–120 s)
- Cambia a **"Panel de Martina"**.
- Lee en voz alta el **resumen en lenguaje natural** (ingresos del mes, pedidos
  en curso, inventario).
- Muestra las **tarjetas de métricas** y el **desglose por estado**.
- En la **tabla de pedidos**, ubica el pedido que acabas de crear (estará al
  final, como *pendiente*).
- Usa el botón **"→ confirmado"** para hacerlo avanzar y muestra cómo cambian el
  estado y las métricas al actualizarse.
- Muestra la **sección de inventario** y señala los insumos en estado **crítico**.

### 4. Cierre técnico (30–40 s)
- Menciona el stack: *"Frontend en React con Vite, backend en Node con Express,
  datos en memoria y un modelo SQL documentado de respaldo."*
- *Opcional:* muestra el endpoint `http://localhost:3001/api/health` en el
  navegador para evidenciar que la API está viva.
- Cierra con una frase de conclusión sobre cómo el sistema ordena el negocio.

## Consejos

- Graba en pantalla completa y con buena resolución.
- Habla pausado; es mejor 4 minutos claros que 2 apurados.
- Si algo falla en vivo, no te detengas: explícalo con calma y sigue.
- Ten dos pestañas listas (frontend y `/api/health`) para no perder tiempo.
