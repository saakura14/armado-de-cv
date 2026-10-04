'use client'

import { useState } from 'react'
import { CalendarClock, CheckCircle2, ListTodo, Wallet } from 'lucide-react'
import { TeamTaskCard } from '@/components/team-task-card'
import { Button, cardClass, inputClass, useFlash } from '@/components/admin/ui'
import { formatARS } from '@/lib/catalog'
import { monthKey } from '@/lib/dashboard'
import { formatDate } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { batchStats, monthlyStats, sortTasks, type TeamMember, type TeamPayment, type TeamTask } from '@/lib/team'

export function TeamLogo() {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/isotipo.svg" alt="" className="h-9 w-9" />
      <span className="leading-none">
        <span className="block font-script text-2xl text-rosa">Armado de CV</span>
        <span className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-piedra">Equipo</span>
      </span>
    </span>
  )
}

/** "Empecé" and "Terminé" for one task (the pack counts for the payment when it is finished). In the preview they do nothing. */
function TaskActions({ task, preview, onChanged }: { task: TeamTask; preview?: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const flash = useFlash()

  async function move(status: 'haciendo' | 'terminado') {
    if (preview) { flash.show('ok', 'Es la vista previa: acá él lo marca y a vos te llega el aviso.'); return }
    if (status === 'terminado' && !window.confirm(`¿Terminaste el ${task.pack_name} de ${task.client_name} (pedido #${task.order_number})? Ya no lo vas a poder volver atrás.`)) return
    setBusy(true)
    const { error } = await supabase.rpc('team_set_task_status', { p_task: task.id, p_status: status, p_design_url: link.trim() || null })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    // Vale gets a notification when a CV is finished.
    if (status === 'terminado') supabase.functions.invoke('notify-admin', { body: { task_id: task.id, kind: 'task_done' } }).then(() => undefined, () => undefined)
    onChanged()
  }

  if (task.status === 'terminado') return <p className="text-xs text-whatsapp">✓ Terminado el {formatDate(task.finished_at!, true)} · {task.paid_in ? 'cobrado' : 'a cobrar'}</p>
  return (
    <div className="space-y-2">
      {task.status === 'haciendo' && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-piedra">Link del diseño en Canva (opcional)
          <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://www.canva.com/design/..." className={inputClass} />
        </label>
      )}
      {task.status === 'asignado'
        ? <Button className="w-full" busy={busy} onClick={() => move('haciendo')}>Empecé</Button>
        : <Button variant="success" className="w-full" busy={busy} onClick={() => move('terminado')}>Terminé este CV</Button>}
      {flash.node}
    </div>
  )
}

/** What a CV looks like before there is a real one (only in Vale's preview). */
export const EXAMPLE_TASK: TeamTask = {
  id: 'ejemplo', member_id: '', order_id: '', order_item_id: '', order_number: 0, client_name: 'Martina', pack_name: 'Pack CV Premium',
  cv_modern: 'MARTINA LÓPEZ\nAnalista de Recursos Humanos\n\nPERFIL\n(acá va el texto del CV moderno que le pasás, tal cual)',
  cv_ats: 'MARTINA LÓPEZ\nAnalista de Recursos Humanos\n\n(acá va el texto del CV ATS)',
  has_letter: true, letter: 'Estimado equipo de selección:\n(acá va la carta)', notes: 'Diseño en tonos verdes, con foto.',
  due_on: null, status: 'asignado', rate: 7000, assigned_at: new Date().toISOString(), started_at: null, finished_at: null, design_url: null, paid_in: null,
}

/**
 * The team member's screen. It is the same in their app and in Vale's "Ver como él" preview (with `preview`, buttons don't save).
 * It adapts to the width of its box, not the window, so the preview shows exactly the phone or tablet layout.
 */
