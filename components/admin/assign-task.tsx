'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, FileText, Sparkles, Upload, Users, X } from 'lucide-react'
import { hasExpress, teamDueOn } from '@/lib/dashboard'
import type { Order, OrderItem } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { ATS_ONLY_PACKS, PACKS_WITH_LETTER, TASK_STATUS, TEAM_PACKS, type TaskStatus, type TeamMember } from '@/lib/team'
import { TaskStart } from './task-start'
import { Button, Field, inputClass, useBackdropClose, useFlash } from './ui'

export type OrderTask = { id: string; order_item_id: string; status: TaskStatus; started_at: string | null; due_on?: string | null; team_members: { name: string } | { name: string }[] | null }
/** "Textos con Claude": where each pack's texts are (the scheduled task on Vale's computer writes them). */
export type DraftState = { order_item_id: string; status: 'pedido' | 'generando' | 'corregir' | 'listo' | 'error'; error: string | null }
type Draft = { source_text: string; target_job: string | null; files: string[]; has_letter: boolean; status: DraftState['status']; cv_modern: string | null; cv_ats: string | null; letter: string | null; error: string | null; feedback?: string | null }

const DRAFT_STATE: Record<DraftState['status'], { label: string; tone: string }> = {
  pedido: { label: '✨ Claude en cola', tone: 'bg-papel text-piedra' },
  generando: { label: '✨ Claude escribiendo…', tone: 'bg-petalo-wash text-rosa-deep' },
  corregir: { label: '✨ Claude corrigiendo…', tone: 'bg-petalo-wash text-rosa-deep' },
  listo: { label: '✨ Revisar textos', tone: 'bg-whatsapp/15 text-whatsapp' },
  error: { label: '⚠️ Falta material', tone: 'bg-petalo-wash text-rosa-deep' },
}
const fileLabel = (path: string) => path.split('/').pop()!.replace(/^\d+-/, '')

/** The order's delivery deadline minus one business day, so Vale has time to check it (never before today). */
function suggestedDue(order: Order) {
  const value = teamDueOn(order)
  const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return !value ? '' : value < today ? today : value
}

