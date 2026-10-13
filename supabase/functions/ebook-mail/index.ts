// Guides bought without an account: once the order unlocks its e-books, the buyer gets an email with a private
// download link (/descargar?t=<download_token>), so they keep them on any device. Called every 10 minutes by pg_cron
// with the key stored in Vault (cron_key). One email per order. Secrets: RESEND_API_KEY (and optionally FOLLOWUP_FROM).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const SITE = 'https://www.armadodecv.com'
const REPLY_TO = 'ayuda.armadodecv@gmail.com'
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))

type Order = { id: string; number: number; customer_name: string | null; customer_email: string; download_token: string }

function compose(order: Order, titles: string[]) {
  const name = (order.customer_name ?? '').trim().split(/\s+/)[0] || ''
  const link = `${SITE}/descargar?t=${order.download_token}`
  const subject = titles.length > 1 ? `Tus guías de Armado de CV (pedido #${order.number})` : `Tu guía de Armado de CV (pedido #${order.number})`
  const list = titles.map((title) => `<li style="margin:4px 0">${escape(title)}</li>`).join('')
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5efd9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efd9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#43202c;padding:20px 28px;color:#fbeaec;font-size:20px;font-weight:700">Armado de CV</td></tr>
<tr><td style="padding:28px;color:#3a2a30;font-size:15px;line-height:1.55">
<p style="margin:0 0 12px">¡Hola${name ? ` ${escape(name)}` : ''}! Soy Vale 👋</p>
<p style="margin:0 0 12px">Gracias por tu compra (pedido #${order.number}). Ya podés descargar:</p>
<ul style="margin:0 0 16px;padding-left:20px">${list}</ul>
<p style="margin:0 0 24px" align="center"><a href="${link}" style="display:inline-block;background:#c9506d;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Descargar mis guías</a></p>
<p style="margin:0 0 12px;color:#6f6a62;font-size:13px">Guardá este mail: el link es personal y te sirve desde cualquier celular o compu.</p>
<p style="margin:0;color:#6f6a62;font-size:13px">¿Dudas? Respondé este mail y te contesto yo.</p>
</td></tr></table></td></tr></table></body></html>`
  const text = `¡Hola${name ? ` ${name}` : ''}! Soy Vale.\n\nGracias por tu compra (pedido #${order.number}). Ya podés descargar:\n${titles.map((title) => `- ${title}`).join('\n')}\n\nDescargar: ${link}\n\nGuardá este mail: el link es personal y te sirve desde cualquier dispositivo.`
  return { subject, html, text }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return json(401, { error: 'No autorizado' })

  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!apiKey) return json(200, { skipped: 'Falta RESEND_API_KEY' })

  // Orders with an email on them (bought without an account) whose e-books are already unlocked.
  const { data: orders, error } = await admin.from('orders')
    .select('id, number, customer_name, customer_email, download_token, user_id')
    .not('customer_email', 'is', null).is('ebook_mail_sent_at', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at').limit(50)
  if (error) return json(500, { error: error.message })

  const sender = Deno.env.get('FOLLOWUP_FROM')?.trim() || 'Vale de Armado de CV <hola@armadodecv.com>'
  let sent = 0
  const failures: string[] = []
  for (const order of (orders ?? []) as (Order & { user_id: string })[]) {
    const { data: downloads } = await admin.rpc('get_order_downloads', { p_token: order.download_token })
    const titles = ((downloads ?? []) as { title: string }[]).map((row) => row.title)
    if (!titles.length) continue
    const mail = compose(order, titles)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sender, to: [order.customer_email], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text }),
    })
    if (response.ok || response.status === 422) {
      await admin.from('orders').update({ ebook_mail_sent_at: new Date().toISOString() }).eq('id', order.id)
      if (response.ok) sent++; else failures.push(`422 #${order.number}`)
    } else {
      failures.push(`${response.status} ${(await response.text()).slice(0, 200)}`)
    }
  }
  return json(200, { sent, failures })
})
