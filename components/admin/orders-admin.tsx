'use client'

import { SaleItemsEditor, useSaleCatalog } from './sale-items'
import type { SaleItem } from '@/lib/whatsapp-sale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Copy, ExternalLink, FileText, Link2, Palette, Pencil, RefreshCw, Hourglass, Video } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS } from '@/lib/catalog'
import { ORDER_SELECT, STATUS, formatDate, pendingSessions, type Order, type OrderStatus } from '@/lib/orders'
import { deliveryDeadline, formatDue } from '@/lib/dashboard'
import { STAGES, kindsOf, moveTo, sortForStage, stageOf, toStage, todayReason, type Kind, type LegacyFilter, type Reason, type Stage } from '@/lib/order-stages'
import { DeadlineChip } from './dashboard-admin'
import { OrderLinkDialog } from './order-link-dialog'
import { TeamRow, type OrderTask } from './assign-task'

// The admin also sees every Ualá checkout opened for the order (buyers can't read that table).
type AdminOrder = Order & { card_payments?: { uala_order_id: string; status: string; amount: number }[]; order_links?: { created_at: string }[]; order_private?: { canva_url: string | null } | { canva_url: string | null }[] | null; team_tasks?: OrderTask[] }
const ADMIN_ORDER_SELECT = `${ORDER_SELECT}, card_payments(uala_order_id, status, amount), order_links(created_at), order_private(canva_url), team_tasks(id, order_item_id, status, team_members(name)), sessions(id, title, status, scheduled_at)`
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, inputClass, useFlash } from './ui'

/** Stages of the board, or an older view name (from the home or a notification) that is mapped to one. */
export type Filter = Stage | LegacyFilter

type Buyer = { id: string; email: string | null; full_name: string | null; phone: string | null }

export function waLink(phone: string | null, text: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const full = digits.startsWith('54') ? digits : `549${digits.replace(/^0/, '').replace(/^15/, '')}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

/**
 * The customer is written from the business WhatsApp (11 5106-0953), not the personal one:
 * on Android the link forces the WhatsApp Business app; on a computer it opens WhatsApp Web
 * (keep it signed in with the business number). iPhone can't choose the app, so it uses wa.me.
 */
export function openBusinessWhatsapp(event: React.MouseEvent<HTMLAnchorElement>, link: string) {
  const url = new URL(link)
  const phone = url.pathname.slice(1), text = url.searchParams.get('text') ?? ''
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(agent)) return
  event.preventDefault()
  if (/Android/i.test(agent)) {
    window.location.href = `intent://send/?phone=${phone}&text=${encodeURIComponent(text)}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${encodeURIComponent(link)};end`
  } else {
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
}

