'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, FileText, Sparkles, Upload, X } from 'lucide-react'
import type { Order, OrderItem } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, inputClass, useFlash } from './ui'

/** The packs that include the LinkedIn profile. */
export const LINKEDIN_PACKS = ['linkedin', 'cv-premium']

export type LinkedInState = { order_item_id: string; status: 'pedido' | 'generando' | 'corregir' | 'listo' | 'error'; error: string | null }
type Section = { label: string; text: string }
type Draft = { source_text: string; target_job: string | null; files: string[]; status: LinkedInState['status']; sections: Section[] | null; error: string | null; feedback_files: string[] | null }

const STATE: Record<LinkedInState['status'], { label: string; tone: string }> = {
  pedido: { label: '✨ LinkedIn en cola', tone: 'bg-papel text-piedra' },
  generando: { label: '✨ Claude escribiendo…', tone: 'bg-petalo-wash text-rosa-deep' },
  corregir: { label: '✨ Claude corrigiendo…', tone: 'bg-petalo-wash text-rosa-deep' },
  listo: { label: '✨ Revisar LinkedIn', tone: 'bg-whatsapp/15 text-whatsapp' },
  error: { label: '⚠️ Falta material', tone: 'bg-petalo-wash text-rosa-deep' },
}
// LinkedIn's character limits, shown under the blocks that have one.
const LIMITS: [RegExp, number][] = [[/^titular/i, 220], [/^acerca/i, 2600], [/^experiencia/i, 2000]]
const limitOf = (label: string) => LIMITS.find(([pattern]) => pattern.test(label))?.[1] ?? null
const fileLabel = (path: string) => path.split('/').pop()!.replace(/^\d+-/, '')

/**
 * The LinkedIn profile for a pack: the client's material (the same as for the CV, if it was already loaded), and once
 * Claude wrote it, each block to review, fix and copy into LinkedIn.
 */
