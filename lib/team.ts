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

// ---- Work times (from "Empecé" to "Terminé") ----

/** Under this, the CV was started without "Empecé" (only the last minutes were measured): it doesn't count for times or records. */
export const MIN_WORK_MINUTES = 8

/** Minutes between "Empecé" and "Terminé", or null when it can't be measured. */
export function workMinutes(task: Pick<TeamTask, 'started_at' | 'finished_at'>) {
  if (!task.started_at || !task.finished_at) return null
  const minutes = Math.round((time(task.finished_at) - time(task.started_at)) / 60000)
  return minutes >= MIN_WORK_MINUTES ? minutes : null
}

/** "27 min", "1 h 05 min". */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

const arDay = (value: string | Date) => new Date(new Date(value).getTime() - 3 * 3600e3).toISOString().slice(0, 10)

/** Per pack: how many, the average and the best time (only the measurable ones). */
export function timesByPack(tasks: TeamTask[]) {
  const packs = new Map<string, number[]>()
  for (const task of tasks) {
    const minutes = task.status === 'terminado' ? workMinutes(task) : null
    if (minutes === null) continue
    packs.set(task.pack_name, [...(packs.get(task.pack_name) ?? []), minutes])
  }
  return [...packs.entries()].map(([pack, list]) => ({ pack, count: list.length, average: Math.round(list.reduce((sum, value) => sum + value, 0) / list.length), best: Math.min(...list) }))
    .sort((a, b) => b.count - a.count)
}

/** CVs finished today and the work minutes they add up to. */
export function todayWork(tasks: TeamTask[], now = new Date()) {
  const today = arDay(now)
  const done = tasks.filter((task) => task.status === 'terminado' && task.finished_at && arDay(task.finished_at) === today)
  return { count: done.length, minutes: done.reduce((sum, task) => sum + (workMinutes(task) ?? 0), 0) }
}

/** Days in a row with at least one CV finished (weekends don't break it); today counts once something is finished. */
export function streakDays(tasks: TeamTask[], now = new Date()) {
  const days = new Set(tasks.filter((task) => task.status === 'terminado' && task.finished_at).map((task) => arDay(task.finished_at!)))
  let cursor = new Date(`${arDay(now)}T12:00:00Z`)
  // Nothing yet today: the streak is still alive if yesterday (or Friday) counted.
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor = new Date(cursor.getTime() - 864e5)
  let count = 0
  for (let guard = 0; guard < 400; guard++) {
    const key = cursor.toISOString().slice(0, 10)
    const weekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6
    if (days.has(key)) count++
    else if (!weekend) break
    cursor = new Date(cursor.getTime() - 864e5)
  }
  return count
}

/** How a just-finished CV compares with the best earlier time for the same pack. */
export function recordCheck(done: TeamTask, minutes: number, tasks: TeamTask[]) {
  const earlier = tasks.filter((task) => task.id !== done.id && task.pack_name === done.pack_name && task.status === 'terminado').map(workMinutes).filter((value): value is number => value !== null)
  const best = earlier.length ? Math.min(...earlier) : null
  return { best, isRecord: best !== null && minutes < best, first: best === null }
}