/** Fix or complete a WhatsApp sale: what was bought (e.g. Express added later), amount charged, name, phone and payment date. */
function EditSale({ order, onSaved }: { order: AdminOrder; onSaved: () => void }) {
  const toDay = (value: string | null) => (value ? new Date(new Date(value).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10) : '')
  const [open, setOpen] = useState(false)
  const [total, setTotal] = useState(String(order.total))
  const [name, setName] = useState(order.customer_name ?? '')
  const [phone, setPhone] = useState(order.customer_phone ?? '')
  const [date, setDate] = useState(toDay(order.paid_at))
  const initialItems: SaleItem[] = order.order_items.map((item) => ({ productId: item.product_id, extras: item.extras.map((extra) => ({ groupId: extra.group_id, optionId: extra.option_id })) }))
  const [items, setItems] = useState<SaleItem[]>(initialItems)
  // The amount follows the prices while it isn't typed by hand.
  const [totalTouched, setTotalTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  const { products, extras, totalOf } = useSaleCatalog()
  const itemsChanged = JSON.stringify(items) !== JSON.stringify(initialItems)

  function changeItems(next: SaleItem[]) {
    setItems(next)
    if (!totalTouched) setTotal(String(totalOf(next)))
  }

  async function save() {
    setBusy(true)
    if (itemsChanged) {
      const { error } = await supabase.rpc('admin_update_whatsapp_sale_items', {
        p_order: order.id,
        p_items: items.map((item) => ({ product_id: item.productId, extras: item.extras.map((extra) => ({ group_id: extra.groupId, option_id: extra.optionId })) })),
        p_total: Number(total),
      })
      if (error) { setBusy(false); flash.show('error', errorMessage(error)); return }
    }
    const { error } = await supabase.rpc('admin_update_whatsapp_sale', {
      p_order: order.id, p_total: Number(total), p_name: name, p_phone: phone,
      p_paid_on: date && date !== toDay(order.paid_at) ? date : null,
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setOpen(false)
    onSaved()
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-rosa-deep hover:underline"><Pencil className="h-3.5 w-3.5" />Editar venta</button>
  }
  const lines = totalOf(items)
  return (
    <div className="mt-3 rounded-2xl border border-rosa/40 bg-petalo-wash/60 p-4">
      <p className="font-display text-sm font-bold text-ciruela">Editar venta por WhatsApp</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-piedra">Qué compró</p>
      <SaleItemsEditor items={items} onChange={changeItems} products={products} extras={extras} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra sm:col-span-1">Cliente<input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra sm:col-span-1">WhatsApp<input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-semibold uppercase tracking-wider text-piedra">Fecha de pago<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-semibold uppercase tracking-wider text-piedra">Cobraste<input inputMode="numeric" value={total} onChange={(event) => { setTotal(event.target.value.replace(/\D/g, '')); setTotalTouched(true) }} className={inputClass} /></label>
      </div>
      {lines > 0 && lines !== Number(total) && <p className="mt-2 text-xs text-piedra">Según los precios de lo que compró: {formatARS(lines)}. <button type="button" className="font-semibold text-rosa-deep hover:underline" onClick={() => { setTotal(String(lines)); setTotalTouched(false) }}>usar ese</button></p>}
      {itemsChanged && items.some((item) => item.extras.some((extra) => extra.groupId === 'express')) && <p className="mt-2 text-xs font-semibold text-ciruela">Con Express, el plazo pasa a 24 hs hábiles desde la fecha de pago.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button busy={busy} disabled={!name.trim() || !(Number(total) > 0) || !items.length || items.some((item) => !item.productId)} onClick={save}>Guardar cambios</Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </div>
  )
}

/** The Canva design of the order, saved only for the admin (the customer never sees it). */
/** How long an order has been waiting for the payment, to know when to send the reminder. */
function UnpaidSince({ createdAt }: { createdAt: string }) {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 36e5
  if (hours < 24) return null
  const days = Math.floor(hours / 24)
  return <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-petalo-wash px-3 py-1 font-display text-xs font-bold text-rosa-deep">Sin pagar hace {days} {days === 1 ? 'día' : 'días'} · mandale el recordatorio</p>
}

function CanvaLink({ order }: { order: AdminOrder }) {
  const initial = (Array.isArray(order.order_private) ? order.order_private[0] : order.order_private)?.canva_url ?? ''
  const [saved, setSaved] = useState(initial)
  const [url, setUrl] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save() {
    const value = url.trim()
    if (value && !/^https?:\/\//i.test(value)) { flash.show('error', 'Pegá el link completo (empieza con https://).'); return }
    setBusy(true)
    const { error } = await supabase.from('order_private').upsert({ order_id: order.id, canva_url: value || null, updated_at: new Date().toISOString() })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setSaved(value)
    setUrl(value)
    setEditing(false)
    flash.show('ok', value ? 'Link de Canva guardado.' : 'Link de Canva borrado.')
  }

  const current = saved === url ? url.trim() : saved
  if (!editing && !current) {
    return <button type="button" onClick={() => setEditing(true)} className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-piedra hover:text-rosa-deep"><Palette className="h-3.5 w-3.5 text-rosa" />+ Link de Canva <span className="text-xs font-normal">(solo lo ves vos)</span></button>
  }
  return (
    <div className="mt-3">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Palette className="h-4 w-4 shrink-0 text-rosa" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Pegá el link de Canva de este pedido" aria-label="Link de Canva" autoFocus className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-rosa" />
          <Button variant="secondary" busy={busy} onClick={save}>Guardar</Button>
          <button type="button" onClick={() => { setUrl(saved); setEditing(false) }} className="text-xs font-semibold text-piedra hover:text-ciruela">Cancelar</button>
        </div>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Palette className="h-4 w-4 shrink-0 text-rosa" />
          <a href={current} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-rosa-deep hover:underline">Abrir diseño en Canva<ExternalLink className="h-3.5 w-3.5" /></a>
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-piedra hover:text-ciruela">Cambiar</button>
          <span className="text-xs text-piedra">· solo lo ves vos</span>
        </p>
      )}
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </div>
  )
}

// Same height and width for every action button on the card.
const action = 'min-h-10 w-full px-3 text-center !text-[13px] leading-tight'

const REASON_TONE: Record<Reason['tone'], string> = { rojo: 'bg-rosa-deep text-white', naranja: 'bg-petalo-wash text-rosa-deep', rosa: 'bg-rosa text-white', arena: 'bg-arena text-ciruela' }

function OrderCard({ order, buyer, fresh, reason, onDragStart, onChanged }: { order: AdminOrder; buyer?: Buyer; fresh: boolean; reason?: Reason | null; onDragStart?: (event: React.DragEvent<HTMLLIElement>) => void; onChanged: () => void }) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState(order.admin_note ?? '')
  const [more, setMore] = useState(false)
  const { money } = useHideMoney()
  const flash = useFlash()

  // Stops (or restarts) the delivery clock while the customer owes corrections or information.
  async function setWaiting(waiting: boolean) {
    setBusy('waiting')
    const { error } = await supabase.rpc('admin_set_waiting', { p_order: order.id, p_waiting: waiting })
    setBusy('')
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', waiting ? 'Plazo en pausa: no cuenta como atrasado mientras esperás al cliente.' : 'Listo: el plazo sigue desde hoy, sumando los días que esperaste.')
    onChanged()
  }

  async function setStatus(status: OrderStatus, fallbackNote?: string) {
    if (status === 'cancelled' && !window.confirm(`¿Cancelar el pedido #${order.number}?`)) return
    setBusy(status)
    const { data, error } = await supabase.rpc('admin_set_order_status', { p_order: order.id, p_status: status, p_note: note.trim() || fallbackNote || null })
    setBusy('')
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', data === 'delivered' && status === 'paid' ? 'Pago aprobado: los e-books ya están disponibles para el cliente.' : status === order.status ? 'Guardado.' : 'Pedido actualizado.')
    onChanged()
  }

  // The customer paid but sent the receipt by WhatsApp instead of uploading it: approve after checking the bank.
  function approveOutsideWeb() {
    if (!window.confirm(`¿Ya viste los ${formatARS(order.total)} del pedido #${order.number} en tu cuenta del banco? Se aprueba aunque no tenga comprobante en la web.`)) return
    setStatus('paid', '¡Gracias! Recibí tu pago por WhatsApp.')
  }

  // E-books unlocked on upload: confirm the transfer arrived, or take the access back.
  async function reviewInstant(received: boolean) {
    if (!received && !window.confirm(`¿No llegó la transferencia del pedido #${order.number}? Se le quita el acceso a los e-books y el pedido queda cancelado.`)) return
    setBusy(received ? 'received' : 'rejected')
    const { error } = await supabase.rpc('admin_review_instant_payment', { p_order: order.id, p_received: received, p_note: note.trim() || null })
    setBusy('')
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', received ? 'Listo: transferencia verificada.' : 'Acceso quitado y pedido cancelado.')
    onChanged()
  }

  async function openReceipt() {
    if (!order.receipt_path) return
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(order.receipt_path, 300)
    if (error || !data) flash.show('error', errorMessage(error))
    else window.open(data.signedUrl, '_blank', 'noopener')
  }

  const status = STATUS[order.status]
  const name = order.customer_name || buyer?.full_name || buyer?.email || 'Cliente'
  const phone = order.customer_phone || buyer?.phone || null
  const firstName = name.split(' ')[0]
  const products = order.order_items.map((item) => item.product_name).join(' + ')
  const whatsapp = waLink(phone, `¡Hola ${firstName}! Te escribo por tu pedido #${order.number} de Armado de CV.`)
  const service = order.order_items.some((item) => item.products?.delivery === 'service')
  // A 1:1 session: its own product, or the Meet feedback of the vocational test.
  const session = order.order_items.some((item) => item.products?.delivery === 'session' || item.extras.some((extra) => extra.group_id === 'devolucion'))
  const deadline = service && (order.status === 'paid' || order.status === 'in_progress') ? deliveryDeadline(order) : null
  const nextSession = pendingSessions(order)[0]
  // Ready-made message for the next step of this order.
  const template = order.status === 'pending_payment'
    ? { label: 'Recordar el pago', text: `¡Hola ${firstName}! Vi tu pedido #${order.number} (${products}) por ${formatARS(order.total)}. ¿Pudiste hacer la transferencia? Acá tenés los datos para pagar: https://armadodecv.com/cuenta/pedido/${order.id}\nCuando transfieras, mandame el comprobante por acá y arranco. Si tenés alguna duda, te ayudo.` }
    : service && (order.status === 'paid' || order.status === 'in_progress')
      ? { label: 'Pedir los datos', text: `¡Hola ${firstName}! Ya confirmé tu pago del pedido #${order.number} 🙌 Para arrancar, pasame tu CV actual (si tenés) y contame a qué puesto o rubro apuntás.` }
      : session && (order.status === 'paid' || order.status === 'in_progress')
        ? { label: 'Coordinar la sesión', text: `¡Hola ${firstName}! Ya confirmé tu pago del pedido #${order.number} 🙌 ¿Qué días y horarios te quedan cómodos para la sesión por Google Meet?` }
      // CV + session: once the CV is delivered, the session comes next.
      // Already scheduled: a reminder with the day; done (or none recorded yet): the testimonial.
      : service && session && order.status === 'delivered' && nextSession?.status === 'scheduled' && nextSession.scheduled_at
        ? { label: 'Recordar la sesión', text: `¡Hola ${firstName}! Te recuerdo nuestra sesión por Google Meet el ${formatDate(nextSession.scheduled_at, true)} 🙌 Cualquier cosa me avisás.` }
      : service && session && order.status === 'delivered' && (nextSession || !order.sessions)
        ? { label: 'Coordinar la sesión', text: `¡Hola ${firstName}! Ya tenés tu CV 🙌 Ahora sigue la sesión por Google Meet: ¿qué días y horarios te quedan cómodos?` }
      : order.status === 'delivered'
        ? { label: 'Pedir un testimonio', text: `¡Hola ${firstName}! ¿Cómo te fue con tu ${products}? Si te gustó, me ayudaría muchísimo que me cuentes tu experiencia en un mensajito 💕 Si me das permiso, lo comparto en Instagram solo con tu nombre.` }
        : null
  const templateLink = template ? waLink(phone, template.text) : null

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(phone ? `${phone}\n\n${text}` : text)
      flash.show('ok', phone ? 'Copiados el número y el mensaje: pegalos en WhatsApp Business.' : 'Mensaje copiado: pegalo en WhatsApp Business.')
    } catch {
      flash.show('error', 'No se pudo copiar. Mantené apretado el mensaje para copiarlo a mano.')
    }
  }

  return (
    <li draggable={Boolean(onDragStart)} onDragStart={onDragStart} className={`rounded-3xl bg-white p-4 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)] ${onDragStart ? 'md:cursor-grab md:active:cursor-grabbing' : ''}`}>
      {/* Row 1: number, date, origin and status. Row 2: customer and amount, always side by side. */}
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">
          {reason && reason.label !== 'Nuevo' && <span className={`rounded-full px-2 py-0.5 tracking-normal ${REASON_TONE[reason.tone]}`}>{reason.label}</span>}
          {fresh && <span className="rounded-full bg-rosa px-2 py-0.5 tracking-normal text-white">Nuevo</span>}
          <span>#{order.number} · {formatDate(order.created_at, true)}</span>
          {order.source === 'whatsapp' && <span className="inline-flex items-center gap-1 rounded-full bg-whatsapp/15 px-2 py-0.5 normal-case tracking-normal text-whatsapp"><WhatsAppIcon className="h-3 w-3" />WhatsApp</span>}
          {(order.order_links?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-petalo-wash px-2 py-0.5 normal-case tracking-normal text-rosa-deep"><Link2 className="h-3 w-3" />Por link</span>}
        </p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold ${status.tone}`}>{status.label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-ink">{name}</p>
          {(buyer?.email || phone) && <p className="truncate text-xs text-piedra">{buyer?.email}{buyer?.email && phone ? ' · ' : ''}{phone}</p>}
        </div>
        <p className="shrink-0 font-display text-lg font-extrabold text-ciruela">{money(order.total)}</p>
      </div>
      {deadline && <p className="mt-2 flex flex-wrap items-center gap-2"><DeadlineChip deadline={deadline} /><span className="text-xs text-piedra">{deadline.waiting ? `Plazo en pausa desde el ${formatDate(order.waiting_since!)}` : `Entregar el ${formatDue(deadline.due)}${deadline.express ? ' · Express' : ''}`}</span></p>}
      {order.status === 'pending_payment' && <UnpaidSince createdAt={order.created_at} />}

      {order.payment_check === 'pending' && (
        <div className="mt-4 rounded-2xl border border-rosa/40 bg-petalo-wash p-4 text-sm">
          <p className="font-bold text-rosa-deep">E-books entregados al instante: verificá la transferencia</p>
          <p className="mt-1 text-ink">El cliente ya puede descargar. Fijate en tu banco que haya llegado {formatARS(order.total)} y confirmalo.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="success" busy={busy === 'received'} onClick={() => reviewInstant(true)}>Me llegó la transferencia</Button>
            <Button variant="danger" busy={busy === 'rejected'} onClick={() => reviewInstant(false)}>No llegó: quitar acceso</Button>
          </div>
        </div>
      )}
      {order.receipt_ai && (
        <div className={`mt-3 rounded-2xl p-3 text-xs ${order.receipt_ai.veredicto === 'aprobar' ? 'bg-whatsapp/10 text-ink' : 'bg-arena text-ink'}`}>
          <p className="font-bold">{order.receipt_ai.veredicto === 'aprobar' ? 'Lectura del comprobante: coincide' : 'Lectura del comprobante: revisalo vos'}</p>
          <p className="mt-1">{order.receipt_ai.motivo}</p>
          {order.receipt_ai.leido && (
            <p className="mt-1 text-piedra">
              Destinatario: {order.receipt_ai.leido.destinatario ?? '—'} · Alias: {order.receipt_ai.leido.alias ?? '—'} · Monto: {order.receipt_ai.leido.monto != null ? formatARS(order.receipt_ai.leido.monto) : '—'} · Fecha: {order.receipt_ai.leido.fecha ?? '—'} · Operación: {order.receipt_ai.leido.operacion ?? '—'}
            </p>
          )}
        </div>
      )}
      {order.payment_method === 'card'
        ? <p className="mt-3 text-xs font-semibold text-whatsapp">✓ Pagado con tarjeta (Ualá): {formatARS(order.card_total ?? order.total)}, a vos te queda {formatARS(order.total)}</p>
        : order.payment_check === 'ok' && <p className="mt-3 text-xs font-semibold text-whatsapp">✓ Transferencia verificada</p>}
      {order.card_payments?.filter((card) => card.status.startsWith('REVISAR')).map((card) => (
        <p key={card.uala_order_id} className="mt-3 rounded-2xl bg-arena p-3 text-xs text-ink"><b>Pago con tarjeta para revisar:</b> Ualá informó un pago ({card.status.replace('REVISAR_', '')}) que no coincide con el pedido. Buscá la orden {card.uala_order_id} en tu panel de Ualá antes de aprobar.</p>
      ))}
      {order.payment_check === 'rejected' && <p className="mt-3 text-xs font-semibold text-rosa-deep">✗ Transferencia no acreditada: se quitó el acceso</p>}

      <ul className="mt-3 space-y-1.5 rounded-2xl bg-papel px-3.5 py-3 text-[13px]">
        {order.order_items.map((item) => (
          <li key={item.id}>
            <p className="font-semibold text-ink">{item.product_name}{item.ebooks ? ` — ${item.ebooks.title}` : ''} <span className="font-normal text-piedra">({money(item.unit_price)})</span></p>
            {item.extras.map((extra) => <p key={`${extra.group_id}-${extra.option_id}`} className="text-piedra">+ {extra.label}{extra.detail ? `: ${extra.detail}` : ''} ({money(extra.price)})</p>)}
          </li>
        ))}
        {order.customer_note && <li className="border-t border-line pt-2 text-ink"><b>Nota del cliente:</b> {order.customer_note}</li>}
      </ul>
      {/* Sessions go on after the CV is delivered: each one with its own state (it is handled in Sesiones). */}
      {(order.sessions ?? []).length > 0 && order.status !== 'cancelled' && (
        <ul className="mt-2 space-y-1 text-[13px]">
          {order.sessions!.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Video className="h-4 w-4 shrink-0 text-rosa" /><span className="font-semibold text-ink">{item.title}</span>
              <span className={`rounded-full px-2 py-0.5 font-display text-[11px] font-bold ${item.status === 'done' ? 'bg-whatsapp/15 text-whatsapp' : item.status === 'cancelled' ? 'bg-papel text-piedra' : 'bg-arena text-ciruela'}`}>
                {item.status === 'done' ? 'Realizada' : item.status === 'cancelled' ? 'Cancelada' : item.status === 'scheduled' && item.scheduled_at ? `Agendada: ${formatDate(item.scheduled_at, true)}` : 'Por agendar'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {service && order.status !== 'cancelled' && order.status !== 'pending_payment' && <CanvaLink order={order} />}
      <TeamRow order={order} tasks={order.team_tasks ?? []} firstName={firstName} onChanged={onChanged} />

      {/* One main action (the next step), one WhatsApp button (with the message for this step) and the rest under "Más opciones". */}
      {(order.status === 'pending_payment' || order.status === 'payment_review') && !order.receipt_path && <p className="mt-4 text-sm text-piedra">Sin comprobante todavía.</p>}
      {/* Every action button has the same size: two per row, so cards line up whatever the step. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(order.status === 'pending_payment' || order.status === 'payment_review') && (order.receipt_path
          ? <Button variant="success" className={action} busy={busy === 'paid'} onClick={() => setStatus('paid')}>Aprobar pago</Button>
          : <Button variant="success" className={action} busy={busy === 'paid'} onClick={approveOutsideWeb}>Me llegó el pago</Button>)}
        {order.status === 'paid' && <Button className={action} busy={busy === 'in_progress'} onClick={() => setStatus('in_progress')}>Pasar a En proceso</Button>}
        {order.status === 'in_progress' && <Button className={action} busy={busy === 'delivered'} onClick={() => setStatus('delivered')}>{service && session ? 'Marcar CV entregado' : 'Marcar entregado'}</Button>}
        {order.status === 'cancelled' && <Button variant="secondary" className={action} busy={busy === 'pending_payment'} onClick={() => setStatus('pending_payment')}>Reabrir</Button>}
        {(templateLink ?? whatsapp) && (
          <a href={(templateLink ?? whatsapp)!} onClick={(event) => openBusinessWhatsapp(event, (templateLink ?? whatsapp)!)} target="_blank" rel="noreferrer" title={template?.text ?? 'Se abre en WhatsApp Business (11 5106-0953)'} className={`${action} inline-flex items-center justify-center gap-2 rounded-full border border-whatsapp/40 px-3 py-2 font-display text-[13px] font-bold text-whatsapp hover:bg-whatsapp hover:text-white`}>
            <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />{template?.label ?? 'WhatsApp'}
          </a>
        )}
        {order.receipt_path && <Button variant="secondary" className={action} onClick={openReceipt}><FileText className="h-4 w-4" />Comprobante</Button>}
      </div>
      <div className="mt-1.5 flex justify-end">
        <button type="button" onClick={() => setMore((open) => !open)} aria-expanded={more} className="inline-flex items-center gap-1 py-0.5 text-xs font-semibold text-piedra hover:text-ciruela">
          Más opciones<ChevronDown className={`h-3.5 w-3.5 transition-transform ${more ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {more && (
        <div className="mt-3 space-y-3 rounded-2xl bg-papel/60 p-3">
          {/* WhatsApp sales have no customer account, so the note is only for Vale. */}
          <label className="block text-xs font-semibold uppercase tracking-wider text-piedra">{order.source === 'whatsapp' ? 'Nota interna' : 'Mensaje para el cliente (lo ve en su pedido)'}
            <div className="mt-1 flex gap-2">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={order.source === 'whatsapp' ? 'Ej: Me pasó el CV viejo, falta la foto.' : 'Ej: ¡Gracias! Te escribo hoy por WhatsApp.'} className={`${inputClass} mt-0`} />
              <Button variant="secondary" busy={busy === order.status} disabled={note.trim() === (order.admin_note ?? '').trim()} onClick={() => setStatus(order.status)}>Guardar</Button>
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {order.status === 'paid' && <Button variant="secondary" busy={busy === 'delivered'} onClick={() => setStatus('delivered')}>Marcar entregado</Button>}
            {deadline && (order.waiting_since
              ? <Button variant="secondary" busy={busy === 'waiting'} onClick={() => setWaiting(false)}><Hourglass className="h-4 w-4" />El cliente ya respondió</Button>
              : <Button variant="secondary" busy={busy === 'waiting'} onClick={() => setWaiting(true)}><Hourglass className="h-4 w-4" />Esperando al cliente</Button>)}
            {order.status === 'delivered' && <Button variant="secondary" busy={busy === 'in_progress'} onClick={() => setStatus('in_progress')}>Volver a En proceso</Button>}
            {template && whatsapp && <a href={whatsapp} onClick={(event) => openBusinessWhatsapp(event, whatsapp)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-display text-sm font-bold text-ciruela"><WhatsAppIcon className="h-4 w-4" />Escribir sin mensaje</a>}
            {/* Fallback when the device opens the personal WhatsApp: copy and paste it in WhatsApp Business. */}
            <Button variant="secondary" onClick={() => copyMessage(template?.text ?? `¡Hola ${firstName}! Te escribo por tu pedido #${order.number} de Armado de CV.`)}><Copy className="h-4 w-4" />Copiar mensaje{phone ? ' y número' : ''}</Button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && <Button variant="danger" busy={busy === 'cancelled'} onClick={() => setStatus('cancelled')}>Cancelar pedido</Button>}
          </div>
          {order.source === 'whatsapp' && <EditSale order={order} onSaved={onChanged} />}
        </div>
      )}
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

const PAGE_SIZE = 12

/** Page numbers to show: first, last and the ones around the current page (null = "…"). */
function pageList(current: number, pages: number): (number | null)[] {
  const list: (number | null)[] = []
  for (let index = 0; index < pages; index++) {
    if (index === 0 || index === pages - 1 || Math.abs(index - current) <= 1) list.push(index)
    else if (list[list.length - 1] !== null) list.push(null)
  }
  return list
}

const KINDS: { id: Kind | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos los productos' },
  { id: 'cv', label: 'CV y LinkedIn' },
  { id: 'guias', label: 'Guías' },
  { id: 'asesorias', label: 'Asesorías y sesiones' },
]
const CHANNELS: { id: 'todos' | 'web' | 'whatsapp'; label: string }[] = [
  { id: 'todos', label: 'Web y WhatsApp' },
  { id: 'web', label: 'Solo web' },
  { id: 'whatsapp', label: 'Solo WhatsApp' },
]
const filterSelect = 'h-10 rounded-full border border-line bg-white px-3 font-display text-xs font-bold text-ciruela outline-none focus:border-rosa'

/**
 * Orders as a board of work stages. `initialFilter` / `initialSearch` come from the home
 * (a status counter, or "Ver" on one order as "#7"); older view names are mapped to the stages.
 */
export function OrdersAdmin({ initialFilter = 'hoy', initialSearch = '' }: { initialFilter?: Filter; initialSearch?: string }) {
  const [stage, setStage] = useState<Stage>(toStage(initialFilter))
  const [kind, setKind] = useState<Kind | 'todos'>('todos')
  const [channel, setChannel] = useState<'todos' | 'web' | 'whatsapp'>(initialFilter === 'whatsapp' ? 'whatsapp' : 'todos')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [buyers, setBuyers] = useState<Record<string, Buyer>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(initialSearch)
  const [linkOpen, setLinkOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [dragging, setDragging] = useState<AdminOrder | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  const flash = useFlash()
  // Orders that were new when this visit started keep the "Nuevo" label until the panel is reopened.
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const top = useRef<HTMLDivElement>(null)

  // Every order is loaded once and sorted into stages here, so switching stages is instant.
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('orders').select(ADMIN_ORDER_SELECT).order('created_at', { ascending: false }).limit(1000)
    setError(loadError ? errorMessage(loadError) : '')
    const list = (data as AdminOrder[] | null) ?? []
    setOrders(list)
    const ids = [...new Set(list.flatMap((order) => (order.user_id ? [order.user_id] : [])))]
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, phone').in('id', ids)
      setBuyers(Object.fromEntries(((profiles as Buyer[] | null) ?? []).map((profile) => [profile.id, profile])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Keep the board live while it is open (new web orders, WhatsApp sales, status changes).
  useEffect(() => {
    let timer: number | undefined
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(load, 700) }
    // Team tasks too: a CV finished by the team shows up in Hoy.
    const channelSub = supabase.channel('admin-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, soon).on('postgres_changes', { event: '*', schema: 'public', table: 'team_tasks' }, soon).subscribe()
    return () => { window.clearTimeout(timer); supabase.removeChannel(channelSub) }
  }, [load])

  const isNew = useCallback((order: AdminOrder) => (!order.seen_at && order.status !== 'cancelled' && order.number < 90000) || fresh.has(order.id), [fresh])
  const filtered = useMemo(() => orders.filter((order) => (channel === 'todos' || order.source === channel) && (kind === 'todos' || kindsOf(order).includes(kind))), [orders, channel, kind])
  const reasons = useMemo(() => new Map(filtered.map((order) => [order.id, todayReason(order, isNew(order))])), [filtered, isNew])
  const byStage = useMemo(() => {
    const groups = Object.fromEntries(STAGES.map((item) => [item.id, [] as AdminOrder[]])) as Record<Stage, AdminOrder[]>
    for (const order of filtered) {
      groups[stageOf(order)].push(order)
      if (reasons.get(order.id)) groups.hoy.push(order)
      if (isNew(order)) groups.nuevos.push(order)
    }
    return groups
  }, [filtered, reasons, isNew])

  // Search by order number, customer name, email or phone across every stage; "#7" means exactly order 7.
  const term = search.trim().toLowerCase().replace(/^#/, '')
  const exact = /^#\d+$/.test(search.trim())
  const searching = Boolean(term)
  const matches = exact ? orders.filter((order) => String(order.number) === term) : orders.filter((order) => {
    const buyer = order.user_id ? buyers[order.user_id] : undefined
    return [String(order.number), order.customer_name, order.customer_phone, buyer?.email, buyer?.full_name, buyer?.phone].some((value) => value?.toLowerCase().includes(term))
  })
  const shown = searching ? matches : sortForStage(stage, byStage[stage], reasons) as AdminOrder[]

  // Long stages are split into pages.
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const pageOrders = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  useEffect(() => { setPage(0) }, [stage, search, kind, channel])

  // Unseen orders on screen count as seen after a moment (the red number on Pedidos goes down).
  const unseenKey = pageOrders.filter((order) => !order.seen_at).map((order) => order.id).join(',')
  useEffect(() => {
    const unseen = unseenKey ? unseenKey.split(',') : []
    if (!unseen.length) return
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      setFresh((currentSet) => new Set([...currentSet, ...unseen]))
      supabase.rpc('admin_mark_orders_seen', { p_orders: unseen }).then(() => undefined, () => undefined)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [unseenKey])

  function goTo(next: number) {
    setPage(next)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // A drag that ends outside a stage leaves everything as it was.
  useEffect(() => {
    const reset = () => { setDragging(null); setOver(null) }
    window.addEventListener('dragend', reset)
    return () => window.removeEventListener('dragend', reset)
  }, [])

  // Drag a card onto a stage to move it there (only the moves that make sense; the rest from the card).
  async function drop(target: Stage) {
    const order = dragging
    setDragging(null); setOver(null)
    if (!order) return
    const move = moveTo(order, target)
    const label = STAGES.find((item) => item.id === target)?.label ?? ''
    if (!move) {
      if (stageOf(order) !== target) flash.show('error', `El pedido #${order.number} no se puede pasar a "${label}" arrastrándolo: hacelo desde su ficha.`)
      return
    }
    if (move.kind === 'status' && move.confirm === 'paid' && !window.confirm(`¿Ya te llegó el pago de ${formatARS(order.total)} del pedido #${order.number}?`)) return
    const { error: moveError } = move.kind === 'status'
      ? await supabase.rpc('admin_set_order_status', { p_order: order.id, p_status: move.status, p_note: null })
      : await supabase.rpc('admin_set_waiting', { p_order: order.id, p_waiting: move.waiting })
    if (moveError) { flash.show('error', errorMessage(moveError)); return }
    flash.show('ok', `Pedido #${order.number} pasado a "${label}".`)
    load()
  }

  const stageInfo = STAGES.find((item) => item.id === stage)!
  const visibleStages = STAGES.filter((item) => item.id !== 'nuevos' || byStage.nuevos.length > 0 || stage === 'nuevos')

  return (
    <div ref={top} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en todos: nombre, # o teléfono" aria-label="Buscar pedidos" className="h-10 min-w-0 basis-full rounded-full border border-line bg-white px-4 text-base outline-none sm:basis-auto sm:flex-1 focus:border-rosa sm:max-w-sm sm:text-sm" />
        <HideMoneyButton className="h-10 w-10 justify-center text-sm sm:w-auto sm:px-4" />
        <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ciruela px-4 font-display text-sm font-bold text-white hover:bg-rosa sm:flex-none"><Link2 className="h-4 w-4" />Link de pedido</button>
        <button type="button" onClick={load} className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line bg-white font-display text-sm font-bold text-piedra hover:text-ciruela sm:w-auto sm:px-4" aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Actualizar</span></button>
      </div>

      {searching ? (
        <button type="button" onClick={() => setSearch('')} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rosa-deep hover:underline">{exact ? `Mostrando el pedido ${search.trim()}` : `${matches.length} ${matches.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'} en todas las etapas`} · Volver al tablero</button>
      ) : (
        <>
          {/* Stages in the order of the work. On the phone it is one swipeable row; cards can be dropped on a stage on a computer. */}
          <div role="tablist" aria-label="Etapas de los pedidos" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {visibleStages.map((item) => {
              const count = byStage[item.id].length
              const active = stage === item.id
              const target = dragging && moveTo(dragging, item.id)
              return (
                <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setStage(item.id)}
                  onDragOver={(event) => { if (dragging) { event.preventDefault(); setOver(item.id) } }}
                  onDragLeave={() => setOver((currentOver) => (currentOver === item.id ? null : currentOver))}
                  onDrop={(event) => { event.preventDefault(); drop(item.id) }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-xs font-bold transition-all ${active ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'} ${dragging && target ? 'ring-2 ring-whatsapp/60' : ''} ${over === item.id && target ? 'scale-105 bg-whatsapp text-white' : ''}`}>
                  {item.label}
                  <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-white/20' : item.id === 'hoy' && count ? 'bg-rosa text-white' : item.id === 'nuevos' ? 'bg-rosa text-white' : 'bg-papel text-piedra'}`}>{count}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={kind} onChange={(event) => setKind(event.target.value as Kind | 'todos')} aria-label="Producto" className={filterSelect}>{KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
            <select value={channel} onChange={(event) => setChannel(event.target.value as 'todos' | 'web' | 'whatsapp')} aria-label="Canal" className={filterSelect}>{CHANNELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
            {(kind !== 'todos' || channel !== 'todos') && <button type="button" onClick={() => { setKind('todos'); setChannel('todos') }} className="text-xs font-semibold text-rosa-deep hover:underline">Quitar filtros</button>}
          </div>
          <p className="mt-3 text-sm text-piedra">{stageInfo.hint}<span className="hidden md:inline"> Para cambiar de etapa, arrastrá la ficha hasta la etapa de arriba.</span></p>
        </>
      )}

      {flash.node && <div className="mt-3">{flash.node}</div>}
      {error && <p className="mt-4 text-sm text-rosa-deep">{error}</p>}
      {!loading && shown.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-white p-8 text-center text-piedra">{searching ? 'No encontré pedidos con esa búsqueda.' : stage === 'hoy' ? '¡Nada urgente hoy! Todo al día.' : 'No hay pedidos en esta etapa.'}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {pageOrders.map((order) => (
            <OrderCard key={order.id} order={order} buyer={order.user_id ? buyers[order.user_id] : undefined} fresh={isNew(order)}
              reason={stage === 'hoy' || searching ? reasons.get(order.id) ?? todayReason(order, isNew(order)) : null}
              onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', order.id); setDragging(order) }}
              onChanged={load} />
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Páginas de pedidos" className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} className="inline-flex h-10 items-center gap-1 rounded-full bg-white px-3 font-display text-sm font-bold text-ciruela disabled:opacity-40" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Anterior</span></button>
            {pageList(current, pages).map((item, index) => item === null
              ? <span key={`gap-${index}`} className="px-1 text-piedra">…</span>
              : <button key={item} type="button" onClick={() => goTo(item)} aria-current={item === current ? 'page' : undefined} className={`h-10 min-w-10 rounded-full px-2 font-display text-sm font-bold ${item === current ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>{item + 1}</button>)}
            <button type="button" onClick={() => goTo(current + 1)} disabled={current === pages - 1} className="inline-flex h-10 items-center gap-1 rounded-full bg-white px-3 font-display text-sm font-bold text-ciruela disabled:opacity-40" aria-label="Página siguiente"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-piedra">Pedidos {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, shown.length)} de {shown.length}</p>
        </nav>
      )}
      {linkOpen && <OrderLinkDialog onClose={() => setLinkOpen(false)} />}
    </div>
  )
}
