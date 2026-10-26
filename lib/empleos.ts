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
  /** Where the openings come from: a HiringRoom portal (20 per page at /jobs/index/<page>) or a Genoma.work jobs site. */
  source: { kind: 'hiringroom'; portal: string } | { kind: 'genoma'; slug: string }
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

/** All open positions, or null when the portal doesn't answer (the page then links to the portal). */
export async function getOpenings(slug: string): Promise<Opening[] | null> {
  const company = COMPANIES[slug]
  if (!company) return null
  try {
    if (company.source.kind === 'genoma') return await genoma(company.source.slug)
    return await hiringroom(company.source.portal, company.group.by === 'entry' ? company.group.entry : null)
  } catch {
    return null
  }
}
