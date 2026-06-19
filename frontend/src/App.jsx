import { useState, useEffect } from "react";

// URL base del backend. Si cambias el puerto del servidor, actualízalo aquí.
const API = "http://localhost:3001/api";

// Flujo de estados de un pedido, en orden de avance.
const FLUJO_ESTADOS = ["cotizado", "confirmado", "en producción", "entregado"];

// Fotografías de la portada y de los productos.
// Por defecto usamos imágenes públicas y estables de Unsplash (libres, sin
// atribución obligatoria) solo como referencia visual. Para usar las fotos
// propias de Martina:
//   1. Deja el archivo en  frontend/public/images/  (ej: hero.jpg)
//   2. Reemplaza la URL de Unsplash de abajo por la ruta local:  "/images/hero.jpg"
// Recomendación: fotos JPG, ~800px de ancho y < 300 KB para que cargue liviano.
const IMAGENES = {
  hero: "https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=900&q=70",
  tortas: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=70",
  cupcakes: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=600&q=70",
  mesasDulces: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=600&q=70",
  artesanal: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=70",
};

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

// Normaliza un estado (con tildes/espacios) a un sufijo de clase CSS simple.
// Se usa con los prefijos de color del diseño: `c-<sufijo>` y `t-<sufijo>`.
function claseEstado(estado) {
  const mapa = {
    cotizado: "cotizado",
    confirmado: "confirmado",
    "en producción": "produccion",
    entregado: "entregado",
    crítico: "critico",
    bajo: "bajo",
    ok: "ok",
  };
  return mapa[estado] || "neutro";
}

// Capitaliza el estado para mostrarlo como etiqueta ("en producción" -> "En Producción").
function etiquetaEstado(estado) {
  return estado.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Devuelve el siguiente estado del flujo (o null si ya está entregado).
function siguienteEstado(estado) {
  const i = FLUJO_ESTADOS.indexOf(estado);
  if (i === -1 || i === FLUJO_ESTADOS.length - 1) return null;
  return FLUJO_ESTADOS[i + 1];
}

// Lee una respuesta del backend y desempaqueta el envelope { ok, data }.
async function leerRespuesta(respuesta) {
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !json || json.ok === false) {
    const detalle = json?.detalles?.map((d) => d.mensaje).join(" ");
    throw new Error(detalle || json?.error || "Ocurrió un problema con el servidor.");
  }
  return json;
}

