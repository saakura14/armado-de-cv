'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

type Row = { id: string; name: string; text: string; service: string | null; rating: number; active: boolean; sort: number }

function TestimonialEditor({ item, onChanged }: { item: Row; onChanged: () => void }) {
  const [form, setForm] = useState({ name: item.name, text: item.text, service: item.service ?? '', rating: item.rating, active: item.active, sort: String(item.sort) })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('testimonials').update({ name: form.name.trim(), text: form.text.trim(), service: form.service.trim() || null, rating: form.rating, active: form.active, sort: Number(form.sort) || 0 }).eq('id', item.id)
    setBusy(false)
    if (error) flash.show('error', errorMessage(error)); else { flash.show('ok', 'Guardado. Se ve en la web en 1 minuto.'); onChanged() }
  }

  async function remove() {
    if (!window.confirm('¿Eliminar este testimonio?')) return
    const { error } = await supabase.from('testimonials').delete().eq('id', item.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }

  return (
    <li className={`${cardClass} space-y-3 ${form.active ? '' : 'opacity-60'}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre (ej: Lucía G.)"><input value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} className={inputClass} /></Field>
        <Field label="Servicio (opcional)"><input value={form.service} onChange={(event) => setForm((c) => ({ ...c, service: event.target.value }))} placeholder="Pack Premium" className={inputClass} /></Field>
      </div>
      <Field label="Testimonio"><textarea rows={3} value={form.text} onChange={(event) => setForm((c) => ({ ...c, text: event.target.value }))} className={inputClass} /></Field>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Estrellas">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" role="radio" aria-checked={form.rating === value} onClick={() => setForm((c) => ({ ...c, rating: value }))} className="text-rosa" aria-label={`${value} estrellas`}>
              <Star className={`h-5 w-5 ${value <= form.rating ? 'fill-current' : ''}`} />
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm((c) => ({ ...c, active: event.target.checked }))} className="accent-rosa" />Visible</label>
        <label className="flex items-center gap-2">Orden <input inputMode="numeric" value={form.sort} onChange={(event) => setForm((c) => ({ ...c, sort: event.target.value }))} className="w-16 rounded-lg border border-line px-2 py-1" /></label>
      </div>
      <div className="flex gap-2">
        <Button busy={busy} onClick={save}>Guardar</Button>
        <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" />Eliminar</Button>
      </div>
      {flash.node}
    </li>
  )
}

export function TestimonialsAdmin() {
  const [items, setItems] = useState<Row[]>([])
  const flash = useFlash()

  const load = useCallback(async () => {
    const { data } = await supabase.from('testimonials').select('*').order('sort').order('created_at')
    setItems((data as Row[] | null) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    const { error } = await supabase.from('testimonials').insert({ name: 'Nombre', text: 'Escribí acá el testimonio.', active: false, sort: items.length + 1 })
    if (error) flash.show('error', errorMessage(error)); else load()
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-piedra">Se muestran hasta 9 en la página de inicio, en el orden que elijas. Usá solo el nombre y la inicial del apellido.</p>
      <ul className="grid gap-4 lg:grid-cols-2">{items.map((item) => <TestimonialEditor key={item.id} item={item} onChanged={load} />)}</ul>
      <Button variant="secondary" onClick={create}><Plus className="h-4 w-4" />Sumar testimonio</Button>
      {flash.node}
    </div>
  )
}
