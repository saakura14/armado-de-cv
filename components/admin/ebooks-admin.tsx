'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Download, Plus, Upload } from 'lucide-react'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, slugify, useFlash } from './ui'

type Ebook = { id: string; title: string; description: string | null; file_path: string | null; active: boolean }
type Product = { id: string; name: string; subtitle: string | null; choice_label: string | null; delivery: string }
type Link = { product_id: string; ebook_id: string }

function EbookCard({ ebook, products, included, choices, onChanged }: { ebook: Ebook; products: Product[]; included: Link[]; choices: Link[]; onChanged: () => void }) {
  const [title, setTitle] = useState(ebook.title)
  const [description, setDescription] = useState(ebook.description ?? '')
  const [active, setActive] = useState(ebook.active)
  const [busy, setBusy] = useState('')
  const flash = useFlash()

  async function save() {
    setBusy('save')
    const { error } = await supabase.from('ebooks').update({ title: title.trim(), description: description.trim() || null, active }).eq('id', ebook.id)
    setBusy('')
    if (error) flash.show('error', errorMessage(error)); else { flash.show('ok', 'Guardado.'); onChanged() }
  }

  async function upload(file: File) {
    setBusy('upload')
    const safeName = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-')
    const path = `${ebook.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('ebooks').upload(path, file, { contentType: file.type || undefined })
    const { error } = uploadError ? { error: uploadError } : await supabase.from('ebooks').update({ file_path: path }).eq('id', ebook.id)
    if (!error && ebook.file_path) await supabase.storage.from('ebooks').remove([ebook.file_path])
    setBusy('')
    if (error) flash.show('error', errorMessage(error)); else { flash.show('ok', 'Archivo subido. Los compradores ya lo pueden descargar.'); onChanged() }
  }

  async function preview() {
    if (!ebook.file_path) return
    const { data, error } = await supabase.storage.from('ebooks').createSignedUrl(ebook.file_path, 120, { download: true })
    if (error || !data) flash.show('error', errorMessage(error)); else window.location.href = data.signedUrl
  }

  async function toggle(table: 'product_ebooks' | 'product_ebook_choices', productId: string, on: boolean) {
    const { error } = on
      ? await supabase.from(table).insert({ product_id: productId, ebook_id: ebook.id })
      : await supabase.from(table).delete().eq('product_id', productId).eq('ebook_id', ebook.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }

  const packs = products.filter((product) => !product.choice_label)
  const pickers = products.filter((product) => product.choice_label)
  return (
    <li className={cardClass}>
      <div className="grid gap-3">
        <Field label="Título"><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></Field>
        <Field label="Descripción corta (la ve el cliente)"><input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></Field>
      </div>

      <div className="mt-4 rounded-2xl bg-papel p-4">
        {ebook.file_path ? (
          <p className="flex items-center gap-2 text-sm text-whatsapp"><CheckCircle2 className="h-4 w-4" />Archivo cargado: <span className="truncate text-ink">{ebook.file_path.split('/').pop()?.replace(/^\d+-/, '')}</span></p>
        ) : <p className="text-sm font-semibold text-rosa-deep">Falta subir el archivo: los compradores no lo pueden descargar todavía.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-ciruela px-4 py-2 font-display text-sm font-bold text-white hover:bg-rosa">
            <Upload className="h-4 w-4" />{busy === 'upload' ? 'Subiendo...' : ebook.file_path ? 'Reemplazar archivo' : 'Subir archivo (Word o PDF)'}
            <input type="file" accept=".doc,.docx,.pdf,.epub,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="sr-only" disabled={busy === 'upload'} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = '' }} />
          </label>
          {ebook.file_path && <Button type="button" variant="secondary" onClick={preview}><Download className="h-4 w-4" />Descargar</Button>}
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-piedra">¿Dónde se vende?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pickers.map((product) => {
          const on = choices.some((link) => link.product_id === product.id && link.ebook_id === ebook.id)
          return <label key={`c-${product.id}`} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? 'border-rosa bg-petalo-wash' : 'border-line'}`}><input type="checkbox" checked={on} onChange={() => toggle('product_ebook_choices', product.id, !on)} className="accent-rosa" />Opción de &quot;{product.name}&quot;</label>
        })}
        {packs.map((product) => {
          const on = included.some((link) => link.product_id === product.id && link.ebook_id === ebook.id)
          return <label key={`i-${product.id}`} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? 'border-rosa bg-petalo-wash' : 'border-line'}`}><input type="checkbox" checked={on} onChange={() => toggle('product_ebooks', product.id, !on)} className="accent-rosa" />Incluido en {product.name}{product.subtitle ? ` (${product.subtitle})` : ''}</label>
        })}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="accent-rosa" />Disponible para la venta</label>
      <Button className="mt-4" busy={busy === 'save'} onClick={save}>Guardar</Button>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

export function EbooksAdmin() {
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [included, setIncluded] = useState<Link[]>([])
  const [choices, setChoices] = useState<Link[]>([])
  const [newTitle, setNewTitle] = useState('')
  const flash = useFlash()

  const load = useCallback(async () => {
    const [e, p, i, c] = await Promise.all([
      supabase.from('ebooks').select('*').order('created_at'),
      supabase.from('products').select('id, name, subtitle, choice_label, delivery').in('delivery', ['digital', 'session']).order('sort'),
      supabase.from('product_ebooks').select('product_id, ebook_id'),
      supabase.from('product_ebook_choices').select('product_id, ebook_id'),
    ])
    setEbooks((e.data as Ebook[] | null) ?? [])
    setProducts((p.data as Product[] | null) ?? [])
    setIncluded((i.data as Link[] | null) ?? [])
    setChoices((c.data as Link[] | null) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const { error } = await supabase.from('ebooks').insert({ id: slugify(title) || `ebook-${Date.now()}`, title })
    if (error) flash.show('error', errorMessage(error)); else { setNewTitle(''); load() }
  }

  return (
    <div>
      <p className="max-w-2xl text-sm text-piedra">Subí cada e-book una sola vez. Cuando apruebes el pago de un pedido, el cliente lo descarga desde &quot;Mi cuenta&quot; con un link privado que vence a los 2 minutos.</p>
      <ul className="mt-5 grid gap-4 xl:grid-cols-2">{ebooks.map((ebook) => <EbookCard key={ebook.id} ebook={ebook} products={products} included={included} choices={choices} onChanged={load} />)}</ul>
      <form onSubmit={create} className={`${cardClass} mt-4 flex flex-col gap-3 sm:flex-row sm:items-end`}>
        <Field label="Nuevo e-book" className="flex-1"><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Título del e-book" className={inputClass} /></Field>
        <Button><Plus className="h-4 w-4" />Crear</Button>
      </form>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </div>
  )
}
