'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { CATEGORY_LABEL, formatARS, type Category, type Delivery } from '@/lib/catalog'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, linesToArray, slugify, useFlash } from './ui'

type ProductRow = {
  id: string; category: Category; delivery: Delivery; name: string; subtitle: string | null; price: number; price_note: string | null
  highlight: string | null; features: string[]; notes: string[]; popular: boolean; active: boolean; sort: number; session_minutes: number | null
  choice_label: string | null; product_extra_groups: { group_id: string }[]
}
type OptionRow = { group_id: string; id: string; label: string; is_other: boolean; session_minutes: number | null; sort: number }
type GroupRow = { id: string; label: string; unit_price: number; hint: string | null; extra_options: OptionRow[] }

const DELIVERY_LABEL: Record<Delivery, string> = {
  service: 'Servicio (se coordina por WhatsApp)',
  digital: 'Digital (e-books, se habilitan al aprobar el pago)',
  session: 'Incluye sesión 1 a 1 por Meet',
  course: 'Curso pre-grabado',
}
const EDITABLE_CATEGORIES: Category[] = ['cv', 'asesorias', 'vocacional', 'sesion']

function ProductEditor({ product, groups, onChanged }: { product: ProductRow; groups: GroupRow[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: product.name, subtitle: product.subtitle ?? '', price: String(product.price), price_note: product.price_note ?? '', highlight: product.highlight ?? '',
    features: product.features.join('\n'), notes: product.notes.join('\n'), popular: product.popular, active: product.active, sort: String(product.sort),
    category: product.category, delivery: product.delivery, session_minutes: product.session_minutes ? String(product.session_minutes) : '',
  })
  const [linked, setLinked] = useState(product.product_extra_groups.map((link) => link.group_id))
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const price = Number(form.price.replace(/\D/g, ''))
    if (!Number.isFinite(price)) { flash.show('error', 'Revisá el precio.'); return }
    setBusy(true)
    const { error } = await supabase.from('products').update({
      name: form.name.trim(), subtitle: form.subtitle.trim() || null, price, price_note: form.price_note.trim() || null, highlight: form.highlight.trim() || null,
      features: linesToArray(form.features), notes: linesToArray(form.notes), popular: form.popular, active: form.active, sort: Number(form.sort) || 0,
      category: form.category, delivery: form.delivery, session_minutes: form.delivery === 'session' ? Number(form.session_minutes) || 60 : null,
    }).eq('id', product.id)
    if (!error) {
      const current = product.product_extra_groups.map((link) => link.group_id)
      const add = linked.filter((id) => !current.includes(id))
      const remove = current.filter((id) => !linked.includes(id))
      if (add.length) await supabase.from('product_extra_groups').insert(add.map((group_id) => ({ product_id: product.id, group_id, sort: groups.findIndex((g) => g.id === group_id) })))
      if (remove.length) await supabase.from('product_extra_groups').delete().eq('product_id', product.id).in('group_id', remove)
    }
    setBusy(false)
    if (error) flash.show('error', errorMessage(error))
    else { flash.show('ok', 'Guardado. La web se actualiza en 1 minuto.'); onChanged() }
  }

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))

  return (
    <li className={`${cardClass} ${form.active ? '' : 'opacity-70'}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="min-w-0">
          <span className="block truncate font-bold text-ink">{product.name}{product.subtitle ? <span className="font-normal text-piedra"> · {product.subtitle}</span> : null}</span>
          <span className="text-sm text-piedra">{CATEGORY_LABEL[product.category]} · {product.active ? 'Visible' : 'Oculto'}{product.popular ? ' · Más elegido' : ''}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2"><span className="font-display text-lg font-extrabold text-ciruela">{formatARS(product.price)}</span><ChevronDown className={`h-5 w-5 text-piedra transition-transform ${open ? 'rotate-180' : ''}`} /></span>
      </button>
      {open && (
        <form onSubmit={save} className="mt-5 space-y-4 border-t border-line pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input required value={form.name} onChange={set('name')} className={inputClass} /></Field>
            <Field label="Subtítulo"><input value={form.subtitle} onChange={set('subtitle')} className={inputClass} /></Field>
            <Field label="Precio (ARS)"><input required inputMode="numeric" value={form.price} onChange={set('price')} className={inputClass} /></Field>
            <Field label='Aclaración del precio (ej: "c/u")'><input value={form.price_note} onChange={set('price_note')} className={inputClass} /></Field>
            <Field label="Etiqueta destacada (opcional)"><input value={form.highlight} onChange={set('highlight')} placeholder="Google Meet con turno previo" className={inputClass} /></Field>
            <Field label="Orden en la web"><input inputMode="numeric" value={form.sort} onChange={set('sort')} className={inputClass} /></Field>
            <Field label="Sección"><select value={form.category} onChange={set('category')} className={inputClass}>{EDITABLE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></Field>
            <Field label="Cómo se entrega"><select value={form.delivery} onChange={set('delivery')} className={inputClass}>{(['service', 'digital', 'session'] as Delivery[]).map((d) => <option key={d} value={d}>{DELIVERY_LABEL[d]}</option>)}</select></Field>
            {form.delivery === 'session' && <Field label="Duración de la sesión (min)"><input inputMode="numeric" value={form.session_minutes} onChange={set('session_minutes')} className={inputClass} /></Field>}
          </div>
          <Field label="Qué incluye (uno por línea)"><textarea rows={4} value={form.features} onChange={set('features')} className={inputClass} /></Field>
          <Field label="Condiciones antes de comprar (una por línea)"><textarea rows={4} value={form.notes} onChange={set('notes')} className={inputClass} /></Field>
          {groups.length > 0 && (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider text-piedra">Extras que se pueden sumar</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {groups.map((group) => (
                  <label key={group.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${linked.includes(group.id) ? 'border-rosa bg-petalo-wash' : 'border-line'}`}>
                    <input type="checkbox" checked={linked.includes(group.id)} onChange={() => setLinked((list) => list.includes(group.id) ? list.filter((id) => id !== group.id) : [...list, group.id])} className="accent-rosa" />{group.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.popular} onChange={(event) => setForm((c) => ({ ...c, popular: event.target.checked }))} className="accent-rosa" />Marcar como &quot;Más elegido&quot;</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm((c) => ({ ...c, active: event.target.checked }))} className="accent-rosa" />{form.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}Visible en la web</label>
          </div>
          <Button busy={busy}>Guardar cambios</Button>
          {flash.node}
        </form>
      )}
    </li>
  )
}

