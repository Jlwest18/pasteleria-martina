const express = require("express");
const cors = require("cors");

const pedidosRouter = require("./routes/pedidos");
const dashboardRouter = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3001; // Render asigna el puerto por variable de entorno
const INICIO = Date.now();

// CORS permite que el frontend (otro puerto/origen) consuma esta API.
app.use(cors());
// Permite leer el cuerpo JSON de las peticiones POST y PATCH.
app.use(express.json());

// Endpoint de salud: confirma que el servicio está operativo (útil en Render).
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    data: {
      estado: "operativo",
      servicio: "API Pastelería Martina",
      version: "1.1.0",
      uptimeSegundos: Math.round((Date.now() - INICIO) / 1000),
      timestamp: new Date().toISOString(),
    },
  });
});

// Rutas de la API.
app.use("/api/pedidos", pedidosRouter);
app.use("/api/dashboard", dashboardRouter);

// Ruta base para comprobar rápido que el servidor responde.
app.get("/", (req, res) => {
  res.send("API Pastelería Martina funcionando 🎂");
});

// Cualquier ruta /api desconocida responde un 404 claro en JSON.
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "Recurso no encontrado." });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
