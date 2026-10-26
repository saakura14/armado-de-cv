import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, ExternalLink, MapPin } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { whatsappUrl } from '@/lib/catalog'
import { COMPANIES, getOpenings, type Opening } from '@/lib/empleos'
import { pageMetadata } from '@/lib/seo'

export const revalidate = 3600
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(COMPANIES).map((empresa) => ({ empresa }))
}

export async function generateMetadata({ params }: { params: Promise<{ empresa: string }> }): Promise<Metadata> {
  const { empresa } = await params
  const company = COMPANIES[empresa]
  return pageMetadata({ path: `/empleos/${empresa}`, image: company.logo, title: `Cómo y dónde postularte a ${company.name}: búsquedas abiertas`, description: `Las búsquedas abiertas de ${company.legalName}, con el link oficial de cada una para postularte, y tips para que tu CV pase los filtros.` })
}

/** Openings in groups by city, in the order of how many each city has (so the big ones come first). */
function byPlace(items: Opening[]) {
  const groups = new Map<string, Opening[]>()
  for (const job of items) groups.set(job.place, [...(groups.get(job.place) ?? []), job])
  return [...groups].sort(([a, x], [b, y]) => (a === 'Varias zonas' ? -1 : b === 'Varias zonas' ? 1 : y.length - x.length))
}

function OpeningList({ items }: { items: Opening[] }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((job) => (
        <li key={job.url}>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_18px_36px_-30px_rgba(67,32,44,0.55)] transition-transform hover:-translate-y-0.5">
            <span className="font-display font-bold text-ciruela">{job.title}</span>
            <span className="mt-1 flex items-center gap-1 text-sm text-piedra"><MapPin className="h-4 w-4 shrink-0" />{job.detail || job.place}</span>
            <span className="mt-3 flex items-center justify-between text-xs text-piedra">
              <span>{job.posted && `Publicada: ${job.posted}`}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-rosa-deep">Postularme<ExternalLink className="h-3.5 w-3.5" /></span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** "Cómo y dónde postularte" landing for the Instagram carousels: live openings from the company's portal plus the CV offer. */
export default async function EmpleosPage({ params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params
  const company = COMPANIES[empresa]
  if (!company) notFound()
  const openings = await getOpenings(empresa)
  const { group } = company
  const entry = openings?.filter((job) => job.entry) ?? []
  const rest = openings?.filter((job) => !job.entry) ?? []
  const [logoWidth, logoHeight] = company.logoSize
  const chat = whatsappUrl(`¡Hola Vale! Vengo de la guía de ${company.name}. Quiero mi CV listo para postularme.`)
  return (
    <>
      <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Cómo y dónde postularte</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Trabajar en {company.name}</h1>
            <p className="mt-4 text-lg leading-relaxed text-piedra">
              {openings ? <>Hoy {company.legalName} tiene <b className="text-ciruela">{group.by === 'place' ? openings.filter((job) => job.place !== 'Varias zonas').length : openings.length} {company.countText}</b> en su portal oficial. </> : null}
              Te las junté acá, con el link directo para postularte a cada una.
            </p>
          </div>
          {/* Always a white card: the brand logo is dark and must stay readable in the dark theme. */}
          <div className="rounded-[28px] bg-[#fff] p-5 shadow-[0_30px_60px_-40px_rgba(67,32,44,0.55)] sm:p-8">
            <Image src={company.logo} alt={company.legalName} width={logoWidth} height={logoHeight} priority className="mx-auto h-auto max-h-56 w-auto max-w-[220px] sm:max-w-xs" />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {openings ? (
            <>
              <p className="font-script text-4xl leading-none text-rosa">{group.title}</p>
              <p className="mt-2 text-sm text-piedra">{group.text}</p>
              {group.by === 'place' ? (
                byPlace(openings).map(([place, items]) => (
                  <details key={place} open={place === 'Varias zonas'} className="mt-4 rounded-2xl bg-petalo-wash/40 p-4">
                    <summary className="cursor-pointer font-display font-bold text-ciruela">{place} <span className="font-normal text-piedra">({items.length})</span></summary>
                    <OpeningList items={items} />
                  </details>
                ))
              ) : (
                <>
                  <OpeningList items={entry} />
                  {rest.length > 0 && (
                    <>
                      <p className="mt-10 font-script text-4xl leading-none text-rosa">Oficinas y otras áreas</p>
                      <OpeningList items={rest} />
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <a href={company.portal} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ciruela px-6 py-3 font-display font-bold text-white hover:bg-rosa">Ver las búsquedas en el portal oficial<ExternalLink className="h-4 w-4" /></a>
          )}
          <p className="mt-6 text-sm text-piedra">{company.more} <a href={company.portal} target="_blank" rel="noopener noreferrer" className="font-semibold text-rosa-deep underline">Ir al portal oficial</a>.</p>
        </div>
      </section>

      <section className="bg-petalo-wash/60 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <div>
            <p className="font-script text-4xl leading-none text-rosa">Cómo postularte</p>
            <ol className="mt-4 space-y-3">
              {company.steps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl bg-white p-4 text-ink">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rosa font-display text-sm font-bold text-white">{index + 1}</span>{step}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[28px] bg-ciruela p-6 text-white">
            <p className="font-display text-xl font-bold">Antes de postularte: ¿tu CV pasa el filtro?</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">Muchos portales leen tu CV con un sistema (ATS) antes de que lo vea una persona. Si no lo entiende, quedás afuera aunque tengas el perfil.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['CV moderno para mandar y CV ATS para cargar en portales', 'Pensado para el puesto al que apuntás', 'Listo en 3 a 4 días hábiles (Express en 24 hs: +$15.000)'].map((item) => (
                <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-petalo" />{item}</li>
              ))}
            </ul>
            <p className="mt-5 font-display text-3xl font-extrabold">$35.000</p>
            <p className="text-xs text-white/70">CV moderno + CV ATS</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={chat} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 font-display text-sm font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />Quiero mi CV</a>
              <Link href="/test-ats" className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-white/10">Test ATS gratis</Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-xs text-piedra">Información orientativa, tomada del portal oficial de {company.legalName}. Armado de CV no forma parte de la empresa ni de su proceso de selección: cada empresa elige a sus candidatos.</p>
      </section>
    </>
  )
}
