'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Eye, Loader2, MessageCircle, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'
import { TaskRow, TaskTexts } from '@/components/team-task-card'
import { openAdminChat, useTeamUnread } from '@/components/team-chat'
import { TeamView } from '@/components/team-view'
import { monthKey } from '@/lib/dashboard'
import { formatARS } from '@/lib/catalog'
import { useHideMoney } from '@/lib/hide-money'
import { formatDate } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { MIN_WORK_MINUTES, TASK_SELECT, TASK_STATUS, batchStats, formatMinutes, monthlyStats, sortTasks, timesByPack, todayWork, workMinutes, type TeamMember, type TeamPayment, type TeamTask } from '@/lib/team'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

/** Add someone to the team with the Gmail they sign in with. */
function AddMember({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('team_members').insert({ name: name.trim(), email: email.trim().toLowerCase() })
    setBusy(false)
    if (error) { flash.show('error', /duplicate|unique/i.test(error.message) ? 'Ese Gmail ya está en el equipo.' : errorMessage(error)); return }
    setName(''); setEmail('')
    flash.show('ok', 'Listo. Ya puede entrar en armadodecv.com/equipo con ese Gmail.')
    onSaved()
  }
  return (
    <form onSubmit={save} className={`${cardClass} space-y-3`}>
      <p className="flex items-center gap-2 font-display text-base font-bold text-ciruela"><UserPlus className="h-5 w-5 text-rosa" />Sumar al equipo</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre"><input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
        <Field label="Gmail con el que entra"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@gmail.com" className={inputClass} /></Field>
      </div>
      <p className="text-xs text-piedra">Entra en <b>armadodecv.com/equipo</b> con ese Gmail y solo ve los CVs que le asignás, sus números y sus cobros. No ve precios, contactos de clientes ni el resto del panel.</p>
      <Button busy={busy}>Agregar</Button>
      {flash.node}
    </form>
  )
}

/**
 * Register a payment or an advance. A payment covers the oldest finished CVs not paid yet (Vale picks how many,
 * 10 by default) and settles the advances; an advance is money ahead, discounted from what is owed.
 */
function PaymentForm({ member, batch, onSaved }: { member: TeamMember; batch: ReturnType<typeof batchStats>; onSaved: () => void }) {
  const [kind, setKind] = useState<'pago' | 'adelanto' | null>(null)
  const [packs, setPacks] = useState('')
  const [amount, setAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  // What N packs add up to (each with the rate of the day it was assigned), minus the advances.
  const amountFor = (count: number) => Math.max(batch.unpaid.slice(0, count).reduce((sum, task) => sum + task.rate, 0) - batch.advances, 0)

  function open(next: 'pago' | 'adelanto') {
    setKind(next); setNote(''); setAmountTouched(false)
    const count = batch.count >= batch.size ? batch.size : batch.count
    setPacks(String(count))
    setAmount(next === 'pago' ? String(amountFor(count)) : '')
  }
  function changePacks(value: string) {
    const count = Math.min(Number(value.replace(/\D/g, '')) || 0, batch.count)
    setPacks(String(count))
    if (!amountTouched) setAmount(String(amountFor(count)))
  }
  async function save() {
    if (!kind) return
    if (kind === 'pago') {
      if (!window.confirm(`¿Registrar el pago de ${formatARS(Number(amount))} a ${member.name} por ${packs} ${packs === '1' ? 'CV' : 'CVs'}?${batch.advances ? ` Se descuentan los ${formatARS(batch.advances)} de adelanto.` : ''}`)) return
      setBusy(true)
      const { error } = await supabase.rpc('admin_team_pay', { p_member: member.id, p_packs: Number(packs), p_amount: Number(amount), p_note: note.trim() || null })
      setBusy(false)
      if (error) { flash.show('error', errorMessage(error)); return }
    } else {
      setBusy(true)
      const { error } = await supabase.from('team_payments').insert({ member_id: member.id, kind, amount: Number(amount), note: note.trim() || null })
      setBusy(false)
      if (error) { flash.show('error', errorMessage(error)); return }
    }
    setKind(null)
    flash.show('ok', kind === 'pago' ? `Pago registrado: ${packs} ${packs === '1' ? 'CV quedó pago' : 'CVs quedaron pagos'}.` : 'Adelanto registrado: se descuenta de lo que le debés.')
    onSaved()
  }

  return (
    <div>
      {!kind ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="success" disabled={batch.count === 0} onClick={() => open('pago')}>Le pagué</Button>
          <Button variant="secondary" onClick={() => open('adelanto')}>Adelanto</Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-papel p-3.5">
          <p className="font-display text-sm font-bold text-ciruela">{kind === 'pago' ? 'Registrar pago' : 'Registrar adelanto'}</p>
          <div className="grid grid-cols-2 gap-3">
            {kind === 'pago' && <Field label={`CVs que pagás (de ${batch.count})`}><input inputMode="numeric" value={packs} onChange={(event) => changePacks(event.target.value)} className={inputClass} /></Field>}
            <Field label="Monto"><input inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setAmountTouched(true) }} className={inputClass} /></Field>
            <div className={kind === 'pago' ? 'col-span-2' : ''}><Field label="Nota (opcional)"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej: transferencia" className={inputClass} /></Field></div>
          </div>
          {kind === 'pago' && <p className="text-xs text-piedra">Quedan pagos los {packs} CVs terminados más viejos{batch.advances ? ` y se descuentan los ${formatARS(batch.advances)} de adelanto` : ''}. Los que terminó después siguen sumando para el próximo cobro. Lo mensual no se borra.</p>}
          <div className="flex gap-2">
            <Button busy={busy} disabled={!(Number(amount) > 0) || (kind === 'pago' && !(Number(packs) > 0))} onClick={save}>Guardar</Button>
            <Button variant="secondary" onClick={() => setKind(null)}>Cancelar</Button>
          </div>
        </div>
      )}
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </div>
  )
}

