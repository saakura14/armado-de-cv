import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { pageMetadata } from '@/lib/seo'
import { AtsTest } from './ats-test'

export const metadata: Metadata = pageMetadata({ path: '/test-ats', title: 'Test ATS gratis: ¿tu CV pasa los filtros?', description: 'Subí tu CV en PDF y en 1 minuto sabés si un sistema ATS puede leerlo, qué le falta y cómo corregirlo. Gratis.' })

const POINTS = [
  'Si un sistema ATS puede leer tu CV',
  'Columnas, tablas e íconos que lo confunden',
  'Datos de contacto, secciones y largo',
  'Logros, fechas y datos que sobran',
  'Palabras clave del aviso que te faltan',
]

/** Free ATS test: a lead magnet for Instagram and ads that ends offering the CV packs. */
export default function AtsTestPage() {
  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-5xl items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Gratis · 1 minuto</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">¿Tu CV pasa los filtros ATS?</h1>
          <p className="mt-4 text-lg leading-relaxed text-piedra">Antes de que una persona lea tu CV, lo lee un sistema. Si no lo entiende, te descarta aunque tengas el perfil. Subilo y te digo cómo lo ve.</p>
          <ul className="mt-6 space-y-2">
            {POINTS.map((point) => <li key={point} className="flex items-start gap-2 text-ink"><Check className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />{point}</li>)}
          </ul>
        </div>
        <AtsTest />
      </div>
    </section>
  )
}
