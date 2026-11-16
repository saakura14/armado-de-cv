'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Check, FileText, Loader2, ShieldCheck, Upload, X } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { whatsappUrl } from '@/lib/catalog'
import { FORM_CV_ACCEPT, FORM_MAX_BYTES, SECTIONS, formFileLabel, formNeeds, missingAnswers, questionsFor, takesForm, type Answers, type Question } from '@/lib/client-form'
import { errorMessage, supabase } from '@/lib/supabase'

type FormData = {
  number: number
  customer_name: string | null
  customer_phone: string | null
  items: { product_id: string; product_name: string }[]
  answers: Answers
  files: string[]
  photo: string | null
  submitted_at: string | null
  open: boolean
}

// Phones sometimes send Word files without a type; the bucket needs one.
const TYPES: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
const typeOf = (file: File) => file.type || TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] || undefined
const safeName = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)

const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal outline-none focus:border-rosa'

/**
 * "Tus datos para el CV": the private link Vale sends after the payment (armadodecv.com/datos/<token>). The customer
 * answers the questions of the old Google form and uploads their CV and photo; everything stays on the order and comes
 * loaded in "Textos con Claude". A draft is kept on this device and can be saved to go on later.
 */
export default function ClientFormPage() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<FormData | null | undefined>(undefined)
  const [answers, setAnswers] = useState<Answers>({})
  const [files, setFiles] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [editing, setEditing] = useState(true)
  const [busy, setBusy] = useState<'' | 'save' | 'send' | 'upload' | 'photo'>('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tried, setTried] = useState(false)
  const draftKey = `datos-cv-${token}`
  const loaded = useRef(false)

  useEffect(() => {
    supabase.rpc('client_form_get', { p_token: token }).then(({ data, error: failure }) => {
      const row = failure ? null : (data as FormData | null)
      setForm(row)
      if (!row) return
      // Their own unsent draft on this device wins over what is saved (it is newer).
      let draft: Answers | null = null
      try { draft = JSON.parse(window.localStorage.getItem(draftKey) ?? 'null') as Answers | null } catch { draft = null }
      const saved = row.answers ?? {}
      setAnswers({ full_name: row.customer_name ?? '', phone: row.customer_phone ?? '', ...saved, ...(row.submitted_at ? {} : draft ?? {}) })
      setFiles(row.files ?? [])
      setPhoto(row.photo)
      setEditing(!row.submitted_at)
      loaded.current = true
    })
  }, [token, draftKey])

  useEffect(() => {
    if (!loaded.current) return
    try { window.localStorage.setItem(draftKey, JSON.stringify(answers)) } catch { /* private mode: nothing to keep */ }
  }, [answers, draftKey])

  const needs = useMemo(() => formNeeds((form?.items ?? []).map((item) => item.product_id)), [form])
  const questions = useMemo(() => questionsFor(needs), [needs])
  const missing = missingAnswers(answers, needs)

  const save = useCallback(async (submit: boolean, next?: { files?: string[]; photo?: string | null }) => {
    const { data, error: failure } = await supabase.rpc('client_form_save', {
      p_token: token, p_answers: answers, p_files: next?.files ?? files, p_photo: next && 'photo' in next ? next.photo ?? null : photo, p_submit: submit,
    })
    if (failure) { setError(errorMessage(failure)); return false }
    setForm((current) => (current ? { ...current, submitted_at: (data as string | null) ?? current.submitted_at } : current))
    return true
  }, [token, answers, files, photo])

  async function upload(list: FileList | null, asPhoto: boolean) {
    const chosen = Array.from(list ?? [])
    if (!chosen.length) return
    setError(''); setNotice('')
    setBusy(asPhoto ? 'photo' : 'upload')
    const added: string[] = []
    for (const file of asPhoto ? chosen.slice(0, 1) : chosen) {
      if (file.size > FORM_MAX_BYTES) { setError(`${file.name} pesa más de 15 MB. Probá con una versión más liviana o mandámela por WhatsApp.`); continue }
      if (asPhoto && !file.type.startsWith('image/')) { setError('La foto tiene que ser una imagen (JPG o PNG).'); continue }
      const path = `forms/${token}/${Date.now()}-${safeName(file.name)}`
      const { error: failure } = await supabase.storage.from('cv-sources').upload(path, file, { contentType: typeOf(file) })
      if (failure) { setError(`${file.name}: no se pudo subir (${errorMessage(failure)}).`); continue }
      added.push(path)
    }
    // Saved right away, so an upload is never lost if they close the page.
    if (added.length) {
      if (asPhoto) { setPhoto(added[0]); await save(false, { photo: added[0] }) }
      else { const next = [...files, ...added].slice(0, 12); setFiles(next); await save(false, { files: next }) }
    }
    setBusy('')
  }

  async function removeFile(path: string) {
    const next = files.filter((row) => row !== path)
    setFiles(next)
    await save(false, { files: next })
  }

  async function removePhoto() {
    setPhoto(null)
    await save(false, { photo: null })
  }

  async function keepForLater() {
    setError(''); setBusy('save')
    if (await save(false)) setNotice('Guardado. Podés cerrar y seguir después desde este mismo link.')
    setBusy('')
  }

  async function send(event: React.FormEvent) {
    event.preventDefault()
    setTried(true); setError(''); setNotice('')
    if (missing.length) { setError(`Te falta completar: ${missing.map((question) => question.label.replace(/\?$/, '').replace(/^¿/, '')).join(', ')}.`); return }
    setBusy('send')
    const ok = await save(true)
    setBusy('')
    if (!ok) return
    try { window.localStorage.removeItem(draftKey) } catch { /* nothing kept */ }
    setEditing(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (form === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>

  const firstName = (answers.full_name || form?.customer_name || '').trim().split(/\s+/)[0]
  const packs = (form?.items ?? []).filter((item) => takesForm([item.product_id])).map((item) => item.product_name)
  const help = whatsappUrl(`¡Hola! Te escribo por los datos de mi pedido${form ? ` #${form.number}` : ''}.`)

  if (!form || !packs.length) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-script text-5xl text-rosa">No encontramos este formulario</p>
        <p className="mt-3 text-sm text-piedra">Revisá que el link esté completo, o escribime y te paso uno nuevo.</p>
        <a href={help} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-3 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" />Escribirme por WhatsApp</a>
      </section>
    )
  }

  if (!form.open) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-script text-5xl text-rosa">Este formulario ya está cerrado</p>
        <p className="mt-3 text-sm text-piedra">Tu pedido #{form.number} ya está {form.submitted_at ? 'en marcha con los datos que me pasaste' : 'cerrado'}. Si querés cambiar o sumar algo, escribime.</p>
        <a href={help} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-3 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" />Escribirme por WhatsApp</a>
      </section>
    )
  }

  if (!editing) {
    return (
      <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 text-center shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp/15 text-whatsapp"><Check className="h-7 w-7" /></span>
          <p className="mt-4 font-script text-5xl leading-none text-rosa">¡Gracias{firstName ? `, ${firstName}` : ''}!</p>
          <p className="mt-3 text-sm leading-relaxed text-ink">Ya tengo tus datos para {packs.join(' y ')}. Me pongo a trabajar y, si me falta algo, te escribo por WhatsApp.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setEditing(true)} className="min-h-12 rounded-full border border-ciruela px-5 py-3 font-display text-sm font-bold text-ciruela hover:bg-petalo-wash">Cambiar o sumar algo</button>
            <a href={help} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" />Escribirme</a>
          </div>
        </div>
      </section>
    )
  }

  const field = (question: Question) => {
    const value = answers[question.id] ?? ''
    const invalid = tried && missing.some((row) => row.id === question.id)
    const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
    return (
      <label key={question.id} className="block text-sm font-semibold text-ciruela">
        {question.label}{question.required && <span className="text-rosa"> *</span>}
        {question.help && <span className="mt-0.5 block text-xs font-normal leading-relaxed text-piedra">{question.help}</span>}
        {question.short
          ? <input value={value} onChange={onChange} type={question.inputMode === 'email' ? 'email' : question.inputMode === 'tel' ? 'tel' : 'text'} inputMode={question.inputMode} maxLength={200} placeholder={question.placeholder} aria-invalid={invalid} className={`${input} ${invalid ? 'border-rosa' : ''}`} />
          : <textarea value={value} onChange={onChange} rows={question.id === 'experience' ? 8 : 4} maxLength={6000} placeholder={question.placeholder} aria-invalid={invalid} className={`${input} ${invalid ? 'border-rosa' : ''}`} />}
      </label>
    )
  }

  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-16">
      <form onSubmit={send} className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-[28px] bg-ciruela p-6 text-white sm:p-8">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Pedido #{form.number} · {packs.join(' + ')}</p>
          <p className="mt-2 font-script text-5xl leading-none text-petalo">{firstName ? `¡Hola, ${firstName}!` : '¡Hola!'}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/85">Estos son los datos que necesito para armar tu {needs.cv ? 'CV' : 'perfil de LinkedIn'}. Te lleva unos 10 minutos: contame con detalle, que después yo elijo qué va y cómo se escribe. Lo que escribas queda guardado en este celu, y podés tocar &quot;Guardar y seguir después&quot; para terminarlo en otro momento.</p>
        </div>

        {/* The base CV first: with it, many answers can be short. */}
        {needs.cv && (
          <div className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
            <p className="font-display text-lg font-bold text-ciruela">¿Tenés un CV actual?</p>
            <p className="mt-1 text-sm text-piedra">Subilo para que lo evalúe: PDF, Word o fotos. Si no tenés, no pasa nada, completá las preguntas de abajo.</p>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((path) => (
                  <li key={path} className="flex items-center justify-between gap-2 rounded-xl bg-papel/70 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5"><FileText className="h-4 w-4 shrink-0 text-rosa" /><span className="truncate">{formFileLabel(path)}</span></span>
                    <button type="button" onClick={() => removeFile(path)} className="rounded-full p-1 text-piedra hover:bg-white" aria-label={`Quitar ${formFileLabel(path)}`}><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <label className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-rosa/40 px-5 font-display text-sm font-bold text-rosa-deep hover:bg-petalo-wash ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
              {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy === 'upload' ? 'Subiendo…' : files.length ? 'Subir otro archivo' : 'Subir mi CV'}
              <input type="file" multiple accept={FORM_CV_ACCEPT} className="sr-only" onChange={(event) => { upload(event.target.files, false); event.target.value = '' }} />
            </label>
          </div>
        )}

        {SECTIONS.map((section) => {
          const list = questions.filter((question) => question.section === section.id)
          if (!list.length) return null
          return (
            <fieldset key={section.id} className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
              <legend className="sr-only">{section.title}</legend>
              <p className="font-display text-lg font-bold text-ciruela">{section.title}</p>
              {section.text && <p className="mt-1 text-sm text-piedra">{section.text}</p>}
              <div className="mt-5 space-y-5">
                {list.map((question) => (
                  <div key={question.id}>
                    {field(question)}
                    {question.id === 'experience' && (
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input type="checkbox" checked={Boolean(answers.first_job)} onChange={(event) => setAnswers((current) => ({ ...current, first_job: event.target.checked }))} className="accent-rosa" />
                        Busco mi primer empleo (todavía no trabajé)
                      </label>
                    )}
                  </div>
                ))}
                {/* The photo goes with the pack questions: only the modern CV has one. */}
                {section.id === 'pack' && needs.modern && (
                  <div>
                    <p className="text-sm font-semibold text-ciruela">Foto para el CV (opcional)</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-piedra">De frente, con buena luz, fondo liso y ropa como para una entrevista. Si no querés foto en el CV, contámelo arriba.</p>
                    {photo ? (
                      <p className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-papel/70 px-3 py-2 text-sm">
                        <span className="flex min-w-0 items-center gap-1.5"><Camera className="h-4 w-4 shrink-0 text-rosa" /><span className="truncate">{formFileLabel(photo)}</span></span>
                        <button type="button" onClick={removePhoto} className="rounded-full p-1 text-piedra hover:bg-white" aria-label="Quitar la foto"><X className="h-4 w-4" /></button>
                      </p>
                    ) : (
                      <label className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-rosa/40 px-5 font-display text-sm font-bold text-rosa-deep hover:bg-petalo-wash ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                        {busy === 'photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}{busy === 'photo' ? 'Subiendo…' : 'Subir mi foto'}
                        <input type="file" accept="image/*" className="sr-only" onChange={(event) => { upload(event.target.files, true); event.target.value = '' }} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </fieldset>
          )
        })}

        <div className="rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
          {error && <p role="alert" className="mb-4 rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-xl bg-whatsapp/10 px-3 py-2 text-sm font-semibold text-whatsapp">{notice}</p>}
          <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
            <button type="button" onClick={keepForLater} disabled={Boolean(busy)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-ciruela px-5 py-3 font-display text-sm font-bold text-ciruela hover:bg-petalo-wash disabled:opacity-50">
              {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}Guardar y seguir después
            </button>
            <button disabled={Boolean(busy)} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-rosa px-5 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-rosa-deep disabled:opacity-50">
              {busy === 'send' && <Loader2 className="h-4 w-4 animate-spin" />}Enviar mis datos
            </button>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-piedra"><ShieldCheck className="h-4 w-4 shrink-0" />Tus datos y archivos los uso solo para armar tu pedido.</p>
        </div>
      </form>
    </section>
  )
}
