'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Lightbulb, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { dayKey, monthLabel, shortMonthLabel } from '@/lib/dashboard'
import {
  ANALYSIS_SALE_SELECT, EXPENSE_CATEGORY, breakdowns, campaignsIn, dailySeries, expensesIn, monthMatrix, monthsSince, periodOf, resultOf, salesIn, shiftPeriod, strongPoints,
  type AdRow, type AnalysisSale, type Expense, type ExpenseCategory, type FxRow, type MetaPayRow, type Period, type PeriodKind, type TeamCostRow, type AnalysisData, metaCostByDay,
} from '@/lib/analysis'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

export type Data = AnalysisData
type MetaState = { connected: boolean | null; error: string; syncing: boolean }

const number = new Intl.NumberFormat('es-AR')
const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 })
const usd = (value: number) => `US$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const today = () => dayKey(new Date())
const KINDS: { id: PeriodKind; label: string }[] = [{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]

/** Everything the money numbers need (Análisis and Ahorro share it). */
export async function fetchAnalysisData(): Promise<{ data: Data; error: string }> {
  const [sales, ads, fx, team, expenses, metaPays] = await Promise.all([
    supabase.from('orders').select(ANALYSIS_SALE_SELECT).not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000),
    supabase.from('ad_spend').select('day, campaign_id, campaign_name, spend, conversations, clicks, impressions, currency, source').order('day'),
    supabase.from('fx_rates').select('day, ars_per_usd').order('day'),
    // Real money out: what she paid the team and what Meta charged her.
    supabase.from('team_payments').select('paid_on, amount, kind'),
    supabase.from('expenses').select('id, day, category, concept, amount, currency, monthly, until').order('day', { ascending: false }),
    supabase.from('meta_payments').select('day, amount_usd').order('day'),
  ])
  const failed = sales.error ?? ads.error ?? fx.error ?? team.error ?? expenses.error ?? metaPays.error
  return {
    error: failed ? errorMessage(failed) : '',
    data: {
      sales: (sales.data as unknown as AnalysisSale[] | null) ?? [],
      ads: ((ads.data as AdRow[] | null) ?? []).map((row) => ({ ...row, spend: Number(row.spend) })),
      fx: ((fx.data as FxRow[] | null) ?? []).map((row) => ({ ...row, ars_per_usd: Number(row.ars_per_usd) })),
      team: ((team.data as TeamCostRow[] | null) ?? []).map((row) => ({ ...row, amount: Number(row.amount) })),
      expenses: ((expenses.data as Expense[] | null) ?? []).map((row) => ({ ...row, amount: Number(row.amount) })),
      metaPays: ((metaPays.data as MetaPayRow[] | null) ?? []).map((row) => ({ ...row, amount_usd: Number(row.amount_usd) })),
    },
  }
}

/** Sales, Meta spend, the team and every other expense in one place: what came in, what went out and what was left. */
export function AnalysisAdmin() {
  const [data, setData] = useState<Data>({ sales: [], ads: [], fx: [], team: [], expenses: [], metaPays: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<MetaState>({ connected: null, error: '', syncing: false })

  const load = useCallback(async () => {
    setLoading(true)
    const { data: loaded, error: failed } = await fetchAnalysisData()
    setError(failed)
    setData(loaded)
    setLoading(false)
    return loaded.ads.some((row) => row.source === 'meta')
  }, [])

  // Brings the latest spend from Meta (and today's dólar cripto); the first time, the last 90 days.
  const sync = useCallback(async (days: number) => {
    setMeta((state) => ({ ...state, syncing: true, error: '' }))
    const { data: answer, error: failure } = await supabase.functions.invoke('meta-ads', { body: { days } })
    const body = (answer ?? {}) as { connected?: boolean; error?: string }
    setMeta({ connected: body.connected ?? null, error: failure ? errorMessage(failure) : body.error ?? '', syncing: false })
    return body.connected === true
  }, [])

  useEffect(() => {
    (async () => {
      const hasMeta = await load()
      if (await sync(hasMeta ? 3 : 90)) load()
    })()
  }, [load, sync])

  // A sale loaded (or edited, delivered, deleted), an expense or spend: the numbers update by themselves, without the
  // loading state, and again when the panel comes back to the front.
  useEffect(() => {
    let timer: number | undefined
    const quiet = async () => {
      const { data: loaded, error: failed } = await fetchAnalysisData()
      setError(failed)
      setData(loaded)
    }
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(quiet, 800) }
    const channel = supabase.channel('admin-analysis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_spend' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_payments' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_payments' }, soon)
      .subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') soon() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  return <AnalysisView data={data} loading={loading} error={error} meta={meta} onReload={load} onSync={async () => { if (await sync(7)) load() }} />
}

function AnalysisView({ data, loading, error, meta, onReload, onSync }: { data: Data; loading: boolean; error: string; meta: MetaState; onReload: () => void; onSync: () => void }) {
  const { money } = useHideMoney()
  const [period, setPeriod] = useState<Period>(() => periodOf('mes', today()))
  const [listOpen, setListOpen] = useState(false)
  const current = periodOf(period.kind, today())
  const isCurrent = period.start === current.start

  const meta = useMemo(() => metaCostByDay(data), [data])
  const result = resultOf(period, data, meta)
  const previous = resultOf(shiftPeriod(period, -1), data, meta)
  const sales = salesIn(period, data.sales)
  const campaigns = campaignsIn(period, data.ads, data.fx)
  const points = strongPoints(sales, result, campaigns, money)
  const parts = breakdowns(sales)
  const series = period.kind === 'dia' ? [] : dailySeries(period, data.sales, meta)
  const first = useMemo(() => [...data.sales.map((sale) => dayKey(sale.paid_at).slice(0, 7)), ...data.ads.map((row) => row.day.slice(0, 7))].sort()[0] ?? null, [data])
  const matrix = monthMatrix(monthsSince(first).slice(0, 12), data, meta)
  const expenses = expensesIn(periodOf('mes', `${period.month}-01`), data.expenses, data.fx)
  // "vs septiembre" / "vs la semana anterior"; "12 en septiembre" / "12 la semana anterior".
  const previousName = period.kind === 'mes' ? monthLabel(shiftPeriod(period, -1).month).split(' ')[0].toLowerCase() : period.kind === 'semana' ? 'la semana anterior' : 'el día anterior'
  const previousIn = period.kind === 'mes' ? `en ${previousName}` : previousName

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
          {KINDS.map((kind) => (
            <button key={kind.id} type="button" onClick={() => setPeriod(periodOf(kind.id, isCurrent ? today() : period.start))} className={`rounded-full px-4 py-1.5 font-display text-sm font-bold ${period.kind === kind.id ? 'bg-ciruela text-white' : 'text-piedra hover:text-ciruela'}`}>{kind.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <HideMoneyButton />
          <button type="button" onClick={onReload} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 font-display text-sm font-bold text-piedra hover:text-ciruela" aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Actualizar</span></button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setPeriod(shiftPeriod(period, -1))} className="rounded-full border border-line bg-white p-2 text-piedra hover:text-ciruela" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-center font-display text-xl font-extrabold text-ciruela">{period.label}{isCurrent && <span className="ml-2 rounded-full bg-petalo-wash px-2 py-0.5 align-middle font-display text-[10px] font-bold uppercase tracking-wider text-rosa-deep">En curso</span>}</h2>
        <button type="button" disabled={isCurrent} onClick={() => setPeriod(shiftPeriod(period, 1))} className="rounded-full border border-line bg-white p-2 text-piedra hover:text-ciruela disabled:opacity-30" aria-label="Siguiente"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {error && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

      {/* What came in, what went out, what was left */}
      <section className="overflow-hidden rounded-[32px] bg-ciruela text-white" aria-labelledby="result-title">
        <div className="grid gap-px bg-white/10 sm:grid-cols-3">
          <div className="bg-ciruela p-5">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">Facturaste</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{money(result.revenue)}</p>
            <p className="mt-1 text-sm text-white/75">{number.format(result.sales)} {result.sales === 1 ? 'venta' : 'ventas'} · ticket {result.sales ? money(result.average) : '—'}</p>
          </div>
          <div className="bg-ciruela p-5">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">Invertiste</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{money(Math.round(result.invested))}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-white/75">
              <li>Meta: {money(Math.round(result.ads))}{result.adsUsd ? ` (${usd(result.adsUsd)})` : ''}{result.adsEstimated ? ` · ${money(Math.round(result.adsEstimated))} estimado` : ''}</li>
              <li>Equipo: {money(result.team)} (lo que le pagaste)</li>
              <li>Otros gastos: {money(Math.round(result.other))}{period.kind !== 'mes' ? ' (sin los mensuales)' : ''}</li>
            </ul>
          </div>
          <div className="bg-ciruela p-5">
            <p id="result-title" className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">{result.profit >= 0 ? 'Te quedó' : 'Perdiste'}</p>
            <p className={`mt-1 font-display text-4xl font-extrabold tabular-nums ${result.profit >= 0 ? 'text-petalo' : 'text-white'}`}>{money(Math.round(Math.abs(result.profit)))}</p>
            <p className="mt-1 text-sm text-white/75">{result.margin !== null ? `${percent.format(result.margin)} de lo facturado` : 'Sin ventas en el período'}</p>
            <Compare value={result.profit} before={previous.profit} label={previousName} />
          </div>
        </div>
      </section>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Ventas" value={number.format(result.sales)} note={`${previous.sales} ${previousIn}`} />
        <Tile label="Gasto en Meta" value={result.adsUsd ? usd(result.adsUsd) : money(Math.round(result.ads))} note={result.ads ? `${money(Math.round(result.ads))} en pesos` : 'Sin gasto cargado'} />
        <Tile label="Costo por venta" value={result.costPerSale !== null ? money(Math.round(result.costPerSale)) : '—'} note="Gasto en Meta ÷ ventas" />
        <Tile label="Conversaciones" value={number.format(result.conversations)} note={result.costPerConversation !== null ? `${usd(result.costPerConversation)} cada una` : 'De los anuncios de mensajes'} />
      </div>

      {/* Strong points */}
      <section className={cardClass} aria-labelledby="points-title">
        <h2 id="points-title" className="flex items-center gap-2 font-display text-lg font-bold text-ciruela"><Lightbulb className="h-5 w-5 text-rosa" />Puntos fuertes</h2>
        {points.length === 0 ? <p className="mt-3 text-sm text-piedra">Todavía no hay ventas en este período.</p> : (
          <ul className="mt-3 space-y-2">{points.map((point) => <li key={point} className="flex gap-2 text-sm text-ink"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rosa" />{point}</li>)}</ul>
        )}
      </section>

      {/* Day by day */}
      {series.length > 0 && (
        <section className={cardClass} aria-labelledby="days-title">
          <h2 id="days-title" className="font-display text-lg font-bold text-ciruela">Día por día</h2>
          <p className="text-sm text-piedra">Cuántas ventas hubo cada día (número), lo que cobraste (barra) y lo que costó Meta (línea).</p>
          <DayBars series={series} money={money} onPick={(day) => setPeriod(periodOf('dia', day))} />
        </section>
      )}

      {/* Breakdowns */}
      {sales.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Breakdown title="Qué se vendió" rows={parts.products.map((row) => ({ label: row.name, detail: `${row.units} u.`, value: row.revenue, share: row.share }))} money={money} />
          <Breakdown title="De dónde vinieron" rows={parts.origins.map((row) => ({ label: row.label, detail: `${row.sales} ${row.sales === 1 ? 'venta' : 'ventas'}`, value: row.revenue, share: row.share }))} money={money} />
          <Breakdown title="Por dónde compraron" rows={[...parts.channels, ...parts.payments].map((row) => ({ label: row.label, detail: `${row.sales} ${row.sales === 1 ? 'venta' : 'ventas'}`, value: row.revenue, share: row.share }))} money={money} icon />
          {period.kind !== 'dia' && <Breakdown title="Qué día de la semana" rows={parts.weekdays.map((row) => ({ label: row.label, detail: `${row.sales} ${row.sales === 1 ? 'venta' : 'ventas'}`, value: row.revenue, share: row.share }))} money={money} />}
        </div>
      )}

      <WeeklyReview money={money} />

      {/* Campaigns */}
      <section className={cardClass} aria-labelledby="ads-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="ads-title" className="font-display text-lg font-bold text-ciruela">Anuncios de Meta</h2>
            <p className="text-sm text-piedra">
              {meta.connected === true ? 'Conectado: se actualiza solo cada 3 horas.' : meta.connected === false ? 'Todavía no está conectado: cargalo a mano o conectalo (abajo).' : 'Revisando la conexión…'}
              {' '}En pesos con el dólar cripto del día (el que sigue ARQ).
            </p>
          </div>
          {meta.connected && <Button variant="secondary" busy={meta.syncing} onClick={onSync}><RefreshCw className="h-4 w-4" />Traer de Meta</Button>}
        </div>
        {meta.error && <p className="mt-3 rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep">Meta respondió: {meta.error}</p>}
        {campaigns.length === 0 ? <p className="mt-4 text-sm text-piedra">Sin gasto cargado en este período.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-piedra"><th className="pb-2 font-semibold">Campaña</th><th className="pb-2 text-right font-semibold">Gasto</th><th className="pb-2 text-right font-semibold">En pesos</th><th className="pb-2 text-right font-semibold">Conversaciones</th><th className="pb-2 text-right font-semibold">c/u</th></tr></thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr key={row.name} className="border-t border-line">
                    <td className="py-2 pr-3 text-ink">{row.name}</td>
                    <td className="py-2 text-right tabular-nums">{usd(row.spendUsd)}</td>
                    <td className="py-2 text-right tabular-nums">{money(Math.round(row.pesos))}</td>
                    <td className="py-2 text-right tabular-nums">{number.format(row.conversations)}</td>
                    <td className="py-2 text-right tabular-nums">{row.conversations ? usd(row.spendUsd / row.conversations) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta.connected === false && <ManualSpend onSaved={onReload} />}
        {meta.connected === false && <ConnectSteps />}
      </section>

      {/* Expenses */}
      <section className={cardClass} aria-labelledby="expenses-title">
        <h2 id="expenses-title" className="font-display text-lg font-bold text-ciruela">Gastos de {monthLabel(period.month).toLowerCase()}</h2>
        <p className="text-sm text-piedra">Todo lo que sale: Meta y el equipo se suman solos; el resto lo cargás acá (una vez o todos los meses).</p>
        <ExpensesList month={period.month} result={resultOf(periodOf('mes', `${period.month}-01`), data, meta)} expenses={expenses} money={money} onChanged={onReload} />
        <ExpenseForm onSaved={onReload} />
      </section>

      {/* Month by month */}
      <section className={cardClass} aria-labelledby="matrix-title">
        <h2 id="matrix-title" className="font-display text-lg font-bold text-ciruela">Mes a mes</h2>
        <p className="text-sm text-piedra">Cuánto facturaste, cuánto invertiste y cuánto te quedó cada mes.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-piedra"><th className="pb-2 font-semibold">Mes</th><th className="pb-2 text-right font-semibold">Ventas</th><th className="pb-2 text-right font-semibold">Facturado</th><th className="pb-2 text-right font-semibold">Meta</th><th className="pb-2 text-right font-semibold">Equipo</th><th className="pb-2 text-right font-semibold">Otros</th><th className="pb-2 text-right font-semibold">Ganancia</th><th className="pb-2 text-right font-semibold">Margen</th></tr></thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.month} className={`border-t border-line ${row.month === period.month ? 'bg-petalo-wash/60' : ''}`}>
                  <td className="py-2 pr-3"><button type="button" onClick={() => setPeriod(periodOf('mes', `${row.month}-01`))} className="font-semibold text-ink hover:text-rosa-deep">{shortMonthLabel(row.month)} {row.month.slice(0, 4)}</button></td>
                  <td className="py-2 text-right tabular-nums">{row.sales}</td>
                  <td className="py-2 text-right tabular-nums">{money(row.revenue)}</td>
                  <td className="py-2 text-right tabular-nums">{money(Math.round(row.ads))}</td>
                  <td className="py-2 text-right tabular-nums">{money(row.team)}</td>
                  <td className="py-2 text-right tabular-nums">{money(Math.round(row.other))}</td>
                  <td className={`py-2 text-right font-bold tabular-nums ${row.profit >= 0 ? 'text-ciruela' : 'text-rosa-deep'}`}>{money(Math.round(row.profit))}</td>
                  <td className="py-2 text-right tabular-nums text-piedra">{row.margin !== null ? percent.format(row.margin) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-piedra">Equipo: lo que paga cada CV terminado en ese mes (aunque se lo pagues después). Meta: al dólar cripto del día. Los meses sin gasto cargado muestran la ganancia sin publicidad.</p>
      </section>

      {/* Every sale of the period */}
      <section className={cardClass}>
        <button type="button" onClick={() => setListOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={listOpen}>
          <span className="font-display text-lg font-bold text-ciruela">Todas las ventas ({sales.length})</span>
          <ChevronDown className={`h-5 w-5 text-piedra transition-transform ${listOpen || period.kind === 'dia' ? 'rotate-180' : ''}`} />
        </button>
        {(listOpen || period.kind === 'dia') && (sales.length === 0 ? <p className="mt-3 text-sm text-piedra">Sin ventas.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {[...sales].sort((a, b) => b.paid_at.localeCompare(a.paid_at)).map((sale) => (
              <li key={sale.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">#{sale.number} · {sale.customer_name ?? 'Cliente'}</span>
                  <span className="block truncate text-xs text-piedra">{new Date(sale.paid_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })} · {sale.order_items.map((item) => item.product_name).join(' + ')} · {sale.source === 'whatsapp' ? 'WhatsApp' : 'Web'}</span>
                </span>
                <span className="shrink-0 font-display font-bold tabular-nums text-ciruela">{money(sale.total)}</span>
              </li>
            ))}
          </ul>
        ))}
      </section>
    </div>
  )
}

function Compare({ value, before, label }: { value: number; before: number; label: string }) {
  if (!before) return null
  const diff = value - before
  return <p className="mt-2 text-xs text-white/70">{diff >= 0 ? '▲' : '▼'} {percent.format(Math.abs(diff / before))} vs {label}</p>
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)] sm:p-5">
      <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-piedra sm:text-xs">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ciruela">{value}</p>
      <p className="mt-0.5 text-xs text-piedra">{note}</p>
    </div>
  )
}

function DayBars({ series, money, onPick }: { series: ReturnType<typeof dailySeries>; money: (value: number) => string; onPick: (day: string) => void }) {
  const max = Math.max(...series.map((day) => Math.max(day.revenue, day.ads)), 1)
  // Sales per day: the days already lived in the period (today included), the average and the best day.
  const lived = series.filter((day) => day.day <= today())
  const total = lived.reduce((sum, day) => sum + day.sales, 0)
  const best = lived.reduce<(typeof series)[number] | null>((top, day) => (day.sales > (top?.sales ?? 0) ? day : top), null)
  const withSales = lived.filter((day) => day.sales > 0).length
  const stats = [
    { label: 'Ventas', value: String(total) },
    { label: 'Promedio por día', value: lived.length ? (total / lived.length).toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '0' },
    { label: 'Mejor día', value: best ? `${best.label} · ${best.sales}` : '—' },
    { label: 'Días con ventas', value: `${withSales} de ${lived.length}` },
  ]
  return (
    <>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => <div key={stat.label} className="rounded-2xl bg-papel px-3 py-2"><dt className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">{stat.label}</dt><dd className="font-display text-lg font-extrabold text-ciruela">{stat.value}</dd></div>)}
      </dl>
      <div className="mt-4 overflow-x-auto">
        <div className="flex h-44 min-w-[480px] items-end gap-1 border-b border-line" role="img" aria-label="Ventas y gasto en Meta por día">
          {series.map((day) => (
            <button key={day.day} type="button" onClick={() => onPick(day.day)} className="group relative flex h-full flex-1 flex-col justify-end" title={`${day.label}: ${money(day.revenue)} · ${day.sales} ${day.sales === 1 ? 'venta' : 'ventas'} · Meta ${money(Math.round(day.ads))}`}>
              {day.sales > 0 && <span className="mb-0.5 text-center font-display text-[10px] font-bold leading-none text-ciruela">{day.sales}</span>}
              <span className="mx-auto w-full max-w-8 rounded-t-[3px] bg-petalo group-hover:bg-rosa" style={{ height: `${Math.max((day.revenue / max) * 88, day.revenue ? 2 : 0)}%` }} />
              {day.ads > 0 && <span className="absolute inset-x-0 mx-auto h-0.5 w-full max-w-8 bg-ciruela" style={{ bottom: `${(day.ads / max) * 88}%` }} />}
            </button>
          ))}
        </div>
        <div className="mt-1 flex min-w-[480px] gap-1">{series.map((day, index) => <span key={day.day} className="flex-1 text-center text-[10px] text-piedra">{series.length <= 7 || index % 3 === 0 ? day.label : ''}</span>)}</div>
        <p className="mt-2 text-xs text-piedra">Tocá un día para ver su detalle.</p>
      </div>
    </>
  )
}

function Breakdown({ title, rows, money, icon }: { title: string; rows: { label: string; detail: string; value: number; share: number }[]; money: (value: number) => string; icon?: boolean }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <section className={cardClass}>
      <h2 className="font-display text-base font-bold text-ciruela">{title}</h2>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{icon && row.label === 'WhatsApp' && <WhatsAppIcon className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-whatsapp" />}{row.label}</span>
              <span className="shrink-0 text-piedra">{row.detail} · {money(row.value)} · {row.share}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-papel"><div className="h-2 rounded-full bg-rosa" style={{ width: `${(row.value / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ExpensesList({ month, result, expenses, money, onChanged }: { month: string; result: ReturnType<typeof resultOf>; expenses: ReturnType<typeof expensesIn>; money: (value: number) => string; onChanged: () => void }) {
  const flash = useFlash()
  async function remove(expense: Expense) {
    const text = expense.monthly
      ? `¿Dejar de contar "${expense.concept}" desde ${monthLabel(month).toLowerCase()}? Los meses anteriores quedan igual.`
      : `¿Borrar el gasto "${expense.concept}"?`
    if (!window.confirm(text)) return
    // A monthly expense stops (the months before keep it); a one-off one is deleted.
    const previousMonthEnd = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 0)).toISOString().slice(0, 10)
    const { error } = expense.monthly && expense.day.slice(0, 7) < month
      ? await supabase.from('expenses').update({ until: previousMonthEnd }).eq('id', expense.id)
      : await supabase.from('expenses').delete().eq('id', expense.id)
    if (error) { flash.show('error', errorMessage(error)); return }
    onChanged()
  }
  return (
    <div className="mt-4">
      <ul className="divide-y divide-line text-sm">
        <li className="flex items-center justify-between gap-3 py-2"><span className="text-ink">Publicidad en Meta <span className="text-xs text-piedra">(lo que te cobró{result.adsEstimated ? '; lo último, estimado' : ''})</span></span><span className="font-semibold tabular-nums">{money(Math.round(result.ads))}</span></li>
        <li className="flex items-center justify-between gap-3 py-2"><span className="text-ink">Equipo <span className="text-xs text-piedra">(pagos y adelantos que le diste: {result.teamPayments})</span></span><span className="font-semibold tabular-nums">{money(result.team)}</span></li>
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block truncate text-ink">{expense.concept}</span>
              <span className="block text-xs text-piedra">{EXPENSE_CATEGORY[expense.category]}{expense.monthly ? ' · todos los meses' : ''}{expense.currency === 'USD' ? ` · ${usd(expense.amount)}` : ''}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-semibold tabular-nums">{money(Math.round(expense.pesos))}</span>
              <button type="button" onClick={() => remove(expense)} className="rounded-full p-1.5 text-piedra hover:bg-papel hover:text-rosa-deep" aria-label={`Quitar ${expense.concept}`}><Trash2 className="h-4 w-4" /></button>
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-2 font-bold text-ciruela"><span>Total invertido</span><span className="tabular-nums">{money(Math.round(result.invested))}</span></li>
      </ul>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </div>
  )
}

function ExpenseForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ concept: '', category: 'herramientas' as ExpenseCategory, amount: '', currency: 'ARS' as 'ARS' | 'USD', day: today(), monthly: false })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }))

  async function save() {
    const amount = Number(form.amount.replace(/\./g, '').replace(',', '.'))
    if (!form.concept.trim() || !(amount > 0)) { flash.show('error', 'Poné un concepto y un monto.'); return }
    setBusy(true)
    const { error } = await supabase.from('expenses').insert({ concept: form.concept.trim(), category: form.category, amount, currency: form.currency, day: form.day, monthly: form.monthly })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setForm({ concept: '', category: form.category, amount: '', currency: 'ARS', day: today(), monthly: false })
    setOpen(false)
    onSaved()
  }

  if (!open) return <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Cargar un gasto</Button>
  return (
    <div className="mt-4 grid gap-3 rounded-2xl bg-papel/60 p-4 sm:grid-cols-2">
      <Field label="Concepto"><input value={form.concept} onChange={(event) => set({ concept: event.target.value })} placeholder="Ej: Canva Pro, dominio, monotributo" className={inputClass} /></Field>
      <Field label="Tipo">
        <select value={form.category} onChange={(event) => set({ category: event.target.value as ExpenseCategory })} className={inputClass}>
          {Object.entries(EXPENSE_CATEGORY).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </Field>
      <Field label="Monto">
        <div className="mt-1 flex gap-2">
          <select value={form.currency} onChange={(event) => set({ currency: event.target.value as 'ARS' | 'USD' })} aria-label="Moneda" className={`${inputClass} mt-0 w-24`}><option value="ARS">$</option><option value="USD">US$</option></select>
          <input value={form.amount} onChange={(event) => set({ amount: event.target.value })} inputMode="decimal" placeholder="0" className={`${inputClass} mt-0`} />
        </div>
      </Field>
      <Field label="Fecha"><input type="date" value={form.day} onChange={(event) => set({ day: event.target.value })} className={inputClass} /></Field>
      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2"><input type="checkbox" checked={form.monthly} onChange={(event) => set({ monthly: event.target.checked })} className="h-4 w-4 accent-rosa" />Se repite todos los meses (suscripciones, monotributo…)</label>
      <div className="flex gap-2 sm:col-span-2">
        <Button busy={busy} onClick={save}>Guardar gasto</Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
      {flash.node && <div className="sm:col-span-2">{flash.node}</div>}
    </div>
  )
}

