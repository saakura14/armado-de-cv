'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { formatARS } from '@/lib/catalog'
import { dayKey } from '@/lib/dashboard'
import { formatDate } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import type { TeamMember, TeamTask } from '@/lib/team'

type Goal = { id: string; position: number; label: string; emoji: string; amount: number; counts_from: string; done_at: string | null }
type ThemeId = 'queen' | 'mgs' | 'ac'

/**
 * Each theme is an original nod (no photos or logos): a rock stage with a crown, a stealth mission with a codec
 * and a cardboard box, an assassin's "synchronization". Colors are fixed so the card looks the same in light and dark.
 */
const THEMES: Record<ThemeId, {
  name: string; title: string; card: string; accent: string; bar: string; track: string; soft: string; chip: string
  progress: string; done: (label: string) => string; lines: ((left: number) => string)[]
}> = {
  queen: {
    name: '👑 Rock', title: 'Gira hacia', card: 'bg-[radial-gradient(120%_90%_at_80%_0%,#5b2a86_0%,#2a1240_45%,#140a1f_100%)]',
    accent: 'text-[#f6c945]', bar: 'bg-[linear-gradient(90deg,#f6c945,#ff8a3d,#ff4f7b)]', track: 'bg-white/10', soft: 'text-white/70', chip: 'bg-[#f6c945] text-[#2a1240]',
    progress: 'Del recital', done: (label) => `¡Ovación de pie! ${label}: ¡a buscarlas! 👑`,
    lines: [
      (left) => `🎤 Cada CV es un tema más del recital. Faltan ${left} para el bis.`,
      (left) => `🎸 El estadio está lleno: ${left} CVs más y salís a saludar.`,
      (left) => `👑 Modo leyenda del rock: ${left} CVs y la corona es tuya.`,
    ],
  },
  mgs: {
    name: '❗ Sigilo', title: 'Misión', card: 'bg-[linear-gradient(180deg,#0d1f14_0%,#07130c_100%)]',
    accent: 'text-[#7dffa8]', bar: 'bg-[linear-gradient(90deg,#3ddc84,#b6ff6a)]', track: 'bg-[#7dffa8]/10', soft: 'text-[#b9e9c8]/75', chip: 'bg-[#7dffa8] text-[#07130c]',
    progress: 'Misión', done: (label) => `MISIÓN CUMPLIDA ★ ${label}. Rango: leyenda.`,
    lines: [
      (left) => `📦 Misión sigilosa: ${left} CVs más y extracción con equipo nuevo.`,
      (left) => `📡 Codec: Vale confirma que vas bien. Objetivo a ${left} CVs.`,
      (left) => `❗ ¡Alerta! Quedan ${left} CVs entre vos y el objetivo.`,
    ],
  },
  ac: {
    name: '🦅 Credo', title: 'Objetivo', card: 'bg-[linear-gradient(160deg,#2b2b2e_0%,#151517_60%,#3a0d0d_100%)]',
    accent: 'text-[#ff5a4e]', bar: 'bg-[linear-gradient(90deg,#e8e4da,#ff5a4e)]', track: 'bg-white/10', soft: 'text-white/70', chip: 'bg-[#e8e4da] text-[#151517]',
    progress: 'Sincronización', done: (label) => `Sincronización completa 🦅 ${label}: ¡salto de fe al shopping!`,
    lines: [
      (left) => `🦅 Subí al punto de vista: ${left} CVs más y se ve todo el mapa.`,
      (left) => `🗡️ Objetivo marcado. Faltan ${left} CVs para sincronizar al 100%.`,
      (left) => `🏙️ De techo en techo: ${left} CVs y llegás.`,
    ],
  },
}
const THEME_KEY = 'acv-goal-theme'
const EMOJIS = ['👟', '👕', '🧥', '👖', '🧢', '🎧', '🎮', '🎸', '⌚', '🎯']

