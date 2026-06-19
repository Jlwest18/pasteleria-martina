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

// Valida los datos editables de un insumo y junta TODOS los errores de una vez.
// Todos los campos son opcionales: solo se valida lo que venga en el body, así
// el panel puede actualizar uno o varios campos a la vez.
function validarInventario(body) {
  const errores = [];
  const datos = {};

  // Nombre: si viene, debe ser un texto razonable (2 a 80 caracteres).
  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim();
    if (nombre.length < 2 || nombre.length > 80) {
      errores.push({ campo: "nombre", mensaje: "El nombre del insumo debe tener entre 2 y 80 caracteres." });
    } else {
      datos.nombre = nombre;
    }
  }

  // Unidad: si viene, no puede quedar vacía (kg, unidades, litros...).
  if (body.unidad !== undefined) {
    const unidad = String(body.unidad).trim();
    if (unidad.length < 1 || unidad.length > 20) {
      errores.push({ campo: "unidad", mensaje: "Indica una unidad válida (entre 1 y 20 caracteres)." });
    } else {
      datos.unidad = unidad;
    }
  }

  // Stock y stock mínimo: si vienen, deben ser números y no negativos.
  for (const campo of ["stock", "stockMinimo"]) {
    if (body[campo] !== undefined) {
      const valor = Number(body[campo]);
      if (!Number.isFinite(valor) || valor < 0) {
        errores.push({ campo, mensaje: "Debe ser un número igual o mayor que cero." });
      } else {
        datos[campo] = valor;
      }
    }
  }

  return { errores, datos };
}

// PUT /api/dashboard/inventario/:id -> actualiza los datos editables de un insumo.
// Lo usa el panel de Martina para corregir stock, mínimo, unidad o nombre.
router.put("/inventario/:id", (req, res) => {
  const id = Number(req.params.id);

  const insumo = db.insumos.find((i) => i.id === id);
  if (!insumo) {
    return res.status(404).json({ ok: false, error: `No existe un insumo con id ${id}.` });
  }

  const { errores, datos } = validarInventario(req.body || {});
  if (errores.length > 0) {
    return res.status(400).json({
      ok: false,
      error: "Revisa los datos del insumo.",
      detalles: errores,
    });
  }

  // Aplica solo los campos enviados (actualización parcial en memoria).
  Object.assign(insumo, datos);

  // Devolvemos el insumo recalculado, igual que en GET /inventario, para que el
  // panel pueda refrescar estado, comprometido y stock proyectado al instante.
  const comprometido = consumoComprometido(db.pedidos)[insumo.id] || 0;
  res.json({
    ok: true,
    mensaje: `Insumo "${insumo.nombre}" actualizado.`,
    data: {
      ...insumo,
      comprometido,
      stockProyectado: Number((insumo.stock - comprometido).toFixed(2)),
      estado: clasificarInsumo(insumo),
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