/** Until Meta is connected: what Ads Manager shows as spent, for one day or a whole week (split evenly by day). */
function ManualSpend({ onSaved }: { onSaved: () => void }) {
  const [from, setFrom] = useState(() => dayKey(new Date(Date.now() - 7 * 864e5)))
  const [until, setUntil] = useState(() => dayKey(new Date(Date.now() - 864e5)))
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save() {
    const spend = Number(amount.replace(',', '.'))
    if (!(spend >= 0) || amount.trim() === '') { flash.show('error', 'Poné lo que gastaste en dólares.'); return }
    if (until < from) { flash.show('error', 'La fecha "hasta" tiene que ser igual o posterior a "desde".'); return }
    const days: string[] = []
    for (let key = from; key <= until; key = new Date(new Date(`${key}T00:00:00Z`).getTime() + 864e5).toISOString().slice(0, 10)) days.push(key)
    const perDay = Math.round((spend / days.length) * 100) / 100
    setBusy(true)
    const { error } = await supabase.from('ad_spend').upsert(days.map((day) => ({ day, campaign_id: 'manual', campaign_name: 'Cargado a mano', spend: perDay, currency: 'USD', source: 'manual', updated_at: new Date().toISOString() })))
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setAmount('')
    flash.show('ok', days.length > 1 ? `Guardado: ${days.length} días de US$${perDay.toFixed(2)}.` : 'Gasto guardado.')
    onSaved()
  }
  return (
    <div className="mt-4 rounded-2xl bg-papel/60 p-4">
      <p className="text-sm font-semibold text-ink">Cargar el gasto a mano (un día o la semana entera)</p>
      <p className="text-xs text-piedra">En el Administrador de anuncios elegí las fechas arriba a la derecha (por ejemplo &quot;Últimos 7 días&quot;) y copiá el total de la columna &quot;Importe gastado&quot;. Se reparte igual entre los días; si volvés a cargar los mismos días, se reemplaza.</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-xs text-piedra">Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={`${inputClass} w-auto`} /></label>
        <label className="text-xs text-piedra">Hasta<input type="date" value={until} onChange={(event) => setUntil(event.target.value)} className={`${inputClass} w-auto`} /></label>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="US$ gastados" aria-label="Gasto en dólares" className={`${inputClass} mt-0 w-36`} />
        <Button busy={busy} onClick={save}>Guardar</Button>
      </div>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </div>
  )
}

