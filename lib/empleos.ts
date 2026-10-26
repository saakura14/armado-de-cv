/**
 * Open positions of big employers, read live from their official job portals, for the "Cómo y dónde postularte"
 * landing pages that the Instagram carousels point to. Each posting links to the company's own page to apply.
 */

export type Opening = { title: string; place: string; posted: string; url: string; entry: boolean }

type Company = {
  name: string
  legalName: string
  logo: string
  /** Workday career site: the public portal and the JSON endpoint behind it. */
  portal: string
  api: string
  linkedin: string
}

export const COMPANIES: Record<string, Company> = {
  quilmes: {
    name: 'Quilmes',
    legalName: 'Cervecería y Maltería Quilmes',
    logo: '/img/empresas/quilmes.png',
    portal: 'https://wd1.myworkdaysite.com/es/recruiting/abinbev/ARG',
    api: 'https://wd1.myworkdaysite.com/wday/cxs/abinbev/ARG/jobs',
    linkedin: 'https://www.linkedin.com/company/cerveceria-y-malteria-quilmes/jobs/',
  },
}

// Roles that usually ask for secundario completo rather than a degree.
const ENTRY = /merchand|promotor|operador|operario|repositor|banco de talento|ejecutivo de ventas/i

const POSTED: Record<string, string> = { 'Posted Today': 'Hoy', 'Posted Yesterday': 'Ayer', 'Posted 30+ Days Ago': 'Hace más de 30 días' }

function postedLabel(text: string) {
  if (POSTED[text]) return POSTED[text]
  const days = text.match(/Posted (\d+) Days Ago/)
  return days ? `Hace ${days[1]} días` : text
}

/** All open positions (Workday pages them 20 at a time). Null when the portal doesn't answer, so the page falls back to the portal link. */
export async function getOpenings(slug: string): Promise<Opening[] | null> {
  const company = COMPANIES[slug]
  if (!company) return null
  try {
    const openings: Opening[] = []
    for (let offset = 0; offset < 200; offset += 20) {
      const response = await fetch(company.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: '' }),
        next: { revalidate: 3600 },
      })
      if (!response.ok) return openings.length ? openings : null
      const data = (await response.json()) as { total: number; jobPostings: { title: string; locationsText?: string; postedOn?: string; externalPath: string }[] }
      for (const job of data.jobPostings) {
        openings.push({ title: job.title, place: job.locationsText || 'Varias ubicaciones', posted: postedLabel(job.postedOn ?? ''), url: company.portal + job.externalPath, entry: ENTRY.test(job.title) })
      }
      if (offset + 20 >= data.total) break
    }
    return openings
  } catch {
    return null
  }
}
