'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Upload } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { AuthPanel } from '@/components/auth-panel'
import { CopyField } from '@/components/copy-field'
import { formatARS, whatsappUrl } from '@/lib/catalog'
import { ORDER_SELECT, STATUS, cardTotal, formatDate, isDigitalOnly, needsCoordination, type Order } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'
import { track } from '@/lib/pixel'
import { notifyAdmin } from '@/lib/push'

type Payment = { alias: string; cbu: string; holder: string; bank: string | null; card_enabled: boolean; card_fee: number }
type CardNotice = 'checking' | 'paid' | 'pending' | 'failed' | null

async function functionError(error: unknown, fallback: string) {
  const context = (error as { context?: Response } | null)?.context
  const detail = context ? await context.json().then((body: { error?: string }) => body.error).catch(() => null) : null
  return detail ?? errorMessage(error ?? fallback)
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const { user, ready, isAdmin } = useSession()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cardBusy, setCardBusy] = useState(false)
  const [cardNotice, setCardNotice] = useState<CardNotice>(null)
  const [cardError, setCardError] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [{ data }, { data: pay }] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle(),
      supabase.from('payment_settings').select('alias, cbu, holder, bank, card_enabled, card_fee').maybeSingle(),
    ])
    setOrder((data as Order | null) ?? null)
    setPayment((pay as Payment | null) ?? null)
    return (data as Order | null) ?? null
  }, [id])

  useEffect(() => { if (user) load() }, [user, load])

  // Back from Ualá's checkout (?pago=ok or ?pago=error): confirm the payment with Ualá right away
  // instead of waiting for the webhook.
  useEffect(() => {
    if (!user) return
    const result = new URLSearchParams(window.location.search).get('pago')
    if (!result) return
    window.history.replaceState(null, '', window.location.pathname)
    if (result !== 'ok') { setCardNotice('failed'); return }
    setCardNotice('checking')
    supabase.functions.invoke('uala', { body: { action: 'sync', order_id: id } }).then(async () => {
      const fresh = await load()
      const paid = !!fresh?.paid_at && fresh.payment_method === 'card'
      if (paid) track('Purchase', { value: fresh.card_total ?? fresh.total, currency: 'ARS', content_ids: fresh.order_items.map((item) => item.product_id) })
      setCardNotice(paid ? 'paid' : 'pending')
    })
  }, [user, id, load])

  async function payWithCard() {
    if (!order) return
    setCardBusy(true); setCardError('')
    const { data, error: invokeError } = await supabase.functions.invoke('uala', { body: { action: 'create', order_id: order.id } })
    if (invokeError || !data?.url) {
      setCardError(await functionError(invokeError, 'No se pudo abrir el pago con tarjeta.'))
      setCardBusy(false)
      return
    }
    window.location.href = data.url
  }

  async function uploadReceipt(file: File) {
    if (!user || !order) return
    if (file.size > 10 * 1024 * 1024) { setError('El archivo pesa más de 10 MB. Probá con una captura de pantalla.'); return }
    setUploading(true); setError('')
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${user.id}/${order.number}-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type || undefined })
    const { error: rpcError } = uploadError ? { error: uploadError } : await supabase.rpc('submit_receipt', { p_order: order.id, p_path: path })
    if (rpcError) { setError(errorMessage(rpcError)); setUploading(false); return }
    track('Purchase', { value: order.total, currency: 'ARS', content_ids: order.order_items.map((item) => item.product_id) })
    notifyAdmin(order.id, 'receipt')
    // E-books and guides: the receipt is read and, if everything matches, they unlock right away.
    if (isDigitalOnly(order)) {
      setVerifying(true)
      await supabase.functions.invoke('verify-receipt', { body: { order_id: order.id } })
      setVerifying(false)
    }
    await load()
    setUploading(false)
  }

  if (!ready || (user && order === undefined)) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="px-4 py-16"><AuthPanel title="Ingresá a tu cuenta" text="Para ver este pedido ingresá con la misma cuenta con la que compraste." /></section>
  if (!order) return <section className="mx-auto max-w-md px-4 py-20 text-center"><p className="font-script text-5xl text-rosa">Pedido no encontrado</p><Link href="/cuenta" className="mt-6 inline-block font-semibold text-rosa-deep underline">Ir a Mi cuenta</Link></section>

  const status = STATUS[order.status]
  const awaitingPayment = order.status === 'pending_payment' || order.status === 'payment_review'
  const coordination = needsCoordination(order)
  const digitalOnly = isDigitalOnly(order)
  const whatsappMessage = `¡Hola! Soy ${order.customer_name ?? ''}. Te escribo por mi pedido #${order.number} (${order.order_items.map((item) => item.product_name).join(', ')}). ${order.payment_method === 'card' ? 'Ya lo pagué con tarjeta.' : `Ya hice la transferencia de ${formatARS(order.total)}.`}`

  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href="/cuenta" className="inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-ciruela"><ArrowLeft className="h-4 w-4" />Mi cuenta</Link>

        <div className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-piedra">Pedido #{order.number} · {formatDate(order.created_at)}</p>
              <p className="mt-1 font-script text-4xl leading-none text-rosa">{order.order_items.map((item) => item.product_name).join(' + ')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 font-display text-xs font-bold ${status.tone}`}>{status.label}</span>
          </div>
          <ul className="mt-5 space-y-3 text-sm">
            {order.order_items.map((item) => (
              <li key={item.id}>
                <div className="flex justify-between gap-4 font-semibold"><span>{item.product_name}{item.ebooks ? ` — ${item.ebooks.title}` : ''}</span><span>{formatARS(item.unit_price)}</span></div>
                {item.extras.map((extra) => <div key={`${extra.group_id}-${extra.option_id}`} className="flex justify-between gap-4 text-piedra"><span>+ {extra.label}{extra.detail ? `: ${extra.detail}` : ''}</span><span>{formatARS(extra.price)}</span></div>)}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline justify-between border-t border-line pt-3 font-display font-extrabold text-ciruela"><span className="text-sm">{awaitingPayment ? 'Total a transferir' : 'Total'}</span><span className="text-2xl">{formatARS(order.total)}</span></p>
          {order.payment_method === 'card' && order.card_total && <p className="mt-1 text-right text-xs text-piedra">Pagado con tarjeta: {formatARS(order.card_total)} (incluye el costo de Ualá)</p>}
          <p className="mt-4 text-sm text-piedra">{order.status === 'delivered' && order.order_items.some((item) => item.products?.delivery === 'session') && order.order_items.some((item) => item.products?.delivery === 'service')
            ? '¡Tu CV está entregado! Ahora sigue tu sesión por Google Meet: el día y el link los ves en Mi cuenta.'
            : status.text}</p>
          {order.admin_note && <p className="mt-2 rounded-xl bg-papel px-3 py-2 text-sm text-ink">{order.admin_note}</p>}
          {user.is_anonymous && <p className="mt-3 rounded-xl bg-papel px-3 py-2 text-xs leading-relaxed text-piedra">Compraste sin crear cuenta: este pedido queda guardado en este celular.{order.order_items.some((item) => item.products?.delivery === 'digital') ? ' Apenas se confirme el pago te mando a tu mail el link para descargar tus guías desde cualquier dispositivo.' : ''} Si cambiás de celu, escribime por WhatsApp con tu número de pedido (#{order.number}) y lo seguimos por ahí.</p>}
        </div>

        {cardNotice && (
          <p role="status" className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${cardNotice === 'paid' ? 'bg-whatsapp/15 text-whatsapp' : cardNotice === 'failed' ? 'bg-petalo-wash text-rosa-deep' : 'bg-white text-ink'}`}>
            {cardNotice === 'checking' && <><Loader2 className="h-4 w-4 animate-spin text-rosa" />Confirmando tu pago con Ualá…</>}
            {cardNotice === 'paid' && <><CheckCircle2 className="h-5 w-5" />¡Listo! Tu pago con tarjeta está confirmado.</>}
            {cardNotice === 'pending' && 'Ualá todavía está procesando tu pago. Apenas se acredite, tu pedido se actualiza solo (podés recargar esta página en unos minutos).'}
            {cardNotice === 'failed' && 'El pago con tarjeta no se completó. Podés intentarlo de nuevo o pagar por transferencia.'}
          </p>
        )}

        {awaitingPayment && payment && (
          <div className="rounded-[28px] border-2 border-rosa/30 bg-papel p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-script text-4xl leading-none text-rosa">Transferencia</p>
              <span className="rounded-full bg-whatsapp/15 px-3 py-1 font-display text-xs font-bold text-whatsapp">Recomendado · Sin recargo</span>
            </div>
            <p className="mt-2 text-sm text-piedra">Desde cualquier banco o billetera virtual. Es la forma más simple y pagás el precio justo.</p>
            <p className="mt-5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Paso 1</p>
            <p className="mt-1 font-bold text-ciruela">Transferí {formatARS(order.total)}</p>
            <div className="mt-3 space-y-2">
              <CopyField label="Alias" value={payment.alias} />
              <CopyField label="CBU / CVU" value={payment.cbu} />
              <CopyField label="Monto" value={String(order.total)} />
              <p className="px-1 text-xs text-piedra">Titular: <span className="font-semibold text-ink">{payment.holder}</span>{payment.bank ? ` · ${payment.bank}` : ''}</p>
            </div>

            <p className="mt-6 font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Paso 2</p>
            <p className="mt-1 font-bold text-ciruela">Subí el comprobante</p>
            {order.receipt_path ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-whatsapp"><CheckCircle2 className="h-5 w-5" />Comprobante recibido. Si te equivocaste podés subir otro.</p>
            ) : (
              <p className="mt-1 text-sm text-piedra">Una captura de pantalla o el PDF que te da tu banco.{digitalOnly ? ' Apenas confirmo tu pago, tus e-books quedan listos para descargar.' : ''}</p>
            )}
            <label className={`mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-sm font-bold ${order.receipt_path ? 'border border-line bg-white text-ciruela' : 'bg-ciruela text-white hover:bg-rosa'}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{order.receipt_path ? 'Subir otro comprobante' : 'Elegir archivo'}
              <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadReceipt(file); event.target.value = '' }} />
            </label>
            {!order.receipt_path && (
              <a href={whatsappUrl(`¡Hola! Soy ${order.customer_name ?? ''}. Te mando el comprobante de mi pedido #${order.number} (${formatARS(order.total)}).`)} target="_blank" rel="noreferrer" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full border border-whatsapp/40 bg-white px-5 py-2.5 font-display text-sm font-bold text-[#128c4a]">
                <WhatsAppIcon className="h-4 w-4" />O mandámelo por WhatsApp
              </a>
            )}
            {!digitalOnly && !order.receipt_path && <p className="mt-4 text-xs leading-relaxed text-piedra">Apenas me llega tu pago te escribo para arrancar. Cuanto antes transfieras, antes empiezo: tu CV está en 3 a 4 días hábiles desde que tengo tu información.</p>}
            {verifying && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-ink"><Loader2 className="h-4 w-4 animate-spin text-rosa" />Verificando tu comprobante…</p>}
            {error && <p role="alert" className="mt-3 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
          </div>
        )}

        {awaitingPayment && (payment?.card_enabled || isAdmin) && payment && !order.receipt_path && (
          <div className="rounded-[28px] bg-white p-6 sm:p-8">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-piedra">Otra opción{!payment.card_enabled && " · solo la ves vos (admin) para probar"}</p>
            <p className="mt-1 flex items-center gap-2 font-bold text-ciruela"><CreditCard className="h-5 w-5 text-rosa" />Tarjeta de débito o crédito</p>
            <p className="mt-2 text-sm leading-relaxed text-piedra">
              Pagás con Ualá. Se suma el costo del procesador de pago ({(Number(payment.card_fee) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%), así que el total queda en <b className="text-ink">{formatARS(cardTotal(order.total, Number(payment.card_fee)))}</b>.{digitalOnly ? ' Tus e-books se habilitan apenas se aprueba el pago.' : ''}
            </p>
            <button type="button" onClick={payWithCard} disabled={cardBusy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ciruela px-5 py-3 font-display text-sm font-bold text-ciruela transition-colors hover:bg-petalo-wash disabled:opacity-50">
              {cardBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Pagar {formatARS(cardTotal(order.total, Number(payment.card_fee)))} con tarjeta
            </button>
            {cardError && <p role="alert" className="mt-3 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{cardError}</p>}
          </div>
        )}

        {coordination && order.status !== 'cancelled' && (order.receipt_path || order.payment_method === 'card') && (
          <div className="rounded-[28px] bg-ciruela p-6 text-white sm:p-8">
            <p className="font-script text-4xl leading-none text-petalo">Coordinemos</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">Escribime por WhatsApp para arrancar: te pido la información que necesito{order.order_items.some((item) => item.products?.delivery === 'session') ? ' y coordinamos día y horario para la videollamada' : ''}.</p>
            <a href={whatsappUrl(whatsappMessage)} target="_blank" rel="noreferrer" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-5 w-5" />Escribirme por WhatsApp</a>
          </div>
        )}

        {!coordination && order.status === 'delivered' && (
          <div className="rounded-[28px] bg-ciruela p-6 text-white sm:p-8">
            <p className="font-script text-4xl leading-none text-petalo">¡Ya son tuyos!</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">Tus e-books están listos para descargar en Mi cuenta. ¡Que los disfrutes!</p>
            <Link href="/cuenta#ebooks" className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 font-display text-sm font-bold text-ciruela">Ir a mis e-books</Link>
          </div>
        )}
      </div>
    </section>
  )
}
