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
  /** Where the openings come from: a HiringRoom portal (20 per page at /jobs/index/<page>), a Genoma.work jobs site, a
   *  SuccessFactors career site (its public XML feed) or, for pages about several employers, a list checked by hand. */
  source: { kind: 'hiringroom'; portal: string } | { kind: 'genoma'; slug: string } | { kind: 'successfactors'; host: string; company: string } | { kind: 'links'; checked: string; openings: Opening[] }
  /** Pages about several employers (call centers, fin de año) replace the company wording of the landing. */
  heading?: string
  intro?: string
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
  burgerking: {
    name: 'Burger King',
    legalName: 'Burger King Argentina',
    logo: '/img/empresas/burgerking.png',
    logoSize: [1024, 400],
    source: { kind: 'genoma', slug: 'bk-ar' },
    portal: 'https://app.genoma.work/jobs/bk-ar',
    countText: 'locales con búsqueda de crew abierta',
    group: { by: 'place', title: 'Crew, local por local', text: 'Buscá tu zona y postulate a los locales que te queden cerca. Es el puesto de entrada: no hace falta experiencia.' },
    steps: [
      'Elegí el local que te quede cerca y tocá "Postularme".',
      'Se abre su portal oficial (el mismo del botón "Empleo" de burgerking.com.ar): completá tus datos.',
      'Hacé la evaluación online tranquilo y con buena conexión: es un juego, no un examen.',
      'Tené tu CV listo en PDF, con tu disponibilidad horaria bien a la vista.',
    ],
    more: 'Las búsquedas son de su portal oficial, el mismo al que lleva "Empleo" en burgerking.com.ar.',
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
  // Checked by hand on 15/11/2026 (tp.com Argentina careers and the companies' own profiles on Computrabajo): re-check
  // before promoting the page again, postings close.
  callcenters: {
    name: 'call centers',
    legalName: 'TP (ex Teleperformance), Konecta y Atento',
    logo: '/img/empresas/callcenters.png',
    logoSize: [1000, 720],
    heading: 'Trabajar en un call center',
    intro: 'TP (ex Teleperformance), Konecta y Atento están tomando gente. Los dos primeros no piden experiencia: alcanza con el secundario completo.',
    source: { kind: 'links', checked: '15/11/2026', openings: [
      { title: 'Atención telefónica presencial (sin experiencia, part time)', place: 'TP (ex Teleperformance)', detail: 'CABA (Microcentro)', posted: '', url: 'https://www.tp.com/es-ar/job-opportunities/argentina/atenci%C3%B3n-ba-representante-atenci%C3%B3n-telef%C3%B3nica-presencial-caba/', entry: true },
      { title: 'Representantes de atención telefónica', place: 'TP (ex Teleperformance)', detail: 'Chaco', posted: '', url: 'https://www.tp.com/es-ar/job-opportunities/argentina/atenci%C3%B3n-chaco-representantes-de-atenci%C3%B3n-telef%C3%B3nica/', entry: true },
      { title: 'Atención al cliente bilingüe (inglés), part time', place: 'TP (ex Teleperformance)', detail: 'Inglés avanzado', posted: '', url: 'https://www.tp.com/es-ar/job-opportunities/argentina/representantes-de-atencion-al-cliente-bilinguee-ingles-part-time/', entry: true },
      { title: 'Intérpretes bilingües, 100% remoto', place: 'TP (ex Teleperformance)', detail: 'Inglés avanzado', posted: '', url: 'https://www.tp.com/es-ar/job-opportunities/argentina/interpretes-bilinguees-con-dominio-en-ingles-avanzado-trabajo-100-remoto/', entry: true },
      { title: 'Representante comercial telefónico', place: 'Konecta', detail: 'Córdoba', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-cordoba-representante-comercial-telefonico-perfil-asesor-comercial-en-cordoba-6206F1E4871A894261373E686DCF3405', entry: true },
      { title: 'Representante de atención técnica', place: 'Konecta', detail: 'Córdoba', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-representante-de-atencion-tecnica-cordoba-perfil-soporte-tecnico-en-cordoba-CAFEA5F9047F91D661373E686DCF3405', entry: true },
      { title: 'Representante corporativo de atención', place: 'Konecta', detail: 'Rosario', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-representante-corporativo-perfil-atencion-en-rosario-FD94D516D46CA10761373E686DCF3405', entry: true },
      { title: 'Asesor/a de ventas telefónicas para un banco, part time', place: 'Konecta', detail: 'CABA (San Nicolás)', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-buenos-aires-asesor-de-ventas-telefonicas-para-entidad-bancaria-part-time-perfil-asesor-comercial-en-san-nicolas-F9A2B516410F04F961373E686DCF3405', entry: true },
      { title: 'Asesor/a de cobranzas telefónicas', place: 'Konecta', detail: 'CABA (San Nicolás)', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-buenos-aires-asesor-de-recupero-crediticio-por-canales-telefonicos-perfil-asesor-de-cobranzas-en-san-nicolas-3133FEC1CD45EF8161373E686DCF3405', entry: true },
      { title: 'Televentas de seguros (con experiencia en ventas)', place: 'Atento', detail: 'CABA (Monserrat)', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-buscamos-representantes-de-televentas-de-seguros-bancarizados-en-monserrat-caba-con-experiencia-en-ventas-de-intangiblesservicios-en-monserrat-F7C43A84C86B0BDD61373E686DCF3405', entry: true },
      { title: 'Televentas de productos bancarios (con experiencia en ventas)', place: 'Atento', detail: 'CABA (Monserrat)', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-buscamos-incorporar-representantes-de-televenta-de-productos-bancarios-en-caba-con-experiencia-en-ventas-en-frio-en-monserrat-587F103C0C4C07C361373E686DCF3405', entry: true },
      { title: 'Telemarketing para una prepaga (con experiencia en ventas)', place: 'Atento', detail: 'CABA (Monserrat)', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-representantes-de-telemarketing-para-importante-empresa-de-medicina-prepaga-en-caba-con-experiencia-en-ventas-intangiblesservicios-en-monserrat-A546672EC6EA733A61373E686DCF3405', entry: true },
      { title: 'Telemarketing para una universidad (con experiencia en ventas)', place: 'Atento', detail: 'CABA (Monserrat)', posted: '', url: 'https://ar.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-representantes-de-telemarketing-para-importante-universidad-en-caba-con-experiencia-en-ventas-en-frio-de-intangibles-en-monserrat-AE0705CC81D030C861373E686DCF3405', entry: true },
    ] },
    portal: 'https://www.tp.com/es-ar/ubicaciones/argentina/carreras/',
    countText: 'búsquedas abiertas',
    group: { by: 'place', title: 'Búsquedas por empresa', text: 'Tocá cada empresa para ver sus búsquedas. Casi todas piden secundario completo y ser mayor de 18; leé los requisitos de cada aviso.' },
    steps: [
      'Elegí la búsqueda que va con tu zona y tu disponibilidad horaria.',
      'Tocá "Postularme": se abre el aviso oficial de la empresa.',
      'Cargá tu CV en PDF, con tu experiencia en atención al público o ventas bien a la vista (changas y el negocio familiar cuentan).',
      'Tené el teléfono a mano: suelen llamar o escribir por WhatsApp para una entrevista corta.',
    ],
    more: 'TP publica en su portal de carreras; Konecta y Atento, en sus perfiles oficiales de Computrabajo. Revisado el 15/11/2026: los avisos se cierran cuando cubren el puesto.',
  },
  findeano: {
    name: 'fin de año',
    legalName: 'los portales de empleo',
    logo: '/img/empresas/findeano.png',
    logoSize: [1000, 600],
    heading: 'Trabajos para las fiestas',
    intro: 'Randstad proyecta más de 2.000 puestos para fin de año, y 7 de cada 10 son de logística. Te junté dónde postularte, por rubro.',
    source: { kind: 'links', checked: '15/11/2026', openings: [
      { title: 'Jumbo, Disco, Vea y Easy (Cencosud)', place: 'Supermercados', detail: 'Cajas, reposición y depósito', posted: '', url: 'https://empleos.cencosud.com', entry: true },
      { title: 'Coto', place: 'Supermercados', detail: 'Cajas, reposición, carnicería y verdulería', posted: '', url: 'https://www.coto.com.ar/empleos', entry: true },
      { title: 'Carrefour', place: 'Supermercados', detail: 'Empleados/as polivalentes, part time', posted: '', url: 'https://carrefour-argentina.pandape.computrabajo.com', entry: true },
      { title: 'Randstad', place: 'Depósitos y logística', detail: 'Buscá "eventual", "picker" u "operario"', posted: '', url: 'https://www.randstad.com.ar', entry: true },
      { title: 'Adecco', place: 'Depósitos y logística', detail: 'Buscá "eventual", "picker" u "operario"', posted: '', url: 'https://www.adecco.com.ar', entry: true },
      { title: 'ManpowerGroup', place: 'Depósitos y logística', detail: 'Buscá "eventual", "picker" u "operario"', posted: '', url: 'https://www.manpower.com.ar', entry: true },
      { title: 'Portal Empleo (oficial y gratis)', place: 'Gastronomía, comercios y más', detail: 'Mozos/as, cocina, repositores, operarios y McDonald\'s', posted: '', url: 'https://www.portalempleo.gob.ar/OfertasLaborales', entry: true },
    ] },
    portal: 'https://www.portalempleo.gob.ar/OfertasLaborales',
    countText: 'portales para postularte',
    group: { by: 'place', title: 'Dónde postularte, por rubro', text: 'Supermercados en sus portales oficiales, depósitos a través de las consultoras que contratan eventuales, y Portal Empleo para el resto.' },
    steps: [
      'Elegí el rubro y entrá al portal oficial.',
      'Buscá "eventual", "temporada", "part time" o el puesto (cajero/a, repositor/a, picker).',
      'Cargá tu CV en PDF con tu disponibilidad arriba de todo: fines de semana, feriados, 24 y 31.',
      'Postulate en noviembre: las búsquedas de fin de año se llenan rápido.',
    ],
    more: 'Proyección de Randstad publicada en octubre de 2026. Los links llevan a los portales oficiales, revisados el 15/11/2026.',
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
    if (company.source.kind === 'links') return company.source.openings
    if (company.source.kind === 'genoma') return await genoma(company.source.slug)
    const entry = company.group.by === 'entry' ? company.group.entry : null
    if (company.source.kind === 'successfactors') return await successfactors(company.source.host, company.source.company, entry)
    return await hiringroom(company.source.portal, entry)
  } catch {
    return null
  }
}
