import { useState, useEffect, Fragment } from "react";

// URL base del backend. Si cambias el puerto del servidor, actualízalo aquí.
const API = "http://localhost:3001/api";

// Flujo de estados de un pedido, en orden de avance.
const FLUJO_ESTADOS = ["pendiente", "confirmado", "en preparación", "entregado"];

// Credenciales del panel de Martina (acceso simple a nivel de demo académica).
const CREDENCIALES = { usuario: "martina", clave: "dulce2026" };
const CLAVE_SESION = "martina_sesion"; // llave en localStorage

// Formatea números como pesos chilenos (sin decimales).
const formatoCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

// Convierte "2026-06-18" en "18-06-2026" para mostrarlo más legible.
function formatearFecha(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}

// Normaliza un estado (con tildes/espacios) a una clase CSS simple.
function claseEstado(estado) {
  const mapa = {
    pendiente: "pendiente",
    confirmado: "confirmado",
    "en preparación": "preparacion",
    entregado: "entregado",
    crítico: "critico",
    bajo: "bajo",
    ok: "ok",
  };
  return mapa[estado] || "neutro";
}

// Devuelve el siguiente estado del flujo (o null si ya está entregado).
function siguienteEstado(estado) {
  const i = FLUJO_ESTADOS.indexOf(estado);
  if (i === -1 || i === FLUJO_ESTADOS.length - 1) return null;
  return FLUJO_ESTADOS[i + 1];
}

// Lee una respuesta del backend y desempaqueta el envelope { ok, data }.
// Si algo falla, lanza un error con el mensaje más útil disponible.
async function leerRespuesta(respuesta) {
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !json || json.ok === false) {
    const detalle = json?.detalles?.map((d) => d.mensaje).join(" ");
    throw new Error(detalle || json?.error || "Ocurrió un problema con el servidor.");
  }
  return json;
}

// Genera recomendaciones de gestión a partir de las métricas del panel.
// Sirven como apoyo a la toma de decisiones de Martina.
function generarRecomendaciones(metricas) {
  const recs = [];
  const pendientes = metricas.pedidosPendientes;
  const enPreparacion = metricas.porEstado["en preparación"] || 0;
  const criticos = metricas.insumosCriticos || [];

  if (pendientes > 0) {
    recs.push({
      tipo: "atencion",
      texto:
        `Tienes ${pendientes} ${pendientes === 1 ? "pedido sin confirmar" : "pedidos sin confirmar"}. ` +
        "Conviene contactar a esos clientes hoy para cerrar la cotización y agendar la entrega.",
    });
  }

  if (enPreparacion > 0) {
    recs.push({
      tipo: "info",
      texto:
        `Hay ${enPreparacion} ${enPreparacion === 1 ? "pedido" : "pedidos"} en preparación. ` +
        "Revisa los tiempos y los insumos para cumplir las fechas comprometidas.",
    });
  }

  if (criticos.length > 0) {
    recs.push({
      tipo: "alerta",
      texto:
        `Repón pronto: ${criticos.join(", ")}. ` +
        `${criticos.length === 1 ? "Está" : "Están"} en o bajo el stock mínimo y podría frenar la producción.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      tipo: "ok",
      texto:
        "Todo en orden: sin pedidos por confirmar ni insumos críticos. " +
        "Buen momento para planificar promociones o probar productos nuevos.",
    });
  }

  return recs;
}

// Arma un CSV con los pedidos y dispara la descarga en el navegador.
function exportarPedidosCSV(pedidos) {
  const encabezados = [
    "ID", "Cliente", "Teléfono", "Detalle",
    "Fecha entrega", "Fecha creación", "Estado", "Total",
  ];

  // Envuelve en comillas y escapa los valores que tengan comas, comillas o saltos.
  const escapar = (valor) => {
    const texto = String(valor ?? "");
    return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const filas = pedidos.map((p) => [
    p.id, p.cliente, p.telefono, p.detalle,
    p.fechaEntrega, p.fechaCreacion, p.estado, p.total,
  ]);

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map(escapar).join(","))
    .join("\n");

  // El "﻿" (BOM) ayuda a que Excel lea bien las tildes.
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "pedidos-pasteleria-martina.csv";
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  // Vista activa: "cliente", "martina" o "proyecto".
  const [vista, setVista] = useState("cliente");

  const tabs = [
    { id: "cliente", texto: "Encargar pastel" },
    { id: "martina", texto: "Panel de Martina" },
    { id: "proyecto", texto: "Sobre el proyecto" },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="marca">
          <span className="marca__icono" aria-hidden="true">🧁</span>
          <div>
            <h1 className="marca__nombre">Pastelería Martina</h1>
            <p className="marca__slogan">Dulce Descontrol</p>
          </div>
        </div>

        <nav className="nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav__btn ${vista === t.id ? "is-active" : ""}`}
              onClick={() => setVista(t.id)}
            >
              {t.texto}
            </button>
          ))}
        </nav>
      </header>

      <main className="contenido">
        {vista === "cliente" && <VistaCliente />}
        {vista === "martina" && <VistaMartina />}
        {vista === "proyecto" && <VistaProyecto />}
      </main>

      <footer className="pie">
        <p>
          Pastelería Martina · Dulce Descontrol — Proyecto de Sistemas de Información
        </p>
      </footer>
    </div>
  );
}

