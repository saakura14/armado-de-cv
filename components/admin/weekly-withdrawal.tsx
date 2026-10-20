'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { dayKey } from '@/lib/dashboard'
import { expensesIn, periodOf, rateFor, shiftPeriod, type AnalysisData, type Period } from '@/lib/analysis'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, cardClass, inputClass, useFlash } from './ui'

type Withdrawal = { week: string; profit: number; to_cushion: number; amount: number; day: string }
type Finished = { rate: number; finished_at: string }

const short = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const inWeek = (day: string, week: Period) => day >= week.start && day < week.end

/**
 * What the business earned in a week, counted the way the money really leaves: sales, minus what Meta spent those days
 * (at the dólar cripto), minus the CVs the team finished (paid or not: that money stays for Gustavo), minus the other
 * expenses (the monthly ones, a week's share).
 */
export function weekProfit(week: Period, data: AnalysisData, finished: Finished[]) {
  const sales = data.sales.filter((sale) => inWeek(dayKey(sale.paid_at), week)).reduce((sum, sale) => sum + sale.total, 0)
  const ads = data.ads.filter((row) => inWeek(row.day, week)).reduce((sum, row) => sum + row.spend * (row.currency === 'ARS' ? 1 : rateFor(row.day, data.fx) ?? 0), 0)
  const team = finished.filter((task) => inWeek(dayKey(task.finished_at), week)).reduce((sum, task) => sum + task.rate, 0)
  const month = periodOf('mes', week.start)
  const daysInMonth = Math.round((Date.parse(`${month.end}T00:00:00Z`) - Date.parse(`${month.start}T00:00:00Z`)) / 864e5)
  const once = expensesIn(week, data.expenses, data.fx).reduce((sum, row) => sum + row.pesos, 0)
  const monthly = expensesIn(month, data.expenses, data.fx).filter((row) => row.monthly).reduce((sum, row) => sum + row.pesos, 0) * (7 / daysInMonth)
  const other = once + monthly
  return { sales, ads, team, other, profit: sales - ads - team - other }
}

/**
 * The weekly "salary": everything stays in Ualá (it earns interest every day), so the business pays Vale on paper. Each
 * Monday, last week's profit: first it fills the business cushion (up to half the profit until it reaches the target),
 * the rest is hers. "Me lo retiré" notes it here and as income in "Mis finanzas".
 */
