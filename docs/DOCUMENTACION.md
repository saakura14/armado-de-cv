# Armado de CV — Documentación funcional y técnica

Estado al **5 de octubre de 2026**. Sitio en producción: **https://www.armadodecv.com**

Dueña del proyecto: Valeria Yanina Gil · Instagram @armadodecv.ok · WhatsApp 11 5106-0953 · ayuda.armadodecv@gmail.com

---

## Índice

0. [Resumen: lo que logramos](#0-resumen-lo-que-logramos)
1. [Qué es el sitio](#1-qué-es-el-sitio)
2. [Documentación funcional](#2-documentación-funcional)
   - 2.1 Páginas
   - 2.2 Catálogo y precios
   - 2.3 Cómo compra un cliente (web, link de pedido y WhatsApp)
   - 2.4 Estados y etapas de un pedido
   - 2.5 Mi cuenta (cliente)
   - 2.6 Panel de administración
   - 2.7 Equipo: quien arma los CV en Canva
   - 2.8 Chat entre Vale y el equipo
   - 2.9 Notificaciones y resumen diario
   - 2.10 Modo oscuro
   - 2.11 Sakura (asistente de preguntas frecuentes)
   - 2.12 Reglas comerciales y legales
3. [Documentación técnica](#3-documentación-técnica)
   - 3.1 Arquitectura y servicios
   - 3.2 Estructura del código
   - 3.3 Base de datos (Supabase)
   - 3.4 Seguridad
   - 3.5 Funciones del servidor (Edge Functions)
   - 3.6 Almacenamiento de archivos
   - 3.7 Inicio de sesión
   - 3.8 Apps instalables y notificaciones push
   - 3.9 Dominio, despliegue y entornos
   - 3.10 Medición (visitas, embudo y píxel de Meta)
4. [Operación del día a día](#4-operación-del-día-a-día)
5. [Marketing e integraciones externas](#5-marketing-e-integraciones-externas)
6. [Qué vive fuera de este repositorio](#6-qué-vive-fuera-de-este-repositorio)
7. [Diagnóstico de ventas por la web y mejoras](#7-diagnóstico-de-ventas-por-la-web-y-mejoras)
8. [Pendientes y próximos pasos](#8-pendientes-y-próximos-pasos)
9. [Historial de cambios](#9-historial-de-cambios)

---

## 0. Resumen: lo que logramos

En menos de dos semanas (24/09 → 05/10/2026), Armado de CV pasó de una página estática a un sistema completo de venta y producción:

| Área | Qué quedó funcionando |
|---|---|
| **Tienda web** | Catálogo editable (packs de CV, LinkedIn, asesorías, test vocacional, 7 guías), ventana "Lo quiero" con extras y total en vivo, compra con cuenta (Google o email), pago por transferencia con subida de comprobante, "Pedilo por WhatsApp" en cada producto, checklist gratis en `/gratis`, SEO, legales y botón de arrepentimiento. |
| **Entrega digital** | E-books y guías con el email del comprador estampado en cada página, descarga desde Mi cuenta apenas se aprueba el pago. |
| **Panel de administración** | App instalable en el celu con avisos push: pedidos por etapas (Hoy, Nuevos, Por cobrar, Para arrancar, En proceso, Esperando al cliente, Entregados, Archivo), plazos de entrega en días hábiles, mensajes de WhatsApp listos, ventas por WhatsApp pegando la nota, links de pedido con precio especial, sesiones 1 a 1, métricas, embudo, origen de las ventas y reporte Excel. |
| **Equipo** | App propia para la tablet de quien arma los CV en Canva: recibe cada pack con los textos listos para copiar por sección o por selección, modo trabajo a pantalla completa, "Terminé este CV" que abre el siguiente, video tutorial, marcas y racha personales, lo que cobró y lo que falta. Vale controla lo que le debe, los pagos cada 10 packs y los tiempos por CV. |
| **Comunicación** | Chat interno Vale ↔ equipo (burbuja con ventanita, mensajes sobre un CV puntual, no leídos y avisos push), aviso push por cada pack asignado y resumen diario a las 9. |
| **Experiencia** | Web, panel y equipo fluidos en celu, tablet y compu, con modo oscuro automático o elegido. |
| **Marketing** | Píxel de Meta con consentimiento, contador de visitas y embudo propios, contenido de Instagram programado con Metricool (historias y carruseles "Cómo y dónde"), anuncios solo en Instagram con tope de US$ 23 por día. |
| **Seguridad** | RLS en las 30 tablas, una sola administradora, precios calculados en el servidor, repositorio público sin secretos, chequeo semanal automático (`docs/SEGURIDAD.md`). |

---

## 1. Qué es el sitio

Tienda online de **Armado de CV**, el emprendimiento de Valeria Gil (RRHH – Relaciones Laborales). Vende:

- **Packs de CV** (CV moderno + CV optimizado para filtros ATS, carta de presentación, LinkedIn), con extras (express, idiomas, carga en portales, sección Servicios de LinkedIn).
- **Asesorías** para entrevistas y psicotécnicos: e-books y sesiones 1 a 1 por Google Meet.
- **Test de orientación vocacional**.
- **Guías digitales** para la búsqueda laboral (e-books en PDF con la marca).
- **Cursos pregrabados** (la estructura está lista; todavía no hay cursos cargados).

Hay tres formas de comprar: en la web (cuenta + transferencia + comprobante), con un **link de pedido** que arma Vale, o directamente por **WhatsApp** (Vale carga la venta en el panel). Los CV los arma en Canva el **equipo** a partir de los textos que prepara Vale.

---

## 2. Documentación funcional

### 2.1 Páginas

| Ruta | Qué muestra |
|---|---|
| `/` | Inicio: "Hola, soy Valeria", botón "Ver packs · desde $X" (toma el pack más barato), presentación corta, promesas, **packs de CV y LinkedIn**, bloque "¿Lo necesitás urgente?", banner al checklist gratis, **guías** en carrusel, "Sobre mí", testimonios, cómo comprar, preguntas frecuentes (con Sakura) y comunidad. |
| `/asesorias` | Asesorías para entrevistas y psicotécnicos (e-books, Pack Plus, Pack Premium con Meet, Asesoría para entrevistas) y test vocacional. |
| `/cursos` | Cursos pregrabados publicados (hoy vacío). |
| `/gratis` | Checklist "Revisá tu CV en 10 minutos": descarga sin registro (evento Lead del píxel), para la palabra clave CHECKLIST de Instagram. |
| `/test-ats` | **Test ATS gratis**: la persona sube su CV en PDF y el navegador lo analiza (no se sube ni se guarda): si un ATS puede leerlo, columnas o tablas, contacto, secciones, perfil, largo, fechas, logros, datos personales de más, íconos, título "Curriculum Vitae", viñetas con verbos, frases genéricas y, si pega un aviso, las palabras clave que le faltan. Mide lo mismo que un ATS real: arma la **ficha del candidato** (nombre, contacto, trabajos con fechas, estudios, habilidades y años de experiencia, "Así te lee un ATS"), la **compara con el puesto** (las palabras del aviso pegado o de un área elegida, `lib/ats-roles.ts`; elegir área es obligatorio) y revisa el **formato**. Puntaje: 35% formato, 30% ficha, 35% coincidencia. Las secciones cuentan solo como títulos reales y un problema grave pone un techo (columnas: 60; sin título de Experiencia: 70; sin contacto o sin experiencia visible: 45; sin ningún trabajo con fechas: 50; menos años de los que pide el aviso: 55; casi sin palabras del puesto: 60; 6 problemas o más: 40). El área queda guardada en `ats_checks.area`. Calibrado con CVs reales: los ATS hechos por Vale dan 84–96, los modernos con columnas 60; el detalle se desbloquea con nombre y WhatsApp (1 por número, `ats_check_submit`) y termina ofreciendo los packs. Los interesados aparecen en **Panel → Test ATS** con el mensaje de WhatsApp listo. |
| `/comprar` | Resumen del pedido, datos de contacto, aceptación de términos y confirmación. Muestra los datos de transferencia **solo después** de confirmar. Opción "Pedilo por WhatsApp". |
| `/pedido/<token>` | Link de pedido armado por Vale: detalle, total (o precio especial) y compra normal. |
| `/cuenta` | Mi cuenta (ver 2.5). `/cuenta/pedido/<id>`, `/cuenta/curso/<id>`, `/cuenta/nueva-clave`. |
| `/terminos` · `/privacidad` · `/arrepentimiento` | Legales y botón de arrepentimiento (Ley 24.240). |
| `/admin` | Panel de administración (solo la cuenta admin). App "Armado de CV - Admin". |
| `/equipo` | Panel del equipo (solo integrantes cargados en Equipo). App "Armado de CV - Equipo". |

En todo el sitio público: encabezado con pestañas "Armado de CV" / "Asesorías", botón de modo claro/oscuro y Mi cuenta; barra inferior en el celu (Precios, Cómo comprar, Mi cuenta, WhatsApp); Sakura; pie con legales; aviso de cookies.

### 2.2 Catálogo y precios

Todo el catálogo se edita desde **Panel → Packs y precios**. Precios vigentes al 05/10/2026 (ARS):

| Categoría | Producto | Precio | Entrega |
|---|---|---|---|
| CV | Pack Simple (2 CV: moderno + ATS) | $35.000 | Servicio |
| CV | Pack Medium (2 CV + carta) | $37.000 | Servicio |
| CV | **Pack Premium** (2 CV + carta + LinkedIn) — *Recomendado* | $65.000 | Servicio |
| CV | Perfil de LinkedIn (sin CV) | $40.000 | Servicio |
| CV | Asesoría de LinkedIn (sesión 1 a 1 de 60 min por Meet) | $30.000 | Sesión |
| Asesorías | E-book individual (a elección entre 3) | $18.000 | Digital |
| Asesorías | Pack Plus (2 e-books) | $35.000 | Digital |
| Asesorías | Asesoría para entrevistas (sesión 1 a 1 de 90 min) | $50.000 | Sesión |
| Asesorías | Pack Premium (Pack Plus + sesión 1 a 1 de 90 min) | $60.000 | Sesión |
| Vocacional | Test de orientación vocacional (CHASIDE + TV-A) | $30.000 | Servicio |
| Guías | Portales de empleo · Búsqueda organizada | $12.000 c/u | Digital |
| Guías | LinkedIn para conseguir trabajo · CV a prueba de filtros ATS | $16.000 c/u | Digital |
| Guías | Cuánto pedir de sueldo · Trabajo remoto desde Latinoamérica | $19.000 c/u | Digital |
| Guías | **Kit Búsqueda Laboral** (Portales + LinkedIn + ATS + Búsqueda) — *Mejor precio* | $45.000 | Digital |

**Extras:** Entrega express 24 hs hábiles ($15.000) · Versión en otro idioma ($15.000 por idioma) · Carga en plataformas de empleo ($15.000 por plataforma) · Sección Servicios de LinkedIn ($20.000, en Premium y Perfil de LinkedIn) · Devolución 1 a 1 del test vocacional ($30.000).

Tipos de entrega (`delivery`):
- **service**: trabajo de Vale y el equipo. Después del pago se coordina por WhatsApp.
- **digital**: e-books y guías. Se descargan apenas se aprueba el pago y el pedido pasa solo a "Entregado".
- **session**: incluye una sesión 1 a 1 por Meet que se agenda (si viene con un pack de CV, queda "Después del CV").
- **course**: curso pregrabado, disponible 12 meses.

> **Entrega al instante (apagada).** La función `verify-receipt` puede leer el comprobante con IA y entregar e-books sin esperar. Está apagada a pedido de Vale (no está cargada `ANTHROPIC_API_KEY`). Todo pago se aprueba a mano.

> **Pago con tarjeta (apagado en la web).** La integración con Ualá Bis está hecha (función `uala`), pero la casilla está apagada: casi todas las ventas son por transferencia y, si alguien pide tarjeta, Vale manda un link de pago de Ualá a mano.

### 2.3 Cómo compra un cliente

**En la web**
1. Toca **"Lo quiero"**: elige e-book si corresponde, suma extras (idiomas y plataformas como chips, con "Otro") y ve el total animado. También puede tocar **"Pedilo por WhatsApp"** y escribe con el producto y precio ya cargados.
2. En `/comprar` completa nombre y WhatsApp, deja una nota y **acepta los términos**.
3. Si no tiene cuenta, la crea ahí con Google o con email. Dentro del navegador de Instagram/Facebook/TikTok no se muestra Google (Google lo bloquea) y arranca en "Crear cuenta".
4. El servidor **recalcula todos los precios** y crea el pedido. Se guarda el **origen** (`anuncio` si llegó desde un anuncio, `web` si no).
5. Ve la **transferencia** (alias, CBU y titular con botones de copiar), transfiere y **sube el comprobante**.
6. Vale revisa y **aprueba el pago**: se habilitan e-books y cursos, se crean las sesiones y, si es solo digital, pasa a Entregado.

**Con link de pedido:** Vale arma el pedido en el panel (productos, adicionales, cliente, precio especial opcional) y manda `armadodecv.com/pedido/<token>`. El cliente sigue el mismo camino desde el paso 2. Vence a los 30 días.

**Por WhatsApp:** Vale pega la nota en "Venta por WhatsApp" (o la comparte desde WhatsApp en Android) y queda un pedido pagado con `source = 'whatsapp'`, sin cuenta de cliente.

### 2.4 Estados y etapas de un pedido

| Estado | Qué ve el cliente |
|---|---|
| Esperando pago | "Transferí el total y subí el comprobante." |
| Revisando pago | "Recibí tu comprobante. Lo confirmo a la brevedad." |
| Pago confirmado | "Tu pago está confirmado. Coordinamos por WhatsApp." |
| En proceso | "Estoy trabajando en tu pedido." (también se pasa solo al **asignar el CV al equipo**) |
| Entregado | "¡Listo! Tu pedido está entregado." |
| Cancelado | Solo lo cancela la administración. |

Además, "**Esperando al cliente**" pausa el plazo de entrega y al retomar suma los días hábiles esperados.

En el panel, los pedidos se ordenan por **etapas** (`lib/order-stages.ts`): **Hoy** (lo que necesita atención: nuevos, pagos a revisar, recordatorios, entregas que vencen, CV del equipo listo), **Nuevos**, **Por cobrar**, **Para arrancar**, **En proceso**, **Esperando al cliente**, **Entregados** (últimos 7 días) y **Archivo**. Cada pedido muestra el motivo ("Atrasado 2 días", "Vence hoy", "CV del equipo listo", "Revisar comprobante", "Recordar el pago"…).

Plazo: 4 días hábiles desde el pago (Express 1). Después de las 17 hs o en fin de semana arranca el día hábil siguiente. No descuenta feriados.

### 2.5 Mi cuenta (cliente)

- Ingreso con **Google** o con **email y contraseña** (mostrar/ocultar, recuperar y cambiar contraseña).
- **Mis pedidos**: estado, detalle, subida del comprobante y datos de transferencia.
- **Mis e-books**: descarga en PDF con una línea al pie con su email y número de pedido.
- **Mis cursos** (12 meses) · **Mis sesiones** (fecha y link de Meet) · **Mis datos** (nombre, WhatsApp y permiso para novedades por mail).

### 2.6 Panel de administración (`/admin`)

**La única administradora es valeeria.gil@gmail.com.** Toda cuenta nueva es cliente.

- **App en el celu** ("Armado de CV - Admin", `public/admin.webmanifest`): encabezado propio, menú inferior (Inicio, Pedidos, Venta, Sesiones, Más), botón Atrás que navega dentro del panel, número de pendientes en el ícono, aviso de versión nueva.
- **Ocultar montos**: tapa facturación y montos (para mostrar el panel sin exponer números).
- **Burbuja de chat con el equipo** en todas las secciones, al lado del botón de WhatsApp Business.

| Pestaña | Para qué sirve |
|---|---|
| **Inicio** | Saludo, contadores en vivo (A gestionar, En proceso, Entregados del mes), lo más urgente, **Cómo viene el mes** (ventas, facturado, ticket, visitas, conversión, facturación semana a semana y de 6 meses, lo más vendido), **de dónde vienen las ventas** (web, anuncio, WhatsApp, link), embudo **Del clic a la venta** (entraron → Lo quiero → llegaron a comprar → confirmaron → pagaron, más los que pasaron de la web a WhatsApp y las ventas por WhatsApp), reporte Excel anual con la marca y tarjeta para instalar la app y activar los avisos. |
| **Pedidos** | Pedidos por etapas con buscador. Ficha simple con una acción principal, botón de WhatsApp con el mensaje del paso (y "Copiar mensaje y número" para WhatsApp Business), comprobante, link privado de Canva, notas, "Editar venta" en las de WhatsApp, "Link de pedido" y **bloque Equipo**: un renglón por pack con su botón **Asignar** (manda los textos del CV al equipo). |
| **Sesiones** | Agendar las sesiones 1 a 1: fecha, link de Meet y estado. |
| **Equipo** | Ver 2.7. |
| **Packs y precios** | Productos, precios, características, destacados, activo/inactivo, extras y e-books. |
| **E-books** · **Cursos** · **Sakura** · **Testimonios** · **Datos de pago** | Alta y edición de cada cosa sin tocar código. |

**Venta por WhatsApp.** Se pega la nota ("Nombre / Pack premium + express", una o varias por renglón) y `lib/whatsapp-sale.ts` reconoce cliente, fecha, productos y adicionales. El total sale del catálogo y se puede editar. Las sesiones vendidas así crean la sesión a coordinar.

### 2.7 Equipo: quien arma los CV en Canva

Desde el 03/10/2026, los CV en Canva los arma un integrante del equipo a partir de los textos de Vale. **El equipo nunca ve precios ni datos de contacto de los clientes**: solo nombre, pack y textos.

**Flujo:**
1. Vale arma los textos del cliente con su Master Prompt.
2. En Pedidos → ficha → bloque Equipo toca **Asignar**: elige al integrante y pega el CV moderno, el CV ATS y la carta (si el pack la incluye), con notas y fecha.
3. El pedido pago pasa solo a **En proceso** (trigger de la base) y al integrante le llega un **aviso push** "Nuevo CV asignado".
4. El integrante abre el CV en su app, lo arma en Canva copiando los textos y toca **Terminé este CV** (con el link de Canva). A Vale le llega el aviso y el pedido aparece como "CV del equipo listo".
5. Vale revisa, entrega al cliente y paga cada 10 packs (puede adelantar).

**Pantalla del equipo (`/equipo`, app "Armado de CV - Equipo")** — `components/team-view.tsx`:
- Resumen compacto: CVs pendientes, terminados, lo que tiene a cobrar y el próximo cobro.
- Lista en renglones agrupada en **"Para hoy o atrasados"** y **"Próximos"**, con Empezar/Seguir y cuánto copió.
- **Modo trabajo**: un CV a pantalla completa para usar al lado de Canva. Los textos se separan por **sección** (título y contenido en la misma burbuja; la carta va en un solo bloque). Dos modos: **"Tocar copia el renglón"** y **"Seleccionar texto"** + "Copiar lo seleccionado". Lo copiado queda tildado y el texto no desaparece. Copiar marca el CV como "Haciéndolo".
- **Terminé este CV**: confirmación en la misma pantalla, limpia el link de Canva y abre solo el siguiente.
- **Tus marcas 🏆**: racha de días con CVs terminados (los fines de semana no la cortan), tiempo de hoy y mejor tiempo por pack; al terminar avisa si fue una **nueva marca**.
- Mes a mes, cobros recibidos, **video tutorial** (`public/tutorial-equipo.mp4`) y chat con Vale.

**Pestaña Equipo del panel (solo Vale)** — `components/admin/team-admin.tsx`:
- Lo que se le debe ("Le debés") y **registrar pago o adelanto**: el pago cubre los packs impagos más viejos (`admin_team_pay`).
- **Tiempos**: por pack, cantidad, promedio y mejor tiempo; total de hoy; "⏱ N min" en cada renglón. Los CV de menos de 8 minutos no cuentan (se marcaron sin haberlos hecho en el panel).
- Mes a mes, historial de pagos, CVs asignados con "Marcar como terminado" y "Sacar la asignación".
- Configuración del integrante (nombre, Gmail con el que entra, tarifa por pack, cada cuántos packs se paga), alta de integrantes y **"Ver como él"** en tamaño celu, tablet o compu.
- Botón para instalar la app del equipo (Android e iPhone/iPad).

### 2.8 Chat entre Vale y el equipo

- Burbuja en la esquina con ventanita (pantalla completa en el celu). La de Vale está en todo el panel; la del equipo en su pantalla (`#chat` la abre).
- Mensajes sueltos o **sobre un CV puntual** (desde el CV se abre el chat con la referencia).
- Contador de no leídos en la burbuja y en la app, actualización en vivo (Realtime) y **aviso push** al otro lado de la conversación.
- Reemplaza a WhatsApp para las consultas de trabajo.

### 2.9 Notificaciones y resumen diario

| Aviso | A quién | Cuándo |
|---|---|---|
| Pedido nuevo · Comprobante subido | Vale | Al confirmar un pedido o subir el comprobante (una vez por pedido y tipo) |
| Nuevo CV asignado | Integrante | Cada pack asignado (vibra y queda fijo hasta tocarlo) |
| CV terminado | Vale | Cuando el equipo toca "Terminé este CV" |
| Mensaje nuevo | Vale o integrante | Cada mensaje del chat |
| **Resumen del día** | Vale y cada integrante | Lunes a sábado 9 hs: a Vale lo que necesita atención; al equipo sus CVs pendientes. Si no hay nada, no se manda. |

Para recibirlos, cada dispositivo tiene que **activar las notificaciones** desde su panel (botón "Activar avisos").

### 2.10 Modo oscuro

Web, panel y equipo tienen modo claro y oscuro: automático según el dispositivo o elegido con el botón del encabezado (se recuerda en el dispositivo). El logo cambia a su versión blanca en oscuro.

### 2.11 Sakura (asistente de preguntas frecuentes)

Versión anime de Vale (`public/brand/sakura.jpg`), en burbuja flotante y en la sección de preguntas. **No usa IA**: busca entre las preguntas cargadas en el panel por palabras clave (`lib/faq.ts`); si no encuentra, ofrece WhatsApp. Los precios en las respuestas salen del catálogo en vivo (`{{precio:id}}`, `{{extra:id}}`).

### 2.12 Reglas comerciales y legales

- **Pago:** transferencia bancaria (tarjeta solo con link de Ualá a mano). El trabajo empieza con el total abonado.
- **Sin cancelaciones ni devoluciones** una vez hecho el pedido; el **botón de arrepentimiento** queda por ley.
- **Packs de CV:** 1 pack por persona y rubro; 3 a 4 días hábiles desde que se tiene toda la información; después de las 17 hs empieza al día siguiente; boceto con 24 hs para cambios sin costo, después $5.000 por cambio. Express en 24 hs hábiles; horario puntual a cotizar.
- **Sesiones 1 a 1:** si la persona falta sin avisar con 24 hs, cuenta como hecha.
- **Cursos:** 12 meses desde la aprobación del pago. **Test vocacional:** orientación, no diagnóstico.

---

## 3. Documentación técnica

### 3.1 Arquitectura y servicios

```
Navegador / apps instaladas (web, Admin, Equipo)
   │
   ├──► Vercel (Next.js 16, www.armadodecv.com)  ── /api/version (aviso de versión nueva)
   │
   └──► Supabase (proyecto wdcijkjmdfypltbafdol)
          ├─ Auth (email + contraseña, Google)
          ├─ Postgres (30 tablas con RLS, funciones RPC, triggers, Realtime, pg_cron)
          ├─ Storage (comprobantes, e-books, cursos, avatares, redes)
          ├─ Vault (claves VAPID, clave del cron)
          └─ Edge Functions (e-books con sello, avisos push, resumen diario, subidas, Ualá, comprobantes)
```

| Servicio | Uso |
|---|---|
| **GitHub** | Código: `saakura14/armado-de-cv` (repositorio **público**) |
| **Vercel** | Hosting, despliegue automático desde `main`, Web Analytics |
| **Supabase** | Base de datos, login, archivos, funciones y tareas programadas |
| **GoDaddy** | Dominio armadodecv.com y DNS |
| **Google Cloud** | Login con Google (proyecto "Armado de CV", marca verificada) y Search Console |
| **Meta** | Píxel "Armado de CV - Web" y anuncios en Instagram |
| **Metricool** | Programación de publicaciones e historias de Instagram |
| **Canva** | Diseño de los CV y del contenido |

**Stack:** Next.js 16.3 (App Router) · React 19 · TypeScript 5.7 · Tailwind CSS 4 (con container queries) · `@supabase/supabase-js` 2.57 · lucide-react · exceljs · Vercel Analytics. Tipografías: Montserrat, Nunito Sans y Cookie.

### 3.2 Estructura del código

```
app/
  page.tsx                Inicio (server component, revalidate 60 s)
  asesorias/ cursos/ gratis/
  comprar/ pedido/[token]/
  cuenta/                 Mi cuenta · pedido/[id] · curso/[id] · nueva-clave
  admin/                  Panel de administración
  equipo/                 Panel del equipo
  api/version/            Versión desplegada (aviso de actualización)
  terminos/ privacidad/ arrepentimiento/
  layout.tsx globals.css manifest.ts robots.ts sitemap.ts
components/
  auth-panel.tsx          Login / registro / recuperar contraseña
  order-dialog.tsx        Ventana "Lo quiero": e-book, extras, total
  product-grid.tsx        Tarjetas de productos (Lo quiero / Pedilo por WhatsApp)
  visit-tracker.tsx       Visitas, pasos del embudo y origen (anuncio/web)
  team-view.tsx           Pantalla del equipo (también "Ver como él")
  team-task-card.tsx      CV del equipo: textos por sección, copiar, modo trabajo
  team-chat.tsx           Chat Vale ↔ equipo (burbuja, ventana, no leídos)
  theme-toggle.tsx        Botón de modo claro/oscuro
  sakura*.tsx sections.tsx testimonials.tsx site-*.tsx bottom-nav.tsx …
  admin/                  Una pestaña del panel por archivo (orders, team, dashboard…)
lib/
  supabase.ts             Cliente, reparación del hash del login y errores en español
  catalog.ts cart.ts orders.ts order-stages.ts
  dashboard.ts            Métricas, plazos y embudo
  team.ts                 Tiempos, marcas, racha y pagos del equipo
  whatsapp-sale.ts        Lectura de notas de venta por WhatsApp
  push.ts theme.ts pixel.ts consent.ts seo.ts faq.ts sessions.ts export-excel.ts …
public/
  sw.js                   Service worker de los avisos push
  admin.webmanifest equipo.webmanifest
  brand/ img/ icons/ social/ tutorial-equipo.mp4
supabase/
  migrations/             Historial completo de la base (SQL)
  functions/              Edge Functions
docs/                     Esta documentación y controles de seguridad
```

- Las páginas de catálogo son **server components** con `revalidate = 60`.
- Todo lo que requiere sesión (comprar, cuenta, admin, equipo) son **client components**.
- El tema se aplica antes de pintar con un script en el `<head>` (`lib/theme.ts`, atributo `data-theme`, tokens `--acv-*`).

### 3.3 Base de datos (Supabase)

Historial completo en `supabase/migrations/` (se aplica en orden; nunca se editan migraciones viejas).

**Tablas principales:**

| Tabla | Contenido |
|---|---|
| `profiles` | Nombre, teléfono, email, rol (`client` / `admin`), permiso de novedades. |
| `products` · `extra_groups` · `extra_options` · `product_extra_groups` | Catálogo y extras. |
| `ebooks` · `product_ebooks` · `product_ebook_choices` | E-books incluidos o a elección. |
| `courses` · `lessons` | Cursos y lecciones. |
| `orders` · `order_items` | Pedidos con precios congelados. Columnas clave: `source` (`web` / `whatsapp`), `origin` (anuncio, instagram, recomendación, google, web, otro; la web marca anuncio o web y Vale corrige el resto), `seen_at`, `waiting_since`, `paused_days`, `payment_method`. |
| `order_private` | Link de Canva del pedido (solo admin). |
| `order_links` | Links de pedido con precio especial opcional. |
| `ebook_access` · `course_access` · `sessions` | Accesos y sesiones 1 a 1. |
| `payment_settings` · `card_payments` | Datos de transferencia, tarjeta (apagada) y pagos de Ualá. |
| `faqs` · `testimonials` | Sakura y testimonios. |
| `team_members` | Integrantes: email (Gmail con el que entran), nombre, tarifa por pack, cada cuántos se paga, cuenta vinculada. |
| `team_tasks` | Un CV asignado por renglón de pedido: textos (moderno, ATS, carta), notas, vencimiento, estado (`asignado` / `haciendo` / `terminado`), `started_at`, `finished_at`, link de Canva, pago que lo cubrió. |
| `team_payments` | Pagos y adelantos al equipo, con los packs que cubre. |
| `team_messages` | Chat Vale ↔ equipo, con CV referido y leído. |
| `push_subscriptions` · `push_log` | Dispositivos con avisos activados (admin y equipo) y avisos enviados. |
| `site_visits` · `site_events` | Visitas anónimas por día y página, y pasos del embudo (`lo_quiero`, `checkout`, `whatsapp`). |
| `admin_upload_tokens` | Tokens de un solo uso para subidas de administración. |

**Funciones (RPC)** principales, todas `SECURITY DEFINER`:

| Función | Quién | Qué hace |
|---|---|---|
| `create_order` · `submit_receipt` | Cliente | Crea el pedido recalculando precios / asocia el comprobante. |
| `set_my_order_origin` | Cliente | Marca si su pedido vino de un anuncio. |
| `admin_set_order_status` · `admin_set_waiting` · `admin_set_order_origin` | Admin | Estados (aprobar el pago libera todo), pausa del plazo y origen. |
| `admin_record_sale` · `admin_update_whatsapp_sale` · `admin_update_whatsapp_sale_items` | Admin | Ventas por WhatsApp. |
| `get_order_link` · `claim_order_link` | Todos / Cliente | Links de pedido. |
| `admin_update_session` · `admin_review_instant_payment` | Admin | Sesiones y pagos al instante. |
| `my_team_member_id` · `team_link_account` | Equipo | Vincula la cuenta de Google con su ficha del equipo. |
| `team_set_task_status` | Equipo / Admin | Empezar, haciendo, terminado (guarda inicio y fin). |
| `admin_team_pay` | Admin | Registra un pago y cubre los packs impagos más viejos. |
| `team_chat_mark_read` | Admin / Equipo | Marca como leídos los mensajes de la conversación. |
| `track_visit` · `track_event` | Todos | Visitas y embudo (ignoran a la admin). |
| `mark_card_payment` · `instant_eligible` · `finish_receipt_check` · `push_config` · `cron_key` | Solo funciones del servidor | Ualá, comprobantes, claves VAPID y clave del cron. |
| `is_admin()` | Todos | Usada por las políticas de seguridad. |

**Triggers:** `handle_new_user` (perfil al registrarse), `protect_profile_role`, `set_course_expiry` y **`team_task_starts_order`** (al asignar un CV, el pedido pago pasa a En proceso).

**Realtime:** `orders`, `team_tasks`, `team_payments` y `team_messages` (contadores y listas que se actualizan solos).

**Tarea programada (pg_cron):** `daily-digest`, lunes a sábado 12:00 UTC (9 hs de Argentina), llama a la función del mismo nombre con la clave de Vault.

### 3.4 Seguridad

- **RLS activado en las 30 tablas.** Catálogo de lectura pública; cada cliente ve solo lo suyo; cada integrante del equipo ve solo sus CVs, pagos y mensajes; solo la admin escribe el resto.
- **Los pedidos no se escriben directo:** todo pasa por funciones que recalculan precios y validan permisos.
- La **clave publicable** de Supabase está en el código (es pública por diseño). La **service role key** y los secretos (Ualá, VAPID privada) viven solo en Supabase.
- **E-books** solo a través de la función que estampa el email del comprador.
- **Una sola administradora**; las cuentas nuevas son cliente y no pueden cambiar su rol ni su email.
- **El equipo no ve precios ni contactos de clientes.**
- Anti-spam (máx. 5 pedidos sin pagar por persona en 24 hs), contraseñas de 8+ caracteres, encabezados HTTP de seguridad (HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy).
- Repositorio **público**: sin CBU, claves ni e-books pagos.
- Controles y chequeo semanal: [`docs/SEGURIDAD.md`](SEGURIDAD.md).

### 3.5 Funciones del servidor (Edge Functions)

| Función | Autenticación | Qué hace |
|---|---|---|
| `ebook-download` | Sesión del cliente | Descarga el PDF con la línea "E-book adquirido por {email} - Pedido #N" en cada página. |
| `notify-admin` | Sesión | Avisos push: `new_order` y `receipt` (a Vale, solo pedidos propios y recientes, una vez por tipo), `task_assigned` (al integrante), `task_done` (a Vale), `chat` (al otro lado de la conversación) y `test`. Usa `web-push` con las claves de Vault; etiquetas para no duplicar y avisos que quedan fijos. |
| `daily-digest` | Clave del cron (Vault) | Resumen de la mañana a Vale y a cada integrante, con los mismos plazos que el panel. |
| `verify-receipt` | Sesión del cliente | Lectura del comprobante con IA (apagada sin `ANTHROPIC_API_KEY`). |
| `admin-upload` | Token de un solo uso | Sube PDFs de e-books o archivos al bucket público `social`. Borrar el token después de usarlo. |
| `uala` | Sesión / webhook | Pago con tarjeta por Ualá Bis; vuelve a consultar cada orden en Ualá antes de aprobar. Apagado en la web. |

### 3.6 Almacenamiento de archivos (Storage)

| Bucket | Público | Contenido |
|---|---|---|
| `receipts` | No | Comprobantes (carpeta por usuario, 10 MB, imagen o PDF) |
| `ebooks` | No | PDF de los e-books |
| `course-files` | No | Adjuntos de lecciones |
| `avatars` | Sí | Fotos de perfil |
| `social` | Sí | Imágenes, videos y PDF para redes |

Las piezas de Instagram programadas en Metricool se sirven desde `public/social/` del sitio (`armadodecv.com/social/...`).

### 3.7 Inicio de sesión

- **Email y contraseña** (confirmación de email desactivada) y **Google** (marca verificada: "Iniciar sesión en Armado de CV").
- Al entrar con Google desde una sección del panel (`/admin#pedidos`, `/equipo#chat`), la sección se guarda antes de salir (`acv-return-hash`) y se vuelve a ella; `lib/supabase.ts` repara el hash si llega duplicado (esto resolvió el bucle de login).
- El **equipo entra con su Gmail**: la primera vez, `team_link_account` vincula la cuenta con su ficha. Si se cambia el Gmail en Equipo, se desvincula la cuenta anterior.
- En Supabase → Authentication → URL Configuration deben figurar `https://www.armadodecv.com` y `https://www.armadodecv.com/**`.

### 3.8 Apps instalables y notificaciones push

| App | Manifest | Abre en | Para quién |
|---|---|---|---|
| Armado de CV (web) | `app/manifest.ts` | `/` | Clientes |
| Armado de CV - Admin | `public/admin.webmanifest` | `/admin` | Vale (atajos: Venta por WhatsApp, Pedidos; recibe notas compartidas desde WhatsApp) |
| Armado de CV - Equipo | `public/equipo.webmanifest` | `/equipo` | Integrantes del equipo (tablet) |

- **Push:** VAPID (clave pública en `lib/push.ts`, privada en Vault). `public/sw.js` muestra el aviso (con `tag`, `renotify`, vibración y `requireInteraction` para los CV asignados) y al tocarlo abre la sección correcta.
- En iPhone/iPad los avisos funcionan solo con la app agregada a la pantalla de inicio (iOS 16.4+).
- **Aviso de versión nueva:** el panel y el equipo consultan `/api/version` y muestran "Hay una versión nueva · Actualizar".

### 3.9 Dominio, despliegue y entornos

- **DNS en GoDaddy:** `A @ → 216.198.79.1` (Vercel), `CNAME www → *.vercel-dns-017.com`, `TXT google-site-verification` (**no borrar**).
- **Despliegue:** cada merge a `main` despliega en Vercel; cada rama genera una vista previa. Flujo de trabajo: rama → push → verificación del deploy → merge a `main`.
- **Variables de entorno (opcionales):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Desarrollo local:** `npm install` y `npm run dev`.

### 3.10 Medición (visitas, embudo y píxel de Meta)

- **Visitas propias** (`site_visits`, desde el 28/09): anónimas, por día y página, sin cookies. Ignora a la admin y las páginas privadas.
- **Embudo** (`site_events`): `lo_quiero`, `checkout` y `whatsapp` (cualquier botón de WhatsApp de la web pública), una vez por sesión del navegador.
- **Origen:** si la visita llega con `fbclid` o `utm_source`, el pedido queda como `anuncio`.
- **Píxel de Meta** (conjunto "Armado de CV - Web", activo desde el 27/09, solo con consentimiento de cookies y nunca en el panel): PageView, ViewContent, InitiateCheckout, CompleteRegistration, Lead, Contact (paso a WhatsApp) y Purchase.
- **Vercel Analytics** como segunda fuente de visitas.

---

## 4. Operación del día a día

| Tarea | Dónde |
|---|---|
| Ver qué hay que hacer hoy | Panel → Pedidos → **Hoy** (o el resumen push de las 9) |
| Cargar una venta cerrada por WhatsApp | Botón verde **Venta por WhatsApp** (o compartir la nota desde WhatsApp) |
| Mandar un pedido armado al cliente | Pedidos → **Link de pedido** |
| Aprobar un pago | Pedidos → abrir el comprobante → "Aprobar pago" |
| Pasarle un CV al equipo | Pedidos → ficha → bloque Equipo → **Asignar** (pegar textos) |
| Ver cómo va el equipo y cuánto tarda | Panel → **Equipo** (Le debés, Tiempos, Mes a mes) |
| Pagarle al equipo | Equipo → **Registrar pago** (cada 10 packs o adelanto) |
| Hablar con el equipo | Burbuja de chat del panel |
| Cambiar un precio o texto | Panel → Packs y precios (se ve en la web en ≤ 1 minuto) |
| Agendar una sesión 1 a 1 | Panel → Sesiones |
| Subir un e-book, pregunta de Sakura o testimonio | Panel → E-books / Sakura / Testimonios |
| Cambiar alias o CBU | Panel → Datos de pago |

**Producción de CVs:**
1. Vale arma los textos con su **Master Prompt** (solo las 3 experiencias más relevantes para el puesto).
2. Los asigna al equipo desde el pedido.
3. El equipo duplica en Canva un trabajo anterior del mismo género y con la misma cantidad de hojas (Simple: 2; con carta: 3), lo renombra "Cv - NOMBRE APELLIDO", pega los textos y marca "Terminé este CV" con el link.
4. Vale revisa, manda el link de Canva como boceto y, con el OK, descarga el PDF y entrega.

---

## 5. Marketing e integraciones externas

- **Instagram @armadodecv.ok** con **Metricool** (marca conectada). Lo que mejor funciona: la serie **"Cómo y dónde postularme a…"** (carruseles 1080×1350 con el logo de cada empresa). Historias 1080×1920. Reels dinámicos con subtítulos en Montserrat y placa final con el logo. No se repiten fotos.
- **Publicidad solo en Instagram**, con tope total de **US$ 23 por día** (dos campañas de mensajes: US$ 10 + US$ 13). Límite de gasto de la cuenta: US$ 200.
- **Canva:** CV de clientes y contenido. Las apps de Canva y el autocompletado de plantillas requieren Canva Enterprise, y Canva no se puede embeber dentro del panel.
- **Google Drive y Sheets:** formulario "Carga de datos para CV / Carta de presentación" para clientes sin CV previo.
- **Destacadas de Instagram:** Web, Servicios, Clientes, Tips, Ofertas, En medios, Info.

---

## 6. Qué vive fuera de este repositorio

| Qué | Dónde |
|---|---|
| E-books (fuente, CSS de marca, armado de PDF) | `Documentos\armado-de-cv-ebooks\` |
| Guías de regalo del pack | `Documentos\armado-de-cv-ebooks\guias-pack\` y OneDrive |
| Contenido de redes (carruseles, historias, reels, tutorial del equipo) | `Documentos\armado-de-cv-ebooks\contenido\` |
| Master Prompt de CVs y flujo en Canva | `Documentos\armado-de-cv-ebooks\flujo-cvs\prompt-cv.md` |
| Plan de Instagram y Meta Ads | `Documentos\armado-de-cv-ebooks\contenido\PLAN-Instagram-y-Meta-Ads.md` |
| PDFs de los e-books vendidos | Bucket privado `ebooks` |
| Secretos (service role, Google OAuth, Ualá, VAPID privada) | Supabase y Google Cloud (nunca en el código) |

Se recomienda una **copia de seguridad** de `Documentos\armado-de-cv-ebooks\` en OneDrive.

---

## 7. Diagnóstico de ventas por la web y mejoras

Revisión del 05/10/2026 con los datos propios (visitas y embudo desde el 28/09) y el Administrador de anuncios.

### 7.1 Qué dicen los números

| Indicador (28/09 → 05/10) | Valor |
|---|---|
| Visitas a la web | 559 (96% entra solo a la home y casi no pasa a otra página) |
| Tocaron "Lo quiero" | 6 (≈ 1%) |
| Llegaron a /comprar | 4 |
| Pedidos web | 3: uno entregado, uno cancelado y uno **sin pagar desde el 03/10** (vino de un anuncio) |
| Ventas por WhatsApp cargadas en el panel | La gran mayoría de las ventas |

**Visitas por día:** ~65 a 120 entre el 28/09 y el 03/10, y **14–15 desde el 04/10**.

### 7.2 Por qué no entran ventas por la web

1. **La campaña de tráfico a la web terminó.** En el Administrador de anuncios, la campaña "Instagram Post" (la que mandaba clics a la web, 772 clics) figura **Completada**. Las dos activas son de **mensajes** (Instagram + WhatsApp), que llevan a la gente al chat y no a la web. Por eso las visitas cayeron de ~100 a ~15 por día.
2. **El cliente de Instagram compra conversando.** Un CV es un servicio personal: la gente quiere preguntar antes de pagar, y el anuncio de mensajes se lo facilita. La web funciona como **catálogo y confianza**, y la venta se cierra por WhatsApp (que sí se registra en el panel).
3. **La compra en la web pide muchos pasos**: crear cuenta → aceptar términos → transferir → subir comprobante. Dentro del navegador de Instagram no se puede entrar con Google, así que hay que crear cuenta con email y contraseña.
4. **Precio de entrada que no coincidía**: el botón decía "Ver packs · desde $30.000" (tomaba la Asesoría de LinkedIn) y el pack más barato cuesta $35.000. **Corregido**: ahora toma el trabajo más barato de la sección (packs y LinkedIn).
5. **No se medía bien el paso a WhatsApp**: solo contaban los botones de las tarjetas. **Corregido**: ahora cuenta cualquier botón de WhatsApp de la web (encabezado, barra inferior, portada, Sakura, pie), así el panel muestra cuánta gente pasa de la web al chat.
6. **La confianza aparece tarde**: los testimonios están después de las guías y de "Sobre mí", y no hay ejemplos de CV terminados cerca de los precios.

### 7.3 Mejoras recomendadas (de mayor a menor impacto)

1. **Decidir el rol de la web.** Si la venta se cierra por WhatsApp, medir el éxito de la web como "pasó a WhatsApp" (ya se mide) y no como compra web. Si se quiere venta directa, volver a correr una campaña de **tráfico** chica (dentro de los US$ 23) hacia la web.
2. **Ejemplos reales de CV (antes / después)** arriba de los precios, con permiso del cliente y datos tapados. Es la prueba más fuerte para un servicio de CV.
3. **Testimonios justo debajo de los packs**, y un contador simple ("+N CV entregados").
4. **Compra sin cuenta**: confirmar el pedido solo con nombre y WhatsApp, y ofrecer la cuenta después (solo hace falta para descargar guías). Es el cambio que más fricción saca.
5. **Página de aterrizaje por anuncio** (por ejemplo `/cv`) con solo los 3 packs, testimonios y WhatsApp, sin guías ni asesorías.
6. **Seguimiento del pedido web sin pagar** del 03/10: escribirle con el mensaje "Recordar el pago" que ya arma el panel.
7. **Revisar los borradores del Administrador de anuncios** ("Revisar y publicar (5)"): hay cambios sin publicar, entre ellos la campaña en borrador "Mensajes IG + WhatsApp".

---

## 8. Pendientes y próximos pasos

- **Equipo:** activar las notificaciones en la tablet del integrante (hoy 0 dispositivos) y actualizar la app a la última versión.
- **Chat:** confirmar con un mensaje real de ida y vuelta.
- **Anuncios:** el límite de gasto de US$ 200 alcanza para ~7–8 días a US$ 23 por día; revisarlo antes de que se corte.
- **Emails:** configurar un SMTP propio (por ejemplo Resend) para que lleguen los mails de recuperación, y traducir la plantilla "Reset password".
- **Cursos:** cargar el primero.
- **Contenido:** siguiente guía "Cómo y dónde".
- **Copias de seguridad:** exportar la base una vez por mes (el plan gratuito de Supabase no guarda copias).

---

## 9. Historial de cambios

| Fecha / PR | Cambio |
|---|---|
| 24/09 | Reemplazo del sitio anterior (Vite) por el nuevo sitio en Next.js |
| #1–#10 | Identidad de marca, Asesorías, tienda con cuentas, panel, cursos, legales, Sakura, e-books con sello, Google, guías, píxel de Meta, testimonios |
| #11–#14 | Recuperar y cambiar contraseña, base de datos versionada, documentación, e-books al instante con lectura de comprobante (luego apagado), única admin, anti-spam |
| #15–#19 | Compra desde Instagram (sin Google en el navegador interno), píxel activo, e-books "Cuánto pedir de sueldo" y "Trabajo remoto", `/gratis`, precios escalonados de guías, Ualá (apagado) |
| 28/09 | Resumen de la guía al tocar "Lo quiero", numeración de pedidos real/prueba, mejoras de confianza en la home, SEO, panel con Inicio, métricas, Excel, visitas propias y embudo |
| 29/09 | App del panel, avisos push, ventas por WhatsApp, link de pedido, contadores en vivo, ocultar montos, Canva privado por pedido, aviso de cookies, Asesoría de LinkedIn y para entrevistas, pedidos urgentes, sesiones "Después del CV", "Esperando al cliente" |
| 30/09 | "Editar venta" de WhatsApp también cambia productos y adicionales |
| 03/10 | Facturación semana a semana; "Pedilo por WhatsApp" en cada producto y origen de cada pedido web; de dónde vienen las ventas; "Copiar mensaje y número"; **pedidos por etapas**; **Equipo** (panel, asignación por pack, pagos que cubren CVs, resumen diario a las 9) |
| 04/10 | Login con Google sin bucle; botones de pago sin duplicar; **app del equipo** para tablet y "Ver como él"; copiar por bloque, por renglón o lo seleccionado; carta en un solo bloque; **modo oscuro** en web, panel y equipo; modo trabajo; cambio del Gmail del integrante; abrir el siguiente CV al terminar; al asignar, el pedido pasa a En proceso (trigger); lista compacta; video tutorial y avisos por cada CV asignado; contenido del 5/10 y 9/10 |
| 05/10 | Tarjeta abierta a todo el ancho en compu, tablet y celu; **chat Vale ↔ equipo** (burbuja, no leídos, avisos); textos separados por sección; copiar marca "Haciéndolo"; "Terminé este CV" con confirmación en pantalla y "Marcar como terminado" desde el panel; **tiempos por CV** para Vale y **marcas, récords y racha** para el equipo |
| 05/10 | Esta documentación actualizada; "Ver packs · desde" toma el pack más barato; todos los botones de WhatsApp de la web cuentan en el embudo |
| 06/10 | Testimonios debajo de los precios y seguidores de Instagram en la home; **Test ATS gratis** (`/test-ats`, `lib/ats-check.ts`, tabla `ats_checks`, pestaña Test ATS del panel) con banner en la home y política de privacidad actualizada |
| 06/10 | Test ATS más exigente: puntajes con techo por problemas graves, perfil, fechas como períodos, logros con números, viñetas y frases genéricas; pago con tarjeta (Ualá) habilitado en la web y opción de mandar el comprobante por WhatsApp |
| 07/10 | Test ATS como un ATS real: ficha del candidato, coincidencia con el puesto por área o aviso, filtro de años de experiencia; área obligatoria y guardada en el panel |
| 07/10 | Test ATS: pide mail y una hora después manda un mail automático con el resultado y los packs (función `ats-followup` cada 10 min con pg_cron, Resend con `RESEND_API_KEY`, de 9 a 21; baja en `/baja`) |
| 07/10 | **Pack Primer Empleo** (`cv-primer-empleo`, $20.000): 1 CV ATS para primer trabajo, lo hace Vale (no está en `TEAM_PACKS`); primero en la lista de CV, con Express y portales; Sakura lo conoce; el mail del test lo ofrece aparte |
| 10/10 | Equipo: "Terminé este CV" confirma en una ventana aparte y el "Sí" se habilita a los 2 segundos (evita el doble toque en la tablet) |
| 10/10 | **Compra sin cuenta** para packs de CV y sesiones: `/comprar` pide nombre, WhatsApp y mail y entra con una sesión anónima de Supabase (`signInAnonymously`), así el pedido, Ualá y el comprobante funcionan igual; `create_order` guarda `orders.customer_email` y rechaza e-books y cursos sin cuenta; el panel muestra "sin cuenta". Se activa con "Allow anonymous sign-ins" en Supabase (Authentication → Sign In / Providers) |
| 10/10 | **Guías**: precios $5.900–7.900 y Kit $19.900; "Sumá una guía con descuento" ($3.900) como extra de los packs de CV (`extra_options.ebook_id`, lo habilita `grant_order_access`); las guías también se compran sin cuenta y el link de descarga llega por mail (`orders.download_token`, página `/descargar`, función `ebook-mail` cada 10 min, `ebook-download` acepta el token); el mail del test ATS ofrece la guía ATS |
