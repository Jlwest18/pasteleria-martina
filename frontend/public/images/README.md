# Imágenes de Pastelería Martina

Esta carpeta guarda las **fotografías propias** del negocio. Cualquier archivo
que dejes aquí queda disponible en la web bajo la ruta `/images/<archivo>`.

## Cómo reemplazar las fotos por las de Martina

1. Deja tu foto en esta carpeta, por ejemplo:
   - `hero.jpg` — portada principal
   - `torta-chocolate.jpg` — tarjeta "Tortas personalizadas"
   - `cupcakes.jpg` — tarjeta "Cupcakes y dulces"
   - `mesa-dulce.jpg` — tarjeta "Mesas dulces"
   - `pasteleria-artesanal.jpg` — sección del formulario de pedido
2. Abre `frontend/src/App.jsx` y busca la constante `IMAGENES` (cerca del
   inicio del archivo).
3. Reemplaza la URL de Unsplash por la ruta local, por ejemplo:

   ```js
   hero: "/images/hero.jpg",
   ```

## Recomendaciones

- Formato **JPG** (o WebP), **~800 px de ancho** y **menos de 300 KB** por foto,
  para que el sitio cargue rápido y no dependa de imágenes pesadas.
- Por ahora se usan imágenes públicas y estables de Unsplash (libres, sin
  atribución obligatoria) solo como referencia visual.
