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
- **digital**: e-books y guías. Se descargan apenas Valeria aprueba el pago, y el pedido pasa solo a "Entregado".

> **Entrega al instante (desactivada).** El sistema está preparado para entregar e-books al instante: la función `verify-receipt` lee el comprobante con IA y controla destinatario, monto exacto, fecha, señales de edición y un número de operación no repetido. Hoy está **apagada** a pedido de Valeria, porque no está cargada la clave `ANTHROPIC_API_KEY` (tiene costo por comprobante). Sin esa clave, todo pedido espera su aprobación. Para activarla alcanza con cargar la clave en Supabase → Edge Functions → Secrets y volver a poner en la web los textos de entrega inmediata.
- **session**: incluye una sesión 1 a 1 por Meet que se agenda.
- **course**: curso pregrabado, disponible 12 meses.

### 2.3 Cómo compra un cliente

1. Toca **"Lo quiero"** en un producto y se abre la ventana de selección: elige el e-book si corresponde, suma extras con interruptores (idiomas y plataformas como chips, con opción "Otro" para escribir cuál) y ve el total animado.
2. Pasa a `/comprar`: completa nombre y WhatsApp, puede dejar una nota y **acepta los términos** (obligatorio).
3. Si no tiene cuenta, la crea ahí mismo con Google o con email y contraseña.
4. Al confirmar, el servidor **recalcula todos los precios** (el navegador no decide el total) y crea el pedido.
5. Ve primero la **transferencia**, destacada como "Recomendado · Sin recargo": alias `armado.cv`, CBU y titular con botones de copiar. Transfiere y **sube el comprobante** (imagen o PDF). Si el pago con tarjeta está activado y todavía no subió comprobante, debajo aparece "Otra opción: tarjeta de débito o crédito" con el total más el costo de Ualá; al pagar vuelve a su pedido y se confirma solo.
6. Valeria revisa el comprobante en el panel, controla su banco y **aprueba el pago** (todos los pedidos, incluidos los de e-books). En ese momento:
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

**La única administradora es valeeria.gil@gmail.com.** Toda cuenta nueva es cliente, sin excepciones. Sumar otra administradora es un cambio manual y deliberado en la base (`update profiles set role = 'admin' ...`).

Al ingresar, la administradora va directo al panel (Mi cuenta la redirige a `/admin`; con `/cuenta?cliente` se ve como cliente, y el panel tiene el link "Ver mi cuenta como cliente").

**App del panel en el celu.** En el celu el panel tiene encabezado propio (logo, foto de perfil con Ver la web / Ver mi cuenta como cliente / Cerrar sesión) y un menú abajo: Inicio, Pedidos, **Venta** (WhatsApp), Sesiones y Más (el resto de las secciones). El botón Atrás del celu vuelve a la sección anterior o cierra la ventana abierta; en la app instalada nunca sale del panel (antes volvía a las páginas de login de Google). El panel tiene su propio manifest (`public/admin.webmanifest`): desde Chrome en Android se instala como **"Armado de CV - Admin"** y abre directo en `/admin`. Accesos directos: "Venta por WhatsApp" y "Pedidos". En Inicio está la tarjeta "Tu panel en el celu" para instalarla y activar los avisos.

**Notificaciones push.** Al activarlas, el celu se guarda en `push_subscriptions` y el service worker (`public/sw.js`) muestra los avisos. El navegador del cliente llama a la función `notify-admin` al confirmar un pedido y al subir el comprobante (una vez por pedido y tipo, solo pedidos de hace menos de 15 minutos). Botón "Probar" para un aviso de prueba. Las claves VAPID están en Supabase Vault (`vapid_private_key`, `vapid_public_key`); la pública también en `lib/push.ts`.