// Genera recomendaciones de gestión a partir de las métricas del panel.
function generarRecomendaciones(metricas) {
  const recs = [];
  const porConfirmar = metricas.pedidosPorConfirmar;
  const enProduccion = metricas.porEstado["en producción"] || 0;
  const criticos = metricas.insumosCriticos || [];

  if (porConfirmar > 0) {
    recs.push({
      tipo: "atencion",
      texto:
        `Tienes ${porConfirmar} ${porConfirmar === 1 ? "cotización sin confirmar" : "cotizaciones sin confirmar"}. ` +
        "Haz seguimiento hoy para cerrarlas, definir el monto y agendar la producción.",
    });
  }

  if (enProduccion > 0) {
    recs.push({
      tipo: "info",
      texto:
        `Hay ${enProduccion} ${enProduccion === 1 ? "pedido" : "pedidos"} en producción. ` +
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

  const bajoCompromiso = metricas.insumosBajoCompromiso || [];
  if (bajoCompromiso.length > 0) {
    recs.push({
      tipo: "info",
      texto:
        `Considerando los pedidos en curso, el stock proyectado de ${bajoCompromiso.join(", ")} ` +
        "queda bajo el mínimo. Conviene reponer antes de comprometer nuevos encargos.",
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

  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "pedidos-pasteleria-martina.csv";
  enlace.click();
  URL.revokeObjectURL(url);
}

// ===========================================================================
// App: barra superior + conmutador de vistas (cliente / martina / proyecto).
// ===========================================================================
export default function App() {
  const [vista, setVista] = useState("cliente");

  const tabs = [
    { id: "cliente", texto: "Encargar pastel" },
    { id: "proyecto", texto: "Sobre el proyecto" },
    { id: "martina", texto: "Panel de Martina" },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <button className="marca" onClick={() => setVista("cliente")}>
            <span className="marca__logo">m</span>
            <span style={{ lineHeight: 1.1, textAlign: "left" }}>
              <span className="marca__nombre">Pastelería Martina</span>
              <p className="marca__slogan">DULCE DESCONTROL</p>
            </span>
          </button>

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
        </div>
      </header>

      <main className="contenido">
        {vista === "cliente" && <VistaCliente />}
        {vista === "martina" && <VistaMartina />}
        {vista === "proyecto" && <VistaProyecto />}
      </main>

      {vista !== "martina" && (
        <footer className="pie">
          <div className="pie__inner">
            <div>
              <div className="pie__marca">Pastelería Martina</div>
              <p className="pie__texto">
                Pastelería artesanal en Santiago. Tortas, cupcakes y mesas dulces
                hechas a mano. © 2026 Dulce Descontrol.
              </p>
            </div>
            <div>
              <div className="pie__titulo">EXPLORAR</div>
              <div className="pie__lista">
                <span>Encargar pastel</span>
                <span>Sobre el proyecto</span>
                <span>Panel de Martina</span>
              </div>
            </div>
            <div>
              <div className="pie__titulo">CONTACTO</div>
              <div className="pie__lista">
                <span>WhatsApp +56 9 1234 5678</span>
                <span>hola@martina.cl</span>
                <span>Providencia, Santiago</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// ===========================================================================
// Vista cliente: hero + tarjetas de servicio + formulario de autoatención.
// ===========================================================================
function VistaCliente() {
  const [form, setForm] = useState({ nombre: "", telefono: "", detalle: "", fechaEntrega: "" });
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const servicios = [
    { foto: IMAGENES.tortas, alt: "Torta personalizada artesanal", titulo: "Tortas personalizadas", desc: "Del sabor a la decoración: cada torta se diseña según tu celebración." },
    { foto: IMAGENES.cupcakes, alt: "Cupcakes artesanales con frosting", titulo: "Cupcakes y dulces", desc: "Cupcakes, alfajores y galletas perfectos para regalar o compartir." },
    { foto: IMAGENES.mesasDulces, alt: "Mesa dulce para eventos", titulo: "Mesas dulces", desc: "Mesas completas para eventos, coordinadas en colores y temática." },
  ];

  const pasos = [
    { n: 1, label: "Nos cuentas tu idea y la fecha." },
    { n: 2, label: "Coordinamos detalles y cotización." },
    { n: 3, label: "Retiras tu pedido recién hecho." },
  ];

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
      await leerRespuesta(respuesta);
      setEnviado(true);
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
    <div className="pagina cliente">
      {/* HERO */}
      <section className="hero">
        <div className="hero__texto">
          <span className="pildora-tema">PASTELERÍA ARTESANAL · SANTIAGO</span>
          <h1 className="hero__titulo">
            Dulces que se hacen <em>a tu pinta</em>.
          </h1>
          <p className="hero__bajada">
            Tortas, cupcakes y mesas dulces hechas a mano para cumpleaños,
            matrimonios y esos antojos que no avisan. Tú nos cuentas la idea,
            nosotros la horneamos.
          </p>
          <a className="boton boton--primario" href="#formulario">Encargar mi pastel  →</a>
        </div>
        <div className="hero__arte">
          {/* Foto de portada. Reemplazable por una foto propia (ver IMAGENES). */}
          <img className="hero__foto" src={IMAGENES.hero} alt="Torta artesanal decorada de Pastelería Martina" loading="eager" />
        </div>
      </section>

      {/* TARJETAS DE SERVICIO (con foto real) */}
      <section className="servicios">
        {servicios.map((s) => (
          <article className="servicio" key={s.titulo}>
            <img className="servicio__foto" src={s.foto} alt={s.alt} loading="lazy" />
            <div className="servicio__cuerpo">
              <h3 className="servicio__titulo">{s.titulo}</h3>
              <p>{s.desc}</p>
            </div>
          </article>
        ))}
      </section>

      {/* AUTOATENCIÓN: intro + formulario */}
      <section className="autoatencion" id="formulario">
        <div className="autoatencion__intro">
          <span className="pildora-tema">AUTOATENCIÓN DE PEDIDOS</span>
          <h2>Cuéntanos qué se te antoja</h2>
          <p>
            Completa el formulario y tu pedido queda registrado en nuestro
            sistema, donde le damos seguimiento desde la cotización hasta la
            entrega.
          </p>
          <div className="pasos">
            {pasos.map((p) => (
              <div className="paso" key={p.n}>
                <span className="paso__num c-cotizado">{p.n}</span>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
          {/* Foto de pastelería artesanal. Reemplazable por una foto propia. */}
          <img className="autoatencion__foto" src={IMAGENES.artesanal} alt="Manos amasando en una pastelería artesanal" loading="lazy" />
        </div>

        <div className="form-card">
          {enviado ? (
            <div className="exito-pedido">
              <div className="exito-pedido__check">✓</div>
              <h3>¡Pedido registrado!</h3>
              <p>
                Quedó guardado como <strong>Cotizado</strong> en el panel de
                Martina. Te contactaremos para confirmar el diseño y el precio.
              </p>
              <button className="boton boton--contorno" onClick={() => setEnviado(false)}>
                Hacer otro pedido
              </button>
            </div>
          ) : (
            <form className="campos" onSubmit={enviarPedido}>
              <label className="campo">
                <span>Nombre</span>
                <input name="nombre" value={form.nombre} onChange={actualizarCampo} placeholder="¿Cómo te llamas?" required />
              </label>

              <div className="campos--fila">
                <label className="campo">
                  <span>Teléfono</span>
                  <input name="telefono" value={form.telefono} onChange={actualizarCampo} placeholder="+56 9 ..." required />
                </label>
                <label className="campo">
                  <span>Fecha de entrega</span>
                  <input type="date" name="fechaEntrega" value={form.fechaEntrega} onChange={actualizarCampo} required />
                </label>
              </div>

              <label className="campo">
                <span>¿Qué se te antoja?</span>
                <textarea
                  name="detalle"
                  value={form.detalle}
                  onChange={actualizarCampo}
                  rows="4"
                  placeholder="Ej: Torta de chocolate y manjar para 20 personas, decorada con frutos rojos."
                  required
                />
              </label>

              <button className="boton boton--primario boton--bloque" type="submit" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar pedido  →"}
              </button>

              {mensaje && (
                <p className={`aviso aviso--${mensaje.tipo}`} role="status">{mensaje.texto}</p>
              )}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

// ===========================================================================
// Vista de Martina: login (pantalla dividida) → panel con sidebar.
// ===========================================================================
function VistaMartina() {
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

  if (!autenticado) return <LoginMartina onLogin={iniciarSesion} />;
  return <PanelMartina onCerrarSesion={cerrarSesion} />;
}

// Login con layout de pantalla dividida (arte burdeos + formulario).
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
    <div className="login">
      <div className="login__arte">
        <div className="login__marca">
          <span className="login__marca-logo">m</span>
          <span className="login__marca-nombre">Pastelería Martina</span>
        </div>
        <div>
          <h2 className="login__titular">El control de tu pastelería, en un solo lugar.</h2>
          <p className="login__bajada">
            Pedidos, inventario e ingresos esperados — sin perder nada entre
            conversaciones de WhatsApp.
          </p>
        </div>
        <div className="login__pie">Dulce Descontrol · Panel de administración</div>
      </div>

      <div className="login__form-lado">
        <form className="login__form" onSubmit={enviar}>
          <h1 className="login__hola">Hola, Martina 👋</h1>
          <p className="login__intro">Inicia sesión para entrar a tu panel.</p>

          <label className="campo">
            <span>Usuario</span>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="martina" autoComplete="username" />
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </label>

          {error && <p className="aviso aviso--error" style={{ marginBottom: 16 }}>{error}</p>}

          <button className="boton boton--primario boton--bloque" type="submit" style={{ marginTop: 6 }}>
            Entrar al panel
          </button>

          <p className="login__pista">Demo · usuario <strong>martina</strong> · contraseña <strong>dulce2026</strong></p>
        </form>
      </div>
    </div>
  );
}

// Panel administrativo: shell con sidebar y secciones (Resumen / Pedidos / Inventario).
function PanelMartina({ onCerrarSesion }) {
  const [seccion, setSeccion] = useState("dashboard");
  const [metricas, setMetricas] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [avisoInventario, setAvisoInventario] = useState(null);

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
      await cargarDatos();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el pedido.");
    }
  }

  // Guarda los cambios de un insumo y refresca el panel (métricas + alertas).
  async function guardarInventario(id, cambios) {
    try {
      const respuesta = await fetch(`${API}/dashboard/inventario/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const json = await leerRespuesta(respuesta);
      await cargarDatos();
      setAvisoInventario({ tipo: "exito", texto: json.mensaje || "Inventario actualizado correctamente." });
      return true;
    } catch (err) {
      return err.message || "No se pudo actualizar el insumo.";
    }
  }

  useEffect(() => { cargarDatos(); }, []);

  const menu = [
    { key: "dashboard", label: "Resumen", icon: "◧" },
    { key: "pedidos", label: "Pedidos", icon: "☰" },
    { key: "inventario", label: "Inventario", icon: "❏" },
  ];

  return (
    <div className="admin">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar__marca">
          <span className="sidebar__logo">m</span>
          <div style={{ lineHeight: 1.15 }}>
            <div className="sidebar__titulo">Panel de Martina</div>
            <div className="sidebar__sub">Dulce Descontrol</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {menu.map((m) => (
            <button
              key={m.key}
              className={`sidebar__btn ${seccion === m.key ? "is-active" : ""}`}
              onClick={() => setSeccion(m.key)}
            >
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>

        <div className="sidebar__pie">
          <div className="sidebar__perfil">
            <div className="sidebar__avatar">🧁</div>
            <div style={{ lineHeight: 1.2 }}>
              <div className="sidebar__perfil-nombre">Martina Soto</div>
              <div className="sidebar__perfil-rol">Dueña · Pastelera</div>
            </div>
          </div>
          <button className="boton--secundario" style={{ width: "100%", marginTop: 12, cursor: "pointer" }} onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="admin__main">
        {error && <div className="seccion" style={{ paddingBottom: 0 }}><p className="aviso aviso--error">{error}</p></div>}

        {seccion === "dashboard" && (
          <SeccionResumen metricas={metricas} cargando={cargando} onRefrescar={cargarDatos} />
        )}
        {seccion === "pedidos" && (
          <SeccionPedidos pedidos={pedidos} metricas={metricas} cargando={cargando} onAvanzar={avanzarPedido} />
        )}
        {seccion === "inventario" && (
          <SeccionInventario
            inventario={inventario}
            metricas={metricas}
            aviso={avisoInventario}
            onGuardar={guardarInventario}
          />
        )}
      </div>
    </div>
  );
}

// ----- Sección Resumen (dashboard): insight + métricas + recos + flujo -----
function SeccionResumen({ metricas, cargando, onRefrescar }) {
  const tarjetas = metricas
    ? [
        { label: "INGRESOS DEL MES", value: formatoCLP.format(metricas.ingresosMes), sub: `${metricas.pedidosEntregadosMes} pedidos entregados`, accent: "#5ba876", iconBg: "#e3f1e6", icon: "$" },
        { label: "INGRESOS ESPERADOS", value: formatoCLP.format(metricas.ingresosEsperados), sub: "Comprometido en pedidos en curso", accent: "#c0567a", iconBg: "#fbe2e9", icon: "◷" },
        { label: "PEDIDOS EN CURSO", value: String(metricas.pedidosEnCurso), sub: `${metricas.pedidosPorConfirmar} por confirmar`, accent: "#d9a441", iconBg: "#fbefd3", icon: "☰" },
        { label: "INVENTARIO CRÍTICO", value: String(metricas.alertasInventario), sub: "insumos por reponer", accent: "#c0504a", iconBg: "#fae0de", icon: "!" },
      ]
    : [];

  return (
    <div className="seccion">
      <div className="seccion__top">
        <div>
          <h1 className="seccion__h">Resumen del negocio</h1>
          <p className="seccion__sub">Operación, finanzas e inventario para la gestión del día a día.</p>
        </div>
        <button className="boton--secundario" style={{ cursor: "pointer" }} onClick={onRefrescar} disabled={cargando}>
          {cargando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </div>

      {metricas && <InsightBanner metricas={metricas} />}

      <div className="metricas">
        {tarjetas.map((k) => (
          <div className="metrica" key={k.label}>
            <span className="metrica__barra" style={{ background: k.accent }} />
            <div className="metrica__cab">
              <span className="metrica__etiqueta">{k.label}</span>
              <span className="metrica__icono" style={{ background: k.iconBg, color: k.accent }}>{k.icon}</span>
            </div>
            <div className="metrica__valor">{k.value}</div>
            <div className="metrica__sub">{k.sub}</div>
          </div>
        ))}
        {!metricas && <p className="seccion__sub">Cargando métricas...</p>}
      </div>

      {metricas && (
        <div className="resumen-grid">
          <div className="panel-card">
            <h2 className="panel-card__h">Recomendaciones para hoy</h2>
            <div className="recos">
              {generarRecomendaciones(metricas).map((r, i) => {
                const icono = { atencion: "📞", info: "👩‍🍳", alerta: "⚠️", ok: "✅" };
                return (
                  <div className={`reco reco--${r.tipo}`} key={i}>
                    <span className="reco__icono">{icono[r.tipo]}</span>
                    <p>{r.texto}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel-card">
            <h2 className="panel-card__h panel-card__h--tight">Flujo del pedido</h2>
            <p className="panel-card__nota">Trazabilidad de cada encargo.</p>
            <div className="flujo-lista">
              {FLUJO_ESTADOS.map((estado, i) => {
                const c = claseEstado(estado);
                return (
                  <div className="flujo-fila" key={estado}>
                    <span className={`flujo-num c-${c}`}>{i + 1}</span>
                    <span className="flujo-fila__label">{etiquetaEstado(estado)}</span>
                    <span className={`flujo-fila__count t-${c}`}>{metricas.porEstado[estado] ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Banner de resumen en lenguaje natural.
function InsightBanner({ metricas }) {
  const { pedidosEntregadosMes, ingresosMes, ticketPromedio, pedidosEnCurso, pedidosPorConfirmar, ingresosEsperados, alertasInventario, insumosCriticos } = metricas;
  return (
    <div className="insight">
      <p>
        Este mes entregaste <strong>{pedidosEntregadosMes} {pedidosEntregadosMes === 1 ? "pedido" : "pedidos"}</strong> y
        facturaste <strong>{formatoCLP.format(ingresosMes)}</strong>
        {ticketPromedio > 0 && <> (ticket promedio {formatoCLP.format(ticketPromedio)})</>}.
        Tienes <strong>{pedidosEnCurso} en curso</strong>{pedidosPorConfirmar > 0 && <>, {pedidosPorConfirmar} por confirmar</>}, con{" "}
        <strong>{formatoCLP.format(ingresosEsperados)}</strong> en ingresos esperados.{" "}
        {alertasInventario > 0
          ? <>Ojo con el inventario: <strong>{insumosCriticos.join(", ")}</strong> {alertasInventario === 1 ? "está bajo" : "están bajo"} el mínimo.</>
          : <>El inventario está al día.</>}
      </p>
    </div>
  );
}

// ----- Sección Pedidos: chips de conteo + tabla -----
function SeccionPedidos({ pedidos, metricas, cargando, onAvanzar }) {
  return (
    <div className="seccion">
      <div className="seccion__top">
        <div>
          <h1 className="seccion__h">Pedidos</h1>
          <p className="seccion__sub">Cada encargo y su estado en el flujo de producción.</p>
        </div>
        <button
          className="boton--secundario"
          style={{ borderColor: "#c08081", cursor: "pointer" }}
          onClick={() => exportarPedidosCSV(pedidos)}
          disabled={pedidos.length === 0}
        >
          ↓ Exportar CSV
        </button>
      </div>

      {metricas && (
        <div className="chips">
          {FLUJO_ESTADOS.map((estado) => (
            <span className={`chip c-${claseEstado(estado)}`} key={estado}>
              {etiquetaEstado(estado)}
              <span className="chip__count">{metricas.porEstado[estado] ?? 0}</span>
            </span>
          ))}
        </div>
      )}

      <div className="tabla-card">
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>CLIENTE</th>
                <th>DETALLE</th>
                <th>ENTREGA</th>
                <th>ESTADO</th>
                <th className="right">TOTAL</th>
                <th className="right">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => {
                const proximo = siguienteEstado(p.estado);
                return (
                  <tr key={p.id}>
                    <td className="td-num">{i + 1}</td>
                    <td className="td-cliente">{p.cliente}</td>
                    <td className="td-detalle">{p.detalle}</td>
                    <td className="td-entrega">{formatearFecha(p.fechaEntrega)}</td>
                    <td>
                      <span className={`pildora c-${claseEstado(p.estado)}`}>{etiquetaEstado(p.estado)}</span>
                    </td>
                    <td className="td-total right">{p.total > 0 ? formatoCLP.format(p.total) : "Por cotizar"}</td>
                    <td className="right">
                      {proximo ? (
                        <button className="boton-mini" onClick={() => onAvanzar(p)} disabled={cargando} title={`Marcar como ${proximo}`}>
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
                <tr><td colSpan="7" className="tabla__vacio">Aún no hay pedidos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----- Sección Inventario: tarjetas con barra de progreso + edición -----
function SeccionInventario({ inventario, metricas, aviso, onGuardar }) {
  const criticos = metricas?.insumosCriticos || [];
  return (
    <div className="seccion">
      <div className="seccion__top">
        <div>
          <h1 className="seccion__h">Inventario</h1>
          <p className="seccion__sub">
            Insumos críticos para no frenar la producción.{" "}
            {criticos.length > 0
              ? <><strong style={{ color: "#b23a33" }}>{criticos.join(", ")}</strong> bajo el mínimo.</>
              : "Todo en orden."}
          </p>
        </div>
      </div>

      {aviso && <p className={`aviso aviso--${aviso.tipo}`} style={{ marginBottom: 18 }}>{aviso.texto}</p>}

      <div className="inventario-grid">
        {inventario.map((it) => (
          <ItemInventario key={it.id} insumo={it} onGuardar={onGuardar} />
        ))}
      </div>
    </div>
  );
}

// Tarjeta de un insumo: lectura (con barra de progreso) o edición inline.
function ItemInventario({ insumo, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const clase = claseEstado(insumo.estado);
  const pct = Math.min(100, Math.round((insumo.stock / (insumo.stockMinimo * 2 || 1)) * 100));

  function abrirEdicion() {
    setForm({ stock: insumo.stock, stockMinimo: insumo.stockMinimo, unidad: insumo.unidad });
    setError(null);
    setEditando(true);
  }

  function cambiarCampo(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const resultado = await onGuardar(insumo.id, {
      stock: Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
      unidad: form.unidad.trim(),
    });
    setGuardando(false);
    if (resultado === true) setEditando(false);
    else setError(typeof resultado === "string" ? resultado : "No se pudo guardar.");
  }

  return (
    <div className={`insumo insumo--${clase}`}>
      <span className="insumo__barra-estado" />
      <div className="insumo__cab">
        <div style={{ minWidth: 0 }}>
          <div className="insumo__nombre">{insumo.nombre}</div>
          <div className="insumo__detalle">
            {insumo.stock} {insumo.unidad} · mínimo {insumo.stockMinimo}
            {insumo.comprometido > 0 && <> · comprometido {insumo.comprometido} {insumo.unidad}</>}
          </div>
        </div>
        <span className={`pildora c-${clase}`}>{etiquetaEstado(insumo.estado)}</span>
      </div>

      {!editando ? (
        <>
          <div className="insumo__progreso">
            <div className="insumo__progreso-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="insumo__acciones">
            <button className="boton-mini boton-mini--fantasma" onClick={abrirEdicion}>Editar</button>
          </div>
        </>
      ) : (
        <form onSubmit={guardar}>
          <div className="insumo__campos">
            <label className="campo campo--mini">
              <span>Stock actual</span>
              <input type="number" name="stock" min="0" step="0.01" value={form.stock} onChange={cambiarCampo} required />
            </label>
            <label className="campo campo--mini">
              <span>Stock mínimo</span>
              <input type="number" name="stockMinimo" min="0" step="0.01" value={form.stockMinimo} onChange={cambiarCampo} required />
            </label>
            <label className="campo campo--mini">
              <span>Unidad</span>
              <input type="text" name="unidad" maxLength="20" value={form.unidad} onChange={cambiarCampo} required />
            </label>
          </div>
          {error && <p className="aviso aviso--error" style={{ marginTop: 12 }}>{error}</p>}
          <div className="insumo__botones">
            <button className="boton-mini" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
            <button className="boton-mini boton-mini--fantasma" type="button" onClick={() => setEditando(false)} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ===========================================================================
// Vista del proyecto (académica) — restyle con el mismo lenguaje visual.
// ===========================================================================
function VistaProyecto() {
  return (
    <div className="pagina proyecto">
      <div className="proyecto__intro">
        <span className="pildora-tema">CONTEXTO DEL PROYECTO</span>
        <h2>De un cuaderno de pedidos a un sistema web</h2>
        <p>
          Esta aplicación web nace en el ramo de Sistemas de Información a partir
          de un caso real y cotidiano de una pastelería que crece más rápido que
          sus herramientas. El objetivo es gestionar pedidos, inventario e
          ingresos con trazabilidad y apoyo a la toma de decisiones.
        </p>
      </div>

      <div className="proyecto__cols">
        <article className="tarjeta-doc">
          <h3>🔍 Problema detectado</h3>
          <p>Martina recibe pedidos por teléfono, WhatsApp e Instagram, y los anota en un cuaderno. Con ese sistema:</p>
          <ul>
            <li>Se traspapelan pedidos y se pierden fechas de entrega.</li>
            <li>No hay una vista clara de cuánto se vende ni qué está en curso.</li>
            <li>El inventario se controla "a ojo" y faltan insumos a último minuto.</li>
          </ul>
        </article>

        <article className="tarjeta-doc">
          <h3>💡 Solución propuesta</h3>
          <p>Una aplicación web con dos caras que ordenan el negocio de punta a punta:</p>
          <ul>
            <li>Una interfaz de autoatención donde el cliente registra su pedido.</li>
            <li>Un dashboard para Martina con ingresos, pedidos e inventario editable.</li>
            <li>Trazabilidad de estados (cotizado → entregado) para seguir cada encargo.</li>
          </ul>
        </article>
      </div>

      <div className="tarjeta-doc">
        <h3>Stack tecnológico</h3>
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
    </div>
  );
}
