# Informe ejecutivo — Pastelería Martina (Dulce Descontrol)

**Ramo:** Sistemas de Información
**Proyecto:** Aplicación web (sistema de información) de gestión de pedidos para una pastelería
**Estado:** Funcional (backend + frontend conectados con `fetch` real)

---

## 1. Resumen

Pastelería Martina es una aplicación web que ordena la operación diaria de una
pastelería artesanal. Tiene dos caras complementarias: una pública, donde los
clientes encargan sus pasteles, y una privada, donde la dueña (Martina) revisa
en un panel el estado del negocio: ingresos del mes, pedidos en curso y alertas
de inventario. El objetivo es reemplazar el cuaderno y los mensajes sueltos por
una herramienta única, simple y clara.

## 2. Problema de negocio

Hoy los pedidos llegan por teléfono, WhatsApp e Instagram y se anotan a mano.
Eso genera tres dolores concretos:

- **Pedidos que se pierden o se traspapelan**, con fechas de entrega que se
  pasan por alto.
- **Falta de visibilidad**: no hay forma rápida de saber cuánto se vendió en el
  mes ni qué pedidos están en curso.
- **Inventario descontrolado**: los insumos se controlan "a ojo" y más de una
  vez faltan ingredientes a último minuto.

## 3. Objetivo

Construir una aplicación web que centralice la toma de pedidos y entregue a
Martina un panel de control con la información clave para tomar decisiones.

## 4. Solución propuesta

| Necesidad | Cómo la resuelve el sistema |
|-----------|------------------------------|
| Registrar pedidos sin perderlos | Formulario web que valida y guarda cada pedido |
| Saber cuánto se vende | Tarjeta de "ingresos del mes" + ticket promedio |
| Seguir cada encargo | Estados: cotizado → confirmado → en producción → entregado |
| Controlar el stock | Sección de inventario con alertas de insumos críticos |
| Leer el negocio de un vistazo | Resumen del panel en lenguaje natural |

## 5. Arquitectura (visión general)

```
  Cliente / Martina (navegador)
            │  HTTP + JSON (fetch)
            ▼
  Frontend React + Vite  ──────►  Backend Node.js + Express
  (CSS puro)                       (API REST, CORS)
                                          │
                                          ▼
                                Datos en memoria (arreglos)
                                + respaldo SQL documentado (/db)
```

- **Frontend** (`/frontend`): React + Vite, estilos en CSS puro. Consume la API
  con `fetch`.
- **Backend** (`/backend`): API REST con Express y CORS. Los datos viven en
  memoria mientras el servidor corre.
- **Respaldo SQL** (`/db`): modelo relacional equivalente (DDL + datos de
  prueba) para documentar el diseño de la base de datos.

## 6. Endpoints principales

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/pedidos` | Lista de pedidos |
| POST | `/api/pedidos` | Crea un pedido |
| PATCH | `/api/pedidos/:id/estado` | Avanza el estado de un pedido |
| GET | `/api/dashboard/metricas` | Indicadores del panel |
| GET | `/api/dashboard/inventario` | Estado de los insumos |

## 7. Evidencia y resultados

- El formulario crea pedidos reales que quedan disponibles de inmediato en el
  panel de Martina (verificado de punta a punta).
- Las validaciones devuelven mensajes claros cuando faltan datos o la fecha es
  inválida.
- Las métricas se calculan a partir de los datos vigentes (ingresos del mes,
  pedidos por estado, alertas de inventario).
- El panel permite hacer avanzar un pedido por su flujo de estados y ver cómo se
  actualizan los indicadores.

## 8. Conclusiones

El proyecto demuestra, en un caso realista y acotado, el ciclo completo de un
sistema de información: captura de datos, procesamiento, almacenamiento y
entrega de información útil para la toma de decisiones. La arquitectura elegida
prioriza la simplicidad y la facilidad de despliegue, manteniendo documentado el
modelo relacional para una eventual migración a una base de datos persistente.
