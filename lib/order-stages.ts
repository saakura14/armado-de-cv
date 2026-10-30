import { pendingSessions, type Order, type OrderStatus } from './orders'
import { deliveryDeadline, hasExpress, nextDueText } from './dashboard'
import { TEAM_PACKS } from './team'

/**
 * The orders board, in the order Vale works: each order is in one work stage.
 * "Hoy", "Por prioridad" and "Nuevos" are views across stages (what needs her today, what nobody started yet, and web orders not opened yet).
 */
export type Stage = 'hoy' | 'prioridad' | 'nuevos' | 'textos' | 'cobrar' | 'arrancar' | 'proceso' | 'revisar' | 'equipo' | 'esperando' | 'entregados' | 'archivo'
export type WorkStage = Exclude<Stage, 'hoy' | 'prioridad' | 'nuevos' | 'textos'>

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'hoy', label: 'Hoy', hint: 'Lo que necesita tu atención hoy: pedidos nuevos, pagos a revisar, recordatorios y entregas que vencen.' },
  { id: 'prioridad', label: 'Por prioridad', hint: 'Los CV pagados que nadie empezó todavía, del más urgente al más nuevo: atrasados, los que vencen hoy, los Express y después por fecha de entrega. Los que esperan al cliente van al final.' },
  { id: 'nuevos', label: 'Nuevos', hint: 'Pedidos de la web que todavía no abriste.' },
  { id: 'textos', label: 'Textos para el equipo', hint: 'CVs pagados que todavía no le pasaste al equipo, primero los Express y después en orden de pedido: empezá por el primero. Los que esperan al cliente quedan marcados.' },
  { id: 'cobrar', label: 'Por cobrar', hint: 'Sin pagar, comprobantes por revisar y transferencias por verificar.' },
  { id: 'arrancar', label: 'Para arrancar', hint: 'Pagados y sin empezar. Primero los que vencen antes.' },
  { id: 'proceso', label: 'En proceso', hint: 'Los que estás haciendo vos, ordenados por vencimiento.' },
  { id: 'revisar', label: 'Listos del equipo', hint: 'El equipo ya los terminó: revisalos y entregalos.' },
  { id: 'equipo', label: 'En el equipo', hint: 'Los está armando el equipo. Cuando los termina pasan solos a "Listos del equipo".' },
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

/** Where the team is with an order: not involved, still building it, or every CV it got is finished. */
export type TeamState = 'none' | 'working' | 'done'
export function teamState(order: Order): TeamState {
  const tasks = (order as Order & { team_tasks?: { status: string }[] }).team_tasks ?? []
  if (!tasks.length) return 'none'
  return tasks.some((task) => task.status !== 'terminado') ? 'working' : 'done'
}

/** The work stage an order is in right now. */
export function stageOf(order: Order, now = Date.now()): WorkStage {
  if (order.status === 'cancelled' || isTest(order)) return 'archivo'
  // E-books unlocked on upload still need the transfer checked: that is collecting money.
  if (order.payment_check === 'pending' || order.status === 'pending_payment' || order.status === 'payment_review') return 'cobrar'
  if (order.status === 'delivered') {
    // CV delivered but the session is still ahead: it stays in sight until the session is done.
    if (pendingSessions(order).length > 0) return 'entregados'
    // Same with the LinkedIn profile still to do.
    if (order.linkedin_pending) return 'entregados'
    const at = new Date(order.delivered_at ?? order.paid_at ?? order.created_at).getTime()
    return now - at <= WEEK ? 'entregados' : 'archivo'
  }
  if (order.waiting_since) return 'esperando'
  // CVs with the team are not Vale's to make: apart while they build them, then for her to check and deliver.
  const team = teamState(order)
  if (team === 'working') return 'equipo'
  if (team === 'done') return 'revisar'
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
  // The team finished the CV: Vale checks it and delivers it (not while the client has to answer).
  if (order.status !== 'delivered' && !order.waiting_since && teamState(order) === 'done') return { label: 'CV del equipo listo', tone: 'naranja', rank: 2 }
  if (order.payment_check === 'pending') return { label: 'Verificar transferencia', tone: 'naranja', rank: 2 }
  if (order.status === 'payment_review') return { label: 'Revisar comprobante', tone: 'naranja', rank: 2 }
  if (unseen) return { label: 'Nuevo', tone: 'rosa', rank: 3 }
  if (hasDeadline(order) && !order.waiting_since) {
    const deadline = deliveryDeadline(order, now)
    if (deadline && deadline.remaining === 1) return { label: nextDueText(deadline.due, now), tone: 'naranja', rank: 4 }
  }
  if (order.status === 'paid') return { label: 'Para arrancar', tone: 'arena', rank: 5 }
  if (order.status === 'delivered' && pendingSessions(order).some((session) => session.status === 'to_schedule')) return { label: 'Agendar la asesoría', tone: 'arena', rank: 5 }
  if (order.status === 'delivered' && order.linkedin_pending) return { label: 'Falta el LinkedIn', tone: 'arena', rank: 5 }
  if (order.status === 'pending_payment' && now.getTime() - new Date(order.created_at).getTime() > 24 * 60 * 60 * 1000) return { label: 'Recordar el pago', tone: 'arena', rank: 6 }
  return null
}

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : 0)
const dueTime = (order: Order) => (hasDeadline(order) ? deliveryDeadline(order)?.due.getTime() ?? Infinity : Infinity)

