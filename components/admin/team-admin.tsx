'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { TeamTaskCard } from '@/components/team-task-card'
import { formatARS } from '@/lib/catalog'
import { useHideMoney } from '@/lib/hide-money'
import { formatDate } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { TASK_SELECT, batchStats, monthlyStats, sortTasks, type TeamMember, type TeamPayment, type TeamTask } from '@/lib/team'
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
        <div className="flex flex-wrap gap-2">
          <Button variant="success" disabled={batch.count === 0} onClick={() => open('pago')}>Le pagué</Button>
          <Button variant="secondary" onClick={() => open('adelanto')}>Le di un adelanto</Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-papel p-4">
          <p className="font-display text-sm font-bold text-ciruela">{kind === 'pago' ? 'Registrar pago' : 'Registrar adelanto'}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {kind === 'pago' && <Field label={`CVs que pagás (de ${batch.count})`}><input inputMode="numeric" value={packs} onChange={(event) => changePacks(event.target.value)} className={inputClass} /></Field>}
            <Field label="Monto"><input inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '')); setAmountTouched(true) }} className={inputClass} /></Field>
            <Field label="Nota (opcional)"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej: transferencia" className={inputClass} /></Field>
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
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save(active = member.active) {
    if (!active && !window.confirm(`¿Quitarle el acceso a ${member.name}? No va a poder entrar a /equipo. Sus CVs y pagos quedan guardados.`)) return
    setBusy(true)
    const { error } = await supabase.from('team_members').update({ rate: Number(rate), batch_size: Number(size), active }).eq('id', member.id)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', 'Guardado.')
    onSaved()
  }
  return (
    <details className="rounded-2xl bg-papel/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-piedra">Configuración de {member.name}</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Pago por pack de CV"><input inputMode="numeric" value={rate} onChange={(event) => setRate(event.target.value.replace(/\D/g, ''))} className={inputClass} /></Field>
        <Field label="Packs por cobro"><input inputMode="numeric" value={size} onChange={(event) => setSize(event.target.value.replace(/\D/g, ''))} className={inputClass} /></Field>
      </div>
      <p className="mt-2 text-xs text-piedra">Gmail: {member.email}{member.user_id ? ' · ya entró' : ' · todavía no entró'}. Un cambio de precio cuenta para los CVs que asignes de ahora en más.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" busy={busy} disabled={!(Number(size) > 0)} onClick={() => save()}>Guardar</Button>
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
  async function unassign() {
    if (!window.confirm(`¿Sacarle el CV del pedido #${task.order_number}? Lo vas a poder asignar de nuevo desde Pedidos.`)) return
    const { error } = await supabase.from('team_tasks').delete().eq('id', task.id)
    if (error) flash.show('error', errorMessage(error)); else onChanged()
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {task.status === 'terminado'
        ? <><span className="text-whatsapp">✓ Terminado el {formatDate(task.finished_at!, true)}{task.paid_in ? ' · pagado' : ' · a pagar'}</span>{!task.paid_in && <button type="button" onClick={reopen} className="font-semibold text-piedra hover:text-ciruela">Volver a pendiente</button>}</>
        : <button type="button" onClick={unassign} className="inline-flex items-center gap-1 font-semibold text-rosa-deep hover:underline"><Trash2 className="h-3.5 w-3.5" />Sacar la asignación</button>}
      {flash.node}
    </div>
  )
}

