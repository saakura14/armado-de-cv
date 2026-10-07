// Test ATS follow-up: an hour after someone does the test, an email with their result and the packs.
// Called every 10 minutes by pg_cron with the key stored in Vault (cron_key). Sends between 9 and 21 (Argentina),
// once per lead, never after an unsubscribe. Secrets: RESEND_API_KEY (and optionally FOLLOWUP_FROM, the sender).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const SITE = 'https://www.armadodecv.com'
const REPLY_TO = 'ayuda.armadodecv@gmail.com'

// Same names as lib/ats-roles.ts and CHECK_LABELS in lib/ats-check.ts, written for the person.
const AREAS: Record<string, string> = {
  administracion: 'administración y contabilidad', atencion: 'atención al cliente', comercio: 'comercio y ventas', logistica: 'logística y depósito',
  gastronomia: 'gastronomía y hotelería', salud: 'salud y enfermería', it: 'tecnología y sistemas', rrhh: 'recursos humanos',
  marketing: 'marketing y comunicación', educacion: 'educación', industria: 'producción e industria',
}
const ISSUES: Record<string, string> = {
  legible: 'el sistema no puede leer tu CV (está como imagen)',
  columnas: 'las columnas o tablas, que desordenan tu información',
  contacto: 'datos de contacto que el sistema no encuentra',
  secciones: 'títulos de secciones que el sistema no reconoce',
  perfil: 'falta un perfil profesional claro',
  largo: 'el largo del CV',
  fechas: 'faltan las fechas de tus trabajos',
  logros: 'no hay logros con números',
  vinetas: 'las tareas no están en viñetas claras',
  datos: 'datos personales que no hacen falta',
  imagenes: 'íconos o gráficos que el sistema no lee',
  encabezado: 'el título "Curriculum Vitae" arriba de todo',
  frases: 'frases genéricas en lugar de hechos',
  palabras: 'te faltan palabras clave del puesto',
  experiencia: 'el sistema no te cuenta los años de experiencia que piden',
}

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const ars = (value: number) => '$' + value.toLocaleString('es-AR')

type Lead = { id: string; name: string; email: string; score: number; issues: string[]; area: string | null; unsubscribe_token: string }

