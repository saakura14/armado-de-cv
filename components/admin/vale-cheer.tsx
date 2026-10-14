'use client'

import { useEffect, useState } from 'react'
import { CheerCard, type Character } from '@/components/cheer-card'
import { dayKey } from '@/lib/dashboard'
import { supabase } from '@/lib/supabase'

type Mood = { today: number; month: number; car: number }
type CharacterId = 'sakura' | 'inuyasha' | 'moon'

const percent = (value: number) => `${Math.floor(value * 100)}%`

/**
 * Vale's favorite characters cheer her up with phrases in their style (short catchphrases, no lyrics) and her numbers:
 * sales today, sales this month and how close the car is. The drawings are original, not anime art.
 */
const CHARACTERS: Record<CharacterId, Character<Mood>> = {
  sakura: {
    name: '🌸 Sakura', figure: <Figure id="sakura" />, card: 'bg-[radial-gradient(120%_90%_at_20%_0%,#ff9ec4_0%,#d9468f_45%,#7a1f55_100%)]',
    overlay: 'bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.35)_0_2px,transparent_3px),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.25)_0_1.5px,transparent_2.5px),radial-gradient(circle_at_30%_85%,rgba(255,255,255,0.3)_0_1.5px,transparent_2.5px)]',
    accent: 'text-[#fff2a8]', bar: 'bg-[linear-gradient(90deg,#fff2a8,#ffd1e6,#ffffff)]', chip: 'bg-[#fff2a8] text-[#7a1f55]', bubble: 'bg-[#fff0f6] text-[#7a1f55]',
    lines: ({ today, month, car }) => [
      '¡Todo va a estar bien! ✨ Hoy es un gran día para vender.',
      today ? `¡Hoeee! ¿${today} ${today === 1 ? 'venta' : 'ventas'} hoy? ¡Qué bárbaro! 🌸` : '¡Hoeee! Todavía no hay ventas hoy… ¡la primera carta está por aparecer! 🃏',
      `Cada venta es una carta capturada: este mes ya van ${month}. 🃏`,
      `Tu auto ya está al ${percent(car)}. ¡La carta Vuelo te lleva! 🚗`,
      'Con tu báculo y tu Canva, no hay CV que se resista. ⭐',
    ],
  },
  inuyasha: {
    name: '⚔️ Inuyasha', figure: <Figure id="inuyasha" />, card: 'bg-[linear-gradient(160deg,#3a0f14_0%,#1c0a10_55%,#2b1838_100%)]',
    accent: 'text-[#f2c14e]', bar: 'bg-[linear-gradient(90deg,#c8302b,#f2c14e)]', chip: 'bg-[#e9e6f2] text-[#3a0f14]', bubble: 'bg-[#f5efe6] text-[#3a0f14]',
    lines: ({ today, month, car }) => [
      `¡Viento cortante! ⚔️ Y van ${month} ${month === 1 ? 'venta' : 'ventas'} este mes.`,
      `Juntando los fragmentos de la perla: tu auto ya está al ${percent(car)}. 💎`,
      today ? `Keh. ¿${today} ${today === 1 ? 'venta' : 'ventas'} hoy? Nada mal, humana.` : 'Keh. Todavía no vendiste hoy… pero yo sé que vas a poder.',
      '¡Abajo! …las excusas. Hoy se vende. 📿',
      'A través del pozo devorador de huesos llegan los clientes. 🌕',
    ],
  },
  moon: {
    name: '🌙 Sailor Moon', figure: <Figure id="moon" />, card: 'bg-[linear-gradient(170deg,#1b2a6b_0%,#121a45_55%,#3b1d5c_100%)]',
    overlay: 'bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.5)_0_1.5px,transparent_2.5px),radial-gradient(circle_at_60%_55%,rgba(255,255,255,0.35)_0_1px,transparent_2px),radial-gradient(circle_at_92%_70%,rgba(255,255,255,0.4)_0_1px,transparent_2px)]',
    accent: 'text-[#ffd84d]', bar: 'bg-[linear-gradient(90deg,#ff7ab6,#ffd84d)]', chip: 'bg-[#ffd84d] text-[#121a45]', bubble: 'bg-[#fff6fb] text-[#121a45]',
    lines: ({ today, month, car }) => [
      '¡En el nombre de la Luna, te castigaré!… si no cargás tus ventas. 🌙',
      `¡Por el poder del prisma lunar! ${month} ${month === 1 ? 'venta' : 'ventas'} este mes. ✨`,
      `Tiara lunar directo a la meta: tu auto va ${percent(car)}. 🚗`,
      today ? `Hoy ${today} ${today === 1 ? 'venta' : 'ventas'}. ¡Guerrera del CV! 💖` : 'Hoy todavía no hubo ventas. ¡Transformación y a vender! 💖',
      'Luna dice que hoy te toca brillar. 🐈‍⬛',
    ],
  },
}

