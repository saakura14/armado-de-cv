'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Trash2, X, Zap } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS } from '@/lib/catalog'
import { errorMessage, supabase } from '@/lib/supabase'
import { parseSales, type ParsedSale, type SaleProduct } from '@/lib/whatsapp-sale'
import { Button, inputClass } from './ui'

type Row = ParsedSale & { key: number; total: string; phone: string; delivered: boolean }

const EXAMPLE = 'María Gómez / Pack Premium 28/09\nJuan Pérez / Pack Medium + express 27/09'
const daysAgo = (date: string) => (Date.now() - new Date(`${date}T12:00:00-03:00`).getTime()) / 86400000

/** Paste one or many WhatsApp notes ("Nombre / Pack + fecha"), check what was understood and save them as paid sales. */
export function WhatsappSaleDialog({ initialText = '', onClose, onSaved }: { initialText?: string; onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<SaleProduct[]>([])
  const [text, setText] = useState(initialText)
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<number[]>([])

  useEffect(() => {
    supabase.from('products').select('id, name, category, price').eq('active', true).order('sort')
      .then(({ data }) => setProducts((data as SaleProduct[] | null) ?? []))
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const priceOf = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product.price])), [products])

  // Re-read the notes whenever the text (or the catalog) changes.
  useEffect(() => {
    if (!products.length) return
    setRows(parseSales(text, products).map((sale, index) => ({
      ...sale,
      key: index,
      total: sale.productId ? String(priceOf[sale.productId] ?? '') : '',
      phone: '',
      // Old sales are most likely already delivered.
      delivered: daysAgo(sale.date) > 7,
    })))
  }, [text, products, priceOf])

  function update(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const ready = rows.length > 0 && rows.every((row) => row.name.trim() && row.productId && Number(row.total) > 0 && row.date)

  async function save() {
    setBusy(true); setError('')
    const numbers: number[] = []
    for (const row of rows) {
      const { data, error: rpcError } = await supabase.rpc('admin_record_sale', {
        p_name: row.name, p_phone: row.phone, p_product: row.productId, p_total: Number(row.total), p_paid_on: row.date,
        p_express: row.express, p_delivered: row.delivered, p_note: `Venta por WhatsApp: ${row.raw}`,
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
                const missing = !row.productId
                return (
                  <div key={row.key} className={`rounded-2xl border bg-white p-4 ${missing ? 'border-rosa' : 'border-line'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-mono text-xs text-piedra" title={row.raw}>{row.raw}</p>
                      {rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="shrink-0 rounded-full p-1 text-piedra hover:bg-petalo-wash hover:text-rosa-deep" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra sm:col-span-1">Cliente
                        <input value={row.name} onChange={(event) => update(row.key, { name: event.target.value })} className={inputClass} />
                      </label>
                      <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra sm:col-span-1">Qué compró
                        <select value={row.productId ?? ''} onChange={(event) => update(row.key, { productId: event.target.value || null, total: String(priceOf[event.target.value] ?? row.total) })} className={inputClass}>
                          <option value="">Elegí…</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatARS(product.price)}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wider text-piedra">Fecha de pago
                        <input type="date" value={row.date} onChange={(event) => update(row.key, { date: event.target.value })} className={inputClass} />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wider text-piedra">Cobraste
                        <input inputMode="numeric" value={row.total} onChange={(event) => update(row.key, { total: event.target.value.replace(/\D/g, '') })} className={inputClass} />
                      </label>
                      <label className="col-span-2 text-xs font-semibold uppercase tracking-wider text-piedra">WhatsApp (opcional)
                        <input type="tel" inputMode="tel" value={row.phone} onChange={(event) => update(row.key, { phone: event.target.value })} placeholder="11 2345-6789" className={inputClass} />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={row.express} onChange={(event) => update(row.key, { express: event.target.checked })} className="accent-rosa" /><Zap className="h-4 w-4 text-rosa" />Express</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={row.delivered} onChange={(event) => update(row.key, { delivered: event.target.checked })} className="accent-rosa" />Ya lo entregué</label>
                    </div>
                    {missing && <p className="mt-2 text-xs font-semibold text-rosa-deep">No reconocí qué compró: elegilo de la lista.</p>}
                  </div>
                )
              })}
              {!text.trim() && <p className="text-xs text-piedra">Ejemplo:<br /><span className="whitespace-pre-line font-mono">{EXAMPLE}</span><br />Si no ponés fecha, se toma la de hoy. Si dice &quot;express&quot;, se marca solo.</p>}
            </div>
            <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
              {error && <p role="alert" className="mb-2 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
              <Button variant="success" className="w-full" busy={busy} disabled={!ready} onClick={save}>
                {rows.length > 1 ? `Guardar ${rows.length} ventas · ${formatARS(rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0))}` : 'Guardar venta'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
