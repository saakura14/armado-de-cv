'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, MessageCircle, RefreshCw } from 'lucide-react'
import { formatARS } from '@/lib/catalog'
import { ORDER_SELECT, STATUS, formatDate, type Order, type OrderStatus } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, cardClass, inputClass, useFlash } from './ui'

type Filter = 'activos' | OrderStatus | 'todos'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'activos', label: 'Para atender' },
  { id: 'payment_review', label: 'Revisar pago' },
  { id: 'pending_payment', label: 'Sin pagar' },
  { id: 'paid', label: 'Pagados' },
  { id: 'in_progress', label: 'En proceso' },
  { id: 'delivered', label: 'Entregados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'todos', label: 'Todos' },
]

type Buyer = { id: string; email: string | null; full_name: string | null; phone: string | null }

function waLink(phone: string | null, text: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const full = digits.startsWith('54') ? digits : `549${digits.replace(/^0/, '').replace(/^15/, '')}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

function OrderCard({ order, buyer, onChanged }: { order: Order; buyer?: Buyer; onChanged: () => void }) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState(order.admin_note ?? '')
  const flash = useFlash()

  async function setStatus(status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(`¿Cancelar el pedido #${order.number}?`)) return
    setBusy(status)
    const { data, error } = await supabase.rpc('admin_set_order_status', { p_order: order.id, p_status: status, p_note: note.trim() || null })
    setBusy('')
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', data === 'delivered' && status === 'paid' ? 'Pago aprobado: los e-books ya están disponibles para el cliente.' : 'Pedido actualizado.')
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
  const whatsapp = waLink(phone, `¡Hola ${name.split(' ')[0]}! Te escribo por tu pedido #${order.number} de Armado de CV.`)

  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-piedra">#{order.number} · {formatDate(order.created_at, true)}</p>
          <p className="mt-1 font-bold text-ink">{name}</p>
          <p className="text-sm text-piedra">{buyer?.email}{phone ? ` · ${phone}` : ''}</p>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-3 py-1 font-display text-xs font-bold ${status.tone}`}>{status.label}</span>
          <p className="mt-2 font-display text-xl font-extrabold text-ciruela">{formatARS(order.total)}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 rounded-2xl bg-papel p-4 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id}>
            <p className="font-semibold text-ink">{item.product_name}{item.ebooks ? ` — ${item.ebooks.title}` : ''} <span className="font-normal text-piedra">({formatARS(item.unit_price)})</span></p>
            {item.extras.map((extra) => <p key={`${extra.group_id}-${extra.option_id}`} className="text-piedra">+ {extra.label}{extra.detail ? `: ${extra.detail}` : ''} ({formatARS(extra.price)})</p>)}
          </li>
        ))}
        {order.customer_note && <li className="border-t border-line pt-2 text-ink"><b>Nota del cliente:</b> {order.customer_note}</li>}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {order.receipt_path ? <Button variant="secondary" onClick={openReceipt}><FileText className="h-4 w-4" />Ver comprobante</Button> : <span className="self-center text-sm text-piedra">Sin comprobante todavía</span>}
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-whatsapp/40 px-4 py-2 font-display text-sm font-bold text-whatsapp"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-piedra">Mensaje para el cliente (lo ve en su pedido)
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej: ¡Gracias! Te escribo hoy por WhatsApp." className={inputClass} />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {(order.status === 'pending_payment' || order.status === 'payment_review') && <Button variant="success" busy={busy === 'paid'} onClick={() => setStatus('paid')}>Aprobar pago</Button>}
        {(order.status === 'paid') && <Button busy={busy === 'in_progress'} onClick={() => setStatus('in_progress')}>Marcar en proceso</Button>}
        {(order.status === 'paid' || order.status === 'in_progress') && <Button busy={busy === 'delivered'} onClick={() => setStatus('delivered')}>Marcar entregado</Button>}
        {order.status !== 'cancelled' && order.status !== 'delivered' && <Button variant="danger" busy={busy === 'cancelled'} onClick={() => setStatus('cancelled')}>Cancelar</Button>}
        {order.status === 'cancelled' && <Button variant="secondary" busy={busy === 'pending_payment'} onClick={() => setStatus('pending_payment')}>Reabrir</Button>}
      </div>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

export function OrdersAdmin() {
  const [filter, setFilter] = useState<Filter>('activos')
  const [orders, setOrders] = useState<Order[]>([])
  const [buyers, setBuyers] = useState<Record<string, Buyer>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(100)
    if (filter === 'activos') query = query.in('status', ['payment_review', 'paid', 'in_progress'])
    else if (filter !== 'todos') query = query.eq('status', filter)
    const { data, error: loadError } = await query
    if (loadError) setError(errorMessage(loadError))
    const list = (data as Order[] | null) ?? []
    setOrders(list)
    const ids = [...new Set(list.map((order) => order.user_id))]
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, phone').in('id', ids)
      setBuyers(Object.fromEntries(((profiles as Buyer[] | null) ?? []).map((profile) => [profile.id, profile])))
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-full px-3.5 py-1.5 font-display text-xs font-bold ${filter === item.id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>{item.label}</button>
        ))}
        <button type="button" onClick={load} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-ciruela" aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
      </div>
      {error && <p className="mt-4 text-sm text-rosa-deep">{error}</p>}
      {!loading && orders.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-white p-8 text-center text-piedra">No hay pedidos en esta vista.</p>
      ) : (
        <ul className="mt-5 grid gap-4 xl:grid-cols-2">{orders.map((order) => <OrderCard key={order.id} order={order} buyer={buyers[order.user_id]} onChanged={load} />)}</ul>
      )}
    </div>
  )
}
