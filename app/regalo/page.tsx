import type { Metadata } from 'next'
import { Gift, MessageCircle, Send } from 'lucide-react'
import { ProductGrid } from '@/components/product-grid'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { getProducts, whatsappUrl } from '@/lib/catalog'
import { pageMetadata } from '@/lib/seo'

export const revalidate = 60

export const metadata: Metadata = pageMetadata({ path: '/regalo', title: 'Regalá un CV', description: 'El regalo que sirve: un CV profesional, moderno y listo para los filtros ATS. Para egresados, para quien busca trabajo o vuelve al mercado. Tarjeta de regalo al instante.' })

const STEPS = [
  { icon: Gift, title: 'Elegís el regalo', text: 'Ponés su nombre y un mensaje, y pagás por transferencia o con tarjeta.' },
  { icon: Send, title: 'Te llega la tarjeta', text: 'Apenas se confirma el pago, la recibís por mail: la mandás por WhatsApp o la imprimís.' },
  { icon: MessageCircle, title: 'Lo canjea cuando quiera', text: 'Me escribe con su código y le armo su CV a medida, en 3 a 4 días hábiles.' },
]

const IDEAS = ['Egresados del secundario o de la facu', 'Quien busca su primer trabajo', 'Quien se quedó sin trabajo o quiere cambiar', 'Mamá o papá que vuelve al mercado laboral', 'Amigo secreto, cumpleaños y fiestas']

/** "Regalá un CV": the gift cards, for Christmas and graduations. Bought like any product; the card arrives by email. */
export default async function GiftPage() {
  const gifts = await getProducts(['regalos'])
  return (
    <>
      <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Egresados · Fiestas · Cumpleaños</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-tight text-ciruela sm:text-5xl">Regalá un CV: el regalo que sí sirve 🎁</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-piedra">Un CV profesional, moderno y listo para pasar los filtros de las empresas. Lo comprás hoy y la persona lo canjea cuando arranca a buscar.</p>
          <a href="#regalos" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-rosa px-7 py-3.5 font-display font-bold text-white shadow-lg shadow-rosa/25 hover:bg-rosa-deep">Elegir el regalo</a>
        </div>
      </section>

      <section id="regalos" className="scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-center font-script text-4xl leading-none text-rosa">Elegí el regalo</p>
          {gifts.length > 0 && <ProductGrid products={gifts} />}
        </div>
      </section>

      <section className="bg-petalo-wash/60 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="font-script text-4xl leading-none text-rosa">¿Cómo funciona?</p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="rounded-2xl bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rosa text-white"><Icon className="h-5 w-5" /></span>
                <p className="mt-3 font-display font-bold text-ciruela">{index + 1}. {title}</p>
                <p className="mt-1 text-sm text-piedra">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <div>
            <p className="font-script text-4xl leading-none text-rosa">¿Para quién?</p>
            <ul className="mt-4 space-y-2">
              {IDEAS.map((idea) => <li key={idea} className="rounded-2xl bg-white px-4 py-3 text-ink shadow-[0_18px_36px_-30px_rgba(67,32,44,0.55)]">✨ {idea}</li>)}
            </ul>
          </div>
          <div className="rounded-[28px] bg-ciruela p-6 text-white">
            <p className="font-display text-xl font-bold">¿Preferís pedirlo por WhatsApp?</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">Decime para quién es y te paso los datos para pagar. La tarjeta te la mando por ahí.</p>
            <a href={whatsappUrl('¡Hola Vale! Quiero regalar un CV 🎁')} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-display font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-5 w-5" />Quiero regalar un CV</a>
            <p className="mt-5 text-xs leading-relaxed text-white/70">El código vale por 6 meses y es para una sola persona. Quien lo recibe me pasa su información por un formulario y le hago un boceto para ajustarlo juntos.</p>
          </div>
        </div>
      </section>
    </>
  )
}
