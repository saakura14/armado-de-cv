'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Paperclip, Plus, Trash2 } from 'lucide-react'
import { formatARS } from '@/lib/catalog'
import { errorMessage, supabase } from '@/lib/supabase'
import { embedUrl } from '@/lib/video'
import { Button, Field, cardClass, inputClass, linesToArray, slugify, useFlash } from './ui'

type Lesson = { id: string; course_id: string; position: number; title: string; description: string | null; video_url: string | null; attachment_path: string | null; duration_minutes: number | null; is_preview: boolean }
type Course = {
  id: string; slug: string; title: string; description: string | null; published: boolean; product_id: string | null
  products: { id: string; price: number; features: string[] } | null
  lessons: Lesson[]
}

function LessonEditor({ lesson, index, total, onMove, onChanged }: { lesson: Lesson; index: number; total: number; onMove: (direction: -1 | 1) => void; onChanged: () => void }) {
  const [form, setForm] = useState({ title: lesson.title, description: lesson.description ?? '', video_url: lesson.video_url ?? '', duration: lesson.duration_minutes ? String(lesson.duration_minutes) : '', is_preview: lesson.is_preview })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('lessons').update({
      title: form.title.trim(), description: form.description.trim() || null, video_url: form.video_url.trim() || null,
      duration_minutes: Number(form.duration) || null, is_preview: form.is_preview,
    }).eq('id', lesson.id)
    setBusy(false)
    if (error) flash.show('error', errorMessage(error)); else { flash.show('ok', 'Clase guardada.'); onChanged() }
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar la clase "${lesson.title}"?`)) return
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id)
    if (lesson.attachment_path) await supabase.storage.from('course-files').remove([lesson.attachment_path])
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }

  async function attach(file: File) {
    const path = `${lesson.course_id}/${lesson.id}/${Date.now()}-${file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-')}`
    const { error: uploadError } = await supabase.storage.from('course-files').upload(path, file)
    const { error } = uploadError ? { error: uploadError } : await supabase.from('lessons').update({ attachment_path: path }).eq('id', lesson.id)
    if (error) flash.show('error', errorMessage(error)); else { flash.show('ok', 'Material subido.'); onChanged() }
  }

  const videoOk = !form.video_url.trim() || Boolean(embedUrl(form.video_url.trim()))
  return (
    <li className="rounded-2xl border border-line p-4">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-bold text-rosa">{index + 1}</span>
        <input value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} className={`${inputClass} mt-0 font-semibold`} aria-label="Título de la clase" />
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-full p-2 text-piedra hover:bg-arena disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="rounded-full p-2 text-piedra hover:bg-arena disabled:opacity-30" aria-label="Bajar"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={remove} className="rounded-full p-2 text-piedra hover:bg-petalo-wash hover:text-rosa-deep" aria-label="Eliminar clase"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Link del video (YouTube oculto, Vimeo o Google Drive)"><input value={form.video_url} onChange={(event) => setForm((c) => ({ ...c, video_url: event.target.value }))} placeholder="https://vimeo.com/..." className={inputClass} /></Field>
        <Field label="Minutos"><input inputMode="numeric" value={form.duration} onChange={(event) => setForm((c) => ({ ...c, duration: event.target.value }))} className={inputClass} /></Field>
      </div>
      {!videoOk && <p className="mt-1 text-xs text-rosa-deep">No reconozco ese link de video.</p>}
      <Field label="Descripción" className="mt-3"><textarea rows={2} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} className={inputClass} /></Field>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_preview} onChange={(event) => setForm((c) => ({ ...c, is_preview: event.target.checked }))} className="accent-rosa" />Clase de muestra gratis</label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-ciruela"><Paperclip className="h-4 w-4" />{lesson.attachment_path ? 'Reemplazar material' : 'Adjuntar material (PDF, Word...)'}
          <input type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) attach(file); event.target.value = '' }} />
        </label>
        <Button type="button" busy={busy} onClick={save} className="ml-auto">Guardar clase</Button>
      </div>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

