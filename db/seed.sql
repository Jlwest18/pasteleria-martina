-- ===========================================================================
-- Pastelería Martina · Dulce Descontrol
-- seed.sql — Datos de prueba (DML)
-- ---------------------------------------------------------------------------
-- Inserta los mismos 5 clientes, 5 pedidos y 5 insumos que el backend trae
-- precargados en memoria. Las fechas se calculan sobre el mes en curso para
-- que las consultas de "ingresos del mes" tengan datos vigentes.
-- Ejecutar después de schema.sql.
-- ===========================================================================

-- Partimos limpio (respeta el orden por las llaves foráneas).
TRUNCATE pedido_insumos, pedidos, insumos, clientes RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
INSERT INTO clientes (id, nombre, telefono, email) VALUES
  (1, 'Camila Rojas',    '+56 9 8123 4567', 'camila.rojas@correo.cl'),
  (2, 'Ignacio Fuentes', '+56 9 7654 3210', 'ignacio.fuentes@correo.cl'),
  (3, 'Valentina Soto',  '+56 9 9988 7766', 'valentina.soto@correo.cl'),
  (4, 'Matías Herrera',  '+56 9 6677 8899', 'matias.herrera@correo.cl'),
  (5, 'Antonia Pérez',   '+56 9 5566 7788', 'antonia.perez@correo.cl');

-- ---------------------------------------------------------------------------
-- Insumos
-- ---------------------------------------------------------------------------
INSERT INTO insumos (id, nombre, unidad, stock, stock_minimo) VALUES
  (1, 'Harina sin polvos',       'kg',       25, 10),
  (2, 'Azúcar flor',             'kg',        4,  5),   -- crítico
  (3, 'Mantequilla',             'kg',        8,  6),   -- bajo
  (4, 'Chocolate de cobertura',  'kg',        2,  4),   -- crítico
  (5, 'Huevos',                  'unidades', 120, 60);

-- ---------------------------------------------------------------------------
-- Pedidos (fechas relativas al mes actual, igual que el backend en memoria)
-- DATE_TRUNC obtiene el día 1 del mes; sumamos días para ubicar cada pedido.
-- ---------------------------------------------------------------------------
INSERT INTO pedidos (id, cliente_id, detalle, fecha_creacion, fecha_entrega, estado, total) VALUES
  (1, 1, 'Torta de chocolate y manjar para 20 personas',
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 day')::date,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '4 day')::date,
        'entregado', 45000),
  (2, 2, '24 cupcakes de vainilla con frosting de frutilla',
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '6 day')::date,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '8 day')::date,
        'entregado', 36000),
  (3, 3, 'Torta naked de frutos rojos para 15 personas',
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '11 day')::date,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '21 day')::date,
        'en preparación', 52000),
  (4, 4, 'Mesa dulce de cumpleaños (mini pies, brownies y alfajores)',
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '13 day')::date,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '24 day')::date,
        'confirmado', 38000),
  (5, 5, 'Torta temática infantil decorada con fondant',
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '15 day')::date,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '27 day')::date,
        'pendiente', 0);

-- ---------------------------------------------------------------------------
-- Insumos estimados por pedido (relación N:M de ejemplo)
-- ---------------------------------------------------------------------------
INSERT INTO pedido_insumos (pedido_id, insumo_id, cantidad) VALUES
  (1, 1, 1.5),  -- harina
  (1, 4, 0.8),  -- chocolate
  (1, 5, 12),   -- huevos
  (2, 1, 0.8),
  (2, 3, 0.5),  -- mantequilla
  (3, 1, 1.2),
  (3, 2, 0.4);  -- azúcar flor

-- Sincroniza las secuencias para que los próximos INSERT no choquen con los ids.
SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));
SELECT setval('insumos_id_seq',  (SELECT MAX(id) FROM insumos));
SELECT setval('pedidos_id_seq',  (SELECT MAX(id) FROM pedidos));

-- ===========================================================================
-- Consulta de referencia: replica la métrica "ingresos del mes" del backend.
-- (suma del total de los pedidos entregados dentro del mes en curso)
--
--   SELECT COALESCE(SUM(total), 0) AS ingresos_mes
--   FROM pedidos
--   WHERE estado = 'entregado'
--     AND DATE_TRUNC('month', fecha_creacion) = DATE_TRUNC('month', CURRENT_DATE);
-- ===========================================================================
