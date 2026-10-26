import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { BuyButton } from '@/components/buy-button'
import { getProducts } from '@/lib/catalog'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({ path: '/guias/cv-ats', image: '/img/guias/cv-filtros-ats.jpg', title: 'Tenés experiencia pero no te llaman: la guía para que tu CV pase los filtros', description: 'Guía práctica en PDF: qué es un ATS, los errores de formato que te dejan afuera y cómo usar las palabras clave de cada aviso. La descargás apenas pagás.' })

export const revalidate = 60

// The chapters of the guide (armado-de-cv-ebooks/04-cv-ats.html).
const CHAPTERS = [
  ['El agujero negro', 'Por qué mandás CVs y no te responde nadie.'],
  ['Qué es un ATS y cómo funciona', 'El sistema que lee tu CV antes que una persona.'],
  ['Cómo te ve un robot', 'Lo que el sistema entiende de tu CV, y lo que no.'],
  ['El formato manda', 'Columnas, tablas, íconos y diseños que te dejan afuera.'],
  ['Las palabras clave', 'Cómo usar las palabras de cada aviso para quedar arriba.'],
  ['El perfil que convence', 'Lo que tiene que leer la persona cuando por fin te ve.'],
  ['Checklist antes de postularte', 'La lista para revisar tu CV en minutos.'],
]

const SIGNS = [
  'Tenés experiencia y mandás CVs, pero no te llaman',
  'Usás una plantilla linda de Canva o Word, con columnas o íconos',
  'Mandás el mismo CV a todos los avisos',
  'No sabés qué es un ATS ni cómo te lee',
]

/** Landing for the ads: one problem ("tenés experiencia pero no te llaman"), one product, one button. */
export default async function GuiaCvAtsPage() {
  const product = (await getProducts(['guias'])).find((item) => item.id === 'guia-ats')
  const buy = product ? <BuyButton product={product} /> : <Link href="/#guias" className="inline-flex min-h-12 items-center rounded-full bg-ciruela px-6 py-3 font-display text-base font-bold text-white">Ver la guía</Link>
  return (
    <>
      <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Guía práctica · PDF · 9 páginas</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Tenés experiencia, pero no te llaman a entrevistas</h1>
            <p className="mt-4 text-lg leading-relaxed text-piedra">No es tu experiencia: es cómo está armado tu CV. Antes de que lo lea una persona, un sistema (ATS) lo filtra, y si no lo entiende, te descarta. En esta guía te muestro cómo arreglarlo vos, hoy.</p>
            <div className="mt-7">{buy}</div>
            <p className="mt-3 text-sm text-piedra">Pagás con tarjeta o transferencia, sin crear cuenta. Apenas confirmo tu pago te llega el link de descarga por mail.</p>
          </div>
          <Image src="/img/guias/cv-filtros-ats.jpg" alt="Tapa de la guía CV a prueba de filtros ATS" width={360} height={510} priority className="mx-auto h-auto w-full max-w-sm rounded-3xl shadow-[0_30px_60px_-35px_rgba(67,32,44,0.55)]" />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-script text-4xl leading-none text-rosa">¿Te pasa esto?</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {SIGNS.map((sign) => <li key={sign} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-ink shadow-[0_18px_36px_-30px_rgba(67,32,44,0.55)]"><X className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />{sign}</li>)}
          </ul>
          <p className="mt-6 max-w-2xl text-piedra">Si marcaste alguna, tu CV probablemente queda afuera antes de que lo lea alguien. La buena noticia: se arregla.</p>
        </div>
      </section>

      <section className="bg-petalo-wash/60 px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-script text-4xl leading-none text-rosa">Qué vas a aprender</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {CHAPTERS.map(([title, text], index) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rosa font-display text-sm font-bold text-white">{index + 1}</span>
                <span><b className="block font-display text-ciruela">{title}</b><span className="text-sm text-piedra">{text}</span></span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col items-start gap-3">
            {buy}
            <p className="flex items-center gap-2 text-sm text-piedra"><Check className="h-4 w-4 text-rosa" />Escrita por Vale, de Armado de CV, con lo que veo todos los días en los CVs que reviso.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]">
            <p className="font-display text-lg font-bold text-ciruela">¿No sabés si tu CV pasa?</p>
            <p className="mt-2 text-sm leading-relaxed text-piedra">Hacé el test ATS gratis: subís tu CV en PDF y en un minuto ves qué le resta puntos.</p>
            <Link href="/test-ats" className="mt-5 inline-flex rounded-full border border-line px-5 py-2.5 font-display text-sm font-bold text-ciruela hover:border-ciruela">Hacer el test gratis</Link>
          </div>
          <div className="rounded-[28px] bg-petalo-wash p-6">
            <p className="font-display text-lg font-bold text-ciruela">¿Preferís que te lo arme yo?</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">Tu CV moderno + tu CV optimizado para ATS, pensados para tu rubro, en 3 a 4 días hábiles. Desde $35.000.</p>
            <Link href="/#precios" className="mt-5 inline-flex rounded-full bg-ciruela px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-rosa">Ver los packs</Link>
          </div>
        </div>
      </section>
    </>
  )
}
