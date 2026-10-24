// Test ATS follow-up, up to 3 emails per lead:
//   1. an hour after the test: the result and the packs;
//   2. two days later: how to fix what the test found (and the guide to do it alone);
//   3. five days later: last call, with a testimonial and a WhatsApp button to write to Vale.
// The 2nd and 3rd only go to leads whose first email announced them (followup_steps = 3), and to nobody who bought
// after the test or unsubscribed. Called every 10 minutes by pg_cron with the key stored in Vault (cron_key).
// Sends between 9 and 21 (Argentina). Secrets: RESEND_API_KEY (and optionally FOLLOWUP_FROM, the sender).
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

// One concrete fix per problem, for the second email.
const FIXES: Record<string, string> = {
  legible: 'Exportalo como PDF desde Word o Google Docs, sin escanearlo ni guardarlo como imagen: así el sistema puede leer el texto.',
  columnas: 'Pasá todo a una sola columna y sin tablas: el sistema lee de izquierda a derecha y mezcla lo que está en columnas.',
  contacto: 'Poné tu mail y tu teléfono como texto, arriba de todo, y no dentro del encabezado del documento.',
  secciones: 'Usá títulos simples que el sistema reconoce: Perfil, Experiencia laboral, Educación y Habilidades.',
  perfil: 'Sumá 3 o 4 líneas arriba de todo que digan qué puesto buscás y qué sabés hacer.',
  largo: 'Apuntá a una página si tenés poca experiencia, y a dos como máximo.',
  fechas: 'Poné mes y año de inicio y de fin en cada trabajo, por ejemplo 03/2022 – 08/2024.',
  logros: 'En cada trabajo sumá al menos un resultado con números: clientes por día, ventas, tiempos que mejoraste.',
  vinetas: 'Contá las tareas en viñetas cortas que empiecen con un verbo: Atendí, Organicé, Vendí.',
  datos: 'Sacá el DNI, el estado civil y la dirección completa: no suman y le restan lugar a tu experiencia.',
  imagenes: 'Cambiá los íconos y las barras de nivel por texto: el sistema no los lee.',
  encabezado: 'Sacá el título "Curriculum Vitae": lo primero tiene que ser tu nombre.',
  frases: 'Cambiá frases como "proactiva y responsable" por hechos concretos de lo que hiciste.',
  palabras: 'Tomá del aviso las palabras del puesto que sí tenés (tareas, herramientas) y usalas tal cual en tu CV.',
  experiencia: 'Revisá que cada trabajo tenga fechas claras: así el sistema suma bien tus años de experiencia.',
}

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const ars = (value: number) => '$' + value.toLocaleString('es-AR')

type Lead = { id: string; name: string; email: string; phone: string | null; score: number; issues: string[]; area: string | null; unsubscribe_token: string; created_at: string }
type Prices = { from: number | null; firstJob: number | null; guide: number | null; kit: number | null }
type Testimonial = { name: string; text: string; service: string | null } | null
const WHATSAPP = '5491151060953'

