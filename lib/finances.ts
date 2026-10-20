/** "Mis finanzas": Vale's personal money (tables personal_items and personal_moves, admin only). */

export type ItemKind = 'ingreso' | 'gasto'
export type ItemType = 'fijo' | 'cuotas' | 'deuda' | 'atajo'
export type Installment = { n: number; due: string; amount: number; est?: boolean }
export type PersonalItem = {
  id: string; kind: ItemKind; type: ItemType; name: string; category: string
  amount: number | null; due_day: number | null; due_note: string | null; account: string | null
  plan: Installment[] | null; installments_total: number | null; total: number | null; paid_before: number
  notes: string | null; active: boolean; sort: number
}
export type MoveKind = 'ingreso' | 'gasto' | 'entre_cuentas'
export type PersonalMove = {
  id: string; day: string; kind: MoveKind; item_id: string | null; period: string | null; installment: number | null
  category: string; concept: string; amount: number; account: string | null; scope: 'personal' | 'negocio'; source: string
}

export const ITEM_SELECT = 'id, kind, type, name, category, amount, due_day, due_note, account, plan, installments_total, total, paid_before, notes, active, sort'
export const MOVE_SELECT = 'id, day, kind, item_id, period, installment, category, concept, amount, account, scope, source'

export const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'sueldo', label: 'Sueldo', emoji: '💼' },
  { id: 'emprendimiento', label: 'Retiro del emprendimiento', emoji: '📈' },
  { id: 'anto', label: 'Anto', emoji: '🌸' },
  { id: 'vivienda', label: 'Alquiler', emoji: '🏠' },
  { id: 'servicios', label: 'Servicios', emoji: '💡' },
  { id: 'tarjeta', label: 'Tarjeta', emoji: '💳' },
  { id: 'prestamos', label: 'Préstamos', emoji: '🏦' },
  { id: 'cuotas', label: 'Compras en cuotas', emoji: '🧾' },
  { id: 'super', label: 'Súper y almacén', emoji: '🛒' },
  { id: 'comida', label: 'Delivery y salidas a comer', emoji: '🍔' },
  { id: 'salidas', label: 'Salidas', emoji: '🎟️' },
  { id: 'suscripciones', label: 'Suscripciones', emoji: '📺' },
  { id: 'belleza', label: 'Belleza y ropa', emoji: '💅' },
  { id: 'salud', label: 'Salud', emoji: '🩺' },
  { id: 'transporte', label: 'Transporte', emoji: '🚌' },
  { id: 'familia', label: 'Familia', emoji: '👪' },
  { id: 'otros', label: 'Otros', emoji: '📦' },
  { id: 'sin_clasificar', label: 'Sin clasificar', emoji: '❓' },
]
export const categoryOf = (id: string) => CATEGORIES.find((row) => row.id === id) ?? CATEGORIES[CATEGORIES.length - 2]
export const ACCOUNTS = ['Santander', 'Ualá', 'Naranja', 'Efectivo', 'Otra']

const pad = (value: number) => String(value).padStart(2, '0')
const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()

/** What an item asks for in a month: the amount (null when it varies), the due date and, for a plan, the installment. */
export type Due = { item: PersonalItem; amount: number | null; due: string | null; installment: number | null; est: boolean }
export function dueIn(item: PersonalItem, month: string): Due | null {
  if (!item.active) return null
  if (item.type === 'fijo') {
    const day = item.due_day ? Math.min(item.due_day, daysIn(month)) : null
    return { item, amount: item.amount, due: day ? `${month}-${pad(day)}` : null, installment: null, est: false }
  }
  if (item.type === 'cuotas') {
    const step = (item.plan ?? []).find((row) => row.due.slice(0, 7) === month)
    return step ? { item, amount: step.amount, due: step.due, installment: step.n, est: Boolean(step.est) } : null
  }
  return null
}

/** The moves that pay (or collect) an item for a month: tied to it and to that period or installment. */
export function paymentsFor(due: Due, moves: PersonalMove[], month: string) {
  return moves.filter((move) => move.item_id === due.item.id && (due.installment !== null ? move.installment === due.installment : (move.period ?? move.day.slice(0, 7)) === month))
}

/** A plan's progress: installments paid (by the moves tied to them, or before the plan's first loaded one) and what's left. */
export function planProgress(item: PersonalItem, moves: PersonalMove[]) {
  const plan = item.plan ?? []
  const paidNumbers = new Set(moves.filter((move) => move.item_id === item.id && move.installment !== null).map((move) => move.installment!))
  const firstInPlan = plan.length ? Math.min(...plan.map((row) => row.n)) : 1
  const paidCount = (firstInPlan - 1) + plan.filter((row) => paidNumbers.has(row.n)).length
  const left = plan.filter((row) => !paidNumbers.has(row.n))
  return { paidCount, total: item.installments_total ?? plan.length, left, leftAmount: left.reduce((sum, row) => sum + row.amount, 0), next: left[0] ?? null }
}

/** A debt without a plan: paid so far (before loading it plus the payments tied to it) and the balance. */
export function debtProgress(item: PersonalItem, moves: PersonalMove[]) {
  const paid = item.paid_before + moves.filter((move) => move.item_id === item.id).reduce((sum, move) => sum + move.amount, 0)
  const total = item.total ?? paid
  return { paid, total, left: Math.max(total - paid, 0) }
}

/** Days from today (Argentina) to a date: negative when it's past. */
export function daysUntil(day: string, today: string) {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5)
}
