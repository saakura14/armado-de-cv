'use client'

import { useEffect, useState } from 'react'
import { CheerCard, type Character } from '@/components/cheer-card'
import { dayKey } from '@/lib/dashboard'
import { supabase } from '@/lib/supabase'

type Mood = { today: number; month: number }
type CharacterId = 'sakura' | 'inuyasha' | 'serena'

const sales = (count: number) => `${count} ${count === 1 ? 'venta' : 'ventas'}`

/**
 * Vale's favorite characters cheer her up with phrases in their style (short catchphrases, no lyrics) and her sales of
 * today and this month. It is only for encouragement: no money and no goals. The drawings are original chibis, not anime art.
 */
const CHARACTERS: Record<CharacterId, Character<Mood>> = {
  sakura: {
    name: '🌸 Sakura', figure: <Figure id="sakura" />, card: 'bg-[radial-gradient(120%_90%_at_20%_0%,#ff9ec4_0%,#d9468f_45%,#7a1f55_100%)]',
    overlay: 'bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.35)_0_2px,transparent_3px),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.25)_0_1.5px,transparent_2.5px),radial-gradient(circle_at_30%_85%,rgba(255,255,255,0.3)_0_1.5px,transparent_2.5px)]',
    accent: 'text-[#fff2a8]', bar: '', chip: 'bg-[#fff2a8] text-[#7a1f55]', bubble: 'bg-[#fff0f6] text-[#7a1f55]',
    lines: ({ today, month }) => [
      '¡Todo va a estar bien! ✨ Hoy es un gran día para vender.',
      today ? `¡Hoeee! ¿${sales(today)} hoy? ¡Qué bárbaro! 🌸` : '¡Hoeee! Todavía no hay ventas hoy… ¡la primera carta está por aparecer! 🃏',
      `Cada venta es una carta capturada: este mes ya van ${month}. 🃏`,
      'La carta Fuerza está de tu lado hoy. 💪',
      'Con tu báculo y tu Canva, no hay CV que se resista. ⭐',
    ],
  },
  inuyasha: {
    name: '⚔️ Inuyasha', figure: <Figure id="inuyasha" />, card: 'bg-[linear-gradient(160deg,#3a0f14_0%,#1c0a10_55%,#2b1838_100%)]',
    accent: 'text-[#f2c14e]', bar: '', chip: 'bg-[#e9e6f2] text-[#3a0f14]', bubble: 'bg-[#f5efe6] text-[#3a0f14]',
    lines: ({ today, month }) => [
      `¡Viento cortante! ⚔️ Y van ${sales(month)} este mes.`,
      'Juntando los fragmentos de la perla: cada clienta es uno. 💎',
      today ? `Keh. ¿${sales(today)} hoy? Nada mal, humana.` : 'Keh. Todavía no vendiste hoy… pero yo sé que vas a poder.',
      '¡Abajo! …las excusas. Hoy se vende. 📿',
      'Del otro lado del pozo te esperan clientas nuevas. 🌕',
    ],
  },
  serena: {
    name: '🌙 Serena', figure: <Figure id="serena" />, card: 'bg-[linear-gradient(170deg,#1b2a6b_0%,#121a45_55%,#3b1d5c_100%)]',
    overlay: 'bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.5)_0_1.5px,transparent_2.5px),radial-gradient(circle_at_60%_55%,rgba(255,255,255,0.35)_0_1px,transparent_2px),radial-gradient(circle_at_92%_70%,rgba(255,255,255,0.4)_0_1px,transparent_2px)]',
    accent: 'text-[#ffd84d]', bar: '', chip: 'bg-[#ffd84d] text-[#121a45]', bubble: 'bg-[#fff6fb] text-[#121a45]',
    lines: ({ today, month }) => [
      '¡En el nombre de la Luna, te castigaré!… si no cargás tus ventas. 🌙',
      `¡Por el poder del prisma lunar! ${sales(month)} este mes. ✨`,
      '¡Tiara lunar, acción! Hoy brillás vos. 💫',
      today ? `Hoy ${sales(today)}. ¡Guerrera del CV! 💖` : 'Hoy todavía no hubo ventas. ¡Transformación y a vender! 💖',
      'Luna dice que hoy te toca brillar. 🐈‍⬛',
    ],
  },
}