function CourseEditor({ course, onChanged }: { course: Course; onChanged: () => void }) {
  const [open, setOpen] = useState(!course.published && course.lessons.length === 0)
  const [form, setForm] = useState({ title: course.title, description: course.description ?? '', price: String(course.products?.price ?? 0), features: (course.products?.features ?? []).join('\n'), published: course.published })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  const lessons = course.lessons.slice().sort((a, b) => a.position - b.position)

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('courses').update({ title: form.title.trim(), description: form.description.trim() || null, published: form.published }).eq('id', course.id)
    const { error: productError } = course.product_id ? await supabase.from('products').update({
      name: form.title.trim(), subtitle: 'Curso pre-grabado', price: Number(form.price.replace(/\D/g, '')) || 0,
      features: linesToArray(form.features), active: form.published,
    }).eq('id', course.product_id) : { error: null }
    setBusy(false)
    const failed = error ?? productError
    if (failed) flash.show('error', errorMessage(failed)); else { flash.show('ok', form.published ? 'Guardado y publicado.' : 'Guardado (sin publicar).'); onChanged() }
  }

  async function addLesson() {
    const { error } = await supabase.from('lessons').insert({ course_id: course.id, title: `Clase ${lessons.length + 1}`, position: lessons.length + 1 })
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }

  async function move(index: number, direction: -1 | 1) {
    const a = lessons[index], b = lessons[index + direction]
    if (!a || !b) return
    await Promise.all([
      supabase.from('lessons').update({ position: b.position }).eq('id', a.id),
      supabase.from('lessons').update({ position: a.position }).eq('id', b.id),
    ])
    onChanged()
  }

  return (
    <li className={cardClass}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span><span className="block font-bold text-ink">{course.title}</span><span className="text-sm text-piedra">{course.published ? 'Publicado' : 'Borrador'} · {lessons.length} clases</span></span>
        <span className="flex items-center gap-2"><span className="font-display text-lg font-extrabold text-ciruela">{formatARS(course.products?.price ?? 0)}</span><ChevronDown className={`h-5 w-5 text-piedra transition-transform ${open ? 'rotate-180' : ''}`} /></span>
      </button>
      {open && (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field label="Título"><input value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} className={inputClass} /></Field>
            <Field label="Precio (ARS)"><input inputMode="numeric" value={form.price} onChange={(event) => setForm((c) => ({ ...c, price: event.target.value }))} className={inputClass} /></Field>
          </div>
          <Field label="Descripción"><textarea rows={3} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} className={inputClass} /></Field>
          <Field label="Qué vas a aprender (uno por línea, se muestra en la web)"><textarea rows={3} value={form.features} onChange={(event) => setForm((c) => ({ ...c, features: event.target.value }))} className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(event) => setForm((c) => ({ ...c, published: event.target.checked }))} className="accent-rosa" />Publicado (se ve y se puede comprar en /cursos)</label>
          <Button busy={busy} onClick={save}>Guardar curso</Button>
          {flash.node}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-piedra">Clases</p>
            <ol className="mt-2 space-y-3">{lessons.map((lesson, index) => <LessonEditor key={`${lesson.id}-${lesson.position}-${lesson.attachment_path}`} lesson={lesson} index={index} total={lessons.length} onMove={(direction) => move(index, direction)} onChanged={onChanged} />)}</ol>
            <Button type="button" variant="secondary" className="mt-3" onClick={addLesson}><Plus className="h-4 w-4" />Sumar clase</Button>
          </div>
        </div>
      )}
    </li>
  )
}

export function CoursesAdmin() {
  const [courses, setCourses] = useState<Course[]>([])
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  const load = useCallback(async () => {
    const { data } = await supabase.from('courses').select('*, products(id, price, features), lessons(*)').order('created_at')
    setCourses((data as Course[] | null) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    const name = title.trim()
    if (!name) return
    setBusy(true)
    const slug = `${slugify(name)}-${Date.now().toString(36).slice(-4)}`
    const { error: productError } = await supabase.from('products').insert({ id: `curso-${slug}`, category: 'curso', delivery: 'course', name, subtitle: 'Curso pre-grabado', price: Number(price.replace(/\D/g, '')) || 0, active: false, sort: 50 })
    const { error } = productError ? { error: productError } : await supabase.from('courses').insert({ slug, title: name, product_id: `curso-${slug}` })
    setBusy(false)
    if (error) flash.show('error', errorMessage(error)); else { setTitle(''); setPrice(''); load() }
  }

  return (
    <div>
      <div className="max-w-3xl rounded-3xl bg-papel p-5 text-sm leading-relaxed text-ink">
        <p className="font-bold text-ciruela">¿Cómo cargo un curso?</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Subí cada video a <b>Vimeo</b> (privacidad: &quot;Ocultar de Vimeo&quot;) o a <b>YouTube como &quot;No listado&quot;</b>.</li>
          <li>Creá el curso acá abajo, sumá las clases y pegá el link de cada video.</li>
          <li>Marcá una o dos como &quot;muestra gratis&quot; si querés que se vean antes de comprar.</li>
          <li>Tildá &quot;Publicado&quot;: aparece en /cursos y se compra igual que un pack. Al aprobar el pago, el curso se habilita en &quot;Mi cuenta&quot; del cliente.</li>
        </ol>
      </div>
      <ul className="mt-5 space-y-4">{courses.map((course) => <CourseEditor key={course.id} course={course} onChanged={load} />)}</ul>
      <form onSubmit={create} className={`${cardClass} mt-4 flex flex-col gap-3 sm:flex-row sm:items-end`}>
        <Field label="Nuevo curso" className="flex-1"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: CV que pasa los filtros ATS" className={inputClass} /></Field>
        <Field label="Precio"><input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="25000" className={inputClass} /></Field>
        <Button busy={busy}><Plus className="h-4 w-4" />Crear</Button>
      </form>
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </div>
  )
}
