// Push notifications to the admin's phone: a new order, or a receipt uploaded by the customer;
// and for the team: a CV assigned to a member (to their phone) or finished by them (to the admin), and the team chat messages.
// Called from the customer's browser right after the action (only for their own, fresh orders, once per kind),
// or by the admin with { test: true } to check that notifications arrive.
// The customer's data form (armadodecv.com/datos/<token>) has no session: { kind: 'client_form', token } is accepted
// without one, only for a form sent in the last minutes and once per order. Everything else checks the session here
// (the function is deployed with verify_jwt off so the form page, with only the publishable key, can reach it).
// The VAPID keys are read from Vault through public.push_config() (service role only).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const FRESH_MINUTES = 15

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body = await request.json().catch(() => ({})) as { order_id?: string; task_id?: string; message_id?: string; token?: string; kind?: 'new_order' | 'receipt' | 'task_assigned' | 'task_done' | 'chat' | 'client_form'; test?: boolean }

  // tag: one notification per item (two packs of the same order don't replace each other); sticky: stays on screen until tapped.
  let message: Message
  let logged: { order_id: string; kind: string } | null = null
  // Who gets it: the admins, unless it is a task for a team member.
  let recipients: string[] | null = null

  if (body.kind === 'client_form') {
    // The customer sent their data form: no session, the form's private token instead.
    if (!body.token || !/^[0-9a-f-]{36}$/i.test(body.token)) return json(400, { error: 'Datos incompletos' })
    const { data: form } = await admin.from('client_forms')
      .select('order_id, submitted_at, orders(number, customer_name, order_items(product_name))')
      .eq('token', body.token).maybeSingle()
    if (!form?.submitted_at) return json(404, { error: 'Formulario no encontrado' })
    const order = (Array.isArray(form.orders) ? form.orders[0] : form.orders) as { number: number; customer_name: string | null; order_items: { product_name: string }[] } | null
    if (!order) return json(404, { error: 'Pedido no encontrado' })
    if (order.number >= 90000) return json(200, { sent: 0, skipped: 'prueba' })
    if (Date.now() - new Date(form.submitted_at).getTime() > FRESH_MINUTES * 60 * 1000) return json(200, { sent: 0, skipped: 'viejo' })
    // Once per order: later edits show up in "Hoy" without another notification.
    const { error: duplicate } = await admin.from('push_log').insert({ order_id: form.order_id, kind: 'client_form' })
    if (duplicate) return json(200, { sent: 0, skipped: 'ya avisado' })
    logged = { order_id: form.order_id, kind: 'client_form' }
    const products = order.order_items.map((item) => item.product_name).join(' + ')
    message = { title: `📋 Datos recibidos · pedido #${order.number}`, body: `${order.customer_name ?? 'El cliente'} completó sus datos para ${products}. Ya podés pedir los textos con Claude.`, url: '/admin#pedidos', tag: `form-${form.order_id}` }
    return send(admin, message, recipients, logged, 'client_form')
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json(401, { error: 'Falta la sesión' })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json(401, { error: 'Sesión inválida' })
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isAdmin = profile?.role === 'admin'

  if (body.test) {
    if (isAdmin) {
      message = { title: '¡Las notificaciones funcionan! 🌸', body: 'Te voy a avisar acá cuando entre un pedido o te suban un comprobante.', url: '/admin' }
    } else {
      // A team member checks their own phone.
      const { data: member } = await admin.from('team_members').select('id').eq('user_id', user.id).eq('active', true).maybeSingle()
      if (!member) return json(403, { error: 'Solo la administradora o el equipo' })
      recipients = [user.id]
      const { count } = await admin.from('team_tasks').select('id', { count: 'exact', head: true }).eq('member_id', member.id).neq('status', 'terminado')
      message = { title: '¡Las notificaciones funcionan! ✍️', body: count ? `Ya tenés ${count} ${count === 1 ? 'CV' : 'CVs'} para armar. Te aviso acá cada vez que Vale te pase uno nuevo.` : 'Te voy a avisar acá cada vez que Vale te pase un CV nuevo.', url: '/equipo' }
    }
  } else if (body.kind === 'task_assigned' || body.kind === 'task_done') {
    // Team: a CV assigned to a member (from the admin) or finished by the member (to the admin).
    if (!body.task_id) return json(400, { error: 'Datos incompletos' })
    const { data: task } = await admin.from('team_tasks').select('id, order_number, client_name, pack_name, team_members(user_id, name)').eq('id', body.task_id).maybeSingle()
    if (!task) return json(404, { error: 'Tarea no encontrada' })
    const member = (Array.isArray(task.team_members) ? task.team_members[0] : task.team_members) as { user_id: string | null; name: string } | null
    if (body.kind === 'task_assigned') {
      if (!isAdmin) return json(403, { error: 'Solo la administradora' })
      if (!member?.user_id) return json(200, { sent: 0, skipped: 'todavía no entró' })
      recipients = [member.user_id]
      message = { title: `✍️ Nuevo CV para armar · pedido #${task.order_number}`, body: `${task.pack_name} de ${task.client_name}. Los textos ya están en tu panel.`, url: '/equipo', tag: `task-${task.id}`, sticky: true }
    } else {
      if (!member || member.user_id !== user.id) return json(403, { error: 'No es tu tarea' })
      message = { title: `✅ ${member.name} terminó el CV del pedido #${task.order_number}`, body: `${task.pack_name} de ${task.client_name}: listo para que lo revises y lo entregues.`, url: '/admin#equipo', tag: `done-${task.id}` }
    }
  } else if (body.kind === 'chat') {
    // Team chat: a message from Vale goes to the member's devices, one from the member goes to Vale.
    if (!body.message_id) return json(400, { error: 'Datos incompletos' })
    const { data: chat } = await admin.from('team_messages').select('id, member_id, sender, body, created_at, team_members(user_id, name), team_tasks(order_number)').eq('id', body.message_id).maybeSingle()
    if (!chat) return json(404, { error: 'Mensaje no encontrado' })
    if (Date.now() - new Date(chat.created_at).getTime() > FRESH_MINUTES * 60 * 1000) return json(200, { sent: 0, skipped: 'viejo' })
    const member = (Array.isArray(chat.team_members) ? chat.team_members[0] : chat.team_members) as { user_id: string | null; name: string } | null
    const task = (Array.isArray(chat.team_tasks) ? chat.team_tasks[0] : chat.team_tasks) as { order_number: number } | null
    const text = `${task ? `(#${task.order_number}) ` : ''}${chat.body}`.slice(0, 160)
    if (chat.sender === 'admin') {
      if (!isAdmin) return json(403, { error: 'Solo la administradora' })
      if (!member?.user_id) return json(200, { sent: 0, skipped: 'todavía no entró' })
      recipients = [member.user_id]
      message = { title: '💬 Vale te escribió', body: text, url: '/equipo#chat', tag: `chat-${chat.member_id}` }
    } else {
      if (!member || member.user_id !== user.id) return json(403, { error: 'No es tu conversación' })
      message = { title: `💬 ${member.name.split(' ')[0]} te escribió`, body: text, url: '/admin#chat', tag: `chat-${chat.member_id}` }
    }
  } else {
    if (!body.order_id || (body.kind !== 'new_order' && body.kind !== 'receipt')) return json(400, { error: 'Datos incompletos' })
    const { data: order } = await admin.from('orders')
      .select('id, number, user_id, total, customer_name, created_at, receipt_uploaded_at, order_items(product_name)')
      .eq('id', body.order_id).maybeSingle()
    if (!order || order.user_id !== user.id) return json(404, { error: 'Pedido no encontrado' })
    if (order.number >= 90000) return json(200, { sent: 0, skipped: 'prueba' })
    const moment = body.kind === 'new_order' ? order.created_at : order.receipt_uploaded_at
    if (!moment || Date.now() - new Date(moment).getTime() > FRESH_MINUTES * 60 * 1000) return json(200, { sent: 0, skipped: 'viejo' })
    // Once per order and kind.
    const { error: duplicate } = await admin.from('push_log').insert({ order_id: order.id, kind: body.kind })
    if (duplicate) return json(200, { sent: 0, skipped: 'ya avisado' })
    logged = { order_id: order.id, kind: body.kind }
    const products = (order.order_items as { product_name: string }[]).map((item) => item.product_name).join(' + ')
    const name = order.customer_name ?? 'Cliente'
    message = body.kind === 'new_order'
      ? { title: `🛍️ Nuevo pedido #${order.number}`, body: `${name} · ${products} · ${ars.format(order.total)}`, url: '/admin#pedidos' }
      : { title: `🧾 Comprobante del pedido #${order.number}`, body: `${name} subió el comprobante de ${ars.format(order.total)}. Revisalo y aprobá el pago.`, url: '/admin#pedidos' }
  }

  return send(admin, message, recipients, logged, body.test ? 'test' : body.kind)
})

