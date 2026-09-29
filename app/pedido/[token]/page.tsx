'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS, whatsappUrl, type Delivery } from '@/lib/catalog'
import { savePending } from '@/lib/cart'
import { supabase } from '@/lib/supabase'

type LinkItem = { product_id: string; name: string; subtitle: string | null; price: number; delivery: Delivery; active: boolean; notes: string[]; extras: { group_id: string; option_id: string; label: string; price: number }[] }
type OrderLink = { items: LinkItem[]; customer_name: string | null; message: string | null; used: boolean; expired: boolean; order_id: string | null }

/** An order Vale built for a customer: they review it and continue to the usual checkout (account, terms, payment). */
export default function OrderLinkPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [link, setLink] = useState<OrderLink | null | undefined>(undefined)

  useEffect(() => {
    supabase.rpc('get_order_link', { p_token: token }).then(({ data, error }) => setLink(error ? null : (data as OrderLink | null)))
  }, [token])

  if (link === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>

  const help = whatsappUrl('¡Hola! Tengo una consulta sobre el link de pedido que me pasaste.')
  if (!link || link.items.length === 0 || link.expired || link.used || link.items.some((item) => !item.active)) {
    const text = !link || link.items.length === 0 ? 'No encontramos este pedido.'
      : link.used ? 'Este pedido ya se confirmó.'
        : link.expired ? 'Este link venció.' : 'Algún producto de este pedido ya no está disponible.'
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-script text-5xl text-rosa">{text}</p>
        {link?.order_id ? (
          <Link href={`/cuenta/pedido/${link.order_id}`} className="mt-6 inline-flex rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white">Ver mi pedido</Link>
        ) : (
          <a href={help} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-3 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" />Escribime y te paso uno nuevo</a>
        )}
      </section>
    )
  }

  const total = link.items.reduce((sum, item) => sum + item.price + item.extras.reduce((acc, extra) => acc + extra.price, 0), 0)
  const firstName = link.customer_name?.trim().split(/\s+/)[0]
  const notes = [...new Set(link.items.flatMap((item) => item.notes))]

  function checkout() {
    if (!link) return
    const items = link.items.map((item) => ({ product_id: item.product_id, ebook_id: null, extras: item.extras.map((extra) => ({ group_id: extra.group_id, option_id: extra.option_id, detail: null })) }))
    savePending({
      item: items[0],
      items,
      linkToken: token,
      customerName: link.customer_name ?? undefined,
      productName: 'Armado para vos',
      subtitle: link.items.map((item) => item.name).join(' + '),
      // The note field of the checkout follows the kind of work (a CV pack asks for details).
      delivery: link.items.find((item) => item.delivery === 'service')?.delivery ?? link.items[0].delivery,
      lines: link.items.flatMap((item) => [{ text: item.name, price: item.price }, ...item.extras.map((extra) => ({ text: `+ ${extra.label}`, price: extra.price }))]),
      total,
      notes,
    })
    router.push('/comprar')
  }

  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-xl">
        <p className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep"><Sparkles className="h-3.5 w-3.5" />Pedido armado para vos</p>
        <h1 className="mt-2 font-script text-5xl leading-none text-rosa">{firstName ? `¡Hola, ${firstName}!` : '¡Hola!'}</h1>
        <p className="mt-3 text-piedra">{link.message || 'Te dejo tu pedido listo. Revisalo, confirmalo y te muestro los datos para pagar.'}</p>

        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]">
          <ul className="space-y-4">
            {link.items.map((item, index) => (
              <li key={index}>
                <div className="flex items-baseline justify-between gap-4"><span className="font-bold text-ink">{item.name}</span><span className="shrink-0 font-semibold">{formatARS(item.price)}</span></div>
                {item.subtitle && <p className="text-sm text-piedra">{item.subtitle}</p>}
                {item.extras.map((extra) => <div key={`${extra.group_id}-${extra.option_id}`} className="mt-1 flex items-baseline justify-between gap-4 pl-3 text-sm text-piedra"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-rosa" />{extra.label}</span><span>+{formatARS(extra.price)}</span></div>)}
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-baseline justify-between border-t border-line pt-4 font-display font-extrabold text-ciruela"><span className="text-sm">Total</span><span className="text-3xl">{formatARS(total)}</span></p>
          <button type="button" onClick={checkout} className="group mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-rosa px-5 py-3 font-display text-sm font-bold text-white shadow-lg shadow-rosa/30 transition-colors hover:bg-rosa-deep">
            Confirmar y pagar<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-piedra"><ShieldCheck className="h-4 w-4" />Pagás por transferencia, sin recargo. Te pido crear tu cuenta para que veas el estado de tu pedido.</p>
        </div>

        {notes.length > 0 && (
          <details className="group mt-4 rounded-2xl bg-papel p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm font-bold text-ciruela">Antes de comprar<span className="text-lg text-rosa transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink">{notes.map((note) => <li key={note} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rosa" aria-hidden="true" />{note}</li>)}</ul>
          </details>
        )}
        <a href={help} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-whatsapp hover:underline"><WhatsAppIcon className="h-4 w-4" />¿Tenés dudas? Escribime</a>
      </div>
    </section>
  )
}
