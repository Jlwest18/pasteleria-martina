const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// Clasifica un insumo según su stock disponible:
//   crítico -> stock en o bajo el mínimo (hay que reponer ya)
//   bajo    -> stock cercano al mínimo (conviene vigilar)
//   ok      -> stock holgado
function clasificarInsumo(insumo) {
  if (insumo.stock <= insumo.stockMinimo) return "crítico";
  if (insumo.stock <= insumo.stockMinimo * 1.5) return "bajo";
  return "ok";
}

// GET /api/dashboard/metricas -> indicadores para las tarjetas del panel.
router.get("/metricas", (req, res) => {
  const mesActual = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Pedidos entregados dentro del mes en curso.
  const entregadosMes = db.pedidos.filter(
    (p) => p.estado === "entregado" && p.fechaCreacion.startsWith(mesActual)
  );

  // Ingresos del mes: suma del total de esos pedidos entregados.
  const ingresosMes = entregadosMes.reduce((suma, p) => suma + p.total, 0);

  // Ticket promedio: cuánto factura, en promedio, cada pedido entregado del mes.
  const ticketPromedio = entregadosMes.length
    ? Math.round(ingresosMes / entregadosMes.length)
    : 0;

  // Conteo de pedidos por estado (sirve para el desglose del panel).
  const porEstado = db.ESTADOS.reduce((acc, estado) => {
    acc[estado] = db.pedidos.filter((p) => p.estado === estado).length;
    return acc;
  }, {});

  // Pedidos pendientes: aún sin confirmar.
  const pedidosPendientes = porEstado["pendiente"];

  // Pedidos en curso: todo lo que aún no se entrega (trabajo activo del taller).
  const pedidosEnCurso = db.pedidos.filter((p) => p.estado !== "entregado").length;

  // Insumos en estado crítico (alertas de inventario).
  const insumosCriticos = db.insumos.filter((i) => clasificarInsumo(i) === "crítico");

  res.json({
    ok: true,
    data: {
      ingresosMes,
      ticketPromedio,
      pedidosEntregadosMes: entregadosMes.length,
      pedidosEnCurso,
      pedidosPendientes,
      porEstado,
      alertasInventario: insumosCriticos.length,
      insumosCriticos: insumosCriticos.map((i) => i.nombre),
      totalPedidos: db.pedidos.length,
    },
  });
});

// GET /api/dashboard/inventario -> estado de cada insumo.
router.get("/inventario", (req, res) => {
  const inventario = db.insumos.map((insumo) => ({
    ...insumo,
    estado: clasificarInsumo(insumo),
  }));

  res.json({ ok: true, data: inventario });
});

module.exports = router;