/** CV packs of a paid order that nobody on the team has yet: Vale still has to write their texts. */
export function needsTexts(order: Order) {
  if (isTest(order) || (order.status !== 'paid' && order.status !== 'in_progress')) return false
  const tasks = (order as Order & { team_tasks?: { order_item_id: string }[] }).team_tasks ?? []
  return order.order_items.some((item) => TEAM_PACKS.includes(item.product_id) && !tasks.some((task) => task.order_item_id === item.id))
}

/** On the texts list: what is holding an order back, if anything. */
export function textsReason(order: Order): Reason {
  if (order.waiting_since) return { label: 'Esperando al cliente', tone: 'arena', rank: 5 }
  const deadline = deliveryDeadline(order)
  if (deadline && deadline.remaining < 0) return { label: `Atrasado ${-deadline.remaining} ${deadline.remaining === -1 ? 'día' : 'días'}`, tone: 'rojo', rank: 0 }
  if (deadline && deadline.remaining <= 1) return { label: deadline.remaining === 0 ? 'Vence hoy' : 'Vence mañana', tone: 'naranja', rank: 1 }
  if (hasExpress(order)) return { label: '⚡ Express', tone: 'naranja', rank: 1 }
  return { label: 'Listo para escribir', tone: 'rosa', rank: 3 }
}

/** A paid CV that nobody started: Vale hasn't begun it (nor passed it to the team), or the team has it but didn't open it yet. */
export function notStarted(order: Order) {
  if (isTest(order) || !hasDeadline(order)) return false
  const tasks = (order as Order & { team_tasks?: { status: string; started_at: string | null }[] }).team_tasks ?? []
  if (!tasks.length) return order.status === 'paid'
  return tasks.some((task) => task.status !== 'terminado' && !task.started_at)
}

/** On the priority list: how urgent it is, and who has to start it. */
export function priorityReason(order: Order, now = new Date()): Reason {
  if (order.waiting_since) return { label: 'Esperando al cliente', tone: 'arena', rank: 9 }
  const team = teamState(order) === 'working' ? ' · el equipo no lo empezó' : ''
  const deadline = deliveryDeadline(order, now)
  if (deadline && deadline.remaining < 0) return { label: `Atrasado ${-deadline.remaining} ${deadline.remaining === -1 ? 'día' : 'días'}${team}`, tone: 'rojo', rank: 0 }
  if (deadline && deadline.remaining === 0) return { label: `Vence hoy${team}`, tone: 'rojo', rank: 1 }
  if (deadline?.express) return { label: `⚡ Express${team}`, tone: 'naranja', rank: 2 }
  if (deadline && deadline.remaining === 1) return { label: `${nextDueText(deadline.due, now)}${team}`, tone: 'naranja', rank: 3 }
  return { label: deadline ? `Faltan ${deadline.remaining} días hábiles${team}` : `Para arrancar${team}`, tone: 'rosa', rank: 4 }
}

/** The order that makes sense for each stage. */
export function sortForStage(stage: Stage, orders: Order[], reasons: Map<string, Reason | null>): Order[] {
  const list = [...orders]
  switch (stage) {
    // The one due first goes first (Express has the shortest deadline), then in order of purchase.
    case 'textos': return list.sort((a, b) => dueTime(a) - dueTime(b) || a.number - b.number)
    // Waiting for the client last; the rest by how soon they are due (Express first on the same day), then by payment.
    case 'prioridad': return list.sort((a, b) => Number(Boolean(a.waiting_since)) - Number(Boolean(b.waiting_since)) || dueTime(a) - dueTime(b) || Number(hasExpress(b)) - Number(hasExpress(a)) || time(a.paid_at) - time(b.paid_at))
    case 'hoy': return list.sort((a, b) => (reasons.get(a.id)?.rank ?? 9) - (reasons.get(b.id)?.rank ?? 9) || dueTime(a) - dueTime(b) || time(a.created_at) - time(b.created_at))
    case 'cobrar': return list.sort((a, b) => Number(b.status === 'payment_review' || b.payment_check === 'pending') - Number(a.status === 'payment_review' || a.payment_check === 'pending') || time(a.created_at) - time(b.created_at))
    case 'arrancar': case 'proceso': case 'revisar': case 'equipo': return list.sort((a, b) => dueTime(a) - dueTime(b) || time(a.paid_at) - time(b.paid_at))
    case 'esperando': return list.sort((a, b) => time(a.waiting_since ?? a.paid_at) - time(b.waiting_since ?? b.paid_at))
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
  const working = from === 'arrancar' || from === 'proceso' || from === 'revisar' || from === 'equipo'
  if (target === 'esperando' && working && hasDeadline(order)) return { kind: 'waiting', waiting: true }
  if (target === 'entregados' && (working || from === 'esperando')) return { kind: 'status', status: 'delivered' }
  return null
}
