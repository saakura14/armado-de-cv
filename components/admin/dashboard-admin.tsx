'use client'

import { countSessionsToSchedule } from '@/lib/sessions'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, Hourglass, ArrowRight, ArrowUpRight, CalendarClock, Clock, Download, FileCheck2, RefreshCw, ShoppingBag, Sparkles, Zap } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS } from '@/lib/catalog'
import { ORDER_SELECT, needsCoordination, type Order } from '@/lib/orders'
import { SALE_SELECT, bestSellers, funnel, change, deliveryDeadline, formatDue, isTestOrder, monthKey, monthLabel, monthStats, salesInMonth, shiftMonth, shortMonthLabel, welcome, type Deadline, type EventRow, type Sale, type VisitRow } from '@/lib/dashboard'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, cardClass } from './ui'

/** Where "Ver" and the status counters take you: a tab, optionally a filter or a single order. */
export type OpenTarget = { tab: 'pedidos' | 'sesiones'; filter?: 'gestionar' | 'in_progress' | 'delivered' | 'activos' | 'pending_payment'; order?: number }

type Task = { order: Order; kind: 'pago' | 'verificar' | 'entrega' | 'sesion'; deadline: Deadline | null }

const PAGES: Record<string, string> = { '/': 'Inicio (Armado de CV)', '/asesorias': 'Asesorías', '/gratis': 'Checklist gratis', '/cursos': 'Cursos', '/terminos': 'Términos', '/privacidad': 'Privacidad', '/arrepentimiento': 'Arrepentimiento', '/otras': 'Otras' }
const number = new Intl.NumberFormat('es-AR')
const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 })

/** Orders that need something from Vale, most urgent first. */
function toTasks(orders: Order[]): Task[] {
  const tasks = orders.map((order): Task => {
    if (order.status === 'payment_review') return { order, kind: 'pago', deadline: null }
    if (order.payment_check === 'pending') return { order, kind: 'verificar', deadline: null }
    const service = order.order_items.some((item) => item.products?.delivery === 'service')
    if (service) return { order, kind: 'entrega', deadline: deliveryDeadline(order) }
    return { order, kind: 'sesion', deadline: null }
  }).filter((task) => task.kind !== 'sesion' || needsCoordination(task.order))
  const rank = (task: Task) => (task.kind === 'pago' || task.kind === 'verificar' ? -100 : task.deadline?.waiting ? 60 : task.deadline ? task.deadline.remaining : 50)
  return tasks.sort((a, b) => rank(a) - rank(b))
}