// The frame every email shares: header, body and the footer with the unsubscribe link.
function layout(body: string, footer: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5efd9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efd9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#43202c;padding:20px 28px;color:#fbeaec;font-size:20px;font-weight:700">Armado de CV</td></tr>
<tr><td style="padding:28px;color:#3a2a30;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 28px;background:#fbeaec;color:#6f6a62;font-size:12px;line-height:1.5">${footer}</td></tr>
</table></td></tr></table></body></html>`
}
const button = (href: string, label: string, color = '#c9506d') =>
  `<p style="margin:0 0 16px" align="center"><a href="${href}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">${label}</a></p>`
const footerText = (unsubscribe: string, last: boolean) =>
  `Te escribo porque hiciste el test ATS en armadodecv.com y aceptaste que te contacte sobre tu CV. ${last ? 'Es el último mail que te mando por el test.' : 'Por el test te mando 3 mails como máximo.'} <a href="${unsubscribe}" style="color:#a8435e">No quiero recibir más mails</a>.`

function compose(lead: Lead, from: number | null, firstJob: number | null, guide: number | null) {
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
    : `Te armo dos CV a medida: uno moderno, para mandar por mail o entregar, y otro optimizado para ATS, que pasa los filtros. En 3 a 4 días hábiles${from ? `, desde ${ars(from)}` : ''}.${firstJob ? ` ¿Es tu primer trabajo? Tenés el <b>Pack Primer Empleo</b> a ${ars(firstJob)}.` : ''}${guide ? ` ¿Preferís corregirlo vos? La guía <b>CV a prueba de filtros ATS</b> sale ${ars(guide)} y la descargás al toque.` : ''}`
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
<tr><td style="padding:16px 28px;background:#fbeaec;color:#6f6a62;font-size:12px;line-height:1.5">Te escribo porque hiciste el test ATS en armadodecv.com y aceptaste que te contacte sobre tu CV. Por el test te mando 3 mails como máximo. <a href="${unsubscribe}" style="color:#a8435e">No quiero recibir más mails</a>.</td></tr>
</table></td></tr></table></body></html>`
  const text = `¡Hola ${name}! Soy Vale.\n\nHace un rato hiciste el test ATS en la web y tu CV sacó ${lead.score}/100${lead.area && AREAS[lead.area] ? ` para ${AREAS[lead.area]}` : ''}.\n${issues.length ? `\nLo que más le está restando:\n${issues.map((issue) => `- ${issue}`).join('\n')}\n` : ''}\n${offer.replace(/<[^>]+>/g, '')}\n\nVer los packs: ${packs}\n\n¿Dudas? Respondé este mail.\n\nNo quiero recibir más mails: ${unsubscribe}`
  return { subject, html, text, unsubscribe }
}

// 2nd email, two days later: one concrete fix per problem, and the guide for whoever prefers to do it alone.
function composeFix(lead: Lead, prices: Prices) {
  const name = lead.name.trim().split(/\s+/)[0]
  const fixes = lead.issues.filter((id) => FIXES[id] && ISSUES[id]).slice(0, 3)
  const guides = `${SITE}/?utm_source=email&utm_medium=test_ats&utm_campaign=seguimiento2#guias`
  const packs = `${SITE}/?utm_source=email&utm_medium=test_ats&utm_campaign=seguimiento2#precios`
  const unsubscribe = `${SITE}/baja?t=${lead.unsubscribe_token}`
  const subject = `${name}, cómo arreglar lo que le resta puntos a tu CV`
  const list = fixes.length
    ? `<ol style="margin:0 0 16px;padding-left:20px">${fixes.map((id) => `<li style="margin:0 0 10px"><b style="color:#43202c">${escape(ISSUES[id][0].toUpperCase() + ISSUES[id].slice(1))}.</b><br>${escape(FIXES[id])}</li>`).join('')}</ol>`
    : `<p style="margin:0 0 16px">Una sola columna, títulos simples (Perfil, Experiencia laboral, Educación, Habilidades) y fechas en cada trabajo: con eso ya pasás la mayoría de los filtros.</p>`
  const guide = prices.guide ? `Si lo querés corregir por tu cuenta, la guía <b>CV a prueba de filtros ATS</b> (${ars(prices.guide)}) te lleva paso a paso.${prices.kit ? ` O llevate el <b>Kit Búsqueda Laboral</b> (${ars(prices.kit)}): esa guía más LinkedIn, portales de empleo y búsqueda organizada.` : ''}` : ''
  const body = `<p style="margin:0 0 12px">¡Hola ${escape(name)}! Soy Vale de nuevo 👋</p>
<p style="margin:0 0 12px">Hace dos días hiciste el test ATS y tu CV sacó <b>${lead.score}/100</b>. Te dejo cómo arreglar lo que más le resta:</p>
${list}
${guide ? `<p style="margin:0 0 16px">${guide}</p>${button(guides, prices.kit ? 'Ver las guías' : 'Ver la guía')}` : ''}
<p style="margin:0 0 12px">¿Preferís que lo haga yo? Te armo los dos CV a medida${prices.from ? `, desde ${ars(prices.from)}` : ''}, en 3 a 4 días hábiles. <a href="${packs}" style="color:#c9506d;font-weight:700">Ver los packs</a></p>
<p style="margin:0;color:#6f6a62;font-size:13px">¿Dudas? Respondé este mail y te contesto yo.</p>`
  const plainFixes = fixes.length
    ? fixes.map((id, index) => `${index + 1}. ${ISSUES[id]}: ${FIXES[id]}`).join('\n')
    : 'Una sola columna, títulos simples y fechas en cada trabajo: con eso ya pasás la mayoría de los filtros.'
  const text = `¡Hola ${name}! Soy Vale de nuevo.\n\nHace dos días hiciste el test ATS y tu CV sacó ${lead.score}/100. Así arreglás lo que más le resta:\n\n${plainFixes}\n\n${guide ? `${guide.replace(/<[^>]+>/g, '')}\nVer la guía: ${guides}\n\n` : ''}¿Preferís que lo haga yo? Ver los packs: ${packs}\n\nNo quiero recibir más mails: ${unsubscribe}`
  return { subject, html: layout(body, footerText(unsubscribe, false)), text, unsubscribe }
}

