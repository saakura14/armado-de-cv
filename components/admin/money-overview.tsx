'use client'

import { useEffect, useMemo, useState } from 'react'
import { monthKey, monthLabel, shiftMonth, shortMonthLabel } from '@/lib/dashboard'
import { metaCostByDay, periodOf, resultOf, type AnalysisData } from '@/lib/analysis'
import { dueIn, paymentsFor, type Due, type PersonalItem, type PersonalMove } from '@/lib/finances'
import { fetchAnalysisData } from './analysis-admin'
import { cardClass } from './ui'

const monthOf = (move: PersonalMove) => move.period ?? move.day.slice(0, 7)

type MonthTotals = {
  month: string
  business: { in: number; out: number }
  personal: { in: number; out: number; pendingIn: number; pendingOut: number }
  in: number; out: number; left: number
}

/**
 * All her money in a month, business and personal together, without counting anything twice: the business brings its
 * sales and its costs (Meta, the team, other expenses); the personal side brings what came in and went out of her own
 * pocket, leaving out the weekly withdrawals (they are part of the business sales) and what she marked as business.
 * For the current and coming months, what is still expected (incomes and fixed expenses not paid yet) is added apart.
 */
function totalsFor(month: string, data: AnalysisData, meta: ReturnType<typeof metaCostByDay>, items: PersonalItem[], moves: PersonalMove[], current: string): MonthTotals {
  const result = resultOf(periodOf('mes', `${month}-01`), data, meta)
  const own = moves.filter((move) => monthOf(move) === month && move.scope === 'personal' && move.kind !== 'entre_cuentas' && move.category !== 'emprendimiento')
  const personalIn = own.filter((move) => move.kind === 'ingreso').reduce((sum, move) => sum + move.amount, 0)
  const personalOut = own.filter((move) => move.kind === 'gasto').reduce((sum, move) => sum + move.amount, 0)
  let pendingIn = 0
  let pendingOut = 0
  if (month >= current) {
    for (const due of items.map((item) => dueIn(item, month)).filter((row): row is Due => row !== null)) {
      if (paymentsFor(due, moves, month).length || due.amount === null) continue
      if (due.item.kind === 'ingreso') pendingIn += due.amount
      else pendingOut += due.amount
    }
  }
  const totalIn = result.revenue + personalIn + pendingIn
  const totalOut = result.invested + personalOut + pendingOut
  return {
    month,
    business: { in: result.revenue, out: result.invested },
    personal: { in: personalIn, out: personalOut, pendingIn, pendingOut },
    in: totalIn, out: totalOut, left: totalIn - totalOut,
  }
}

