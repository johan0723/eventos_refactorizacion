# Módulo de Detalle de Evento (details_evento.js) — Refactor

## Resumen
Este módulo gestiona la vista de detalle de un evento en el frontend. La refactorización aplicada se enfoca en mejorar mantenibilidad y legibilidad sin alterar el comportamiento funcional ni los endpoints del backend.

Principios aplicados:
- DRY (Don't Repeat Yourself): se eliminó duplicación de lógica (especialmente manejo de imágenes).
- SRP (Single Responsibility Principle): funciones con responsabilidades claras y acotadas.
- Nombres descriptivos y comentarios útiles.
- Separación interna de concerns dentro del mismo archivo (utils, UI, controller) manteniendo un único entrypoint.

Alcance de la refactorización:
- ÚNICAMENTE se modificó `assets/js/details_evento.js`.
- No se cambiaron endpoints PHP ni el DOM (IDs/clases) utilizado por el JS.
- Se preservó el comportamiento actual.

---

## Estructura lógica interna (en un solo archivo)
- Utils
  - `toPublicUrl(localPath)`: normaliza rutas locales a URL públicas (localhost/producción).
  - `convertLocalPathToUrl(localPath)`: alias de compatibilidad; delega en `toPublicUrl`.
  - `parseImageField(field)`: parsea strings/JSON/objetos con `name`/`url` a un array de URLs normalizadas.
  - `getEventImages(evento)`: consolida imágenes desde `imagen_principal`, `imagen_secundaria`, `imagen_ubicacion`, `fotos` e `imagen`; elimina duplicados.
  - Utilidades de formato: `formatearFecha`, `convertirASoloFecha`, `formatearPrecio`, `determinarEstadoEvento`.

- UI
  - Banner:
    - `loadBannerConFotosEvento(evento)`: ahora usa `getEventImages` para alimentar el banner.
    - `createEventPhotoBanner(imagenes)`: rotación, dots y cambio manual.
    - `loadBannerDinamicoOriginal()`: fallback desde endpoint.
    - `initializeBannerRotation()`: fallback con imágenes predefinidas.
  - Galería:
    - `createEventGallery(evento)`: simplificada usando `getEventImages`, placeholders para completar 4 imágenes, y modal.
  - Mapa:
    - `createDynamicMap(evento)`, `buscarCoordenadas(direccion)`, `actualizarMapa(lat, lon)`, `actualizarMapaPorNombre(direccion)`.
  - Tiendas:
    - `createTiendasGridSection(evento)`: grid de tiendas participantes.
  - Relacionados:
    - `cargarEventosRelacionados(eventoActual)`: sección y carga de eventos relacionados.
    - `createRelatedEventsCarousel()`: navegación y auto-scroll del carrusel.

- Modal
  - `EventRegistrationModal`: apertura/cierre, validaciones, simulación de envío.
  - `openRegistrationModal(eventData)`: API expuesta en `window` para compatibilidad.

- Controller / Init
  - `cargarDetallesEvento()`: orquesta carga de datos, banner, contenido, galería, mapa, tiendas y relacionados.
  - `DOMContentLoaded`: dispara `cargarDetallesEvento()` y el contador de tickets opcional.

---

## Principales cambios y motivación
- Unificación de conversión de rutas a URL
  - Antes: lógica repartida entre `ensureRedemprendedoresPath`/`ensurelocalredemprendedores`/`convertLocalPathToUrl`.
  - Ahora: `toPublicUrl` centraliza la conversión. `convertLocalPathToUrl` se mantiene como alias por compatibilidad.

- DRY en obtención de imágenes
  - Antes: parseo repetido de strings/JSON para banner y galería.
  - Ahora: `parseImageField` y `getEventImages` devuelven URLs listas para usar; la UI las reutiliza.

- Galería simplificada
  - Antes: bloque extenso con parseo, deduplicación y placeholders.
  - Ahora: `createEventGallery` usa utilidades, agrega placeholders si faltan y configura el modal.

- Comentarios y organización
  - Comentarios explicativos en puntos clave del refactor.
  - Secciones delimitadas con encabezados para facilitar mantenimiento.

---

## Endpoints consumidos (sin cambios)
- `POST assets/components/eventos/getDetailEvento.php`
  - Body: `{ id_evento: string|number }`
  - Respuesta: `{ eventos: [ { ...evento } ] }`

- `POST assets/components/eventos/getMejoresEventos.php`
  - Body: `{ estado: 'activo', limite: number, direccion: 'DESC'|'ASC' }`
  - Respuesta: `{ success: boolean, eventos: [ { ...evento } ] }`

- `POST assets/components/eventos/getBannerEvento.php`
  - Body: `{ ubicacion: 'EVENTOS' }`
  - Respuesta: JSON con `fotos` (estructura depende del backend)

- `POST assets/components/eventos/IncrementView.php`
  - Body: `{ id_evento: string|number }`
  - Respuesta: `{ success: boolean }`

---

## Uso esperado
- La vista `details_evento.php` carga este script y espera un parámetro `id` en la URL:
  - `details_evento.php?id=123`
- El script:
  - Carga los datos del evento, configura el banner, arma la estructura del contenido, genera la galería, el mapa, las tiendas y el carrusel de relacionados.
  - Expone `window.openRegistrationModal(...)` para abrir el modal de registro si se requiere desde el HTML.

---

## Compatibilidad
- No se modificaron IDs o clases del DOM.
- No se modificaron nombres de funciones públicas utilizadas por la vista.
- No se modificaron endpoints ni payloads.

---

## Buenas prácticas aplicadas
- DRY: utilidades unificadas para manejo de imágenes y formateos.
- SRP: funciones enfocadas por responsabilidad (banner, galería, mapa, tiendas, relacionados).
- Comentarios y nombres descriptivos que explican el propósito de cada bloque.
