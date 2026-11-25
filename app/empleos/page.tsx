import type { Metadata } from 'next'
import { ArrowRight, FileCheck2, MousePointerClick, Search } from 'lucide-react'
import { COMPANIES, getOpenings } from '@/lib/empleos'
import { pageMetadata } from '@/lib/seo'
import { EmpleosOffer } from './[empresa]/empleos-offer'
import { JobsBySector, type JobCard, type Sector } from './jobs-by-sector'

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({ path: '/empleos', title: 'Búsquedas laborales por sector', description: 'Búsquedas laborales abiertas hoy por sector: comercio y shoppings, gastronomía, temporada de fiestas, supermercados, aeropuertos, seguridad y call centers, con el link oficial para postularte a cada una.' })

// The sectors of the job pages, in this order (the one spreading on Instagram first). A page with no sector here goes to "Otras".
const SECTORS: Sector[] = [
  { id: 'comercio', label: '🛍️ Comercio y ventas' },
  { id: 'gastronomia', label: '🍔 Gastronomía y comida rápida' },
  { id: 'temporada', label: '🎄 Temporada de fiestas' },
  { id: 'supermercados', label: '🛒 Supermercados' },
  { id: 'aeropuertos', label: '✈️ Aeropuertos y transporte' },
  { id: 'seguridad', label: '🛡️ Seguridad' },
  { id: 'callcenters', label: '📞 Call centers' },
  { id: 'otras', label: 'Otras empresas' },
]
const SECTOR_OF: Record<string, string> = {
  shoppings: 'comercio', burgerking: 'gastronomia', starbucks: 'gastronomia', findeano: 'temporada',
  laanonima: 'supermercados', aeropuertos: 'aeropuertos', seguridad: 'seguridad', callcenters: 'callcenters',
}
// Inside a sector, these go first (the posts of the week).
const FIRST = ['shoppings', 'burgerking', 'seguridad', 'aeropuertos']

const STEPS = [
  { icon: Search, title: 'Elegí la empresa', text: 'Mirá las búsquedas abiertas hoy, por zona y por puesto.' },
  { icon: MousePointerClick, title: 'Postulate en su portal oficial', text: 'Cada búsqueda tiene el link directo. Postularse es gratis.' },
  { icon: FileCheck2, title: 'Que tu CV pase el filtro', text: 'Muchos portales leen tu CV con un sistema antes que una persona.' },
]

/** The hub the "Búsquedas abiertas" ads point to: every company with a live landing, with today's count of openings. */
export default async function EmpleosHub() {
  const companies = await Promise.all(Object.entries(COMPANIES).map(async ([slug, company]) => {
    const openings = await getOpenings(slug)
    const count = openings ? (company.group.by === 'place' ? openings.filter((job) => job.place !== 'Varias zonas').length : openings.length) : null
    return { slug, company, count }
  }))
  // Only real openings add up (the fin de año page counts portals, not openings).
  const total = companies.reduce((sum, { company, count }) => sum + (company.countText.includes('búsqueda') ? count ?? 0 : 0), 0)
  const rank = (slug: string) => { const index = FIRST.indexOf(slug); return index < 0 ? FIRST.length : index }
  const cards: JobCard[] = [...companies].sort((a, b) => rank(a.slug) - rank(b.slug)).map(({ slug, company, count }) => ({
    slug, title: company.heading ?? company.name, logo: company.logo, logoSize: company.logoSize, alt: company.legalName,
    count: count ? `${count} ${company.countText}` : 'Búsquedas en su portal oficial', sector: SECTOR_OF[slug] ?? 'otras',
  }))

  return (
    <>
      <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Búsquedas laborales</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Las búsquedas abiertas hoy, por sector</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-piedra">
            {total > 0 && <>Hoy hay <b className="text-ciruela">{total} búsquedas abiertas</b> en sus portales oficiales. </>}
            Elegí tu sector y entrá a cada una: tienen el link directo para postularte y se actualizan solas.
          </p>
          <a href="#tu-cv" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-rosa px-6 font-display text-sm font-bold text-white shadow-lg shadow-rosa/25 hover:bg-rosa-deep">¿Tu CV pasa el filtro? Pedilo listo para postularte<ArrowRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <JobsBySector sectors={SECTORS} cards={cards} />
        <p className="mx-auto mt-6 max-w-5xl text-sm text-piedra">Cada semana sumamos empresas nuevas. ¿Cuál querés que agreguemos? Contanos por Instagram.</p>
      </section>

      <section className="bg-petalo-wash/60 px-4 py-10 sm:px-6">
        <ol className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-2xl bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rosa text-white"><Icon className="h-5 w-5" /></span>
              <p className="mt-3 font-display font-bold text-ciruela">{index + 1}. {title}</p>
              <p className="mt-1 text-sm text-piedra">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <EmpleosOffer company="las búsquedas abiertas" />

      <p className="mx-auto max-w-5xl px-4 pb-10 text-xs text-piedra sm:px-6">Información orientativa, tomada de los portales oficiales de cada empresa. Armado de CV no forma parte de las empresas ni de sus procesos de selección: cada empresa elige a sus candidatos.</p>
    </>
  )
}