export function TeamView({ member, tasks, payments, preview, headerRight, setup, onChanged }: {
  member: TeamMember; tasks: TeamTask[]; payments: TeamPayment[]; preview?: boolean
  headerRight?: React.ReactNode; setup?: React.ReactNode; onChanged: () => void
}) {
  const [view, setView] = useState<'pendientes' | 'terminados'>('pendientes')
  const { pending, finished } = sortTasks(tasks)
  const batch = batchStats(member, tasks, payments)
  const months = monthlyStats(tasks, payments)
  const thisMonth = months.find((row) => row.key === monthKey(new Date()))
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)
  const urgent = pending.filter((task) => task.due_on && task.due_on <= today).length
  // In the preview, an example card shows how a new CV arrives.
  const shownPending = preview && pending.length === 0 ? [EXAMPLE_TASK] : pending
  const list = view === 'pendientes' ? shownPending : finished.slice(0, 30)

  const stats = [
    { icon: ListTodo, label: 'Para hacer', value: String(pending.length), strong: true },
    { icon: CalendarClock, label: 'Para hoy', value: String(urgent) },
    { icon: CheckCircle2, label: 'Este mes', value: String(thisMonth?.packs ?? 0) },
    { icon: Wallet, label: 'A cobrar', value: formatARS(batch.owed) },
  ]

  return (
    <div className="@container min-h-full bg-arena/40">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-blanco/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 @3xl:px-6">
          <TeamLogo />
          <div className="flex items-center gap-3">{headerRight}</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 @3xl:px-6 @3xl:py-6">
        <div>
          <h1 className="font-script text-4xl leading-none text-rosa">¡Hola, {member.name.split(' ')[0]}!</h1>
          <p className="mt-1 text-sm text-piedra">{pending.length ? `Tenés ${pending.length} ${pending.length === 1 ? 'CV para armar' : 'CVs para armar'}${urgent ? `, ${urgent} para hoy o atrasados` : ''}.` : 'No tenés CVs pendientes. ¡Todo al día!'}</p>
        </div>

        {/* The numbers in one compact strip: two per row on a phone, four in a row from a small tablet. */}
        <div className="grid grid-cols-2 overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)] @lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, strong }, index) => (
            <div key={label} className={`px-4 py-3 ${strong ? 'bg-rosa text-white' : ''} ${index % 2 ? 'border-l border-line' : ''} ${index > 1 ? 'border-t border-line @lg:border-t-0' : ''} ${index === 2 ? '@lg:border-l' : ''}`}>
              <p className={`flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider ${strong ? 'text-white/85' : 'text-piedra'}`}><Icon className="h-3.5 w-3.5" />{label}</p>
              <p className={`mt-0.5 font-display text-2xl font-extrabold ${strong ? '' : 'text-ciruela'}`}>{value}</p>
            </div>
          ))}
        </div>

        {setup}

        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @3xl:items-start">
          <section className="min-w-0">
            <div role="tablist" className="inline-flex rounded-full bg-white p-1 shadow-sm">
              {(['pendientes', 'terminados'] as const).map((id) => (
                <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`rounded-full px-4 py-1.5 font-display text-sm font-bold transition-colors ${view === id ? 'bg-ciruela text-white' : 'text-piedra hover:text-ciruela'}`}>
                  {id === 'pendientes' ? `Para hacer (${pending.length})` : `Terminados (${finished.length})`}
                </button>
              ))}
            </div>
            {preview && view === 'pendientes' && pending.length === 0 && <p className="mt-3 text-xs font-semibold text-rosa-deep">Ejemplo: así le llega un CV cuando se lo asignás (no es un pedido real).</p>}
            {list.length === 0
              ? <p className="mt-3 rounded-3xl bg-white p-8 text-center text-piedra">{view === 'pendientes' ? 'No tenés CVs para armar. Cuando Vale te pase uno, te aparece acá y te llega un aviso.' : 'Todavía no terminaste ningún CV.'}</p>
              : <ul className="mt-3 grid gap-3 @6xl:grid-cols-2">{list.map((task) => <TeamTaskCard key={task.id} task={task} actions={<TaskActions task={task} preview={preview} onChanged={onChanged} />} />)}</ul>}
          </section>

          {/* Money and history: beside the CVs on a tablet, under them on a phone. */}
          <aside className="space-y-4 @3xl:sticky @3xl:top-20">
            <section className={cardClass} aria-labelledby="batch-title">
              <h2 id="batch-title" className="font-display text-base font-bold text-ciruela">Tu próximo cobro</h2>
              <p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{batch.count}<span className="text-base text-piedra"> de {batch.size} CVs</span></p>
              <div className="mt-2 h-2 rounded-full bg-papel"><div className={`h-2 rounded-full ${batch.count >= batch.size ? 'bg-whatsapp' : 'bg-rosa'}`} style={{ width: `${Math.min(batch.count / batch.size, 1) * 100}%` }} /></div>
              <p className="mt-2 text-xs leading-snug text-piedra">{batch.count} {batch.count === 1 ? 'CV' : 'CVs'} × {formatARS(member.rate)}{batch.advances ? ` − ${formatARS(batch.advances)} de adelanto` : ''} = <b className="text-ink">{formatARS(batch.owed)}</b></p>
            </section>

            <section className={cardClass} aria-labelledby="months-title">
              <h2 id="months-title" className="font-display text-base font-bold text-ciruela">Mes a mes</h2>
              {months.length === 0 ? <p className="mt-1 text-sm text-piedra">Acá vas a ver cuántos CVs hiciste y lo que cobraste cada mes.</p> : (
                <table className="mt-2 w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-piedra"><th className="pb-1.5 font-semibold">Mes</th><th className="pb-1.5 text-right font-semibold">CVs</th><th className="pb-1.5 text-right font-semibold">Cobrado</th></tr></thead>
                  <tbody>{months.map((row) => <tr key={row.key} className="border-t border-line"><td className="py-1.5 font-semibold text-ink">{row.label}</td><td className="py-1.5 text-right">{row.packs}</td><td className="py-1.5 text-right">{formatARS(row.paid)}</td></tr>)}</tbody>
                </table>
              )}
            </section>

            {payments.length > 0 && (
              <section className={cardClass} aria-labelledby="payments-title">
                <h2 id="payments-title" className="font-display text-base font-bold text-ciruela">Tus cobros</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {payments.slice(0, 8).map((payment) => (
                    <li key={payment.id} className="flex items-baseline justify-between gap-2 border-t border-line pt-2 first:border-0 first:pt-0">
                      <span><b className="text-ink">{payment.kind === 'pago' ? 'Pago' : 'Adelanto'}</b> · {formatDate(`${payment.paid_on}T12:00:00-03:00`)}</span>
                      <span className="font-display font-bold text-ciruela">{formatARS(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
