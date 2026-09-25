import type { Metadata } from 'next'
import Image from 'next/image'
import { Clock, Video } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { ProductGrid } from '@/components/product-grid'
import { Faq, HowToBuy, SectionTitle } from '@/components/sections'
import { getProducts, whatsappUrl } from '@/lib/catalog'
import { getFaqs } from '@/lib/faq'

export const metadata: Metadata = {
  title: 'Asesorías: entrevistas, psicotécnicos y test vocacional',
  description: 'E-books para preparar entrevistas laborales y psicotécnicos, sesiones 1 a 1 por Google Meet y test de orientación vocacional.',
}

// Prices are edited from /admin; the page refreshes them every minute.
export const revalidate = 60

const topics = [
  { title: 'Checklist de preparación', items: ['Checklists + errores frecuentes', 'Guía del día de la evaluación laboral, paso a paso', 'Qué hacer mientras esperás los resultados', 'Manejo de ansiedad en entrevistas y tests'] },
  { title: 'Contenido de los e-books', items: ['Guía para entrevistas laborales', 'Guía para psicotécnicos laborales', 'Personalidad laboral', 'Aptos laborales', 'Ejercitación práctica incluida'] },
  { title: 'Sesión 1 a 1 por Google Meet', items: ['Simulacro guiado de entrevista y/o psicotécnico', 'Observación en tiempo real de tu abordaje', 'Feedback inmediato y personalizado', 'Identificación de fortalezas reales', 'Trabajo sobre la ansiedad: antes, durante y después', 'Espacio de preguntas para derribar mitos'] },
]

const steps = [
  { title: 'Elegí', text: 'Un e-book, un pack o el test vocacional. Tocá "Lo quiero".' },
  { title: 'Confirmá el pedido', text: 'Creá tu cuenta o ingresá y aceptá las condiciones y el consentimiento informado.' },
  { title: 'Transferí', text: 'Te muestro los datos para transferir y subís el comprobante ahí mismo.' },
  { title: 'Recibí tu material', text: 'Los e-books se habilitan en "Mi cuenta" al confirmar el pago; las sesiones por Meet se coordinan con turno.' },
]

export default async function AsesoriasPage() {
  const [prepProducts, vocational, faqs] = await Promise.all([getProducts(['asesorias', 'sesion']), getProducts(['vocacional']), getFaqs({ sections: ['asesorias'], onPageOnly: true })])
  return (
    <div className="bg-arena/45">
      {/* Hero */}
      <section className="px-4 pb-10 pt-10 sm:px-6 lg:pb-20 lg:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-script text-5xl leading-none text-rosa sm:text-6xl">Preparate con calma</p>
            <h1 className="mt-3 text-[32px] font-extrabold leading-[1.12] text-ciruela sm:text-5xl">¿Tenés una entrevista o un psicotécnico y no sabés qué esperar?</h1>
            <p className="mt-5 text-lg leading-relaxed text-piedra">Preparate con guías prácticas, ejercitación y feedback personalizado. Menos ansiedad, más claridad y más confianza en tu propio recorrido.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#precios" className="inline-flex min-h-12 items-center justify-center rounded-full bg-ciruela px-7 py-3.5 font-display font-bold text-white transition-colors hover:bg-rosa">Ver e-books y packs</a>
              <a href={whatsappUrl('ENTREVISTA')} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ciruela/15 bg-white/60 px-6 py-3 font-display font-bold text-ciruela hover:border-whatsapp hover:text-whatsapp"><WhatsAppIcon className="h-5 w-5" />Escribime &quot;ENTREVISTA&quot;</a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-piedra">
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-rosa" />Acceso inmediato al confirmar el pago</li>
              <li className="flex items-center gap-2"><Video className="h-4 w-4 text-rosa" />Sesiones por Google Meet</li>
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-x-4 bottom-0 top-28 -z-10 rounded-t-full bg-petalo-wash" aria-hidden="true" />
            <Image src="/img/valeria-cv-recorte.png" alt="Valeria, de Armado de CV Asesorías" width={768} height={850} priority className="h-auto w-full" />
          </div>
        </div>
      </section>

      {/* Prep products */}
      <section id="precios" className="scroll-mt-28 bg-blanco px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="prep-title">
        <div className="mx-auto max-w-6xl">
          <SectionTitle id="prep-title" script="Preparación" title="Entrevistas y psicotécnicos" text="Guías en PDF con ejercitación guiada, para leer desde el celular, la tablet o la computadora." />
          <ProductGrid products={prepProducts} tone="asesorias" />
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {topics.map((topic) => (
              <div key={topic.title} className="rounded-3xl bg-white p-6 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)]">
                <h3 className="font-bold text-ciruela">{topic.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">{topic.items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petalo" aria-hidden="true" />{item}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section className="px-4 py-16 sm:px-6" aria-label="Para quién es">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <div className="rounded-[28px] bg-white p-7">
            <p className="font-script text-4xl leading-none text-rosa">¿Para quién es?</p>
            <ul className="mt-4 space-y-2 leading-relaxed">
              {['Personas en búsqueda laboral', 'Quienes sienten mucha ansiedad ante entrevistas o psicotécnicos', 'Postulantes que quieren prepararse sin falsear nada', 'Personas que quieren entender el proceso y sentirse más seguras'].map((item) => <li key={item} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rosa" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
          <div className="rounded-[28px] bg-ciruela p-7 text-white">
            <p className="font-script text-4xl leading-none text-petalo">Qué cambia después</p>
            <ul className="mt-4 space-y-2 leading-relaxed text-white/90">
              {['Menos ansiedad', 'Más claridad', 'Mejor actitud frente al proceso', 'Mayor coherencia al responder', 'Más confianza en tu propio recorrido'].map((item) => <li key={item} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-petalo" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center font-script text-3xl leading-tight text-rosa">Prepararte no garantiza un resultado, pero sí te permite mostrarte mejor.</p>
      </section>

      {/* Vocational */}
      <section id="vocacional" className="scroll-mt-28 bg-blanco px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="vocacional-title">
        <div className="mx-auto max-w-6xl">
          <SectionTitle id="vocacional-title" script="Test vocacional" title="Orientación para elegir tu camino" text="Batería CHASIDE y Test Vocacional versión profesional adaptada (TV-A), con devolución por email o en un encuentro 1 a 1 por Google Meet." />
          <div className="mx-auto max-w-md"><ProductGrid products={vocational} tone="asesorias" /></div>
          {vocational[0]?.notes[0] && <p className="mx-auto mt-8 max-w-2xl rounded-3xl bg-arena px-6 py-4 text-center text-sm text-piedra">{vocational[0].notes[0]}</p>}
        </div>
      </section>

      <HowToBuy steps={steps} note="El material se envía únicamente luego de completar el consentimiento informado y la transferencia total." />
      <div className="bg-blanco"><Faq items={faqs.map((faq) => ({ q: faq.question, a: faq.answer }))} /></div>
    </div>
  )
}
