// Push notifications to the admin's phone: a new order, or a receipt uploaded by the customer;
// and for the team: a CV assigned to a member (to their phone) or finished by them (to the admin).
// Called from the customer's browser right after the action (only for their own, fresh orders, once per kind),
// or by the admin with { test: true } to check that notifications arrive.
// The VAPID keys are read from Vault through public.push_config() (service role only).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
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

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json(401, { error: 'Falta la sesión' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json(401, { error: 'Sesión inválida' })

  const body = await request.json().catch(() => ({})) as { order_id?: string; task_id?: string; kind?: 'new_order' | 'receipt' | 'task_assigned' | 'task_done'; test?: boolean }
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isAdmin = profile?.role === 'admin'

  let message: { title: string; body: string; url: string }
  let logged: { order_id: string; kind: string } | null = null
  // Who gets it: the admins, unless it is a task for a team member.
  let recipients: string[] | null = null
  if (body.test) {
    if (isAdmin) {
      message = { title: '¡Las notificaciones funcionan! 🌸', body: 'Te voy a avisar acá cuando entre un pedido o te suban un comprobante.', url: '/admin' }
    } else {
      // A team member checks their own phone.
      const { data: member } = await admin.from('team_members').select('id').eq('user_id', user.id).eq('active', true).maybeSingle()
      if (!member) return json(403, { error: 'Solo la administradora o el equipo' })
      recipients = [user.id]
      message = { title: '¡Las notificaciones funcionan! ✍️', body: 'Te voy a avisar acá cuando tengas un CV nuevo para armar.', url: '/equipo' }
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
      message = { title: `✍️ Nuevo CV para armar · pedido #${task.order_number}`, body: `${task.pack_name} de ${task.client_name}. Los textos ya están en tu panel.`, url: '/equipo' }
    } else {
      if (!member || member.user_id !== user.id) return json(403, { error: 'No es tu tarea' })
      message = { title: `✅ ${member.name} terminó el CV del pedido #${task.order_number}`, body: `${task.pack_name} de ${task.client_name}: listo para que lo revises y lo entregues.`, url: '/admin#equipo' }
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
  console.log('push result', { kind: body.test ? 'test' : body.kind, devices: subscriptions?.length ?? 0, sent, failed: errors.length })
  if (logged) await admin.from('push_log').update({ sent, failed: errors.length, error: errors.join(' | ') || null }).eq('order_id', logged.order_id).eq('kind', logged.kind)
  return json(200, { sent, devices: subscriptions?.length ?? 0 })
})