export function TeamAdmin() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [tasks, setTasks] = useState<TeamTask[]>([])
  const [payments, setPayments] = useState<TeamPayment[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'pendientes' | 'terminados'>('pendientes')
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
    setMembers((m.data as TeamMember[]) ?? [])
    setTasks((t.data as TeamTask[]) ?? [])
    setPayments((p.data as TeamPayment[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    let timer: number | undefined
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(load, 600) }
    const channel = supabase.channel('admin-team').on('postgres_changes', { event: '*', schema: 'public', table: 'team_tasks' }, soon).subscribe()
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel) }
  }, [load])

  const member = members.find((item) => item.id === selected) ?? members.find((item) => item.active) ?? members[0]
  const own = member ? tasks.filter((task) => task.member_id === member.id) : []
  const ownPayments = member ? payments.filter((payment) => payment.member_id === member.id) : []
  const { pending, finished } = sortTasks(own)
  const batch = member ? batchStats(member, own, ownPayments) : null
  const months = monthlyStats(own, ownPayments)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {members.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`rounded-full px-4 py-2 font-display text-sm font-bold ${member?.id === item.id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'} ${item.active ? '' : 'opacity-60'}`}>{item.name}{item.active ? '' : ' (sin acceso)'}</button>
        ))}
        <button type="button" onClick={load} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 font-display text-sm font-bold text-piedra hover:text-ciruela"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
      </div>
      {error && <p className="text-sm text-rosa-deep">{error}</p>}

      {member && batch && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-3xl bg-rosa p-4 text-white"><p className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/85">Pendientes</p><p className="mt-1 font-display text-3xl font-extrabold">{pending.length}</p></div>
            <div className="rounded-3xl bg-white p-4">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Tanda actual</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{batch.count}<span className="text-base text-piedra"> de {batch.size}</span></p>
              <div className="mt-2 h-2 rounded-full bg-papel"><div className={`h-2 rounded-full ${batch.count >= batch.size ? 'bg-whatsapp' : 'bg-rosa'}`} style={{ width: `${Math.min(batch.count / batch.size, 1) * 100}%` }} /></div>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Le debés</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{money(batch.owed)}</p>
              <p className="mt-1 text-[11px] text-piedra">{batch.advances ? `Ya le adelantaste ${money(batch.advances)}` : batch.lastPayment ? `Último pago: ${formatDate(`${batch.lastPayment.paid_on}T12:00:00-03:00`)}` : 'Todavía no le pagaste'}</p>
            </div>
            <div className="rounded-3xl bg-white p-4"><p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Terminados (total)</p><p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{finished.length}</p></div>
          </div>
          {batch.count >= batch.size && <p className="rounded-2xl bg-whatsapp/15 px-4 py-3 text-sm font-semibold text-whatsapp">{member.name} completó la tanda de {batch.size} CVs: te toca pagarle {money(batch.owed)}.</p>}
          <PaymentForm key={member.id} member={member} batch={batch} onSaved={load} />

          <section>
            <div role="tablist" className="flex gap-2">
              {(['pendientes', 'terminados'] as const).map((id) => (
                <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`rounded-full px-4 py-2 font-display text-sm font-bold ${view === id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>
                  {id === 'pendientes' ? `Para hacer (${pending.length})` : `Terminados (${finished.length})`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-piedra">Para asignarle un CV, entrá al pedido en Pedidos y tocá &quot;Asignar al equipo&quot;.</p>
            {(view === 'pendientes' ? pending : finished.slice(0, 40)).length === 0
              ? <p className="mt-4 rounded-3xl bg-white p-8 text-center text-piedra">{view === 'pendientes' ? 'No tiene CVs pendientes.' : 'Todavía no terminó ningún CV.'}</p>
              : <ul className="mt-4 grid gap-3 lg:grid-cols-2">{(view === 'pendientes' ? pending : finished.slice(0, 40)).map((task) => <TeamTaskCard key={task.id} task={task} actions={<TaskTools task={task} onChanged={load} />} />)}</ul>}
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={cardClass}>
              <h2 className="font-display text-lg font-bold text-ciruela">Mes a mes</h2>
              {months.length === 0 ? <p className="mt-2 text-sm text-piedra">Todavía no hay CVs terminados ni pagos.</p> : (
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider text-piedra"><th className="pb-2 font-semibold">Mes</th><th className="pb-2 text-right font-semibold">CVs</th><th className="pb-2 text-right font-semibold">Generó</th><th className="pb-2 text-right font-semibold">Le pagaste</th></tr></thead>
                  <tbody>{months.map((row) => <tr key={row.key} className="border-t border-line"><td className="py-2 font-semibold text-ink">{row.label}</td><td className="py-2 text-right">{row.packs}</td><td className="py-2 text-right">{money(row.earned)}</td><td className="py-2 text-right">{money(row.paid)}</td></tr>)}</tbody>
                </table>
              )}
            </section>
            <section className={cardClass}>
              <h2 className="font-display text-lg font-bold text-ciruela">Pagos y adelantos</h2>
              {ownPayments.length === 0 ? <p className="mt-2 text-sm text-piedra">Todavía no registraste pagos.</p> : (
                <ul className="mt-3 space-y-2 text-sm">
                  {ownPayments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-2 first:border-0 first:pt-0">
                      <span><b className="text-ink">{payment.kind === 'pago' ? 'Pago' : 'Adelanto'}</b> · {formatDate(`${payment.paid_on}T12:00:00-03:00`)}{payment.note ? <span className="text-piedra"> · {payment.note}</span> : null}</span>
                      <span className="font-display font-bold text-ciruela">{money(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <MemberSettings key={member.id} member={member} onSaved={load} />
        </>
      )}

      <AddMember onSaved={load} />
    </div>
  )
}
