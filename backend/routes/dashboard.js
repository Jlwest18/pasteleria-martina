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

// Suma la cantidad estimada de cada insumo en los pedidos en curso (no entregados).
// Devuelve un mapa { insumoId: cantidadComprometida }.
function consumoComprometido(pedidos) {
  const mapa = {};
  pedidos
    .filter((p) => p.estado !== "entregado")
    .forEach((p) => {
      (p.insumosEstimados || []).forEach(({ insumoId, cantidad }) => {
        mapa[insumoId] = (mapa[insumoId] || 0) + cantidad;
      });
    });
  return mapa;
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

  // Pedidos por confirmar: cotizados que aún no se confirman.
  const pedidosPorConfirmar = porEstado["cotizado"];

  // Pedidos en curso: todo lo que aún no se entrega (trabajo activo del taller).
  const enCurso = db.pedidos.filter((p) => p.estado !== "entregado");

  // Ingresos esperados: monto comprometido de los pedidos en curso (aún por cobrar).
  const ingresosEsperados = enCurso.reduce((suma, p) => suma + p.total, 0);

  // Insumos en estado crítico (alertas de inventario).
  const insumosCriticos = db.insumos.filter((i) => clasificarInsumo(i) === "crítico");

  // Insumos que, sin ser críticos hoy, quedarían bajo el mínimo al descontar lo
  // comprometido por los pedidos en curso (alerta anticipada según la demanda).
  const comprometidoPorInsumo = consumoComprometido(db.pedidos);
  const insumosBajoCompromiso = db.insumos
    .filter((i) => clasificarInsumo(i) !== "crítico")
    .filter((i) => i.stock - (comprometidoPorInsumo[i.id] || 0) < i.stockMinimo)
    .map((i) => i.nombre);

  res.json({
    ok: true,
    data: {
      ingresosMes,
      ingresosEsperados,
      ticketPromedio,
      pedidosEntregadosMes: entregadosMes.length,
      pedidosEnCurso: enCurso.length,
      pedidosPorConfirmar,
      porEstado,
      alertasInventario: insumosCriticos.length,
      insumosCriticos: insumosCriticos.map((i) => i.nombre),
      insumosBajoCompromiso,
      totalPedidos: db.pedidos.length,
    },
  });
});

// GET /api/dashboard/inventario -> estado de cada insumo, con lo comprometido
// por los pedidos en curso y el stock proyectado tras cumplirlos.
router.get("/inventario", (req, res) => {
  const comprometidoPorInsumo = consumoComprometido(db.pedidos);

  const inventario = db.insumos.map((insumo) => {
    const comprometido = comprometidoPorInsumo[insumo.id] || 0;
    return {
      ...insumo,
      comprometido,
      stockProyectado: Number((insumo.stock - comprometido).toFixed(2)),
      estado: clasificarInsumo(insumo),
    };
  });

  res.json({ ok: true, data: inventario });
});

module.exports = router;
