'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, FileText, Link2, Palette, Pencil, RefreshCw } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS } from '@/lib/catalog'
import { ORDER_SELECT, STATUS, formatDate, type Order, type OrderStatus } from '@/lib/orders'
import { deliveryDeadline, formatDue } from '@/lib/dashboard'
import { DeadlineChip } from './dashboard-admin'
import { OrderLinkDialog } from './order-link-dialog'

// The admin also sees every Ualá checkout opened for the order (buyers can't read that table).
type AdminOrder = Order & { card_payments?: { uala_order_id: string; status: string; amount: number }[]; order_links?: { created_at: string }[]; order_private?: { canva_url: string | null } | { canva_url: string | null }[] | null }
const ADMIN_ORDER_SELECT = `${ORDER_SELECT}, card_payments(uala_order_id, status, amount), order_links(created_at), order_private(canva_url)`
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, cardClass, inputClass, useFlash } from './ui'

export type Filter = 'activos' | 'gestionar' | 'verificar' | 'whatsapp' | OrderStatus | 'todos'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'activos', label: 'Para atender' },
  { id: 'gestionar', label: 'A gestionar' },
  { id: 'verificar', label: 'Verificar transferencia' },
  { id: 'payment_review', label: 'Revisar pago' },
  { id: 'pending_payment', label: 'Sin pagar' },
  { id: 'paid', label: 'Pagados' },
  { id: 'in_progress', label: 'En proceso' },
  { id: 'delivered', label: 'Entregados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'whatsapp', label: 'De WhatsApp' },
  { id: 'todos', label: 'Todos' },
]

type Buyer = { id: string; email: string | null; full_name: string | null; phone: string | null }