// ===========================================================================
// Vista cliente: portada de pastelería + formulario para encargar un pastel.
// ===========================================================================
function VistaCliente() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    detalle: "",
    fechaEntrega: "",
  });
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }
  const [enviando, setEnviando] = useState(false);

  function actualizarCampo(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function enviarPedido(e) {
    e.preventDefault();
    setMensaje(null);
    setEnviando(true);

    try {
      const respuesta = await fetch(`${API}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await leerRespuesta(respuesta);

      setMensaje({
        tipo: "exito",
        texto: json.mensaje || "¡Listo! Recibimos tu pedido.",
      });
      setForm({ nombre: "", telefono: "", detalle: "", fechaEntrega: "" });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error.message || "Hubo un problema. Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cliente">
      {/* Portada / hero */}
      <section className="hero">
        <div className="hero__texto">
          <span className="pildora-tema">Pastelería artesanal · Santiago</span>
          <h2 className="hero__titulo">
            Dulces que se hacen <em>a tu pinta</em>.
          </h2>
          <p className="hero__bajada">
            Tortas, cupcakes y mesas dulces hechas a mano para cumpleaños,
            matrimonios y esos antojos que no avisan. Tú nos cuentas la idea,
            nosotros la horneamos.
          </p>
          <a className="boton boton--primario" href="#formulario">
            Encargar mi pastel
          </a>
        </div>
        <div className="hero__arte" aria-hidden="true">
          <span className="hero__emoji">🎂</span>
        </div>
      </section>

      {/* Especialidades */}
      <section className="especialidades">
        <article className="especialidad">
          <span className="especialidad__icono">🎂</span>
          <h3>Tortas personalizadas</h3>
          <p>Del sabor a la decoración: cada torta se diseña según tu celebración.</p>
        </article>
        <article className="especialidad">
          <span className="especialidad__icono">🧁</span>
          <h3>Cupcakes y dulces</h3>
          <p>Cupcakes, alfajores y galletas perfectos para regalar o compartir.</p>
        </article>
        <article className="especialidad">
          <span className="especialidad__icono">🍰</span>
          <h3>Mesas dulces</h3>
          <p>Mesas completas para eventos, coordinadas en colores y temática.</p>
        </article>
      </section>

      {/* Formulario de pedido */}
      <section className="seccion-pedido" id="formulario">
        <div className="seccion-pedido__intro">
          <span className="pildora-tema">Hagamos tu pedido</span>
          <h3>Cuéntanos qué se te antoja</h3>
          <p>
            Completa el formulario y nos pondremos en contacto para confirmar
            los detalles y entregarte una cotización.
          </p>
          <ol className="pasos">
            <li><strong>1.</strong> Nos cuentas tu idea y la fecha.</li>
            <li><strong>2.</strong> Coordinamos detalles y cotización.</li>
            <li><strong>3.</strong> Retiras tu pedido recién hecho.</li>
          </ol>
        </div>

        <form className="tarjeta formulario" onSubmit={enviarPedido}>
          <label className="campo">
            <span>Nombre</span>
            <input
              name="nombre"
              value={form.nombre}
              onChange={actualizarCampo}
              placeholder="¿Cómo te llamas?"
              required
            />
          </label>

          <label className="campo">
            <span>Teléfono</span>
            <input
              name="telefono"
              value={form.telefono}
              onChange={actualizarCampo}
              placeholder="+56 9 1234 5678"
              required
            />
          </label>

          <label className="campo">
            <span>Detalle del pastel</span>
            <textarea
              name="detalle"
              value={form.detalle}
              onChange={actualizarCampo}
              rows="4"
              placeholder="Sabor, tamaño, decoración, mensaje... cuéntanos todo."
              required
            />
          </label>

          <label className="campo">
            <span>Fecha de entrega</span>
            <input
              type="date"
              name="fechaEntrega"
              value={form.fechaEntrega}
              onChange={actualizarCampo}
              required
            />
          </label>

          <button className="boton boton--primario" type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar pedido"}
          </button>

          {mensaje && (
            <p className={`aviso aviso--${mensaje.tipo}`} role="status">
              {mensaje.texto}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

// ===========================================================================
// Vista de Martina: controla el acceso (login) y muestra el panel.
// ===========================================================================
function VistaMartina() {
  // La sesión se recuerda en localStorage para no pedir login en cada visita.
  const [autenticado, setAutenticado] = useState(
    () => localStorage.getItem(CLAVE_SESION) === "activa"
  );

  function iniciarSesion() {
    localStorage.setItem(CLAVE_SESION, "activa");
    setAutenticado(true);
  }

  function cerrarSesion() {
    localStorage.removeItem(CLAVE_SESION);
    setAutenticado(false);
  }

  if (!autenticado) {
    return <LoginMartina onLogin={iniciarSesion} />;
  }

  return <PanelMartina onCerrarSesion={cerrarSesion} />;
}

// Formulario de acceso al panel.
function LoginMartina({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(null);

  function enviar(e) {
    e.preventDefault();
    if (usuario.trim() === CREDENCIALES.usuario && clave === CREDENCIALES.clave) {
      setError(null);
      onLogin();
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  }

  return (
    <section className="martina">
      <div className="tarjeta login">
        <div className="login__icono" aria-hidden="true">🔒</div>
        <h2>Acceso de Martina</h2>
        <p className="login__intro">
          Ingresa tus credenciales para ver el panel del negocio.
        </p>

        <form className="login__form" onSubmit={enviar}>
          <label className="campo">
            <span>Usuario</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="martina"
              autoComplete="username"
            />
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <button className="boton boton--primario" type="submit">
            Ingresar
          </button>

          {error && <p className="aviso aviso--error">{error}</p>}
        </form>

        <p className="login__pista">
          Demo · usuario <strong>martina</strong> · contraseña <strong>dulce2026</strong>
        </p>
      </div>
    </section>
  );
}

// Panel administrativo (solo visible con sesión iniciada).
function PanelMartina({ onCerrarSesion }) {
  const [metricas, setMetricas] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Pide al backend las tres fuentes de datos del panel a la vez.
  async function cargarDatos() {
    setCargando(true);
    setError(null);

    try {
      const [rMetricas, rPedidos, rInventario] = await Promise.all([
        fetch(`${API}/dashboard/metricas`),
        fetch(`${API}/pedidos`),
        fetch(`${API}/dashboard/inventario`),
      ]);

      setMetricas((await leerRespuesta(rMetricas)).data);
      setPedidos((await leerRespuesta(rPedidos)).data);
      setInventario((await leerRespuesta(rInventario)).data);
    } catch (err) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  // Hace avanzar un pedido al siguiente estado del flujo.
  async function avanzarPedido(pedido) {
    const proximo = siguienteEstado(pedido.estado);
    if (!proximo) return;

    try {
      const respuesta = await fetch(`${API}/pedidos/${pedido.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: proximo }),
      });
      await leerRespuesta(respuesta);
      await cargarDatos(); // recargamos para que las métricas se actualicen
    } catch (err) {
      setError(err.message || "No se pudo actualizar el pedido.");
    }
  }

  // Carga los datos al abrir el panel por primera vez.
  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <section className="martina">
      <div className="martina__cabecera">
        <div>
          <h2>Panel de Martina</h2>
          <p>El resumen del negocio, siempre a mano.</p>
        </div>
        <div className="acciones">
          <button
            className="boton boton--secundario"
            onClick={cargarDatos}
            disabled={cargando}
          >
            {cargando ? "Actualizando..." : "↻ Actualizar"}
          </button>
          <button className="boton boton--fantasma" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {error && <p className="aviso aviso--error">{error}</p>}

      {/* Lectura humana de las métricas */}
      {metricas && <ResumenMetricas metricas={metricas} />}

      {/* Tarjetas de métricas */}
      <div className="tarjetas">
        <article className="tarjeta metrica metrica--ingresos">
          <span className="metrica__etiqueta">Ingresos del mes</span>
          <strong className="metrica__valor">
            {metricas ? formatoCLP.format(metricas.ingresosMes) : "—"}
          </strong>
          <span className="metrica__detalle">
            {metricas ? `${metricas.pedidosEntregadosMes} pedidos entregados` : "Cargando..."}
          </span>
        </article>

        <article className="tarjeta metrica metrica--pendientes">
          <span className="metrica__etiqueta">Pedidos en curso</span>
          <strong className="metrica__valor">
            {metricas ? metricas.pedidosEnCurso : "—"}
          </strong>
          <span className="metrica__detalle">
            {metricas ? `${metricas.pedidosPendientes} sin confirmar` : "Cargando..."}
          </span>
        </article>

        <article className="tarjeta metrica metrica--alertas">
          <span className="metrica__etiqueta">Inventario crítico</span>
          <strong className="metrica__valor">
            {metricas ? metricas.alertasInventario : "—"}
          </strong>
          <span className="metrica__detalle">Insumos por reponer</span>
        </article>
      </div>

      {/* Recomendaciones automáticas (apoyo a la decisión) */}
      {metricas && <Recomendaciones metricas={metricas} />}

      {/* Explicación visual del flujo de pedidos */}
      <FlujoPedidos />

      {/* Tabla de pedidos */}
      <div className="tarjeta">
        <div className="seccion__cabecera">
          <h3 className="seccion__titulo">Pedidos</h3>
          <div className="seccion__acciones">
            {metricas && <DesgloseEstados porEstado={metricas.porEstado} />}
            <button
              className="boton-mini boton-mini--csv"
              onClick={() => exportarPedidosCSV(pedidos)}
              disabled={pedidos.length === 0}
              title="Descargar la tabla de pedidos en formato CSV"
            >
              ⬇ Exportar CSV
            </button>
          </div>
        </div>
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Detalle</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const proximo = siguienteEstado(p.estado);
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.cliente}</td>
                    <td className="tabla__detalle">{p.detalle}</td>
                    <td>{formatearFecha(p.fechaEntrega)}</td>
                    <td>
                      <span className={`pildora pildora--${claseEstado(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td>{p.total > 0 ? formatoCLP.format(p.total) : "Por cotizar"}</td>
                    <td>
                      {proximo ? (
                        <button
                          className="boton-mini"
                          onClick={() => avanzarPedido(p)}
                          disabled={cargando}
                          title={`Marcar como ${proximo}`}
                        >
                          → {proximo}
                        </button>
                      ) : (
                        <span className="tabla__listo">✓ listo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pedidos.length === 0 && !cargando && (
                <tr>
                  <td colSpan="7" className="tabla__vacio">
                    Aún no hay pedidos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventario */}
      <div className="tarjeta">
        <h3 className="seccion__titulo">Inventario</h3>
        <div className="inventario">
          {inventario.map((i) => (
            <div key={i.id} className={`insumo insumo--${claseEstado(i.estado)}`}>
              <div className="insumo__info">
                <strong>{i.nombre}</strong>
                <span>
                  {i.stock} {i.unidad} · mínimo {i.stockMinimo}
                </span>
              </div>
              <span className={`pildora pildora--${claseEstado(i.estado)}`}>
                {i.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Párrafo que traduce los números del panel a una lectura en lenguaje natural.
function ResumenMetricas({ metricas }) {
  const {
    pedidosEntregadosMes,
    ingresosMes,
    ticketPromedio,
    pedidosEnCurso,
    pedidosPendientes,
    alertasInventario,
    insumosCriticos,
  } = metricas;

  return (
    <div className="resumen">
      <p>
        Este mes entregaste <strong>{pedidosEntregadosMes}</strong>{" "}
        {pedidosEntregadosMes === 1 ? "pedido" : "pedidos"} y facturaste{" "}
        <strong>{formatoCLP.format(ingresosMes)}</strong>
        {ticketPromedio > 0 && (
          <> (ticket promedio de {formatoCLP.format(ticketPromedio)})</>
        )}
        . Tienes <strong>{pedidosEnCurso}</strong> en curso
        {pedidosPendientes > 0 && <>, {pedidosPendientes} aún sin confirmar</>}.{" "}
        {alertasInventario > 0 ? (
          <>
            Ojo con el inventario: <strong>{insumosCriticos.join(", ")}</strong>{" "}
            {alertasInventario === 1 ? "está bajo" : "están bajo"} el mínimo.
          </>
        ) : (
          <>El inventario está al día.</>
        )}
      </p>
    </div>
  );
}

// Lista de recomendaciones automáticas para apoyar la gestión del día.
function Recomendaciones({ metricas }) {
  const recomendaciones = generarRecomendaciones(metricas);
  const icono = { atencion: "📞", info: "👩‍🍳", alerta: "⚠️", ok: "✅" };

  return (
    <div className="tarjeta recomendaciones">
      <h3 className="seccion__titulo">Recomendaciones para hoy</h3>
      <ul className="recos">
        {recomendaciones.map((r, i) => (
          <li key={i} className={`reco reco--${r.tipo}`}>
            <span className="reco__icono" aria-hidden="true">{icono[r.tipo]}</span>
            <span>{r.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Chips con el conteo de pedidos por estado.
function DesgloseEstados({ porEstado }) {
  return (
    <div className="desglose">
      {FLUJO_ESTADOS.map((estado) => (
        <span key={estado} className={`chip chip--${claseEstado(estado)}`}>
          {estado}: <strong>{porEstado[estado] ?? 0}</strong>
        </span>
      ))}
    </div>
  );
}

// Diagrama visual del flujo que recorre cada pedido.
function FlujoPedidos() {
  return (
    <div className="tarjeta flujo">
      <h3 className="seccion__titulo">Flujo de un pedido</h3>
      <div className="flujo__pasos">
        {FLUJO_ESTADOS.map((estado, i) => (
          <Fragment key={estado}>
            <div className={`flujo__paso flujo__paso--${claseEstado(estado)}`}>
              <span className="flujo__num">{i + 1}</span>
              <span className="flujo__nombre">{estado}</span>
            </div>
            {i < FLUJO_ESTADOS.length - 1 && (
              <span className="flujo__flecha" aria-hidden="true">→</span>
            )}
          </Fragment>
        ))}
      </div>
      <p className="flujo__nota">
        Cada encargo avanza por estas cuatro etapas. Desde la tabla de pedidos
        puedes moverlo a la siguiente con el botón “→”.
      </p>
    </div>
  );
}

// ===========================================================================
// Vista del proyecto: problema detectado y solución propuesta (contexto académico).
// ===========================================================================
function VistaProyecto() {
  return (
    <section className="proyecto">
      <div className="proyecto__intro">
        <span className="pildora-tema">Contexto del proyecto</span>
        <h2>De un cuaderno de pedidos a una plataforma web</h2>
        <p>
          Esta aplicación nace en el ramo de Sistemas de Información a partir de
          un caso real y cotidiano de una pastelería que crece más rápido que
          sus herramientas.
        </p>
      </div>

      <div className="proyecto__columnas">
        <article className="tarjeta problema">
          <h3>🔍 Problema detectado</h3>
          <p>
            Martina recibe pedidos por teléfono, WhatsApp e Instagram, y los
            anota en un cuaderno. Con ese sistema:
          </p>
          <ul>
            <li>Se traspapelan pedidos y se pierden fechas de entrega.</li>
            <li>No hay una vista clara de cuánto se vende ni qué está pendiente.</li>
            <li>El inventario se controla "a ojo" y faltan insumos a último minuto.</li>
          </ul>
        </article>

        <article className="tarjeta solucion">
          <h3>💡 Solución propuesta</h3>
          <p>
            Una plataforma web con dos caras que ordenan el negocio de punta a
            punta:
          </p>
          <ul>
            <li>Un formulario donde el cliente deja su pedido y queda registrado.</li>
            <li>Un panel para Martina con ingresos, pedidos y alertas de stock.</li>
            <li>Estados de pedido (pendiente → entregado) para seguir cada encargo.</li>
          </ul>
        </article>
      </div>

      <div className="tarjeta stack">
        <h3 className="seccion__titulo">Stack tecnológico</h3>
        <div className="stack__badges">
          <span className="badge">React + Vite</span>
          <span className="badge">CSS puro</span>
          <span className="badge">Node.js + Express</span>
          <span className="badge">CORS</span>
          <span className="badge">Datos en memoria</span>
          <span className="badge">SQL (respaldo académico)</span>
        </div>
        <p className="stack__nota">
          El backend opera con datos en memoria para un despliegue simple y
          gratuito en Render. La versión SQL relacional equivalente está
          documentada en <code>/db/schema.sql</code> y <code>/db/seed.sql</code>.
        </p>
      </div>
    </section>
  );
}
