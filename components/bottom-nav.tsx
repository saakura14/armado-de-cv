'use client'

import { HelpCircle, MessageCircle, Tag } from 'lucide-react'
import { whatsappUrl } from '@/lib/catalog'

// Thumb-reachable actions on phones; on desktop a floating WhatsApp button does the job.
export function BottomNav() {
  const whatsapp = whatsappUrl('¡Hola! Quiero hacer una consulta.')
  return (
    <>
      <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-blanco/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          <li><a href="#precios" className="flex flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold text-ciruela"><Tag className="h-5 w-5 text-rosa" />Precios</a></li>
          <li><a href="#como-comprar" className="flex flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold text-ciruela"><HelpCircle className="h-5 w-5 text-rosa" />Cómo comprar</a></li>
          <li><a href={whatsapp} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold text-whatsapp"><MessageCircle className="h-5 w-5" />WhatsApp</a></li>
        </ul>
      </nav>
      <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="Escribime por WhatsApp" className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-xl transition-transform hover:scale-105 lg:flex">
        <MessageCircle className="h-7 w-7" />
      </a>
    </>
  )
}
