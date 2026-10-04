import { monthKey, monthLabel } from './dashboard'

/** Someone who builds the CVs in Canva from Vale's texts (signs in with Google at /equipo). */
export type TeamMember = { id: string; email: string; name: string; rate: number; batch_size: number; active: boolean; user_id: string | null; created_at: string }

export type TaskStatus = 'asignado' | 'haciendo' | 'terminado'
export type TeamTask = {
  id: string
  member_id: string
  order_id: string
  order_item_id: string
  order_number: number
  client_name: string
  pack_name: string
  cv_modern: string
  cv_ats: string
  has_letter: boolean
  letter: string | null
  notes: string | null
  due_on: string | null
  status: TaskStatus
  rate: number
  assigned_at: string
  started_at: string | null
  finished_at: string | null
  design_url: string | null
  /** The payment that covered this CV (null = still to be paid). */
  paid_in: string | null
}

/** "pago" closes the batch (the counter starts again); "adelanto" is money ahead, discounted from the current batch. */
export type TeamPayment = { id: string; member_id: string; kind: 'pago' | 'adelanto'; amount: number; paid_on: string; note: string | null; created_at: string; packs: number | null; settled_in: string | null }

export const TASK_SELECT = 'id, member_id, order_id, order_item_id, order_number, client_name, pack_name, cv_modern, cv_ats, has_letter, letter, notes, due_on, status, rate, assigned_at, started_at, finished_at, design_url, paid_in'

/** Only the CV packs are made by the team (LinkedIn, platforms, sessions and corrections stay with Vale). */
export const TEAM_PACKS = ['cv-simple', 'cv-medium', 'cv-premium']
/** Packs that come with a cover letter. */
export const PACKS_WITH_LETTER = ['cv-medium', 'cv-premium']

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: string }> = {
  asignado: { label: 'Para hacer', tone: 'bg-arena text-ciruela' },
  haciendo: { label: 'Haciéndolo', tone: 'bg-petalo-wash text-rosa-deep' },
  terminado: { label: 'Terminado', tone: 'bg-whatsapp/15 text-whatsapp' },
}

const time = (value: string | null) => (value ? new Date(value).getTime() : 0)

/** The batch in course: finished CVs not covered by a payment yet, what they add up to, and what is owed after unsettled advances. */
export function batchStats(member: Pick<TeamMember, 'batch_size'>, tasks: TeamTask[], payments: TeamPayment[]) {
  const unpaid = tasks.filter((task) => task.status === 'terminado' && !task.paid_in).sort((a, b) => time(a.finished_at) - time(b.finished_at))
  const earned = unpaid.reduce((sum, task) => sum + task.rate, 0)
  const advances = payments.filter((payment) => payment.kind === 'adelanto' && !payment.settled_in).reduce((sum, payment) => sum + payment.amount, 0)
  const lastPayment = payments.filter((payment) => payment.kind === 'pago').sort((a, b) => time(b.created_at) - time(a.created_at))[0]
  return { count: unpaid.length, size: member.batch_size, unpaid, earned, advances, owed: Math.max(earned - advances, 0), lastPayment: lastPayment ?? null }
}

export type MonthRow = { key: string; label: string; packs: number; earned: number; paid: number }

/** Month by month (never reset): packs finished and what they add up to, and what was paid (payments and advances). */
export function monthlyStats(tasks: TeamTask[], payments: TeamPayment[]): MonthRow[] {
  const rows = new Map<string, MonthRow>()
  const row = (key: string) => rows.get(key) ?? rows.set(key, { key, label: monthLabel(key), packs: 0, earned: 0, paid: 0 }).get(key)!
  for (const task of tasks) {
    if (task.status !== 'terminado' || !task.finished_at) continue
    const entry = row(monthKey(task.finished_at))
    entry.packs += 1
    entry.earned += task.rate
  }
  for (const payment of payments) row(payment.paid_on.slice(0, 7)).paid += payment.amount
  return [...rows.values()].sort((a, b) => b.key.localeCompare(a.key))
}

/** Pending first by due date (the ones without date at the end), finished ones newest first. */
export function sortTasks(tasks: TeamTask[]) {
  const pending = tasks.filter((task) => task.status !== 'terminado').sort((a, b) => (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999') || time(a.assigned_at) - time(b.assigned_at))
  const finished = tasks.filter((task) => task.status === 'terminado').sort((a, b) => time(b.finished_at) - time(a.finished_at))
  return { pending, finished }
}

const dueFormat = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
/** "Para hoy", "Para mañana", "Atrasado", or the date. */
export function dueLabel(dueOn: string | null, now = new Date()) {
  if (!dueOn) return null
  const today = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const days = Math.round((new Date(`${dueOn}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000)
  if (days < 0) return { text: `Atrasado (era para el ${dueFormat.format(new Date(`${dueOn}T00:00:00Z`)).replace(/\./g, '')})`, urgent: true }
  if (days === 0) return { text: 'Para hoy', urgent: true }
  if (days === 1) return { text: 'Para mañana', urgent: false }
  return { text: `Para el ${dueFormat.format(new Date(`${dueOn}T00:00:00Z`)).replace(/\./g, '')}`, urgent: false }
}