/** Rate per pack and packs per payment, editable; changing the rate only affects CVs assigned from now on. */
function MemberSettings({ member, onSaved }: { member: TeamMember; onSaved: () => void }) {
  const [rate, setRate] = useState(String(member.rate))
  const [size, setSize] = useState(String(member.batch_size))
  const [email, setEmail] = useState(member.email)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save(active = member.active) {
    if (!active && !window.confirm(`¿Quitarle el acceso a ${member.name}? No va a poder entrar a /equipo. Sus CVs y pagos quedan guardados.`)) return
    setBusy(true)
    const newEmail = email.trim().toLowerCase()
    // A new Gmail unlinks the old account: the next sign-in with the new one links it again.
    const changes = newEmail !== member.email ? { email: newEmail, user_id: null } : {}
    const { error } = await supabase.from('team_members').update({ rate: Number(rate), batch_size: Number(size), active, ...changes }).eq('id', member.id)
    setBusy(false)
    if (error) { flash.show('error', /duplicate|unique/i.test(error.message) ? 'Ese Gmail ya está en el equipo.' : errorMessage(error)); return }
    flash.show('ok', 'Guardado.')
    onSaved()
  }
  return (
    <details className="rounded-2xl bg-papel/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-piedra">Configuración de {member.name}</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Gmail con el que entra"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field></div>
        <Field label="Pago por pack de CV"><input inputMode="numeric" value={rate} onChange={(event) => setRate(event.target.value.replace(/\D/g, ''))} className={inputClass} /></Field>
        <Field label="Packs por cobro"><input inputMode="numeric" value={size} onChange={(event) => setSize(event.target.value.replace(/\D/g, ''))} className={inputClass} /></Field>
      </div>
      <p className="mt-2 text-xs text-piedra">{member.user_id ? 'Ya entró con este Gmail.' : 'Todavía no entró con este Gmail.'} Un cambio de precio cuenta para los CVs que asignes de ahora en más.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" busy={busy} disabled={!(Number(size) > 0) || !/^\S+@\S+\.\S+$/.test(email.trim())} onClick={() => save()}>Guardar</Button>
        {member.active ? <Button variant="danger" onClick={() => save(false)}>Quitar acceso</Button> : <Button onClick={() => save(true)}>Volver a dar acceso</Button>}
      </div>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </details>
  )
}

