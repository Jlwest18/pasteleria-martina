# Justificación del stack tecnológico

Cada decisión técnica del proyecto se tomó buscando un equilibrio entre lo que
pide la pauta, la simplicidad para explicar el código y la facilidad para
desplegar la aplicación. A continuación, el porqué de cada elección.

## Backend: Node.js + Express

- **Express** es un framework minimalista y muy difundido: con pocas líneas se
  arma una API REST clara, ideal para un proyecto académico que debe ser fácil
  de leer y defender.
- Se usa **solo `express` y `cors`** (sin dependencias extra) para mantener el
  proyecto liviano, sin "magia" oculta y 100% explicable línea por línea.
- **CORS** es necesario porque el frontend corre en un origen distinto
  (`localhost:5173`) al del backend (`localhost:3001`); sin él, el navegador
  bloquearía las llamadas `fetch`.

## Frontend: React + Vite

- **React** organiza la interfaz en componentes y maneja el estado de forma
  declarativa: el formulario, el dashboard y la tabla se entienden por separado.
- **Vite** entrega un servidor de desarrollo rápido y una configuración mínima,
  lo que reduce fricción al iniciar y al construir para producción.
- **CSS puro** (sin Tailwind ni Bootstrap): se eligió para demostrar dominio del
  diseño desde cero y evitar dependencias pesadas. El estilo usa variables CSS y
  una paleta cálida de pastelería para no parecer una plantilla genérica.

## Datos en memoria (producción) + SQL (respaldo académico)

Esta es la decisión más importante de la arquitectura, y es deliberada:

- **En memoria, para producción:** el backend guarda los datos en arreglos de
  JavaScript (`backend/db/connection.js`). Así la aplicación se despliega en
  Render sin necesidad de aprovisionar ni pagar una base de datos, y la demo
  funciona al instante. Los pedidos nuevos persisten mientras el servidor esté
  corriendo.
- **SQL, como respaldo documentado:** en `/db` se incluye el modelo relacional
  equivalente (`schema.sql` con el DDL y `seed.sql` con datos de prueba). Esto
  cumple la pauta —que exige diseñar una base de datos relacional— y deja el
  camino listo para migrar a PostgreSQL cuando el negocio lo requiera, sin
  rehacer el modelo.

> En resumen: **memoria = simplicidad y despliegue gratis**; **SQL = diseño
> formal y escalabilidad futura**. Tener ambas evidencia el criterio de
> ingeniería detrás del proyecto.

## Despliegue: Render

- Render permite publicar el backend Node y el frontend estático de forma
  gratuita y directa desde un repositorio Git.
- El backend lee el puerto desde `process.env.PORT`, tal como Render lo asigna,
  por lo que no requiere cambios para producción.

## Decisiones de las mejoras finales

Para acercar el proyecto a un sistema de información completo se sumaron cuatro
funcionalidades, todas resueltas en el frontend sin agregar dependencias y
respetando las restricciones (React + CSS puro, backend solo con express y cors,
datos en memoria):

- **Login del panel.** Se implementó como un control de acceso simple en el lado
  del cliente: valida las credenciales (`martina` / `dulce2026`) y guarda la
  sesión en `localStorage`, con botón para cerrar sesión. Es una decisión
  consciente y proporcional al alcance académico: demuestra el concepto de
  "área protegida" sin montar un sistema de autenticación real (tokens, hash de
  contraseñas, sesiones en el servidor), que excedería el objetivo del ramo. En
  la documentación se deja explícito que no es seguridad de producción.
- **Recomendaciones automáticas.** Son reglas de negocio sencillas que leen las
  métricas (pedidos pendientes, pedidos en preparación e insumos críticos) y las
  traducen en sugerencias accionables. Refuerzan la idea central de un sistema
  de información: no solo mostrar datos, sino **apoyar la toma de decisiones**.
- **Exportar a CSV.** Se genera con la API nativa del navegador (`Blob` +
  descarga), sin librerías externas. Aporta interoperabilidad: los datos pueden
  abrirse en Excel o respaldarse fuera del sistema.
- **Diagrama del flujo de pedidos.** Una explicación visual de las etapas
  (pendiente → confirmado → en preparación → entregado) que conecta el modelo de
  datos (el campo `estado`) con la operación real del negocio.

## Sobre el diseño de la interfaz

En lugar de una herramienta visual externa (tipo Stitch), la interfaz se diseñó
directamente en código con CSS puro. Esto mantiene una sola fuente de verdad
(el mismo código que se ejecuta es el que se diseña) y permite explicar cada
decisión visual —colores, tipografías, espaciados— en la presentación.