function ConnectSteps() {
  return (
    <details className="mt-4 rounded-2xl border border-line p-4 text-sm text-ink">
      <summary className="cursor-pointer font-semibold text-ciruela">Conectar Meta para que se cargue solo (una sola vez)</summary>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5">
        <li>Entrá a business.facebook.com → Configuración → Usuarios → <b>Usuarios del sistema</b> → Agregar (nombre &quot;Panel Armado de CV&quot;, rol Empleado).</li>
        <li>Tocá <b>Asignar activos</b> → Cuentas publicitarias → tu cuenta → permiso <b>Ver rendimiento</b>.</li>
        <li>Si no tenés una app de Meta, creala en developers.facebook.com (tipo <b>Empresa</b>, conectada a tu portfolio).</li>
        <li>Tocá <b>Generar token</b>, elegí la app, vencimiento <b>Nunca</b> y marcá solo <b>ads_read</b>. Copiá el token.</li>
        <li>En Supabase → Edge Functions → Secrets, creá <b>META_ADS_TOKEN</b> y pegá el token ahí (no lo mandes por chat).</li>
        <li>Volvé a esta pestaña: trae solo los últimos 90 días.</li>
      </ol>
    </details>
  )
}

type Review = {
  week: string
  created_at: string
  advice: { kind: 'semaforo' | 'bajar' | 'pausar' | 'subir' | 'ok' | 'ventas' | 'conectar'; text: string }[]
  stats: { since: string; until: string; cap: number; budget: number; spendUsd: number; spendArs: number; conversations: number; sales: number; revenue: number; campaigns: { id: string; name: string; spend: number; conversations: number; perConversation: number | null; budget: number | null; active: boolean }[] }
}
const ADVICE_TONE: Record<Review['advice'][number]['kind'], string> = {
  semaforo: 'bg-ciruela text-white', bajar: 'bg-rosa text-white', pausar: 'bg-petalo-wash text-rosa-deep', subir: 'bg-whatsapp/15 text-whatsapp', ok: 'bg-whatsapp/15 text-whatsapp', ventas: 'bg-arena text-ciruela', conectar: 'bg-papel text-piedra',
}
const ADVICE_LABEL: Record<Review['advice'][number]['kind'], string> = { semaforo: 'Semáforo', bajar: 'Bajar', pausar: 'Pausar', subir: 'Subir', ok: 'Bien', ventas: 'Ventas', conectar: 'Conectar' }

