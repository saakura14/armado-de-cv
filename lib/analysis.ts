// Numbers for the "Análisis" tab: what was sold (by day, week or month), what it cost (Meta ads, the team and every
// other expense) and what was left, plus the strong points of the period.
import { ORIGIN_LABEL, bestSellers, dayKey, monthKey, monthLabel, shiftMonth, type Sale } from './dashboard'
import type { OrderExtra } from './orders'

export type AnalysisSale = Sale & { created_at: string; order_items: (Sale['order_items'][number] & { extras: OrderExtra[] })[] }
export const ANALYSIS_SALE_SELECT = 'id, number, status, total, paid_at, created_at, payment_method, customer_name, source, origin, order_items(product_id, product_name, line_total, extras)'

export type AdRow = { day: string; campaign_id: string; campaign_name: string; spend: number; conversations: number; clicks: number; impressions: number; currency: string; source: 'meta' | 'manual' }
export type FxRow = { day: string; ars_per_usd: number }
export type TeamCostRow = { finished_at: string | null; rate: number; status: string }
export type ExpenseCategory = 'publicidad' | 'herramientas' | 'servicios' | 'impuestos' | 'equipo' | 'otros'
export type Expense = { id: string; day: string; category: ExpenseCategory; concept: string; amount: number; currency: 'ARS' | 'USD'; monthly: boolean; until: string | null }

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  publicidad: 'Otra publicidad', herramientas: 'Herramientas y apps', servicios: 'Servicios (web, dominio, mails)', impuestos: 'Impuestos y monotributo', equipo: 'Equipo (extra)', otros: 'Otros',
}


// ---- Periods (Argentine calendar, end exclusive) ----

export type PeriodKind = 'dia' | 'semana' | 'mes'
export type Period = { kind: PeriodKind; start: string; end: string; label: string; month: string }

const DAY = 24 * 60 * 60 * 1000
const toDate = (key: string) => new Date(`${key}T00:00:00Z`)
const toKey = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (key: string, days: number) => toKey(new Date(toDate(key).getTime() + days * DAY))
const dayFormat = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const shortFormat = (key: string) => { const date = toDate(key); return `${date.getUTCDate()}/${date.getUTCMonth() + 1}` }
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function periodOf(kind: PeriodKind, day: string): Period {
  if (kind === 'dia') return { kind, start: day, end: addDays(day, 1), label: capitalize(dayFormat.format(toDate(day))), month: day.slice(0, 7) }
  if (kind === 'semana') {
    const monday = addDays(day, -((toDate(day).getUTCDay() + 6) % 7))
    return { kind, start: monday, end: addDays(monday, 7), label: `Semana del ${shortFormat(monday)} al ${shortFormat(addDays(monday, 6))}`, month: monday.slice(0, 7) }
  }
  const month = day.slice(0, 7)
  return { kind, start: `${month}-01`, end: `${shiftMonth(month, 1)}-01`, label: monthLabel(month), month }
}

/** The period before or after (same kind). */
export function shiftPeriod(period: Period, delta: number): Period {
  if (period.kind === 'dia') return periodOf('dia', addDays(period.start, delta))
  if (period.kind === 'semana') return periodOf('semana', addDays(period.start, 7 * delta))
  return periodOf('mes', `${shiftMonth(period.month, delta)}-01`)
}

const inPeriod = (key: string, period: Period) => key >= period.start && key < period.end
export const daysOf = (period: Period) => { const list: string[] = []; for (let key = period.start; key < period.end; key = addDays(key, 1)) list.push(key); return list }

// ---- Money in and out ----

/** Pesos per dollar for a day: the last saved rate on or before it (or the first one ever, for older days). */
export function rateFor(day: string, fx: FxRow[]) {
  let rate: number | null = null
  for (const row of fx) { if (row.day <= day) rate = row.ars_per_usd; else break }
  return rate ?? fx[0]?.ars_per_usd ?? null
}

/** Meta spend in pesos, from the account currency. She pays in dollars bought with ARQ (no IVA on the charge). */
export function adPesos(row: AdRow, fx: FxRow[]) {
  const rate = row.currency === 'ARS' ? 1 : rateFor(row.day, fx) ?? 0
  return row.spend * rate
}

