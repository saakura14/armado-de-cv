'use client'

import { useEffect, useState } from 'react'
import { getProducts, whatsappUrl, type Product } from '@/lib/catalog'
import { ProductGrid } from '@/components/product-grid'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { trackWhatsapp } from '@/components/visit-tracker'
import { track } from '@/lib/pixel'

const PACKS = ['cv-primer-empleo', 'cv-simple', 'cv-medium']
const GUIDES = ['guia-ats', 'guia-portales']

/**
 * What whoever lands from a "Cómo y dónde postularte" carousel or ad can buy right there: the CV packs on the web (or by
 * WhatsApp with a message that already says where they come from) and, for whoever prefers to do it alone, a cheap guide.
 */
export function EmpleosOffer({ company }: { company: string }) {
  const [packs, setPacks] = useState<Product[] | null>(null)
  const [guides, setGuides] = useState<Product[] | null>(null)
  useEffect(() => {
    track('ViewContent', { content_name: `Empleos ${company}` })
    const pick = (list: Product[], ids: string[]) => ids.flatMap((id) => list.filter((product) => product.id === id))
    getProducts(['cv', 'guias']).then((list) => { setPacks(pick(list, PACKS)); setGuides(pick(list, GUIDES)) })
  }, [company])
  const chat = whatsappUrl(`¡Hola Vale! Vengo de la guía de ${company}. Quiero mi CV listo para postularme 🛒`)
  const simple = packs?.find((product) => product.id === 'cv-simple')?.price ?? 0

  return (
    <section id="tu-cv" className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-center font-script text-4xl leading-none text-rosa">Tu CV listo para postularte</p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-piedra">Elegí tu pack y pedilo acá en 2 minutos, sin crear cuenta. Pagás por transferencia o con tarjeta.</p>
        {packs && <ProductGrid products={packs} scroll />}
        <div className="mx-auto mt-10 max-w-xl rounded-[28px] bg-white p-6 text-center shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]">
          <p className="font-display text-lg font-extrabold text-ciruela">¿Preferís pedirlo por WhatsApp?</p>
          <p className="mt-1 text-sm text-piedra">Te abre el chat con el mensaje listo y te paso los datos para pagar.</p>
          <a href={chat} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsapp(simple)} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-display font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-5 w-5" />Quiero mi CV</a>
        </div>
        {guides && guides.length > 0 && (
          <>
            <p className="mt-14 text-center font-script text-4xl leading-none text-rosa">¿Lo querés hacer vos?</p>
            <p className="mx-auto mt-3 max-w-2xl text-center text-piedra">Las guías te llegan al instante por mail: armá tu CV para que pase los filtros y encontrá dónde postularte.</p>
            <ProductGrid products={guides} />
          </>
        )}
      </div>
    </section>
  )
}
