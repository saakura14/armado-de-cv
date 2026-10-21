'use client'

import { useCallback, useEffect, useState } from 'react'
import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { dayKey, monthKey, shiftMonth, shortMonthLabel } from '@/lib/dashboard'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

type Move = { id: string; day: string; amount: number; note: string | null }

const monthFormat = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** The savings goal: one target, and what Vale writes down every time she puts money aside (no percentages). */
export function SavingsAdmin() {
  const { money } = useHideMoney()
  const [target, setTarget] = useState(10000000)
  const [moves, setMoves] = useState<Move[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [goalRow, moveRows] = await Promise.all([
      supabase.from('savings_goal').select('target').eq('id', 1).maybeSingle(),
      supabase.from('savings_moves').select('id, day, amount, note').order('day', { ascending: false }),
    ])
    setError((goalRow.error ? errorMessage(goalRow.error) : '') || (moveRows.error ? errorMessage(moveRows.error) : ''))
    if (goalRow.data) setTarget(Number(goalRow.data.target))
    setMoves(((moveRows.data as Move[] | null) ?? []).map((row) => ({ ...row, amount: Number(row.amount) })))
  }, [])
  useEffect(() => { load() }, [load])

  const saved = moves.reduce((sum, move) => sum + move.amount, 0)
  const left = Math.max(target - saved, 0)
  const current = monthKey(new Date())

  // Month by month since the first saving, and the average of the months already closed (or this one, at the start).
  const first = moves.map((move) => move.day.slice(0, 7)).sort()[0] ?? current
  const months: { key: string; total: number }[] = []
  for (let key = current; key >= first; key = shiftMonth(key, -1)) months.push({ key, total: moves.filter((move) => move.day.slice(0, 7) === key).reduce((sum, move) => sum + move.amount, 0) })
  const closed = months.filter((row) => row.key < current)
  const pace = closed.length ? closed.reduce((sum, row) => sum + row.total, 0) / closed.length : months[0]?.total ?? 0
  const monthsToGoal = pace > 0 && left > 0 ? Math.ceil(left / pace) : null

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><HideMoneyButton /></div>
      {error && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

      <section className="overflow-hidden rounded-[32px] bg-ciruela p-6 text-white">
        <p className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-white/70"><PiggyBank className="h-4 w-4" />Tu auto 🚗</p>
        <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">{money(saved)} <span className="text-lg font-bold text-white/70">de {money(target)}</span></p>
        <Road progress={Math.min(saved / target, 1)} />
        <p className="mt-2 font-script text-3xl leading-tight text-petalo">{motivation(saved / target)}</p>
        <p className="mt-2 text-sm text-white/80">
          {saved >= target ? '¡Llegaste! 🎉' : <>Te faltan <b>{money(left)}</b> ({Math.round((saved / target) * 100)}% hecho).{monthsToGoal !== null && <> Si seguís ahorrando como hasta ahora ({money(Math.round(pace))} por mes), llegás en {monthsToGoal} {monthsToGoal === 1 ? 'mes' : 'meses'}, para {monthFormat.format(new Date(`${shiftMonth(current, monthsToGoal)}-01T00:00:00Z`))}.</>}</>}
        </p>
      </section>

      <section className={cardClass} aria-labelledby="add-title">
        <h2 id="add-title" className="font-display text-lg font-bold text-ciruela">Cargar lo que ahorraste</h2>
        <p className="text-sm text-piedra">Cada vez que separes plata, anotala acá. Si un día sacás, marcalo como retiro.</p>
        <MoveForm onSaved={load} />
      </section>

      {months.some((row) => row.total) && (
        <section className={cardClass} aria-labelledby="months-title">
          <h2 id="months-title" className="font-display text-lg font-bold text-ciruela">Mes a mes</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {months.map((row) => <li key={row.key} className="flex justify-between gap-3 py-2"><span className="font-semibold text-ink">{shortMonthLabel(row.key)} {row.key.slice(0, 4)}</span><span className="tabular-nums">{money(row.total)}</span></li>)}
          </ul>
        </section>
      )}

      <section className={cardClass} aria-labelledby="moves-title">
        <h2 id="moves-title" className="font-display text-lg font-bold text-ciruela">Todo lo que fuiste ahorrando</h2>
        {moves.length === 0 ? <p className="mt-3 text-sm text-piedra">Todavía no cargaste nada.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">{moves.map((move) => <MoveRow key={move.id} move={move} money={money} onChanged={load} />)}</ul>
        )}
        <TargetForm target={target} onSaved={load} />
      </section>
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
    if (!(value > 0)) { flash.show('error', 'Poné cuánto ahorraste.'); return }
    setBusy(true)
    const { error } = await supabase.from('savings_moves').insert({ amount: withdraw ? -value : value, day, note: note.trim() || null })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setAmount(''); setNote(''); setWithdraw(false)
    flash.show('ok', withdraw ? 'Retiro guardado.' : '¡Bien! Ahorro guardado.')
    onSaved()
  }
  return (
    <div className="mt-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="$ que separaste" aria-label="Monto" className={`${inputClass} mt-0`} />
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
      <span className="min-w-0 text-ink">{move.day.slice(8)}/{move.day.slice(5, 7)}/{move.day.slice(0, 4)}{move.note ? ` · ${move.note}` : ''}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`font-semibold tabular-nums ${move.amount < 0 ? 'text-rosa-deep' : 'text-whatsapp'}`}>{move.amount < 0 ? '−' : '+'}{money(Math.abs(move.amount))}</span>
        <button type="button" onClick={remove} className="rounded-full p-1.5 text-piedra hover:bg-papel hover:text-rosa-deep" aria-label="Borrar movimiento"><Trash2 className="h-4 w-4" /></button>
      </span>
    </li>
  )
}