/** Expenses that fall in the period: one-off ones by date; monthly ones once per month they run (only in month view). */
export function expensesIn(period: Period, expenses: Expense[], fx: FxRow[]) {
  return expenses.flatMap((expense) => {
    const repeats = expense.monthly && period.kind === 'mes' && expense.day.slice(0, 7) <= period.month && (!expense.until || expense.until.slice(0, 7) >= period.month)
    const once = !expense.monthly && inPeriod(expense.day, period)
    if (!repeats && !once) return []
    const day = repeats ? (period.month === expense.day.slice(0, 7) ? expense.day : period.start) : expense.day
    const pesos = expense.currency === 'USD' ? expense.amount * (rateFor(day, fx) ?? 0) : expense.amount
    return [{ ...expense, pesos }]
  })
}

export type Result = {
  sales: number; revenue: number; average: number
  adsUsd: number; ads: number; conversations: number; clicks: number
  team: number; teamPacks: number; other: number
  invested: number; profit: number; margin: number | null
  costPerSale: number | null; returnPerPeso: number | null; costPerConversation: number | null
}

export function resultOf(period: Period, data: { sales: AnalysisSale[]; ads: AdRow[]; fx: FxRow[]; team: TeamCostRow[]; expenses: Expense[] }): Result {
  const sales = data.sales.filter((sale) => inPeriod(dayKey(sale.paid_at), period))
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const ads = data.ads.filter((row) => inPeriod(row.day, period))
  const adsPesos = ads.reduce((sum, row) => sum + adPesos(row, data.fx), 0)
  const adsUsd = ads.filter((row) => row.currency !== 'ARS').reduce((sum, row) => sum + row.spend, 0)
  const conversations = ads.reduce((sum, row) => sum + row.conversations, 0)
  // The team costs what each CV pays, the day it was finished (paid later or not).
  const packs = data.team.filter((task) => task.status === 'terminado' && task.finished_at && inPeriod(dayKey(task.finished_at), period))
  const team = packs.reduce((sum, task) => sum + task.rate, 0)
  const other = expensesIn(period, data.expenses, data.fx).reduce((sum, expense) => sum + expense.pesos, 0)
  const invested = adsPesos + team + other
  return {
    sales: sales.length, revenue, average: sales.length ? Math.round(revenue / sales.length) : 0,
    adsUsd, ads: adsPesos, conversations, clicks: ads.reduce((sum, row) => sum + row.clicks, 0),
    team, teamPacks: packs.length, other, invested,
    profit: revenue - invested,
    margin: revenue ? (revenue - invested) / revenue : null,
    costPerSale: sales.length && adsPesos ? adsPesos / sales.length : null,
    returnPerPeso: adsPesos ? revenue / adsPesos : null,
    costPerConversation: conversations ? adsUsd / conversations : null,
  }
}

/** Every day of the period with what came in and what Meta cost (for the bars). */
export function dailySeries(period: Period, sales: AnalysisSale[], ads: AdRow[], fx: FxRow[]) {
  return daysOf(period).map((day) => {
    const daySales = sales.filter((sale) => dayKey(sale.paid_at) === day)
    return {
      day,
      label: shortFormat(day),
      sales: daySales.length,
      revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
      ads: ads.filter((row) => row.day === day).reduce((sum, row) => sum + adPesos(row, fx), 0),
    }
  })
}

/** Month by month: what came in, what went out and what was left. */
export function monthMatrix(months: string[], data: Parameters<typeof resultOf>[1]) {
  return months.map((month) => ({ month, ...resultOf(periodOf('mes', `${month}-01`), data) }))
}

export function campaignsIn(period: Period, ads: AdRow[], fx: FxRow[]) {
  const map = new Map<string, { name: string; spendUsd: number; pesos: number; conversations: number; clicks: number }>()
  for (const row of ads.filter((item) => inPeriod(item.day, period))) {
    const current = map.get(row.campaign_id) ?? { name: row.campaign_name, spendUsd: 0, pesos: 0, conversations: 0, clicks: 0 }
    current.spendUsd += row.currency === 'ARS' ? 0 : row.spend
    current.pesos += adPesos(row, fx)
    current.conversations += row.conversations
    current.clicks += row.clicks
    map.set(row.campaign_id, current)
  }
  return [...map.values()].sort((a, b) => b.pesos - a.pesos)
}