/** "Toda tu plata": the month on screen in detail, and month by month since there is data. */
export function MoneyOverview({ month, items, moves, money }: { month: string; items: PersonalItem[]; moves: PersonalMove[]; money: (value: number) => string }) {
  const [data, setData] = useState<AnalysisData | null>(null)
  useEffect(() => { fetchAnalysisData().then(({ data: loaded }) => setData(loaded)) }, [])
  const current = monthKey(new Date())

  const rows = useMemo(() => {
    if (!data) return []
    const meta = metaCostByDay(data)
    const first = [...moves.map(monthOf), ...data.sales.map((sale) => sale.paid_at.slice(0, 7))].sort()[0] ?? current
    const list: MonthTotals[] = []
    for (let key = current; key >= first; key = shiftMonth(key, -1)) list.push(totalsFor(key, data, meta, items, moves, current))
    return list
  }, [data, items, moves, current])

  if (!data) return null
  const row = rows.find((item) => item.month === month) ?? totalsFor(month, data, metaCostByDay(data), items, moves, current)
  const pending = row.personal.pendingIn || row.personal.pendingOut
  // A month is partial until its Ualá statement is loaded (the day to day is only there) and its salary is noted.
  const hasStatement = (key: string) => moves.some((move) => move.source === `uala-${key}`)
  const hasSalary = (key: string) => moves.some((move) => monthOf(move) === key && move.kind === 'ingreso' && move.category === 'sueldo')
  const incomplete = (key: string) => !hasStatement(key) || !hasSalary(key)
  const missing = (key: string) => [!hasStatement(key) && `el extracto de Ualá de ${monthLabel(key).toLowerCase()}`, !hasSalary(key) && 'tu sueldo'].filter(Boolean).join(' y ')

  return (
    <section className={cardClass} aria-labelledby="overview-title">
      <h2 id="overview-title" className="font-display text-lg font-bold text-ciruela">Toda tu plata en {monthLabel(month).toLowerCase()}</h2>
      <p className="text-sm text-piedra">Negocio y personal juntos. Tus retiros semanales no se suman aparte: ya están dentro de las ventas del negocio.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-whatsapp/10 p-4">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-piedra">Entró</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ciruela">{money(Math.round(row.in))}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-piedra">
            <li>Negocio (ventas): {money(Math.round(row.business.in))}</li>
            <li>Personal (sueldo, ANSES, Anto…): {money(Math.round(row.personal.in))}</li>
            {row.personal.pendingIn > 0 && <li>Por cobrar todavía: {money(Math.round(row.personal.pendingIn))}</li>}
          </ul>
        </div>
        <div className="rounded-2xl bg-petalo-wash/60 p-4">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-piedra">Salió</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ciruela">{money(Math.round(row.out))}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-piedra">
            <li>Negocio (Meta, equipo, gastos): {money(Math.round(row.business.out))}</li>
            <li>Personal: {money(Math.round(row.personal.out))}</li>
            {row.personal.pendingOut > 0 && <li>Por pagar todavía: {money(Math.round(row.personal.pendingOut))}</li>}
          </ul>
        </div>
        <div className="rounded-2xl bg-ciruela p-4 text-white">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">{incomplete(month) ? (row.left >= 0 ? 'Por ahora queda' : 'Por ahora falta') : row.left >= 0 ? 'Quedó' : 'Faltó'}</p>
          <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${row.left >= 0 ? 'text-petalo' : 'text-white'}`}>{money(Math.round(Math.abs(row.left)))}</p>
          <p className="mt-1 text-xs text-white/75">{pending ? 'Contando lo que falta cobrar y pagar.' : 'Con lo que ya pasó.'}{month === current ? ' El día a día de este mes se suma a medida que lo cargás.' : ''}</p>
        </div>
      </div>
      {incomplete(month) && <p className="mt-2 text-xs font-semibold text-rosa-deep">Número parcial: falta {missing(month)}. Recién con eso cargado vas a ver el total real de lo que gastaste en el mes.</p>}

      {rows.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-piedra"><th className="pb-2 font-semibold">Mes</th><th className="pb-2 text-right font-semibold">Entró</th><th className="pb-2 text-right font-semibold">Salió</th><th className="pb-2 text-right font-semibold">Quedó</th></tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.month} className={`border-t border-line ${item.month === month ? 'bg-petalo-wash/60' : ''}`}>
                  <td className="py-2 pr-3 font-semibold text-ink">{shortMonthLabel(item.month)} {item.month.slice(0, 4)}{incomplete(item.month) ? ' *' : ''}</td>
                  <td className="py-2 text-right tabular-nums">{money(Math.round(item.in))}</td>
                  <td className="py-2 text-right tabular-nums">{money(Math.round(item.out))}</td>
                  <td className={`py-2 text-right font-bold tabular-nums ${item.left >= 0 ? 'text-ciruela' : 'text-rosa-deep'}`}>{money(Math.round(item.left))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.some((item) => incomplete(item.month)) && <p className="mt-2 text-xs text-piedra">* Parcial: falta el extracto del mes (o tu sueldo). Es un estimado con lo que está cargado hasta ahora.</p>}
        </div>
      )}
    </section>
  )
}