function LinkedInDialog({ order, item, firstName, status, onClose, onSaved }: { order: Order; item: OrderItem; firstName: string; status: LinkedInState['status'] | undefined; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [feedback, setFeedback] = useState('')
  const [shots, setShots] = useState<{ path: string; preview: string }[]>([])
  const [copied, setCopied] = useState(-1)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  // Loads again when Claude changes the status. Without a LinkedIn draft yet, it starts from the CV material of the order.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('linkedin_drafts').select('source_text, target_job, files, status, sections, error, feedback_files').eq('order_item_id', item.id).maybeSingle()
      const row = data as Draft | null
      if (row) {
        setDraft(row); setSource(row.source_text); setTarget(row.target_job ?? ''); setFiles(row.files ?? []); setSections(row.sections ?? [])
        if (row.status === 'listo') { setFeedback(''); setShots([]) }
      } else {
        const { data: cv } = await supabase.from('cv_drafts').select('source_text, target_job, files').eq('order_id', order.id).limit(1).maybeSingle()
        if (cv) { setSource((cv.source_text as string) ?? ''); setTarget((cv.target_job as string | null) ?? ''); setFiles((cv.files as string[] | null) ?? []) }
      }
      setLoaded(true)
    })()
  }, [item.id, order.id, status])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  async function upload(list: File[], correction = false) {
    const valid = correction ? list.filter((file) => file.type.startsWith('image/')) : list
    if (!valid.length) return
    setBusy(true)
    for (const [index, file] of valid.entries()) {
      const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)
      const path = correction ? `${order.id}/${item.id}/linkedin-correccion-${Date.now()}-${index}.${(file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}` : `${order.id}/${item.id}/${Date.now()}-${safe}`
      const { error } = await supabase.storage.from('cv-sources').upload(path, file, { contentType: file.type || undefined })
      if (error) { flash.show('error', `${file.name}: ${errorMessage(error)}`); continue }
      if (correction) setShots((current) => [...current, { path, preview: URL.createObjectURL(file) }])
      else setFiles((current) => [...current, path])
    }
    setBusy(false)
  }

  async function removeFile(path: string) {
    // The CV draft may share the file: only the list changes here, the file stays until the order is done.
    const rest = files.filter((row) => row !== path)
    setFiles(rest)
    if (draft) await supabase.from('linkedin_drafts').update({ files: rest }).eq('order_item_id', item.id)
  }

  async function request() {
    setBusy(true)
    const { error } = await supabase.from('linkedin_drafts').upsert({
      order_item_id: item.id, order_id: order.id, source_text: source.trim(), target_job: target.trim() || null, files,
      status: 'pedido', error: null, feedback: null, feedback_files: [], requested_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved(); onClose()
  }

  const cleaned = () => sections.map((section) => ({ label: section.label.trim(), text: section.text.trim() })).filter((section) => section.text)

  async function save(close = false) {
    setBusy(true)
    const { error } = await supabase.from('linkedin_drafts').update({ sections: cleaned() }).eq('order_item_id', item.id)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', 'Cambios guardados.')
    if (close) { onSaved(); onClose() }
  }

  async function correct() {
    setBusy(true)
    const old = (draft?.feedback_files ?? []).filter((path) => !shots.some((shot) => shot.path === path))
    if (old.length) await supabase.storage.from('cv-sources').remove(old)
    const { error } = await supabase.from('linkedin_drafts').update({ sections: cleaned(), feedback: feedback.trim() || 'Mirá las imágenes que te adjunté.', feedback_files: shots.map((shot) => shot.path), status: 'corregir', error: null, requested_at: new Date().toISOString() }).eq('order_item_id', item.id)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved(); onClose()
  }

  // Once it is in the client's LinkedIn, the draft and its correction screenshots go away (the client's files stay with the CV).
  async function done() {
    if (!window.confirm('¿Ya lo cargaste en su LinkedIn? Se borra este borrador.')) return
    setBusy(true)
    const extra = draft?.feedback_files ?? []
    if (extra.length) await supabase.storage.from('cv-sources').remove(extra)
    const { error } = await supabase.from('linkedin_drafts').delete().eq('order_item_id', item.id)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved(); onClose()
  }

  function copy(index: number) {
    navigator.clipboard.writeText(sections[index].text.trim()).then(() => { setCopied(index); window.setTimeout(() => setCopied(-1), 1500) }, () => undefined)
  }

  const working = draft?.status === 'pedido' || draft?.status === 'generando' || draft?.status === 'corregir'
  const review = draft?.status === 'listo'
  const material = (
    <>
      <Field label="CV base, respuestas del formulario o lo que quieras pasarle">
        <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={review ? 6 : 9} placeholder="Pegá el CV, el formulario o lo que te contó el cliente…" className={inputClass} />
      </Field>
      <div>
        <p className="text-sm font-semibold text-ink">Archivos (PDF, Word o fotos del CV)</p>
        {files.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {files.map((path) => (
              <li key={path} className="flex items-center justify-between gap-2 rounded-xl bg-papel/70 px-3 py-1.5 text-sm">
                <span className="flex min-w-0 items-center gap-1.5"><FileText className="h-4 w-4 shrink-0 text-rosa" /><span className="truncate">{fileLabel(path)}</span></span>
                <button type="button" onClick={() => removeFile(path)} className="rounded-full p-1 text-piedra hover:bg-white" aria-label={`Quitar ${fileLabel(path)}`}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <label className="mt-1.5 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-rosa/40 px-4 font-display text-sm font-bold text-rosa-deep hover:bg-petalo-wash">
          <Upload className="h-4 w-4" />Subir archivos
          <input type="file" multiple accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" className="sr-only" onChange={(event) => { upload(Array.from(event.target.files ?? [])); event.target.value = '' }} />
        </label>
      </div>
      <Field label="Puesto objetivo y lo que pidió el cliente">
        <textarea value={target} onChange={(event) => setTarget(event.target.value)} rows={3} placeholder="Ej.: Administrativa contable. Quiere que la encuentren reclutadores de zona norte." className={inputClass} />
      </Field>
    </>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="li-title" onClick={onClose}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-3xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="li-title" className="flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="h-5 w-5" />{review ? 'Revisá el LinkedIn' : 'LinkedIn con Claude'}</p>
            <p className="text-sm text-white/85">Pedido #{order.number} · {item.product_name} de {firstName}. Titular, Acerca de, experiencia, aptitudes y más, listos para copiar.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {working && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep"><b>{draft?.status === 'corregir' ? 'Claude está corrigiendo lo que le pediste.' : 'Claude está escribiendo el perfil.'}</b> Cuando esté, aparece acá y te aviso al celular.</p>}
          {draft?.status === 'error' && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep"><b>No se pudo generar:</b> {draft.error ?? 'probá de nuevo.'}</p>}
          {review ? (
            <>
              {draft?.error && <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-ink"><b>Nota de Claude:</b> {draft.error}</p>}
              <p className="rounded-2xl bg-whatsapp/10 px-4 py-3 text-sm text-ink">Cada bloque va en su lugar de LinkedIn. Tocá <b>Copiar</b> y pegalo en el perfil del cliente. Podés corregir acá mismo y tocar <b>Guardar cambios</b>.</p>
              {sections.map((section, index) => {
                const limit = limitOf(section.label)
                return (
                  <section key={index} className="rounded-2xl border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-sm font-bold text-ciruela">{section.label}</h3>
                      <button type="button" onClick={() => copy(index)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 font-display text-xs font-bold text-ciruela hover:bg-papel">{copied === index ? <><Check className="h-3.5 w-3.5" />¡Copiado!</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}</button>
                    </div>
                    <textarea value={section.text} onChange={(event) => setSections((current) => current.map((row, i) => (i === index ? { ...row, text: event.target.value } : row)))} rows={Math.min(Math.max(section.text.split('\n').length + 1, 2), 14)} className={`${inputClass} mt-2`} />
                    {limit && <p className={`mt-1 text-right text-xs ${section.text.length > limit ? 'font-bold text-rosa-deep' : 'text-piedra'}`}>{section.text.length} / {limit} caracteres</p>}
                  </section>
                )
              })}
              <div className="rounded-2xl border border-rosa/30 bg-petalo-wash/40 p-3">
                <Field label="¿Algo está mal? Decile a Claude qué corregir">
                  <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} onPaste={(event) => { const pasted = Array.from(event.clipboardData.files); if (pasted.some((file) => file.type.startsWith('image/'))) { event.preventDefault(); upload(pasted, true) } }} rows={3} placeholder="Ej.: el titular más corto, sacá la experiencia de 2015, sumá Excel avanzado a las aptitudes. También podés pegar una captura (Ctrl+V)." className={inputClass} />
                </Field>
                {shots.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {shots.map((shot) => (
                      <li key={shot.path} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot.preview} alt="Captura para la corrección" className="h-20 w-20 rounded-xl border border-line object-cover" />
                        <button type="button" onClick={async () => { await supabase.storage.from('cv-sources').remove([shot.path]); setShots((current) => current.filter((row) => row.path !== shot.path)) }} className="absolute -right-1.5 -top-1.5 rounded-full bg-ciruela p-0.5 text-white" aria-label="Quitar imagen"><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-rosa/40 bg-white px-3.5 font-display text-xs font-bold text-rosa-deep hover:bg-petalo-wash">
                  <Upload className="h-3.5 w-3.5" />Subir imagen
                  <input type="file" multiple accept="image/*" className="sr-only" onChange={(event) => { upload(Array.from(event.target.files ?? []), true); event.target.value = '' }} />
                </label>
              </div>
              <details className="rounded-2xl border border-line px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-ink">Material del cliente</summary>
                <div className="mt-3 space-y-4">
                  {material}
                  <Button variant="secondary" busy={busy} disabled={!(source.trim() || files.length)} onClick={request}>Rehacer desde cero con este material</Button>
                </div>
              </details>
            </>
          ) : material}
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          {review ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="secondary" busy={busy} onClick={() => save()}>Guardar cambios</Button>
              <Button variant="secondary" busy={busy} disabled={!feedback.trim() && !shots.length} onClick={correct}><Sparkles className="h-4 w-4" />Pedir corrección</Button>
              <Button busy={busy} onClick={done}><Check className="h-4 w-4" />Ya lo cargué</Button>
            </div>
          ) : (
            <Button className="w-full" busy={busy || !loaded} disabled={!(source.trim() || files.length) || working} onClick={request}><Sparkles className="h-4 w-4" />{draft ? 'Pedir el LinkedIn de nuevo' : 'Generar LinkedIn con Claude'}</Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** On an order with a LinkedIn pack (Perfil de LinkedIn or Premium): the profile written by Claude, per pack. */
export function LinkedInRow({ order, drafts, firstName, onChanged }: { order: Order; drafts: LinkedInState[]; firstName: string; onChanged: () => void }) {
  const [open, setOpen] = useState<OrderItem | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const packs = order.order_items.filter((item) => LINKEDIN_PACKS.includes(item.product_id))
  if (!packs.length || ['cancelled', 'pending_payment', 'payment_review', 'delivered'].includes(order.status)) return null
  return (
    <div className="mt-3 rounded-2xl border border-line px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-piedra"><Sparkles className="h-3.5 w-3.5 text-rosa" />LinkedIn</p>
      <ul className="mt-1.5 divide-y divide-line">
        {packs.map((item) => {
          const draft = drafts.find((row) => row.order_item_id === item.id)
          return (
            <li key={item.id} className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 text-sm">
              <span className="font-semibold text-ink">{item.product_name}</span>
              <button type="button" onClick={() => setOpen(item)} className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 font-display text-xs font-bold ${draft ? STATE[draft.status].tone : 'border border-line text-ciruela hover:bg-papel'}`}>
                {draft ? STATE[draft.status].label : <><Sparkles className="h-3.5 w-3.5 text-rosa" />LinkedIn con Claude</>}
              </button>
            </li>
          )
        })}
      </ul>
      {open && <LinkedInDialog order={order} item={open} firstName={firstName} status={drafts.find((row) => row.order_item_id === open.id)?.status} onClose={close} onSaved={onChanged} />}
    </div>
  )
}
