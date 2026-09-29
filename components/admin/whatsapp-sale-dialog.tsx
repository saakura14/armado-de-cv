'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS } from '@/lib/catalog'
import { errorMessage, supabase } from '@/lib/supabase'
import { parseSales, type ParsedSale, type SaleExtra, type SaleItem, type SaleProduct } from '@/lib/whatsapp-sale'
import { Button, inputClass } from './ui'

type Row = ParsedSale & { key: number; total: string; totalEdited: boolean; phone: string; delivered: boolean }
type ProductRow = { id: string; name: string; category: string; price: number; product_extra_groups: { group_id: string }[] }
type GroupRow = { id: string; label: string; unit_price: number; extra_options: { id: string; label: string; is_other: boolean; sort: number }[] }

const EXAMPLE = 'Cecilia Sanchez / Pack premium + pack medium + servicio de linkedin 29/09\nJuan Pérez / Pack Medium + express 27/09'
const daysAgo = (date: string) => (Date.now() - new Date(`${date}T12:00:00-03:00`).getTime()) / 86400000
const label = 'text-xs font-semibold uppercase tracking-wider text-piedra'

/** Paste one or many WhatsApp notes ("Nombre / Pack + adicionales + fecha"), check what was understood and save them as paid sales. */
export function WhatsappSaleDialog({ initialText = '', onClose, onSaved }: { initialText?: string; onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<SaleProduct[]>([])
  const [extras, setExtras] = useState<SaleExtra[]>([])
  const [text, setText] = useState(initialText)
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<number[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, name, category, price, product_extra_groups(group_id)').eq('active', true).order('sort'),
      supabase.from('extra_groups').select('id, label, unit_price, extra_options(id, label, is_other, sort)').order('id'),
    ]).then(([productRows, groupRows]) => {
      setProducts(((productRows.data as ProductRow[] | null) ?? []).map((row) => ({ id: row.id, name: row.name, category: row.category, price: row.price, groups: row.product_extra_groups.map((link) => link.group_id) })))
      setExtras(((groupRows.data as GroupRow[] | null) ?? []).flatMap((group) => [...group.extra_options].sort((a, b) => a.sort - b.sort).map((option) => ({
        groupId: group.id, optionId: option.id, groupLabel: group.label,
        // Single-option groups (Express, LinkedIn services) read better by the group name.
        label: group.extra_options.length === 1 ? group.label : option.label,
        price: group.unit_price, isOther: option.is_other,
      }))))
    })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const priceOf = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product.price])), [products])
  const extraOf = (groupId: string, optionId: string) => extras.find((extra) => extra.groupId === groupId && extra.optionId === optionId)
  const catalogTotal = (items: SaleItem[]) => items.reduce((sum, item) => sum + (item.productId ? priceOf[item.productId] ?? 0 : 0)
    + item.extras.reduce((acc, extra) => acc + (extraOf(extra.groupId, extra.optionId)?.price ?? 0), 0), 0)

  // Re-read the notes whenever the text (or the catalog) changes.
  useEffect(() => {
    if (!products.length) return
    setRows(parseSales(text, products, extras).map((sale, index) => ({
      ...sale,
      key: index,
      total: '',
      totalEdited: false,
      phone: '',
      // Old sales are most likely already delivered.
      delivered: daysAgo(sale.date) > 7,
    })))
  }, [text, products, extras])

  function update(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }
  function updateItems(row: Row, change: (items: SaleItem[]) => SaleItem[]) {
    update(row.key, { items: change(row.items.map((item) => ({ ...item, extras: [...item.extras] }))) })
  }

  const totalOf = (row: Row) => (row.totalEdited ? Number(row.total) || 0 : catalogTotal(row.items))
  const ready = rows.length > 0 && rows.every((row) => row.name.trim() && row.items.length && row.items.every((item) => item.productId) && totalOf(row) > 0 && row.date)

  async function save() {
    setBusy(true); setError('')
    const numbers: number[] = []
    for (const row of rows) {
      const { data, error: rpcError } = await supabase.rpc('admin_record_sale', {
        p_name: row.name, p_phone: row.phone, p_paid_on: row.date, p_delivered: row.delivered,
        p_items: row.items.map((item) => ({ product_id: item.productId, extras: item.extras.map((extra) => ({ group_id: extra.groupId, option_id: extra.optionId })) })),
        p_total: row.totalEdited ? Number(row.total) : null,
        p_note: `Venta por WhatsApp: ${row.raw}`,
      })
      if (rpcError) {
        setError(`${row.name}: ${errorMessage(rpcError)}${numbers.length ? ` (las anteriores ya se guardaron: #${numbers.join(', #')})` : ''}`)
        setRows((current) => current.slice(numbers.length))
        setBusy(false)
        if (numbers.length) onSaved()
        return
      }
      numbers.push(Number(data))
    }
    setBusy(false)
    setSaved(numbers)
    onSaved()
  }

  const grandTotal = rows.reduce((sum, row) => sum + totalOf(row), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="wa-sale-title" onClick={onClose}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-whatsapp px-5 py-4 text-white sm:px-7">
          <div>
            <p id="wa-sale-title" className="flex items-center gap-2 font-display text-lg font-bold"><WhatsAppIcon className="h-5 w-5" />Venta por WhatsApp</p>
            <p className="text-sm text-white/85">Pegá tu nota tal cual la anotás. Podés pegar varias, una por renglón.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        {saved.length > 0 ? (
          <div className="px-5 py-10 text-center sm:px-7">
            <CheckCircle2 className="mx-auto h-12 w-12 text-whatsapp" />
            <p className="mt-3 font-display text-xl font-bold text-ciruela">{saved.length === 1 ? `Venta guardada: pedido #${saved[0]}` : `${saved.length} ventas guardadas: #${saved.join(', #')}`}</p>
            <p className="mt-1 text-sm text-piedra">Ya cuentan en tus métricas, en lo más vendido y en el Excel.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => { setSaved([]); setText('') }}>Cargar otra</Button>
              <Button onClick={onClose}>Listo</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
              <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} placeholder={EXAMPLE} aria-label="Notas de ventas" className={`${inputClass} font-mono text-sm`} autoFocus={!initialText} />

              {rows.map((row) => {
                const missing = row.items.some((item) => !item.productId)
                return (
                  <div key={row.key} className={`rounded-2xl border bg-white p-4 ${missing ? 'border-rosa' : 'border-line'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-mono text-xs text-piedra" title={row.raw}>{row.raw}</p>
                      {rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="shrink-0 rounded-full p-1 text-piedra hover:bg-petalo-wash hover:text-rosa-deep" aria-label="Quitar venta"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <label className={`mt-2 block ${label}`}>Cliente
                      <input value={row.name} onChange={(event) => update(row.key, { name: event.target.value })} className={inputClass} />
                    </label>

                    <p className={`mt-3 ${label}`}>Qué compró</p>
                    <ul className="mt-1 space-y-2">
                      {row.items.map((item, index) => (
                        <li key={index} className="rounded-xl bg-papel p-3">
                          <div className="flex items-center gap-2">
                            <select value={item.productId ?? ''} onChange={(event) => updateItems(row, (items) => { items[index].productId = event.target.value || null; return items })} aria-label="Producto" className={`${inputClass} mt-0`}>
                              <option value="">Elegí…</option>
                              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatARS(product.price)}</option>)}
                            </select>
                            {row.items.length > 1 && <button type="button" onClick={() => updateItems(row, (items) => items.filter((_, position) => position !== index))} className="shrink-0 rounded-full p-1.5 text-piedra hover:bg-white hover:text-rosa-deep" aria-label="Quitar producto"><X className="h-4 w-4" /></button>}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {item.extras.map((extra, extraIndex) => {
                              const info = extraOf(extra.groupId, extra.optionId)
                              return (
                                <span key={`${extra.groupId}-${extra.optionId}`} className="inline-flex items-center gap-1 rounded-full bg-rosa px-2.5 py-1 text-xs font-semibold text-white">
                                  + {info?.label ?? extra.groupId}{info ? ` · ${formatARS(info.price)}` : ''}
                                  <button type="button" onClick={() => updateItems(row, (items) => { items[index].extras.splice(extraIndex, 1); return items })} aria-label="Quitar adicional"><X className="h-3 w-3" /></button>
                                </span>
                              )
                            })}
                            <select value="" onChange={(event) => { const [groupId, optionId] = event.target.value.split('|'); if (groupId) updateItems(row, (items) => { items[index].extras.push({ groupId, optionId }); return items }) }} aria-label="Agregar adicional" className="rounded-full border border-dashed border-rosa/50 bg-white px-2.5 py-1 text-xs font-semibold text-rosa-deep">
                              <option value="">+ Adicional</option>
                              {extras.filter((extra) => !extra.isOther).map((extra) => <option key={`${extra.groupId}|${extra.optionId}`} value={`${extra.groupId}|${extra.optionId}`}>{extra.label === extra.groupLabel ? extra.label : `${extra.groupLabel}: ${extra.label}`} · {formatARS(extra.price)}</option>)}
                            </select>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => updateItems(row, (items) => [...items, { productId: null, extras: [] }])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-rosa-deep hover:underline"><Plus className="h-4 w-4" />Agregar otro producto</button>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className={label}>Fecha de pago
                        <input type="date" value={row.date} onChange={(event) => update(row.key, { date: event.target.value })} className={inputClass} />
                      </label>
                      <label className={label}>Cobraste
                        <input inputMode="numeric" value={row.totalEdited ? row.total : String(catalogTotal(row.items) || '')} onChange={(event) => update(row.key, { total: event.target.value.replace(/\D/g, ''), totalEdited: true })} className={inputClass} />
                      </label>
                      {row.totalEdited && row.total !== String(catalogTotal(row.items)) && (
                        <p className="col-span-2 -mt-1 text-xs text-piedra">Según precios: {formatARS(catalogTotal(row.items))} · <button type="button" className="font-semibold text-rosa-deep hover:underline" onClick={() => update(row.key, { totalEdited: false, total: '' })}>usar ese</button></p>
                      )}
                      <label className={`col-span-2 ${label}`}>WhatsApp (opcional)
                        <input type="tel" inputMode="tel" value={row.phone} onChange={(event) => update(row.key, { phone: event.target.value })} placeholder="11 2345-6789" className={inputClass} />
                      </label>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={row.delivered} onChange={(event) => update(row.key, { delivered: event.target.checked })} className="accent-rosa" />Ya lo entregué</label>
                    {missing && <p className="mt-2 text-xs font-semibold text-rosa-deep">No reconocí un producto: elegilo de la lista.</p>}
                  </div>
                )
              })}
              {!text.trim() && <p className="text-xs text-piedra">Ejemplo:<br /><span className="whitespace-pre-line font-mono">{EXAMPLE}</span><br />Separá productos y adicionales con &quot;+&quot;. Si no ponés fecha, se toma la de hoy.</p>}
            </div>
            <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
              {error && <p role="alert" className="mb-2 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
              <Button variant="success" className="w-full" busy={busy} disabled={!ready} onClick={save}>
                {rows.length > 1 ? `Guardar ${rows.length} ventas · ${formatARS(grandTotal)}` : `Guardar venta${grandTotal ? ` · ${formatARS(grandTotal)}` : ''}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