function TargetForm({ target, onSaved }: { target: number; onSaved: () => void }) {
  const [value, setValue] = useState(String(target))
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  useEffect(() => { setValue(String(target)) }, [target])
  async function save() {
    const amount = Number(value.replace(/\D/g, ''))
    if (!(amount > 0)) { flash.show('error', 'Poné el monto de la meta.'); return }
    setBusy(true)
    const { error } = await supabase.from('savings_goal').update({ target: amount, updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    flash.show('ok', 'Meta actualizada.')
    onSaved()
  }
  return (
    <details className="mt-4 rounded-2xl border border-line p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ciruela">Cambiar la meta</summary>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Meta ($)" className="flex-1"><input value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" className={inputClass} /></Field>
        <Button busy={busy} onClick={save}>Guardar</Button>
      </div>
      {flash.node && <div className="mt-2">{flash.node}</div>}
    </details>
  )
}

/** A phrase for where she is on the way to the car. */
function motivation(progress: number) {
  if (progress >= 1) return '¡Lo lograste! Ahora andá a buscar tu auto 🔑'
  if (progress >= 0.9) return 'Ya se siente el olor a auto nuevo. ¡Último tramo!'
  if (progress >= 0.75) return 'Falta poquito: andá eligiendo el color.'
  if (progress >= 0.5) return '¡Mitad del camino! Lo que empezó como idea ya es medio auto.'
  if (progress >= 0.25) return 'Un cuarto del camino: cada CV que entregás es un kilómetro más.'
  if (progress > 0) return 'Arrancaste. Cada peso que separás te acerca a manejarlo.'
  return 'Tu auto te espera al final del camino. Cargá tu primer ahorro y arrancamos.'
}

/** The road to the car: the little car moves with what's saved, the flag is the goal. */
function Road({ progress }: { progress: number }) {
  const left = `calc(${progress * 100}% - ${progress * 56}px)`
  return (
    <div className="relative mt-5 h-20" role="img" aria-label={`Llevás el ${Math.round(progress * 100)}% del camino a tu auto`}>
      {/* Road with dashed center line */}
      <div className="absolute inset-x-0 bottom-2 h-6 rounded-full bg-white/15">
        <div className="absolute inset-y-0 left-0 rounded-full bg-petalo/40" style={{ width: `${progress * 100}%` }} />
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/40" />
      </div>
      {/* Finish flag */}
      <span className="absolute -top-1 right-0 text-3xl" aria-hidden="true">🏁</span>
      {/* The car, slightly bouncing */}
      <svg viewBox="0 0 64 32" className="absolute bottom-4 h-10 w-14 animate-[bounce_2s_ease-in-out_infinite] drop-shadow-lg transition-[left] duration-1000" style={{ left }} aria-hidden="true">
        <path d="M6 22 L9 13 Q11 9 16 9 L38 9 Q43 9 46 13 L51 18 L58 19 Q61 20 61 23 L61 25 L4 25 Q3 23 6 22 Z" fill="#e8959b" />
        <path d="M14 18 L17 12 L28 12 L28 18 Z M31 12 L39 12 Q42 12 44 15 L46 18 L31 18 Z" fill="#fbeaec" opacity="0.9" />
        <circle cx="16" cy="25" r="5" fill="#43202c" /><circle cx="16" cy="25" r="2" fill="#f5efd9" />
        <circle cx="48" cy="25" r="5" fill="#43202c" /><circle cx="48" cy="25" r="2" fill="#f5efd9" />
        <circle cx="58.5" cy="21" r="1.5" fill="#f5efd9" />
      </svg>
    </div>
  )
}
