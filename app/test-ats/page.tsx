import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { whatsappUrl } from '@/lib/catalog'
import { pageMetadata } from '@/lib/seo'
import { AtsTest } from './ats-test'

export const metadata: Metadata = pageMetadata({ path: '/test-ats', title: 'Test ATS gratis: ¿tu CV pasa los filtros?', description: 'Subí tu CV en PDF y en 1 minuto sabés si un sistema ATS puede leerlo, qué le falta y cómo corregirlo. Gratis.' })

const POINTS = [
  'La ficha que arma el sistema con tus datos: nombre, contacto, trabajos y estudios',
  'Los años de experiencia que te calcula con tus fechas',
  'Cuánto coincidís con las palabras del puesto al que apuntás',
  'Columnas, tablas e íconos que lo confunden',
  'Logros, fechas y datos que sobran',
]

/**
 * Free ATS test: a lead magnet for Instagram and ads that ends offering the CV packs.
 * Most visits come from the phone, where many people don't have their CV as a PDF: they get the WhatsApp way out
 * right under the title, and on the phone the test comes before the long explanation.
 */
export default function AtsTestPage() {
  const chat = whatsappUrl('¡Hola Vale! Vengo del test ATS: no tengo mi CV en PDF en el celu. ¿Te lo mando por acá para que me digas qué le falta?')
  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-5xl items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Gratis · 1 minuto</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">¿Tu CV pasa los filtros ATS?</h1>
          <p className="mt-4 text-lg leading-relaxed text-piedra">Antes de que una persona lea tu CV, lo lee un sistema. Si no lo entiende, te descarta aunque tengas el perfil. Subilo en PDF y te muestro cómo te ve.</p>
          <div className="mt-5 rounded-2xl bg-white/80 p-4">
            <p className="text-sm font-semibold text-ciruela">¿No tenés tu CV en PDF en el celu?</p>
            <p className="mt-1 text-sm text-piedra">Mandámelo por WhatsApp como lo tengas (foto, Word o PDF) y te digo qué le falta.</p>
            <a href={chat} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 font-display text-sm font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />Mandar mi CV por WhatsApp</a>
          </div>
        </div>
        <div className="lg:row-span-2"><AtsTest /></div>
        <div>
          <p className="font-display text-sm font-bold text-ciruela">Qué te muestra el test</p>
          <ul className="mt-3 space-y-2">
            {POINTS.map((point) => <li key={point} className="flex items-start gap-2 text-ink"><Check className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />{point}</li>)}
          </ul>
          <p className="mt-6 rounded-2xl bg-white/70 p-4 text-sm leading-relaxed text-piedra"><b className="text-ciruela">Es una guía orientativa:</b> te muestra cómo está tu CV en los puntos que miran los sistemas. Para una revisión honesta y profesional, hecha por mí, y tu CV listo para postular, elegí un <a href="/#precios" className="font-semibold text-rosa-deep underline">pack</a>.</p>
        </div>
      </div>
    </section>
  )
}