export function WeeklyWithdrawal({ data, money }: { data: AnalysisData; money: (value: number) => string }) {
  const [finished, setFinished] = useState<Finished[]>([])
  const [history, setHistory] = useState<Withdrawal[]>([])
  const [target, setTarget] = useState(200000)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  const load = useCallback(async () => {
    const [tasks, rows, goal] = await Promise.all([
      supabase.from('team_tasks').select('rate, finished_at').eq('status', 'terminado').not('finished_at', 'is', null),
      supabase.from('business_withdrawals').select('week, profit, to_cushion, amount, day').order('week', { ascending: false }),
      supabase.from('savings_goal').select('cushion_target').eq('id', 1).maybeSingle(),
    ])
    setFinished(((tasks.data as Finished[] | null) ?? []).map((row) => ({ ...row, rate: Number(row.rate) })))
    setHistory(((rows.data as Withdrawal[] | null) ?? []).map((row) => ({ ...row, profit: Number(row.profit), to_cushion: Number(row.to_cushion), amount: Number(row.amount) })))
    if (goal.data?.cushion_target !== undefined) setTarget(Number(goal.data.cushion_target))
  }, [])
  useEffect(() => { load() }, [load])

  const today = dayKey(new Date())
  const week = shiftPeriod(periodOf('semana', today), -1)
  const current = periodOf('semana', today)
  const result = weekProfit(week, data, finished)
  const running = weekProfit(current, data, finished)
  const done = history.find((row) => row.week === week.start)
  const cushion = history.reduce((sum, row) => sum + row.to_cushion, 0)
  const missing = Math.max(target - cushion, 0)
  const toCushion = result.profit > 0 ? Math.min(missing, Math.round(result.profit / 2)) : result.profit
  const suggested = Math.max(Math.round(result.profit - Math.max(toCushion, 0)), 0)
  // What she took out this month (Mis finanzas shows it as income and subtracts what she spent from Ualá).
  const takenThisMonth = history.filter((row) => row.day.slice(0, 7) === today.slice(0, 7)).reduce((sum, row) => sum + row.amount, 0)

  useEffect(() => { setAmount(String(suggested)) }, [suggested])

  async function save(override?: number) {
    const value = override ?? Number(amount.replace(/\./g, '').replace(',', '.'))
    if (!(value >= 0)) { flash.show('error', 'Poné cuánto te retirás.'); return }
    setBusy(true)
    // What she doesn't take of a good week stays in the cushion; a losing week takes from it.
    const keep = result.profit > 0 ? Math.max(result.profit - value, 0) : result.profit
    const { error } = await supabase.from('business_withdrawals').insert({ week: week.start, profit: Math.round(result.profit), to_cushion: Math.round(keep), amount: value, day: today })
    if (!error && value > 0) {
      await supabase.from('personal_moves').insert({ day: today, kind: 'ingreso', category: 'emprendimiento', concept: `Retiro del emprendimiento · semana del ${short(week.start)}`, amount: value, account: 'Ualá', source: 'retiro' })
    }
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', value > 0 ? '¡Listo! Quedó como ingreso en Mis finanzas.' : 'Anotado.')
    load()
  }

  return (
    <section className={cardClass} aria-labelledby="withdrawal-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="withdrawal-title" className="font-display text-lg font-bold text-ciruela">Tu retiro de la semana</h2>
          <p className="text-sm text-piedra">{week.label}. La plata queda en Ualá rindiendo: esto separa, en los números, qué parte es tuya.</p>
        </div>
        {!done && result.profit > 0 && <p className="text-right font-display text-3xl font-extrabold tabular-nums text-whatsapp">{money(suggested)}<span className="block text-xs font-semibold text-piedra">podés retirarte</span></p>}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-5">
        <div><dt className="text-xs text-piedra">Ventas</dt><dd className="font-semibold tabular-nums">{money(Math.round(result.sales))}</dd></div>
        <div><dt className="text-xs text-piedra">Meta</dt><dd className="font-semibold tabular-nums">−{money(Math.round(result.ads))}</dd></div>
        <div><dt className="text-xs text-piedra">Equipo (CVs hechos)</dt><dd className="font-semibold tabular-nums">−{money(Math.round(result.team))}</dd></div>
        <div><dt className="text-xs text-piedra">Otros gastos</dt><dd className="font-semibold tabular-nums">−{money(Math.round(result.other))}</dd></div>
        <div><dt className="text-xs text-piedra">Ganancia</dt><dd className={`font-display font-extrabold tabular-nums ${result.profit >= 0 ? 'text-ciruela' : 'text-rosa-deep'}`}>{money(Math.round(result.profit))}</dd></div>
      </dl>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-piedra"><span>Colchón del negocio</span><span>{money(Math.round(Math.max(cushion, 0)))} de {money(target)}</span></div>
        <div className="mt-1 h-2 rounded-full bg-papel"><div className="h-2 rounded-full bg-ciruela" style={{ width: `${Math.min(Math.max(cushion, 0) / Math.max(target, 1), 1) * 100}%` }} /></div>
      </div>
      {done ? (
        <p className="mt-3 rounded-2xl bg-whatsapp/10 px-4 py-3 text-sm font-semibold text-whatsapp"><Check className="mr-1 inline h-4 w-4" />Ya te retiraste {money(done.amount)} el {short(done.day)}{done.to_cushion > 0 ? ` y quedaron ${money(done.to_cushion)} en el colchón` : ''}.</p>
      ) : result.profit <= 0 ? (
        <div className="mt-3 rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep">
          <p className="font-semibold">Esa semana el negocio no dejó ganancia: no hay retiro.{cushion > 0 ? ' La diferencia sale del colchón.' : ''}</p>
          <Button className="mt-2" variant="secondary" busy={busy} onClick={() => save(0)}>Entendido</Button>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-papel/60 p-3">
          <p className="text-sm text-ink">{toCushion > 0 ? <>De la ganancia, <b>{money(toCushion)}</b> quedan en el colchón (te faltan {money(missing)} para completarlo) y <b>{money(suggested)}</b> son tuyos.</> : <>El colchón está completo: la ganancia entera es tuya.</>} Si te retirás menos, lo que sobra suma al colchón.</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" aria-label="Monto del retiro" className={`${inputClass} mt-0 w-40`} />
            <Button busy={busy} onClick={() => save()}><Check className="h-4 w-4" />Me lo retiré</Button>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-piedra">Esta semana va: ganancia {money(Math.round(running.profit))} (se retira el lunes). Este mes te retiraste {money(takenThisMonth)}.</p>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </section>
  )
}
