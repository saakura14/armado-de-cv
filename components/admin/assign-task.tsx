'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, X } from 'lucide-react'
import { deliveryDeadline } from '@/lib/dashboard'
import type { Order, OrderItem } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { PACKS_WITH_LETTER, TASK_STATUS, TEAM_PACKS, type TaskStatus, type TeamMember } from '@/lib/team'
import { Button, Field, inputClass, useFlash } from './ui'

export type OrderTask = { id: string; order_item_id: string; status: TaskStatus; team_members: { name: string } | { name: string }[] | null }

const DAY = 24 * 60 * 60 * 1000
/** The order's delivery deadline minus one business day, so Vale has time to check it (never before today). */
function suggestedDue(order: Order) {
  const deadline = deliveryDeadline(order)
  const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (!deadline) return ''
  let day = new Date(deadline.due.getTime() - DAY)
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day = new Date(day.getTime() - DAY)
  const value = day.toISOString().slice(0, 10)
  return value < today ? today : value
}

/** The texts Vale used to send by WhatsApp, now saved as a task for the team member. */
function AssignDialog({ order, item, firstName, onClose, onSaved }: { order: Order; item: OrderItem; firstName: string; onClose: () => void; onSaved: () => void }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [memberId, setMemberId] = useState('')
  const [modern, setModern] = useState('')
  const [ats, setAts] = useState('')
  const [hasLetter, setHasLetter] = useState(PACKS_WITH_LETTER.includes(item.product_id))
  const [letter, setLetter] = useState('')
  const [notes, setNotes] = useState('')
  const [due, setDue] = useState(() => suggestedDue(order))
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  useEffect(() => {
    supabase.from('team_members').select('*').eq('active', true).order('created_at').then(({ data }) => {
      const list = (data as TeamMember[] | null) ?? []
      setMembers(list)
      setMemberId((current) => current || list[0]?.id || '')
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
      cv_modern: modern.trim(), cv_ats: ats.trim(), has_letter: hasLetter, letter: hasLetter ? letter.trim() || null : null,
      notes: notes.trim() || null, due_on: due || null, rate: member.rate,
    }).select('id').single()
    setBusy(false)
    if (error) { flash.show('error', /duplicate|unique/i.test(error.message) ? 'Este pack ya está asignado.' : errorMessage(error)); return }
    // The member gets a notification on their phone. The order moves to "En proceso" in the database (team_task_starts_order).
    supabase.functions.invoke('notify-admin', { body: { task_id: (data as { id: string }).id, kind: 'task_assigned' } }).then(() => undefined, () => undefined)
    onSaved()
    onClose()
  }

  const ready = memberId && modern.trim() && ats.trim()
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
          <Field label="Texto del CV moderno"><textarea value={modern} onChange={(event) => setModern(event.target.value)} rows={7} placeholder="Pegá el texto tal cual se lo mandabas por WhatsApp" className={inputClass} /></Field>
          <Field label="Texto del CV ATS"><textarea value={ats} onChange={(event) => setAts(event.target.value)} rows={7} className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={hasLetter} onChange={(event) => setHasLetter(event.target.checked)} className="accent-rosa" />Lleva carta de presentación</label>
          {hasLetter && <Field label="Texto de la carta (opcional)"><textarea value={letter} onChange={(event) => setLetter(event.target.value)} rows={5} className={inputClass} /></Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Para cuándo"><input type="date" value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} /></Field>
            <Field label="Notas (colores, foto, rubro…)"><input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>
          </div>
          {due && <p className="-mt-2 text-xs text-piedra">Sugerido: un día hábil antes de tu vencimiento, para que llegues a revisarlo.</p>}
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          <Button className="w-full" busy={busy} disabled={!ready} onClick={save}>Asignar y avisarle</Button>
        </div>
      </div>
    </div>
  )
}

/** On a CV order: each pack with who is building it, or a button to assign it. */
export function TeamRow({ order, tasks, firstName, onChanged }: { order: Order; tasks: OrderTask[]; firstName: string; onChanged: () => void }) {
  const [assigning, setAssigning] = useState<OrderItem | null>(null)
  const close = useCallback(() => setAssigning(null), [])
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
                <button type="button" onClick={() => setAssigning(item)} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-rosa/40 px-3 font-display text-xs font-bold text-rosa-deep hover:bg-petalo-wash">
                  Asignar
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {assigning && <AssignDialog order={order} item={assigning} firstName={firstName} onClose={close} onSaved={onChanged} />}
    </div>
  )
}
