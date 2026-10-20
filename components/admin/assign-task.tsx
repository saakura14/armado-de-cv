'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Sparkles, Upload, Users, X } from 'lucide-react'
import { deliveryDeadline, hasExpress } from '@/lib/dashboard'
import { isDayOff } from '@/lib/holidays'
import type { Order, OrderItem } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { ATS_ONLY_PACKS, PACKS_WITH_LETTER, TASK_STATUS, TEAM_PACKS, type TaskStatus, type TeamMember } from '@/lib/team'
import { TaskStart } from './task-start'
import { Button, Field, inputClass, useFlash } from './ui'

export type OrderTask = { id: string; order_item_id: string; status: TaskStatus; started_at: string | null; team_members: { name: string } | { name: string }[] | null }
/** "Textos con Claude": where each pack's texts are (the scheduled task on Vale's computer writes them). */
export type DraftState = { order_item_id: string; status: 'pedido' | 'generando' | 'listo' | 'error'; error: string | null }
type Draft = { source_text: string; target_job: string | null; files: string[]; has_letter: boolean; status: DraftState['status']; cv_modern: string | null; cv_ats: string | null; letter: string | null; error: string | null }

const DRAFT_STATE: Record<DraftState['status'], { label: string; tone: string }> = {
  pedido: { label: '✨ Claude en cola', tone: 'bg-papel text-piedra' },
  generando: { label: '✨ Claude escribiendo…', tone: 'bg-petalo-wash text-rosa-deep' },
  listo: { label: '✨ Textos listos', tone: 'bg-whatsapp/15 text-whatsapp' },
  error: { label: '⚠️ Revisar textos', tone: 'bg-petalo-wash text-rosa-deep' },
}
const fileLabel = (path: string) => path.split('/').pop()!.replace(/^\d+-/, '')

const DAY = 24 * 60 * 60 * 1000
/** The order's delivery deadline minus one business day, so Vale has time to check it (never before today). */
function suggestedDue(order: Order) {
  const deadline = deliveryDeadline(order)
  const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (!deadline) return ''
  let day = new Date(deadline.due.getTime() - DAY)
  while (isDayOff(day)) day = new Date(day.getTime() - DAY)
  const value = day.toISOString().slice(0, 10)
  return value < today ? today : value
}

/** The texts Vale used to send by WhatsApp, now saved as a task for the team member. */
function AssignDialog({ order, item, firstName, onClose, onSaved }: { order: Order; item: OrderItem; firstName: string; onClose: () => void; onSaved: () => void }) {
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
    onSaved()
    onClose()
  }

  const ready = memberId && (atsOnly || modern.trim()) && ats.trim()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="assign-title" onClick={onClose}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
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
 * The client's material for Claude: the base CV (pasted, or as PDF / photos), the form answers, the target job and
 * anything the client asked for. "Pedir textos a Claude" leaves it in the queue; the task on her computer writes them.
 */
function DraftDialog({ order, item, firstName, onClose, onSaved }: { order: Order; item: OrderItem; firstName: string; onClose: () => void; onSaved: () => void }) {
  const atsOnly = ATS_ONLY_PACKS.includes(item.product_id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [hasLetter, setHasLetter] = useState(PACKS_WITH_LETTER.includes(item.product_id))
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  useEffect(() => {
    supabase.from('cv_drafts').select('source_text, target_job, files, has_letter, status, cv_modern, cv_ats, letter, error').eq('order_item_id', item.id).maybeSingle().then(({ data }) => {
      const row = data as Draft | null
      if (row) { setDraft(row); setSource(row.source_text); setTarget(row.target_job ?? ''); setFiles(row.files ?? []); setHasLetter(row.has_letter) }
      setLoaded(true)
    })
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [item.id, onClose])

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
    setFiles((current) => current.filter((row) => row !== path))
    // Keep the saved draft in step, so a removed file isn't sent to Claude.
    if (draft) await supabase.from('cv_drafts').update({ files: files.filter((row) => row !== path) }).eq('order_item_id', item.id)
  }

  async function request() {
    setBusy(true)
    const { error } = await supabase.from('cv_drafts').upsert({
      order_item_id: item.id, order_id: order.id, source_text: source.trim(), target_job: target.trim() || null, files,
      has_letter: !atsOnly && hasLetter, ats_only: atsOnly, status: 'pedido', error: null, requested_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved()
    onClose()
  }

  const working = draft?.status === 'pedido' || draft?.status === 'generando'
  const ready = (source.trim() || files.length) && !busy
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="draft-title" onClick={onClose}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="draft-title" className="flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="h-5 w-5" />Textos con Claude</p>
            <p className="text-sm text-white/85">Pedido #{order.number} · {item.product_name} de {firstName}. {atsOnly ? 'Lleva solo el CV ATS.' : `CV moderno + CV ATS${hasLetter ? ' + carta' : ''}.`}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {draft?.status === 'listo' && <p className="rounded-2xl bg-whatsapp/10 px-4 py-3 text-sm text-ink"><b>Ya están listos.</b> Tocá <b>Asignar</b> en la placa y vienen cargados para que los revises. Si cambiás el material, podés pedirlos de nuevo.</p>}
          {working && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep"><b>Claude ya lo tiene en la cola.</b> Revisa cada 30 minutos mientras tu compu está prendida con la app de Claude abierta. Te aviso al celular cuando estén.</p>}
          {draft?.status === 'error' && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep"><b>No se pudieron generar:</b> {draft.error ?? 'probá de nuevo.'}</p>}
          <Field label="CV base, respuestas del formulario o lo que quieras pasarle">
            <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={10} placeholder="Pegá el CV que te mandó, las respuestas del formulario, lo que te contó por WhatsApp…" className={inputClass} />
          </Field>
          <div>
            <p className="text-sm font-semibold text-ink">Archivos (PDF o fotos del CV)</p>
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
              <input type="file" multiple accept="application/pdf,image/*" className="sr-only" onChange={(event) => { upload(event.target.files); event.target.value = '' }} />
            </label>
            <p className="mt-1 text-xs text-piedra">Si es un Word, abrilo y pegá el texto arriba.</p>
          </div>
          <Field label="Puesto objetivo y lo que pidió el cliente">
            <textarea value={target} onChange={(event) => setTarget(event.target.value)} rows={3} placeholder="Ej.: Operario de producción. Quiere destacar el manejo de autoelevador. Zona norte." className={inputClass} />
          </Field>
          {!atsOnly && <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={hasLetter} onChange={(event) => setHasLetter(event.target.checked)} className="accent-rosa" />Lleva carta de presentación</label>}
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          <Button className="w-full" busy={busy || !loaded} disabled={!ready} onClick={request}><Sparkles className="h-4 w-4" />{draft ? 'Pedir los textos de nuevo' : 'Pedir textos a Claude'}</Button>
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
      {drafting && <DraftDialog order={order} item={drafting} firstName={firstName} onClose={closeDraft} onSaved={onChanged} />}
    </div>
  )
}
