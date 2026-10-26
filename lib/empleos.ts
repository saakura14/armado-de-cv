/**
 * Open positions of big employers, read live from their official job portals, for the "Cómo y dónde postularte"
 * landing pages that the Instagram carousels point to. Each posting links to the company's own page to apply.
 */

export type Opening = { title: string; place: string; posted: string; url: string; entry: boolean }

type Company = {
  name: string
  legalName: string
  logo: string
  /** Public job portal; HiringRoom portals list 20 postings per page at /jobs/index/<page>. */
  portal: string
  /** Roles that usually ask for secundario completo rather than a degree. */
  entry: RegExp
  /** What the entry-level list is called on the page. */
  entryTitle: string
  entryText: string
}

export const COMPANIES: Record<string, Company> = {
  laanonima: {
    name: 'La Anónima',
    legalName: 'La Anónima',
    logo: '/img/empresas/laanonima.png',
    portal: 'https://laanonima.hiringroom.com',
    entry: /sucursal|caja|reposici|operari|personal|asesor|maestranza/i,
    entryTitle: 'Sucursales y depósitos',
    entryText: 'Cajas, reposición, carnicería, panadería, limpieza, depósito y mantenimiento. Casi todas piden secundario completo; leé los requisitos de cada aviso.',
  },
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', '#39': "'", aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ' }

function clean(text: string) {
  return text.replace(/&(\w+|#39);/g, (all, name: string) => ENTITIES[name] ?? all).replace(/\s+/g, ' ').trim()
}

/** All open positions, or null when the portal doesn't answer (the page then links to the portal). */
export async function getOpenings(slug: string): Promise<Opening[] | null> {
  const company = COMPANIES[slug]
  if (!company) return null
  try {
    const openings: Opening[] = []
    for (let page = 1; page <= 10; page += 1) {
      const response = await fetch(`${company.portal}/jobs/index/${page}`, { next: { revalidate: 3600 } })
      if (!response.ok) return openings.length ? openings : null
      const html = await response.text()
      const cards = html.split('href="/jobs/get_vacancy/').slice(1)
      for (const card of cards) {
        const id = card.slice(0, 24)
        const title = clean(card.match(/name__vacancy">([^<]*)</)?.[1] ?? '')
        if (!title || openings.some((job) => job.url.endsWith(id))) continue
        const place = clean(card.match(/hr-Location-pin[^>]*><\/i>([^<]*)</)?.[1] ?? '').replace(/, Argentina$/, '')
        const posted = clean(card.match(/fs-12">([^<]*)<\/p>/)?.[1] ?? '')
        openings.push({ title, place: place || 'Varias sucursales', posted, url: `${company.portal}/jobs/get_vacancy/${id}`, entry: company.entry.test(title) })
      }
      const total = Number(html.match(/de (\d+) vacantes/)?.[1] ?? 0)
      if (!cards.length || openings.length >= total) break
    }
    return openings
  } catch {
    return null
  }
}