/** Original drawings: a girl with a star wand and a card, a silver-haired half-demon with dog ears, a guardian with buns. */
function Figure({ id }: { id: CharacterId }) {
  if (id === 'sakura') return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      {/* Floating card */}
      <g transform="rotate(-12 22 40)"><rect x="8" y="22" width="26" height="38" rx="3" fill="#fff0f6" stroke="#f2c14e" strokeWidth="2" /><path d="M21 33 l2.4 5 5.4 .6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6 z" fill="#ff7ab6" /></g>
      {/* Star wand with little wings */}
      <path d="M78 66 L100 20" stroke="#ff7ab6" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 22 q-10 -6 -12 -14 q8 2 13 9 z M108 22 q10 -6 12 -14 q-8 2 -13 9 z" fill="#fff" />
      <path d="M100 6 l3.5 7.5 8 .8 -6 5.5 1.7 7.9 -7.2 -4.1 -7.2 4.1 1.7 -7.9 -6 -5.5 8 -.8 z" fill="#ffe066" stroke="#fff" strokeWidth="1.2" />
      {/* Head: short auburn hair, big green eyes */}
      <path d="M40 46 q0 -26 20 -26 q20 0 20 26 l-4 12 h-32 z" fill="#a8532e" />
      <circle cx="60" cy="48" r="15" fill="#fde2d0" />
      <path d="M45 44 q4 -14 15 -14 q11 0 15 14 q-4 -6 -8 -7 l-2 4 -3 -5 -4 5 -3 -5 -2 5 q-5 0 -8 3 z" fill="#a8532e" />
      <ellipse cx="54" cy="50" rx="3" ry="4" fill="#2f9e6f" /><ellipse cx="66" cy="50" rx="3" ry="4" fill="#2f9e6f" />
      <circle cx="55" cy="49" r="1.1" fill="#fff" /><circle cx="67" cy="49" r="1.1" fill="#fff" />
      <path d="M57 57 q3 2 6 0" stroke="#c0546b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Pink dress with white collar, arm holding the wand */}
      <path d="M48 64 h24 l14 50 h-52 z" fill="#ff8fc0" />
      <path d="M48 64 l12 10 l12 -10 z" fill="#fff" />
      <path d="M70 70 l10 -6" stroke="#fde2d0" strokeWidth="5" strokeLinecap="round" />
      <path d="M44 114 h32" stroke="#fff" strokeWidth="3" />
      <path d="M50 114 v18 M70 114 v18" stroke="#fde2d0" strokeWidth="5" strokeLinecap="round" />
      <path d="M45 134 h10 M65 134 h10" stroke="#7a1f55" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
  if (id === 'inuyasha') return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <circle cx="98" cy="20" r="12" fill="#f5efe6" opacity="0.85" />
      {/* Long silver hair behind */}
      <path d="M42 38 q-16 48 -8 96 h52 q8 -48 -8 -96 z" fill="#dcdbe8" />
      {/* Big sword */}
      <path d="M86 128 L104 40" stroke="#e9eef5" strokeWidth="9" strokeLinecap="round" />
      <path d="M82 122 l12 4" stroke="#f2c14e" strokeWidth="4" strokeLinecap="round" />
      {/* Head with dog ears and golden eyes */}
      <path d="M44 34 l4 -18 l10 12 z M76 34 l-4 -18 l-10 12 z" fill="#e9e6f2" />
      <path d="M47 30 l2 -9 l5 6 z M73 30 l-2 -9 l-5 6 z" fill="#f2b6c2" />
      <circle cx="60" cy="44" r="15" fill="#f6dcc7" />
      <path d="M44 42 q2 -16 16 -16 q14 0 16 16 l-5 -6 -3 6 -4 -7 -4 7 -4 -7 -4 7 -3 -6 z" fill="#e9e6f2" />
      <path d="M50 43 l6 1 M64 44 l6 -1" stroke="#1d1418" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="54" cy="49" rx="2.4" ry="2.8" fill="#e0a21a" /><ellipse cx="66" cy="49" rx="2.4" ry="2.8" fill="#e0a21a" />
      <path d="M56 55 q4 -2 8 0" stroke="#8a3b3b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Prayer beads and red robe */}
      <path d="M48 62 q12 10 24 0" stroke="#5b3a8c" strokeWidth="3.4" strokeDasharray="0.1 5" strokeLinecap="round" fill="none" />
      <path d="M46 60 h28 l10 54 h-48 z" fill="#c8302b" />
      <path d="M52 60 l8 16 l8 -16" fill="#f5efe6" />
      <path d="M36 114 h48 l-4 20 h-40 z" fill="#a8261f" />
      <path d="M74 72 l12 30" stroke="#c8302b" strokeWidth="9" strokeLinecap="round" />
    </svg>
  )
  return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      {/* Crescent moon */}
      <path d="M104 6 a14 14 0 1 0 6 24 a11 11 0 1 1 -6 -24 z" fill="#ffd84d" />
      {/* Long blonde pigtails and buns */}
      <path d="M38 30 q-18 40 -10 104 h10 q-4 -60 8 -96 z M82 30 q18 40 10 104 h-10 q4 -60 -8 -96 z" fill="#ffd84d" />
      <circle cx="40" cy="26" r="9" fill="#ffd84d" /><circle cx="80" cy="26" r="9" fill="#ffd84d" />
      <circle cx="40" cy="26" r="3" fill="#ff4f7b" /><circle cx="80" cy="26" r="3" fill="#ff4f7b" />
      {/* Face, fringe and tiara */}
      <circle cx="60" cy="46" r="15" fill="#fde2d0" />
      <path d="M45 44 q3 -16 15 -16 q12 0 15 16 q-3 -5 -6 -6 l-3 6 -3 -7 -3 7 -3 -7 -3 7 -3 -6 q-3 1 -6 6 z" fill="#ffd84d" />
      <path d="M52 36 h16 l-8 -4 z" fill="#f2c14e" /><circle cx="60" cy="35" r="1.6" fill="#ff4f7b" />
      <ellipse cx="54" cy="49" rx="3" ry="4" fill="#3b5bdb" /><ellipse cx="66" cy="49" rx="3" ry="4" fill="#3b5bdb" />
      <circle cx="55" cy="48" r="1.1" fill="#fff" /><circle cx="67" cy="48" r="1.1" fill="#fff" />
      <path d="M57 55 q3 2 6 0" stroke="#c0546b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Sailor top: blue collar, big red bow, blue skirt */}
      <path d="M46 62 h28 l6 34 h-40 z" fill="#ffffff" />
      <path d="M46 62 l14 16 l14 -16 l6 8 l-20 14 l-20 -14 z" fill="#2f5bd3" />
      <path d="M60 80 l-14 -7 v14 z M60 80 l14 -7 v14 z" fill="#e8304a" /><circle cx="60" cy="80" r="3.4" fill="#ffd84d" />
      <path d="M38 96 h44 l8 18 h-60 z" fill="#2f5bd3" />
      <path d="M50 114 v18 M70 114 v18" stroke="#fde2d0" strokeWidth="5" strokeLinecap="round" />
      <path d="M45 134 h10 M65 134 h10" stroke="#e8304a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Vale's card on the home screen: her sales today and this month, and the road to the car. */
