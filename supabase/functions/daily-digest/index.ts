// Morning summary as a push notification (Monday to Saturday at 9, from pg_cron):
// to Vale, what needs her today; to each team member, the CVs they have pending. Nothing is sent when there is nothing to do.
// Called only by the database scheduler, with the key stored in Vault (cron_key).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import webpush from 'npm:web-push@3.6.7'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// ---- Same deadline rules as lib/dashboard.ts (4 business days, Express 1, after 5 pm or weekends start the next business day) ----
const AR_OFFSET = 3 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const isWeekend = (day: Date) => day.getUTCDay() === 0 || day.getUTCDay() === 6
function arDay(moment: Date) {
  const shifted = new Date(moment.getTime() - AR_OFFSET)
  return { day: new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())), hour: shifted.getUTCHours() }
}
function addBusinessDays(day: Date, count: number) {
  let result = day
  let added = 0
  while (added < count) { result = new Date(result.getTime() + DAY); if (!isWeekend(result)) added++ }
  return result
}
function businessDaysUntil(today: Date, deadline: Date) {
  const sign = deadline >= today ? 1 : -1
  let count = 0
  let cursor = today
  while (cursor.getTime() !== deadline.getTime()) { cursor = new Date(cursor.getTime() + sign * DAY); if (!isWeekend(cursor)) count += sign }
  return count
}
type DeadlineOrder = { paid_at: string | null; waiting_since: string | null; paused_days: number | null; order_items: { extras: { group_id: string }[] }[] }
function remainingDays(order: DeadlineOrder, now: Date) {
  if (!order.paid_at) return null
  const { day, hour } = arDay(new Date(order.paid_at))
  const start = isWeekend(day) || hour >= 17 ? addBusinessDays(day, 1) : day
  const express = order.order_items.some((item) => (item.extras ?? []).some((extra) => extra.group_id === 'express'))
  const due = addBusinessDays(start, (express ? 1 : 4) + (order.paused_days ?? 0))
  return businessDaysUntil(arDay(now).day, due)
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return json(401, { error: 'No autorizado' })

  const now = new Date()
  const today = arDay(now).day.toISOString().slice(0, 10)
  const messages: { userIds: string[]; title: string; body: string; url: string }[] = []

  // ---- Vale ----
  const [{ data: orders }, { data: readyTasks }, { data: admins }, { data: sessions }] = await Promise.all([
    admin.from('orders').select('id, status, payment_check, created_at, paid_at, waiting_since, paused_days, order_items(extras, products(delivery))').lt('number', 90000).neq('status', 'cancelled').neq('status', 'delivered'),
    admin.from('team_tasks').select('order_id, orders!inner(status)').eq('status', 'terminado').neq('orders.status', 'delivered'),
    admin.from('profiles').select('id').eq('role', 'admin'),
    // Same rule as lib/sessions.ts: a session bought with a CV waits until the CV is delivered.
    admin.from('sessions').select('orders(status, order_items(products(delivery)))').eq('status', 'to_schedule'),
  ])
  let late = 0, dueToday = 0, review = 0, unpaid = 0, stalled = 0
  for (const order of (orders ?? []) as (DeadlineOrder & { status: string; payment_check: string | null; created_at: string; order_items: { extras: { group_id: string }[]; products: { delivery: string } | null }[] })[]) {
    if (order.payment_check === 'pending' || order.status === 'payment_review') review++
    if (order.status === 'pending_payment' && now.getTime() - new Date(order.created_at).getTime() > DAY) unpaid++
    // Waiting for the customer for over a week: time to write to them.
    if (order.waiting_since && now.getTime() - new Date(order.waiting_since).getTime() > 7 * DAY) stalled++
    const service = order.order_items.some((item) => item.products?.delivery === 'service')
    if (service && (order.status === 'paid' || order.status === 'in_progress') && !order.waiting_since) {
      const remaining = remainingDays(order, now)
      if (remaining !== null && remaining < 0) late++
      else if (remaining === 0) dueToday++
    }
  }
  const teamReady = new Set((readyTasks ?? []).map((task) => task.order_id)).size
  const toSchedule = ((sessions ?? []) as { orders: { status: string; order_items: { products: { delivery: string } | null }[] } | null }[]).filter(({ orders: order }) => !(order && order.order_items.some((item) => item.products?.delivery === 'service') && order.status !== 'delivered' && order.status !== 'cancelled')).length
  const parts = [
    late && plural(late, 'pedido atrasado', 'pedidos atrasados'),
    dueToday && plural(dueToday, 'vence hoy', 'vencen hoy'),
    teamReady && plural(teamReady, 'CV del equipo listo para revisar', 'CVs del equipo listos para revisar'),
    review && plural(review, 'pago para revisar', 'pagos para revisar'),
    unpaid && plural(unpaid, 'pedido sin pagar hace más de un día', 'pedidos sin pagar hace más de un día'),
    toSchedule && plural(toSchedule, 'sesión para agendar', 'sesiones para agendar'),
    stalled && plural(stalled, 'cliente que no responde hace más de una semana', 'clientes que no responden hace más de una semana'),
  ].filter(Boolean) as string[]
  if (parts.length) messages.push({ userIds: (admins ?? []).map((row) => row.id), title: late || dueToday ? '☀️ Buen día, Vale: hoy hay entregas' : '☀️ Buen día, Vale', body: `${parts.join(' · ')}.`, url: late || dueToday || teamReady || review || unpaid || stalled ? '/admin#pedidos' : '/admin#sesiones' })

  // ---- Team ----
  const { data: members } = await admin.from('team_members').select('id, name, user_id').eq('active', true).not('user_id', 'is', null)
  for (const member of members ?? []) {
    const { data: tasks } = await admin.from('team_tasks').select('due_on').eq('member_id', member.id).neq('status', 'terminado')
    const pending = tasks?.length ?? 0
    if (!pending) continue
    const forToday = (tasks ?? []).filter((task) => task.due_on && task.due_on <= today).length
    messages.push({ userIds: [member.user_id!], title: `✍️ Buen día, ${member.name.split(' ')[0]}`, body: `Tenés ${plural(pending, 'CV para armar', 'CVs para armar')}${forToday ? `, ${forToday} para hoy` : ''}.`, url: '/equipo' })
  }

  // ?dry=1 shows what would be sent, without sending (to check it).
  if (new URL(request.url).searchParams.has('dry')) return json(200, { dry: true, messages: messages.map(({ title, body, url }) => ({ title, body, url })) })
  if (!messages.length) return json(200, { sent: 0, skipped: 'nada para hoy' })
  const { data: config } = await admin.rpc('push_config')
  if (!config?.private || !config?.public) return json(500, { error: 'Faltan las claves de notificación' })
  webpush.setVapidDetails('mailto:ayuda.armadodecv@gmail.com', config.public, config.private)

  let sent = 0
  for (const message of messages) {
    const { data: subscriptions } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', message.userIds)
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: message.title, body: message.body, url: message.url }), { TTL: 60 * 60 * 12, urgency: 'normal' })
        sent++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        else console.error('digest push failed', status, (error as Error).message)
      }
    }
  }
  console.log('daily digest', { messages: messages.length, sent })
  return json(200, { messages: messages.length, sent })
})
