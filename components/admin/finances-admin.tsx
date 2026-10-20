'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'
import { HideMoneyButton } from './hide-money-button'
import { dayKey, monthKey, monthLabel, shiftMonth } from '@/lib/dashboard'
import {
  ACCOUNTS, CATEGORIES, ITEM_SELECT, MOVE_SELECT, categoryOf, daysUntil, debtProgress, dueIn, paymentsFor, planProgress,
  type Due, type PersonalItem, type PersonalMove,
} from '@/lib/finances'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

const short = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`
const parseAmount = (value: string) => Number(value.replace(/\./g, '').replace(',', '.'))
const monthOf = (move: PersonalMove) => move.period ?? move.day.slice(0, 7)

/**
 * Vale's personal money, apart from the business: what comes in (salary, the advance, ANSES, Anto's allowance), the fixed
 * expenses with their due dates, the loans and installments with what's left, and the day-to-day. "Te queda" is what
 * the month leaves once everything expected is paid.
 */
export function FinancesAdmin() {
  const { money } = useHideMoney()
  const [items, setItems] = useState<PersonalItem[]>([])
  const [moves, setMoves] = useState<PersonalMove[]>([])
  const [error, setError] = useState('')
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const today = dayKey(new Date())

  const load = useCallback(async () => {
    const [itemRows, moveRows] = await Promise.all([
      supabase.from('personal_items').select(ITEM_SELECT).order('sort').order('name'),
      supabase.from('personal_moves').select(MOVE_SELECT).order('day', { ascending: false }),
    ])
    setError((itemRows.error ? errorMessage(itemRows.error) : '') || (moveRows.error ? errorMessage(moveRows.error) : ''))
    setItems(((itemRows.data as PersonalItem[] | null) ?? []).map((row) => ({ ...row, amount: row.amount === null ? null : Number(row.amount), total: row.total === null ? null : Number(row.total), paid_before: Number(row.paid_before) })))
    setMoves(((moveRows.data as PersonalMove[] | null) ?? []).map((row) => ({ ...row, amount: Number(row.amount) })))
  }, [])
  useEffect(() => { load() }, [load])

  const view = useMemo(() => {
    const dues = items.map((item) => dueIn(item, month)).filter((due): due is Due => due !== null)
    const withPaid = dues.map((due) => {
      const payments = paymentsFor(due, moves, month)
      return { due, payments, paid: payments.reduce((sum, move) => sum + move.amount, 0) }
    }).sort((a, b) => (a.due.due ?? '9999').localeCompare(b.due.due ?? '9999'))
    const incomes = withPaid.filter((row) => row.due.item.kind === 'ingreso')
    const expenses = withPaid.filter((row) => row.due.item.kind === 'gasto')
    const monthMoves = moves.filter((move) => monthOf(move) === month)
    const personal = monthMoves.filter((move) => move.scope === 'personal' && move.kind !== 'entre_cuentas')
    const tied = new Set(withPaid.flatMap((row) => row.payments.map((move) => move.id)))
    const expected = (rows: typeof withPaid) => rows.reduce((sum, row) => sum + (row.paid || row.due.amount || 0), 0)
    const incomeExpected = expected(incomes) + personal.filter((move) => move.kind === 'ingreso' && !tied.has(move.id)).reduce((sum, move) => sum + move.amount, 0)
    const incomeIn = personal.filter((move) => move.kind === 'ingreso').reduce((sum, move) => sum + move.amount, 0)
    const fixedExpected = expected(expenses)
    const fixedPaid = expenses.reduce((sum, row) => sum + row.paid, 0)
    const daily = personal.filter((move) => move.kind === 'gasto' && !tied.has(move.id)).reduce((sum, move) => sum + move.amount, 0)
    const unknown = [...incomes, ...expenses].filter((row) => !row.paid && row.due.amount === null).length
    const byCategory = new Map<string, number>()
    for (const move of personal.filter((row) => row.kind === 'gasto')) byCategory.set(move.category, (byCategory.get(move.category) ?? 0) + move.amount)
    const categories = [...byCategory.entries()].map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total)
    // Ualá holds the business money too (it earns interest): her part this month is what came in to her there (the weekly
    // withdrawals, Anto's allowance) minus what she paid from it.
    const ualaIn = personal.filter((move) => move.kind === 'ingreso' && move.account === 'Ualá').reduce((sum, move) => sum + move.amount, 0)
    const ualaOut = personal.filter((move) => move.kind === 'gasto' && move.account === 'Ualá').reduce((sum, move) => sum + move.amount, 0)
    const withdrawals = personal.filter((move) => move.category === 'emprendimiento').reduce((sum, move) => sum + move.amount, 0)
    return { incomes, expenses, monthMoves, incomeExpected, incomeIn, fixedExpected, fixedPaid, daily, unknown, categories, left: incomeExpected - fixedExpected - daily, ualaIn, ualaOut, withdrawals }
  }, [items, moves, month])

  const loans = items.filter((item) => item.active && item.kind === 'gasto' && (item.type === 'cuotas' || item.type === 'deuda'))
  const unclassified = moves.filter((move) => move.category === 'sin_clasificar' && move.kind !== 'entre_cuentas' && move.scope === 'personal')
  const spentMax = Math.max(...view.categories.map((row) => row.total), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-full border border-line bg-white p-2 text-piedra hover:text-ciruela" aria-label="Mes anterior"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-center font-display text-xl font-extrabold text-ciruela">{monthLabel(month)}</h2>
        <div className="flex items-center gap-2">
          <HideMoneyButton />
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-full border border-line bg-white p-2 text-piedra hover:text-ciruela" aria-label="Mes siguiente"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      {error && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

      {/* The month in four numbers */}
      <section className="overflow-hidden rounded-[32px] bg-ciruela text-white" aria-labelledby="month-title">
        <h2 id="month-title" className="sr-only">Resumen del mes</h2>
        <div className="grid gap-px bg-white/10 sm:grid-cols-4">
          <div className="bg-ciruela p-5">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">Entra</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{money(Math.round(view.incomeExpected))}</p>
            <p className="mt-1 text-sm text-white/75">Ya cobraste {money(Math.round(view.incomeIn))}</p>
          </div>
          <div className="bg-ciruela p-5">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">Fijos y cuotas</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{money(Math.round(view.fixedExpected))}</p>
            <p className="mt-1 text-sm text-white/75">Pagaste {money(Math.round(view.fixedPaid))}</p>
          </div>
          <div className="bg-ciruela p-5">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">Día a día</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{money(Math.round(view.daily))}</p>
            <p className="mt-1 text-sm text-white/75">Súper, delivery, salidas…</p>
          </div>
          <div className="bg-ciruela p-5">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">{view.left >= 0 ? 'Te queda' : 'Te falta'}</p>
            <p className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${view.left >= 0 ? 'text-petalo' : 'text-white'}`}>{money(Math.round(Math.abs(view.left)))}</p>
            <p className="mt-1 text-sm text-white/75">{view.unknown ? `Sin contar ${view.unknown} ${view.unknown === 1 ? 'monto a confirmar' : 'montos a confirmar'}` : 'Con todo lo previsto'}</p>
          </div>
        </div>
      </section>

      <section className={cardClass} aria-labelledby="uala-title">
        <h2 id="uala-title" className="font-display text-lg font-bold text-ciruela">Tu parte en Ualá</h2>
        <p className="text-sm text-piedra">En Ualá está también la plata del negocio. Lo tuyo es lo que te retiraste del emprendimiento (Análisis → "Tu retiro de la semana") y lo que te entró ahí, menos lo que pagaste desde Ualá.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <p><span className="block text-xs text-piedra">Te entró</span><b className="tabular-nums text-whatsapp">{money(Math.round(view.ualaIn))}</b><span className="block text-xs text-piedra">{view.withdrawals ? `${money(Math.round(view.withdrawals))} de retiros` : 'Sin retiros todavía'}</span></p>
          <p><span className="block text-xs text-piedra">Pagaste</span><b className="tabular-nums">{money(Math.round(view.ualaOut))}</b></p>
          <p><span className="block text-xs text-piedra">{view.ualaIn - view.ualaOut >= 0 ? 'Te queda' : 'Usaste del negocio'}</span><b className={`tabular-nums ${view.ualaIn - view.ualaOut >= 0 ? 'text-ciruela' : 'text-rosa-deep'}`}>{money(Math.round(Math.abs(view.ualaIn - view.ualaOut)))}</b></p>
        </div>
        {view.ualaIn - view.ualaOut < 0 && <p className="mt-2 text-xs text-rosa-deep">Gastaste desde Ualá más de lo que te retiraste: esa diferencia salió de la plata del negocio. Se compensa con el próximo retiro.</p>}
      </section>

      {unclassified.length > 0 && (
        <section className={`${cardClass} ring-2 ring-rosa/40`} aria-labelledby="unclassified-title">
          <h2 id="unclassified-title" className="font-display text-lg font-bold text-ciruela">❓ Para clasificar ({unclassified.length})</h2>
          <p className="text-sm text-piedra">Movimientos que no supe qué eran. Elegí la categoría, o marcalos como del negocio o entre tus cuentas.</p>
          <ul className="mt-3 divide-y divide-line text-sm">{unclassified.slice(0, 30).map((move) => <ClassifyRow key={move.id} move={move} money={money} onChanged={load} />)}</ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <DueList title="Para pagar" rows={view.expenses} month={month} today={today} money={money} onChanged={load} verb="Pagué" />
        <DueList title="Para cobrar" rows={view.incomes} month={month} today={today} money={money} onChanged={load} verb="Cobré" />
      </div>

      {loans.length > 0 && (
        <section className={cardClass} aria-labelledby="loans-title">
          <h2 id="loans-title" className="font-display text-lg font-bold text-ciruela">Préstamos y cuotas</h2>
          <ul className="mt-3 space-y-4">{loans.map((item) => <LoanRow key={item.id} item={item} moves={moves} money={money} onChanged={load} />)}</ul>
        </section>
      )}

      <section className={cardClass} aria-labelledby="add-title">
        <h2 id="add-title" className="font-display text-lg font-bold text-ciruela">Cargar un gasto o un ingreso</h2>
        <p className="text-sm text-piedra">Lo del día a día: súper, delivery, una salida, una plata que te pasaron. Lo fijo se marca arriba con "Pagué".</p>
        <MoveForm onSaved={load} />
      </section>

      {view.categories.length > 0 && (
        <section className={cardClass} aria-labelledby="cat-title">
          <h2 id="cat-title" className="font-display text-lg font-bold text-ciruela">En qué se fue la plata</h2>
          <ul className="mt-3 space-y-2">
            {view.categories.map((row) => (
              <li key={row.id} className="text-sm">
                <div className="flex justify-between gap-3"><span className="text-ink">{categoryOf(row.id).emoji} {categoryOf(row.id).label}</span><b className="tabular-nums text-ciruela">{money(Math.round(row.total))}</b></div>
                <div className="mt-1 h-2 rounded-full bg-papel"><div className="h-2 rounded-full bg-rosa" style={{ width: `${(row.total / spentMax) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={cardClass} aria-labelledby="moves-title">
        <h2 id="moves-title" className="font-display text-lg font-bold text-ciruela">Movimientos de {monthLabel(month).toLowerCase()}</h2>
        {view.monthMoves.length === 0 ? <p className="mt-3 text-sm text-piedra">Todavía no hay movimientos este mes.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">{view.monthMoves.map((move) => <MoveRow key={move.id} move={move} money={money} onChanged={load} />)}</ul>
        )}
      </section>

      <ItemsEditor items={items} money={money} onChanged={load} />
    </div>
  )
}

/** The fixed incomes or expenses of the month, by due date, with "Pagué"/"Cobré" to note them. */
function DueList({ title, rows, month, today, money, onChanged, verb }: {
  title: string; rows: { due: Due; payments: PersonalMove[]; paid: number }[]; month: string; today: string
  money: (value: number) => string; onChanged: () => void; verb: string
}) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className={cardClass} aria-label={title}>
      <h2 className="font-display text-lg font-bold text-ciruela">{title}</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-piedra">Nada este mes.</p> : (
        <ul className="mt-3 divide-y divide-line text-sm">
          {rows.map(({ due, payments, paid }) => {
            const key = `${due.item.id}-${due.installment ?? month}`
            const days = due.due ? daysUntil(due.due, today) : null
            const status = paid ? { text: `✓ ${verb === 'Pagué' ? 'Pagado' : 'Cobrado'} ${money(Math.round(paid))}`, tone: 'text-whatsapp' }
              : days === null ? { text: due.item.due_note ?? 'Sin fecha fija', tone: 'text-piedra' }
              : days < 0 ? { text: `Venció el ${short(due.due!)}`, tone: 'text-rosa-deep font-bold' }
              : days === 0 ? { text: 'Vence hoy', tone: 'text-rosa-deep font-bold' }
              : { text: `${verb === 'Pagué' ? 'Vence' : 'Llega'} el ${short(due.due!)}${days <= 3 ? ` (en ${days} ${days === 1 ? 'día' : 'días'})` : ''}`, tone: days <= 3 ? 'text-[#b9761c] font-semibold' : 'text-piedra' }
            return (
              <li key={key} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{categoryOf(due.item.category).emoji} {due.item.name}{due.installment !== null ? ` · cuota ${due.installment}${due.item.installments_total ? ` de ${due.item.installments_total}` : ''}` : ''}</p>
                    <p className={`text-xs ${status.tone}`}>{status.text}{due.item.account ? ` · ${due.item.account}` : ''}</p>
                    {due.item.notes && !paid && <p className="text-xs text-piedra">{due.item.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display font-bold tabular-nums text-ciruela">{due.amount !== null ? `${due.est ? '≈ ' : ''}${money(Math.round(due.amount))}` : 'A confirmar'}</span>
                    {paid ? (
                      <button type="button" onClick={async () => { if (!window.confirm('¿Desmarcar este pago?')) return; await supabase.from('personal_moves').delete().in('id', payments.map((move) => move.id)); onChanged() }} className="rounded-full p-1.5 text-piedra hover:bg-papel hover:text-rosa-deep" aria-label="Desmarcar"><X className="h-4 w-4" /></button>
                    ) : (
                      <button type="button" onClick={() => setOpen(open === key ? null : key)} className="inline-flex h-8 items-center gap-1 rounded-full bg-ciruela px-3 font-display text-xs font-bold text-white hover:bg-rosa"><Check className="h-3.5 w-3.5" />{verb}</button>
                    )}
                  </div>
                </div>
                {open === key && <PayForm due={due} month={month} onSaved={() => { setOpen(null); onChanged() }} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Notes the payment (or collection) of a fixed item or installment: the amount comes filled in and can change. */
function PayForm({ due, month, onSaved }: { due: Due; month: string; onSaved: () => void }) {
  const [amount, setAmount] = useState(due.amount !== null ? String(Math.round(due.amount * 100) / 100).replace('.', ',') : '')
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [account, setAccount] = useState(due.item.account ?? '')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save() {
    const value = parseAmount(amount)
    if (!(value > 0)) { flash.show('error', 'Poné el monto.'); return }
    setBusy(true)
    const { error } = await supabase.from('personal_moves').insert({
      day, kind: due.item.kind, item_id: due.item.id, period: due.installment === null ? month : null, installment: due.installment,
      category: due.item.category, concept: due.installment !== null ? `${due.item.name} · cuota ${due.installment}` : due.item.name, amount: value, account: account || null,
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved()
  }
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-2xl bg-papel/60 p-3">
      <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="$" aria-label="Monto" className={`${inputClass} mt-0 w-36`} />
      <input type="date" value={day} onChange={(event) => setDay(event.target.value)} aria-label="Fecha" className={`${inputClass} mt-0 w-auto`} />
      <select value={account} onChange={(event) => setAccount(event.target.value)} aria-label="Cuenta" className={`${inputClass} mt-0 w-auto`}><option value="">Cuenta</option>{ACCOUNTS.map((name) => <option key={name}>{name}</option>)}</select>
      <Button busy={busy} onClick={save}>Guardar</Button>
      {flash.node}
    </div>
  )
}

/** A loan or plan: installments paid of the total and what's left, or a debt's balance with a free payment. */
function LoanRow({ item, moves, money, onChanged }: { item: PersonalItem; moves: PersonalMove[]; money: (value: number) => string; onChanged: () => void }) {
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  if (item.type === 'cuotas') {
    const progress = planProgress(item, moves)
    const share = progress.total ? progress.paidCount / progress.total : 0
    return (
      <li>
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-ink">{categoryOf(item.category).emoji} {item.name}</span>
          <span className="text-piedra">{progress.paidCount} de {progress.total} cuotas</span>
        </div>
        <div className="mt-1 h-2.5 rounded-full bg-papel"><div className="h-2.5 rounded-full bg-whatsapp" style={{ width: `${share * 100}%` }} /></div>
        <p className="mt-1 text-xs text-piedra">
          {progress.left.length ? <>Te quedan {progress.left.length} ({progress.left.some((row) => row.est) ? '≈ ' : ''}{money(Math.round(progress.leftAmount))}). Próxima: {short(progress.next!.due)}, {progress.next!.est ? '≈ ' : ''}{money(Math.round(progress.next!.amount))}.</> : '¡Terminado! 🎉'}
        </p>
      </li>
    )
  }
  const progress = debtProgress(item, moves)
  async function save() {
    const value = parseAmount(amount)
    if (!(value > 0)) { flash.show('error', 'Poné cuánto le pagaste.'); return }
    setBusy(true)
    const { error } = await supabase.from('personal_moves').insert({ day: dayKey(new Date()), kind: 'gasto', item_id: item.id, category: item.category, concept: item.name, amount: value, account: item.account })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setPaying(false); setAmount(''); onChanged()
  }
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink">{categoryOf(item.category).emoji} {item.name}</span>
        <span className="text-piedra">{money(Math.round(progress.paid))} de {money(Math.round(progress.total))}</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-papel"><div className="h-2.5 rounded-full bg-whatsapp" style={{ width: `${progress.total ? (progress.paid / progress.total) * 100 : 0}%` }} /></div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-piedra">
        <span>{progress.left ? `Te quedan ${money(Math.round(progress.left))}.` : '¡Saldada! 🎉'}{item.notes ? ` ${item.notes}` : ''}</span>
        {progress.left > 0 && <button type="button" onClick={() => setPaying(!paying)} className="font-semibold text-rosa-deep hover:underline">Anotar un pago</button>}
      </div>
      {paying && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="$ que le pagaste" aria-label="Monto" className={`${inputClass} mt-0 w-40`} />
          <Button busy={busy} onClick={save}>Guardar</Button>
          {flash.node}
        </div>
      )}
    </li>
  )
}

/** Quick entry: an expense or an income, its category and account; "del negocio" keeps it out of the personal numbers. */
function MoveForm({ onSaved }: { onSaved: () => void }) {
  const [kind, setKind] = useState<'gasto' | 'ingreso'>('gasto')
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [category, setCategory] = useState('super')
  const [account, setAccount] = useState('Ualá')
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [business, setBusiness] = useState(false)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function save() {
    const value = parseAmount(amount)
    if (!(value > 0)) { flash.show('error', 'Poné el monto.'); return }
    if (!concept.trim()) { flash.show('error', 'Poné qué fue (por ejemplo "Coto" o "PedidosYa").'); return }
    setBusy(true)
    const { error } = await supabase.from('personal_moves').insert({ day, kind, category, concept: concept.trim(), amount: value, account, scope: business ? 'negocio' : 'personal' })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setAmount(''); setConcept('')
    flash.show('ok', 'Guardado.')
    onSaved()
  }
  return (
    <div className="mt-3 space-y-2">
      <div className="inline-flex rounded-full bg-papel p-1">
        {(['gasto', 'ingreso'] as const).map((id) => <button key={id} type="button" onClick={() => setKind(id)} className={`rounded-full px-4 py-1.5 font-display text-sm font-bold ${kind === id ? 'bg-ciruela text-white' : 'text-piedra'}`}>{id === 'gasto' ? 'Gasto' : 'Ingreso'}</button>)}
      </div>
      <div className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr]">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="$" aria-label="Monto" className={`${inputClass} mt-0`} />
        <input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="Qué fue" aria-label="Concepto" className={`${inputClass} mt-0`} />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoría" className={`${inputClass} mt-0`}>{CATEGORIES.filter((row) => row.id !== 'sin_clasificar').map((row) => <option key={row.id} value={row.id}>{row.emoji} {row.label}</option>)}</select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={account} onChange={(event) => setAccount(event.target.value)} aria-label="Cuenta" className={`${inputClass} mt-0 w-auto`}>{ACCOUNTS.map((name) => <option key={name}>{name}</option>)}</select>
        <input type="date" value={day} onChange={(event) => setDay(event.target.value)} aria-label="Fecha" className={`${inputClass} mt-0 w-auto`} />
        <label className="flex items-center gap-2 text-xs text-piedra"><input type="checkbox" checked={business} onChange={(event) => setBusiness(event.target.checked)} className="h-4 w-4 accent-rosa" />Es del negocio</label>
        <Button busy={busy} onClick={save}><Plus className="h-4 w-4" />Guardar</Button>
      </div>
      {flash.node}
    </div>
  )
}

function MoveRow({ move, money, onChanged }: { move: PersonalMove; money: (value: number) => string; onChanged: () => void }) {
  async function remove() {
    if (!window.confirm(`¿Borrar "${move.concept}" (${money(move.amount)})?`)) return
    await supabase.from('personal_moves').delete().eq('id', move.id)
    onChanged()
  }
  const sign = move.kind === 'ingreso' ? '+' : move.kind === 'gasto' ? '−' : '↔'
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-ink">{categoryOf(move.category).emoji} {move.concept}</span>
        <span className="block text-xs text-piedra">{short(move.day)}{move.account ? ` · ${move.account}` : ''}{move.scope === 'negocio' ? ' · negocio' : ''}{move.kind === 'entre_cuentas' ? ' · entre tus cuentas' : ''}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`font-semibold tabular-nums ${move.kind === 'ingreso' ? 'text-whatsapp' : move.kind === 'gasto' ? 'text-ink' : 'text-piedra'}`}>{sign}{money(Math.round(move.amount))}</span>
        <button type="button" onClick={remove} className="rounded-full p-1.5 text-piedra hover:bg-papel hover:text-rosa-deep" aria-label="Borrar"><Trash2 className="h-4 w-4" /></button>
      </span>
    </li>
  )
}

/** One movement to classify: a category, or "del negocio" / "entre mis cuentas" (both leave the personal numbers). */
function ClassifyRow({ move, money, onChanged }: { move: PersonalMove; money: (value: number) => string; onChanged: () => void }) {
  async function set(value: string) {
    const update = value === 'negocio' ? { scope: 'negocio', category: 'otros' } : value === 'entre_cuentas' ? { kind: 'entre_cuentas', category: 'otros' } : { category: value }
    await supabase.from('personal_moves').update(update).eq('id', move.id)
    onChanged()
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0"><span className="block text-ink">{move.concept}</span><span className="block text-xs text-piedra">{short(move.day)} · {move.kind === 'ingreso' ? '+' : '−'}{money(Math.round(move.amount))}</span></span>
      <select defaultValue="" onChange={(event) => { if (event.target.value) set(event.target.value) }} aria-label="Clasificar" className={`${inputClass} mt-0 w-auto text-sm`}>
        <option value="" disabled>Elegí qué fue…</option>
        {CATEGORIES.filter((row) => row.id !== 'sin_clasificar').map((row) => <option key={row.id} value={row.id}>{row.emoji} {row.label}</option>)}
        <option value="negocio">💼 Era del negocio</option>
        <option value="entre_cuentas">↔ Entre mis cuentas</option>
      </select>
    </li>
  )
}

/** The fixed items: change an amount or a due day, turn one off, or add a new fixed expense, income or debt. */
function ItemsEditor({ items, money, onChanged }: { items: PersonalItem[]; money: (value: number) => string; onChanged: () => void }) {
  const [form, setForm] = useState({ kind: 'gasto' as 'gasto' | 'ingreso', type: 'fijo' as 'fijo' | 'deuda', name: '', amount: '', due_day: '', category: 'servicios' })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()
  async function add() {
    if (!form.name.trim()) { flash.show('error', 'Poné el nombre.'); return }
    const amount = form.amount.trim() ? parseAmount(form.amount) : null
    if (form.type === 'deuda' && !(amount && amount > 0)) { flash.show('error', 'Poné el total de la deuda.'); return }
    setBusy(true)
    const { error } = await supabase.from('personal_items').insert({
      kind: form.type === 'deuda' ? 'gasto' : form.kind, type: form.type, name: form.name.trim(), category: form.type === 'deuda' ? 'prestamos' : form.category,
      amount: form.type === 'fijo' ? amount : null, total: form.type === 'deuda' ? amount : null, due_day: form.type === 'fijo' && form.due_day ? Number(form.due_day) : null,
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    setForm({ ...form, name: '', amount: '', due_day: '' })
    onChanged()
  }
  async function update(item: PersonalItem, changes: Partial<PersonalItem>) {
    await supabase.from('personal_items').update(changes).eq('id', item.id)
    onChanged()
  }
  const fixed = items.filter((item) => item.type === 'fijo')
  return (
    <details className={cardClass}>
      <summary className="cursor-pointer font-display text-lg font-bold text-ciruela">Tus fijos ({fixed.filter((item) => item.active).length})</summary>
      <p className="mt-1 text-sm text-piedra">Cambiá el monto o el día de vencimiento cuando cambien. Los que dicen "a confirmar" varían cada mes (luz, tarjeta).</p>
      <ul className="mt-3 divide-y divide-line text-sm">
        {fixed.map((item) => (
          <li key={item.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${item.active ? '' : 'opacity-50'}`}>
            <span className="min-w-0 text-ink">{item.kind === 'ingreso' ? '⬇️' : '⬆️'} {item.name}</span>
            <span className="flex items-center gap-2">
              <input defaultValue={item.amount ?? ''} onBlur={(event) => { const value = event.target.value.trim() ? parseAmount(event.target.value) : null; if (value !== item.amount) update(item, { amount: value }) }} inputMode="decimal" placeholder="A confirmar" aria-label={`Monto de ${item.name}`} className={`${inputClass} mt-0 w-32`} title={item.amount !== null ? money(item.amount) : ''} />
              <input defaultValue={item.due_day ?? ''} onBlur={(event) => { const value = event.target.value ? Number(event.target.value) : null; if (value !== item.due_day) update(item, { due_day: value }) }} inputMode="numeric" placeholder="Día" aria-label={`Día de vencimiento de ${item.name}`} className={`${inputClass} mt-0 w-16`} />
              <button type="button" onClick={() => update(item, { active: !item.active })} className="text-xs font-semibold text-rosa-deep hover:underline">{item.active ? 'Quitar' : 'Volver a activar'}</button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-2xl bg-papel/60 p-3">
        <p className="text-sm font-semibold text-ink">Agregar</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <select value={form.type === 'deuda' ? 'deuda' : form.kind} onChange={(event) => setForm({ ...form, type: event.target.value === 'deuda' ? 'deuda' : 'fijo', kind: event.target.value === 'ingreso' ? 'ingreso' : 'gasto' })} aria-label="Tipo" className={`${inputClass} mt-0 w-auto`}>
            <option value="gasto">Gasto fijo</option><option value="ingreso">Ingreso fijo</option><option value="deuda">Deuda (un total)</option>
          </select>
          <Field label="Nombre" className="min-w-40 flex-1"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
          <Field label={form.type === 'deuda' ? 'Total' : 'Monto'}><input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" className={`${inputClass} w-32`} /></Field>
          {form.type === 'fijo' && <Field label="Día"><input value={form.due_day} onChange={(event) => setForm({ ...form, due_day: event.target.value })} inputMode="numeric" className={`${inputClass} w-16`} /></Field>}
          {form.type === 'fijo' && <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} aria-label="Categoría" className={`${inputClass} mt-0 w-auto`}>{CATEGORIES.filter((row) => row.id !== 'sin_clasificar').map((row) => <option key={row.id} value={row.id}>{row.emoji} {row.label}</option>)}</select>}
          <Button busy={busy} onClick={add}><Plus className="h-4 w-4" />Agregar</Button>
        </div>
        {flash.node && <div className="mt-2">{flash.node}</div>}
      </div>
    </details>
  )
}