/** The art in the corner of the card, drawn here (original shapes). */
function Art({ theme }: { theme: ThemeId }) {
  if (theme === 'queen') return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <path d="M20 0 L44 90 L0 90 Z" fill="#f6c945" opacity="0.12" />
      <path d="M100 0 L120 90 L76 90 Z" fill="#ff4f7b" opacity="0.12" />
      <path d="M44 22 l8 9 l8-13 l8 13 l8-9 l-4 16 h-24 z" fill="#f6c945" />
      {/* Singer with the mic stand up high */}
      <circle cx="60" cy="50" r="5" fill="#fff" />
      <path d="M60 55 v18 M60 60 l-9 6 M60 60 l10 -10 M60 73 l-6 14 M60 73 l7 14" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M70 50 l10 -16" stroke="#f6c945" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="0" y="86" width="120" height="4" fill="#f6c945" opacity="0.5" />
    </svg>
  )
  if (theme === 'mgs') return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <text x="60" y="30" textAnchor="middle" fontSize="30" fontWeight="900" fill="#ff4848" fontFamily="system-ui">!</text>
      <path d="M30 50 l30 -10 l30 10 v30 l-30 10 l-30 -10 z" fill="#b8925a" />
      <path d="M30 50 l30 10 l30 -10 M60 60 v30" stroke="#7a5a2e" strokeWidth="2" fill="none" />
      <circle cx="60" cy="45" r="44" stroke="#7dffa8" strokeOpacity="0.18" fill="none" />
    </svg>
  )
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <path d="M0 90 V62 h14 v-8 h12 v14 h10 V48 l8 -8 l8 8 v42 M52 90 V58 h18 v-10 h10 v42 M80 90 V66 h16 v-12 h10 v14 h14 V90 Z" fill="#000" opacity="0.55" />
      {/* Eagle in flight */}
      <path d="M60 30 c-10 -8 -22 -10 -34 -6 c10 2 18 6 24 12 c-6 0 -12 2 -16 6 c8 -2 16 -2 22 0 l4 6 l4 -6 c6 -2 14 -2 22 0 c-4 -4 -10 -6 -16 -6 c6 -6 14 -10 24 -12 c-12 -4 -24 -2 -34 6 z" fill="#e8e4da" />
      <path d="M60 30 l-3 -5 h6 z" fill="#ff5a4e" />
    </svg>
  )
}

