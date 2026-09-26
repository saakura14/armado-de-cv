# Armado de CV — Documentación funcional y técnica

Estado al **26 de septiembre de 2026**. Sitio en producción: **https://www.armadodecv.com**

Dueña del proyecto: Valeria Yanina Gil · Instagram @armadodecv.ok · WhatsApp 11 5106-0953 · ayuda.armadodecv@gmail.com

---

## Índice

1. [Qué es el sitio](#1-qué-es-el-sitio)
2. [Documentación funcional](#2-documentación-funcional)
   - 2.1 Páginas públicas
   - 2.2 Catálogo y precios
   - 2.3 Cómo compra un cliente
   - 2.4 Estados de un pedido
   - 2.5 Mi cuenta (cliente)
   - 2.6 Panel de administración
   - 2.7 Sakura (asistente de preguntas frecuentes)
   - 2.8 Reglas comerciales y legales
3. [Documentación técnica](#3-documentación-técnica)
   - 3.1 Arquitectura y servicios
   - 3.2 Estructura del código
   - 3.3 Base de datos (Supabase)
   - 3.4 Seguridad
   - 3.5 Funciones del servidor (Edge Functions)
   - 3.6 Almacenamiento de archivos
   - 3.7 Inicio de sesión
   - 3.8 Dominio, despliegue y entornos
   - 3.9 Medición (píxel de Meta)
4. [Operación del día a día](#4-operación-del-día-a-día)
5. [Marketing e integraciones externas](#5-marketing-e-integraciones-externas)
6. [Qué vive fuera de este repositorio](#6-qué-vive-fuera-de-este-repositorio)
7. [Pendientes y próximos pasos](#7-pendientes-y-próximos-pasos)
8. [Historial de cambios](#8-historial-de-cambios)

---

## 1. Qué es el sitio

Tienda online de **Armado de CV**, el emprendimiento de Valeria Gil (RRHH – Relaciones Laborales). Vende:

- **Packs de CV** (CV moderno + CV optimizado para filtros ATS, carta de presentación, LinkedIn), con extras (express, idiomas, carga en portales).
- **Asesorías** para entrevistas y psicotécnicos: e-books y una sesión 1 a 1 por Google Meet.
- **Test de orientación vocacional**.
- **Guías digitales** para la búsqueda laboral (e-books en PDF con la marca).
- **Cursos pregrabados** (la estructura está lista; todavía no hay cursos cargados).

El cliente arma su pedido en la web, crea una cuenta, paga por **transferencia bancaria** y sube el comprobante. Valeria aprueba el pago desde el panel de administración, y eso libera automáticamente los e-books y los cursos y crea las sesiones 1 a 1 para coordinar.

---

## 2. Documentación funcional

### 2.1 Páginas públicas

| Ruta | Qué muestra |
|---|---|
| `/` | Inicio: portada "Hola, soy Valeria", catálogo de **packs de CV y LinkedIn**, **guías** para la búsqueda laboral, "Sobre mí", testimonios, cómo comprar, preguntas frecuentes (con Sakura) y comunidad (QR de Instagram y canal de WhatsApp). |
| `/asesorias` | Asesorías para entrevistas y psicotécnicos (e-books, Pack Plus, Pack Premium con Meet) y test vocacional. |
| `/cursos` | Cursos pregrabados publicados (hoy vacío). |
| `/comprar` | Resumen del pedido, datos de contacto, aceptación de términos y confirmación. Muestra los datos de transferencia **solo después** de confirmar. |
| `/cuenta` | Mi cuenta (ver 2.5). |
| `/cuenta/nueva-clave` | Crear o cambiar la contraseña (desde el mail de recuperación o desde Mi cuenta). |
| `/terminos` | Términos y condiciones, condiciones de los packs de CV, devoluciones. |
| `/privacidad` | Política de privacidad. |
| `/arrepentimiento` | Botón de arrepentimiento (Ley 24.240): formulario que arma un mensaje de WhatsApp. |
| `/admin` | Panel de administración (solo cuentas admin). |

Elementos presentes en todo el sitio:
- **Encabezado** con pestañas "Armado de CV" / "Asesorías" y acceso a Mi cuenta.
- **Barra inferior en el celular**: Precios, Cómo comprar, Mi cuenta, WhatsApp.
- **Sakura**: burbuja flotante de ayuda.
- **Pie** con links legales y botón de arrepentimiento.
- Instalable como app en el celular (manifest e íconos).

### 2.2 Catálogo y precios

Todo el catálogo se edita desde **Panel → Packs y precios**. Precios vigentes al 26/09/2026 (ARS):

| Categoría | Producto | Precio | Entrega |
|---|---|---|---|
| CV | Pack Simple (2 CV: moderno + ATS) | $30.000 | Servicio |
| CV | Pack Medium (2 CV + carta) | $32.000 | Servicio |
| CV | **Pack Premium** (2 CV + carta + LinkedIn) — *más elegido* | $60.000 | Servicio |
| CV | Perfil de LinkedIn (sin CV) | $40.000 | Servicio |
| Asesorías | E-book individual (a elección entre 3) | $18.000 | Digital |
| Asesorías | Pack Plus (2 e-books) — *más elegido* | $35.000 | Digital |
| Asesorías | Pack Premium (Pack Plus + sesión 1 a 1 de 90 min) | $60.000 | Sesión |
| Vocacional | Test de orientación vocacional (CHASIDE + TV-A) | $30.000 | Servicio |
| Guías | Portales de empleo | $16.000 | Digital |
| Guías | LinkedIn para conseguir trabajo | $16.000 | Digital |
| Guías | CV a prueba de filtros ATS | $16.000 | Digital |
| Guías | Búsqueda organizada | $16.000 | Digital |
| Guías | **Kit Búsqueda Laboral** (las 4 guías) — *más elegido* | $45.000 | Digital |

**Extras** (se suman al producto):

| Extra | Precio | Aplica a |
|---|---|---|
| Entrega express (24 hs hábiles) | $15.000 | Packs de CV y LinkedIn |
| Versión en otro idioma (por idioma) | $15.000 | Packs de CV |
| Carga del perfil en plataformas de empleo (por plataforma) | $15.000 | Packs de CV |
| Devolución personalizada 1 a 1 por Meet (60 min) | $30.000 | Test vocacional |

**E-books cargados** (todos con PDF subido): Asesoría integral para entrevistas laborales · Entrevistas virtuales · Tests laborales y psicotécnicos · Portales de empleo 2026 · LinkedIn para conseguir trabajo · CV a prueba de filtros ATS · Búsqueda organizada en 30 días.

Tipos de entrega (`delivery`):
- **service**: trabajo de Valeria. Después del pago se coordina por WhatsApp.
- **digital**: e-books. Se descargan apenas se aprueba el pago y el pedido pasa solo a "Entregado".
- **session**: incluye una sesión 1 a 1 por Meet que se agenda.
- **course**: curso pregrabado, disponible 12 meses.

### 2.3 Cómo compra un cliente

1. Toca **"Lo quiero"** en un producto y se abre la ventana de selección: elige el e-book si corresponde, suma extras con interruptores (idiomas y plataformas como chips, con opción "Otro" para escribir cuál) y ve el total animado.
2. Pasa a `/comprar`: completa nombre y WhatsApp, puede dejar una nota y **acepta los términos** (obligatorio).
3. Si no tiene cuenta, la crea ahí mismo con Google o con email y contraseña.
4. Al confirmar, el servidor **recalcula todos los precios** (el navegador no decide el total) y crea el pedido.
5. Ve los datos de transferencia (alias `armado.cv`, CBU y titular) con botones de copiar, transfiere y **sube el comprobante** (imagen o PDF).
6. Valeria revisa el comprobante en el panel y aprueba el pago. En ese momento:
   - se habilitan los **e-books** en Mi cuenta,
   - se habilitan los **cursos** (por 12 meses),
   - se crean las **sesiones 1 a 1** "a agendar",
   - si el pedido es solo digital, pasa directo a **Entregado**.

### 2.4 Estados de un pedido

| Estado | Qué ve el cliente |
|---|---|
| Esperando pago | "Transferí el total y subí el comprobante." |
| Revisando pago | "Recibí tu comprobante. Lo confirmo a la brevedad." (se pasa solo al subir el comprobante) |
| Pago confirmado | "Tu pago está confirmado. Coordinamos por WhatsApp." |
| En proceso | "Estoy trabajando en tu pedido." |
| Entregado | "¡Listo! Tu pedido está entregado." |
| Cancelado | Solo lo puede cancelar la administración: el cliente **no** puede cancelar un pedido hecho. |

### 2.5 Mi cuenta (cliente)

- Ingreso con **Google** o con **email y contraseña**. La contraseña se puede **mostrar u ocultar** con el ícono del ojo.
- **¿Olvidaste tu contraseña?**: pide el email y manda un enlace. El enlace abre `/cuenta/nueva-clave` para crear una contraseña nueva, que hay que escribir dos veces.
- **Cambiar contraseña** estando logueado: link en "Mis datos".
- **Mis pedidos**: estado, detalle, subida del comprobante y datos de transferencia.
- **Mis e-books**: descarga en PDF. Cada descarga lleva al pie de cada página una línea discreta con el email del comprador y el número de pedido (ver 3.5).
- **Mis cursos**: acceso por 12 meses, con videos y archivos por lección.
- **Mis sesiones**: estado, fecha y link de Google Meet cuando está agendada.
- **Mis datos**: nombre y WhatsApp.

### 2.6 Panel de administración (`/admin`)

Solo entran las cuentas **ayuda.armadodecv@gmail.com** y **valeeria.gil@gmail.com**: se marcan como admin automáticamente al registrarse.

| Pestaña | Para qué sirve |
|---|---|
| **Pedidos** | Ver todos los pedidos, abrir el comprobante, cambiar el estado (aprobar el pago libera todo automáticamente) y dejar notas. |
| **Sesiones** | Agendar las sesiones 1 a 1: fecha, link de Meet y estado (a agendar, agendada, hecha, cancelada). Si la persona falta sin avisar con 24 hs, la sesión cuenta como hecha. |
| **Packs y precios** | Crear y editar productos: nombre, precio, características, notas, destacado "más elegido", activo/inactivo, extras, e-books incluidos o a elección. |
| **E-books** | Alta de e-books y subida del archivo (PDF). |
| **Cursos** | Crear cursos y lecciones: video de YouTube o Vimeo no listado, archivo adjunto, vista previa gratuita y publicado/borrador. |
| **Sakura (preguntas)** | Preguntas frecuentes que responde Sakura y que se muestran en la web. Admiten `{{precio:id}}` y `{{extra:id}}` para que el precio se actualice solo. |
| **Testimonios** | Testimonios de clientes con su @ de Instagram (se muestra con link). |
| **Datos de pago** | Alias, CBU, titular y banco de la transferencia. |

### 2.7 Sakura (asistente de preguntas frecuentes)

Sakura es la versión anime de Valeria (`public/brand/sakura.jpg`). Aparece como burbuja flotante ("Soy Sakura") y dentro de la sección de preguntas frecuentes ("¿No encontrás tu duda? Preguntale a Sakura").

- **No usa inteligencia artificial.** Busca la respuesta entre las preguntas cargadas en el panel, comparando palabras clave (`lib/faq.ts`). Ignora las palabras vacías y las palabras genéricas pesan menos.
- Si no encuentra nada, ofrece escribir por WhatsApp.
- Los precios en las respuestas salen del catálogo en vivo.

### 2.8 Reglas comerciales y legales

- **Pago:** transferencia bancaria. El trabajo empieza con el total abonado.
- **Sin cancelaciones ni devoluciones** una vez hecho el pedido.
- El **botón de arrepentimiento** queda disponible por ley.
- **Condiciones de los packs de CV:**
  - 1 pack por persona y por rubro.
  - 3 a 4 días hábiles desde que se tiene toda la información; no se trabaja fines de semana.
  - Si se contrata después de las 17 hs, se empieza al día siguiente.
  - Se entrega un boceto y hay 24 hs para pedir cambios sin costo; después, $5.000 por cambio.
- **Sesiones 1 a 1:** si la persona falta sin avisar con 24 hs, cuenta como hecha y hay que volver a abonarla.
- **Cursos:** disponibles 12 meses desde la aprobación del pago.
- **Test vocacional:** herramienta de orientación, no diagnóstico.
- Las guías de "Cómo y dónde postularme" aclaran que la información es orientativa.

---

## 3. Documentación técnica

### 3.1 Arquitectura y servicios

```
Navegador ──► Vercel (Next.js, www.armadodecv.com)
   │
   └──► Supabase (proyecto wdcijkjmdfypltbafdol)
          ├─ Auth (email + contraseña, Google)
          ├─ Postgres (tablas con RLS + funciones RPC)
          ├─ Storage (comprobantes, e-books, archivos de cursos, avatares, redes)
          └─ Edge Functions (descarga de e-books con sello, subidas de administración)
```

| Servicio | Uso | Cuenta |
|---|---|---|
| **GitHub** | Código: `saakura14/armado-de-cv` (repositorio **público**) | saakura14 |
| **Vercel** | Hosting y despliegue automático; proyecto "armadodecv" | — |
| **Supabase** | Base de datos, login, archivos y funciones | proyecto `wdcijkjmdfypltbafdol` |
| **GoDaddy** | Dominio armadodecv.com y DNS | — |
| **Google Cloud** | Login con Google; proyecto "Armado de CV" (`armado-de-cv-509716`), marca verificada | valeeria.gil@gmail.com |
| **Google Search Console** | Propiedad de dominio armadodecv.com verificada (registro TXT en GoDaddy) | valeeria.gil@gmail.com |

**Stack:**
- Next.js 16.3 (App Router) con React 19 y TypeScript 5.7.
- Tailwind CSS 4.
- `@supabase/supabase-js` 2.57.
- Íconos: lucide-react.
- Tipografías: Montserrat, Nunito Sans y Cookie (script), desde Google Fonts.

### 3.2 Estructura del código

```
app/                      Páginas (App Router)
  page.tsx                Inicio (server component, revalidate 60 s)
  asesorias/ cursos/      Catálogos por categoría
  comprar/                Checkout
  cuenta/                 Mi cuenta · pedido/[id] · curso/[id] · nueva-clave
  admin/                  Panel de administración
  terminos/ privacidad/ arrepentimiento/
  layout.tsx globals.css manifest.ts
components/
  auth-panel.tsx          Login / registro / recuperar contraseña
  password-input.tsx      Campo de contraseña con mostrar/ocultar
  order-dialog.tsx        Ventana "Lo quiero": e-book, extras, total
  product-grid.tsx        Tarjetas de productos
  sakura.tsx sakura-chat.tsx   Asistente de preguntas frecuentes
  sections.tsx            Cómo comprar + preguntas frecuentes
  testimonials.tsx site-header.tsx bottom-nav.tsx site-footer.tsx
  meta-pixel.tsx legal.tsx copy-field.tsx whatsapp-icon.tsx
  admin/*                 Una pestaña del panel por archivo
lib/
  supabase.ts             Cliente y traducción de errores al español
  catalog.ts              Tipos, lectura del catálogo, formato de precios, WhatsApp
  cart.ts                 Pedido pendiente en localStorage (antes de loguearse)
  orders.ts               Tipos y estados de pedidos
  use-session.ts          Sesión, perfil y si es admin
  faq.ts                  Búsqueda de respuestas de Sakura y reemplazo de precios
  pixel.ts                Píxel de Meta (ID vacío = desactivado)
  video.ts                Links de YouTube/Vimeo a formato embebido
public/                   Marca (SVG), imágenes, íconos de la app, Sakura
brand-src/                Fuentes del logo y manual de marca
supabase/
  migrations/             Historial completo de la base de datos (SQL)
  functions/              Código de las Edge Functions
  config.toml             Configuración de las funciones
docs/DOCUMENTACION.md     Este documento
```

Detalles:
- Las páginas de catálogo son **server components** que leen Supabase con `revalidate = 60`: un cambio de precio en el panel se ve en la web en 1 minuto como máximo.
- Todo lo que requiere sesión (comprar, cuenta, admin) son **client components**.
- La fuente de títulos (`h1–h3`) está en `@layer base` para que `font-script` la pueda pisar.

### 3.3 Base de datos (Supabase)

El historial completo está en `supabase/migrations/`. Se aplica en orden por fecha.

**Tablas principales:**

| Tabla | Contenido |
|---|---|
| `profiles` | Un perfil por usuario: nombre, teléfono, email, rol (`client` / `admin`). Se crea sola al registrarse (trigger `handle_new_user`). |
| `products` | Catálogo: categoría, precio, tipo de entrega, características, notas, destacado, etiqueta de elección de e-book. |
| `extra_groups` / `extra_options` / `product_extra_groups` | Extras, sus opciones (con "Otro" y opciones que agregan sesión) y a qué producto aplican. |
| `ebooks` / `product_ebooks` / `product_ebook_choices` | E-books; cuáles incluye cada pack y entre cuáles se elige. |
| `courses` / `lessons` | Cursos pregrabados y lecciones (video, adjunto, vista previa). |
| `orders` / `order_items` | Pedidos y renglones, con los precios **congelados** al momento de la compra y aceptación de términos. |
| `ebook_access` / `course_access` | Qué e-books y cursos tiene cada usuario (cursos con vencimiento a 12 meses). |
| `sessions` | Sesiones 1 a 1 por Meet a agendar. |
| `payment_settings` | Datos de transferencia (una sola fila). |
| `faqs` | Preguntas de Sakura y de la web. |
| `testimonials` | Testimonios con @ de Instagram. |
| `admin_upload_tokens` | Tokens de un solo uso (2 hs) para subir archivos desde herramientas de administración. |

**Funciones (RPC)**, todas `SECURITY DEFINER`:

| Función | Quién | Qué hace |
|---|---|---|
| `create_order(items, accept_terms, name, phone, note)` | Cliente | Valida productos, e-book elegido y extras; calcula el total en el servidor; exige aceptar términos; guarda nombre y teléfono en el perfil. |
| `submit_receipt(order, path)` | Cliente | Asocia el comprobante (en su propia carpeta) y pasa el pedido a "Revisando pago". |
| `admin_set_order_status(order, status, note)` | Admin | Cambia el estado. La primera vez que se aprueba el pago otorga e-books y cursos, crea las sesiones y marca como entregados los pedidos solo digitales. |
| `admin_update_session(...)` | Admin | Fecha, link de Meet, estado y nota de una sesión. |
| `is_admin()` | Todos | Usada por las políticas de seguridad. |

**Triggers:**
- `handle_new_user` crea el perfil y asigna admin a los dos mails de Valeria.
- `protect_profile_role` impide que un cliente se cambie el rol.
- `set_course_expiry` fija el vencimiento de los cursos a 12 meses.

### 3.4 Seguridad

- **RLS (Row Level Security) activado en todas las tablas.**
  - El catálogo es de lectura pública.
  - Cada cliente solo ve sus pedidos, accesos y sesiones.
  - Solo la administración escribe el catálogo.
- **Los pedidos no se escriben directo:** todo pasa por funciones que recalculan precios y validan permisos.
- La **clave publicable** de Supabase está en el código (`lib/supabase.ts`), y está bien que así sea: sin las políticas RLS no permite nada.
- La **service role key** vive solo en las Edge Functions (variable de entorno de Supabase) y nunca en el repositorio.
- Los **e-books** no se pueden descargar directo del almacenamiento: solo a través de la función que agrega el sello con el email.
- Los **datos de transferencia** solo los ven usuarios logueados.
- El repositorio es **público**: el CBU está reemplazado por un marcador en las migraciones y los e-books pagos no se suben.

### 3.5 Funciones del servidor (Edge Functions)

Código en `supabase/functions/`. Se despliegan en Supabase.

| Función | Autenticación | Qué hace |
|---|---|---|
| `ebook-download` | Sesión del cliente (JWT) | Verifica que el usuario tenga acceso al e-book y descarga el PDF del bucket privado. Agrega en cada página, arriba del pie, la línea *"E-book adquirido por {email} - Pedido #N"* y guarda email y pedido en los metadatos del PDF. |
| `admin-upload` | Token de `admin_upload_tokens` (encabezado `x-upload-token`) | `?ebook=<id>&name=` sube el PDF de un e-book y lo vincula (borra el anterior). `?social=<ruta>` sube PNG, JPG, PDF o MP4 al bucket público `social` y devuelve la URL. |

Buena práctica: **borrar el token** de `admin_upload_tokens` apenas se termina de usar.

### 3.6 Almacenamiento de archivos (Storage)

| Bucket | Público | Contenido | Límite |
|---|---|---|---|
| `receipts` | No | Comprobantes de transferencia (carpeta por usuario) | 10 MB · imagen o PDF |
| `ebooks` | No | PDF de los e-books (solo admin; clientes vía `ebook-download`) | 50 MB |
| `course-files` | No | Adjuntos de lecciones (compradores con acceso vigente) | 100 MB |
| `avatars` | Sí | Fotos de perfil | 5 MB |
| `social` | Sí | Imágenes, videos y PDF para redes (Metricool, Canva) | 50 MB |

### 3.7 Inicio de sesión

- **Email y contraseña.** La confirmación de email está **desactivada**: la cuenta queda activa al crearla.
- **Recuperar contraseña:** `resetPasswordForEmail` con destino `/cuenta/nueva-clave`, donde `updateUser` guarda la nueva.
- **Google:**
  - OAuth configurado en Google Cloud y en Supabase (Authentication → Providers → Google).
  - El botón aparece solo cuando el proveedor está activo (`/auth/v1/settings`).
  - **La marca "Armado de CV" está verificada y publicada en Google** (con logo): la pantalla dice "Iniciar sesión en Armado de CV".
- En Supabase → Authentication → URL Configuration deben figurar `https://www.armadodecv.com` y `https://www.armadodecv.com/**` como URLs permitidas.

### 3.8 Dominio, despliegue y entornos

- **Dominio en GoDaddy.** DNS:
  - `A @ → 216.198.79.1` (Vercel)
  - `CNAME www → *.vercel-dns-017.com`
  - `TXT @ google-site-verification=…` (**no borrar**: sostiene la verificación de Google)
- **Despliegue:** cada merge a `main` en GitHub despliega solo en Vercel. Cada Pull Request genera una vista previa.
- **Variables de entorno (opcionales):** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Si no están, se usan los valores públicos del código.
- **Desarrollo local:**
  ```bash
  npm install
  npm run dev
  ```
- **Base de datos:** los cambios se hacen con migraciones nuevas en `supabase/migrations/` (nunca editando las viejas).

### 3.9 Medición (píxel de Meta)

- El código ya está integrado (`components/meta-pixel.tsx`, `lib/pixel.ts`) y registra PageView, ViewContent (al abrir un producto), InitiateCheckout, Lead (al crear el pedido) y Purchase (al subir el comprobante).
- Está **apagado** mientras `META_PIXEL_ID` esté vacío en `lib/pixel.ts`.
- Para activarlo hace falta crear el píxel en el portfolio comercial "Armado de Cv" (Meta Business) y pegar el ID.

---

## 4. Operación del día a día

| Tarea | Dónde |
|---|---|
| Cambiar un precio o un texto de pack | Panel → Packs y precios (impacta en la web en ≤ 1 minuto) |
| Aprobar un pago | Panel → Pedidos → abrir el comprobante → "Pago confirmado" |
| Agendar una sesión 1 a 1 | Panel → Sesiones → fecha + link de Meet |
| Subir o reemplazar un e-book | Panel → E-books |
| Agregar una pregunta a Sakura | Panel → Sakura (preguntas) |
| Agregar un testimonio | Panel → Testimonios (con el @ de Instagram) |
| Cambiar el alias o el CBU | Panel → Datos de pago |
| Cargar un curso | Panel → Cursos → lecciones con video no listado |

**Producción de CVs para clientes (fuera de la web):**
- Se hace en **Canva**: se duplica un trabajo anterior del mismo género con la misma cantidad de hojas (Pack Simple: 2 hojas; con carta: 3), se renombra "Cv - NOMBRE APELLIDO" y se reemplazan los datos.
- Los textos salen del *Master Prompt* de Valeria.
- Van solo las **3 experiencias más relevantes** para el puesto objetivo.
- Primero se envía el link de Canva como boceto y, con el OK del cliente, se descarga el PDF.
- Los turnos se agendan en WhatsApp Business (nombre / pack / fecha).
- Los clientes sin CV previo completan el formulario de Google "Carga de datos para CV / Carta de presentación".

---

## 5. Marketing e integraciones externas

- **Instagram @armadodecv.ok:**
  - Se publica con **Metricool** (conectado) o con Meta Business Suite.
  - Contenido con la identidad de marca: carruseles 1080×1350, historias 1080×1920, serie "Cómo y dónde postularme a…" con el logo oficial de cada empresa y un video de la web.
- **Publicidad:**
  - Se promociona **directamente desde Instagram o Business Suite**, solo en Instagram.
  - Tope acordado: US$ 5 por día para mensajes (Instagram y WhatsApp) y US$ 5 por día para tráfico a la web.
  - El Ads Manager quedó solo para consultas: hay una campaña en borrador sin publicar, y en los controles de la cuenta están excluidos Audience Network, Marketplace y la columna derecha de Facebook.
- **Canva:** conectado. Se usa para los CV de clientes y para videos.
- **Google Drive y Sheets:** conectados. El formulario de clientes pertenece a ayuda.armadodecv@gmail.com; para leer las respuestas hay que compartir la planilla con valeeria.gil@gmail.com.
- **Destacadas de Instagram:** agrupadas en 7 (Web, Servicios, Clientes, Tips, Ofertas, En medios, Info), con portadas en `social/destacadas/` del bucket público.

---

## 6. Qué vive fuera de este repositorio

El repositorio es público, así que el **contenido pago y las fuentes de diseño** están en la PC de Valeria:

| Qué | Dónde |
|---|---|
| E-books (HTML fuente, CSS de marca, script de armado de PDF) | `Documentos\armado-de-cv-ebooks\` (`build.ps1`, `assets\ebook.css`) |
| Guías de regalo del pack (PDF con marca) | `Documentos\armado-de-cv-ebooks\guias-pack\` (`build-guias.ps1`) y copia en `OneDrive\...\Armado de CV\Guias\PDF con marca\` |
| Contenido de redes (carruseles, historias, video, destacadas) | `Documentos\armado-de-cv-ebooks\contenido\` |
| Master Prompt de CVs y flujo en Canva | `Documentos\armado-de-cv-ebooks\flujo-cvs\prompt-cv.md` |
| Plan de Instagram y Meta Ads | `Documentos\armado-de-cv-ebooks\contenido\PLAN-Instagram-y-Meta-Ads.md` |
| PDFs de los e-books vendidos | Bucket privado `ebooks` en Supabase |
| Secretos (service role key, cliente de Google OAuth) | Configuración de Supabase y de Google Cloud (nunca en el código) |

Se recomienda tener una **copia de seguridad** de `Documentos\armado-de-cv-ebooks\` (por ejemplo en OneDrive).

---

## 7. Pendientes y próximos pasos

- **Emails de recuperación de contraseña:**
  - El servicio de email que Supabase trae por defecto tiene un límite muy bajo y puede no entregar mails a clientes. Para producción conviene configurar un **SMTP propio** (Supabase → Authentication → Emails → SMTP), por ejemplo con Resend o con una cuenta de Gmail con contraseña de aplicación.
  - Conviene traducir al español la plantilla "Reset password".
- **Píxel de Meta:** crear el píxel en el portfolio "Armado de Cv" (requiere verificar con código) y cargar el ID.
- **Cursos:** la estructura está lista; falta cargar el primero.
- **Agente de Instagram** para respuestas y ventas: se deja para cuando haya volumen de ventas.
- **Formulario de clientes:** vincular la planilla de respuestas y compartirla con valeeria.gil@gmail.com.

---

## 8. Historial de cambios

| PR | Cambio |
|---|---|
| — | Reemplazo del sitio anterior (Vite) por el nuevo sitio en Next.js |
| #1 | Identidad de marca, sección Asesorías separada, mejoras para celular |
| #2 | Tienda con cuentas, panel de administración, cursos y legales |
| #3 | Sakura, reglas de cancelación y cursos por 12 meses |
| #4 | Sakura responde preguntas frecuentes |
| #5 | E-books con licencia estampada y foto recortada |
| #6 | Ajustes de diseño: portada, fotos, WhatsApp, testimonios y pedido interactivo |
| #7 | Ingreso con Google automático y sección de guías |
| #8 | Sakura en alta definición y e-books en PDF |
| #9 | Píxel de Meta listo para activar |
| #10 | Foto a la cintura e Instagram en testimonios |
| #11 | Recuperar contraseña, mostrar/ocultar contraseña, cambiar contraseña desde Mi cuenta; base de datos y funciones versionadas en el repositorio; esta documentación |
