// "Mis finanzas": every morning (pg_cron with x-cron-key, 9:00 Argentina) it looks for the fixed expenses and installments
// due today or in the next 2 days that aren't paid yet, and sends Vale one notification with them.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4'
import webpush from 'npm:web-push@3.6.7'

const DAY = 24 * 60 * 60 * 1000
const arDate = (moment: number) => new Date(moment - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
const ars = (value: number) => '$' + Math.round(value).toLocaleString('es-AR')
const pad = (value: number) => String(value).padStart(2, '0')

type Item = { id: string; kind: string; type: string; name: string; amount: number | null; due_day: number | null; plan: { n: number; due: string; amount: number }[] | null; active: boolean }
type Move = { item_id: string | null; period: string | null; installment: number | null; day: string }

Deno.serve(async (request) => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })

  const today = arDate(Date.now())
  const limit = arDate(Date.now() + 2 * DAY)
  const [{ data: items }, { data: moves }] = await Promise.all([
    admin.from('personal_items').select('id, kind, type, name, amount, due_day, plan, active').eq('active', true).eq('kind', 'gasto'),
    admin.from('personal_moves').select('item_id, period, installment, day').not('item_id', 'is', null),
  ])

  // Each fixed item's due date this month and next (so the 1st and 2nd of next month are seen at the end of this one).
  const due: { name: string; day: string; amount: number | null }[] = []
  const months = [today.slice(0, 7), limit.slice(0, 7)].filter((month, index, list) => list.indexOf(month) === index)
  for (const item of (items ?? []) as Item[]) {
    const paidFor = ((moves ?? []) as Move[]).filter((move) => move.item_id === item.id)
    if (item.type === 'fijo' && item.due_day) {
      for (const month of months) {
        const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
        const day = `${month}-${pad(Math.min(item.due_day, last))}`
        if (day < today || day > limit) continue
        if (paidFor.some((move) => (move.period ?? move.day.slice(0, 7)) === month)) continue
        due.push({ name: item.name, day, amount: item.amount })
      }
    }
    if (item.type === 'cuotas') {
      for (const step of item.plan ?? []) {
        if (step.due < today || step.due > limit) continue
        if (paidFor.some((move) => move.installment === step.n)) continue
        due.push({ name: `${item.name} (cuota ${step.n})`, day: step.due, amount: step.amount })
      }
    }
  }
  if (!due.length) return new Response(JSON.stringify({ due: 0 }))

  due.sort((a, b) => a.day.localeCompare(b.day))
  const when = (day: string) => (day === today ? 'hoy' : `el ${day.slice(8)}/${day.slice(5, 7)}`)
  const body = due.map((row) => `${row.name}${row.amount ? ` ${ars(row.amount)}` : ''} vence ${when(row.day)}`).join(' · ')
  await pushToAdmins(admin, due.length === 1 ? '📅 Tenés un vencimiento' : `📅 Tenés ${due.length} vencimientos`, body, '/admin#finanzas')
  return new Response(JSON.stringify({ due: due.length }))
})

async function pushToAdmins(admin: SupabaseClient, title: string, body: string, url: string) {
  const { data: config } = await admin.rpc('push_config')
  if (!config?.private || !config?.public) return
  webpush.setVapidDetails('mailto:ayuda.armadodecv@gmail.com', config.public, config.private)
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  const { data: subscriptions } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', (admins ?? []).map((row) => row.id))
  for (const subscription of subscriptions ?? []) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body: body.slice(0, 230), url }), { TTL: 60 * 60 * 24, urgency: 'normal' })
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    }
  }
}
