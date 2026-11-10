import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, FileCheck2, MousePointerClick, Search } from 'lucide-react'
import { COMPANIES, getOpenings } from '@/lib/empleos'
import { pageMetadata } from '@/lib/seo'
import { EmpleosOffer } from './[empresa]/empleos-offer'

export const revalidate = 3600

export const metadata: Metadata = pageMetadata({ path: '/empleos', title: 'Búsquedas abiertas en grandes empresas', description: 'Las búsquedas laborales abiertas hoy en Aeropuertos Argentina, Starbucks, La Anónima y más, con el link oficial para postularte a cada una.' })

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
  const total = companies.reduce((sum, { count }) => sum + (count ?? 0), 0)

  return (
    <>
      <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Búsquedas abiertas hoy</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Buscá trabajo en grandes empresas, desde un solo lugar</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-piedra">
            {total > 0 && <>Hoy hay <b className="text-ciruela">{total} búsquedas abiertas</b> en sus portales oficiales. </>}
            Te las junté con el link directo para postularte a cada una, y se actualizan solas.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <ul className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map(({ slug, company, count }) => (
            <li key={slug}>
              <Link href={`/empleos/${slug}`} className="group flex h-full flex-col rounded-[28px] bg-white p-5 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] transition-transform hover:-translate-y-1">
                {/* Always a white card: the brand logos are dark and must stay readable in the dark theme. */}
                <span className="flex h-28 items-center justify-center rounded-2xl bg-[#fff]">
                  <Image src={company.logo} alt={company.legalName} width={company.logoSize[0]} height={company.logoSize[1]} className="h-auto max-h-24 w-auto max-w-[180px]" />
                </span>
                <span className="mt-4 font-display text-xl font-bold text-ciruela">{company.name}</span>
                <span className="mt-1 text-sm text-piedra">{count ? `${count} ${company.countText}` : 'Búsquedas en su portal oficial'}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 font-display text-sm font-bold text-rosa-deep">Ver búsquedas y postularme<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            </li>
          ))}
        </ul>
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
