'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Printer, Share2 } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { SITE_URL, whatsappUrl } from '@/lib/catalog'
import { supabase } from '@/lib/supabase'

type Card = { number: number; giver: string | null; product: string; subtitle: string | null; recipient: string | null; message: string | null; created_at: string }

const until = (created: string) => {
  const date = new Date(created)
  date.setMonth(date.getMonth() + 6)
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The card itself: who it is for, the message, the code and how to redeem it, with buttons to share it or print it. */
export function GiftCard() {
  const token = useSearchParams().get('t') ?? ''
  const [card, setCard] = useState<Card | null | undefined>(undefined)

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setCard(null); return }
    supabase.rpc('get_gift_card', { p_token: token }).then(({ data }) => setCard(((data as Card[] | null) ?? [])[0] ?? null))
  }, [token])

  if (card === undefined) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!card) return (
    <div className="mx-auto max-w-md rounded-[28px] bg-white p-8 text-center">
      <p className="font-script text-4xl text-rosa">Tarjeta no disponible</p>
      <p className="mt-3 text-sm text-piedra">La tarjeta aparece apenas se confirma el pago. Si ya pagaste, esperá unos minutos o escribime por WhatsApp.</p>
    </div>
  )

  const code = `REGALO-${card.number}`
  const link = `${SITE_URL}/regalo/tarjeta?t=${token}`
  const redeem = whatsappUrl(`¡Hola Vale! Me regalaron un CV 🎁 Mi código es ${code}.`)
  const share = `🎁 ${card.recipient ? `${card.recipient}, te` : 'Te'} regalé tu CV profesional con Armado de CV. Mirá tu tarjeta: ${link}`
  const first = card.giver?.trim().split(/\s+/)[0]

  return (
    <div className="mx-auto max-w-xl">
      <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-rosa to-rosa-deep p-1 shadow-[0_40px_80px_-40px_rgba(67,32,44,0.7)] print:shadow-none">
        <div className="rounded-[28px] bg-papel px-6 py-8 text-center sm:px-10 sm:py-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-rosa-deep">Tarjeta de regalo</p>
          <p className="mt-3 font-script text-5xl leading-none text-rosa sm:text-6xl">{card.recipient ? `¡${card.recipient}!` : '¡Para vos!'}</p>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ciruela sm:text-4xl">Te regalaron tu CV profesional 🎁</h1>
          <p className="mt-2 text-piedra">{card.product}{card.subtitle ? ` · ${card.subtitle}` : ''}, armado a medida para pasar los filtros de las empresas.</p>
          {card.message && <p className="mx-auto mt-6 max-w-md rounded-2xl bg-white px-5 py-4 text-lg italic text-ink">“{card.message}”{first && <span className="mt-2 block text-sm not-italic font-semibold text-rosa-deep">— {first}</span>}</p>}
          {!card.message && first && <p className="mt-6 font-semibold text-rosa-deep">De parte de {first}</p>}
          <div className="mx-auto mt-7 max-w-xs rounded-2xl border-2 border-dashed border-rosa/50 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-piedra">Tu código</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-wider text-ciruela">{code}</p>
            <p className="mt-1 text-xs text-piedra">Válido hasta el {until(card.created_at)}</p>
          </div>
          <p className="mt-6 text-sm text-ink">Para canjearlo, escribime por WhatsApp con tu código y arrancamos 💼</p>
          <a href={redeem} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-display font-bold text-white print:hidden"><WhatsAppIcon className="h-5 w-5" />Canjear mi regalo</a>
          <p className="mt-6 font-script text-2xl text-rosa">Armado de CV</p>
          <p className="text-xs text-piedra">armadodecv.com · WhatsApp 11 5106-0953</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ciruela px-5 py-2.5 font-display text-sm font-bold text-white hover:bg-rosa"><Share2 className="h-4 w-4" />Mandarla por WhatsApp</a>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ciruela px-5 py-2.5 font-display text-sm font-bold text-ciruela hover:bg-petalo-wash"><Printer className="h-4 w-4" />Imprimir</button>
      </div>
    </div>
  )
}