function waLink(phone: string | null, text: string) {
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
function openBusinessWhatsapp(event: React.MouseEvent<HTMLAnchorElement>, link: string) {
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

/** Fix a WhatsApp sale loaded with a mistake: amount charged, name, phone and payment date. */
function EditSale({ order, onSaved }: { order: AdminOrder; onSaved: () => void }) {
  const toDay = (value: string | null) => (value ? new Date(new Date(value).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10) : '')
  const [open, setOpen] = useState(false)
  const [total, setTotal] = useState(String(order.total))
  const [name, setName] = useState(order.customer_name ?? '')
  const [phone, setPhone] = useState(order.customer_phone ?? '')
  const [date, setDate] = useState(toDay(order.paid_at))
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save() {
    setBusy(true)
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
  const lines = order.order_items.reduce((sum, item) => sum + item.line_total, 0)
  return (
    <div className="mt-3 rounded-2xl border border-rosa/40 bg-petalo-wash/60 p-4">
      <p className="font-display text-sm font-bold text-ciruela">Editar venta por WhatsApp</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra sm:col-span-1">Cliente<input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra sm:col-span-1">WhatsApp<input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-semibold uppercase tracking-wider text-piedra">Fecha de pago<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-semibold uppercase tracking-wider text-piedra">Cobraste<input inputMode="numeric" value={total} onChange={(event) => setTotal(event.target.value.replace(/\D/g, ''))} className={inputClass} /></label>
      </div>
      {lines !== Number(total) && <p className="mt-2 text-xs text-piedra">Según los precios de lo que compró: {formatARS(lines)}.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button busy={busy} disabled={!name.trim() || !(Number(total) > 0)} onClick={save}>Guardar cambios</Button>
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
    return <button type="button" onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-rosa-deep"><Palette className="h-4 w-4 text-rosa" />+ Link de Canva <span className="text-xs font-normal">(solo lo ves vos)</span></button>
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
const action = 'min-h-11 w-full px-3 text-center leading-tight'

function OrderCard({ order, buyer, onChanged }: { order: AdminOrder; buyer?: Buyer; onChanged: () => void }) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState(order.admin_note ?? '')
  const [more, setMore] = useState(false)
  const { money } = useHideMoney()
  const flash = useFlash()

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
  const deadline = service && (order.status === 'paid' || order.status === 'in_progress') ? deliveryDeadline(order) : null
  // Ready-made message for the next step of this order.
  const template = order.status === 'pending_payment'
    ? { label: 'Recordar el pago', text: `¡Hola ${firstName}! Vi tu pedido #${order.number} (${products}) por ${formatARS(order.total)}. ¿Pudiste hacer la transferencia? Si tenés alguna duda, te ayudo.` }
    : service && (order.status === 'paid' || order.status === 'in_progress')
      ? { label: 'Pedir los datos', text: `¡Hola ${firstName}! Ya confirmé tu pago del pedido #${order.number} 🙌 Para arrancar, pasame tu CV actual (si tenés) y contame a qué puesto o rubro apuntás.` }
      : order.status === 'delivered'
        ? { label: 'Pedir un testimonio', text: `¡Hola ${firstName}! ¿Cómo te fue con tu ${products}? Si te gustó, me ayudaría muchísimo que me cuentes tu experiencia en un mensajito 💕 Si me das permiso, lo comparto en Instagram solo con tu nombre.` }
        : null
  const templateLink = template ? waLink(phone, template.text) : null

  return (
    <li className={cardClass}>
      {/* Row 1: number, date, origin and status. Row 2: customer and amount, always side by side. */}
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-xs font-semibold uppercase tracking-wider text-piedra">
          <span>#{order.number} · {formatDate(order.created_at, true)}</span>
          {order.source === 'whatsapp' && <span className="inline-flex items-center gap-1 rounded-full bg-whatsapp/15 px-2 py-0.5 normal-case tracking-normal text-whatsapp"><WhatsAppIcon className="h-3 w-3" />WhatsApp</span>}
          {(order.order_links?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-petalo-wash px-2 py-0.5 normal-case tracking-normal text-rosa-deep"><Link2 className="h-3 w-3" />Por link</span>}
        </p>
        <span className={`shrink-0 rounded-full px-3 py-1 font-display text-xs font-bold ${status.tone}`}>{status.label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{name}</p>
          {(buyer?.email || phone) && <p className="truncate text-sm text-piedra">{buyer?.email}{buyer?.email && phone ? ' · ' : ''}{phone}</p>}
        </div>
        <p className="shrink-0 font-display text-xl font-extrabold text-ciruela">{money(order.total)}</p>
      </div>
      {deadline && <p className="mt-3 flex flex-wrap items-center gap-2"><DeadlineChip deadline={deadline} /><span className="text-xs text-piedra">Entregar el {formatDue(deadline.due)}{deadline.express ? ' · Express' : ''}</span></p>}
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

      <ul className="mt-4 space-y-2 rounded-2xl bg-papel p-4 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id}>
            <p className="font-semibold text-ink">{item.product_name}{item.ebooks ? ` — ${item.ebooks.title}` : ''} <span className="font-normal text-piedra">({money(item.unit_price)})</span></p>
            {item.extras.map((extra) => <p key={`${extra.group_id}-${extra.option_id}`} className="text-piedra">+ {extra.label}{extra.detail ? `: ${extra.detail}` : ''} ({money(extra.price)})</p>)}
          </li>
        ))}
        {order.customer_note && <li className="border-t border-line pt-2 text-ink"><b>Nota del cliente:</b> {order.customer_note}</li>}
      </ul>
      {service && order.status !== 'cancelled' && order.status !== 'pending_payment' && <CanvaLink order={order} />}

      {/* One main action (the next step), one WhatsApp button (with the message for this step) and the rest under "Más opciones". */}
      {(order.status === 'pending_payment' || order.status === 'payment_review') && !order.receipt_path && <p className="mt-4 text-sm text-piedra">Sin comprobante todavía.</p>}
      {/* Every action button has the same size: two per row, so cards line up whatever the step. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(order.status === 'pending_payment' || order.status === 'payment_review') && (order.receipt_path
          ? <Button variant="success" className={action} busy={busy === 'paid'} onClick={() => setStatus('paid')}>Aprobar pago</Button>
          : <Button variant="success" className={action} busy={busy === 'paid'} onClick={approveOutsideWeb}>Me llegó el pago</Button>)}
        {order.status === 'paid' && <Button className={action} busy={busy === 'in_progress'} onClick={() => setStatus('in_progress')}>Pasar a En proceso</Button>}
        {order.status === 'in_progress' && <Button className={action} busy={busy === 'delivered'} onClick={() => setStatus('delivered')}>Marcar entregado</Button>}
        {order.status === 'cancelled' && <Button variant="secondary" className={action} busy={busy === 'pending_payment'} onClick={() => setStatus('pending_payment')}>Reabrir</Button>}
        {(templateLink ?? whatsapp) && (
          <a href={(templateLink ?? whatsapp)!} onClick={(event) => openBusinessWhatsapp(event, (templateLink ?? whatsapp)!)} target="_blank" rel="noreferrer" title={template?.text ?? 'Se abre en WhatsApp Business (11 5106-0953)'} className={`${action} inline-flex items-center justify-center gap-2 rounded-full border border-whatsapp/40 px-3 py-2 font-display text-sm font-bold text-whatsapp hover:bg-whatsapp hover:text-white`}>
            <WhatsAppIcon className="h-4 w-4 shrink-0" />{template?.label ?? 'WhatsApp'}
          </a>
        )}
        {order.receipt_path && <Button variant="secondary" className={action} onClick={openReceipt}><FileText className="h-4 w-4" />Comprobante</Button>}
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={() => setMore((open) => !open)} aria-expanded={more} className="inline-flex items-center gap-1 py-1 text-sm font-semibold text-piedra hover:text-ciruela">
          Más opciones<ChevronDown className={`h-4 w-4 transition-transform ${more ? 'rotate-180' : ''}`} />
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
            {template && whatsapp && <a href={whatsapp} onClick={(event) => openBusinessWhatsapp(event, whatsapp)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-display text-sm font-bold text-ciruela"><WhatsAppIcon className="h-4 w-4" />Escribir sin mensaje</a>}
            {order.status !== 'cancelled' && order.status !== 'delivered' && <Button variant="danger" busy={busy === 'cancelled'} onClick={() => setStatus('cancelled')}>Cancelar pedido</Button>}
          </div>
          {order.source === 'whatsapp' && <EditSale order={order} onSaved={onChanged} />}
        </div>
      )}
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

const PAGE_SIZE = 10

/** Page numbers to show: first, last and the ones around the current page (null = "…"). */
function pageList(current: number, pages: number): (number | null)[] {
  const list: (number | null)[] = []
  for (let index = 0; index < pages; index++) {
    if (index === 0 || index === pages - 1 || Math.abs(index - current) <= 1) list.push(index)
    else if (list[list.length - 1] !== null) list.push(null)
  }
  return list
}

/** `initialFilter` / `initialSearch` come from the home (a status counter or "Ver" on one order, as "#7"). */
export function OrdersAdmin({ initialFilter = 'activos', initialSearch = '' }: { initialFilter?: Filter; initialSearch?: string }) {
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [buyers, setBuyers] = useState<Record<string, Buyer>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(initialSearch)
  const [linkOpen, setLinkOpen] = useState(false)
  const [page, setPage] = useState(0)
  const top = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('orders').select(ADMIN_ORDER_SELECT).order('created_at', { ascending: false }).limit(500)
    if (filter === 'activos') query = query.or('status.in.(payment_review,paid,in_progress),payment_check.eq.pending')
    else if (filter === 'gestionar') query = query.or('status.in.(payment_review,paid),payment_check.eq.pending')
    else if (filter === 'verificar') query = query.eq('payment_check', 'pending')
    else if (filter === 'whatsapp') query = query.eq('source', 'whatsapp')
    else if (filter !== 'todos') query = query.eq('status', filter)
    const { data, error: loadError } = await query
    if (loadError) setError(errorMessage(loadError))
    const list = (data as AdminOrder[] | null) ?? []
    setOrders(list)
    const ids = [...new Set(list.flatMap((order) => (order.user_id ? [order.user_id] : [])))]
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, phone').in('id', ids)
      setBuyers(Object.fromEntries(((profiles as Buyer[] | null) ?? []).map((profile) => [profile.id, profile])))
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  // Keep the list live while it is open (new web orders, WhatsApp sales, status changes).
  useEffect(() => {
    let timer: number | undefined
    const channel = supabase.channel('admin-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { window.clearTimeout(timer); timer = window.setTimeout(load, 700) }).subscribe()
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel) }
  }, [load])

  // Search by order number, customer name, email or phone within the current view.
  const term = search.trim().toLowerCase().replace(/^#/, '')
  // "#7" means exactly order 7 (what "Ver" on the home sends).
  const exact = /^#\d+$/.test(search.trim())
  const shown = exact ? orders.filter((order) => String(order.number) === term) : term ? orders.filter((order) => {
    const buyer = order.user_id ? buyers[order.user_id] : undefined
    return [String(order.number), order.customer_name, order.customer_phone, buyer?.email, buyer?.full_name, buyer?.phone].some((value) => value?.toLowerCase().includes(term))
  }) : orders

  // Many orders are split into pages so the list doesn't become endless.
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const pageOrders = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  useEffect(() => { setPage(0) }, [filter, search])
  function goTo(next: number) {
    setPage(next)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div ref={top} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, # o teléfono" aria-label="Buscar pedidos" className="h-11 min-w-0 basis-full rounded-full border border-line bg-white px-4 text-base outline-none sm:basis-auto sm:flex-1 focus:border-rosa sm:max-w-sm sm:text-sm" />
        <HideMoneyButton className="h-11 w-11 justify-center text-sm sm:w-auto sm:px-4" />
        <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-ciruela px-4 font-display text-sm font-bold text-white hover:bg-rosa sm:flex-none"><Link2 className="h-4 w-4" />Link de pedido</button>
        <button type="button" onClick={load} className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line bg-white font-display text-sm font-bold text-piedra hover:text-ciruela sm:w-auto sm:px-4" aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Actualizar</span></button>
      </div>
      {search.trim() && <button type="button" onClick={() => { setSearch(''); if (exact) setFilter('activos') }} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-rosa-deep hover:underline">{exact ? `Mostrando el pedido ${search.trim()}` : 'Buscando'} · Ver todos los pedidos</button>}
      {/* One swipeable row on the phone, wrapped on bigger screens */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full px-3.5 py-2 font-display text-xs font-bold ${filter === item.id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>{item.label}</button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-rosa-deep">{error}</p>}
      {!loading && shown.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-white p-8 text-center text-piedra">{term ? 'No encontré pedidos con esa búsqueda en esta vista.' : 'No hay pedidos en esta vista.'}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">{pageOrders.map((order) => <OrderCard key={order.id} order={order} buyer={order.user_id ? buyers[order.user_id] : undefined} onChanged={load} />)}</ul>
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