type Message = { title: string; body: string; url: string; tag?: string; sticky?: boolean }

/** Sends the notification to the recipients' devices (the admins when none given) and records the result. */
async function send(admin: SupabaseClient, message: Message, recipients: string[] | null, logged: { order_id: string; kind: string } | null, kind: string | undefined) {
  const { data: config } = await admin.rpc('push_config')
  if (!config?.private || !config?.public) return json(500, { error: 'Faltan las claves de notificación' })
  webpush.setVapidDetails('mailto:ayuda.armadodecv@gmail.com', config.public, config.private)

  if (!recipients) {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    recipients = (admins ?? []).map((row) => row.id)
  }
  const { data: subscriptions } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', recipients)
  let sent = 0
  const errors: string[] = []
  for (const subscription of subscriptions ?? []) {
    try {
      // High urgency so Android delivers it right away even with the phone idle.
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(message), { TTL: 60 * 60 * 24, urgency: 'high' })
      sent++
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      errors.push(`${status ?? '?'} ${(error as Error).message}`.slice(0, 200))
      // The phone uninstalled the app or revoked permission: forget that subscription.
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      else console.error('push failed', status, (error as Error).message)
    }
  }
  console.log('push result', { kind, devices: subscriptions?.length ?? 0, sent, failed: errors.length })
  if (logged) await admin.from('push_log').update({ sent, failed: errors.length, error: errors.join(' | ') || null }).eq('order_id', logged.order_id).eq('kind', logged.kind)
  return json(200, { sent, devices: subscriptions?.length ?? 0 })
}
