'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Mic, Search, Share2, X } from 'lucide-react'
import { oneForm, takesForm } from '@/lib/client-form'
import { formatDate } from '@/lib/orders'
import { isAudio, uploadSource } from '@/lib/source-files'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, inputClass, useBackdropClose, useFlash } from './ui'

type Candidate = {
  id: string
  number: number
  customer_name: string | null
  customer_phone: string | null
  status: string
  linkedin_pending: boolean | null
  created_at: string
  order_items: { product_id: string; product_name: string }[]
  client_forms: { token: string } | { token: string }[] | null
}

/** The files shared to the app wait in the service worker's "compartido" cache (see public/sw.js). */
async function sharedFiles(): Promise<File[]> {
  if (!('caches' in window)) return []
  const cache = await caches.open('compartido')
  const requests = [...(await cache.keys())].sort((a, b) => a.url.localeCompare(b.url, undefined, { numeric: true }))
  const files: File[] = []
  for (const request of requests) {
    const response = await cache.match(request)
    if (!response) continue
    const name = decodeURIComponent(response.headers.get('x-file-name') ?? 'archivo')
    files.push(new File([await response.blob()], name, { type: response.headers.get('content-type') ?? '' }))
  }
  return files
}

const clearShared = () => ('caches' in window ? caches.delete('compartido').then(() => undefined, () => undefined) : Promise.resolve())

/**
 * Files shared from WhatsApp to the panel app (a CV, photos, voice notes, an exported chat): Vale picks the order and
 * they join the customer's material (forms/<token>/whatsapp/), so they show in "Datos del cliente" and in Textos con
 * Claude. Voice notes are turned into text on the way, like in Textos con Claude.
 */
export function SharedFilesDialog({ text, onClose, onDone }: { text: string; onClose: () => void; onDone: (number: number) => void }) {
  const backdrop = useBackdropClose(onClose)
  const [files, setFiles] = useState<File[] | null>(null)
  const [orders, setOrders] = useState<Candidate[] | null>(null)
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState('')
  const [withText, setWithText] = useState(Boolean(text.trim()))
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  useEffect(() => {
    sharedFiles().then(setFiles, () => setFiles([]))
    supabase.from('orders')
      .select('id, number, customer_name, customer_phone, status, linkedin_pending, created_at, order_items(product_id, product_name), client_forms(token)')
      .in('status', ['pending_payment', 'payment_review', 'paid', 'in_progress', 'delivered'])
      .order('created_at', { ascending: false }).limit(300)
      .then(({ data }) => setOrders(((data as Candidate[] | null) ?? []).filter((order) =>
        takesForm(order.order_items.map((item) => item.product_id)) && (order.status !== 'delivered' || order.linkedin_pending) && oneForm(order.client_forms))))
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/^#/, '')
    const digits = query.replace(/\D/g, '')
    return (orders ?? []).filter((order) => !query
      || String(order.number) === query
      || (order.customer_name ?? '').toLowerCase().includes(query)
      || (digits.length >= 4 && (order.customer_phone ?? '').replace(/\D/g, '').includes(digits))).slice(0, 30)
  }, [orders, search])

  async function attach() {
    const order = orders?.find((row) => row.id === chosen)
    const form = order ? oneForm(order.client_forms) : null
    if (!order || !form || !files) return
    setBusy(true)
    const list = [...files, ...(withText && text.trim() ? [new File([text.trim()], 'mensaje-de-whatsapp.txt', { type: 'text/plain' })] : [])]
    const added: string[] = []
    const failed: string[] = []
    for (const file of list) {
      const { paths, error } = await uploadSource(`forms/${form.token}/whatsapp`, file)
      added.push(...paths)
      if (error) failed.push(error)
    }
    if (added.length) {
      // Into the customer's material, and into any texts already asked to Claude for this order (CV and LinkedIn).
      const { data: current } = await supabase.from('client_forms').select('files').eq('order_id', order.id).maybeSingle()
      const { error } = await supabase.from('client_forms').update({ files: [...((current?.files as string[] | null) ?? []), ...added] }).eq('order_id', order.id)
      if (error) failed.push(errorMessage(error))
      for (const table of ['cv_drafts', 'linkedin_drafts'] as const) {
        const { data: drafts } = await supabase.from(table).select('order_item_id, files').eq('order_id', order.id)
        for (const draft of (drafts as { order_item_id: string; files: string[] | null }[] | null) ?? []) {
          await supabase.from(table).update({ files: [...(draft.files ?? []), ...added] }).eq('order_item_id', draft.order_item_id)
        }
      }
    }
    setBusy(false)
    if (failed.length) { flash.show('error', failed.join(' · ')); if (!added.length) return }
    await clearShared()
    onDone(order.number)
  }

  async function discard() {
    await clearShared()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="shared-title" {...backdrop}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="shared-title" className="flex items-center gap-2 font-display text-lg font-bold"><Share2 className="h-5 w-5" />¿A qué pedido va?</p>
            <p className="text-sm text-white/85">Se suma a los datos del cliente y a Textos con Claude.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {files === null ? <p className="text-sm text-piedra">Cargando lo que compartiste…</p> : files.length === 0 ? (
            <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep">No llegó ningún archivo. Probá compartirlo de nuevo desde WhatsApp.</p>
          ) : (
            <ul className="space-y-1.5">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-1.5 rounded-xl bg-papel/70 px-3 py-2 text-sm">
                  {isAudio(file.name) || file.type.startsWith('audio/') ? <Mic className="h-4 w-4 shrink-0 text-rosa" /> : <FileText className="h-4 w-4 shrink-0 text-rosa" />}
                  <span className="truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          )}
          {files?.some((file) => isAudio(file.name) || file.type.startsWith('audio/')) && <p className="-mt-2 text-xs text-piedra">Los audios se pasan a texto solos al sumarlos.</p>}
          {text.trim() && (
            <label className="flex items-start gap-2 rounded-2xl border border-line bg-white px-3 py-2.5 text-sm text-ink">
              <input type="checkbox" checked={withText} onChange={(event) => setWithText(event.target.checked)} className="mt-1 accent-rosa" />
              <span>Sumar también el texto compartido<span className="mt-0.5 line-clamp-2 block text-xs text-piedra">{text.trim()}</span></span>
            </label>
          )}
          <div>
            <label className="block text-sm font-semibold text-ink">Buscá el pedido
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-piedra" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, #número o teléfono" className={`${inputClass} mt-0 pl-9`} />
              </span>
            </label>
            {orders === null ? <p className="mt-3 text-sm text-piedra">Cargando pedidos…</p> : shown.length === 0 ? (
              <p className="mt-3 text-sm text-piedra">{search ? 'Ningún pedido de CV o LinkedIn en curso coincide.' : 'No hay pedidos de CV o LinkedIn en curso.'}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-white">
                {shown.map((order) => (
                  <li key={order.id}>
                    <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm ${chosen === order.id ? 'bg-petalo-wash/60' : ''}`}>
                      <input type="radio" name="shared-order" checked={chosen === order.id} onChange={() => setChosen(order.id)} className="accent-rosa" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">#{order.number} · {order.customer_name || 'Cliente'}</span>
                        <span className="block truncate text-xs text-piedra">{order.order_items.map((item) => item.product_name).join(' + ')} · {formatDate(order.created_at)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <Button variant="secondary" disabled={busy} onClick={discard}>Descartar</Button>
            <Button busy={busy} disabled={!chosen || !files?.length} onClick={attach}>Sumar al pedido</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
