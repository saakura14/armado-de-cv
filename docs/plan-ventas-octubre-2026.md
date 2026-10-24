# Plan de ventas: que la web y los mensajes vendan sin depender de Vale

Octubre 2026. La meta es que una persona pueda llegar, decidir y pagar sin que Vale tenga que abrir WhatsApp para perseguirla, y que Vale use su tiempo en las conversaciones que ya están por cerrar.

---

## 1. Qué está pasando

- **La venta se cierra conversando.** Quien llega por Instagram quiere preguntar antes de pagar, por eso la mayoría de las ventas entra por WhatsApp y por los anuncios de mensajes. La web funciona como catálogo, prueba de confianza y test ATS.
- **El test ATS trae contactos todos los días** (nombre, WhatsApp y mail), pero solo recibían un mail. Al resto había que escribirle a mano.
- **Los pedidos web que no se pagaban quedaban en silencio.** No había ningún mail con los datos de pago ni un recordatorio: si la persona cerraba la página, perdía los datos para transferir.
- **Las guías casi no se ofrecían.** No aparecían en el resultado del test, y con transferencia se descargan recién cuando Vale confirma el pago.
- **El contenido que más alcance trae** (los carruseles de "dónde postularte", la Expo Empleo) se guarda y se comparte mucho, pero no pide una acción concreta.

---

## 2. Lo que ya queda automático

| Qué | Cuándo | Para qué |
|---|---|---|
| **Mail 1 del test ATS** (ya existía) | 1 hora después del test | Resultado, lo que le resta puntos y los packs. Ahora avisa que manda 3 mails como máximo. |
| **Mail 2 del test ATS** (nuevo) | 2 días después | Cómo arreglar cada problema que encontró el test, la guía **CV a prueba de filtros ATS** para hacerlo por su cuenta y los packs para que lo haga Vale. |
| **Mail 3 del test ATS** (nuevo) | 5 días después | Último mail: un testimonio real y un botón para escribirle a Vale por WhatsApp con el mensaje ya escrito. |
| **"Recibí tu pedido"** (nuevo) | Unos minutos después de pedir en la web | Total, alias, CBU y titular, y cómo mandar el comprobante (respondiendo el mail o por WhatsApp). |
| **Recordatorio de pago** (nuevo) | Al día siguiente, si sigue sin pagar | Los mismos datos, "te lo dejo reservado" y botón de WhatsApp. Es el único recordatorio. |
| **Guía ATS en el resultado del test** (nuevo) | En la pantalla del resultado | Al lado de los packs, la opción barata para quien no quiere pagar un pack. |

Cuidados:
- Los mails 2 y 3 solo les llegan a quienes recibieron el mail 1 nuevo. A los que ya lo recibieron se les dijo que era el único, así que no se les manda nada más.
- Nadie que haya comprado después del test (por la web o por WhatsApp, buscando por mail o teléfono) recibe los mails 2 y 3.
- Todos los mails tienen la baja con un toque, y solo salen entre las 9 y las 21.

---

## 3. Lo que configurás vos una sola vez (sin código, unos 30 minutos)

### WhatsApp Business (app del celu)
1. **Mensaje de bienvenida** (Herramientas para la empresa → Mensaje de bienvenida): se manda solo cuando alguien te escribe por primera vez o después de 14 días.
   ```
   ¡Hola! Soy Vale de Armado de CV 💕 Gracias por escribirme.
   Contame qué necesitás (CV, LinkedIn o preparación para entrevistas) y para qué puesto o rubro estás buscando, y te digo qué pack te conviene.
   Mientras tanto, mirá los packs y precios en armadodecv.com
   ```
2. **Mensaje de ausencia** fuera de tu horario, con el link a la web y "mañana a primera hora te respondo".
3. **Respuestas rápidas**: `/cv`, `/linkedin` y `/expo` (los textos están en `docs/calendario-octubre-2026.md`). Con eso cada respuesta es un toque.
4. **Etiquetas**: Nuevo, Esperando pago, Pagó, Entregado. Te dejan ver de un vistazo a quién falta responderle.
5. **Catálogo de WhatsApp** con los packs y las guías, con precio y foto. La gente lo ve sin preguntar.

