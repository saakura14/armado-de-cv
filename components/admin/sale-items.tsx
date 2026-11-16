'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { formatARS } from '@/lib/catalog'
import { supabase } from '@/lib/supabase'
import type { SaleExtra, SaleItem, SaleProduct } from '@/lib/whatsapp-sale'
import { inputClass } from './ui'

type ProductRow = { id: string; name: string; category: string; price: number; whatsapp_price: number | null; product_extra_groups: { group_id: string }[] }
type GroupRow = { id: string; label: string; unit_price: number; extra_options: { id: string; label: string; is_other: boolean; sort: number }[] }

/**
 * Active products and every add-on option, as the WhatsApp sale and the order link editors need them.
 * `channel`: WhatsApp sales use the WhatsApp price when the product has one; order links (paid on the web) the web price.
 */
export function useSaleCatalog(channel: 'whatsapp' | 'web' = 'whatsapp') {
  const [products, setProducts] = useState<SaleProduct[]>([])
  const [extras, setExtras] = useState<SaleExtra[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, name, category, price, whatsapp_price, product_extra_groups(group_id)').eq('active', true).order('sort'),
      supabase.from('extra_groups').select('id, label, unit_price, extra_options(id, label, is_other, sort)').order('id'),
    ]).then(([productRows, groupRows]) => {
      setProducts(((productRows.data as ProductRow[] | null) ?? []).map((row) => ({ id: row.id, name: row.name, category: row.category, price: row.price, whatsappPrice: row.whatsapp_price, groups: row.product_extra_groups.map((link) => link.group_id) })))
      setExtras(((groupRows.data as GroupRow[] | null) ?? []).flatMap((group) => [...group.extra_options].sort((a, b) => a.sort - b.sort).map((option) => ({
        groupId: group.id, optionId: option.id, groupLabel: group.label,
        // Single-option groups (Express, LinkedIn services) read better by the group name.
        label: group.extra_options.length === 1 ? group.label : option.label,
        price: group.unit_price, isOther: option.is_other,
      }))))
    })
  }, [])

  const priceOf = useMemo(() => Object.fromEntries(products.map((product) => [product.id, channel === 'whatsapp' ? product.whatsappPrice ?? product.price : product.price])), [products, channel])
  const extraOf = useCallback((groupId: string, optionId: string) => extras.find((extra) => extra.groupId === groupId && extra.optionId === optionId), [extras])
  const totalOf = useCallback((items: SaleItem[]) => items.reduce((sum, item) => sum + (item.productId ? item.price ?? priceOf[item.productId] ?? 0 : 0)
    + item.extras.reduce((acc, extra) => acc + (extraOf(extra.groupId, extra.optionId)?.price ?? 0), 0), 0), [priceOf, extraOf])

  return { products, extras, extraOf, totalOf, priceOf }
}

/**
 * Products with their add-ons: pick a product, add or remove add-ons, add another product.
 * `onlyOffered` limits add-ons to the ones each product offers on the web (needed for order links), at web prices.
 * Otherwise (WhatsApp sales) each product shows its WhatsApp price and the amount charged for it can be changed.
 */
export function SaleItemsEditor({ items, onChange, products, extras, onlyOffered = false }: {
  items: SaleItem[]; onChange: (items: SaleItem[]) => void; products: SaleProduct[]; extras: SaleExtra[]; onlyOffered?: boolean
}) {
  const change = (update: (copy: SaleItem[]) => SaleItem[]) => onChange(update(items.map((item) => ({ ...item, extras: [...item.extras] }))))
  const extraOf = (groupId: string, optionId: string) => extras.find((extra) => extra.groupId === groupId && extra.optionId === optionId)

  return (
    <>
      <ul className="mt-1 space-y-2">
        {items.map((item, index) => {
          const product = products.find((candidate) => candidate.id === item.productId)
          const available = extras.filter((extra) => !extra.isOther && (!onlyOffered || product?.groups.includes(extra.groupId))
            && !item.extras.some((picked) => picked.groupId === extra.groupId && picked.optionId === extra.optionId))
          return (
            <li key={index} className="rounded-xl bg-papel p-3">
              <div className="flex items-center gap-2">
                <select value={item.productId ?? ''} aria-label="Producto" className={`${inputClass} min-w-0`}
                  onChange={(event) => change((copy) => {
                    copy[index].productId = event.target.value || null
                    // A different product starts again from its own price.
                    copy[index].price = null
                    // Add-ons the new product doesn't offer are dropped when only offered ones are allowed.
                    if (onlyOffered) {
                      const next = products.find((candidate) => candidate.id === event.target.value)
                      copy[index].extras = copy[index].extras.filter((extra) => next?.groups.includes(extra.groupId))
                    }
                    return copy
                  })}>
                  <option value="">Elegí…</option>
                  {products.map((option) => <option key={option.id} value={option.id}>{option.name} · {formatARS(onlyOffered ? option.price : option.whatsappPrice ?? option.price)}</option>)}
                </select>
                {/* What she charged for it (by WhatsApp it can differ from the web, e.g. a guide sold with a chat). */}
                {!onlyOffered && product && (
                  <label className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-piedra focus-within:border-rosa" title="Lo que le cobraste por este producto">
                    $<input inputMode="numeric" aria-label={`Cobrado por ${product.name}`} value={String(item.price ?? product.whatsappPrice ?? product.price)}
                      onChange={(event) => change((copy) => { const value = Number(event.target.value.replace(/\D/g, '')); copy[index].price = value === (product.whatsappPrice ?? product.price) ? null : value; return copy })}
                      className="w-20 bg-transparent font-semibold text-ink outline-none" />
                  </label>
                )}
                {items.length > 1 && <button type="button" onClick={() => change((copy) => copy.filter((_, position) => position !== index))} className="shrink-0 rounded-full p-1.5 text-piedra hover:bg-white hover:text-rosa-deep" aria-label="Quitar producto"><X className="h-4 w-4" /></button>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {item.extras.map((extra, extraIndex) => {
                  const info = extraOf(extra.groupId, extra.optionId)
                  return (
                    <span key={`${extra.groupId}-${extra.optionId}`} className="inline-flex items-center gap-1 rounded-full bg-rosa px-2.5 py-1 text-xs font-semibold text-white">
                      + {info?.label ?? extra.groupId}{info ? ` · ${formatARS(info.price)}` : ''}
                      <button type="button" onClick={() => change((copy) => { copy[index].extras.splice(extraIndex, 1); return copy })} aria-label="Quitar adicional"><X className="h-3 w-3" /></button>
                    </span>
                  )
                })}
                {available.length > 0 && (
                  <select value="" aria-label="Agregar adicional" className="min-w-0 max-w-full rounded-full border border-dashed border-rosa/50 bg-white px-2.5 py-1 text-xs font-semibold text-rosa-deep"
                    onChange={(event) => { const [groupId, optionId] = event.target.value.split('|'); if (groupId) change((copy) => { copy[index].extras.push({ groupId, optionId }); return copy }) }}>
                    <option value="">+ Adicional</option>
                    {available.map((extra) => <option key={`${extra.groupId}|${extra.optionId}`} value={`${extra.groupId}|${extra.optionId}`}>{extra.label === extra.groupLabel ? extra.label : `${extra.groupLabel}: ${extra.label}`} · {formatARS(extra.price)}</option>)}
                  </select>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={() => change((copy) => [...copy, { productId: null, extras: [] }])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-rosa-deep hover:underline"><Plus className="h-4 w-4" />Agregar otro producto</button>
    </>
  )
}
