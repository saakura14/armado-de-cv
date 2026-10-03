// Numbers for the admin home: sales, revenue, visits, best sellers and delivery deadlines.
import type { Order } from './orders'

/** Test orders made from the admin account start at #90000 and never count as sales. */
export const isTestOrder = (order: { number: number }) => order.number >= 90000

export type Sale = {
  id: string
  number: number
  status: Order['status']
  total: number
  paid_at: string
  payment_method: Order['payment_method']
  customer_name: string | null
  source: 'web' | 'whatsapp'
  order_items: { product_id: string; product_name: string; line_total: number }[]
}

export const SALE_SELECT = 'id, number, status, total, paid_at, payment_method, customer_name, source, order_items(product_id, product_name, line_total)'

export type VisitRow = { day: string; path: string; visits: number; views: number }
export type EventRow = { day: string; event: 'lo_quiero' | 'checkout'; count: number }

export type FunnelStep = { label: string; hint: string; value: number }

/** Where people drop between arriving and paying, for one month. Web steps count browser sessions. */
export function funnel(key: string, visits: VisitRow[], events: EventRow[], created: string[], sales: Sale[]): FunnelStep[] {
  const sum = (rows: { count: number }[]) => rows.reduce((total, row) => total + row.count, 0)
  const inMonth = events.filter((row) => row.day.startsWith(key))
  return [
    { label: 'Entraron a la web', hint: 'visitas', value: visits.filter((row) => row.day.startsWith(key)).reduce((total, row) => total + row.visits, 0) },
    { label: 'Tocaron "Lo quiero"', hint: 'miraron un producto', value: sum(inMonth.filter((row) => row.event === 'lo_quiero')) },
    { label: 'Llegaron a comprar', hint: 'cuenta y datos', value: sum(inMonth.filter((row) => row.event === 'checkout')) },
    { label: 'Confirmaron el pedido', hint: 'pedidos creados', value: created.filter((date) => monthKey(date) === key).length },
    { label: 'Pagaron', hint: 'ventas de la web', value: sales.filter((sale) => sale.source !== 'whatsapp' && monthKey(sale.paid_at) === key).length },
  ]
}

// ---- Dates in Argentina (UTC-3 all year, no daylight saving) ----

const AR_OFFSET = 3 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

/** The Argentine calendar date of a moment, as a UTC-midnight Date (easy to add days to). */
function arDay(moment: Date) {
  const shifted = new Date(moment.getTime() - AR_OFFSET)
  return { day: new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())), hour: shifted.getUTCHours() }
}

/** 'YYYY-MM' of a moment in Argentina. */
export function monthKey(value: string | Date) {
  return arDay(new Date(value)).day.toISOString().slice(0, 7)
}

export function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)
}

const monthFormat = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortMonthFormat = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
export const monthLabel = (key: string) => capitalize(monthFormat.format(new Date(`${key}-01T00:00:00Z`)))
export const shortMonthLabel = (key: string) => capitalize(shortMonthFormat.format(new Date(`${key}-01T00:00:00Z`)).replace('.', ''))

// ---- Delivery deadlines (business days, weekends off; holidays are not counted) ----

const isWeekend = (day: Date) => day.getUTCDay() === 0 || day.getUTCDay() === 6

function addBusinessDays(day: Date, count: number) {
  let result = day
  let added = 0
  while (added < count) {
    result = new Date(result.getTime() + DAY)
    if (!isWeekend(result)) added++
  }
  return result
}

/** Business days from today to the deadline: 0 = due today, negative = late. */
function businessDaysUntil(today: Date, deadline: Date) {
  const sign = deadline >= today ? 1 : -1
  let count = 0
  let cursor = today
  while (cursor.getTime() !== deadline.getTime()) {
    cursor = new Date(cursor.getTime() + sign * DAY)
    if (!isWeekend(cursor)) count += sign
  }
  return count
}

export const hasExpress = (order: Order) => order.order_items.some((item) => item.extras.some((extra) => extra.group_id === 'express'))

export type Deadline = { due: Date; remaining: number; express: boolean; waiting: boolean }

/**
 * Packs take up to 4 business days (Express: 1). The clock starts when the payment is confirmed;
 * after 5 pm or on a weekend it starts the next business day, as the pack conditions say.
 * Days spent waiting for the customer (corrections, missing information) move the deadline; while waiting, the clock stops.
 */
export function deliveryDeadline(order: Order, now = new Date()): Deadline | null {
  if (!order.paid_at) return null
  const { day, hour } = arDay(new Date(order.paid_at))
  const start = isWeekend(day) || hour >= 17 ? addBusinessDays(day, 1) : day
  const express = hasExpress(order)
  const waiting = Boolean(order.waiting_since)
  let due = addBusinessDays(start, (express ? 1 : 4) + (order.paused_days ?? 0))
  // Still waiting: the days since it stopped don't count either.
  if (waiting) {
    const since = arDay(new Date(order.waiting_since!)).day
    const today = arDay(now).day
    if (today > since) due = addBusinessDays(due, businessDaysUntil(since, today))
  }
  return { due, remaining: businessDaysUntil(arDay(now).day, due), express, waiting }
}

const dueFormat = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
export const formatDue = (due: Date) => dueFormat.format(due).replace(/\./g, '')

