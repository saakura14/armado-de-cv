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
  order_items: { product_id: string; product_name: string; line_total: number }[]
}

export const SALE_SELECT = 'id, number, status, total, paid_at, payment_method, customer_name, order_items(product_id, product_name, line_total)'

export type VisitRow = { day: string; path: string; visits: number; views: number }

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

export type Deadline = { due: Date; remaining: number; express: boolean }

/**
 * Packs take up to 4 business days (Express: 1). The clock starts when the payment is confirmed;
 * after 5 pm or on a weekend it starts the next business day, as the pack conditions say.
 */
export function deliveryDeadline(order: Order, now = new Date()): Deadline | null {
  if (!order.paid_at) return null
  const { day, hour } = arDay(new Date(order.paid_at))
  const start = isWeekend(day) || hour >= 17 ? addBusinessDays(day, 1) : day
  const express = hasExpress(order)
  const due = addBusinessDays(start, express ? 1 : 4)
  return { due, remaining: businessDaysUntil(arDay(now).day, due), express }
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

export const salesInMonth = (key: string, sales: Sale[]) => sales.filter((sale) => monthKey(sale.paid_at) === key)
export const salesInYear = (year: string, sales: Sale[]) => sales.filter((sale) => monthKey(sale.paid_at).startsWith(year))

/** Percentage change against the previous value; null when there is nothing to compare with. */
export function change(current: number, previous: number) {
  if (!previous) return null
  return (current - previous) / previous
}

// ---- Welcome message ----

const GREETINGS = [
  'Cada CV que armás es una puerta que se abre para alguien.',
  'Hoy alguien va a llegar a su entrevista gracias a tu trabajo.',
  'Tu experiencia vale, y la de tus clientes también: que se note.',
  'Un pedido a la vez, con la misma dedicación de siempre.',
  'Lo que hacés cambia búsquedas laborales. Eso no es poco.',
  'Organizada, clara y a tiempo: así se ve un gran día de trabajo.',
  'Detrás de cada pedido hay alguien que confió en vos.',
  'Hoy es un buen día para que un CV pase todos los filtros.',
  'Tu marca crece con cada cliente que queda contento.',
  'Respirá, mirá tu lista y arrancá por lo más urgente.',
  'Lo estás haciendo muy bien. Seguí así.',
  'Cada entrega a tiempo es una recomendación en camino.',
]

export function welcome(firstName: string, now = new Date()) {
  const { hour } = arDay(now)
  const hello = hour < 12 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  return { title: `${hello}, ${firstName}`, line: GREETINGS[Math.floor(Math.random() * GREETINGS.length)] }
}