const LINE = '#3a2230'

/** Big shiny anime eyes: iris, pupil and two highlights. */
function Eyes({ color, y = 56 }: { color: string; y?: number }) {
  return (
    <>
      {[51, 69].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="5.2" ry="6.6" fill={color} stroke={LINE} strokeWidth="1.4" />
          <ellipse cx={x} cy={y + 1.5} rx="2.6" ry="3.6" fill={LINE} opacity="0.55" />
          <circle cx={x - 1.8} cy={y - 2.6} r="1.9" fill="#fff" />
          <circle cx={x + 1.8} cy={y + 2.6} r="0.9" fill="#fff" />
        </g>
      ))}
      <ellipse cx="44" cy={y + 7} rx="4" ry="2" fill="#ff8fb0" opacity="0.55" />
      <ellipse cx="76" cy={y + 7} rx="4" ry="2" fill="#ff8fb0" opacity="0.55" />
    </>
  )
}

/** Original chibi drawings: a girl with a winged star wand and a card, a silver-haired half-demon with dog ears and a big
 *  sword, a guardian with long blonde pigtails and a crescent moon. */
function Figure({ id }: { id: CharacterId }) {
  if (id === 'sakura') return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <path d="M14 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M22 120 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" fill="#fff" opacity="0.85" />
      {/* Floating card */}
      <g transform="rotate(-14 20 92)">
        <rect x="6" y="74" width="24" height="36" rx="3" fill="#fff6d6" stroke="#d9a520" strokeWidth="1.6" />
        <rect x="9.5" y="77.5" width="17" height="29" rx="2" fill="#ffb3d1" />
        <path d="M18 84 l2 4.2 4.6 .5 -3.4 3.1 1 4.5 -4.2 -2.4 -4.2 2.4 1 -4.5 -3.4 -3.1 4.6 -.5z" fill="#ffd84d" />
      </g>
      {/* Hair, back */}
      <path d="M36 52 q-3 -32 24 -32 q27 0 24 32 q0 9 -4 14 h-40 q-4 -5 -4 -14z" fill="#b5652e" stroke={LINE} strokeWidth="1.5" />
      {/* Body: pink dress, white collar, red bow, frills */}
      <path d="M47 72 h26 l12 36 h-50z" fill="#ff8fc0" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M36 106 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0" stroke="#fff" strokeWidth="2.6" fill="none" />
      <path d="M47 72 q13 12 26 0 l-1 7 q-12 7 -24 0z" fill="#fff" stroke={LINE} strokeWidth="1.2" />
      <path d="M60 82 l-9 -5 v10z M60 82 l9 -5 v10z" fill="#e8304a" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="60" cy="82" r="2.4" fill="#ffd84d" stroke={LINE} strokeWidth="1" />
      {/* Legs and shoes */}
      <path d="M53 108 v18 M67 108 v18" stroke="#ffe4d3" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M48 128 h9 M63 128 h9" stroke="#d9468f" strokeWidth="5" strokeLinecap="round" />
      {/* Arms: one to the card, one up with the wand */}
      <path d="M48 78 l-12 12" stroke="#ffe4d3" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 78 l12 -8" stroke="#ffe4d3" strokeWidth="5" strokeLinecap="round" />
      {/* Star wand: handle, ring, star and little wings */}
      <path d="M80 86 L100 40" stroke="#ff6fa8" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 30 q-12 -8 -14 -18 q9 3 15 11z M112 30 q12 -8 14 -18 q-9 3 -15 11z" fill="#fff" stroke={LINE} strokeWidth="1" />
      <circle cx="102" cy="30" r="10" fill="none" stroke="#ffd84d" strokeWidth="3" />
      <path d="M102 22 l2.3 4.8 5.2 .6 -3.9 3.5 1.1 5.1 -4.7 -2.7 -4.7 2.7 1.1 -5.1 -3.9 -3.5 5.2 -.6z" fill="#ffd84d" stroke="#e8a317" strokeWidth="0.8" />
      {/* Face */}
      <ellipse cx="60" cy="52" rx="21" ry="20" fill="#ffe4d3" stroke={LINE} strokeWidth="1.5" />
      {/* Long front locks, fringe and a little cowlick */}
      <path d="M39 46 q-5 15 1 28 q5 -11 7 -24z M81 46 q5 15 -1 28 q-5 -11 -7 -24z" fill="#b5652e" stroke={LINE} strokeWidth="1.2" />
      <path d="M38 50 q1 -24 22 -24 q21 0 22 24 q-5 -8 -9 -9 l-2 7 -4 -9 -4 9 -3 -9 -4 9 -3 -9 -3 7 q-6 2 -12 4z" fill="#b5652e" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M58 27 q2 -11 11 -10 q-7 3 -8 10z" fill="#b5652e" stroke={LINE} strokeWidth="1" />
      <Eyes color="#3aa070" />
      <path d="M56 65 q4 4 8 0" stroke={LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
  if (id === 'inuyasha') return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <circle cx="18" cy="20" r="11" fill="#f5efe6" opacity="0.9" />
      {/* Long silver hair, back */}
      <path d="M34 48 q-12 40 -6 88 h64 q6 -48 -6 -88 q-6 -26 -26 -26 q-20 0 -26 26z" fill="#e6e6f0" stroke={LINE} strokeWidth="1.5" />
      {/* Big sword behind */}
      <path d="M86 120 l7 3 l23 -78 q-5 -7 -12 -5z" fill="#eef2f7" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M95 118 l18 -66" stroke="#c9d3df" strokeWidth="2" />
      <ellipse cx="88" cy="118" rx="8" ry="3.5" fill="#f2c14e" stroke={LINE} strokeWidth="1.2" transform="rotate(-18 88 118)" />
      <path d="M84 122 l-3 12" stroke="#7a4a2a" strokeWidth="5" strokeLinecap="round" />
      {/* Red robe with wide sleeves, white collar, prayer beads */}
      <path d="M42 72 h36 l10 40 h-56z" fill="#d1312a" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M43 74 l-14 26 l14 5 l6 -18z M77 74 l14 26 l-14 5 l-6 -18z" fill="#d1312a" stroke={LINE} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M52 72 l8 15 l8 -15z" fill="#f5efe6" stroke={LINE} strokeWidth="1.2" />
      {[44, 48, 52, 56, 60, 64, 68, 72, 76].map((x, index) => <circle key={x} cx={x} cy={74 + Math.abs(60 - x) * -0.18 + 4} r={index % 3 === 1 ? 2.2 : 2.6} fill={index % 3 === 1 ? '#f5efe6' : '#5b3a8c'} stroke={LINE} strokeWidth="0.6" />)}
      <path d="M32 112 h56 l-4 20 h-20 l-4 -8 -4 8 h-20z" fill="#b5261f" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Dog ears on top */}
      <path d="M40 36 l1 -22 l15 13z M80 36 l-1 -22 l-15 13z" fill="#eeeef6" stroke={LINE} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M43 31 l1 -12 l8 7z M77 31 l-1 -12 l-8 7z" fill="#f5b5c5" />
      {/* Face, spiky fringe, sharp brows, amber eyes, smirk with a fang */}
      <ellipse cx="60" cy="53" rx="20" ry="19" fill="#f7dcc6" stroke={LINE} strokeWidth="1.5" />
      <path d="M39 51 q1 -25 21 -25 q20 0 21 25 l-5 -8 -2 9 -5 -11 -4 11 -5 -12 -5 12 -4 -11 -5 11 -2 -9z" fill="#e6e6f0" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M45 49 l10 4 M75 49 l-10 4" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" />
      <Eyes color="#e5a823" y={58} />
      <path d="M55 67 q5 3 10 -1" stroke={LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M61 66.5 l1.4 3 l1.4 -3.4z" fill="#fff" stroke={LINE} strokeWidth="0.6" />
    </svg>
  )
  return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      {/* Crescent moon */}
      <path d="M104 6 a14 14 0 1 0 8 25 a11 11 0 1 1 -8 -25z" fill="#ffd84d" />
      {/* Long blonde pigtails and buns with red clips */}
      <path d="M33 30 q-22 42 -13 104 q6 2 11 0 q-7 -58 10 -94z M87 30 q22 42 13 104 q-6 2 -11 0 q7 -58 -10 -94z" fill="#ffd84d" stroke={LINE} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="37" cy="25" r="11" fill="#ffd84d" stroke={LINE} strokeWidth="1.4" />
      <circle cx="83" cy="25" r="11" fill="#ffd84d" stroke={LINE} strokeWidth="1.4" />
      <circle cx="44" cy="31" r="3.6" fill="#e8304a" stroke={LINE} strokeWidth="1" />
      <circle cx="76" cy="31" r="3.6" fill="#e8304a" stroke={LINE} strokeWidth="1" />
      {/* Sailor top: blue collar, big red bow with a gold brooch, pleated blue skirt, red boots */}
      <path d="M46 72 h28 l4 22 h-36z" fill="#fff" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M44 72 l16 14 l16 -14 l4 6 l-20 15 l-20 -15z" fill="#2f5bd3" stroke={LINE} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M60 88 l-12 -7 v14z M60 88 l12 -7 v14z" fill="#e8304a" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="60" cy="88" r="3.4" fill="#ffd84d" stroke={LINE} strokeWidth="1" />
      <path d="M40 94 h40 l8 16 h-56z" fill="#2f5bd3" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M48 94 l-3 16 M56 94 l-1 16 M64 94 l1 16 M72 94 l3 16" stroke="#1f3f9e" strokeWidth="1.2" />
      <path d="M52 110 v14 M68 110 v14" stroke="#ffe4d3" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M52 124 v6 M68 124 v6" stroke="#e8304a" strokeWidth="7" strokeLinecap="round" />
      {/* One hand on the hip, the other making a V */}
      <path d="M46 76 l-8 12 l8 6" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M74 76 l10 -12" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M84 64 l-2 -8 M85 63 l3 -8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      {/* Face, split fringe and a tiara with a red gem */}
      <ellipse cx="60" cy="53" rx="20" ry="19" fill="#ffe4d3" stroke={LINE} strokeWidth="1.5" />
      <path d="M40 50 q2 -22 20 -22 q18 0 20 22 q-4 -6 -8 -8 l-3 7 -3 -9 -3 6 -3 -6 -3 9 -3 -7 q-4 2 -8 8 q-4 -1 -6 -2z" fill="#ffd84d" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M45 41 q15 -5 30 0" stroke="#f2c14e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="38.5" r="2.4" fill="#e8304a" stroke={LINE} strokeWidth="0.8" />
      <Eyes color="#4a7be0" y={57} />
      <path d="M56 65 q4 5 8 0z" fill="#e8607a" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/** Vale's card on the home screen: phrases to cheer her up with her sales of today and this month. */
export function ValeCheer() {
  const [mood, setMood] = useState<Mood | null>(null)
  useEffect(() => {
    const today = dayKey(new Date())
    const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00-03:00`).toISOString()
    supabase.from('orders').select('paid_at').gte('paid_at', monthStart).neq('status', 'cancelled').lt('number', 90000).then(({ data }) => {
      const paid = ((data as { paid_at: string }[] | null) ?? []).map((row) => dayKey(row.paid_at))
      setMood({ today: paid.filter((day) => day === today).length, month: paid.length })
    })
  }, [])
  if (!mood) return null
  return <CheerCard characters={CHARACTERS} storageKey="acv-cheer-vale" mood={mood} />
}