**Ventas por WhatsApp.** Botón verde "Venta por WhatsApp" (arriba del panel): se pega la nota tal cual ("Nombre / Pack + fecha", una o varias por renglón, incluso mensajes copiados de WhatsApp) y `lib/whatsapp-sale.ts` reconoce cliente, fecha y **uno o varios productos con sus adicionales** separados por "+" (express, idiomas, plataformas, sección Servicios de LinkedIn, devolución). Cada adicional se asigna al producto que lo ofrece. El total sale de los precios del catálogo y se puede editar si hubo descuento. Se revisa, se corrige y se guarda con `admin_record_sale`: queda como pedido pagado (o entregado) con `source = 'whatsapp'`, sin cuenta de cliente, con el número correlativo de siempre. En Android también se puede **compartir** la nota desde WhatsApp a "Armado de CV - Admin" y el formulario se abre completo. Estas ventas cuentan en métricas, lo más vendido y el Excel (columna "Origen"), pero no en el embudo de la web. Filtro "De WhatsApp" en Pedidos.

| Pestaña | Para qué sirve |
|---|---|
| **Inicio** | Saludo aleatorio; **Para gestionar**: pagos a revisar, sesiones a agendar y packs a entregar con el plazo restante (4 días hábiles desde el pago, Express 1; después de las 17 hs o en fin de semana arranca el siguiente día hábil; no descuenta feriados). **Cómo viene el mes**: ventas, facturado, ticket promedio, visitas y conversión con la variación contra el mes anterior, facturación de los últimos 6 meses, lo más vendido y por qué página entraron. **Del clic a la venta**: embudo del mes (entraron, tocaron "Lo quiero", llegaron a comprar, confirmaron el pedido, pagaron) con el porcentaje de cada paso. **Reporte en Excel** del año con logo y colores de la marca (resumen mensual, más vendidos, detalle de ventas y visitas por día). Las ventas son pedidos con pago confirmado, sin cancelados ni pedidos de prueba (#90000 en adelante). |
| **Pedidos** | Ver todos los pedidos, abrir el comprobante, cambiar el estado (aprobar el pago libera todo automáticamente) y dejar notas. Los packs pagos muestran el plazo de entrega, y hay un botón de WhatsApp con el mensaje listo para el paso siguiente: recordar el pago, pedir los datos o pedir un testimonio. |
| **Sesiones** | Agendar las sesiones 1 a 1: fecha, link de Meet y estado (a agendar, agendada, hecha, cancelada). Si la persona falta sin avisar con 24 hs, la sesión cuenta como hecha. |
| **Packs y precios** | Crear y editar productos: nombre, precio, características, notas, destacado ("Recomendado", o "Mejor precio" en los kits), activo/inactivo, extras, e-books incluidos o a elección. |
| **E-books** | Alta de e-books y subida del archivo (PDF). |
| **Cursos** | Crear cursos y lecciones: video de YouTube o Vimeo no listado, archivo adjunto, vista previa gratuita y publicado/borrador. |
| **Sakura (preguntas)** | Preguntas frecuentes que responde Sakura y que se muestran en la web. Admiten `{{precio:id}}` y `{{extra:id}}` para que el precio se actualice solo. |
| **Testimonios** | Testimonios de clientes con su @ de Instagram (se muestra con link). |
| **Datos de pago** | Alias, CBU, titular y banco de la transferencia, y la casilla para ofrecer el pago con tarjeta (Ualá). |

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
| **Vercel** | Hosting, despliegue automático y **Web Analytics** (visitas, plan gratuito, sin cookies); proyecto "armadodecv" | — |
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
  pixel.ts                Píxel de Meta (ID del conjunto de datos; vacío = desactivado)
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
| `payment_settings` | Datos de transferencia (una sola fila), `card_enabled` (muestra el pago con tarjeta) y `card_fee` (recargo de Ualá). |
| `card_payments` | Cada link de pago de Ualá creado para un pedido, con monto y estado. Solo lo escribe la función `uala`; el admin lo puede leer. |
| `faqs` | Preguntas de Sakura y de la web. |
| `testimonials` | Testimonios con @ de Instagram. |
| `push_subscriptions` | Celulares de la admin con avisos activados (endpoint y claves de cifrado). Solo la admin puede suscribirse. |
| `push_log` | Qué avisos ya se mandaron (uno por pedido y tipo). |
| `site_events` | Pasos del embudo por día (`lo_quiero`, `checkout`), una vez por sesión del navegador. Sin datos personales; solo la lee el admin. Cuenta desde el 28/09/2026. |
| `site_visits` | Visitas anónimas por día y página (`visits` = llegadas a la web, `views` = páginas vistas). Sin datos personales; solo la lee el admin. Cuenta desde el 28/09/2026. |
| `admin_upload_tokens` | Tokens de un solo uso (2 hs) para subir archivos desde herramientas de administración. |

**Funciones (RPC)**, todas `SECURITY DEFINER`:

| Función | Quién | Qué hace |
|---|---|---|
| `create_order(items, accept_terms, name, phone, note)` | Cliente | Valida productos, e-book elegido y extras; calcula el total en el servidor; exige aceptar términos; guarda nombre y teléfono en el perfil. |
| `submit_receipt(order, path)` | Cliente | Asocia el comprobante (en su propia carpeta), guarda la huella del archivo y pasa el pedido a "Revisando pago". |
| `instant_eligible(order)` / `finish_receipt_check(...)` | Solo `verify-receipt` | Reglas de entrega inmediata (solo digital, archivo válido y no repetido, sin rechazos, máx. 2 sin verificar) y registro de la lectura. Si se aprueba y el número de operación no se repite, habilita todo y marca Entregado con `payment_check = 'pending'`. |
| `admin_review_instant_payment(order, received, note)` | Admin | Transferencia verificada (`ok`) o no llegó (`rejected`): quita los accesos que dio ese pedido y lo cancela. |
| `grant_order_access(order)` | Interna | Otorga e-books y cursos y crea sesiones; la usan las dos funciones anteriores. No se puede llamar desde la web. |
| `admin_set_order_status(order, status, note)` | Admin | Cambia el estado. La primera vez que se aprueba el pago otorga e-books y cursos, crea las sesiones y marca como entregados los pedidos solo digitales. |
| `admin_update_session(...)` | Admin | Fecha, link de Meet, estado y nota de una sesión. |
| `mark_card_payment(uala_order, status)` | Solo la función `uala` | Guarda el estado que la función leyó de Ualá. Si es `APPROVED` o `PROCESSED` y el pedido no estaba pago, lo aprueba como una transferencia (`payment_method = 'card'`, guarda `card_total`). Nadie más la puede llamar. |
| `admin_record_sale(name, phone, items, paid_on, total, delivered, note)` | Admin | Carga una venta cerrada por WhatsApp como pedido pagado o entregado, sin cuenta de cliente (`source = 'whatsapp'`). `items`: productos con sus adicionales; los precios salen del catálogo y `total` (opcional) es lo cobrado si hubo descuento. |
| `push_config()` | Solo funciones (service role) | Devuelve las claves VAPID guardadas en Vault. |
| `track_event(event)` | Todos | Suma un paso del embudo. Solo acepta `lo_quiero` y `checkout` e ignora al admin. |
| `track_visit(path, new_visit)` | Todos | Suma una visita anónima del día. Ignora al admin y las páginas privadas; las rutas desconocidas se agrupan en `/otras`. |
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
- **Una sola administradora.** Las cuentas nuevas siempre son cliente, y un cliente no puede cambiar su rol ni el email de su perfil.
- **Anti-spam:** máximo 5 pedidos sin pagar por persona en 24 horas.
- **Contraseñas:** mínimo 8 caracteres para cuentas nuevas y cambios de contraseña.
- **Encabezados HTTP:** HSTS (Vercel), `X-Frame-Options: DENY` y `frame-ancestors 'none'` (no se puede embeber la web), `nosniff`, `Referrer-Policy` y `Permissions-Policy`. Sin `X-Powered-By`.
- Recomendado: doble verificación (2FA) en GitHub, Vercel, Supabase, GoDaddy, Google, Meta y Canva.

### 3.5 Funciones del servidor (Edge Functions)

Código en `supabase/functions/`. Se despliegan en Supabase.

| Función | Autenticación | Qué hace |
|---|---|---|
| `ebook-download` | Sesión del cliente (JWT) | Verifica que el usuario tenga acceso al e-book y descarga el PDF del bucket privado. Agrega en cada página, arriba del pie, la línea *"E-book adquirido por {email} - Pedido #N"* y guarda email y pedido en los metadatos del PDF. |
| `notify-admin` | Sesión (JWT) | Manda la notificación push al celu de la admin: pedido nuevo o comprobante (solo del propio cliente, pedido reciente, una vez por tipo) o `{ test: true }` desde la admin. Usa `web-push` y las claves de Vault. |
| `verify-receipt` | Sesión del cliente (JWT) | Para pedidos solo digitales: lee el comprobante con Claude (`ANTHROPIC_API_KEY`) y valida destinatario, monto, fecha, señales de edición y número de operación. Llama a `finish_receipt_check`, que habilita todo si pasa. |
| `admin-upload` | Token de `admin_upload_tokens` (encabezado `x-upload-token`) | `?ebook=<id>&name=` sube el PDF de un e-book y lo vincula (borra el anterior). `?social=<ruta>` sube PNG, JPG, PDF o MP4 al bucket público `social` y devuelve la URL. |
| `uala` | Sesión del cliente (se valida adentro), `?webhook=1` sin sesión, o `check` para el admin | Pago con tarjeta por Ualá Bis (API v2). Los clientes solo pueden pagar con tarjeta en producción y con la casilla activada; en modo prueba solo el admin (así nadie usa la tarjeta de prueba pública). `check` (botón "Probar conexión con Ualá") pide un token y dice qué secretos están cargados, sin mostrarlos. `create` arma el link de pago con el total más el costo de Ualá (`card_fee`, 4,9% + IVA = 5,929%, redondeado hacia arriba a $10; el monto se manda a Ualá **en pesos**, aunque su documentación diga centavos) y lo reutiliza 30 minutos. `sync` (al volver del pago) y el webhook **vuelven a consultar la orden en Ualá con nuestro token** antes de llamar a `mark_card_payment`: el aviso de Ualá no está firmado, así que nunca se le cree directamente. Si el monto o la referencia no coinciden, queda como `REVISAR_…` para el admin. Secretos: `UALA_USERNAME`, `UALA_CLIENT_ID`, `UALA_CLIENT_SECRET`, `UALA_ENV` (`stage` o `production`; sin valor usa stage). |

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

- El código está integrado (`components/meta-pixel.tsx`, `lib/pixel.ts`) y registra PageView, ViewContent (al abrir un producto), InitiateCheckout, CompleteRegistration (al crear la cuenta), Lead (al crear el pedido) y Purchase (al subir el comprobante).
- **Activo desde el 27/09/2026** con el conjunto de datos "Armado de CV - Web" (ID 1983692595634961) del portfolio "Armado de Cv". No envía datos personales, solo la acción, el producto y el monto.
- Para activarlo hace falta crear el píxel en el portfolio comercial "Armado de Cv" (Meta Business) y pegar el ID.

---

## 4. Operación del día a día

| Tarea | Dónde |
|---|---|
| Cambiar un precio o un texto de pack | Panel → Packs y precios (impacta en la web en ≤ 1 minuto) |
| Aprobar un pago | Panel → Pedidos → abrir el comprobante → "Aprobar pago" |
| Ver visitas | Vercel → proyecto armadodecv → Analytics |
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
| #12 | E-books y guías al instante al subir el comprobante (con verificación posterior en el panel) y contador de visitas de Vercel |
| #13 | Lectura del comprobante con IA, consentimiento informado dentro de los términos, encabezados de seguridad y corrección del alta automática de administradores (solo con Google) |
| #14 | Aprobación manual de todos los pagos (entrega al instante apagada), única admin, contraseñas de 8 caracteres, email del perfil protegido y límite anti-spam de pedidos sin pagar |
| #15 | Compra desde Instagram: sin botón de Google dentro del navegador de Instagram/Facebook/TikTok (Google lo bloquea) y con aviso para usar el email, la compra arranca en "Crear cuenta", opción de pedir el pack por WhatsApp sin cuenta, /admin sin mostrar emails, y controles de seguridad en `docs/SEGURIDAD.md` |
| #16 | Píxel de Meta activado (con evento de registro) y política de privacidad actualizada para informarlo |
| #17 | E-book nuevo "Cuánto pedir de sueldo" ($16.000, sección Guías). Todos los e-books y guías de regalo pasan al diseño 2026 (crema, Poppins, flores y "El consejo de Vale"); el diseño anterior queda en `assets/ebook-v1.css` de la carpeta de e-books |
| #18 | Página /gratis con el checklist "Revisá tu CV en 10 minutos" (descarga sin registro, evento Lead del píxel) para la palabra clave CHECKLIST de Instagram |
| #19 | Precios escalonados de las guías (Portales y Búsqueda $12.000; ATS y LinkedIn $16.000; Sueldo y Trabajo remoto $19.000; Kit $45.000), e-book nuevo "Trabajo remoto desde Latinoamérica", pago con tarjeta por Ualá Bis como segunda opción con el costo a cargo del cliente (apagado hasta cargar las credenciales), y la transferencia destacada como opción recomendada y sin recargo en toda la web |
| 28/09 | Resumen de la guía al tocar "Lo quiero" (tapa, contenido, páginas y forma de entrega); botón de WhatsApp del panel que abre WhatsApp Business; numeración de pedidos: los reales van #1, #2, #3… y los de prueba (hechos desde la cuenta admin) desde #90100; los pedidos de prueba anteriores quedaron cancelados como #90005, #90011 y #90013 |
| 28/09 | Mejoras de confianza en la home: presentación corta de Vale con foto debajo del inicio, botón "Ver packs · desde $X" (toma el pack más barato), banner al checklist gratis (/gratis), guías en carrusel deslizable en el celular, el cartel "Más elegido" pasa a "Recomendado" (o "Mejor precio" en los kits de guías) y "Cómo comprar" aclara cómo se recibe una guía. SEO: `robots.txt`, `sitemap.xml` y título, dirección canónica y vista previa para compartir propios en cada página pública (`lib/seo.ts`). Panel: si el pedido no tiene comprobante en la web (lo mandó por WhatsApp), el botón dice "Me llegó el pago (comprobante por WhatsApp)", pide confirmar que la plata está en el banco y deja al cliente el mensaje "¡Gracias! Recibí tu pago por WhatsApp." si no escribiste otro |
| 28/09 | El Kit Búsqueda Laboral pasa a ser la primera tarjeta de Guías (orden 29); en tablet y compu las guías se acomodan con la última fila centrada; /gratis presenta primero el Kit |
| 28/09 | Panel con pestaña **Inicio** (saludo, pedidos a gestionar con plazo restante, métricas del mes, más vendidos, visitas y reporte Excel anual con la marca); la admin entra directo al panel; contador de visitas anónimo propio (`site_visits`) y política de privacidad actualizada |
| 28/09 | Frases motivacionales personales en el saludo del panel; embudo "Del clic a la venta" (`site_events`); plazo de entrega y mensajes de WhatsApp listos en cada pedido; "Ajustes incluidos" junto a los precios de los packs |
| 29/09 | App del panel para el celu ("Armado de CV - Admin"), notificaciones push de pedidos y comprobantes (`notify-admin`, Vault), y carga de ventas por WhatsApp pegando o compartiendo la nota (`admin_record_sale`, `orders.source`, pedidos sin cuenta de cliente) |
| 29/09 | Panel como app: encabezado propio con la foto de Google, menú inferior en el celu (Inicio, Pedidos, Venta por WhatsApp, Sesiones, Más), el botón Atrás del celu navega entre secciones y cierra ventanas sin volver al login de Google, sin el encabezado ni el pie de la web; nombre de la app "Armado de CV - Admin"; ícono monocromo para la barra de notificaciones (`public/icons/badge-96.png`); buscador y filtros deslizables en Pedidos; foto de Google también en el botón de cuenta de la web |
| 29/09 | Adicional nuevo "Sección Servicios de LinkedIn" ($20.000, en Pack Premium y Perfil de LinkedIn; se puede sumar a otros packs desde Packs y precios). Venta por WhatsApp con varios productos y adicionales en un mismo pedido ("Nombre / Pack premium + pack medium + servicio de linkedin"), total calculado con los precios del catálogo y editable si hubo descuento (`admin_record_sale` con `p_items`) |