// ---- Strong points ----

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const share = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0)

export function salesIn(period: Period, sales: AnalysisSale[]) {
  return sales.filter((sale) => inPeriod(dayKey(sale.paid_at), period))
}

export function breakdowns(sales: AnalysisSale[]) {
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const group = (key: (sale: AnalysisSale) => string) => {
    const map = new Map<string, { label: string; sales: number; revenue: number }>()
    for (const sale of sales) {
      const label = key(sale)
      const row = map.get(label) ?? { label, sales: 0, revenue: 0 }
      row.sales += 1
      row.revenue += sale.total
      map.set(label, row)
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).map((row) => ({ ...row, share: share(row.revenue, revenue) }))
  }
  const extras = new Map<string, number>()
  for (const sale of sales) for (const item of sale.order_items) for (const extra of item.extras ?? []) extras.set(extra.label.split(':')[0], (extras.get(extra.label.split(':')[0]) ?? 0) + 1)
  return {
    products: bestSellers(sales).map((row) => ({ ...row, share: share(row.revenue, revenue) })),
    channels: group((sale) => (sale.source === 'whatsapp' ? 'WhatsApp' : 'Web')),
    origins: group((sale) => (sale.origin ? ORIGIN_LABEL[sale.origin] : 'Sin dato')),
    payments: group((sale) => (sale.payment_method === 'card' ? 'Tarjeta (Ualá)' : 'Transferencia')),
    weekdays: group((sale) => capitalize(WEEKDAYS[toDate(dayKey(sale.paid_at)).getUTCDay()])),
    extras: [...extras.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
  }
}

/** Plain sentences with what sold best in the period, from the breakdowns. */
export function strongPoints(sales: AnalysisSale[], result: Result, campaigns: ReturnType<typeof campaignsIn>, money: (value: number) => string) {
  if (!sales.length) return []
  const { products, channels, origins, weekdays, extras } = breakdowns(sales)
  const points: string[] = []
  // Products come sorted by units: the first one sells the most; the one that brings the most money may be another.
  const byUnits = products[0]
  const byMoney = [...products].sort((a, b) => b.revenue - a.revenue)[0]
  if (byUnits) points.push(`${byUnits.name} es lo que más sale: ${byUnits.units} ${byUnits.units === 1 ? 'venta' : 'ventas'} (${byUnits.share}% de lo facturado).`)
  if (byMoney && byMoney.name !== byUnits?.name) points.push(`${byMoney.name} es lo que más plata trae: ${money(byMoney.revenue)} (${byMoney.share}%).`)
  if (channels[0]) points.push(`${channels[0].label} trae el ${channels[0].share}% de las ventas en plata.`)
  const known = origins.filter((row) => row.label !== 'Sin dato')
  if (known[0]) points.push(`El origen que más vende es ${known[0].label.toLowerCase()} (${known[0].sales} ${known[0].sales === 1 ? 'venta' : 'ventas'}).`)
  if (weekdays.length > 1) points.push(`El día que más se vende es el ${weekdays[0].label.toLowerCase()} (${money(weekdays[0].revenue)}).`)
  if (extras[0]) points.push(`El adicional más pedido es ${extras[0].label} (${extras[0].count}).`)
  if (result.returnPerPeso) points.push(`Cada $1.000 que pusiste en Meta volvió como ${money(Math.round(result.returnPerPeso * 1000))} en ventas.`)
  const cheapest = campaigns.filter((row) => row.conversations >= 3).sort((a, b) => a.spendUsd / a.conversations - b.spendUsd / b.conversations)[0]
  if (cheapest) points.push(`La campaña con la conversación más barata es "${cheapest.name}" (US$${(cheapest.spendUsd / cheapest.conversations).toFixed(2)} cada una).`)
  return points
}

/** Months from the first sale (or spend) to today, newest first. */
export function monthsSince(first: string | null, now = new Date()) {
  const current = monthKey(now)
  const start = first && first < current ? first : current
  const list: string[] = []
  for (let key = current; key >= start; key = shiftMonth(key, -1)) list.push(key)
  return list
}
