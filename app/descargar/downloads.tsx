'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Loader2 } from 'lucide-react'
import { errorMessage, supabase } from '@/lib/supabase'

type Item = { ebook_id: string; title: string; order_number: number }

/** Reads the order's private token from the link and lists the e-books it unlocked. */
export function Downloads() {
  const [token, setToken] = useState('')
  const [items, setItems] = useState<Item[] | null | undefined>(undefined)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('t') ?? ''
    if (!/^[0-9a-f-]{36}$/i.test(value)) { setItems(null); return }
    setToken(value)
    supabase.rpc('get_order_downloads', { p_token: value }).then(({ data, error: rpcError }) => setItems(rpcError ? null : (data as Item[])))
  }, [])

  async function download(item: Item) {
    setBusy(item.ebook_id); setError('')
    // Same stamped file as in "Mi cuenta": the buyer's email and order number on every page.
    const { data, error: downloadError } = await supabase.functions.invoke('ebook-download', { body: { ebook_id: item.ebook_id, token } })
    setBusy('')
    if (downloadError || !(data instanceof Blob)) {
      const context = (downloadError as { context?: Response } | null)?.context
      const detail = context ? await context.json().then((body: { error?: string }) => body.error).catch(() => null) : null
      setError(detail ?? errorMessage(downloadError ?? 'No se pudo descargar la guía.'))
      return
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(data)
    link.download = `${item.title}.pdf`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 10000)
  }

  if (items === undefined) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-rosa" />
  if (!items || items.length === 0) {
    return (
      <div className="text-center">
        <p className="font-script text-5xl text-rosa">{items ? 'Todavía no' : 'Link no válido'}</p>
        <p className="mt-3 text-piedra">{items ? 'Tus guías se habilitan apenas confirmo el pago. Si ya pagaste, escribime por WhatsApp y lo reviso.' : 'No encontré ese pedido. Revisá el link del mail o escribime y te lo reenvío.'}</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-rosa-deep underline">Ir a Armado de CV</Link>
      </div>
    )
  }
  return (
    <div>
      <p className="font-script text-5xl leading-none text-rosa">Tus guías</p>
      <p className="mt-2 text-sm text-piedra">Pedido #{items[0].order_number}. Este link es personal: guardalo para descargarlas cuando quieras.</p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.ebook_id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_18px_36px_-28px_rgba(67,32,44,0.55)]">
            <span className="font-semibold text-ink">{item.title}</span>
            <button type="button" onClick={() => download(item)} disabled={Boolean(busy)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ciruela px-4 py-2 font-display text-sm font-bold text-white hover:bg-rosa disabled:opacity-50">
              {busy === item.ebook_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Descargar
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-4 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
    </div>
  )
}