/** The texts Vale used to send by WhatsApp, now saved as a task for the team member. */
function AssignDialog({ order, item, firstName, onClose, onSaved }: { order: Order; item: OrderItem; firstName: string; onClose: () => void; onSaved: () => void }) {
  const backdrop = useBackdropClose(onClose)
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [memberId, setMemberId] = useState('')
  const [modern, setModern] = useState('')
  const [ats, setAts] = useState('')
  // The first job pack is only the ATS CV: no modern text and no letter.
  const atsOnly = ATS_ONLY_PACKS.includes(item.product_id)
  const [hasLetter, setHasLetter] = useState(PACKS_WITH_LETTER.includes(item.product_id))
  // What she pays for this CV: the member's rate unless she changes it (e.g. less for a single ATS CV).
  const [rate, setRate] = useState('')
  const [letter, setLetter] = useState('')
  const [notes, setNotes] = useState('')
  // Express orders start as urgent: he sees a small lightning bolt on the CV.
  // Urgent means the customer bought the 24 h Express: it comes ticked for those.
  const [urgent, setUrgent] = useState(() => hasExpress(order))
  const [due, setDue] = useState(() => suggestedDue(order))
  const [busy, setBusy] = useState(false)
  const [fromClaude, setFromClaude] = useState(false)
  const flash = useFlash()

  // Texts Claude already wrote for this pack come pre-filled (she reviews them before assigning).
  useEffect(() => {
    supabase.from('cv_drafts').select('status, cv_modern, cv_ats, letter, has_letter').eq('order_item_id', item.id).maybeSingle().then(({ data }) => {
      const draft = data as Pick<Draft, 'status' | 'cv_modern' | 'cv_ats' | 'letter' | 'has_letter'> | null
      if (draft?.status !== 'listo') return
      setModern((current) => current || draft.cv_modern || '')
      setAts((current) => current || draft.cv_ats || '')
      setLetter((current) => current || draft.letter || '')
      if (draft.letter) setHasLetter(true)
      setFromClaude(true)
    })
  }, [item.id])

  useEffect(() => {
    supabase.from('team_members').select('*').eq('active', true).order('created_at').then(({ data }) => {
      const list = (data as TeamMember[] | null) ?? []
      setMembers(list)
      setMemberId((current) => current || list[0]?.id || '')
      setRate((current) => current || String(list[0]?.rate ?? ''))
    })
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  async function save() {
    const member = members?.find((row) => row.id === memberId)
    if (!member) return
    setBusy(true)
    const { data, error } = await supabase.from('team_tasks').insert({
      member_id: member.id, order_id: order.id, order_item_id: item.id, order_number: order.number,
      client_name: firstName, pack_name: item.product_name,
      cv_modern: atsOnly ? '' : modern.trim(), cv_ats: ats.trim(), has_letter: !atsOnly && hasLetter, letter: !atsOnly && hasLetter ? letter.trim() || null : null,
      notes: notes.trim() || null, due_on: due || null, urgent, rate: rate === '' ? member.rate : Number(rate),
    }).select('id').single()
    setBusy(false)
    if (error) { flash.show('error', /duplicate|unique/i.test(error.message) ? 'Este pack ya está asignado.' : errorMessage(error)); return }
    // The member gets a notification on their phone. The order moves to "En proceso" in the database (team_task_starts_order).
    supabase.functions.invoke('notify-admin', { body: { task_id: (data as { id: string }).id, kind: 'task_assigned' } }).then(() => undefined, () => undefined)
    // The texts are now with the team: Claude's draft and the client's files go away (and a queued one isn't written).
    const { data: draft } = await supabase.from('cv_drafts').select('files, feedback_files').eq('order_item_id', item.id).maybeSingle()
    if (draft) {
      const stored = [...(draft.files as string[]), ...((draft.feedback_files as string[] | null) ?? [])]
      if (stored.length) await supabase.storage.from('cv-sources').remove(stored)
      await supabase.from('cv_drafts').delete().eq('order_item_id', item.id)
    }
    onSaved()
    onClose()
  }

  const ready = memberId && (atsOnly || modern.trim()) && ats.trim()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="assign-title" {...backdrop}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="assign-title" className="flex items-center gap-2 font-display text-lg font-bold"><Users className="h-5 w-5" />Asignar al equipo</p>
            <p className="text-sm text-white/85">Pedido #{order.number} · {item.product_name} de {firstName}. Solo ve estos textos y el nombre de pila.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {members && members.length === 0 && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep">Todavía no sumaste a nadie al equipo: hacelo en la pestaña <b>Equipo</b>.</p>}
          {members && members.length > 1 && (
            <Field label="¿Quién lo arma?">
              <select value={memberId} onChange={(event) => setMemberId(event.target.value)} className={inputClass}>{members.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
            </Field>
          )}
          {fromClaude && <p className="rounded-2xl bg-whatsapp/10 px-4 py-3 text-sm text-ink"><b>✨ Textos de Claude.</b> Leelos y corregí lo que haga falta antes de asignarlo.</p>}
          {atsOnly && <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-ink"><b>Pack Primer Empleo:</b> lleva solo el CV ATS (sin diseño moderno ni carta).</p>}
          {!atsOnly && <Field label="Texto del CV moderno"><textarea value={modern} onChange={(event) => setModern(event.target.value)} rows={7} placeholder="Pegá el texto tal cual se lo mandabas por WhatsApp" className={inputClass} /></Field>}
          <Field label="Texto del CV ATS"><textarea value={ats} onChange={(event) => setAts(event.target.value)} rows={atsOnly ? 10 : 7} placeholder={atsOnly ? 'Pegá el texto tal cual se lo mandabas por WhatsApp' : undefined} className={inputClass} /></Field>
          {!atsOnly && <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={hasLetter} onChange={(event) => setHasLetter(event.target.checked)} className="accent-rosa" />Lleva carta de presentación</label>}
          {!atsOnly && hasLetter && <Field label="Texto de la carta (opcional)"><textarea value={letter} onChange={(event) => setLetter(event.target.value)} rows={5} className={inputClass} /></Field>}
          <Field label="Le pagás por este CV"><input inputMode="numeric" value={rate} onChange={(event) => setRate(event.target.value.replace(/\D/g, ''))} className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Para cuándo"><input type="date" value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} /></Field>
            <Field label="Notas (colores, foto, rubro…)"><input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>
          </div>
          {due && <p className="-mt-2 text-xs text-piedra">Sugerido: un día hábil antes de tu vencimiento, para que llegues a revisarlo.</p>}
          <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} className="accent-rosa" />🔴 Es urgente (Express 24 hs) <span className="font-normal text-piedra">(le aparece primero y en rojo, con la marca de su personaje)</span></label>
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          <Button className="w-full" busy={busy} disabled={!ready} onClick={save}>Asignar y avisarle</Button>
        </div>
      </div>
    </div>
  )
}

/**
 * The client's material for Claude (the base CV pasted or as PDF, Word or photos, the form answers, the target job and
 * what the client asked) and, once Claude wrote them, the texts to review: she can fix them by hand, tell Claude what
 * to correct, or approve them and assign the CV.
 */
function DraftDialog({ order, item, firstName, status, onClose, onSaved, onApprove }: { order: Order; item: OrderItem; firstName: string; status: DraftState['status'] | undefined; onClose: () => void; onSaved: () => void; onApprove: () => void }) {
  const backdrop = useBackdropClose(onClose)
  const atsOnly = ATS_ONLY_PACKS.includes(item.product_id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [hasLetter, setHasLetter] = useState(PACKS_WITH_LETTER.includes(item.product_id))
  const [modern, setModern] = useState('')
  const [ats, setAts] = useState('')
  const [letter, setLetter] = useState('')
  const [feedback, setFeedback] = useState('')
  // Screenshots that go with the correction (pasted or uploaded): stored paths plus a local preview of each.
  const [shots, setShots] = useState<{ path: string; preview: string }[]>([])
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  // Loads again when Claude changes the status (the board is live), so the texts show up without closing the window.
  useEffect(() => {
    supabase.from('cv_drafts').select('source_text, target_job, files, has_letter, status, cv_modern, cv_ats, letter, error, feedback').eq('order_item_id', item.id).maybeSingle().then(({ data }) => {
      const row = data as Draft | null
      if (row) {
        setDraft(row); setSource(row.source_text); setTarget(row.target_job ?? ''); setFiles(row.files ?? []); setHasLetter(row.has_letter)
        setModern(row.cv_modern ?? ''); setAts(row.cv_ats ?? ''); setLetter(row.letter ?? '')
        if (row.status === 'listo') setFeedback('')
      }
      setLoaded(true)
    })
  }, [item.id, status])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  async function upload(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    const added: string[] = []
    for (const file of Array.from(list)) {
      const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)
      const path = `${order.id}/${item.id}/${Date.now()}-${safe}`
      const { error } = await supabase.storage.from('cv-sources').upload(path, file, { contentType: file.type || undefined })
      if (error) { flash.show('error', `${file.name}: ${errorMessage(error)}`); continue }
      added.push(path)
    }
    setFiles((current) => [...current, ...added])
    setBusy(false)
  }

  async function removeFile(path: string) {
    await supabase.storage.from('cv-sources').remove([path])
    const rest = files.filter((row) => row !== path)
    setFiles(rest)
    // Keep the saved draft in step, so a removed file isn't sent to Claude.
    if (draft) await supabase.from('cv_drafts').update({ files: rest }).eq('order_item_id', item.id)
  }

  async function addShots(list: File[]) {
    const images = list.filter((file) => file.type.startsWith('image/'))
    if (!images.length) return
    setBusy(true)
    const added: { path: string; preview: string }[] = []
    for (const [index, file] of images.entries()) {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
      const path = `${order.id}/${item.id}/correccion-${Date.now()}-${index}.${ext}`
      const { error } = await supabase.storage.from('cv-sources').upload(path, file, { contentType: file.type })
      if (error) { flash.show('error', errorMessage(error)); continue }
      added.push({ path, preview: URL.createObjectURL(file) })
    }
    setShots((current) => [...current, ...added])
    setBusy(false)
  }

  async function removeShot(path: string) {
    await supabase.storage.from('cv-sources').remove([path])
    setShots((current) => current.filter((shot) => shot.path !== path))
  }

  // From scratch with the material (first time, or "Rehacer desde cero").
  async function request() {
    setBusy(true)
    // Starting over: screenshots of earlier corrections aren't needed anymore.
    const { data: before } = await supabase.from('cv_drafts').select('feedback_files').eq('order_item_id', item.id).maybeSingle()
    const old = (before?.feedback_files as string[] | null) ?? []
    if (old.length) await supabase.storage.from('cv-sources').remove(old)
    const { error } = await supabase.from('cv_drafts').upsert({
      order_item_id: item.id, order_id: order.id, source_text: source.trim(), target_job: target.trim() || null, files,
      has_letter: !atsOnly && hasLetter, ats_only: atsOnly, status: 'pedido', error: null, feedback: null, feedback_files: [], requested_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved()
    onClose()
  }

  const texts = { cv_modern: atsOnly ? '' : modern.trim(), cv_ats: ats.trim(), letter: !atsOnly && hasLetter ? letter.trim() || null : null }

  // Claude keeps what's right (and her own edits) and changes only what she points out.
  async function correct() {
    setBusy(true)
    // The screenshots of a previous correction are done: they go away so only the new ones reach Claude.
    const { data: before } = await supabase.from('cv_drafts').select('feedback_files').eq('order_item_id', item.id).maybeSingle()
    const old = ((before?.feedback_files as string[] | null) ?? []).filter((path) => !shots.some((shot) => shot.path === path))
    if (old.length) await supabase.storage.from('cv-sources').remove(old)
    const { error } = await supabase.from('cv_drafts').update({ ...texts, feedback: feedback.trim() || 'Mirá las imágenes que te adjunté.', feedback_files: shots.map((shot) => shot.path), status: 'corregir', error: null, requested_at: new Date().toISOString() }).eq('order_item_id', item.id)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved()
    onClose()
  }

  async function approve() {
    setBusy(true)
    const { error } = await supabase.from('cv_drafts').update(texts).eq('order_item_id', item.id)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onApprove()
  }

  const working = draft?.status === 'pedido' || draft?.status === 'generando' || draft?.status === 'corregir'
  const review = draft?.status === 'listo'
  const material = (
    <>
      <Field label="CV base, respuestas del formulario o lo que quieras pasarle">
        <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={review ? 6 : 10} placeholder="Pegá el CV que te mandó, las respuestas del formulario, lo que te contó por WhatsApp…" className={inputClass} />
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
          <input type="file" multiple accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" className="sr-only" onChange={(event) => { upload(event.target.files); event.target.value = '' }} />
        </label>
      </div>
      <Field label="Puesto objetivo y lo que pidió el cliente">
        <textarea value={target} onChange={(event) => setTarget(event.target.value)} rows={3} placeholder="Ej.: Operario de producción. Quiere destacar el manejo de autoelevador. Zona norte." className={inputClass} />
      </Field>
      {!atsOnly && <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={hasLetter} onChange={(event) => setHasLetter(event.target.checked)} className="accent-rosa" />Lleva carta de presentación</label>}
    </>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="draft-title" {...backdrop}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-3xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="draft-title" className="flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="h-5 w-5" />{review ? 'Revisá los textos' : 'Textos con Claude'}</p>
            <p className="text-sm text-white/85">Pedido #{order.number} · {item.product_name} de {firstName}. {atsOnly ? 'Lleva solo el CV ATS.' : `CV moderno + CV ATS${hasLetter ? ' + carta' : ''}.`}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {working && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep"><b>{draft?.status === 'corregir' ? 'Claude está corrigiendo lo que le pediste.' : 'Claude está escribiendo los textos.'}</b> Cuando estén, aparecen acá para que los revises y te aviso al celular.</p>}
          {draft?.status === 'error' && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep"><b>No se pudieron generar:</b> {draft.error ?? 'probá de nuevo.'}</p>}
          {review ? (
            <>
              {draft?.error && <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-ink"><b>Nota de Claude:</b> {draft.error}</p>}
              <p className="rounded-2xl bg-whatsapp/10 px-4 py-3 text-sm text-ink">Leelos con calma. Podés cambiar cualquier cosa acá mismo, o decirle a Claude qué corregir. Al aprobarlos pasan a <b>Asignar</b> tal cual quedaron.</p>
              {!atsOnly && <Field label="CV moderno"><textarea value={modern} onChange={(event) => setModern(event.target.value)} rows={12} className={inputClass} /></Field>}
              <Field label="CV ATS"><textarea value={ats} onChange={(event) => setAts(event.target.value)} rows={12} className={inputClass} /></Field>
              {!atsOnly && hasLetter && <Field label="Carta de presentación"><textarea value={letter} onChange={(event) => setLetter(event.target.value)} rows={8} className={inputClass} /></Field>}
              <div className="rounded-2xl border border-rosa/30 bg-petalo-wash/40 p-3">
                <Field label="¿Algo está mal? Decile a Claude qué corregir">
                  <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} onPaste={(event) => { const pasted = Array.from(event.clipboardData.files); if (pasted.some((file) => file.type.startsWith('image/'))) { event.preventDefault(); addShots(pasted) } }} rows={3} placeholder="Ej.: en el ATS sacá el trabajo de niñera, el título tiene que ser Administrativa contable, la carta más corta. También podés pegar una captura acá (Ctrl+V)." className={inputClass} />
                </Field>
                {shots.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {shots.map((shot) => (
                      <li key={shot.path} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot.preview} alt="Captura para la corrección" className="h-20 w-20 rounded-xl border border-line object-cover" />
                        <button type="button" onClick={() => removeShot(shot.path)} className="absolute -right-1.5 -top-1.5 rounded-full bg-ciruela p-0.5 text-white" aria-label="Quitar imagen"><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-rosa/40 bg-white px-3.5 font-display text-xs font-bold text-rosa-deep hover:bg-petalo-wash">
                  <Upload className="h-3.5 w-3.5" />Subir imagen
                  <input type="file" multiple accept="image/*" className="sr-only" onChange={(event) => { addShots(Array.from(event.target.files ?? [])); event.target.value = '' }} />
                </label>
                <p className="mt-1 text-xs text-piedra">Corrige solo lo que le digas y respeta los cambios que hiciste a mano. Las imágenes le muestran qué está mal.</p>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" busy={busy} disabled={!feedback.trim() && !shots.length} onClick={correct}><Sparkles className="h-4 w-4" />Pedir corrección</Button>
              <Button busy={busy} disabled={!ats.trim() || (!atsOnly && !modern.trim())} onClick={approve}><Check className="h-4 w-4" />Aprobar y asignar</Button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              {/* Without Claude: she writes or pastes the texts herself in Asignar. */}
              <Button variant="secondary" onClick={onApprove}>Los escribo yo</Button>
              <Button busy={busy || !loaded} disabled={!(source.trim() || files.length) || working} onClick={request}><Sparkles className="h-4 w-4" />{draft ? 'Pedir los textos de nuevo' : 'Generar textos con Claude'}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type SentTask = { pack_name: string; cv_modern: string; cv_ats: string; has_letter: boolean; letter: string | null; notes: string | null; design_url: string | null; assigned_at: string }

/** What the team member got for a pack (read only), to check the finished CV against it. */
function SentTexts({ taskId, order, firstName, onClose }: { taskId: string; order: Order; firstName: string; onClose: () => void }) {
  const backdrop = useBackdropClose(onClose)
  const [task, setTask] = useState<SentTask | null>(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    supabase.from('team_tasks').select('pack_name, cv_modern, cv_ats, has_letter, letter, notes, design_url, assigned_at').eq('id', taskId).maybeSingle().then(({ data }) => setTask(data as SentTask | null))
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [taskId, onClose])

  const sections = task ? [
    { label: 'CV moderno', text: task.cv_modern },
    { label: 'CV ATS', text: task.cv_ats },
    { label: 'Carta de presentación', text: task.has_letter ? task.letter ?? '' : '' },
  ].filter((section) => section.text.trim()) : []

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); window.setTimeout(() => setCopied(''), 1500) }, () => undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sent-title" {...backdrop}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-3xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="sent-title" className="flex items-center gap-2 font-display text-lg font-bold"><FileText className="h-5 w-5" />Textos que le pasaste</p>
            <p className="text-sm text-white/85">Pedido #{order.number} · {task?.pack_name ?? '…'} de {firstName}{task ? ` · asignado el ${new Date(task.assigned_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {!task && <p className="text-sm text-piedra">Cargando…</p>}
          {task?.notes && <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-ink"><b>Notas:</b> {task.notes}</p>}
          {task?.design_url && <p className="text-sm"><a href={task.design_url} target="_blank" rel="noreferrer" className="font-semibold text-rosa-deep underline">Abrir el diseño en Canva</a> para compararlo.</p>}
          {sections.map((section) => (
            <section key={section.label}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-sm font-bold text-ciruela">{section.label}</h3>
                <button type="button" onClick={() => copy(section.label, section.text)} className="rounded-full border border-line px-3 py-1 font-display text-xs font-bold text-ciruela hover:bg-papel">{copied === section.label ? '¡Copiado!' : 'Copiar'}</button>
              </div>
              {/* Each paragraph with its own copy button, to fix just one piece; the text can also be selected by hand. */}
              <div className="mt-1.5 divide-y divide-line rounded-2xl border border-line bg-white">
                {section.text.replace(/
/g, '
').split(/
[ 	]*
+/).map((piece) => piece.trim()).filter(Boolean).map((piece, index) => {
                  const id = `${section.label}-${index}`
                  return (
                    <div key={id} className="group flex items-start gap-2 px-4 py-2.5">
                      <p className="min-w-0 flex-1 select-text whitespace-pre-wrap text-sm leading-relaxed text-ink">{piece}</p>
                      <button type="button" onClick={() => copy(id, piece)} title="Copiar este párrafo" aria-label="Copiar este párrafo" className="shrink-0 rounded-full p-1.5 text-piedra hover:bg-papel hover:text-ciruela">{copied === id ? <Check className="h-4 w-4 text-whatsapp" /> : <Copy className="h-4 w-4" />}</button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

/** On a CV order: each pack with who is building it, or a button to assign it. */
export function TeamRow({ order, tasks, drafts = [], firstName, onChanged }: { order: Order; tasks: OrderTask[]; drafts?: DraftState[]; firstName: string; onChanged: () => void }) {
  const [assigning, setAssigning] = useState<OrderItem | null>(null)
  const [drafting, setDrafting] = useState<OrderItem | null>(null)
  const close = useCallback(() => setAssigning(null), [])
  const closeDraft = useCallback(() => setDrafting(null), [])
  const [viewing, setViewing] = useState<string | null>(null)
  const closeViewing = useCallback(() => setViewing(null), [])
  const packs = order.order_items.filter((item) => TEAM_PACKS.includes(item.product_id))
  if (!packs.length || order.status === 'cancelled' || order.status === 'pending_payment' || order.status === 'payment_review') return null
  // A delivered order only shows the packs that went through the team.
  const rows = packs.filter((item) => order.status !== 'delivered' || tasks.some((row) => row.order_item_id === item.id))
  if (!rows.length) return null
  return (
    <div className="mt-3 rounded-2xl border border-line px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-piedra"><Users className="h-3.5 w-3.5 text-rosa" />Equipo</p>
      {/* One line per CV pack: the pack on the left, who builds it or the button on the right. */}
      <ul className="mt-1.5 divide-y divide-line">
        {rows.map((item) => {
          const task = tasks.find((row) => row.order_item_id === item.id)
          const draft = drafts.find((row) => row.order_item_id === item.id)
          const member = task ? (Array.isArray(task.team_members) ? task.team_members[0] : task.team_members) : null
          // Same pack twice: number them so each line is clear.
          const twins = packs.filter((other) => other.product_name === item.product_name)
          const label = twins.length > 1 ? `${item.product_name} (${twins.indexOf(item) + 1})` : item.product_name
          return (
            <li key={item.id} className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 text-sm">
              <span className="font-semibold text-ink">{label}</span>
              {task ? (
                <span className="flex items-center gap-2 text-xs text-piedra">
                  {member?.name ?? 'Equipo'}
                  <span className={`rounded-full px-2 py-0.5 font-display text-[11px] font-bold ${TASK_STATUS[task.status].tone}`}>{TASK_STATUS[task.status].label}</span>
                  {/* The texts he got, to check the finished CV against them. */}
                  <button type="button" onClick={() => setViewing(task.id)} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-3 font-display text-xs font-bold text-ciruela hover:bg-papel"><FileText className="h-3.5 w-3.5 text-rosa" />Ver textos</button>
                </span>
              ) : (
                <span className="flex flex-wrap items-center justify-end gap-1.5">
                  {/* Claude's texts: ask for them, see where they are, or fix the material. */}
                  <button type="button" onClick={() => setDrafting(item)} className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 font-display text-xs font-bold ${draft ? DRAFT_STATE[draft.status].tone : 'border border-line text-ciruela hover:bg-papel'}`} title={draft?.status === 'error' ? draft.error ?? undefined : undefined}>
                    {draft ? DRAFT_STATE[draft.status].label : <><Sparkles className="h-3.5 w-3.5 text-rosa" />Textos con Claude</>}
                  </button>
                  <button type="button" onClick={() => setAssigning(item)} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-rosa/40 px-3 font-display text-xs font-bold text-rosa-deep hover:bg-petalo-wash">
                    Asignar
                  </button>
                </span>
              )}
              {/* When he started it, and a reset in case it was a mistaken tap. */}
              {task?.started_at && task.status !== 'asignado' && <span className="basis-full"><TaskStart task={{ ...task, order_number: order.number }} onChanged={onChanged} /></span>}
            </li>
          )
        })}
      </ul>
      {assigning && <AssignDialog order={order} item={assigning} firstName={firstName} onClose={close} onSaved={onChanged} />}
      {viewing && <SentTexts taskId={viewing} order={order} firstName={firstName} onClose={closeViewing} />}
      {drafting && <DraftDialog order={order} item={drafting} firstName={firstName} status={drafts.find((row) => row.order_item_id === drafting.id)?.status} onClose={closeDraft} onSaved={onChanged} onApprove={() => { setAssigning(drafting); setDrafting(null) }} />}
    </div>
  )
}
