// Web orders waiting for payment, so nobody needs to chase them by hand:
//   1. a few minutes after ordering: "recibí tu pedido", with the total and the transfer details;
//   2. the next day, if it is still unpaid: one reminder with the same details and a WhatsApp button.
// Only web orders from the last 4 days (older ones are Vale's call). Called every 10 minutes by pg_cron with the key
// stored in Vault (cron_key). Secrets: RESEND_API_KEY (and optionally FOLLOWUP_FROM, the sender).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const SITE = 'https://www.armadodecv.com'
const REPLY_TO = 'ayuda.armadodecv@gmail.com'
const WHATSAPP = '5491151060953'
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const ars = (value: number) => '$' + value.toLocaleString('es-AR')

type Order = {
  id: string; number: number; total: number; user_id: string | null; customer_name: string | null; customer_email: string | null
  created_at: string; order_mail_sent_at: string | null; order_items: { product_name: string }[]
}
type Payment = { alias: string; cbu: string; holder: string; bank: string | null }

function compose(order: Order, payment: Payment, reminder: boolean) {
  const name = (order.customer_name ?? '').trim().split(/\s+/)[0]
  const items = order.order_items.map((item) => item.product_name)
  // Only account holders can open their order from any device; a guest's order lives in the browser they used.
  const account = !order.customer_email
  const link = `${SITE}/cuenta/pedido/${order.id}`
  const chat = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`¡Hola Vale! Te escribo por mi pedido #${order.number} (${items.join(', ')}).`)}`
  const subject = reminder ? `Tu pedido #${order.number} te espera` : `Recibí tu pedido #${order.number}`
  const intro = reminder
    ? `Ayer hiciste el pedido <b>#${order.number}</b> y todavía no me llegó el pago. Te lo dejo reservado: si te quedó alguna duda, escribime y la vemos.`
    : `¡Gracias por tu pedido! Ya lo tengo: <b>#${order.number}</b>. Apenas me llega el pago, arranco.`
  const row = (label: string, value: string) => `<tr><td style="padding:4px 0;color:#6f6a62">${label}</td><td style="padding:4px 0;font-weight:700;color:#43202c" align="right">${escape(value)}</td></tr>`
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5efd9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efd9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#43202c;padding:20px 28px;color:#fbeaec;font-size:20px;font-weight:700">Armado de CV</td></tr>
<tr><td style="padding:28px;color:#3a2a30;font-size:15px;line-height:1.55">
<p style="margin:0 0 12px">¡Hola${name ? ` ${escape(name)}` : ''}! Soy Vale 👋</p>
<p style="margin:0 0 12px">${intro}</p>
<p style="margin:0 0 6px;font-weight:700;color:#43202c">Tu pedido</p>
<ul style="margin:0 0 16px;padding-left:20px">${items.map((item) => `<li style="margin:2px 0">${escape(item)}</li>`).join('')}</ul>
<p style="margin:0 0 6px;font-weight:700;color:#43202c">Para pagar por transferencia</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#fbeaec;border-radius:14px;padding:12px 16px">
${row('Total', ars(order.total))}${row('Alias', payment.alias)}${row('CBU/CVU', payment.cbu)}${row('Titular', payment.holder)}${payment.bank ? row('Banco', payment.bank) : ''}
</table>
<p style="margin:0 0 16px">Después mandame el comprobante: respondé este mail con la captura o mandámelo por WhatsApp.${account ? ' También lo podés subir en tu pedido, o pagar ahí con tarjeta.' : ''}</p>
${account ? `<p style="margin:0 0 12px" align="center"><a href="${link}" style="display:inline-block;background:#c9506d;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Ver mi pedido</a></p>` : ''}
<p style="margin:0 0 16px" align="center"><a href="${chat}" style="display:inline-block;background:#1fa855;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">Escribirme por WhatsApp</a></p>
<p style="margin:0;color:#6f6a62;font-size:13px">¿Dudas? Respondé este mail y te contesto yo.</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#fbeaec;color:#6f6a62;font-size:12px;line-height:1.5">Te escribo porque hiciste un pedido en armadodecv.com. ${reminder ? 'Es el único recordatorio que te mando.' : 'Si no lo pagás, te mando un solo recordatorio mañana.'}</td></tr>
</table></td></tr></table></body></html>`
  const text = `¡Hola${name ? ` ${name}` : ''}! Soy Vale.\n\n${intro.replace(/<[^>]+>/g, '')}\n\nTu pedido:\n${items.map((item) => `- ${item}`).join('\n')}\n\nPara pagar por transferencia:\nTotal: ${ars(order.total)}\nAlias: ${payment.alias}\nCBU/CVU: ${payment.cbu}\nTitular: ${payment.holder}${payment.bank ? `\nBanco: ${payment.bank}` : ''}\n\nDespués mandame el comprobante: respondé este mail o mandámelo por WhatsApp (${chat}).${account ? `\nTu pedido: ${link}` : ''}`
  return { subject, html, text }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return json(401, { error: 'No autorizado' })

  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!apiKey) return json(200, { skipped: 'Falta RESEND_API_KEY' })

  const now = Date.now()
  const ago = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString()
  const hour = (new Date().getUTCHours() + 21) % 24
  const daytime = hour >= 9 && hour < 21
  const select = 'id, number, total, user_id, customer_name, customer_email, created_at, order_mail_sent_at, order_items(product_name)'
  const base = () => admin.from('orders').select(select).eq('source', 'web').eq('status', 'pending_payment').gte('created_at', ago(4 * 24)).order('created_at').limit(25)
  // The first email any time of day (the person just ordered); the reminder only during the day.
  const [fresh, unpaid] = await Promise.all([
    base().is('order_mail_sent_at', null).lte('created_at', ago(0.1)),
    daytime ? base().not('order_mail_sent_at', 'is', null).is('payment_reminder_sent_at', null).lte('created_at', ago(22)) : Promise.resolve({ data: [], error: null }),
  ])
  const error = fresh.error ?? unpaid.error
  if (error) return json(500, { error: error.message })
  if (!fresh.data?.length && !unpaid.data?.length) return json(200, { sent: 0 })

  const { data: payment } = await admin.from('payment_settings').select('alias, cbu, holder, bank').maybeSingle()
  if (!payment) return json(200, { skipped: 'Faltan los datos de pago' })
  const sender = Deno.env.get('FOLLOWUP_FROM')?.trim() || 'Vale de Armado de CV <hola@armadodecv.com>'

  // Guests leave their email on the order; account holders have it in Auth (anonymous accounts have none).
  const emailOf = async (order: Order) => {
    if (order.customer_email) return order.customer_email
    if (!order.user_id) return null
    const { data } = await admin.auth.admin.getUserById(order.user_id)
    return data.user?.email ?? null
  }

  let sent = 0
  const failures: string[] = []
  const stamp = new Date().toISOString()
  const run = async (orders: Order[], reminder: boolean) => {
    const column = reminder ? 'payment_reminder_sent_at' : 'order_mail_sent_at'
    for (const order of orders) {
      const to = await emailOf(order)
      if (!to) { await admin.from('orders').update({ [column]: stamp }).eq('id', order.id); continue }
      const mail = compose(order, payment as Payment, reminder)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: sender, to: [to], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text }),
      })
      if (response.ok || response.status === 422) {
        await admin.from('orders').update({ [column]: stamp }).eq('id', order.id)
        if (response.ok) sent++; else failures.push(`422 #${order.number}`)
      } else {
        failures.push(`${response.status} ${(await response.text()).slice(0, 200)}`)
      }
    }
  }
  await run((fresh.data ?? []) as unknown as Order[], false)
  await run((unpaid.data ?? []) as unknown as Order[], true)
  return json(200, { sent, failures })
})