### Instagram (Meta Business Suite → Bandeja de entrada → Automatizaciones)
1. **Respuestas automáticas por palabra clave**: CV, FILTRO, LINKEDIN, EXPO, GUIA y AYUDA. Cada una contesta sola con la respuesta guardada que corresponde.
2. **Preguntas frecuentes** (hasta 4 botones al abrir el chat): "¿Cuánto sale?", "¿Cuánto tarda?", "¿Cómo pago?", "Quiero hablar con Vale".
3. **Comentarios con palabra clave → mensaje directo**: para "Comentá EXPO y te mando el checklist", conectá **ManyChat** (tiene un plan gratis) a tu Instagram y armá la regla "si comentan EXPO, mandar el mensaje con el checklist". Responde a cualquier hora y cada comentario suma alcance.

### Pago con tarjeta
Hacé una compra de prueba de una guía desde el celu, como si fueras una clienta. Si el botón de tarjeta funciona, la guía se entrega al instante, sin que tengas que aprobar nada; ese es el camino ideal para que las guías se vendan solas. Si da error, hay que revisar la configuración de Ualá (`UALA_ENV`).

---

## 4. Más adelante: WhatsApp automático a quienes hacen el test

Hoy WhatsApp solo se puede automatizar del lado de las respuestas (bienvenida, ausencia y respuestas rápidas). Para que **salga un WhatsApp solo** a quien hizo el test, sin que lo mandes vos, hace falta la **API de WhatsApp Business de Meta**:

- Hay que verificar la empresa en Meta Business y usar un número dado de alta en la API.
- Meta permite en algunos casos seguir usando el mismo número de la app (coexistencia); si no, hace falta un número nuevo.
- Cada mensaje sale con una plantilla aprobada por Meta, y Meta cobra cada conversación de marketing (centavos de dólar; ver la tabla de precios vigente de Meta para Argentina).
- Del lado de la web es una función como la de los mails, que manda la plantilla 2 horas después del test si la persona no compró.

Recomendación: primero medir dos semanas la secuencia de mails (aperturas, clics y ventas). Si los contactos del test responden más por WhatsApp, se arma esta parte.

---

## 5. Que las guías tengan salida

1. **En el test ATS:** la guía ATS aparece en el resultado y en el mail 2 (hecho).
2. **En los packs:** sigue el extra "Sumá una guía con descuento" ($3.900).
3. **En Instagram, cada carrusel informativo termina con su guía:**

   | Tema del carrusel | Guía que se ofrece | Palabra clave |
   |---|---|---|
   | Sueldo y pretensión salarial | Cuánto pedir de sueldo | SUELDO |
   | Titular y perfil de LinkedIn | LinkedIn para conseguir trabajo | GUIA |
   | Empresas y dónde postularte | Portales de empleo | PORTALES |
   | ATS y errores del CV | CV a prueba de filtros ATS | ATS |
   | Expo Empleo | Kit Búsqueda Laboral | EXPO |

   El carrusel de sueldo, que terminaba con "Comentá SUELDO", fue de los de más alcance. Es el modelo a repetir.
4. **Para la Expo:** el **Kit Búsqueda Laboral** como paquete del mes ("todo lo que necesitás antes del 28").

---

## 6. Publicidad (tope US$ 23 por día)

- Seguir con el objetivo **Mensajes**: es lo que vende.
- Promocionar el **carrusel de la Expo** hasta el 27/10 (ya probó que interesa).
- Probar un anuncio chico (US$ 5 a 7 por día) hacia **armadodecv.com/test-ats**. Cada persona que hace el test entra sola en la secuencia de 3 mails, sin trabajo extra. Si a la semana trae ventas, queda fijo; si no, ese presupuesto vuelve a los reels.

---

## 7. Qué mirar cada lunes

| Indicador | Dónde |
|---|---|
| Personas que hicieron el test ATS | Panel → Test ATS |
| Mails abiertos y clics | Resend → Emails |
| Pedidos web pagados y sin pagar | Panel → Pedidos |
| Conversaciones de los anuncios y costo por conversación | Administrador de anuncios |
| Guías vendidas | Panel → Pedidos (filtrar por guías) |

Si una semana los pedidos web quedan sin pagar a pesar del recordatorio, el próximo paso es sumar el pago con tarjeta bien visible en el pedido o un link de pago directo.
