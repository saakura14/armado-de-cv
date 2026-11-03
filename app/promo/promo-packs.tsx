'use client'

import { useEffect, useState } from 'react'
import { getProducts, whatsappUrl, type Product } from '@/lib/catalog'
import { ProductGrid } from '@/components/product-grid'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { trackWhatsapp } from '@/components/visit-tracker'
import { track } from '@/lib/pixel'

// Promo of the 20.400 followers (1 to 8/11): the ATS guide comes free with the Pack Simple or the Medium.
const PROMO_UNTIL = Date.parse('2026-11-09T03:00:00Z')
const PACKS = ['cv-primer-empleo', 'cv-simple', 'cv-medium']

/** The packs to buy on the web and, for whoever prefers to talk, WhatsApp with a message that already says "I want to buy". */
export function PromoPacks() {
  const [packs, setPacks] = useState<Product[] | null>(null)
  const [promo, setPromo] = useState(false)
  useEffect(() => {
    setPromo(Date.now() < PROMO_UNTIL)
    track('ViewContent', { content_name: 'Promo remarketing' })
    getProducts(['cv']).then((list) => setPacks(PACKS.flatMap((id) => list.filter((product) => product.id === id))))
  }, [])
  const chat = whatsappUrl('¡Hola Vale! Quiero comprar un pack 🛒 (vengo del test ATS)')

  return (
    <>
      {promo && <p className="mt-6 max-w-2xl rounded-2xl bg-ciruela px-5 py-4 text-white">🎁 <b className="text-petalo">Hasta el domingo 8/11:</b> con el Pack Simple o el Pack Medium te llevás de regalo la guía <b className="text-petalo">CV a prueba de filtros ATS</b>.</p>}
      {packs && <ProductGrid products={packs} scroll />}
      <div className="mx-auto mt-10 max-w-xl rounded-[28px] bg-white p-6 text-center shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]">
        <p className="font-display text-lg font-extrabold text-ciruela">¿Preferís pedirlo por WhatsApp?</p>
        <p className="mt-1 text-sm text-piedra">Te abre el chat con el mensaje listo y te paso los datos para pagar.</p>
        <a href={chat} target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsapp(packs?.find((product) => product.id === 'cv-simple')?.price ?? 0)} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-display font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-5 w-5" />Quiero comprar mi pack</a>
      </div>
    </>
  )
}
