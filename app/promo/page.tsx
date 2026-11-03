import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { pageMetadata } from '@/lib/seo'
import { PromoPacks } from './promo-packs'

export const metadata: Metadata = pageMetadata({ path: '/promo', title: 'Tu CV listo para pasar los filtros', description: 'Dos CV a medida, uno moderno y otro optimizado para ATS, en 3 a 4 días hábiles. Pedilo en 2 minutos, sin crear cuenta.' })

const POINTS = [
  'Un CV moderno para mandar por mail o entregar en mano',
  'Un CV optimizado para ATS, que pasa los filtros de los portales',
  'Hecho a medida por mí, persona a persona, en 3 a 4 días hábiles',
]

/**
 * Landing of the Test ATS remarketing ad: people who already did the test and didn't buy. They can buy the pack right
 * here, or write to Vale on WhatsApp with a message that says they want to buy, so those chats stand out from questions.
 */
export default function PromoPage() {
  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Para vos, que hiciste el test ATS</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Tu CV listo para pasar los filtros</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-piedra">El test te mostró qué le falta. Yo te lo dejo listo para postular:</p>
        <ul className="mt-4 space-y-2">
          {POINTS.map((point) => <li key={point} className="flex items-start gap-2 text-ink"><Check className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />{point}</li>)}
        </ul>
        <PromoPacks />
      </div>
    </section>
  )
}