function GroupEditor({ group, onChanged }: { group: GroupRow; onChanged: () => void }) {
  const [label, setLabel] = useState(group.label)
  const [price, setPrice] = useState(String(group.unit_price))
  const [hint, setHint] = useState(group.hint ?? '')
  const [options, setOptions] = useState(group.extra_options.slice().sort((a, b) => a.sort - b.sort))
  const [newOption, setNewOption] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('extra_groups').update({ label: label.trim(), unit_price: Number(price.replace(/\D/g, '')) || 0, hint: hint.trim() || null }).eq('id', group.id)
    const results = await Promise.all(options.map((option, index) => supabase.from('extra_options').update({ label: option.label.trim(), is_other: option.is_other, sort: index + 1 }).eq('group_id', group.id).eq('id', option.id)))
    setBusy(false)
    const failed = error ?? results.find((result) => result.error)?.error
    if (failed) flash.show('error', errorMessage(failed))
    else { flash.show('ok', 'Guardado.'); onChanged() }
  }

  async function addOption() {
    const text = newOption.trim()
    if (!text) return
    const { error } = await supabase.from('extra_options').insert({ group_id: group.id, id: slugify(text) || `opcion-${Date.now()}`, label: text, sort: options.length + 1 })
    if (error) { flash.show('error', errorMessage(error)); return }
    setNewOption(''); onChanged()
  }

  async function removeOption(id: string) {
    if (!window.confirm('¿Quitar esta opción?')) return
    const { error } = await supabase.from('extra_options').delete().eq('group_id', group.id).eq('id', id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }

  return (
    <li className={cardClass}>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Nombre del extra"><input value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} /></Field>
        <Field label="Precio por opción"><input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Ayuda (opcional)" className="mt-3"><input value={hint} onChange={(event) => setHint(event.target.value)} className={inputClass} /></Field>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-piedra">Opciones</p>
      <ul className="mt-2 space-y-2">
        {options.map((option, index) => (
          <li key={option.id} className="flex items-center gap-2">
            <input value={option.label} onChange={(event) => setOptions((list) => list.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} className={`${inputClass} mt-0`} aria-label="Opción" />
            <label className="flex shrink-0 items-center gap-1 text-xs text-piedra" title="Le pide al cliente que escriba cuál"><input type="checkbox" checked={option.is_other} onChange={(event) => setOptions((list) => list.map((item, i) => i === index ? { ...item, is_other: event.target.checked } : item))} className="accent-rosa" />&quot;Otro&quot;</label>
            <button type="button" onClick={() => removeOption(option.id)} className="shrink-0 rounded-full p-2 text-piedra hover:bg-petalo-wash hover:text-rosa-deep" aria-label={`Quitar ${option.label}`}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input value={newOption} onChange={(event) => setNewOption(event.target.value)} placeholder="Nueva opción" className={`${inputClass} mt-0`} />
        <Button type="button" variant="secondary" onClick={addOption}><Plus className="h-4 w-4" />Sumar</Button>
      </div>
      <Button className="mt-4" busy={busy} onClick={save}>Guardar extra</Button>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

export function ProductsAdmin() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('cv')
  const flash = useFlash()

  const load = useCallback(async () => {
    const [p, g] = await Promise.all([
      supabase.from('products').select('*, product_extra_groups(group_id)').neq('category', 'curso').order('category').order('sort'),
      supabase.from('extra_groups').select('*, extra_options(*)').order('id'),
    ])
    setProducts((p.data as ProductRow[] | null) ?? [])
    setGroups((g.data as GroupRow[] | null) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    const { error } = await supabase.from('products').insert({
      id: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`, name, category: newCategory, price: 0, active: false,
      delivery: newCategory === 'sesion' ? 'session' : newCategory === 'asesorias' ? 'digital' : 'service',
      session_minutes: newCategory === 'sesion' ? 60 : null, sort: 99,
    })
    if (error) flash.show('error', errorMessage(error))
    else { setNewName(''); flash.show('ok', 'Creado como oculto: completalo y marcá "Visible".'); load() }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ciruela">Packs y productos</h2>
        <ul className="mt-4 space-y-3">{products.map((product) => <ProductEditor key={product.id} product={product} groups={groups} onChanged={load} />)}</ul>
        <form onSubmit={create} className={`${cardClass} mt-4 flex flex-col gap-3 sm:flex-row sm:items-end`}>
          <Field label="Nuevo producto" className="flex-1"><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ej: Sesión 1 a 1 por Meet" className={inputClass} /></Field>
          <Field label="Sección"><select value={newCategory} onChange={(event) => setNewCategory(event.target.value as Category)} className={inputClass}>{EDITABLE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></Field>
          <Button><Plus className="h-4 w-4" />Crear</Button>
        </form>
        {flash.node && <div className="mt-3">{flash.node}</div>}
      </section>
      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ciruela">Extras (idiomas, plataformas, express...)</h2>
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">{groups.map((group) => <GroupEditor key={`${group.id}-${group.extra_options.length}`} group={group} onChanged={load} />)}</ul>
      </section>
    </div>
  )
}