// ---- Monthly figures ----

export type MonthStats = { key: string; sales: number; revenue: number; average: number; visits: number; views: number; conversion: number | null; top: string | null }
export type ProductStats = { name: string; units: number; revenue: number }

export function bestSellers(sales: Sale[]): ProductStats[] {
  const byProduct = new Map<string, ProductStats>()
  for (const sale of sales) {
    for (const item of sale.order_items) {
      const current = byProduct.get(item.product_id) ?? { name: item.product_name, units: 0, revenue: 0 }
      current.units += 1
      current.revenue += item.line_total
      byProduct.set(item.product_id, current)
    }
  }
  return [...byProduct.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue)
}

export function monthStats(key: string, sales: Sale[], visits: VisitRow[]): MonthStats {
  const inMonth = sales.filter((sale) => monthKey(sale.paid_at) === key)
  const revenue = inMonth.reduce((sum, sale) => sum + sale.total, 0)
  const days = visits.filter((row) => row.day.startsWith(key))
  const visitCount = days.reduce((sum, row) => sum + row.visits, 0)
  return {
    key,
    sales: inMonth.length,
    revenue,
    average: inMonth.length ? Math.round(revenue / inMonth.length) : 0,
    visits: visitCount,
    views: days.reduce((sum, row) => sum + row.views, 0),
    conversion: visitCount ? inMonth.length / visitCount : null,
    top: bestSellers(inMonth)[0]?.name ?? null,
  }
}

// ---- Weekly figures (Monday to Sunday, Argentine calendar) ----

const mondayOf = (day: Date) => new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY)

/** 'YYYY-MM-DD' of the Monday of the week a moment falls in, in Argentina. */
export function weekKey(value: string | Date) {
  return mondayOf(arDay(new Date(value)).day).toISOString().slice(0, 10)
}

export type WeekStats = { key: string; label: string; sales: number; revenue: number; whatsapp: number; current: boolean }

const shortDate = (day: Date) => `${day.getUTCDate()}/${day.getUTCMonth() + 1}`

/** The weeks that touch the month, each with the sales paid in it. A week that crosses into another month is counted whole. */
export function weeksOfMonth(key: string, sales: Sale[], now = new Date()): WeekStats[] {
  const end = new Date(`${shiftMonth(key, 1)}-01T00:00:00Z`)
  const thisWeek = weekKey(now)
  const weeks: WeekStats[] = []
  for (let start = mondayOf(new Date(`${key}-01T00:00:00Z`)); start < end; start = new Date(start.getTime() + 7 * DAY)) {
    const id = start.toISOString().slice(0, 10)
    if (id > thisWeek) break
    const inWeek = sales.filter((sale) => weekKey(sale.paid_at) === id)
    weeks.push({
      key: id,
      label: `${shortDate(start)} al ${shortDate(new Date(start.getTime() + 6 * DAY))}`,
      sales: inWeek.length,
      revenue: inWeek.reduce((sum, sale) => sum + sale.total, 0),
      whatsapp: inWeek.filter((sale) => sale.source === 'whatsapp').length,
      current: id === thisWeek,
    })
  }
  return weeks
}

export const salesInMonth = (key: string, sales: Sale[]) => sales.filter((sale) => monthKey(sale.paid_at) === key)
export const salesInYear = (year: string, sales: Sale[]) => sales.filter((sale) => monthKey(sale.paid_at).startsWith(year))

/** Percentage change against the previous value; null when there is nothing to compare with. */
export function change(current: number, previous: number) {
  if (!previous) return null
  return (current - previous) / previous
}

// ---- Welcome message ----

// Personal encouragement for Vale, not about the business.
const GREETINGS = [
  'Confiá en tu proceso: lo que hoy parece lento mañana va a ser tu base.',
  'No tenés que poder con todo hoy. Solo con el próximo paso.',
  'Sos más capaz de lo que te decís en tus días difíciles.',
  'La constancia le gana al talento que no se presenta.',
  'Lo que estás construyendo ya existe gracias a que te animaste.',
  'Descansar también es avanzar. Tratate con la misma paciencia que le tenés a los demás.',
  'Hace un tiempo soñabas con estar donde estás hoy.',
  'Paso a paso también se llega lejos.',
  'Tu valor no depende de un día productivo.',
  'Hacelo con miedo, pero hacelo.',
  'Cada pequeño logro cuenta. Celebralos.',
  'Hoy elegí ser tu mejor compañía.',
  'Lo difícil no es señal de que vas mal: es señal de que estás creciendo.',
  'Creé en vos como creés en las personas que querés.',
  'No compares tu capítulo 1 con el capítulo 20 de otra persona.',
  'La disciplina es acordarte de lo que querés.',
  'Estás haciendo algo valiente: apostar por vos.',
  'Respirá hondo. Ya superaste días más difíciles que este.',
  'Que tus ganas sean más grandes que tus dudas.',
  'Sos la persona que va a hacer que esto funcione, y lo sabés.',
]

export function welcome(firstName: string, now = new Date()) {
  const { hour } = arDay(now)
  const hello = hour < 12 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  return { title: `${hello}, ${firstName}`, line: GREETINGS[Math.floor(Math.random() * GREETINGS.length)] }
}
