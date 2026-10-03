import type { Order, OrderStatus } from './orders'
import { deliveryDeadline } from './dashboard'

/**
 * The orders board, in the order Vale works: each order is in one work stage.
 * "Hoy" and "Nuevos" are views across stages (what needs her today, and web orders not opened yet).
 */
export type Stage = 'hoy' | 'nuevos' | 'cobrar' | 'arrancar' | 'proceso' | 'esperando' | 'entregados' | 'archivo'
export type WorkStage = Exclude<Stage, 'hoy' | 'nuevos'>

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'hoy', label: 'Hoy', hint: 'Lo que necesita tu atención hoy: pedidos nuevos, pagos a revisar, recordatorios y entregas que vencen.' },
  { id: 'nuevos', label: 'Nuevos', hint: 'Pedidos de la web que todavía no abriste.' },
  { id: 'cobrar', label: 'Por cobrar', hint: 'Sin pagar, comprobantes por revisar y transferencias por verificar.' },
  { id: 'arrancar', label: 'Para arrancar', hint: 'Pagados y sin empezar. Primero los que vencen antes.' },
  { id: 'proceso', label: 'En proceso', hint: 'Los que estás haciendo, ordenados por vencimiento.' },
  { id: 'esperando', label: 'Esperando al cliente', hint: 'El plazo está en pausa hasta que el cliente responda.' },
  { id: 'entregados', label: 'Entregados', hint: 'Entregados en los últimos 7 días.' },
  { id: 'archivo', label: 'Archivo', hint: 'Entregados anteriores, cancelados y pedidos de prueba.' },
]

/** Older names of the views (links from the home and from notifications) mapped to the board. */
export type LegacyFilter = 'activos' | 'gestionar' | 'verificar' | 'whatsapp' | 'todos' | OrderStatus
export function toStage(filter: Stage | LegacyFilter): Stage {
  switch (filter) {
    case 'activos': case 'todos': case 'whatsapp': return 'hoy'
    case 'gestionar': case 'paid': return 'arrancar'
    case 'verificar': case 'pending_payment': case 'payment_review': return 'cobrar'
    case 'in_progress': return 'proceso'
    case 'delivered': return 'entregados'
    case 'cancelled': return 'archivo'
    default: return filter
  }
}

const WEEK = 7 * 24 * 60 * 60 * 1000
const isTest = (order: Order) => order.number >= 90000

/** The work stage an order is in right now. */
export function stageOf(order: Order, now = Date.now()): WorkStage {
  if (order.status === 'cancelled' || isTest(order)) return 'archivo'
  // E-books unlocked on upload still need the transfer checked: that is collecting money.
  if (order.payment_check === 'pending' || order.status === 'pending_payment' || order.status === 'payment_review') return 'cobrar'
  if (order.status === 'delivered') {
    const at = new Date(order.delivered_at ?? order.paid_at ?? order.created_at).getTime()
    return now - at <= WEEK ? 'entregados' : 'archivo'
  }
  if (order.waiting_since) return 'esperando'
  return order.status === 'paid' ? 'arrancar' : 'proceso'
}

/** CV packs and LinkedIn are made by hand (they have a deadline); guides are digital; sessions are coordinated. */
export type Kind = 'cv' | 'guias' | 'asesorias'
export function kindsOf(order: Order): Kind[] {
  const kinds = new Set<Kind>()
  for (const item of order.order_items) {
    const delivery = item.products?.delivery
    if (delivery === 'service') kinds.add('cv')
    else if (delivery === 'session' || item.extras.some((extra) => extra.group_id === 'devolucion')) kinds.add('asesorias')
    else kinds.add('guias')
  }
  return [...kinds]
}

const hasDeadline = (order: Order) => order.order_items.some((item) => item.products?.delivery === 'service') && (order.status === 'paid' || order.status === 'in_progress')