/** Mondays at 9 the ads are reviewed (and the summary arrives as a notification); "Revisar ahora" runs it any day. */
function WeeklyReview({ money }: { money: (value: number) => string }) {
  const [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  const load = useCallback(async () => {
    const { data } = await supabase.from('ad_reviews').select('week, created_at, advice, stats').order('week', { ascending: false }).limit(1).maybeSingle()
    setReview((data as Review | null) ?? null)
  }, [])
  useEffect(() => { load() }, [load])

  async function runNow() {
    setBusy(true)
    const { error } = await supabase.functions.invoke('meta-ads', { body: { days: 7, review: true } })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    load()
  }

  const active = review?.stats.campaigns.filter((row) => row.active) ?? []
  return (
    <section className={cardClass} aria-labelledby="review-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="review-title" className="font-display text-lg font-bold text-ciruela">Revisión semanal de anuncios</h2>
          <p className="text-sm text-piedra">Todos los lunes a las 9 te llega al celu. Mira los últimos 7 días y te dice qué pausar, bajar o subir sin pasar tu tope.</p>
        </div>
        <Button variant="secondary" busy={busy} onClick={runNow}><RefreshCw className="h-4 w-4" />Revisar ahora</Button>
      </div>
      {!review ? <p className="mt-4 text-sm text-piedra">Todavía no hay revisiones.</p> : (
        <>
          <p className="mt-3 text-xs text-piedra">Del {review.stats.since.slice(8)}/{review.stats.since.slice(5, 7)} al {review.stats.until.slice(8)}/{review.stats.until.slice(5, 7)} (sin hoy) · revisado el {new Date(review.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}</p>
          <ul className="mt-3 space-y-2">
            {review.advice.map((item) => (
              <li key={item.text} className="flex items-start gap-2 text-sm text-ink">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${ADVICE_TONE[item.kind]}`}>{ADVICE_LABEL[item.kind]}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <p><span className="block text-xs text-piedra">Gasto (7 días)</span><b className="tabular-nums">{usd(review.stats.spendUsd)}</b></p>
            <p><span className="block text-xs text-piedra">Ventas (7 días)</span><b className="tabular-nums">{review.stats.sales} · {money(review.stats.revenue)}</b></p>
            <p><span className="block text-xs text-piedra">Conversaciones</span><b className="tabular-nums">{review.stats.conversations}</b></p>
            <p><span className="block text-xs text-piedra">Presupuesto activo</span><b className="tabular-nums">{review.stats.budget ? `${usd(review.stats.budget)} / ${usd(review.stats.cap)} por día` : '—'}</b></p>
          </div>
          {active.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-sm">
              {active.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate text-ink">{row.name}</span>
                  <span className="shrink-0 text-piedra">{row.budget ? `${usd(row.budget)}/día · ` : ''}{row.perConversation !== null ? `${usd(row.perConversation)} c/conversación` : 'sin conversaciones'}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </section>
  )
}
