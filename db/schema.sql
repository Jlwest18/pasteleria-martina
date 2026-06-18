-- ===========================================================================
-- Pastelería Martina · Dulce Descontrol
-- schema.sql — Definición de la base de datos relacional (DDL)
-- ---------------------------------------------------------------------------
-- Esta es la versión SQL equivalente al modelo que el backend mantiene en
-- memoria. Se incluye como respaldo académico para documentar el diseño
-- relacional del sistema. Sintaxis orientada a PostgreSQL (el motor que ofrece
-- Render); es fácilmente adaptable a MySQL o SQLite.
-- ===========================================================================

-- Para reejecutar el script desde cero sin errores de dependencias.
DROP TABLE IF EXISTS pedido_insumos;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS insumos;
DROP TABLE IF EXISTS clientes;

-- ---------------------------------------------------------------------------
-- Clientes: quién hace el pedido.
-- ---------------------------------------------------------------------------
CREATE TABLE clientes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(60)  NOT NULL,
  telefono   VARCHAR(25)  NOT NULL,
  email      VARCHAR(120),
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Insumos: materias primas del taller y su nivel de stock.
-- ---------------------------------------------------------------------------
CREATE TABLE insumos (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(80)   NOT NULL,
  unidad        VARCHAR(20)   NOT NULL,             -- kg, unidades, litros...
  stock         NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo  NUMERIC(10,2) NOT NULL DEFAULT 0    -- bajo este nivel = crítico
);

-- ---------------------------------------------------------------------------
-- Pedidos: el encargo concreto de un cliente.
-- El estado sigue el flujo de trabajo de la pastelería.
-- ---------------------------------------------------------------------------
CREATE TABLE pedidos (
  id              SERIAL PRIMARY KEY,
  cliente_id      INTEGER      NOT NULL REFERENCES clientes(id),
  detalle         VARCHAR(300) NOT NULL,
  fecha_entrega   DATE         NOT NULL,
  fecha_creacion  DATE         NOT NULL DEFAULT CURRENT_DATE,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'cotizado'
                  CHECK (estado IN ('cotizado', 'confirmado', 'en producción', 'entregado')),
  total           INTEGER      NOT NULL DEFAULT 0   -- monto en pesos; 0 = por cotizar
);

-- ---------------------------------------------------------------------------
-- Pedido_insumos: relación N:M entre pedidos e insumos (la "receta" o consumo
-- estimado de cada pedido). Permite, a futuro, descontar stock automáticamente.
-- ---------------------------------------------------------------------------
CREATE TABLE pedido_insumos (
  pedido_id  INTEGER       NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  insumo_id  INTEGER       NOT NULL REFERENCES insumos(id),
  cantidad   NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (pedido_id, insumo_id)
);

-- ---------------------------------------------------------------------------
-- Índices para las consultas más frecuentes del panel.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_pedidos_estado  ON pedidos(estado);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