/** Why an order shows up in "Hoy", from most to least urgent (null = it can wait). */
export type Reason = { label: string; tone: 'rojo' | 'naranja' | 'rosa' | 'arena'; rank: number }
export function todayReason(order: Order, unseen: boolean, now = new Date()): Reason | null {
  if (order.status === 'cancelled' || isTest(order)) return null
  if (hasDeadline(order) && !order.waiting_since) {
    const deadline = deliveryDeadline(order, now)
    if (deadline && deadline.remaining < 0) return { label: `Atrasado ${-deadline.remaining} ${deadline.remaining === -1 ? 'día' : 'días'}`, tone: 'rojo', rank: 0 }
    if (deadline && deadline.remaining === 0) return { label: 'Vence hoy', tone: 'rojo', rank: 1 }
  }
  // The team finished the CV: Vale checks it and delivers it.
  const teamTasks = (order as Order & { team_tasks?: { status: string }[] }).team_tasks ?? []
  if (order.status !== 'delivered' && teamTasks.length > 0 && teamTasks.some((task) => task.status === 'terminado')) return { label: 'CV del equipo listo', tone: 'naranja', rank: 2 }
  if (order.payment_check === 'pending') return { label: 'Verificar transferencia', tone: 'naranja', rank: 2 }
  if (order.status === 'payment_review') return { label: 'Revisar comprobante', tone: 'naranja', rank: 2 }
  if (unseen) return { label: 'Nuevo', tone: 'rosa', rank: 3 }
  if (hasDeadline(order) && !order.waiting_since) {
    const deadline = deliveryDeadline(order, now)
    if (deadline && deadline.remaining === 1) return { label: 'Vence mañana', tone: 'naranja', rank: 4 }
  }
  if (order.status === 'paid') return { label: 'Para arrancar', tone: 'arena', rank: 5 }
  if (order.status === 'pending_payment' && now.getTime() - new Date(order.created_at).getTime() > 24 * 60 * 60 * 1000) return { label: 'Recordar el pago', tone: 'arena', rank: 6 }
  return null
}

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : 0)
const dueTime = (order: Order) => (hasDeadline(order) ? deliveryDeadline(order)?.due.getTime() ?? Infinity : Infinity)

/** The order that makes sense for each stage. */
export function sortForStage(stage: Stage, orders: Order[], reasons: Map<string, Reason | null>): Order[] {
  const list = [...orders]
  switch (stage) {
    case 'hoy': return list.sort((a, b) => (reasons.get(a.id)?.rank ?? 9) - (reasons.get(b.id)?.rank ?? 9) || dueTime(a) - dueTime(b) || time(a.created_at) - time(b.created_at))
    case 'cobrar': return list.sort((a, b) => Number(b.status === 'payment_review' || b.payment_check === 'pending') - Number(a.status === 'payment_review' || a.payment_check === 'pending') || time(a.created_at) - time(b.created_at))
    case 'arrancar': case 'proceso': return list.sort((a, b) => dueTime(a) - dueTime(b) || time(a.paid_at) - time(b.paid_at))
    case 'esperando': return list.sort((a, b) => time(a.waiting_since) - time(b.waiting_since))
    case 'entregados': return list.sort((a, b) => time(b.delivered_at ?? b.paid_at) - time(a.delivered_at ?? a.paid_at))
    default: return list.sort((a, b) => time(b.created_at) - time(a.created_at))
  }
}

/** What dragging a card onto a stage does; null when that move has to be done from the card. */
export type Move = { kind: 'status'; status: OrderStatus; confirm?: string } | { kind: 'waiting'; waiting: boolean }
export function moveTo(order: Order, target: Stage): Move | null {
  const from = stageOf(order)
  if (from === target) return null
  if (target === 'arrancar' && from === 'cobrar' && order.status !== 'delivered') return { kind: 'status', status: 'paid', confirm: 'paid' }
  if (target === 'proceso' && from === 'arrancar') return { kind: 'status', status: 'in_progress' }
  if (target === 'proceso' && from === 'esperando') return { kind: 'waiting', waiting: false }
  if (target === 'esperando' && (from === 'arrancar' || from === 'proceso') && hasDeadline(order)) return { kind: 'waiting', waiting: true }
  if (target === 'entregados' && (from === 'arrancar' || from === 'proceso' || from === 'esperando')) return { kind: 'status', status: 'delivered' }
  return null
}