// 3rd and last email, five days after the test: a real testimonial and a button to write to Vale on WhatsApp.
function composeLast(lead: Lead, prices: Prices, testimonial: Testimonial) {
  const name = lead.name.trim().split(/\s+/)[0]
  const packs = `${SITE}/?utm_source=email&utm_medium=test_ats&utm_campaign=seguimiento3#precios`
  const unsubscribe = `${SITE}/baja?t=${lead.unsubscribe_token}`
  const chat = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`¡Hola Vale! Soy ${name}. Hice el test ATS y saqué ${lead.score}/100. Quiero que me ayudes con mi CV.`)}`
  const subject = `${name}, ¿seguís buscando trabajo?`
  const quote = testimonial
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td style="background:#fbeaec;border-radius:14px;padding:16px 18px;color:#43202c;font-size:14px;line-height:1.5"><i>"${escape(testimonial.text)}"</i><br><b style="display:inline-block;margin-top:6px">${escape(testimonial.name)}</b>${testimonial.service ? ` · ${escape(testimonial.service)}` : ''}</td></tr></table>`
    : ''
  const body = `<p style="margin:0 0 12px">¡Hola ${escape(name)}! Te escribo una última vez por el test ATS.</p>
<p style="margin:0 0 12px">Si seguís mandando CV y no te llaman, no es por vos: muchas veces el CV ni siquiera llega a una persona. Eso tiene arreglo.</p>
${quote}
<p style="margin:0 0 16px">Te armo dos CV a medida, uno moderno y otro que pasa los filtros${prices.from ? `, desde ${ars(prices.from)}` : ''}.${prices.firstJob ? ` Si es tu primer trabajo, el <b>Pack Primer Empleo</b> sale ${ars(prices.firstJob)}.` : ''} Escribime y te digo cuál te conviene.</p>
${button(chat, 'Escribirme por WhatsApp', '#1fa855')}
<p style="margin:0 0 12px" align="center"><a href="${packs}" style="color:#c9506d;font-weight:700">O mirá los packs en la web</a></p>`
  const text = `¡Hola ${name}! Te escribo una última vez por el test ATS.\n\nSi seguís mandando CV y no te llaman, no es por vos: muchas veces el CV ni siquiera llega a una persona.\n${testimonial ? `\n"${testimonial.text}" (${testimonial.name})\n` : ''}\nTe armo dos CV a medida${prices.from ? `, desde ${ars(prices.from)}` : ''}. Escribime por WhatsApp: ${chat}\n\nPacks: ${packs}\n\nNo quiero recibir más mails: ${unsubscribe}`
  return { subject, html: layout(body, footerText(unsubscribe, true)), text, unsubscribe }
}

