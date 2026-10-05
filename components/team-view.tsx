'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, ChevronRight, ListTodo, MessageCircle, PlayCircle, Wallet, X } from 'lucide-react'
import { TaskRow, TaskWorkspace } from '@/components/team-task-card'
import { TeamChat, TeamChatBubble, TeamChatWindow, useTeamUnread, type ChatTask } from '@/components/team-chat'
import { Button, cardClass, inputClass, useFlash } from '@/components/admin/ui'
import { formatARS, whatsappUrl } from '@/lib/catalog'
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
function TaskActions({ task, preview, onChanged, onFinished }: { task: TeamTask; preview?: boolean; onChanged: () => void; onFinished?: () => void }) {
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
    if (status === 'terminado') onFinished?.()
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
  cv_modern: 'MARTINA LÓPEZ\nAnalista de Recursos Humanos\nCABA · martina@ejemplo.com · linkedin.com/in/martina\n\nPERFIL PROFESIONAL\nAnalista de RR. HH. con 4 años de experiencia en selección, onboarding y clima laboral. Orientada a datos y a la mejora de procesos.\n\nEXPERIENCIA\nAnalista de Selección · Empresa Ejemplo S.A. · 2022 - actualidad\n• Gestión de búsquedas IT y comerciales de punta a punta.\n• Reducción del tiempo de cobertura de 45 a 30 días.\n\nAsistente de RR. HH. · Otra Empresa · 2020 - 2022\n• Liquidación de novedades y legajos.\n• Organización de capacitaciones internas.\n\nEDUCACIÓN\nLic. en Relaciones del Trabajo · UBA · 2021\n\nHABILIDADES\nEntrevistas por competencias · Excel avanzado · Power BI · Inglés intermedio',
  cv_ats: 'MARTINA LÓPEZ\nAnalista de Recursos Humanos\n\nRESUMEN\nAnalista de Recursos Humanos con 4 años de experiencia en reclutamiento y selección.\n\nEXPERIENCIA LABORAL\nAnalista de Selección, Empresa Ejemplo S.A. (2022 - actualidad)\n- Búsquedas IT y comerciales.\n- Tiempo de cobertura reducido un 33%.\n\nEDUCACIÓN\nLicenciatura en Relaciones del Trabajo, UBA (2021)',
  has_letter: true, letter: 'Estimado equipo de selección:\n\nMe pongo en contacto para postularme a la posición de Analista de Recursos Humanos.\n\nEn mi rol actual lideré procesos de selección de punta a punta y reduje los tiempos de cobertura.\n\nQuedo a disposición para conversar.\nSaludos cordiales,\nMartina López', notes: 'Diseño en tonos verdes, con foto.',
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
  // The CV open in work mode (full screen, next to Canva).
  const [workingId, setWorkingId] = useState<string | null>(null)
  // Chat with Vale: a floating button with the unread count; "#chat" in the address (from a notification) opens it.
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTask, setChatTask] = useState<ChatTask | null>(null)
  const unread = useTeamUnread(preview ? null : member.id, 'member')
  const closeChat = useCallback(() => { setChatOpen(false); if (window.location.hash === '#chat') history.replaceState(history.state, '', window.location.pathname) }, [])
  const clearChatTask = useCallback(() => setChatTask(null), [])
  useEffect(() => {
    if (preview) return
    const fromHash = () => { if (window.location.hash === '#chat') setChatOpen(true) }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [preview])
  const chatTasks: ChatTask[] = tasks.map(({ id, order_number, client_name, pack_name }) => ({ id, order_number, client_name, pack_name }))
  const closeWork = useCallback(() => setWorkingId(null), [])
  // The step-by-step video, and whether it was already offered on this device.
  const [tutorial, setTutorial] = useState(false)
  const [tutorialSeen, setTutorialSeen] = useState<boolean | null>(null)
  useEffect(() => { try { setTutorialSeen(localStorage.getItem('acv-tutorial-seen') === '1') } catch { setTutorialSeen(true) } }, [])
  function markTutorialSeen() { setTutorialSeen(true); try { localStorage.setItem('acv-tutorial-seen', '1') } catch { /* private mode */ } }
  // "Listo el #12, seguimos con el #13": a short message when the work mode jumps to the next CV.
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 4000); return () => window.clearTimeout(timer) }, [notice])
  const { pending, finished } = sortTasks(tasks)
  const batch = batchStats(member, tasks, payments)
  const months = monthlyStats(tasks, payments)
  const thisMonth = months.find((row) => row.key === monthKey(new Date()))
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)
  const urgent = pending.filter((task) => task.due_on && task.due_on <= today).length
  // In the preview, an example card shows how a new CV arrives.
  const shownPending = preview && pending.length === 0 ? [EXAMPLE_TASK] : pending
  const list = view === 'pendientes' ? shownPending : finished.slice(0, 30)
  // Closes by itself when the CV is finished (it leaves the pending list).
  const working = workingId ? shownPending.find((task) => task.id === workingId) ?? null : null
  // "Empezar" marks it as started (Vale sees it "Haciéndolo") and opens the work mode; "Seguir" just opens it.
  async function openTask(task: TeamTask) {
    if (!preview && task.status === 'asignado') {
      const { error } = await supabase.rpc('team_set_task_status', { p_task: task.id, p_status: 'haciendo', p_design_url: null })
      if (error) { setNotice({ ok: false, text: errorMessage(error) }); return }
      onChanged()
    }
    setWorkingId(task.id)
  }
  // Copying a text means the work started, even if "Empezar" was skipped: Vale sees it "Haciéndolo".
  function markStarted(task: TeamTask) {
    if (preview || task.status !== 'asignado') return
    supabase.rpc('team_set_task_status', { p_task: task.id, p_status: 'haciendo', p_design_url: null }).then(({ error }) => { if (!error) onChanged() })
  }
  // A CV finished in work mode: the next pending one (most urgent first) opens by itself.
  function finishedWorking(done: TeamTask) {
    const following = pending.find((task) => task.id !== done.id)
    setWorkingId(following?.id ?? null)
    setNotice({ ok: true, text: following
      ? `✅ Listo el pedido #${done.order_number}. Seguimos con el #${following.order_number}: ${following.pack_name} de ${following.client_name}.`
      : '✅ ¡Terminaste todos los CVs! Buen trabajo.' })
  }

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

      <main className="mx-auto max-w-6xl space-y-4 px-4 pb-24 pt-5 @3xl:px-6 @3xl:pt-6">
        <div>
          <h1 className="font-script text-3xl leading-none text-rosa">¡Hola, {member.name.split(' ')[0]}!</h1>
          <p className="mt-1 text-sm text-piedra">{pending.length ? `Tenés ${pending.length} ${pending.length === 1 ? 'CV para armar' : 'CVs para armar'}${urgent ? `, ${urgent} para hoy o atrasados` : ''}.` : 'No tenés CVs pendientes. ¡Todo al día!'}</p>
        </div>

        {/* The numbers in one compact strip: two per row on a phone, four in a row from a small tablet. */}
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-26px_rgba(67,32,44,0.6)] @lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, strong }, index) => (
            <div key={label} className={`px-3.5 py-2.5 ${strong ? 'bg-rosa text-white' : ''} ${index % 2 ? 'border-l border-line' : ''} ${index > 1 ? 'border-t border-line @lg:border-t-0' : ''} ${index === 2 ? '@lg:border-l' : ''}`}>
              <p className={`flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider ${strong ? 'text-white/85' : 'text-piedra'}`}><Icon className="h-3.5 w-3.5" />{label}</p>
              <p className={`font-display text-xl font-extrabold ${strong ? '' : 'text-ciruela'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* The first time, the tutorial is offered at the top (then it stays under "¿Cómo se usa?"). */}
        {!preview && tutorialSeen === false && (
          <div className="flex items-center gap-3 rounded-2xl bg-petalo-wash/70 p-3">
            <PlayCircle className="h-6 w-6 shrink-0 text-rosa" />
            <p className="flex-1 text-sm text-ink"><b>¿Primera vez?</b> Mirá el tutorial: en 1 minuto te muestra cómo armar un CV acá.</p>
            <button type="button" onClick={() => { setTutorial(true); markTutorialSeen() }} className="shrink-0 rounded-full bg-ciruela px-3.5 py-2 font-display text-xs font-bold text-white hover:bg-rosa">Ver</button>
            <button type="button" onClick={markTutorialSeen} aria-label="Ya lo vi" className="shrink-0 rounded-full p-1 text-piedra hover:text-ciruela"><X className="h-4 w-4" /></button>
          </div>
        )}
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
            {list.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm text-piedra">{view === 'pendientes' ? 'No tenés CVs para armar. Cuando Vale te pase uno, te aparece acá y te llega un aviso.' : 'Todavía no terminaste ningún CV.'}</p>
            ) : view === 'pendientes' ? (
              // The urgent ones first, apart, so it's clear what to do today.
              <div className="mt-3 space-y-4">
                {[
                  { title: 'Para hoy o atrasados', items: list.filter((task) => task.due_on && task.due_on <= today) },
                  { title: urgent ? 'Próximos' : 'Para hacer', items: list.filter((task) => !(task.due_on && task.due_on <= today)) },
                ].filter((group) => group.items.length).map((group) => (
                  <div key={group.title}>
                    <p className="mb-1.5 px-1 font-display text-[11px] font-bold uppercase tracking-wider text-piedra">{group.title} · {group.items.length}</p>
                    <ul className="grid items-start gap-2 @5xl:grid-cols-2">
                      {group.items.map((task) => (
                        <TaskRow key={task.id} task={task} onOpen={() => openTask(task)}
                          action={<button type="button" onClick={() => openTask(task)} className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 font-display text-xs font-bold text-white ${task.status === 'haciendo' ? 'bg-rosa hover:bg-rosa-deep' : 'bg-ciruela hover:bg-rosa'}`}>{task.status === 'haciendo' ? 'Seguir' : 'Empezar'}<ChevronRight className="h-4 w-4" /></button>} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="mt-3 grid items-start gap-2 @5xl:grid-cols-2">
                {list.map((task) => <TaskRow key={task.id} task={task} action={<span className="shrink-0 text-right text-[11px] leading-tight text-piedra">{formatDate(task.finished_at!, true)}<br /><b className={task.paid_in ? 'text-whatsapp' : 'text-ciruela'}>{task.paid_in ? 'cobrado' : 'a cobrar'}</b></span>} />)}
              </ul>
            )}
          </section>

          {/* Money and history: beside the CVs on a tablet, under them on a phone. */}
          <aside className="space-y-4 @3xl:sticky @3xl:top-20">
            <section className={cardClass} aria-labelledby="batch-title">
              <h2 id="batch-title" className="font-display text-base font-bold text-ciruela">Tu próximo cobro</h2>
              <p className="mt-1 font-display text-2xl font-extrabold text-ciruela">{batch.count}<span className="text-sm text-piedra"> de {batch.size} CVs</span></p>
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
            {/* Help: the step-by-step video and a direct line to Vale. */}
            <section className={cardClass} aria-labelledby="help-title">
              <h2 id="help-title" className="font-display text-base font-bold text-ciruela">¿Cómo se usa?</h2>
              <div className="mt-2 grid gap-2">
                <button type="button" onClick={() => setTutorial(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ciruela px-4 font-display text-sm font-bold text-white hover:bg-rosa"><PlayCircle className="h-4 w-4" />Ver el tutorial</button>
                {preview
                  ? <a href={whatsappUrl('Hola Vale, tengo una consulta con el panel: ')} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line px-4 font-display text-sm font-bold text-ciruela hover:border-ciruela"><MessageCircle className="h-4 w-4 text-whatsapp" />Escribile a Vale</a>
                  : <button type="button" onClick={() => setChatOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line px-4 font-display text-sm font-bold text-ciruela hover:border-ciruela"><MessageCircle className="h-4 w-4 text-rosa" />Escribile a Vale</button>}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {working && <TaskWorkspace key={working.id} task={working} onClose={closeWork} onStart={() => markStarted(working)} onAsk={preview ? undefined : () => { setChatTask(chatTasks.find((task) => task.id === working.id) ?? null); setChatOpen(true) }} actions={<TaskActions task={working} preview={preview} onChanged={onChanged} onFinished={() => finishedWorking(working)} />} />}
      {notice && <p role="status" className={`fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-[60] mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-lg ${notice.ok ? 'bg-whatsapp' : 'bg-rosa-deep'}`}>{notice.text}</p>}
      {/* Chat with Vale: a bubble in the corner (hidden in the work mode, which has its own "¿Una duda?" button). */}
      {!preview && !working && <TeamChatBubble open={chatOpen} unread={unread} onClick={() => (chatOpen ? closeChat() : setChatOpen(true))} label="Chat con Vale" className="bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4" />}
      {chatOpen && !preview && (
        <TeamChatWindow title="Chat con Vale" onClose={closeChat} className="sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:right-4">
          <TeamChat memberId={member.id} side="member" otherName="Vale" tasks={chatTasks} draftTask={chatTask} onDraftTaskUsed={clearChatTask} />
        </TeamChatWindow>
      )}
      {tutorial && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ciruela/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Tutorial del panel" onClick={() => setTutorial(false)}>
          <div className="relative w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setTutorial(false)} aria-label="Cerrar" className="absolute -top-12 right-0 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>
            <video src="/tutorial-equipo.mp4" controls autoPlay playsInline className="aspect-[9/16] max-h-[82dvh] w-full rounded-3xl bg-black shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