/** Vale's tools on a task: reopen a finished one or take it back before it is done. */
function TaskTools({ task, onChanged }: { task: TeamTask; onChanged: () => void }) {
  const flash = useFlash()
  async function reopen() {
    if (!window.confirm(`¿Volver a pendiente el CV del pedido #${task.order_number}? Deja de contar para el pago hasta que lo termine de nuevo.`)) return
    const { error } = await supabase.from('team_tasks').update({ status: 'haciendo', finished_at: null }).eq('id', task.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }
  // For when the team member finished but couldn't mark it (it counts for the payment the same way).
  async function finish() {
    if (!window.confirm(`¿Marcar como terminado el CV del pedido #${task.order_number}? Suma para el pago de ${task.pack_name}.`)) return
    const now = new Date().toISOString()
    const { error } = await supabase.from('team_tasks').update({ status: 'terminado', started_at: task.started_at ?? now, finished_at: now }).eq('id', task.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }
  async function unassign() {
    if (!window.confirm(`¿Sacarle el CV del pedido #${task.order_number}? Lo vas a poder asignar de nuevo desde Pedidos.`)) return
    const { error } = await supabase.from('team_tasks').delete().eq('id', task.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {task.status === 'terminado'
        ? <><span className="text-whatsapp">✓ Terminado el {formatDate(task.finished_at!, true)}{task.paid_in ? ' · pagado' : ' · a pagar'}</span>{!task.paid_in && <button type="button" onClick={reopen} className="font-semibold text-piedra hover:text-ciruela">Volver a pendiente</button>}</>
        : <><button type="button" onClick={finish} className="inline-flex items-center gap-1 font-semibold text-whatsapp hover:underline"><Check className="h-3.5 w-3.5" />Marcar como terminado</button><button type="button" onClick={unassign} className="inline-flex items-center gap-1 font-semibold text-rosa-deep hover:underline"><Trash2 className="h-3.5 w-3.5" />Sacar la asignación</button></>}
      {flash.node}
    </div>
  )
}

const DEVICES = [
  { id: 'celu', label: 'Celu', width: 390 },
  { id: 'tablet', label: 'Tablet', width: 820 },
  { id: 'horizontal', label: 'Tablet acostada', width: 1180 },
] as const

/** "Ver como él": the team member's real screen with their data, at phone or tablet width. Buttons don't save anything. */
function TeamPreview({ member, tasks, payments, onClose }: { member: TeamMember; tasks: TeamTask[]; payments: TeamPayment[]; onClose: () => void }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('tablet')
  const width = DEVICES.find((item) => item.id === device)!.width
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ciruela/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-white">
        <p id="preview-title" className="flex items-center gap-2 font-display text-sm font-bold"><Eye className="h-4 w-4" />Así lo ve {member.name.split(' ')[0]}</p>
        <div className="hidden gap-1 rounded-full bg-white/15 p-1 sm:flex">
          {DEVICES.map((item) => (
            <button key={item.id} type="button" onClick={() => setDevice(item.id)} className={`rounded-full px-3 py-1 font-display text-xs font-bold ${device === item.id ? 'bg-white text-ciruela' : 'text-white/85 hover:text-white'}`}>{item.label}</button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="ml-auto rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2 sm:px-4 sm:pb-4">
        <div className="mx-auto h-full overflow-y-auto overscroll-contain rounded-[28px] bg-blanco shadow-2xl transition-[max-width] duration-300" style={{ maxWidth: width }}>
          <TeamView member={member} tasks={tasks} payments={payments} preview onChanged={() => undefined}
            headerRight={<span className="rounded-full bg-petalo-wash px-3 py-1 font-display text-[11px] font-bold text-rosa-deep">Vista previa</span>} />
        </div>
      </div>
    </div>
  )
}

export function TeamAdmin() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [tasks, setTasks] = useState<TeamTask[]>([])
  const [payments, setPayments] = useState<TeamPayment[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'pendientes' | 'terminados'>('pendientes')
  const [previewing, setPreviewing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { money } = useHideMoney()

  const load = useCallback(async () => {
    setLoading(true)
    const [m, t, p] = await Promise.all([
      supabase.from('team_members').select('*').order('created_at'),
      supabase.from('team_tasks').select(TASK_SELECT).order('assigned_at', { ascending: false }).limit(2000),
      supabase.from('team_payments').select('*').order('created_at', { ascending: false }),
    ])
    const failed = m.error ?? t.error ?? p.error
    setError(failed ? errorMessage(failed) : '')
    // A failed refresh keeps what was on screen instead of emptying it.
    if (!failed) {
      setMembers((m.data as TeamMember[]) ?? [])
      setTasks((t.data as TeamTask[]) ?? [])
      setPayments((p.data as TeamPayment[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    let timer: number | undefined
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(load, 600) }
    const channel = supabase.channel('admin-team')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_tasks' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_payments' }, soon)
      .subscribe()
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel) }
  }, [load])
  const closePreview = useCallback(() => setPreviewing(false), [])

  const member = members.find((item) => item.id === selected) ?? members.find((item) => item.active) ?? members[0]
  const unread = useTeamUnread(member?.id, 'admin')
  const own = member ? tasks.filter((task) => task.member_id === member.id) : []
  const ownPayments = member ? payments.filter((payment) => payment.member_id === member.id) : []
  const { pending, finished } = sortTasks(own)
  const batch = member ? batchStats(member, own, ownPayments) : null
  const months = monthlyStats(own, ownPayments)
  const packTimes = timesByPack(own)
  const todayDone = todayWork(own)
  const thisMonth = months.find((row) => row.key === monthKey(new Date()))
  const list = view === 'pendientes' ? pending : finished.slice(0, 40)

  if (loading && !members.length && !error) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {members.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`rounded-full px-4 py-2 font-display text-sm font-bold ${member?.id === item.id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'} ${item.active ? '' : 'opacity-60'}`}>{item.name}{item.active ? '' : ' (sin acceso)'}</button>
        ))}
        {member && <button type="button" onClick={() => setPreviewing(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rosa/40 bg-white px-4 font-display text-sm font-bold text-rosa-deep hover:bg-petalo-wash"><Eye className="h-4 w-4" />Ver como {member.name.split(' ')[0]}</button>}
        {member && (
          <button type="button" onClick={openAdminChat} className="relative inline-flex h-10 items-center gap-1.5 rounded-full bg-ciruela px-4 font-display text-sm font-bold text-white hover:bg-rosa">
            <MessageCircle className="h-4 w-4" />Mensajes
            {unread > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rosa px-1 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-blanco">{unread}</span>}
          </button>
        )}
        <button type="button" onClick={load} aria-label="Actualizar" className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3 font-display text-sm font-bold text-piedra hover:text-ciruela sm:px-4"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Actualizar</span></button>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

      {member && batch && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-4">
            {/* The numbers in one compact strip: two per row on the phone, four in a row from a tablet. */}
            <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-26px_rgba(67,32,44,0.6)] sm:grid-cols-4">
              {[
                { label: 'Para hacer', value: pending.length, strong: true },
                { label: 'Haciéndolos', value: pending.filter((task) => task.status === 'haciendo').length },
                { label: 'Este mes', value: thisMonth?.packs ?? 0 },
                { label: 'Total hechos', value: finished.length },
              ].map(({ label, value, strong }, index) => (
                <div key={label} className={`px-3.5 py-2.5 ${strong ? 'bg-rosa text-white' : ''} ${index % 2 ? 'border-l border-line' : ''} ${index > 1 ? 'border-t border-line sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l' : ''}`}>
                  <p className={`font-display text-[11px] font-semibold uppercase tracking-wider ${strong ? 'text-white/85' : 'text-piedra'}`}>{label}</p>
                  <p className={`font-display text-xl font-extrabold ${strong ? '' : 'text-ciruela'}`}>{value}</p>
                </div>
              ))}
            </div>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div role="tablist" className="inline-flex rounded-full bg-white p-1 shadow-sm">
                  {(['pendientes', 'terminados'] as const).map((id) => (
                    <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`rounded-full px-4 py-1.5 font-display text-sm font-bold transition-colors ${view === id ? 'bg-ciruela text-white' : 'text-piedra hover:text-ciruela'}`}>
                      {id === 'pendientes' ? `Para hacer (${pending.length})` : `Terminados (${finished.length})`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-piedra">Se asignan desde <b>Pedidos</b>, en la ficha, con &quot;Asignar&quot;.</p>
              </div>
              {list.length === 0
                ? <p className="mt-3 rounded-3xl bg-white px-6 py-8 text-center text-sm text-piedra">{view === 'pendientes' ? `${member.name.split(' ')[0]} no tiene CVs pendientes.` : 'Todavía no terminó ningún CV.'}</p>
                : (
                  // One line per CV with its state; tapping it unfolds the texts and the tools.
                  <ul className="mt-3 grid items-start gap-2 2xl:grid-cols-2">
                    {list.map((task) => (
                      <TaskRow key={task.id} task={task} action={<span className="flex shrink-0 flex-col items-end gap-1">{workMinutes(task) !== null && <span className="font-display text-[11px] font-bold text-ciruela">⏱ {formatMinutes(workMinutes(task)!)}</span>}<span className={`rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold ${TASK_STATUS[task.status].tone}`}>{TASK_STATUS[task.status].label}</span></span>}>
                        <div className="space-y-3">
                          {task.status !== 'terminado' ? <TaskTexts task={task} /> : task.design_url ? <a href={task.design_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-rosa-deep hover:underline">Ver el diseño en Canva</a> : null}
                          <TaskTools task={task} onChanged={load} />
                        </div>
                      </TaskRow>
                    ))}
                  </ul>
                )}
            </section>
          </div>

          {/* Money, history and settings: beside the CVs on the computer, under them on the phone. */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            <section className={cardClass} aria-labelledby="owed-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="owed-title" className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Le debés</h2>
                  <p className="font-display text-3xl font-extrabold text-ciruela">{money(batch.owed)}</p>
                </div>
                <p className="text-right font-display text-sm font-bold text-ciruela">{batch.count}<span className="font-normal text-piedra"> de {batch.size} CVs</span></p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-papel"><div className={`h-2 rounded-full ${batch.count >= batch.size ? 'bg-whatsapp' : 'bg-rosa'}`} style={{ width: `${Math.min(batch.count / batch.size, 1) * 100}%` }} /></div>
              <p className="mt-2 text-xs text-piedra">{batch.count >= batch.size ? <b className="text-whatsapp">Completó la tanda: te toca pagarle.</b> : batch.advances ? `Ya le adelantaste ${money(batch.advances)}.` : batch.lastPayment ? `Último pago: ${formatDate(`${batch.lastPayment.paid_on}T12:00:00-03:00`)}.` : 'Todavía no le pagaste.'}</p>
              <div className="mt-3"><PaymentForm key={`pay-${member.id}`} member={member} batch={batch} onSaved={load} /></div>
            </section>

            {/* Only Vale sees this: how long each pack takes (from "Empecé" to "Terminé"). */}
            {packTimes.length > 0 && (
              <section className={cardClass} aria-labelledby="times-title">
                <h2 id="times-title" className="font-display text-base font-bold text-ciruela">Tiempos</h2>
                <table className="mt-2 w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-piedra"><th className="pb-1.5 font-semibold">Pack</th><th className="pb-1.5 text-right font-semibold">CVs</th><th className="pb-1.5 text-right font-semibold">Promedio</th><th className="pb-1.5 text-right font-semibold">Mejor</th></tr></thead>
                  <tbody>{packTimes.map((row) => <tr key={row.pack} className="border-t border-line"><td className="py-1.5 font-semibold text-ink">{row.pack}</td><td className="py-1.5 text-right">{row.count}</td><td className="py-1.5 text-right">{formatMinutes(row.average)}</td><td className="py-1.5 text-right">{formatMinutes(row.best)}</td></tr>)}</tbody>
                </table>
                <p className="mt-2 text-xs text-piedra">Hoy: <b className="text-ink">{todayDone.count} {todayDone.count === 1 ? 'CV' : 'CVs'}</b>{todayDone.minutes ? ` en ${formatMinutes(todayDone.minutes)} de trabajo` : ''}. Se mide de &quot;Empecé&quot; a &quot;Terminé&quot;; menos de {MIN_WORK_MINUTES} min no cuenta (lo empezó sin tocar &quot;Empecé&quot;).</p>
              </section>
            )}
            <section className={cardClass} aria-labelledby="months-title">
              <h2 id="months-title" className="font-display text-base font-bold text-ciruela">Mes a mes</h2>
              {months.length === 0 ? <p className="mt-1 text-sm text-piedra">Todavía no hay CVs terminados ni pagos.</p> : (
                <table className="mt-2 w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-piedra"><th className="pb-1.5 font-semibold">Mes</th><th className="pb-1.5 text-right font-semibold">CVs</th><th className="pb-1.5 text-right font-semibold">Generó</th><th className="pb-1.5 text-right font-semibold">Pagado</th></tr></thead>
                  <tbody>{months.map((row) => <tr key={row.key} className="border-t border-line"><td className="py-1.5 font-semibold text-ink">{row.label}</td><td className="py-1.5 text-right">{row.packs}</td><td className="py-1.5 text-right">{money(row.earned)}</td><td className="py-1.5 text-right">{money(row.paid)}</td></tr>)}</tbody>
                </table>
              )}
            </section>

            {ownPayments.length > 0 && (
              <section className={cardClass} aria-labelledby="payments-title">
                <h2 id="payments-title" className="font-display text-base font-bold text-ciruela">Pagos y adelantos</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {ownPayments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-2 first:border-0 first:pt-0">
                      <span><b className="text-ink">{payment.kind === 'pago' ? `Pago${payment.packs ? ` · ${payment.packs} CVs` : ''}` : 'Adelanto'}</b> · {formatDate(`${payment.paid_on}T12:00:00-03:00`)}{payment.note ? <span className="text-piedra"> · {payment.note}</span> : null}</span>
                      <span className="font-display font-bold text-ciruela">{money(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <MemberSettings key={`settings-${member.id}`} member={member} onSaved={load} />
          </aside>
        </div>
      )}

      {members.length === 0 ? <AddMember onSaved={load} /> : (
        <details className="rounded-2xl bg-white/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-piedra">Sumar a alguien más al equipo</summary>
          <div className="mt-3"><AddMember onSaved={load} /></div>
        </details>
      )}

      {previewing && member && <TeamPreview member={member} tasks={own} payments={ownPayments} onClose={closePreview} />}
    </div>
  )
}