const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '').slice(-10)

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
  const ago = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString()
  const base = () => admin.from('ats_checks').select('id, name, email, phone, score, issues, area, unsubscribe_token, created_at')
    .not('email', 'is', null).is('unsubscribed_at', null).order('created_at').limit(25)
  const [first, second, third] = await Promise.all([
    base().is('followup_sent_at', null).lte('created_at', ago(1)).gte('created_at', ago(72)),
    base().eq('followup_steps', 3).not('followup_sent_at', 'is', null).is('followup2_sent_at', null).lte('created_at', ago(44)).gte('created_at', ago(7 * 24)),
    base().eq('followup_steps', 3).not('followup2_sent_at', 'is', null).is('followup3_sent_at', null)
      .lte('followup2_sent_at', ago(60)).lte('created_at', ago(5 * 24)).gte('created_at', ago(12 * 24)),
  ])
  const error = first.error ?? second.error ?? third.error
  if (error) return json(500, { error: error.message })
  if (!first.data?.length && !second.data?.length && !third.data?.length) return json(200, { sent: 0 })

  // "Desde" for the two-CV offer; the first-job pack (one CV) is offered apart.
  const { data: products } = await admin.from('products').select('id, price').eq('active', true).in('id', ['cv-simple', 'cv-medium', 'cv-premium', 'cv-primer-empleo', 'guia-ats', 'kit-busqueda'])
  const rows = (products ?? []) as { id: string; price: number }[]
  const packPrices = rows.filter((product) => product.id.startsWith('cv-') && product.id !== 'cv-primer-empleo' && product.price > 0).map((product) => product.price)
  const prices: Prices = {
    from: packPrices.length ? Math.min(...packPrices) : null,
    firstJob: rows.find((product) => product.id === 'cv-primer-empleo')?.price ?? null,
    // The do-it-yourself option for people who won't pay for a pack.
    guide: rows.find((product) => product.id === 'guia-ats')?.price ?? null,
    kit: rows.find((product) => product.id === 'kit-busqueda')?.price ?? null,
  }
  const sender = Deno.env.get('FOLLOWUP_FROM')?.trim() || 'Vale de Armado de CV <hola@armadodecv.com>'

  // Whoever ordered after the test (web or WhatsApp, matched by mail or phone) gets no more sales emails.
  const { data: orders } = await admin.from('orders').select('customer_email, customer_phone, created_at').neq('status', 'cancelled').gte('created_at', ago(13 * 24))
  const bought = (lead: Lead) => (orders ?? []).some((order) => order.created_at >= lead.created_at && (
    (order.customer_email && order.customer_email.toLowerCase() === lead.email.toLowerCase()) ||
    (digits(lead.phone).length === 10 && digits(order.customer_phone) === digits(lead.phone))))
  const { data: quotes } = await admin.from('testimonials').select('name, text, service').eq('active', true).order('sort').limit(10)
  const pickQuote = (): Testimonial => {
    const short = ((quotes ?? []) as NonNullable<Testimonial>[]).filter((quote) => quote.text.length <= 320)
    return short.length ? short[Math.floor(Math.random() * short.length)] : null
  }

  let sent = 0
  const failures: string[] = []
  const stamp = new Date().toISOString()
  const deliver = async (lead: Lead, mail: { subject: string; html: string; text: string; unsubscribe: string }, done: Record<string, unknown>) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender, to: [lead.email], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text,
        headers: { 'List-Unsubscribe': `<${mail.unsubscribe}>` },
      }),
    })
    if (response.ok) {
      await admin.from('ats_checks').update(done).eq('id', lead.id)
      sent++
    } else {
      failures.push(`${response.status} ${(await response.text()).slice(0, 200)}`)
      // An address Resend rejects (422) is not retried every 10 minutes: it is marked as handled.
      if (response.status === 422) await admin.from('ats_checks').update(done).eq('id', lead.id)
    }
  }
  for (const lead of (first.data ?? []) as Lead[]) {
    await deliver(lead, compose(lead, prices.from, prices.firstJob, prices.guide), { followup_sent_at: stamp, followup_steps: 3 })
  }
  for (const lead of (second.data ?? []) as Lead[]) {
    if (bought(lead)) { await admin.from('ats_checks').update({ followup2_sent_at: stamp, followup3_sent_at: stamp }).eq('id', lead.id); continue }
    await deliver(lead, composeFix(lead, prices), { followup2_sent_at: stamp })
  }
  for (const lead of (third.data ?? []) as Lead[]) {
    if (bought(lead)) { await admin.from('ats_checks').update({ followup3_sent_at: stamp }).eq('id', lead.id); continue }
    await deliver(lead, composeLast(lead, prices, pickQuote()), { followup3_sent_at: stamp })
  }
  return json(200, { sent, failures })
})
