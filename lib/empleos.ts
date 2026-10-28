/**
 * Open positions of big employers, read live from their official job portals, for the "Cómo y dónde postularte"
 * landing pages that the Instagram carousels point to. Each posting links to the company's own page to apply.
 */

export type Opening = { title: string; place: string; detail: string; posted: string; url: string; entry: boolean }

type Company = {
  name: string
  legalName: string
  logo: string
  logoSize: [number, number]
  /** Where the openings come from: a HiringRoom portal (20 per page at /jobs/index/<page>), a Genoma.work jobs site or a SuccessFactors career site (its public XML feed). */
  source: { kind: 'hiringroom'; portal: string } | { kind: 'genoma'; slug: string } | { kind: 'successfactors'; host: string; company: string }
  /** Public page with all the openings, for the fallback link and the "your zone isn't listed" note. */
  portal: string
  /** "Hoy <legalName> tiene <n> <countText> en su portal oficial." */
  countText: string
  /** 'entry' splits store/plant jobs from office ones (entry matches the first); 'place' lists every opening by city. */
  group: { by: 'entry'; entry: RegExp; title: string; text: string } | { by: 'place'; title: string; text: string }
  steps: string[]
  more: string
}

export const COMPANIES: Record<string, Company> = {
  starbucks: {
    name: 'Starbucks',
    legalName: 'Starbucks Argentina',
    logo: '/img/empresas/starbucks.png',
    logoSize: [1024, 1024],
    source: { kind: 'genoma', slug: 'sbx-ar' },
    portal: 'https://app.genoma.work/jobs/sbx-ar',
    countText: 'locales con búsqueda de barista abierta',
    group: { by: 'place', title: 'Barista, local por local', text: 'Buscá tu zona y postulate a los locales que te queden cerca. En el portal también podés elegir varios locales a la vez.' },
    steps: [
      'Elegí el local que te quede cerca (o varios a la vez) y tocá "Postularme".',
      'Se abre su portal oficial: completá tus datos.',
      'Hacé las evaluaciones online en un lugar tranquilo, con buena conexión: tenés un solo intento.',
      'Tené tu CV listo en PDF para cuando te lo pidan.',
    ],
    more: 'Las búsquedas son de su portal oficial, el mismo al que lleva el botón "Postular acá" de starbucks.com.ar.',
  },
  laanonima: {
    name: 'La Anónima',
    legalName: 'La Anónima',
    logo: '/img/empresas/laanonima.png',
    logoSize: [960, 514],
    source: { kind: 'hiringroom', portal: 'https://laanonima.hiringroom.com' },
    portal: 'https://laanonima.hiringroom.com/jobs',
    countText: 'búsquedas abiertas',
    group: { by: 'entry', entry: /sucursal|caja|reposici|operari|personal|asesor|maestranza/i, title: 'Sucursales y depósitos', text: 'Cajas, reposición, carnicería, panadería, limpieza, depósito y mantenimiento. Casi todas piden secundario completo; leé los requisitos de cada aviso.' },
    steps: [
      'Elegí la búsqueda que va con tu perfil y tu zona.',
      'Tocá "Postularme": se abre el portal oficial de la empresa.',
      'Completá tus datos y cargá tu CV en PDF, sin columnas ni tablas, para que el sistema lo lea bien.',
      'Te escribe INDI, su asistente virtual, por WhatsApp: respondé sus preguntas rápido y completo.',
    ],
    more: '¿No encontrás tu zona? En el portal oficial también podés subir tu CV a su base general.',
  },
  aeropuertos: {
    name: 'Aeropuertos Argentina',
    legalName: 'Aeropuertos Argentina',
    logo: '/img/empresas/aeropuertos.png',
    logoSize: [1152, 144],
    source: { kind: 'successfactors', host: 'https://career19.sapsf.com', company: 'aeropuerto' },
    portal: 'https://career19.sapsf.com/career?company=aeropuerto',
    countText: 'búsquedas abiertas',
    group: { by: 'entry', entry: /auxiliar|asistente|operario|nivel \d|mantenimiento/i, title: 'En los aeropuertos', text: 'Operaciones y mantenimiento en aeropuertos de todo el país. Casi todas piden secundario completo y disponibilidad para turnos rotativos; leé los requisitos de cada aviso.' },
    steps: [
      'Elegí la búsqueda que va con tu perfil y tu zona.',
      'Tocá "Postularme": se abre su portal oficial de empleos.',
      'Creá tu usuario y cargá tu CV en PDF, sin columnas ni tablas, para que el sistema lo lea bien.',
      'Revisá tu mail (y el spam): por ahí te avisan si avanzás a la entrevista.',
    ],
    more: 'Las búsquedas son de su portal oficial, el mismo al que lleva "Trabajá con nosotros" de aeropuertosargentina.com.',
  },
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', '#39': "'", aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ' }

function clean(text: string) {
  return text.replace(/&(\w+|#39);/g, (all, name: string) => ENTITIES[name] ?? all).replace(/\s+/g, ' ').trim()
}

async function hiringroom(portal: string, entry: RegExp | null): Promise<Opening[] | null> {
  const openings: Opening[] = []
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`${portal}/jobs/index/${page}`, { next: { revalidate: 3600 } })
    if (!response.ok) return openings.length ? openings : null
    const html = await response.text()
    const cards = html.split('href="/jobs/get_vacancy/').slice(1)
    for (const card of cards) {
      const id = card.slice(0, 24)
      const title = clean(card.match(/name__vacancy">([^<]*)</)?.[1] ?? '')
      if (!title || openings.some((job) => job.url.endsWith(id))) continue
      const place = clean(card.match(/hr-Location-pin[^>]*><\/i>([^<]*)</)?.[1] ?? '').replace(/, Argentina$/, '')
      const posted = clean(card.match(/fs-12">([^<]*)<\/p>/)?.[1] ?? '')
      openings.push({ title, place: place || 'Varias sucursales', detail: '', posted, url: `${portal}/jobs/get_vacancy/${id}`, entry: entry?.test(title) ?? true })
    }
    const total = Number(html.match(/de (\d+) vacantes/)?.[1] ?? 0)
    if (!cards.length || openings.length >= total) break
  }
  return openings
}

type GenomaJob = { id: string; job_application: string; location_city: string | null; address: string | null; branches: string[] }

async function genoma(slug: string): Promise<Opening[] | null> {
  const response = await fetch(`https://api.genoma.work/api/v1/gamesandtests/${slug}/jobslisting/`, { next: { revalidate: 3600 } })
  if (!response.ok) return null
  const data = (await response.json()) as { jobapplications: GenomaJob[] }
  return data.jobapplications.map((job) => {
    // The one posting that holds every store lets people apply to several at once.
    const many = job.branches.length > 1
    const city = clean(job.location_city ?? '')
    return {
      title: many ? 'Varios locales a la vez' : clean(job.job_application),
      place: many || !city || city === 'Argentina' || city === 'Todas las ciudades' ? 'Varias zonas' : city,
      detail: clean(job.address ?? ''),
      posted: '',
      url: many ? `https://app.genoma.work/jobs/${slug}` : `https://app.genoma.work/startprocess/${job.id}/`,
      entry: true,
    }
  })
}

const KEEP_UPPER = new Set(['C', 'SR', 'SSR', 'JR', 'RRHH'])

/** "AUXILIAR C DE MANTENIMIENTO" -> "Auxiliar C de mantenimiento"; titles already in mixed case stay as they are. */
function sentenceCase(title: string) {
  if (title !== title.toUpperCase()) return title.replace(/\.$/, '')
  const words = title.toLowerCase().split(' ').map((word) => (KEEP_UPPER.has(word.toUpperCase()) ? word.toUpperCase() : word))
  return words.join(' ').replace(/^./, (first) => first.toUpperCase())
}

function stripTags(html: string) {
  return clean(html.replace(/<[^>]*>/g, ' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''))
}

async function successfactors(host: string, company: string, entry: RegExp | null): Promise<Opening[] | null> {
  const response = await fetch(`${host}/career?company=${company}&career_ns=job_listing_summary&resultType=XML&rcm_site_locale=es_ES`, { next: { revalidate: 3600 } })
  if (!response.ok) return null
  const xml = await response.text()
  return xml.split('<Job>').slice(1).map((job) => {
    const raw = clean(job.match(/<JobTitle><!\[CDATA\[([^\]]*)\]\]>/)?.[1] ?? '')
    const id = job.match(/<ReqId>(\d+)</)?.[1] ?? ''
    const description = job.match(/<Job-Description><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? ''
    // "AUXILIAR C DE OPERACIONES - Jujuy": the airport goes in the title; the rest say where in "Ubicación:".
    const [name, airport] = raw.split(/\s+-\s+/)
    // Some postings are just called "NIVEL 1": their first heading says what the job is.
    const heading = /^nivel \d/i.test(name) ? stripTags(description.match(/<h[12]>([^<]*)</)?.[1] ?? '') : ''
    const where = stripTags(description.match(/(?:Ubicaci[oó]n|Lugar de [Tt]rabajo)\s*:?\s*(?:<\/strong>)?\s*:?([^<]*)/)?.[1] ?? '')
    const title = heading || sentenceCase(name)
    return {
      title,
      place: airport ? `Aeropuerto de ${airport.replace(/^Rio /, 'Río ')}` : 'Buenos Aires',
      detail: airport ? '' : where,
      posted: '',
      url: `${host}/career?career_ns=job_listing&company=${company}&career_job_req_id=${id}&rcm_site_locale=es_ES`,
      entry: entry?.test(title) ?? true,
    }
  })
}

/** All open positions, or null when the portal doesn't answer (the page then links to the portal). */
export async function getOpenings(slug: string): Promise<Opening[] | null> {
  const company = COMPANIES[slug]
  if (!company) return null
  try {
    if (company.source.kind === 'genoma') return await genoma(company.source.slug)
    const entry = company.group.by === 'entry' ? company.group.entry : null
    if (company.source.kind === 'successfactors') return await successfactors(company.source.host, company.source.company, entry)
    return await hiringroom(company.source.portal, entry)
  } catch {
    return null
  }
}
