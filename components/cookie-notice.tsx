'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie } from 'lucide-react'
import { setConsent, useConsent } from '@/lib/consent'

/** First-visit notice about Meta's cookies. The necessary storage (session, order in progress) works either way. */
export function CookieNotice() {
  const pathname = usePathname()
  const { consent, ready } = useConsent()
  if (!ready || consent || pathname.startsWith('/admin') || pathname.startsWith('/equipo')) return null
  // Above the phone's bottom bar (checkout has none); bottom left on desktop, away from WhatsApp and Sakura.
  const position = pathname.startsWith('/comprar') ? 'bottom-[calc(12px+env(safe-area-inset-bottom))]' : 'bottom-[calc(76px+env(safe-area-inset-bottom))]'
  return (
    <div role="region" aria-label="Aviso de cookies" className={`fixed inset-x-3 z-50 mx-auto max-w-md rounded-3xl border border-line bg-white p-4 shadow-[0_22px_44px_-18px_rgba(67,32,44,0.55)] sm:p-5 lg:inset-x-auto lg:bottom-6 lg:left-6 ${position}`}>
      <p className="flex items-center gap-2 font-display text-sm font-bold text-ciruela"><Cookie className="h-4 w-4 text-rosa" />¿Aceptás las cookies?</p>
      <p className="mt-1.5 text-sm leading-snug text-ink">Uso cookies de Meta (Instagram y Facebook) para medir mis anuncios. Tu cuenta y tus pedidos funcionan igual con cualquier opción. <Link href="/privacidad#cookies" className="font-semibold text-rosa-deep underline">Más info</Link></p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConsent('necessary')} className="min-h-11 rounded-full border border-line bg-white px-3 font-display text-sm font-bold text-ciruela hover:border-ciruela">Solo necesarias</button>
        <button type="button" onClick={() => setConsent('all')} className="min-h-11 rounded-full bg-ciruela px-3 font-display text-sm font-bold text-white hover:bg-rosa">Aceptar</button>
      </div>
    </div>
  )
}

/** For the privacy page: forget the answer so the notice shows again. */
export function CookieSettingsButton() {
  const { consent } = useConsent()
  return (
    <p className="rounded-2xl bg-papel p-4 text-sm">
      {consent === 'all' ? 'Aceptaste las cookies de Meta.' : consent === 'necessary' ? 'Elegiste solo las necesarias: el píxel de Meta no se carga.' : 'Todavía no elegiste.'}{' '}
      <button type="button" onClick={() => setConsent(null)} className="font-semibold text-rosa-deep underline">Cambiar mi elección</button>
    </p>
  )
}
