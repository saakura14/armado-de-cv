'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellRing, Loader2, LogOut } from 'lucide-react'
import { AuthPanel } from '@/components/auth-panel'
import { TeamTaskCard } from '@/components/team-task-card'
import { Button, cardClass, inputClass, useFlash } from '@/components/admin/ui'
import { formatARS } from '@/lib/catalog'
import { formatDate } from '@/lib/orders'
import { enablePush, pushState, sendTestPush, syncPush, type PushState } from '@/lib/push'
import { errorMessage, supabase } from '@/lib/supabase'
import { TASK_SELECT, batchStats, monthlyStats, sortTasks, type TeamMember, type TeamPayment, type TeamTask } from '@/lib/team'
import { monthKey } from '@/lib/dashboard'
import { useSession } from '@/lib/use-session'

type Data = { member: TeamMember; tasks: TeamTask[]; payments: TeamPayment[] }

function Logo() {
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

/** "Empecé" and "Terminé" for one task (the pack counts for the payment when it is finished). */
function TaskActions({ task, onChanged }: { task: TeamTask; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const flash = useFlash()

  async function move(status: 'haciendo' | 'terminado') {
    if (status === 'terminado' && !window.confirm(`¿Terminaste el ${task.pack_name} de ${task.client_name} (pedido #${task.order_number})? Ya no lo vas a poder volver atrás.`)) return
    setBusy(true)
    const { error } = await supabase.rpc('team_set_task_status', { p_task: task.id, p_status: status, p_design_url: link.trim() || null })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    // Vale gets a notification when a CV is finished.
    if (status === 'terminado') supabase.functions.invoke('notify-admin', { body: { task_id: task.id, kind: 'task_done' } }).then(() => undefined, () => undefined)
    onChanged()
  }

  if (task.status === 'terminado') return <p className="text-xs text-whatsapp">✓ Terminado el {formatDate(task.finished_at!, true)}</p>
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

/** Notifications on this phone, so a new CV doesn't wait for the screen to be opened. */
function PushCard({ userId }: { userId: string }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  useEffect(() => { pushState().then(setState) }, [])
  useEffect(() => { syncPush(userId) }, [userId])
  if (state === null || state === 'unsupported') return null

  async function turnOn() {
    setBusy(true)
    try { await enablePush(userId); setState('on'); flash.show('ok', 'Listo: te aviso acá cuando tengas un CV nuevo.') } catch (error) { flash.show('error', errorMessage(error)) }
    setBusy(false)
  }
  async function test() {
    setBusy(true)
    try { const sent = await sendTestPush(); flash.show(sent ? 'ok' : 'error', sent ? 'Te mandé una notificación de prueba.' : 'No encontré tu celu: tocá "Activar" de nuevo.') } catch (error) { flash.show('error', errorMessage(error)) }
    setBusy(false)
  }
  return (
    <div className={`${cardClass} flex flex-wrap items-center gap-3`}>
      {state === 'on' ? <BellRing className="h-5 w-5 text-whatsapp" /> : <Bell className="h-5 w-5 text-rosa" />}
      <p className="flex-1 text-sm text-ink">{state === 'on' ? 'Las notificaciones están activadas en este dispositivo.' : state === 'denied' ? 'Bloqueaste las notificaciones: habilitalas en los ajustes del navegador.' : 'Activá las notificaciones para enterarte al toque cuando tengas un CV nuevo.'}</p>
      {state === 'on' ? <Button variant="secondary" busy={busy} onClick={test}>Probar</Button> : state !== 'denied' && <Button busy={busy} onClick={turnOn}>Activar</Button>}
      {flash.node && <div className="basis-full">{flash.node}</div>}
    </div>
  )
}

export default function TeamPage() {
  const { user, ready } = useSession()
  const [data, setData] = useState<Data | null | undefined>(undefined)
  const [view, setView] = useState<'pendientes' | 'terminados'>('pendientes')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    // Links the Google account the first time; null when this email isn't on the team.
    const { data: memberId, error: linkError } = await supabase.rpc('team_link_account')
    if (linkError) { setError(errorMessage(linkError)); return }
    if (!memberId) { setData(null); return }
    const [member, tasks, payments] = await Promise.all([
      supabase.from('team_members').select('*').eq('id', memberId).single(),
      supabase.from('team_tasks').select(TASK_SELECT).eq('member_id', memberId).order('assigned_at', { ascending: false }).limit(1000),
      supabase.from('team_payments').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    ])
    const failed = member.error ?? tasks.error ?? payments.error
    if (failed) { setError(errorMessage(failed)); return }
    setError('')
    setData({ member: member.data as TeamMember, tasks: (tasks.data as TeamTask[]) ?? [], payments: (payments.data as TeamPayment[]) ?? [] })
  }, [])

  useEffect(() => { if (user) load() }, [user, load])

  // New tasks and payments show up without reloading.
  useEffect(() => {
    if (!user) return
    let timer: number | undefined
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(load, 600) }
    const channel = supabase.channel('team-screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_tasks' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_payments' }, soon)
      .subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') soon() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible) }
  }, [user, load])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.replace('/equipo')
  }

  if (!ready || (user && data === undefined && !error)) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="min-h-[80vh] bg-arena/40 px-4 py-16"><div className="mb-8 flex justify-center"><Logo /></div><AuthPanel title="Equipo" text="Entrá con la cuenta de Google que te pasó Vale." /></section>
  if (!data) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-script text-5xl text-rosa">Sin acceso</p>
        <p className="mt-3 text-piedra">{error || <>La cuenta <b className="text-ink">{user.email}</b> no está en el equipo. Pedile a Vale que la agregue y volvé a entrar.</>}</p>
        <button type="button" onClick={signOut} className="mt-6 font-semibold text-rosa-deep underline">Entrar con otra cuenta</button>
      </section>
    )
  }

  const { member, tasks, payments } = data
  const { pending, finished } = sortTasks(tasks)
  const batch = batchStats(member, tasks, payments)
  const months = monthlyStats(tasks, payments)
  const thisMonth = months.find((row) => row.key === monthKey(new Date()))
  const urgent = pending.filter((task) => task.due_on && task.due_on <= new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)).length

  return (
    <div className="min-h-dvh bg-arena/40">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-blanco/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-ciruela"><LogOut className="h-4 w-4" />Salir</button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div>
          <h1 className="font-script text-4xl leading-none text-rosa">¡Hola, {member.name.split(' ')[0]}!</h1>
          <p className="mt-1 text-sm text-piedra">{pending.length ? `Tenés ${pending.length} ${pending.length === 1 ? 'CV para armar' : 'CVs para armar'}${urgent ? `, ${urgent} para hoy o atrasados` : ''}.` : 'No tenés CVs pendientes. ¡Todo al día!'}</p>
        </div>

        {/* The numbers: what is pending, what was done, the 10-pack counter and what is to be collected. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl bg-rosa p-4 text-white"><p className="font-display text-[11px] font-semibold uppercase tracking-wider text-white/85">Pendientes</p><p className="mt-1 font-display text-3xl font-extrabold">{pending.length}</p></div>
          <div className="rounded-3xl bg-white p-4"><p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Terminados este mes</p><p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{thisMonth?.packs ?? 0}</p></div>
          <div className="rounded-3xl bg-white p-4">
            <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Para tu próximo cobro</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{batch.count}<span className="text-base text-piedra"> de {batch.size}</span></p>
            <div className="mt-2 h-2 rounded-full bg-papel"><div className="h-2 rounded-full bg-rosa" style={{ width: `${Math.min(batch.count / batch.size, 1) * 100}%` }} /></div>
          </div>
          <div className="rounded-3xl bg-white p-4">
            <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">A cobrar</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ciruela">{formatARS(batch.owed)}</p>
            <p className="mt-1 text-[11px] leading-snug text-piedra">{batch.count} {batch.count === 1 ? 'CV' : 'CVs'} × {formatARS(member.rate)}{batch.advances ? ` − ${formatARS(batch.advances)} de adelanto` : ''}</p>
          </div>
        </div>

        <PushCard userId={user.id} />

        <section>
          <div role="tablist" className="flex gap-2">
            {(['pendientes', 'terminados'] as const).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`rounded-full px-4 py-2 font-display text-sm font-bold ${view === id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>
                {id === 'pendientes' ? `Para hacer (${pending.length})` : `Terminados (${finished.length})`}
              </button>
            ))}
          </div>
          {view === 'pendientes' && (pending.length === 0
            ? <p className="mt-4 rounded-3xl bg-white p-8 text-center text-piedra">No tenés CVs para armar. Cuando Vale te pase uno, te aparece acá.</p>
            : <ul className="mt-4 space-y-3">{pending.map((task) => <TeamTaskCard key={task.id} task={task} actions={<TaskActions task={task} onChanged={load} />} />)}</ul>)}
          {view === 'terminados' && (finished.length === 0
            ? <p className="mt-4 rounded-3xl bg-white p-8 text-center text-piedra">Todavía no terminaste ningún CV.</p>
            : <ul className="mt-4 space-y-3">{finished.slice(0, 30).map((task) => <TeamTaskCard key={task.id} task={task} actions={<TaskActions task={task} onChanged={load} />} />)}</ul>)}
        </section>

        <section className={cardClass} aria-labelledby="months-title">
          <h2 id="months-title" className="font-display text-lg font-bold text-ciruela">Mes a mes</h2>
          {months.length === 0 ? <p className="mt-2 text-sm text-piedra">Acá vas a ver cuántos CVs hiciste y lo que cobraste cada mes.</p> : (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-piedra"><th className="pb-2 font-semibold">Mes</th><th className="pb-2 text-right font-semibold">CVs</th><th className="pb-2 text-right font-semibold">Generado</th><th className="pb-2 text-right font-semibold">Cobrado</th></tr></thead>
              <tbody>{months.map((row) => <tr key={row.key} className="border-t border-line"><td className="py-2 font-semibold text-ink">{row.label}</td><td className="py-2 text-right">{row.packs}</td><td className="py-2 text-right">{formatARS(row.earned)}</td><td className="py-2 text-right">{formatARS(row.paid)}</td></tr>)}</tbody>
            </table>
          )}
        </section>

        {payments.length > 0 && (
          <section className={cardClass} aria-labelledby="payments-title">
            <h2 id="payments-title" className="font-display text-lg font-bold text-ciruela">Tus cobros</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-2 first:border-0 first:pt-0">
                  <span><b className="text-ink">{payment.kind === 'pago' ? 'Pago' : 'Adelanto'}</b> · {formatDate(`${payment.paid_on}T12:00:00-03:00`)}{payment.note ? <span className="text-piedra"> · {payment.note}</span> : null}</span>
                  <span className="font-display font-bold text-ciruela">{formatARS(payment.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
