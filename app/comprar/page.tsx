'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { AuthPanel } from '@/components/auth-panel'
import { clearPending, loadPending, type PendingOrder } from '@/lib/cart'
import { formatARS, whatsappUrl, type Delivery } from '@/lib/catalog'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { errorMessage, supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'
import { track } from '@/lib/pixel'
import { countStep, landingOrigin } from '@/components/visit-tracker'
import { notifyAdmin } from '@/lib/push'

// E-books and courses need nothing else from the buyer, so they skip the note.
const NOTE_FIELD: Partial<Record<Delivery, { label: string; placeholder: string }>> = {
  service: { label: 'Algo que quieras contarme (opcional)', placeholder: 'Rubro, puesto al que apuntás, colores que te gustan para el CV...' },
  session: { label: '¿Qué te gustaría trabajar en la sesión? (opcional)', placeholder: 'Por ejemplo: prepararme para una entrevista, ordenar mi búsqueda, definir hacia dónde ir...' },
}

function Summary({ order }: { order: PendingOrder }) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Tu pedido</p>
      <p className="mt-1 font-script text-4xl leading-none text-rosa">{order.productName}</p>
      {order.subtitle && <p className="text-sm text-piedra">{order.subtitle}</p>}
      <ul className="mt-4 space-y-1.5 text-sm">
        {order.items ? (
          // Order link: every product and add-on is its own line.
          order.lines.map((line, index) => <li key={index} className={`flex justify-between gap-4 ${line.text.startsWith('+') ? 'pl-3 text-piedra' : ''}`}><span>{line.text}</span><span className={line.price < 0 ? 'font-semibold text-whatsapp' : line.text.startsWith('+') ? '' : 'font-semibold'}>{formatARS(line.price)}</span></li>)
        ) : (
          <>
            <li className="flex justify-between gap-4"><span>{order.productName}</span><span className="font-semibold">{formatARS(order.total - order.lines.reduce((sum, line) => sum + line.price, 0))}</span></li>
            {order.lines.map((line) => <li key={line.text} className="flex justify-between gap-4 text-piedra"><span>+ {line.text}</span><span>{formatARS(line.price)}</span></li>)}
          </>
        )}
      </ul>
      <p className="mt-4 flex items-baseline justify-between border-t border-line pt-3 font-display font-extrabold text-ciruela"><span className="text-sm">Total</span><span className="text-2xl">{formatARS(order.total)}</span></p>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, profile, ready } = useSession()
  const [pending, setPending] = useState<PendingOrder | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [accepted, setAccepted] = useState(false)
  // Optional: news and new e-books by email (never pre-checked).
  const [news, setNews] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const order = loadPending()
    setPending(order)
    if (order) {
      track('InitiateCheckout', { value: order.total, currency: 'ARS', content_ids: [order.item.product_id] })
      countStep('checkout')
    }
  }, [])
  useEffect(() => {
    if (!profile) return
    setName((current) => current || profile.full_name || pending?.customerName || '')
    setPhone((current) => current || profile.phone || '')
  }, [profile, pending])

  async function confirm(event: React.FormEvent) {
    event.preventDefault()
    if (!pending) return
    setBusy(true); setError('')
    const { data, error: rpcError } = await supabase.rpc('create_order', {
      p_items: pending.items ?? [pending.item], p_accept_terms: accepted, p_name: name, p_phone: phone, p_note: note,
    })
    if (rpcError) { setError(errorMessage(rpcError)); setBusy(false); return }
    track('Lead', { value: pending.total, currency: 'ARS', content_ids: [pending.item.product_id] })
    if (news && user) await supabase.from('profiles').update({ marketing_opt_in: true, marketing_opt_in_at: new Date().toISOString() }).eq('id', user.id)
    if (pending.linkToken) await supabase.rpc('claim_order_link', { p_token: pending.linkToken, p_order: data as string })
    notifyAdmin(data as string, 'new_order')
    // Tags the order with where the visit came from (ad link or the web), for the sales dashboard.
    await supabase.rpc('set_my_order_origin', { p_order: data, p_origin: landingOrigin() })
    clearPending()
    router.replace(`/cuenta/pedido/${data as string}`)
  }

  if (pending === undefined || !ready) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  }

  if (!pending) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-script text-5xl text-rosa">No hay un pedido en curso</p>
        <p className="mt-3 text-piedra">Elegí un pack o un e-book y tocá &quot;Lo quiero&quot;.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/#precios" className="rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white">Packs de CV</Link>
          <Link href="/asesorias#precios" className="rounded-full border border-line bg-white px-5 py-3 font-display text-sm font-bold text-ciruela">Asesorías</Link>
        </div>
      </section>
    )
  }

  const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal outline-none focus:border-rosa'
  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4 lg:sticky lg:top-28">
          <Summary order={pending} />
          {pending.notes.length > 0 && (
            <ul className="space-y-1.5 rounded-3xl bg-papel p-5 text-xs leading-relaxed text-ink">{pending.notes.map((item) => <li key={item} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rosa" aria-hidden="true" />{item}</li>)}</ul>
          )}
        </div>

        {!user ? (
          <div>
            <AuthPanel title="Casi listo" initialMode="signup" text="Creá tu cuenta (te lleva un minuto) o ingresá si ya tenés una. Ahí vas a ver el estado de tu compra y descargar tus e-books." />
            {pending.delivery === 'service' && (
              <a href={whatsappUrl(`¡Hola! Quiero contratar ${pending.productName} (${formatARS(pending.total)}).`)} target="_blank" rel="noopener noreferrer" className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 text-sm font-semibold text-[#128c4a]">
                <WhatsAppIcon className="h-4 w-4" />¿Preferís no crear cuenta? Pedilo por WhatsApp
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={confirm} className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
            <p className="font-script text-4xl leading-none text-rosa">Tus datos</p>
            <p className="mt-2 text-sm text-piedra">Comprás como <b className="text-ink">{user.email}</b>.</p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-ciruela">Nombre y apellido
                <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={input} />
              </label>
              <label className="block text-sm font-semibold text-ciruela">WhatsApp
                <input required value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="11 2345-6789" className={input} />
              </label>
              {NOTE_FIELD[pending.delivery] && (
                <label className="block text-sm font-semibold text-ciruela">{NOTE_FIELD[pending.delivery]!.label}
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={NOTE_FIELD[pending.delivery]!.placeholder} className={input} />
                </label>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-blanco p-4 text-sm leading-relaxed">
                <input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 accent-rosa" />
                <span>Leí y acepto los <Link href="/terminos" target="_blank" className="font-semibold text-rosa-deep underline">términos y condiciones</Link> (incluida la política de cambios y devoluciones y, en Asesorías, el consentimiento informado) y la <Link href="/privacidad" target="_blank" className="font-semibold text-rosa-deep underline">política de privacidad</Link>.</span>
              </label>
              {!profile?.marketing_opt_in && (
                <label className="flex cursor-pointer items-start gap-3 px-1 text-sm leading-relaxed text-ink">
                  <input type="checkbox" checked={news} onChange={(event) => setNews(event.target.checked)} className="mt-1 accent-rosa" />
                  <span>Quiero recibir por mail novedades y nuevos e-books para mi búsqueda (opcional; me doy de baja cuando quiera desde Mi cuenta).</span>
                </label>
              )}
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
            <button disabled={busy || !accepted} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-rosa disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar pedido y ver datos de pago
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-piedra"><ShieldCheck className="h-4 w-4" />Una vez confirmado, el pedido no se puede cancelar.</p>
          </form>
        )}
      </div>
    </section>
  )
}
