'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { dayKey, monthKey, monthLabel, shiftMonth, shortMonthLabel } from '@/lib/dashboard'
import { daysOf, monthMatrix, periodOf, resultOf } from '@/lib/analysis'
import { errorMessage, supabase } from '@/lib/supabase'
import { fetchAnalysisData, type Data } from './analysis-admin'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

type Goal = { target: number; save_share: number; live_share: number; ad_cap_usd: number }
type Move = { id: string; day: string; amount: number; note: string | null }

const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 })
const monthFormat = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** The 10 million goal: how the business profit is split every month (save, live, keep in the business) and how far she is. */
export function SavingsAdmin() {
  const { money } = useHideMoney()
  const [data, setData] = useState<Data | null>(null)
  const [goal, setGoal] = useState<Goal>({ target: 10000000, save_share: 60, live_share: 25, ad_cap_usd: 23 })
  const [moves, setMoves] = useState<Move[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [{ data: loaded, error: failed }, goalRow, moveRows] = await Promise.all([
      fetchAnalysisData(),
      supabase.from('savings_goal').select('target, save_share, live_share, ad_cap_usd').eq('id', 1).maybeSingle(),
      supabase.from('savings_moves').select('id, day, amount, note').order('day', { ascending: false }),
    ])
    setError(failed || (goalRow.error ? errorMessage(goalRow.error) : '') || (moveRows.error ? errorMessage(moveRows.error) : ''))
    setData(loaded)
    if (goalRow.data) setGoal({ target: Number(goalRow.data.target), save_share: goalRow.data.save_share, live_share: goalRow.data.live_share, ad_cap_usd: Number(goalRow.data.ad_cap_usd) })
    setMoves(((moveRows.data as Move[] | null) ?? []).map((row) => ({ ...row, amount: Number(row.amount) })))
  }, [])
  useEffect(() => { load() }, [load])

  const today = dayKey(new Date())
  const current = monthKey(new Date())
  const saved = moves.reduce((sum, move) => sum + move.amount, 0)
  const left = Math.max(goal.target - saved, 0)
  const keep = 100 - goal.save_share - goal.live_share

  const months = useMemo(() => {
    if (!data) return []
    const first = [...data.sales.map((sale) => dayKey(sale.paid_at).slice(0, 7))].sort()[0] ?? current
    const list: string[] = []
    for (let key = current; key >= first; key = shiftMonth(key, -1)) list.push(key)
    return monthMatrix(list.slice(0, 12), data).map((row) => ({ ...row, saved: moves.filter((move) => move.day.slice(0, 7) === row.month).reduce((sum, move) => sum + move.amount, 0) }))
  }, [data, moves, current])

  if (!data) return <p className="text-sm text-piedra">Cargando…</p>

  // This month so far, and where it would end at this pace (by days elapsed).
  const month = resultOf(periodOf('mes', `${current}-01`), data)
  const elapsed = daysOf(periodOf('mes', `${current}-01`)).filter((day) => day <= today).length
  const total = daysOf(periodOf('mes', `${current}-01`)).length
  const projected = month.profit * (total / Math.max(elapsed, 1))
  // Monthly pace: the last full months and this one projected.
  const full = months.filter((row) => row.month < current).slice(0, 2).map((row) => row.profit)
  const pace = [...full, projected].reduce((sum, value) => sum + value, 0) / (full.length + 1)
  const perMonth = Math.max(pace * (goal.save_share / 100), 0)
  const monthsToGoal = perMonth > 0 ? Math.ceil(left / perMonth) : null
  const reach = monthsToGoal !== null ? monthFormat.format(new Date(`${shiftMonth(current, monthsToGoal)}-01T00:00:00Z`)) : null
  const toSaveNow = Math.max(month.profit * (goal.save_share / 100), 0)
  const savedThisMonth = moves.filter((move) => move.day.slice(0, 7) === current).reduce((sum, move) => sum + move.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><HideMoneyButton /></div>
      {error && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

      {/* The goal */}
      <section className="rounded-[32px] bg-ciruela p-6 text-white">
        <p className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-white/70"><PiggyBank className="h-4 w-4" />Tu meta</p>
        <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">{money(saved)} <span className="text-lg font-bold text-white/70">de {money(goal.target)}</span></p>
        <div className="mt-4 h-3 rounded-full bg-white/15"><div className="h-3 rounded-full bg-petalo" style={{ width: `${Math.min((saved / goal.target) * 100, 100)}%` }} /></div>
        <p className="mt-3 text-sm text-white/80">
          {saved >= goal.target ? '¡Llegaste! 🎉' : <>Te faltan <b>{money(left)}</b>. {monthsToGoal !== null ? <>Al ritmo de hoy (ahorrando {money(Math.round(perMonth))} por mes) llegás en <b>{monthsToGoal} {monthsToGoal === 1 ? 'mes' : 'meses'}</b>, para {reach}.</> : 'Con la ganancia de ahora no alcanza para estimar cuándo llegás.'}</>}
        </p>
      </section>

      {/* This month */}
      <section className={cardClass} aria-labelledby="month-title">
        <h2 id="month-title" className="font-display text-lg font-bold text-ciruela">{monthLabel(current)}: cómo repartir la ganancia</h2>
        <p className="text-sm text-piedra">Ganancia hasta hoy: <b className="text-ink">{money(Math.round(month.profit))}</b> (facturado menos Meta, equipo y gastos). Si sigue así, cierra en {money(Math.round(projected))}.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Share label="Ahorro" share={goal.save_share} value={toSaveNow} note={savedThisMonth ? `Ya transferiste ${money(savedThisMonth)}` : 'Todavía no transferiste'} strong money={money} />
          <Share label="Para vos" share={goal.live_share} value={Math.max(month.profit * (goal.live_share / 100), 0)} note="Salidas, gustos, lo que quieras" money={money} />
          <Share label="Colchón del negocio" share={keep} value={Math.max(month.profit * (keep / 100), 0)} note="Meses flojos, imprevistos, reinversión" money={money} />
        </div>
        {toSaveNow - savedThisMonth > 0 && <p className="mt-3 rounded-2xl bg-whatsapp/10 px-4 py-3 text-sm text-ink">👉 Este mes te toca pasar <b>{money(Math.round(toSaveNow - savedThisMonth))}</b> más a la cuenta de ahorro.</p>}
        <MoveForm onSaved={load} />
      </section>

      {/* The plan */}
      <section className={cardClass} aria-labelledby="plan-title">
        <h2 id="plan-title" className="font-display text-lg font-bold text-ciruela">El plan</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink">
          <li><b>Primero te pagás el ahorro.</b> Tu sueldo cubre los gastos fijos, así que la ganancia del emprendimiento puede ir casi toda a la meta. Cada lunes, con la revisión de anuncios, pasá el {goal.save_share}% de lo que ganaste esa semana a una cuenta aparte que no uses para el día a día.</li>
          <li><b>Para vos, sin culpa:</b> el {goal.live_share}% es para vivir (salidas, gustos, regalos). Si lo tenés asignado, no lo vas a sacar del ahorro.</li>
          <li><b>Colchón del negocio:</b> el {keep}% queda en el emprendimiento para los meses flojos, Canva, el equipo o una campaña que funcione.</li>
          <li><b>Anuncios con techo:</b> nunca más de US${goal.ad_cap_usd} por día. Si la revisión del lunes dice que el retorno es bajo, no subas presupuesto: mejorá cómo cerrás los mensajes.</li>
          <li><b>Todo gasto, cargado:</b> si un gasto no está en Análisis, la ganancia que ves es mentira y el ahorro también.</li>
          <li><b>Mes flojo, mismo porcentaje:</b> si ganás menos, ahorrás menos, pero no cortás la costumbre.</li>
          <li><b>Fin de mes:</b> mirá "Mes a mes" en Análisis y la tabla de abajo. Si te atrasaste, subí unos puntos el ahorro el mes siguiente.</li>
        </ol>
        <p className="mt-3 text-xs text-piedra">Dónde guardar la plata (cuenta remunerada, dólares, plazo fijo u otra opción) lo elegís vos; no te puedo recomendar inversiones. Lo importante es que esté separada de la cuenta del día a día.</p>
        <Settings goal={goal} onSaved={load} />
      </section>

      {/* Month by month */}
      <section className={cardClass} aria-labelledby="saving-months-title">
        <h2 id="saving-months-title" className="font-display text-lg font-bold text-ciruela">Mes a mes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-piedra"><th className="pb-2 font-semibold">Mes</th><th className="pb-2 text-right font-semibold">Ganancia</th><th className="pb-2 text-right font-semibold">Tocaba ahorrar</th><th className="pb-2 text-right font-semibold">Ahorraste</th><th className="pb-2 text-right font-semibold">Diferencia</th></tr></thead>
            <tbody>
              {months.map((row) => {
                const due = Math.max(row.profit * (goal.save_share / 100), 0)
                return (
                  <tr key={row.month} className="border-t border-line">
                    <td className="py-2 font-semibold text-ink">{shortMonthLabel(row.month)} {row.month.slice(0, 4)}</td>
                    <td className="py-2 text-right tabular-nums">{money(Math.round(row.profit))}</td>
                    <td className="py-2 text-right tabular-nums">{money(Math.round(due))}</td>
                    <td className="py-2 text-right tabular-nums">{money(row.saved)}</td>
                    <td className={`py-2 text-right font-bold tabular-nums ${row.saved >= due ? 'text-whatsapp' : 'text-rosa-deep'}`}>{row.saved >= due ? '✓' : money(Math.round(row.saved - due))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transfers */}
      <section className={cardClass} aria-labelledby="moves-title">
        <h2 id="moves-title" className="font-display text-lg font-bold text-ciruela">Lo que fuiste ahorrando</h2>
        {moves.length === 0 ? <p className="mt-3 text-sm text-piedra">Todavía no cargaste ninguna transferencia al ahorro.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">{moves.map((move) => <MoveRow key={move.id} move={move} money={money} onChanged={load} />)}</ul>
        )}
      </section>
    </div>
  )
}

function Share({ label, share, value, note, strong, money }: { label: string; share: number; value: number; note: string; strong?: boolean; money: (value: number) => string }) {
  return (
    <div className={`rounded-3xl p-4 ${strong ? 'bg-rosa text-white' : 'bg-papel text-ciruela'}`}>
      <p className={`font-display text-xs font-semibold uppercase tracking-wider ${strong ? 'text-white/80' : 'text-piedra'}`}>{label} · {percent.format(share / 100)}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{money(Math.round(value))}</p>
      <p className={`text-xs ${strong ? 'text-white/85' : 'text-piedra'}`}>{note}</p>
    </div>
  )
}

function MoveForm({ onSaved }: { onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState(dayKey(new Date()))
  const [note, setNote] = useState('')
  const [withdraw, setWithdraw] = useState(false)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save() {
    const value = Number(amount.replace(/\./g, '').replace(',', '.'))
    if (!(value > 0)) { flash.show('error', 'Poné cuánto pasaste.'); return }
    setBusy(true)
    const { error } = await supabase.from('savings_moves').insert({ amount: withdraw ? -value : value, day, note: note.trim() || null })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setAmount(''); setNote(''); setWithdraw(false)
    flash.show('ok', withdraw ? 'Retiro guardado.' : '¡Bien! Ahorro guardado.')
    onSaved()
  }
  return (
    <div className="mt-4 rounded-2xl bg-papel/60 p-4">
      <p className="text-sm font-semibold text-ink">Cargar una transferencia al ahorro</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="$ que pasaste" aria-label="Monto" className={`${inputClass} mt-0`} />
        <input type="date" value={day} onChange={(event) => setDay(event.target.value)} aria-label="Fecha" className={`${inputClass} mt-0 w-auto`} />
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota (opcional)" aria-label="Nota" className={`${inputClass} mt-0`} />
        <Button busy={busy} onClick={save}><Plus className="h-4 w-4" />Guardar</Button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-piedra"><input type="checkbox" checked={withdraw} onChange={(event) => setWithdraw(event.target.checked)} className="h-4 w-4 accent-rosa" />Es un retiro (saqué plata del ahorro)</label>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </div>
  )
}

function MoveRow({ move, money, onChanged }: { move: Move; money: (value: number) => string; onChanged: () => void }) {
  async function remove() {
    if (!window.confirm(`¿Borrar el movimiento de ${money(Math.abs(move.amount))} del ${move.day.slice(8)}/${move.day.slice(5, 7)}?`)) return
    await supabase.from('savings_moves').delete().eq('id', move.id)
    onChanged()
  }
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0"><span className="block text-ink">{move.day.slice(8)}/{move.day.slice(5, 7)}/{move.day.slice(0, 4)}{move.note ? ` · ${move.note}` : ''}</span></span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`font-semibold tabular-nums ${move.amount < 0 ? 'text-rosa-deep' : 'text-whatsapp'}`}>{move.amount < 0 ? '−' : '+'}{money(Math.abs(move.amount))}</span>
        <button type="button" onClick={remove} className="rounded-full p-1.5 text-piedra hover:bg-papel hover:text-rosa-deep" aria-label="Borrar movimiento"><Trash2 className="h-4 w-4" /></button>
      </span>
    </li>
  )
}

function Settings({ goal, onSaved }: { goal: Goal; onSaved: () => void }) {
  const [form, setForm] = useState(goal)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  useEffect(() => { setForm(goal) }, [goal])
  async function save() {
    if (form.save_share + form.live_share > 100) { flash.show('error', 'Ahorro y "para vos" no pueden sumar más de 100%.'); return }
    setBusy(true)
    const { error } = await supabase.from('savings_goal').update({ ...form, updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', 'Plan actualizado.')
    onSaved()
  }
  return (
    <details className="mt-4 rounded-2xl border border-line p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ciruela">Ajustar la meta y los porcentajes</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <Field label="Meta ($)"><input value={form.target} onChange={(event) => setForm({ ...form, target: Number(event.target.value.replace(/\D/g, '')) || 0 })} inputMode="numeric" className={inputClass} /></Field>
        <Field label="Ahorro (%)"><input type="number" min={0} max={100} value={form.save_share} onChange={(event) => setForm({ ...form, save_share: Number(event.target.value) })} className={inputClass} /></Field>
        <Field label="Para vos (%)"><input type="number" min={0} max={100} value={form.live_share} onChange={(event) => setForm({ ...form, live_share: Number(event.target.value) })} className={inputClass} /></Field>
        <Field label="Tope anuncios (US$/día)"><input type="number" min={0} step="0.5" value={form.ad_cap_usd} onChange={(event) => setForm({ ...form, ad_cap_usd: Number(event.target.value) })} className={inputClass} /></Field>
      </div>
      <p className="mt-2 text-xs text-piedra">Colchón del negocio: {Math.max(100 - form.save_share - form.live_share, 0)}%. El tope de anuncios lo usa la revisión de los lunes.</p>
      <Button className="mt-3" busy={busy} onClick={save}>Guardar plan</Button>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </details>
  )
}
