const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// Fecha de hoy en formato "YYYY-MM-DD" (sirve para validar fechas de entrega).
function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

// Valida los datos de un pedido nuevo y junta TODOS los errores encontrados,
// para devolverlos de una sola vez y que el cliente sepa qué corregir.
function validarPedido(body) {
  const errores = [];
  const nombre = (body.nombre || "").trim();
  const telefono = (body.telefono || "").trim();
  const detalle = (body.detalle || "").trim();
  const fechaEntrega = (body.fechaEntrega || "").trim();

  if (nombre.length < 2 || nombre.length > 60) {
    errores.push({ campo: "nombre", mensaje: "El nombre debe tener entre 2 y 60 caracteres." });
  }

  // El teléfono debe tener al menos 8 dígitos (ignoramos espacios y símbolos).
  const digitos = (telefono.match(/\d/g) || []).length;
  if (digitos < 8) {
    errores.push({ campo: "telefono", mensaje: "Ingresa un teléfono válido con al menos 8 dígitos." });
  }

  if (detalle.length < 5 || detalle.length > 300) {
    errores.push({ campo: "detalle", mensaje: "Cuéntanos el detalle del pastel (entre 5 y 300 caracteres)." });
  }

  // La fecha debe venir en formato YYYY-MM-DD, ser real y no estar en el pasado.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega) || Number.isNaN(Date.parse(fechaEntrega))) {
    errores.push({ campo: "fechaEntrega", mensaje: "Selecciona una fecha de entrega válida." });
  } else if (fechaEntrega < fechaHoy()) {
    errores.push({ campo: "fechaEntrega", mensaje: "La fecha de entrega no puede ser anterior a hoy." });
  }

  return { errores, datos: { nombre, telefono, detalle, fechaEntrega } };
}

// GET /api/pedidos -> devuelve todos los pedidos guardados en memoria.
router.get("/", (req, res) => {
  res.json({ ok: true, data: db.pedidos });
});

// POST /api/pedidos -> crea un pedido nuevo y lo guarda en memoria.
router.post("/", (req, res) => {
  const { errores, datos } = validarPedido(req.body || {});

  if (errores.length > 0) {
    return res.status(400).json({
      ok: false,
      error: "Revisa los datos del pedido.",
      detalles: errores,
    });
  }

  const nuevoPedido = {
    id: db.siguienteIdPedido(),
    cliente: datos.nombre,
    telefono: datos.telefono,
    detalle: datos.detalle,
    fechaEntrega: datos.fechaEntrega,
    fechaCreacion: fechaHoy(),
    estado: "cotizado", // todo pedido nuevo entra en cotización
    total: 0, // el monto se define al cotizar
    insumosEstimados: [], // la receta (insumos) se define al cotizar
  };

  db.pedidos.push(nuevoPedido);

  res.status(201).json({
    ok: true,
    mensaje: "Pedido recibido. Te contactaremos para confirmar los detalles.",
    data: nuevoPedido,
  });
});

// PATCH /api/pedidos/:id/estado -> actualiza el estado de un pedido.
// Lo usa el panel de Martina para hacer avanzar el flujo del pedido.
router.patch("/:id/estado", (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body || {};

  const pedido = db.pedidos.find((p) => p.id === id);
  if (!pedido) {
    return res.status(404).json({ ok: false, error: `No existe un pedido con id ${id}.` });
  }

  if (!db.ESTADOS.includes(estado)) {
    return res.status(400).json({
      ok: false,
      error: `Estado inválido. Usa uno de: ${db.ESTADOS.join(", ")}.`,
    });
  }

  pedido.estado = estado;

  res.json({
    ok: true,
    mensaje: `Pedido #${pedido.id} actualizado a "${estado}".`,
    data: pedido,
  });
});

module.exports = router;
