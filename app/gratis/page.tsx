import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { whatsappUrl } from '@/lib/catalog'
import { DownloadButton } from './download-button'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({ path: '/gratis', image: '/img/checklist-gratis.jpg', title: 'Checklist gratis: revisá tu CV en 10 minutos', description: 'Los 24 puntos que reviso en cada CV antes de que llegue a un reclutador. Descargalo gratis.' })

const POINTS = [
  'Que los filtros ATS puedan leerlo',
  'Un encabezado que haga que te llamen',
  'Un perfil de tres líneas que venda',
  'Experiencia con logros, no solo tareas',
  'Habilidades y formación bien escritas',
]

/** Free checklist that Instagram sends with the keyword CHECKLIST; it leads to the paid guides and packs. */
export default function FreeChecklistPage() {
  return (
    <>
      <section className="bg-arena/40 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Regalo · PDF gratis</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Revisá tu CV en 10 minutos</h1>
            <p className="mt-4 text-lg leading-relaxed text-piedra">Los 24 puntos que miro en cada CV antes de que llegue a un reclutador. Abrilo al lado de tu CV y marcá lo que ya cumple: lo que quede sin marcar es tu lista de cambios.</p>
            <ul className="mt-6 space-y-2">
              {POINTS.map((point) => <li key={point} className="flex items-start gap-2 text-ink"><Check className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />{point}</li>)}
            </ul>
            <div className="mt-8"><DownloadButton /></div>
            <p className="mt-3 text-xs text-piedra">Sin registrarte. Se abre el PDF para que lo guardes o lo imprimas.</p>
          </div>
          <Image src="/img/checklist-gratis.jpg" alt="Portada y primera página del checklist" width={1200} height={848} priority className="h-auto w-full rounded-3xl shadow-[0_30px_60px_-35px_rgba(67,32,44,0.55)]" />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-script text-4xl leading-none text-rosa">¿Te quedaron puntos sin marcar?</p>
          <p className="mt-3 max-w-2xl text-piedra">Es normal: casi todos los CV que reviso fallan en el formato para ATS o en mostrar logros. Tenés dos caminos.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]">
              <p className="font-display text-lg font-bold text-ciruela">Hacerlo vos, con mis guías</p>
              <p className="mt-2 text-sm leading-relaxed text-piedra">El Kit con 4 guías (Portales, LinkedIn, CV a prueba de ATS y Búsqueda organizada) a $19.900, o cada guía por separado desde $5.900. Las descargás al toque, sin crear cuenta.</p>
              <Link href="/#guias" className="mt-5 inline-flex rounded-full border border-line px-5 py-2.5 font-display text-sm font-bold text-ciruela hover:border-ciruela">Ver las guías</Link>
            </div>
            <div className="rounded-[28px] bg-petalo-wash p-6">
              <p className="font-display text-lg font-bold text-ciruela">Que lo arme yo con vos</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">Tu CV moderno + tu CV optimizado para ATS, pensados para tu rubro, en 3 a 4 días hábiles.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/#precios" className="inline-flex rounded-full bg-ciruela px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-rosa">Ver packs y precios</Link>
                <a href={whatsappUrl('¡Hola! Descargué el checklist y quiero que me ayudes con mi CV.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 font-display text-sm font-bold text-ciruela"><WhatsAppIcon className="h-4 w-4" />Consultar</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
