'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HelpCircle, Tag, UserRound } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { whatsappUrl } from '@/lib/catalog'

// Thumb-reachable actions on phones; on desktop a floating WhatsApp button does the job.
export function BottomNav() {
  const pathname = usePathname()
  const whatsapp = whatsappUrl('¡Hola! Quiero hacer una consulta.')
  const base = pathname.startsWith('/asesorias') ? '/asesorias' : '/'
  // Private pages (admin, checkout) keep the whole screen for their own actions.
  if (pathname.startsWith('/admin') || pathname.startsWith('/equipo') || pathname.startsWith('/comprar')) return null
  const item = 'flex flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold'
  // Job pages (most visits come from Instagram posts that go viral): the bar sells the CV to apply, in one tap.
  if (pathname.startsWith('/empleos')) {
    const page = pathname.split('/')[2]
    const chat = whatsappUrl(`¡Hola Vale! Vengo de las búsquedas${page ? ` de ${page}` : ''} y quiero mi CV para postularme 💼`)
    return (
      <>
        <nav aria-label="Tu CV para postularte" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-blanco/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-display text-[13px] font-extrabold text-ciruela">Tu CV listo para postularte</p>
              <p className="truncate text-[11px] text-piedra">Primer CV $20.000 · CV + ATS $35.000</p>
            </div>
            <a href="#tu-cv" className="shrink-0 rounded-full bg-rosa px-4 py-2.5 font-display text-sm font-bold text-white shadow-lg shadow-rosa/25">Pedilo</a>
            <a href={chat} target="_blank" rel="noreferrer" aria-label="Escribime por WhatsApp" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-whatsapp text-white"><WhatsAppIcon className="h-5 w-5" /></a>
          </div>
        </nav>
        <a href={chat} target="_blank" rel="noreferrer" aria-label="Escribime por WhatsApp" className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-xl transition-transform hover:scale-105 lg:flex">
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      </>
    )
  }
  return (
    <>
      <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-blanco/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          <li><Link href={`${base}#precios`} className={`${item} text-ciruela`}><Tag className="h-5 w-5 text-rosa" />Precios</Link></li>
          <li><Link href={`${base}#como-comprar`} className={`${item} text-ciruela`}><HelpCircle className="h-5 w-5 text-rosa" />Cómo comprar</Link></li>
          <li><Link href="/cuenta" aria-current={pathname.startsWith('/cuenta') ? 'page' : undefined} className={`${item} text-ciruela`}><UserRound className="h-5 w-5 text-rosa" />Mi cuenta</Link></li>
          <li><a href={whatsapp} target="_blank" rel="noreferrer" className={`${item} text-whatsapp`}><WhatsAppIcon className="h-5 w-5" />WhatsApp</a></li>
        </ul>
      </nav>
      <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="Escribime por WhatsApp" className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-xl transition-transform hover:scale-105 lg:flex">
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </>
  )
}