/** What he is saving up for (zapas, ropa...): what he earned with each CV fills the goals in order. */
export function TeamGoals({ member, tasks, preview }: { member: TeamMember; tasks: TeamTask[]; preview?: boolean }) {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [theme, setTheme] = useState<ThemeId>('queen')
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', emoji: '👟', amount: '' })
  const [error, setError] = useState('')
  const [line, setLine] = useState(0)

  useEffect(() => { try { const saved = localStorage.getItem(THEME_KEY); if (saved && saved in THEMES) setTheme(saved as ThemeId) } catch { /* private mode */ } }, [])
  function pickTheme(id: ThemeId) { setTheme(id); try { localStorage.setItem(THEME_KEY, id) } catch { /* private mode */ } }
  // A different phrase every few seconds.
  useEffect(() => { const timer = window.setInterval(() => setLine((value) => value + 1), 7000); return () => window.clearInterval(timer) }, [])

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('team_goals').select('id, position, label, emoji, amount, counts_from, done_at').eq('member_id', member.id).order('position')
    if (loadError) { setError(errorMessage(loadError)); return }
    setGoals(((data as Goal[] | null) ?? []).map((goal) => ({ ...goal, amount: Number(goal.amount) })))
  }, [member.id])
  useEffect(() => { load() }, [load])

  if (goals === null) return null
  const look = THEMES[theme]

  // Money since the first goal, minus the goals already bought, fills the open ones in order.
  const start = goals.map((goal) => goal.counts_from).sort()[0]
  const finished = tasks.filter((task) => task.status === 'terminado' && task.finished_at && start && dayKey(task.finished_at) >= start)
  const earned = finished.reduce((sum, task) => sum + task.rate, 0)
  let pool = Math.max(earned - goals.filter((goal) => goal.done_at).reduce((sum, goal) => sum + goal.amount, 0), 0)
  const open = goals.filter((goal) => !goal.done_at).map((goal) => {
    const got = Math.min(pool, goal.amount)
    pool -= got
    return { ...goal, got, cvs: Math.ceil((goal.amount - got) / member.rate) }
  })
  const bought = goals.filter((goal) => goal.done_at)
  const current = open.find((goal) => goal.got < goal.amount)
  const phrase = current ? look.lines[line % look.lines.length](current.cvs) : open.length ? look.done(open[0].label) : ''

  async function save(change: PromiseLike<{ error: { message: string } | null }>) {
    const { error: saveError } = await change
    if (saveError) { setError(errorMessage(saveError)); return false }
    setError('')
    await load()
    return true
  }
  async function add() {
    const amount = Number(form.amount.replace(/\D/g, ''))
    if (!form.label.trim() || !amount) { setError('Poné qué querés y cuánto sale.'); return }
    const position = Math.max(-1, ...(goals ?? []).map((goal) => goal.position)) + 1
    if (await save(supabase.from('team_goals').insert({ member_id: member.id, position, label: form.label.trim(), emoji: form.emoji, amount }))) { setAdding(false); setForm({ label: '', emoji: '👟', amount: '' }) }
  }
  async function changeAmount(goal: Goal, value: string) {
    const amount = Number(value.replace(/\D/g, ''))
    if (!amount) { setError('Poné cuánto sale.'); return }
    if (await save(supabase.from('team_goals').update({ amount }).eq('id', goal.id))) setEditing(null)
  }

  return (
    <section className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_18px_40px_-24px_rgba(20,10,31,0.9)] ${look.card}`} aria-labelledby="goals-title">
      {theme === 'mgs' && <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(125,255,168,0.06)_0_1px,transparent_1px_3px)]" />}
      <div className="pointer-events-none absolute -right-2 -top-1 h-24 w-32 opacity-90"><Art theme={theme} /></div>
      <p className={`font-display text-[11px] font-bold uppercase tracking-[0.25em] ${look.accent}`}>{look.title}</p>
      <h2 id="goals-title" className="max-w-[60%] font-display text-xl font-extrabold leading-tight">Lo que te vas a comprar</h2>
      <p className={`mt-1 max-w-[62%] text-xs ${look.soft}`}>{start ? <>Juntaste <b className="text-white">{formatARS(earned)}</b> desde el {formatDate(`${start}T12:00:00-03:00`)} ({finished.length} {finished.length === 1 ? 'CV' : 'CVs'})</> : 'Sumá algo que quieras comprarte.'}</p>

      <div role="radiogroup" aria-label="Estilo" className="relative mt-3 flex gap-1.5">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => (
          <button key={id} type="button" role="radio" aria-checked={theme === id} onClick={() => pickTheme(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${theme === id ? look.chip : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>{THEMES[id].name}</button>
        ))}
      </div>

      {phrase && <p key={`${theme}-${line}`} className="relative mt-3 animate-[goal-in_0.5s_ease-out] rounded-2xl bg-black/25 px-3 py-2 text-sm font-semibold">{phrase}</p>}

      <ul className="relative mt-3 space-y-3">
        {open.map((goal) => {
          const share = goal.got / goal.amount
          const full = share >= 1
          return (
            <li key={goal.id} className="rounded-2xl bg-white/[0.06] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base font-bold"><span className="mr-1.5 text-xl">{goal.emoji}</span>{goal.label}</p>
                <p className={`font-display text-sm font-extrabold ${look.accent}`}>{Math.floor(share * 100)}%</p>
              </div>
              <div className={`mt-2 h-3 overflow-hidden rounded-full ${look.track}`} role="progressbar" aria-label={`${look.progress}: ${goal.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(share * 100)}>
                <div className={`relative h-3 rounded-full transition-[width] duration-1000 ${look.bar}`} style={{ width: `${Math.max(share * 100, share > 0 ? 4 : 0)}%` }}>
                  <span className="absolute inset-0 motion-reduce:hidden animate-[goal-shine_2.4s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] bg-[length:50%_100%] bg-no-repeat" />
                </div>
              </div>
              {editing === goal.id ? (
                <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); changeAmount(goal, String(new FormData(event.currentTarget).get('amount') ?? '')) }}>
                  <input name="amount" defaultValue={goal.amount} inputMode="numeric" aria-label="Cuánto sale" className="w-full rounded-xl bg-white px-3 py-2 text-base text-[#151517] outline-none sm:text-sm" autoFocus />
                  <button type="submit" aria-label="Guardar" className={`rounded-xl px-3 ${look.chip}`}><Check className="h-4 w-4" /></button>
                  <button type="button" aria-label="Cancelar" onClick={() => setEditing(null)} className="rounded-xl bg-white/10 px-3"><X className="h-4 w-4" /></button>
                </form>
              ) : (
                <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs ${look.soft}`}>
                  <span>{look.progress}: <b className="text-white">{formatARS(goal.got)}</b> de {formatARS(goal.amount)}{!full && <> · faltan <b className="text-white">{goal.cvs} {goal.cvs === 1 ? 'CV' : 'CVs'}</b></>}</span>
                  {!preview && (
                    <span className="flex gap-1">
                      <button type="button" onClick={() => setEditing(goal.id)} aria-label={`Cambiar el precio de ${goal.label}`} className="rounded-full p-1.5 hover:bg-white/15"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => { if (window.confirm(`¿Sacar "${goal.label}" de tus metas?`)) save(supabase.from('team_goals').delete().eq('id', goal.id)) }} aria-label={`Sacar ${goal.label}`} className="rounded-full p-1.5 hover:bg-white/15"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  )}
                </div>
              )}
              {full && !preview && (
                <button type="button" onClick={() => save(supabase.from('team_goals').update({ done_at: new Date().toISOString() }).eq('id', goal.id))} className={`mt-2 w-full animate-pulse motion-reduce:animate-none rounded-xl py-2 font-display text-sm font-extrabold ${look.chip}`}>🎉 ¡Ya me lo compré!</button>
              )}
            </li>
          )
        })}
      </ul>

      {bought.length > 0 && <p className={`relative mt-3 text-xs ${look.soft}`}>🏆 Ya conseguiste: {bought.map((goal) => `${goal.emoji} ${goal.label}`).join(' · ')}</p>}

      {!preview && (adding ? (
        <div className="relative mt-3 space-y-2 rounded-2xl bg-black/25 p-3">
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => setForm({ ...form, emoji })} aria-pressed={form.emoji === emoji} className={`rounded-lg px-1.5 py-1 text-lg ${form.emoji === emoji ? 'bg-white/30' : 'hover:bg-white/15'}`}>{emoji}</button>)}
          </div>
          <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} maxLength={40} placeholder="¿Qué querés? (ej. Campera)" className="w-full rounded-xl bg-white px-3 py-2 text-base text-[#151517] outline-none sm:text-sm" />
          <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="numeric" placeholder="¿Cuánto sale? (ej. 80000)" className="w-full rounded-xl bg-white px-3 py-2 text-base text-[#151517] outline-none sm:text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={add} className={`flex-1 rounded-xl py-2 font-display text-sm font-bold ${look.chip}`}>Agregar</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl bg-white/10 px-4 text-sm font-bold">Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="relative mt-3 flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white"><Plus className="h-4 w-4" />Sumar otra cosa</button>
      ))}
      {error && <p className="relative mt-2 rounded-xl bg-[#ff4f7b]/25 px-3 py-1.5 text-xs font-semibold">{error}</p>}
    </section>
  )
}
