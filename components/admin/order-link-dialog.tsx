'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Link2, Trash2, X } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { SITE_URL, formatARS } from '@/lib/catalog'
import { formatDate } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import type { SaleItem } from '@/lib/whatsapp-sale'
import { SaleItemsEditor, useSaleCatalog } from './sale-items'
import { Button, inputClass } from './ui'

type LinkRow = { token: string; customer_name: string | null; created_at: string; expires_at: string; items: { product_id: string }[]; orders: { number: number } | null }

const label = 'text-xs font-semibold uppercase tracking-wider text-piedra'
const linkUrl = (token: string) => `${SITE_URL}/pedido/${token}`

function whatsappTo(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '')
  const full = !digits ? '' : digits.startsWith('54') ? digits : `549${digits.replace(/^0/, '').replace(/^15/, '')}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

/** Build an order for a customer and send them the link: they confirm and pay on the web, and the order stays traceable. */
export function OrderLinkDialog({ onClose }: { onClose: () => void }) {
  const { products, extras, totalOf } = useSaleCatalog()
  const [items, setItems] = useState<SaleItem[]>([{ productId: null, extras: [] }])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  // Special price agreed with the customer; empty = catalog price.
  const [customTotal, setCustomTotal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [recent, setRecent] = useState<LinkRow[]>([])

  const loadRecent = useCallback(() => {
    supabase.from('order_links').select('token, customer_name, created_at, expires_at, items, orders(number)').order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setRecent((data as unknown as LinkRow[] | null) ?? []))
  }, [])
  useEffect(() => { loadRecent() }, [loadRecent])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const catalogTotal = totalOf(items)
  const special = Number(customTotal) > 0 && Number(customTotal) !== catalogTotal ? Number(customTotal) : null
  const total = special ?? catalogTotal
  const ready = items.length > 0 && items.every((item) => item.productId)

  async function create() {
    setBusy(true); setError('')
    const { data, error: insertError } = await supabase.from('order_links').insert({
      items: items.map((item) => ({ product_id: item.productId, extras: item.extras.map((extra) => ({ group_id: extra.groupId, option_id: extra.optionId })) })),
      customer_name: name.trim() || null, customer_phone: phone.trim() || null, message: message.trim() || null,
      custom_total: special,
    }).select('token').single()
    setBusy(false)
    if (insertError || !data) { setError(errorMessage(insertError)); return }
    setCreated((data as { token: string }).token)
    loadRecent()
  }

  async function copy(token: string) {
    try { await navigator.clipboard.writeText(linkUrl(token)); setCopied(true); window.setTimeout(() => setCopied(false), 2000) } catch { /* the link stays visible to copy by hand */ }
  }

  async function remove(token: string) {
    if (!window.confirm('¿Borrar este link? Quien lo tenga ya no va a poder usarlo.')) return
    await supabase.from('order_links').delete().eq('token', token)
    loadRecent()
  }

  const firstName = name.trim().split(/\s+/)[0]
  const shareText = (token: string) => `¡Hola${firstName ? ` ${firstName}` : ''}! Te dejo tu pedido listo para confirmar y pagar: ${linkUrl(token)}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="link-title" onClick={onClose}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="link-title" className="flex items-center gap-2 font-display text-lg font-bold"><Link2 className="h-5 w-5 text-petalo" />Link de pedido</p>
            <p className="text-sm text-white/80">Armá el pedido y mandale el link: lo confirma y paga en la web.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {created ? (
            <div className="rounded-2xl border border-whatsapp/40 bg-whatsapp/5 p-4">
              <p className="flex items-center gap-2 font-display font-bold text-ciruela"><Check className="h-5 w-5 text-whatsapp" />Link listo · {formatARS(total)}</p>
              <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-ink">{linkUrl(created)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={whatsappTo(phone, shareText(created))} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-whatsapp px-4 py-2 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" />Enviar por WhatsApp</a>
                <Button variant="secondary" onClick={() => copy(created)}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiado' : 'Copiar link'}</Button>
                <Button variant="secondary" onClick={() => { setCreated(null); setItems([{ productId: null, extras: [] }]); setName(''); setPhone(''); setMessage(''); setCustomTotal('') }}>Armar otro</Button>
              </div>
              <p className="mt-2 text-xs text-piedra">Vence en 30 días. Cuando lo confirme, el pedido aparece en Pedidos con la etiqueta &quot;Por link&quot; y te llega el aviso.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className={`col-span-2 sm:col-span-1 ${label}`}>Cliente (opcional)<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Para saludarla/o" className={inputClass} /></label>
                <label className={`col-span-2 sm:col-span-1 ${label}`}>WhatsApp (opcional)<input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="11 2345-6789" className={inputClass} /></label>
              </div>
              <div>
                <p className={label}>Qué va a comprar</p>
                <SaleItemsEditor items={items} onChange={setItems} products={products} extras={extras} onlyOffered />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <p className="col-span-2 -mb-2 text-sm text-ink sm:col-span-1 sm:mb-0 sm:self-end">Según tu catálogo: <b>{formatARS(catalogTotal)}</b></p>
                <label className={`col-span-2 sm:col-span-1 ${label}`}>Precio final (opcional)<input inputMode="numeric" value={customTotal} onChange={(event) => setCustomTotal(event.target.value.replace(/\D/g, ''))} placeholder={catalogTotal ? String(catalogTotal) : 'Ej: 100000'} className={inputClass} /></label>
                {special && <p className="col-span-2 -mt-1 text-xs text-whatsapp">El cliente va a ver el precio especial de {formatARS(special)} (en lugar de {formatARS(catalogTotal)}).</p>}
              </div>
              <label className={`block ${label}`}>Mensaje (opcional)<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Ej: Como hablamos, te armé el Premium con la sección Servicios." className={inputClass} /></label>
              <p className="text-xs text-piedra">Los adicionales son los que ofrece cada pack en la web. Si ponés un precio final, el cliente paga ese monto.</p>
            </>
          )}

          {recent.length > 0 && (
            <div>
              <p className={label}>Últimos links</p>
              <ul className="mt-1 divide-y divide-line rounded-2xl border border-line bg-white">
                {recent.map((row) => {
                  const expired = new Date(row.expires_at) < new Date()
                  return (
                    <li key={row.token} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{row.customer_name || 'Sin nombre'} <span className="font-normal text-piedra">· {row.items.length} {row.items.length === 1 ? 'producto' : 'productos'}</span></p>
                        <p className="text-xs text-piedra">{formatDate(row.created_at)}</p>
                      </div>
                      {row.orders ? <span className="rounded-full bg-whatsapp/15 px-2.5 py-1 font-display text-xs font-bold text-whatsapp">Pedido #{row.orders.number}</span>
                        : expired ? <span className="rounded-full bg-line px-2.5 py-1 font-display text-xs font-bold text-piedra">Vencido</span>
                          : <span className="rounded-full bg-arena px-2.5 py-1 font-display text-xs font-bold text-ciruela">Pendiente</span>}
                      {!row.orders && <button type="button" onClick={() => copy(row.token)} className="rounded-full p-1.5 text-piedra hover:bg-papel hover:text-ciruela" aria-label="Copiar link"><Copy className="h-4 w-4" /></button>}
                      {!row.orders && <button type="button" onClick={() => remove(row.token)} className="rounded-full p-1.5 text-piedra hover:bg-petalo-wash hover:text-rosa-deep" aria-label="Borrar link"><Trash2 className="h-4 w-4" /></button>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {!created && (
          <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
            {error && <p role="alert" className="mb-2 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
            <Button className="w-full" busy={busy} disabled={!ready} onClick={create}><Link2 className="h-4 w-4" />Crear link{total ? ` · ${formatARS(total)}` : ''}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