export function DeadlineChip({ deadline }: { deadline: Deadline }) {
  if (deadline.waiting) return <span className="inline-flex items-center gap-1.5 rounded-full bg-papel px-3 py-1 font-display text-xs font-bold text-piedra"><Hourglass className="h-3.5 w-3.5" />Esperando al cliente</span>
  const { remaining } = deadline
  const late = remaining < 0
  const text = late ? `Atrasado ${-remaining} ${remaining === -1 ? 'día hábil' : 'días hábiles'}` : remaining === 0 ? 'Vence hoy' : remaining === 1 ? 'Vence mañana' : `Quedan ${remaining} días hábiles`
  const tone = late ? 'bg-rosa text-white' : remaining === 0 ? 'bg-rosa/15 text-rosa-deep' : remaining === 1 ? 'bg-petalo-wash text-rosa-deep' : 'bg-arena text-ciruela'
  const Icon = late || remaining === 0 ? AlertTriangle : Clock
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold ${tone}`}><Icon className="h-3.5 w-3.5" />{text}</span>
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { money } = useHideMoney()
  const { order, kind, deadline } = task
  const name = order.customer_name || 'Cliente'
  const products = order.order_items.map((item) => item.product_name).join(' + ')
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-piedra">#{order.number}{isTestOrder(order) ? ' · prueba' : ''}{order.source === 'whatsapp' ? ' · WhatsApp' : ''} · {money(order.total)}</p>
        <p className="mt-0.5 truncate font-bold text-ink">{name}</p>
        <p className="truncate text-sm text-piedra">{products}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {kind === 'pago' && <span className="inline-flex items-center gap-1.5 rounded-full bg-petalo-wash px-3 py-1 font-display text-xs font-bold text-rosa-deep"><FileCheck2 className="h-3.5 w-3.5" />Revisar comprobante</span>}
        {kind === 'verificar' && <span className="inline-flex items-center gap-1.5 rounded-full bg-petalo-wash px-3 py-1 font-display text-xs font-bold text-rosa-deep"><FileCheck2 className="h-3.5 w-3.5" />Verificar transferencia</span>}
        {kind === 'sesion' && <span className="inline-flex items-center gap-1.5 rounded-full bg-arena px-3 py-1 font-display text-xs font-bold text-ciruela"><CalendarClock className="h-3.5 w-3.5" />Agendar sesión</span>}
        {deadline && (
          <>
            {deadline.express && <span className="inline-flex items-center gap-1 rounded-full bg-ciruela px-2.5 py-1 font-display text-[11px] font-bold text-white"><Zap className="h-3 w-3" />Express</span>}
            <DeadlineChip deadline={deadline} />
            <span className="text-xs text-piedra">Entregar el {formatDue(deadline.due)}</span>
          </>
        )}
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 font-display text-sm font-bold text-rosa-deep hover:underline">Ver<ArrowRight className="h-4 w-4" /></button>
      </div>
    </li>
  )
}

function Delta({ value, previous }: { value: number | null; previous: string }) {
  if (value === null) return <p className="mt-1 text-xs text-piedra">Sin datos de {previous}</p>
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <p className="mt-1 flex items-center gap-1 text-xs text-piedra"><Icon className={`h-3.5 w-3.5 ${up ? 'text-whatsapp' : 'text-rosa-deep'}`} />{up ? '+' : ''}{percent.format(value)} vs {previous}</p>
}

function Tile({ label, value, delta, previous, note }: { label: string; value: string; delta: number | null; previous: string; note?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)]">
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-piedra">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-ciruela sm:text-[28px]">{value}</p>
      {note && <p className="text-xs font-semibold text-whatsapp">{note}</p>}
      <Delta value={delta} previous={previous} />
    </div>
  )
}

/** Revenue of the last 6 months: one series, the selected month labeled, the rest on hover. */
function RevenueBars({ months, selected, money }: { months: { key: string; revenue: number; sales: number }[]; selected: string; money: (value: number) => string }) {
  const max = Math.max(...months.map((month) => month.revenue), 1)
  return (
    <div>
      <div className="flex h-44 items-end gap-3 border-b border-line pt-6" role="img" aria-label="Facturación de los últimos 6 meses">
        {months.map((month) => {
          const active = month.key === selected
          return (
            <div key={month.key} className="group relative flex h-full flex-1 flex-col justify-end" tabIndex={0}>
              <span className={`pointer-events-none absolute inset-x-0 whitespace-nowrap text-center font-display text-xs font-bold text-ciruela ${active ? '' : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'}`} style={{ bottom: `calc(${(month.revenue / max) * 100}% + 6px)`, top: 'auto' }}>
                {money(month.revenue)}
              </span>
              <div className={`mx-auto w-full max-w-12 rounded-t-[4px] transition-colors ${active ? 'bg-rosa' : 'bg-petalo group-hover:bg-rosa/70'}`} style={{ height: `${Math.max((month.revenue / max) * 100, month.revenue ? 2 : 0)}%` }} title={`${monthLabel(month.key)}: ${money(month.revenue)} · ${month.sales} ${month.sales === 1 ? 'venta' : 'ventas'}`} />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-3">
        {months.map((month) => <span key={month.key} className={`flex-1 text-center font-display text-xs ${month.key === selected ? 'font-bold text-ciruela' : 'text-piedra'}`}>{shortMonthLabel(month.key)}</span>)}
      </div>
    </div>
  )
}

const TILE_TONES = {
  rosa: 'bg-rosa text-white',
  arena: 'bg-white text-ciruela',
  verde: 'bg-white text-ciruela',
}

