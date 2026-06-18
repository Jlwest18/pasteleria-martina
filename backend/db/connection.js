// ===========================================================================
// Base de datos en memoria (Pastelería Martina)
// ---------------------------------------------------------------------------
// Mientras el servidor esté corriendo, estos arreglos guardan los datos.
// Si reinicias el servidor, todo vuelve a la precarga inicial: no hay archivos
// ni base de datos externa. La versión SQL equivalente, para fines académicos,
// está documentada en /db/schema.sql y /db/seed.sql.
// ===========================================================================

// Estados posibles de un pedido, en orden de avance del flujo de trabajo.
const ESTADOS = ["pendiente", "confirmado", "en preparación", "entregado"];

// Usamos la fecha actual para que los ingresos del mes calcen con el mes en curso.
const hoy = new Date();
const anio = hoy.getFullYear();
const mes = hoy.getMonth(); // 0 = enero, 11 = diciembre

// Helper: arma una fecha del mes actual en formato "YYYY-MM-DD".
function fechaDelMes(dia) {
  const m = String(mes + 1).padStart(2, "0");
  const d = String(dia).padStart(2, "0");
  return `${anio}-${m}-${d}`;
}

// 5 clientes precargados.
const clientes = [
  { id: 1, nombre: "Camila Rojas", telefono: "+56 9 8123 4567", email: "camila.rojas@correo.cl" },
  { id: 2, nombre: "Ignacio Fuentes", telefono: "+56 9 7654 3210", email: "ignacio.fuentes@correo.cl" },
  { id: 3, nombre: "Valentina Soto", telefono: "+56 9 9988 7766", email: "valentina.soto@correo.cl" },
  { id: 4, nombre: "Matías Herrera", telefono: "+56 9 6677 8899", email: "matias.herrera@correo.cl" },
  { id: 5, nombre: "Antonia Pérez", telefono: "+56 9 5566 7788", email: "antonia.perez@correo.cl" },
];

// 5 pedidos precargados, con estados variados para mostrar el flujo completo.
// "total" en 0 significa que el pedido todavía no se cotiza ("por cotizar").
const pedidos = [
  {
    id: 1,
    cliente: "Camila Rojas",
    telefono: "+56 9 8123 4567",
    detalle: "Torta de chocolate y manjar para 20 personas",
    fechaEntrega: fechaDelMes(5),
    fechaCreacion: fechaDelMes(3),
    estado: "entregado",
    total: 45000,
  },
  {
    id: 2,
    cliente: "Ignacio Fuentes",
    telefono: "+56 9 7654 3210",
    detalle: "24 cupcakes de vainilla con frosting de frutilla",
    fechaEntrega: fechaDelMes(9),
    fechaCreacion: fechaDelMes(7),
    estado: "entregado",
    total: 36000,
  },
  {
    id: 3,
    cliente: "Valentina Soto",
    telefono: "+56 9 9988 7766",
    detalle: "Torta naked de frutos rojos para 15 personas",
    fechaEntrega: fechaDelMes(22),
    fechaCreacion: fechaDelMes(12),
    estado: "en preparación",
    total: 52000,
  },
  {
    id: 4,
    cliente: "Matías Herrera",
    telefono: "+56 9 6677 8899",
    detalle: "Mesa dulce de cumpleaños (mini pies, brownies y alfajores)",
    fechaEntrega: fechaDelMes(25),
    fechaCreacion: fechaDelMes(14),
    estado: "confirmado",
    total: 38000,
  },
  {
    id: 5,
    cliente: "Antonia Pérez",
    telefono: "+56 9 5566 7788",
    detalle: "Torta temática infantil decorada con fondant",
    fechaEntrega: fechaDelMes(28),
    fechaCreacion: fechaDelMes(16),
    estado: "pendiente",
    total: 0,
  },
];

// 5 insumos precargados.
// "stockMinimo" marca el nivel bajo el cual el insumo se considera crítico.
const insumos = [
  { id: 1, nombre: "Harina sin polvos", stock: 25, unidad: "kg", stockMinimo: 10 },
  { id: 2, nombre: "Azúcar flor", stock: 4, unidad: "kg", stockMinimo: 5 },
  { id: 3, nombre: "Mantequilla", stock: 8, unidad: "kg", stockMinimo: 6 },
  { id: 4, nombre: "Chocolate de cobertura", stock: 2, unidad: "kg", stockMinimo: 4 },
  { id: 5, nombre: "Huevos", stock: 120, unidad: "unidades", stockMinimo: 60 },
];

// Contador para asignar ids únicos a los pedidos nuevos.
let ultimoIdPedido = pedidos.reduce((max, p) => Math.max(max, p.id), 0);

function siguienteIdPedido() {
  ultimoIdPedido += 1;
  return ultimoIdPedido;
}

module.exports = { ESTADOS, clientes, pedidos, insumos, siguienteIdPedido };
