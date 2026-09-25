'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { fillPrices, loadPrices, rankFaqs, type Faq, type Prices } from '@/lib/faq'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

type Row = Faq & { active: boolean }
const SECTION_LABEL: Record<Faq['section'], string> = { cv: 'Armado de CV', asesorias: 'Asesorías', general: 'General' }

function FaqEditor({ faq, prices, onChanged }: { faq: Row; prices: Prices | null; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ question: faq.question, answer: faq.answer, keywords: faq.keywords.join(', '), section: faq.section, show_on_page: faq.show_on_page, active: faq.active, sort: String(faq.sort) })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('faqs').update({
      question: form.question.trim(), answer: form.answer.trim(), section: form.section, show_on_page: form.show_on_page, active: form.active, sort: Number(form.sort) || 0,
      keywords: form.keywords.split(',').map((word) => word.trim()).filter(Boolean),
    }).eq('id', faq.id)
    setBusy(false)
    if (error) flash.show('error', errorMessage(error)); else { flash.show('ok', 'Guardada. Sakura ya la usa.'); onChanged() }
  }

  async function remove() {
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    const { error } = await supabase.from('faqs').delete().eq('id', faq.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }

  return (
    <li className={`${cardClass} ${faq.active ? '' : 'opacity-60'}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="min-w-0"><span className="block font-semibold text-ink">{faq.question}</span><span className="text-xs text-piedra">{SECTION_LABEL[faq.section]}{faq.show_on_page ? ' · También en la página' : ''}{faq.active ? '' : ' · Oculta'}</span></span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-piedra transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <Field label="Pregunta"><input value={form.question} onChange={(event) => setForm((c) => ({ ...c, question: event.target.value }))} className={inputClass} /></Field>
          <Field label="Respuesta de Sakura"><textarea rows={4} value={form.answer} onChange={(event) => setForm((c) => ({ ...c, answer: event.target.value }))} className={inputClass} /></Field>
          {prices && form.answer.includes('{{') && <p className="rounded-xl bg-papel px-3 py-2 text-xs text-ink"><b>Así se ve:</b> {fillPrices(form.answer, prices)}</p>}
          <Field label="Palabras clave (separadas por coma)"><input value={form.keywords} onChange={(event) => setForm((c) => ({ ...c, keywords: event.target.value }))} placeholder="precio, cuesta, sale" className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sección"><select value={form.section} onChange={(event) => setForm((c) => ({ ...c, section: event.target.value as Faq['section'] }))} className={inputClass}>{(Object.keys(SECTION_LABEL) as Faq['section'][]).map((id) => <option key={id} value={id}>{SECTION_LABEL[id]}</option>)}</select></Field>
            <Field label="Orden"><input inputMode="numeric" value={form.sort} onChange={(event) => setForm((c) => ({ ...c, sort: event.target.value }))} className={inputClass} /></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.show_on_page} onChange={(event) => setForm((c) => ({ ...c, show_on_page: event.target.checked }))} className="accent-rosa" />Mostrar también en &quot;Preguntas frecuentes&quot; de la página</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm((c) => ({ ...c, active: event.target.checked }))} className="accent-rosa" />Activa</label>
          </div>
          <div className="flex gap-2">
            <Button busy={busy} onClick={save}>Guardar</Button>
            <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" />Eliminar</Button>
          </div>
          {flash.node}
        </div>
      )}
    </li>
  )
}

export function FaqsAdmin() {
  const [faqs, setFaqs] = useState<Row[]>([])
  const [prices, setPrices] = useState<Prices | null>(null)
  const [test, setTest] = useState('')
  const [question, setQuestion] = useState('')
  const flash = useFlash()

  const load = useCallback(async () => {
    const { data } = await supabase.from('faqs').select('*').order('section').order('sort')
    setFaqs((data as Row[] | null) ?? [])
  }, [])

  useEffect(() => { load(); loadPrices().then(setPrices) }, [load])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (!question.trim()) return
    const { error } = await supabase.from('faqs').insert({ question: question.trim(), answer: 'Escribí acá la respuesta.', sort: 99 })
    if (error) flash.show('error', errorMessage(error)); else { setQuestion(''); load() }
  }

  const match = test.trim() ? rankFaqs(test, faqs.filter((faq) => faq.active))[0]?.faq : null

  return (
    <div className="space-y-6">
      <div className="max-w-3xl rounded-3xl bg-papel p-5 text-sm leading-relaxed text-ink">
        <p className="font-bold text-ciruela">¿Cómo responde Sakura?</p>
        <p className="mt-1">Busca la pregunta que más se parece a lo que escribió la persona usando las <b>palabras clave</b>. Si no encuentra ninguna, la manda a tu WhatsApp. Para que los precios se actualicen solos, escribí <code className="rounded bg-white px-1">{'{{precio:cv-simple}}'}</code> o <code className="rounded bg-white px-1">{'{{extra:idiomas}}'}</code> en la respuesta.</p>
      </div>

      <div className={cardClass}>
        <Field label="Probá a Sakura: escribí una pregunta como lo haría un cliente"><input value={test} onChange={(event) => setTest(event.target.value)} placeholder="¿cuánto sale el cv en inglés?" className={inputClass} /></Field>
        {test.trim() && <p className="mt-3 text-sm">{match ? <>Respondería: <b>{match.question}</b></> : <span className="text-rosa-deep">No encuentra respuesta: la mandaría a WhatsApp. Sumá palabras clave a la pregunta que corresponda.</span>}</p>}
      </div>

      <ul className="space-y-3">{faqs.map((faq) => <FaqEditor key={faq.id} faq={faq} prices={prices} onChanged={load} />)}</ul>
      <form onSubmit={create} className={`${cardClass} flex flex-col gap-3 sm:flex-row sm:items-end`}>
        <Field label="Nueva pregunta" className="flex-1"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="¿Trabajan con estudiantes sin experiencia?" className={inputClass} /></Field>
        <Button><Plus className="h-4 w-4" />Crear</Button>
      </form>
      {flash.node}
    </div>
  )
}