/** A big status number that opens the matching orders. */
function StatusTile({ label, value, note, tone, onClick }: { label: string; value: number; note: string; tone: keyof typeof TILE_TONES; onClick: () => void }) {
  const strong = tone === 'rosa'
  return (
    <button type="button" onClick={onClick} className={`group flex flex-col items-start rounded-3xl p-4 text-left shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)] transition-transform hover:-translate-y-0.5 sm:p-5 ${TILE_TONES[tone]}`}>
      <span className={`font-display text-[10px] font-semibold uppercase tracking-wide sm:text-xs sm:tracking-wider ${strong ? 'text-white/85' : 'text-piedra'}`}>{label}</span>
      <span className="mt-1 font-display text-3xl font-extrabold tabular-nums sm:text-4xl">{value}</span>
      <span className={`mt-1 text-[11px] leading-snug sm:text-xs ${strong ? 'text-white/85' : tone === 'verde' ? 'text-whatsapp' : 'text-piedra'}`}>{note}</span>
      <span className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${strong ? 'text-white' : 'text-rosa-deep'}`}>Ver<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
    </button>
  )
}

type Data = { orders: Order[]; sales: Sale[]; visits: VisitRow[]; events: EventRow[]; created: string[]; delivered: string[]; unpaid: number; fresh: number; sessionsToSchedule: number }

/** Loads everything the home needs; the view below only draws it. */
export function DashboardAdmin({ firstName, onOpen }: { firstName: string; onOpen: (target: OpenTarget) => void }) {
  const [data, setData] = useState<Data>({ orders: [], sales: [], visits: [], events: [], created: [], delivered: [], unpaid: 0, fresh: 0, sessionsToSchedule: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [open, paid, traffic, sessions, steps, created, delivered, unpaid, fresh] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).or('status.in.(payment_review,paid,in_progress),payment_check.eq.pending').order('created_at'),
      supabase.from('orders').select(SALE_SELECT).not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000),
      supabase.from('site_visits').select('day, path, visits, views').order('day'),
      countSessionsToSchedule(),
      supabase.from('site_events').select('day, event, count'),
      supabase.from('orders').select('created_at').lt('number', 90000).eq('source', 'web'),
      supabase.from('orders').select('delivered_at, paid_at').eq('status', 'delivered').lt('number', 90000),
      // Orders waiting for the payment for more than a day: time for a reminder.
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_payment').lt('number', 90000).lt('created_at', new Date(Date.now() - 864e5).toISOString()),
      // Web orders not seen yet in Pedidos.
      supabase.from('orders').select('id', { count: 'exact', head: true }).is('seen_at', null).neq('status', 'cancelled').lt('number', 90000),
    ])
    const failed = open.error ?? paid.error ?? traffic.error
    setError(failed ? errorMessage(failed) : '')
    setData({
      orders: (open.data as Order[] | null) ?? [],
      sales: (paid.data as unknown as Sale[] | null) ?? [],
      visits: (traffic.data as VisitRow[] | null) ?? [],
      events: (steps.data as EventRow[] | null) ?? [],
      created: ((created.data as { created_at: string }[] | null) ?? []).map((row) => row.created_at),
      delivered: ((delivered.data as { delivered_at: string | null; paid_at: string | null }[] | null) ?? []).flatMap((row) => { const at = row.delivered_at ?? row.paid_at; return at ? [at] : [] }),
      unpaid: unpaid.count ?? 0,
      fresh: fresh.count ?? 0,
      sessionsToSchedule: sessions,
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Live numbers: any order created, paid, moved or loaded from WhatsApp refreshes the home (and so does coming back to the app).
  useEffect(() => {
    let timer: number | undefined
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(load, 700) }
    const channel = supabase.channel('admin-home').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, soon).subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') soon() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  return <DashboardView firstName={firstName} data={data} loading={loading} loadError={error} onReload={load} onOpen={onOpen} />
}

export function DashboardView({ firstName, data, loading, loadError, onReload, onOpen }: { firstName: string; data: Data; loading: boolean; loadError: string; onReload: () => void; onOpen: (target: OpenTarget) => void }) {
  const { sales, visits, sessionsToSchedule } = data
  const tasks = useMemo(() => toTasks(data.orders), [data.orders])
  const [greeting, setGreeting] = useState<{ title: string; line: string } | null>(null)
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [year, setYear] = useState(() => monthKey(new Date()).slice(0, 4))
  const [exporting, setExporting] = useState(false)
  // Amounts can be hidden (someone looking at the screen); shared with Pedidos and remembered on this device.
  const { money } = useHideMoney()
  const [exportError, setExportError] = useState('')
  const error = loadError || exportError

  // Picked in the browser so every visit to the panel greets differently.
  useEffect(() => { setGreeting(welcome(firstName)) }, [firstName])


  const current = monthKey(new Date())
  const months = useMemo(() => {
    const first = [...sales.map((sale) => monthKey(sale.paid_at)), ...visits.map((row) => row.day.slice(0, 7)), current].sort()[0]
    const list: string[] = []
    for (let key = current; key >= first; key = shiftMonth(key, -1)) list.push(key)
    return list
  }, [sales, visits, current])
  const years = [...new Set(months.map((key) => key.slice(0, 4)))]

  const stats = monthStats(month, sales, visits)
  const previousKey = shiftMonth(month, -1)
  const previous = monthStats(previousKey, sales, visits)
  const previousName = monthLabel(previousKey).split(' ')[0].toLowerCase()
  const history = Array.from({ length: 6 }, (_, index) => monthStats(shiftMonth(month, index - 5), sales, visits))
  const top = bestSellers(salesInMonth(month, sales)).slice(0, 5)
  const topMax = Math.max(...top.map((item) => item.units), 1)
  const landings = Object.entries(visits.filter((row) => row.day.startsWith(month)).reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.path]: (acc[row.path] ?? 0) + row.visits }), {})).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const whatsappSales = salesInMonth(month, sales).filter((sale) => sale.source === 'whatsapp').length
  const steps = funnel(month, visits, data.events, data.created, sales)
  const webSales = steps[steps.length - 1].value
  const stepMax = Math.max(...steps.map((step) => step.value), whatsappSales, 1)

  const deliveries = tasks.filter((task) => task.kind === 'entrega')
  const urgent = deliveries.filter((task) => task.deadline && !task.deadline.waiting && task.deadline.remaining <= 1).length
  // Status counters: to manage (payment to check or not started), in progress, delivered.
  const toManage = data.orders.filter((order) => order.status === 'payment_review' || order.status === 'paid' || order.payment_check === 'pending')
  const reviews = toManage.filter((order) => order.status === 'payment_review' || order.payment_check === 'pending').length
  const inProgress = data.orders.filter((order) => order.status === 'in_progress').length
  const deliveredMonth = data.delivered.filter((at) => monthKey(at) === current).length
  const upcoming = tasks.slice(0, 3)

  async function exportYear() {
    setExporting(true)
    setExportError('')
    try {
      const { downloadYearReport } = await import('@/lib/export-excel')
      await downloadYearReport(year, sales, visits)
    } catch (failure) {
      setExportError(`No se pudo generar el Excel: ${errorMessage(failure)}`)
    }
    setExporting(false)
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-[32px] bg-ciruela px-6 py-7 text-white sm:px-8">
        <Sparkles className="absolute right-6 top-6 h-16 w-16 text-petalo/20" aria-hidden="true" />
        <p className="font-script text-5xl leading-none text-petalo">{greeting?.title ?? `Hola, ${firstName}`}</p>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/90">{greeting?.line ?? ' '}</p>
        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
          <span>{deliveries.length} {deliveries.length === 1 ? 'pedido para entregar' : 'pedidos para entregar'}</span>
          {urgent > 0 && <span className="font-semibold text-petalo">{urgent} {urgent === 1 ? 'vence' : 'vencen'} hoy o mañana</span>}
          {sessionsToSchedule > 0 && <span>{sessionsToSchedule} {sessionsToSchedule === 1 ? 'sesión para agendar' : 'sesiones para agendar'}</span>}
        </p>
      </div>

      {error && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

      {/* Orders at a glance */}
      <section aria-labelledby="todo-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="todo-title" className="font-display text-lg font-bold text-ciruela">Tus pedidos</h2>
          <button type="button" onClick={onReload} className="inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-ciruela"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
        </div>
        {data.fresh > 0 && (
          <button type="button" onClick={() => onOpen({ tab: 'pedidos', filter: 'activos' })} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-rosa px-4 py-3 text-left text-sm text-white shadow-lg shadow-rosa/25">
            <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 shrink-0" /><span><b>{data.fresh === 1 ? '¡Tenés un pedido nuevo!' : `¡Tenés ${data.fresh} pedidos nuevos!`}</b> {data.fresh === 1 ? 'Entró por la web y todavía no lo viste.' : 'Entraron por la web y todavía no los viste.'}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        )}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatusTile label="A gestionar" value={toManage.length} tone="rosa" note={reviews ? `${reviews} ${reviews === 1 ? 'pago' : 'pagos'} por revisar` : urgent ? `${urgent} ${urgent === 1 ? 'vence' : 'vencen'} pronto` : 'Pagados, sin empezar'} onClick={() => onOpen({ tab: 'pedidos', filter: 'gestionar' })} />
          <StatusTile label="En proceso" value={inProgress} tone="arena" note="Trabajando en ellos" onClick={() => onOpen({ tab: 'pedidos', filter: 'in_progress' })} />
          <StatusTile label="Entregados" value={deliveredMonth} tone="verde" note={`Este mes · ${data.delivered.length} en total`} onClick={() => onOpen({ tab: 'pedidos', filter: 'delivered' })} />
        </div>

        {data.unpaid > 0 && (
          <button type="button" onClick={() => onOpen({ tab: 'pedidos', filter: 'pending_payment' })} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-petalo-wash px-4 py-3 text-left text-sm text-rosa-deep">
            <span><b>{data.unpaid} {data.unpaid === 1 ? 'pedido sin pagar' : 'pedidos sin pagar'}</b> hace más de 24 hs. Mandales el recordatorio con un toque.</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        )}

        {upcoming.length > 0 && (
          <div className={`${cardClass} mt-4`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-base font-bold text-ciruela">Lo más urgente</h3>
              {tasks.length > upcoming.length && <button type="button" onClick={() => onOpen({ tab: 'pedidos', filter: 'activos' })} className="inline-flex items-center gap-1 text-sm font-semibold text-rosa-deep hover:underline">Ver los {tasks.length}<ArrowRight className="h-4 w-4" /></button>}
            </div>
            <ul className="mt-1">{upcoming.map((task) => <TaskRow key={task.order.id} task={task} onOpen={() => onOpen(task.kind === 'sesion' ? { tab: 'sesiones' } : { tab: 'pedidos', order: task.order.number })} />)}</ul>
            <p className="mt-2 text-xs text-piedra">Plazo: 4 días hábiles desde el pago (Express: 1). Después de las 17 hs o en fin de semana arranca el siguiente día hábil. No descuenta feriados.</p>
          </div>
        )}
        {!loading && tasks.length === 0 && <p className="mt-4 rounded-2xl bg-white px-4 py-5 text-center text-piedra">No tenés pedidos pendientes. ¡Todo al día!</p>}
      </section>

      {/* Monthly figures */}
      <section aria-labelledby="stats-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="stats-title" className="font-display text-lg font-bold text-ciruela">Cómo viene el mes</h2>
          <div className="flex items-center gap-2">
          <HideMoneyButton />
          <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Mes" className="rounded-full border border-line bg-white px-4 py-2 font-display text-sm font-semibold text-ciruela">
            {months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile label="Ventas" value={number.format(stats.sales)} delta={change(stats.sales, previous.sales)} previous={previousName} note={whatsappSales ? `${whatsappSales} por WhatsApp` : undefined} />
          <Tile label="Facturado" value={money(stats.revenue)} delta={change(stats.revenue, previous.revenue)} previous={previousName} />
          <Tile label="Ticket promedio" value={stats.sales ? money(stats.average) : '—'} delta={change(stats.average, previous.average)} previous={previousName} />
          <Tile label="Visitas" value={number.format(stats.visits)} delta={change(stats.visits, previous.visits)} previous={previousName} />
          <Tile label="Conversión" value={stats.conversion === null ? '—' : percent.format(stats.conversion)} delta={stats.conversion !== null && previous.conversion ? change(stats.conversion, previous.conversion) : null} previous={previousName} />
        </div>
        <p className="mt-2 text-xs text-piedra">Ventas: pedidos con pago confirmado, sin cancelados ni pruebas. Visitas: personas que entraron a la web (se cuentan desde el 28/09/2026, sin tus propias visitas). Conversión: ventas sobre visitas.</p>
      </section>

      <section className={cardClass} aria-labelledby="funnel-title">
        <h2 id="funnel-title" className="font-display text-lg font-bold text-ciruela">Del clic a la venta</h2>
        <p className="text-sm text-piedra">{monthLabel(month)} · cuántas personas llegan a cada paso en la web (desde el 28/09/2026), y lo que vendiste por WhatsApp</p>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const before = index > 0 ? steps[index - 1].value : 0
            return (
              <li key={step.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[250px_1fr_110px]">
                <span className="col-start-1 row-start-1 text-sm font-semibold text-ink">{step.label} <span className="font-normal text-piedra">· {step.hint}</span></span>
                <span className="col-span-2 row-start-2 h-2.5 rounded-full bg-papel sm:col-span-1 sm:col-start-2 sm:row-start-1"><span className="block h-2.5 rounded-full bg-rosa" style={{ width: `${(step.value / stepMax) * 100}%` }} /></span>
                <span className="col-start-2 row-start-1 text-right font-display text-sm font-bold text-ciruela sm:col-start-3">{number.format(step.value)}{index > 0 && before > 0 && <span className="ml-1.5 font-sans text-xs font-normal text-piedra">({percent.format(step.value / before)})</span>}</span>
              </li>
            )
          })}
        </ol>
        {/* WhatsApp sales don't go through the web steps: they are shown apart and added to the total. */}
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[250px_1fr_110px]">
            <span className="col-start-1 row-start-1 text-sm font-semibold text-ink"><WhatsAppIcon className="mr-1.5 inline h-4 w-4 -translate-y-px text-whatsapp" />Vendiste por WhatsApp <span className="font-normal text-piedra">· ventas cargadas</span></span>
            <span className="col-span-2 row-start-2 h-2.5 rounded-full bg-papel sm:col-span-1 sm:col-start-2 sm:row-start-1"><span className="block h-2.5 rounded-full bg-whatsapp" style={{ width: `${(whatsappSales / stepMax) * 100}%` }} /></span>
            <span className="col-start-2 row-start-1 text-right font-display text-sm font-bold text-ciruela sm:col-start-3">{number.format(whatsappSales)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-papel px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-ciruela">Total de ventas del mes</span>
              <span className="block text-xs text-piedra">{number.format(webSales)} por la web · {number.format(whatsappSales)} por WhatsApp</span>
            </span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-ciruela">{number.format(webSales + whatsappSales)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-piedra">En la web, el porcentaje es sobre el paso anterior. Si mucha gente llega a comprar pero no confirma, el freno está en crear la cuenta o en los datos.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className={cardClass} aria-labelledby="revenue-title">
          <h2 id="revenue-title" className="font-display text-lg font-bold text-ciruela">Facturación</h2>
          <p className="text-sm text-piedra">Últimos 6 meses hasta {monthLabel(month).toLowerCase()}</p>
          <div className="mt-4"><RevenueBars months={history} selected={month} money={money} /></div>
        </section>

        <section className={cardClass} aria-labelledby="top-title">
          <h2 id="top-title" className="font-display text-lg font-bold text-ciruela">Lo más vendido</h2>
          <p className="text-sm text-piedra">{monthLabel(month)}</p>
          {top.length === 0 ? <p className="mt-6 text-sm text-piedra">Todavía no hay ventas este mes.</p> : (
            <ol className="mt-4 space-y-3">
              {top.map((item) => (
                <li key={item.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold text-ink">{item.name}</span><span className="shrink-0 text-piedra">{item.units} u. · {money(item.revenue)}</span></div>
                  <div className="mt-1.5 h-2 rounded-full bg-papel"><div className="h-2 rounded-full bg-rosa" style={{ width: `${(item.units / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
          {landings.length > 0 && (
            <>
              <h3 className="mt-6 font-display text-sm font-bold text-ciruela">Por dónde entraron</h3>
              <ul className="mt-2 space-y-1 text-sm">{landings.map(([path, count]) => <li key={path} className="flex justify-between gap-3"><span className="text-ink">{PAGES[path] ?? path}</span><span className="text-piedra">{number.format(count)}</span></li>)}</ul>
            </>
          )}
        </section>
      </div>

      {/* Export */}
      <section className={`${cardClass} flex flex-col gap-4 sm:flex-row sm:items-center`} aria-labelledby="export-title">
        <div className="flex-1">
          <h2 id="export-title" className="font-display text-lg font-bold text-ciruela">Reporte en Excel</h2>
          <p className="text-sm text-piedra">Resumen mes a mes, lo más vendido, el detalle de ventas y las visitas, con tu logo y tus colores.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Año" className="rounded-full border border-line bg-white px-4 py-2 font-display text-sm font-semibold text-ciruela">
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button busy={exporting} onClick={exportYear} disabled={loading}><Download className="h-4 w-4" />Descargar Excel</Button>
        </div>
      </section>
    </div>
  )
}