export function ValeCheer() {
  const [mood, setMood] = useState<Mood | null>(null)
  useEffect(() => {
    const today = dayKey(new Date())
    const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00-03:00`).toISOString()
    Promise.all([
      supabase.from('orders').select('paid_at').gte('paid_at', monthStart).neq('status', 'cancelled').lt('number', 90000),
      supabase.from('savings_goal').select('target').eq('id', 1).maybeSingle(),
      supabase.from('savings_moves').select('amount'),
    ]).then(([sales, goal, moves]) => {
      const paid = ((sales.data as { paid_at: string }[] | null) ?? []).map((row) => dayKey(row.paid_at))
      const saved = ((moves.data as { amount: number }[] | null) ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
      const target = Number(goal.data?.target ?? 10000000)
      setMood({ today: paid.filter((day) => day === today).length, month: paid.length, car: target > 0 ? Math.min(saved / target, 1) : 0 })
    })
  }, [])
  if (!mood) return null
  return (
    <CheerCard characters={CHARACTERS} storageKey="acv-cheer-vale" mood={mood} label="Este mes vendiste" value={`${mood.month} ${mood.month === 1 ? 'venta' : 'ventas'}`}
      side={<>Tu auto 🚗 <b className="text-white">{percent(mood.car)}</b></>} progress={mood.car} progressLabel="Camino al auto" />
  )
}