function compose(lead: Lead, from: number | null, firstJob: number | null) {
  const name = lead.name.trim().split(/\s+/)[0]
  const first = escape(name)
  const area = lead.area && AREAS[lead.area] ? ` para <b>${AREAS[lead.area]}</b>` : ''
  const issues = lead.issues.map((id) => ISSUES[id]).filter(Boolean).slice(0, 3)
  const good = lead.score >= 85
  const packs = `${SITE}/?utm_source=email&utm_medium=test_ats&utm_campaign=seguimiento#precios`
  const unsubscribe = `${SITE}/baja?t=${lead.unsubscribe_token}`
  const subject = good ? `${name}, tu CV pasa los filtros: así lo hacés destacar` : `${name}, tu CV sacó ${lead.score}/100 en el test ATS`
  const intro = good
    ? `Tu CV sacó <b>${lead.score}/100</b>${area}: pasa los filtros básicos. Ahora la diferencia está en cómo contás tu experiencia y en que te encuentren en LinkedIn.`
    : `Tu CV sacó <b>${lead.score}/100</b>${area}. Eso quiere decir que, en muchas búsquedas, el sistema lo deja abajo del ranking o lo descarta antes de que lo lea una persona.`
  const list = issues.length ? `<p style="margin:16px 0 6px;font-weight:700;color:#43202c">Lo que más le está restando:</p><ul style="margin:0;padding-left:20px;color:#3a2a30">${issues.map((issue) => `<li style="margin:4px 0">${escape(issue)}</li>`).join('')}</ul>` : ''
  const offer = good
    ? 'Con el <b>Pack Premium</b> reviso y potencio tu CV, y sumamos tu perfil de LinkedIn y la carta de presentación.'
    : `Te armo dos CV a medida: uno moderno, para mandar por mail o entregar, y otro optimizado para ATS, que pasa los filtros. En 3 a 4 días hábiles${from ? `, desde ${ars(from)}` : ''}.${firstJob ? ` ¿Es tu primer trabajo? Tenés el <b>Pack Primer Empleo</b> a ${ars(firstJob)}.` : ''}`
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5efd9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efd9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#43202c;padding:20px 28px;color:#fbeaec;font-size:20px;font-weight:700">Armado de CV</td></tr>
<tr><td style="padding:28px;color:#3a2a30;font-size:15px;line-height:1.55">
<p style="margin:0 0 12px">¡Hola ${first}! Soy Vale 👋</p>
<p style="margin:0 0 12px">Hace un rato hiciste el test ATS en la web. ${intro}</p>
${list}
<p style="margin:16px 0 12px">El test es una guía automática: mira el formato y las palabras, pero no sabe si tu experiencia está bien contada ni si convencés a un reclutador. Eso lo reviso yo, persona a persona.</p>
<p style="margin:0 0 20px">${offer}</p>
<p style="margin:0 0 24px" align="center"><a href="${packs}" style="display:inline-block;background:#c9506d;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Ver los packs</a></p>
<p style="margin:0;color:#6f6a62;font-size:13px">¿Dudas? Respondé este mail y te contesto yo.</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#fbeaec;color:#6f6a62;font-size:12px;line-height:1.5">Te escribo porque hiciste el test ATS en armadodecv.com y aceptaste que te contacte sobre tu CV. Es el único mail que te mando por el test. <a href="${unsubscribe}" style="color:#a8435e">No quiero recibir más mails</a>.</td></tr>
</table></td></tr></table></body></html>`
  const text = `¡Hola ${name}! Soy Vale.\n\nHace un rato hiciste el test ATS en la web y tu CV sacó ${lead.score}/100${lead.area && AREAS[lead.area] ? ` para ${AREAS[lead.area]}` : ''}.\n${issues.length ? `\nLo que más le está restando:\n${issues.map((issue) => `- ${issue}`).join('\n')}\n` : ''}\n${offer.replace(/<[^>]+>/g, '')}\n\nVer los packs: ${packs}\n\n¿Dudas? Respondé este mail.\n\nNo quiero recibir más mails: ${unsubscribe}`
  return { subject, html, text, unsubscribe }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return json(401, { error: 'No autorizado' })

  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!apiKey) return json(200, { skipped: 'Falta RESEND_API_KEY' })
  // Only during the day in Argentina: a test done at night gets its email in the morning.
  const hour = (new Date().getUTCHours() + 21) % 24
  if (hour < 9 || hour >= 21) return json(200, { skipped: 'Fuera de horario' })

  const now = Date.now()
  const { data: leads, error } = await admin.from('ats_checks')
    .select('id, name, email, score, issues, area, unsubscribe_token')
    .not('email', 'is', null).is('followup_sent_at', null).is('unsubscribed_at', null)
    .lte('created_at', new Date(now - 60 * 60 * 1000).toISOString())
    .gte('created_at', new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at').limit(25)
  if (error) return json(500, { error: error.message })
  if (!leads?.length) return json(200, { sent: 0 })

  // "Desde" for the two-CV offer; the first-job pack (one CV) is offered apart.
  const { data: products } = await admin.from('products').select('id, price').eq('active', true).in('id', ['cv-simple', 'cv-medium', 'cv-premium', 'cv-primer-empleo'])
  const rows = (products ?? []) as { id: string; price: number }[]
  const prices = rows.filter((product) => product.id !== 'cv-primer-empleo' && product.price > 0).map((product) => product.price)
  const from = prices.length ? Math.min(...prices) : null
  const firstJob = rows.find((product) => product.id === 'cv-primer-empleo')?.price ?? null
  const sender = Deno.env.get('FOLLOWUP_FROM')?.trim() || 'Vale de Armado de CV <hola@armadodecv.com>'

  let sent = 0
  const failures: string[] = []
  for (const lead of leads as Lead[]) {
    const mail = compose(lead, from, firstJob)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender, to: [lead.email], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text,
        headers: { 'List-Unsubscribe': `<${mail.unsubscribe}>` },
      }),
    })
    if (response.ok) {
      await admin.from('ats_checks').update({ followup_sent_at: new Date().toISOString() }).eq('id', lead.id)
      sent++
    } else {
      failures.push(`${response.status} ${(await response.text()).slice(0, 200)}`)
      // An address Resend rejects (422) is not retried every 10 minutes: it is marked as handled.
      if (response.status === 422) await admin.from('ats_checks').update({ followup_sent_at: new Date().toISOString() }).eq('id', lead.id)
    }
  }
  return json(200, { sent, failures })
})
