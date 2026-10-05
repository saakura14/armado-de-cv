# Controles de seguridad · Armado de CV

Última revisión: 05/10/2026.

## 1. Lo que ya está protegido

| Área | Control | Estado |
|---|---|---|
| Base de datos | Permisos por fila (RLS) en las 30 tablas públicas: cada cliente ve solo sus pedidos, comprobantes y accesos; cada integrante del equipo, solo sus CVs, pagos y mensajes, sin precios ni contactos de clientes. | ✅ |
| Roles | Una sola cuenta admin (valeeria.gil@gmail.com). Toda cuenta nueva nace como cliente, y un cliente no puede cambiarse el rol ni el email. | ✅ |
| Funciones de admin | `admin_set_order_status`, `admin_review_instant_payment` y `admin_update_session` rechazan a quien no es admin. | ✅ |
| Archivos | Comprobantes, e-books y cursos en buckets privados. Los e-books se descargan solo con la función que les pone el email del comprador. | ✅ |
| Subidas de admin | Con un token temporal que se borra después de usarlo. | ✅ |
| Pagos por transferencia | Todos se aprueban a mano. Nada se habilita sin tu confirmación. | ✅ |
| Pagos con tarjeta (Ualá) | Los datos de la tarjeta los carga el cliente en la página de Ualá; la web nunca los ve. El aviso de Ualá no está firmado, así que la función `uala` vuelve a consultar cada orden en Ualá con nuestras credenciales y controla monto y pedido antes de aprobar. Solo esa función puede marcar un pago con tarjeta. Las credenciales viven en los secretos de Supabase, nunca en el repositorio. | ✅ (28/09) |
| Anti-spam | Máximo 5 pedidos sin pagar por persona cada 24 h. | ✅ |
| Contraseñas | Mínimo 8 caracteres. Se pueden recuperar y cambiar. | ✅ |
| Sitio | HTTPS obligatorio (HSTS), no se puede incrustar en otras páginas, y lleva los encabezados nosniff, Referrer-Policy y Permissions-Policy. | ✅ |
| Código | El repositorio es público y no tiene claves, contraseñas ni datos bancarios. | ✅ |
| Página /admin | No muestra qué emails son de administración. | ✅ (27/09) |

## 2. Chequeo automático semanal (lunes 9:00)

Una tarea programada en Claude revisa lo siguiente y avisa si algo cambió:

1. Alertas de seguridad de Supabase: que no aparezcan alertas nuevas fuera de las aceptadas (sección 4).
2. Que haya **una sola** cuenta con rol admin.
3. Tokens de subida olvidados: no debería quedar ninguno.
4. Picos raros: más de 20 cuentas nuevas en un día, o una persona con muchos pedidos sin pagar.
5. Que los encabezados de seguridad del sitio sigan activos.

La tarea corre cuando la app de Claude está abierta. Si estaba cerrada, corre al abrirla.

## 3. Controles tuyos (una vez por mes)

- [ ] **Verificación en dos pasos** con app de autenticación (no SMS) en Google, Instagram/Meta, GitHub, Vercel, Supabase, Metricool y Canva.
- [ ] Instagram → Centro de cuentas → *Contraseña y seguridad* → **Dónde iniciaste sesión**: cerrar los dispositivos que no reconozcas.
- [ ] Instagram → *Apps y sitios web*: dejar solo las que usás (Metricool, Canva).
- [ ] Business Suite → *Configuración* → *Personas*: que la única administradora seas vos.
- [ ] Cuenta publicitaria: revisar los métodos de pago y los cargos.
- [ ] Ualá Bis: que las ventas con tarjeta del panel de Ualá coincidan con los pedidos "Pagado con tarjeta" de la web. Si alguna vez compartiste las credenciales de Ualá por chat o mail, regeneralas en Ualá y actualizalas en Supabase → Edge Functions → Secrets.
- [ ] GitHub → *Settings* → *Applications*: quitar la integración de Netlify, que ya no se usa.
- [ ] Destacada "Medios de pago": que no muestre datos bancarios viejos.
- [ ] Desconfiar de los mensajes de "Meta Support", de supuestos reclamos de copyright o de "verificación de cuenta". Meta no escribe por DM.

## 4. Riesgos aceptados o pendientes

| Tema | Detalle | Qué hacer |
|---|---|---|
| Contraseñas filtradas | El chequeo contra HaveIBeenPwned requiere el plan Pro de Supabase. | Activarlo si se pasa a Pro. |
| Copias de seguridad | El plan gratuito de Supabase no guarda copias automáticas. | Exportar la base una vez por mes, o pasar a Pro. |
| `is_admin()` accesible sin sesión | Las reglas de lectura públicas la necesitan. Sin sesión siempre devuelve "no". | Aceptado. |
| Confirmación de email | Está desactivada porque el correo por defecto de Supabase manda muy pocos emails por hora. | Configurar un servicio de correo propio (por ejemplo Resend) y activarla. |
| Tabla `admin_upload_tokens` sin reglas | Es a propósito: solo la usa el servidor. | Aceptado. |
