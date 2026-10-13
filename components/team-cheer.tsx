'use client'

import { useEffect, useState } from 'react'
import { formatARS } from '@/lib/catalog'

type Mood = { pending: number; today: number; month: number; count: number; size: number }
type CharacterId = 'freddie' | 'snake' | 'ezio'

/**
 * A character he likes cheers him up with phrases in its own style (written here, no song lyrics). The drawings are
 * original silhouettes, not photos or game art. Colors are fixed so the card looks the same in light and dark.
 */
const CHARACTERS: Record<CharacterId, {
  name: string; card: string; accent: string; bar: string; chip: string; bubble: string
  lines: (mood: Mood) => string[]
}> = {
  freddie: {
    name: '👑 Freddie', card: 'bg-[radial-gradient(120%_90%_at_20%_0%,#5b2a86_0%,#2a1240_45%,#140a1f_100%)]',
    accent: 'text-[#f6c945]', bar: 'bg-[linear-gradient(90deg,#f6c945,#ff8a3d,#ff4f7b)]', chip: 'bg-[#f6c945] text-[#2a1240]', bubble: 'bg-[#fff7dc] text-[#2a1240]',
    lines: ({ pending, today, month }) => [
      '¡Eeeeee-oh! 🎤 El público pide otro CV.',
      'Darling, ese último diseño quedó de estadio. ✨',
      'No sos una estrella de rock: sos una leyenda armando CVs. 👑',
      today ? `${today} ${today === 1 ? 'CV' : 'CVs'} hoy y el estadio está de pie. ¡Bis!` : 'Se prenden las luces, sube el telón: arrancamos el show. 🎸',
      pending ? `Quedan ${pending} en la lista de temas. ¡Uno más y saludás!` : 'Lista de temas completa. ¡Ovación de pie, darling! 👏',
      month ? `Este mes ya juntaste ${formatARS(month)}. Eso es de estrella, darling. 💛` : 'Cada CV es un tema más del recital. ¡A darlo todo!',
    ],
  },
  snake: {
    name: '❗ Snake', card: 'bg-[linear-gradient(180deg,#0d1f14_0%,#07130c_100%)]',
    accent: 'text-[#7dffa8]', bar: 'bg-[linear-gradient(90deg,#3ddc84,#b6ff6a)]', chip: 'bg-[#7dffa8] text-[#07130c]', bubble: 'bg-[#0f2d1b] text-[#c9ffd9] ring-1 ring-[#7dffa8]/50 font-mono',
    lines: ({ pending, today, month }) => [
      '¿Te hice esperar, eh? Vamos con el próximo CV.',
      '📡 Codec: Vale reporta que vas excelente. Cambio.',
      pending ? `❗ ¡Alerta! Hay ${pending} ${pending === 1 ? 'CV' : 'CVs'} en la zona. Entrá en silencio.` : '¿Snake? ¿¡Snake!? ...Tranqui: no quedan CVs en la zona. 😎',
      'Cuando dudes, metete en la caja y seguí. 📦',
      today ? `Objetivos neutralizados hoy: ${today}. Rango: leyenda. ★` : 'Infiltración en curso. El primer CV del día te espera.',
      month ? `Misión del mes: ${formatARS(month)} en la mochila. Extracción asegurada. 🎒` : 'Equipo listo. La misión empieza con el primer CV.',
    ],
  },
  ezio: {
    name: '🦅 Ezio', card: 'bg-[linear-gradient(160deg,#2b2b2e_0%,#151517_60%,#3a0d0d_100%)]',
    accent: 'text-[#ff5a4e]', bar: 'bg-[linear-gradient(90deg,#e8e4da,#ff5a4e)]', chip: 'bg-[#e8e4da] text-[#151517]', bubble: 'bg-[#f1ece2] text-[#151517]',
    lines: ({ pending, today, month, count, size }) => [
      'Nada es verdad, todo está permitido... menos un CV con errores. 🦅',
      pending ? `Subí al punto de vista: ${pending} ${pending === 1 ? 'CV' : 'CVs'} a la vista.` : 'Desde el punto de vista no se ve ningún CV pendiente. Descansá, hermano.',
      'Salto de fe: el próximo CV es tuyo. 🍂',
      `Sincronización con el próximo cobro: ${Math.min(Math.round((count / Math.max(size, 1)) * 100), 100)}%.`,
      today ? `Requiescat in pace, ${today} ${today === 1 ? 'CV pendiente' : 'CVs pendientes'}. Buen trabajo hoy. 🗡️` : 'La Hermandad confía en vos. Arrancá con el primero.',
      month ? `Florines del mes: ${formatARS(month)}. La Hermandad está orgullosa. 💰` : 'De techo en techo, CV a CV.',
    ],
  },
}
const CHARACTER_KEY = 'acv-cheer-character'

/** Original silhouettes: a frontman with the mic stand up, a soldier with a bandana in his box, a hooded assassin. */
function Figure({ id }: { id: CharacterId }) {
  if (id === 'freddie') return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <path d="M10 0 L50 140 L-20 140 Z" fill="#f6c945" opacity="0.14" />
      <path d="M118 0 L140 140 L74 140 Z" fill="#ff4f7b" opacity="0.12" />
      {/* Raised fist and half mic stand */}
      <path d="M66 52 L84 22" stroke="#e9d7c2" strokeWidth="6" strokeLinecap="round" />
      <circle cx="86" cy="18" r="6" fill="#e9d7c2" />
      <path d="M40 58 L22 84" stroke="#9aa0a6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M44 62 L34 74" stroke="#e9d7c2" strokeWidth="6" strokeLinecap="round" />
      {/* Head with short hair and moustache */}
      <circle cx="58" cy="36" r="11" fill="#e9d7c2" />
      <path d="M47 36 q-1 -15 11 -15 q12 0 11 15 q-3 -8 -11 -8 q-8 0 -11 8 z" fill="#1d1418" />
      <circle cx="54" cy="36" r="1.4" fill="#1d1418" /><circle cx="62" cy="36" r="1.4" fill="#1d1418" />
      <path d="M52 41.5 q6 -3.5 12 0 q-6 2.5 -12 0 z" fill="#1d1418" stroke="#1d1418" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Yellow jacket, white trousers */}
      <path d="M44 50 h28 l4 34 h-36 z" fill="#f6c945" />
      <path d="M52 50 l6 12 l6 -12" fill="#fff" />
      <path d="M42 84 h32 l-4 48 h-8 l-4 -34 l-4 34 h-8 z" fill="#f4f1ea" />
      <path d="M38 134 h14 M62 134 h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
  if (id === 'snake') return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <text x="60" y="34" textAnchor="middle" fontSize="34" fontWeight="900" fill="#ff4848" fontFamily="system-ui">!</text>
      {/* Head peeking out of the box, with a bandana */}
      <circle cx="60" cy="66" r="13" fill="#c9a27e" />
      <path d="M46 62 h28 v-6 h-28 z" fill="#3b4f6b" />
      <path d="M74 59 q14 -2 20 -10 M74 61 q12 6 22 2" stroke="#3b4f6b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M53 66 h4 M63 66 h4" stroke="#1d1418" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M50 74 q10 6 20 0" stroke="#4a3727" strokeWidth="3" fill="none" />
      {/* Cardboard box */}
      <path d="M22 84 l38 -10 l38 10 v40 l-38 12 l-38 -12 z" fill="#b8925a" />
      <path d="M22 84 l38 12 l38 -12 M60 96 v40" stroke="#7a5a2e" strokeWidth="2.4" fill="none" />
      <path d="M30 104 l18 5 M30 110 l12 3" stroke="#7a5a2e" strokeWidth="2" />
      <circle cx="60" cy="70" r="56" stroke="#7dffa8" strokeOpacity="0.15" fill="none" />
    </svg>
  )
  return (
    <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
      <path d="M0 140 V110 h16 v-10 h14 v40 M86 140 V104 h14 v-14 h20 V140 Z" fill="#000" opacity="0.5" />
      {/* Hooded assassin with a red sash */}
      <path d="M60 24 l-16 22 q-4 18 4 26 l-12 62 h48 l-12 -62 q8 -8 4 -26 z" fill="#ece7dc" />
      <path d="M60 30 l-10 16 q0 12 10 16 q10 -4 10 -16 z" fill="#1a1a1c" />
      <path d="M48 56 l12 8 l12 -8" stroke="#bdb6a8" strokeWidth="2" fill="none" />
      <path d="M42 92 h36 v8 h-36 z" fill="#c8302b" />
      <path d="M78 98 l14 30" stroke="#9aa0a6" strokeWidth="3" strokeLinecap="round" />
      {/* Eagle above */}
      <path d="M98 14 c-6 -5 -13 -6 -20 -3 c6 1 10 4 14 7 c-4 0 -7 1 -9 3 c5 -1 9 -1 13 0 l2 3 l2 -3 c4 -1 8 -1 13 0 c-2 -2 -5 -3 -9 -3 c4 -3 8 -6 14 -7 c-7 -3 -14 -2 -20 3 z" fill="#e8e4da" />
    </svg>
  )
}

/** His favorite characters cheer him up: a phrase that changes, what he made this month and how close the next payment is. */
export function TeamCheer({ pending, today, month, count, size }: Mood) {
  const [id, setId] = useState<CharacterId>('freddie')
  const [line, setLine] = useState(0)
  useEffect(() => { try { const saved = localStorage.getItem(CHARACTER_KEY); if (saved && saved in CHARACTERS) setId(saved as CharacterId) } catch { /* private mode */ } }, [])
  useEffect(() => { const timer = window.setInterval(() => setLine((value) => value + 1), 8000); return () => window.clearInterval(timer) }, [])
  function pick(next: CharacterId) { setId(next); setLine(0); try { localStorage.setItem(CHARACTER_KEY, next) } catch { /* private mode */ } }

  const look = CHARACTERS[id]
  const lines = look.lines({ pending, today, month, count, size })
  const share = Math.min(count / Math.max(size, 1), 1)

  return (
    <section className={`relative overflow-hidden rounded-3xl p-4 text-white shadow-[0_18px_40px_-24px_rgba(20,10,31,0.9)] ${look.card}`} aria-label="Ánimo">
      {id === 'snake' && <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(125,255,168,0.06)_0_1px,transparent_1px_3px)]" />}
      <div className="relative flex items-end gap-2">
        {/* Tapping the character brings the next phrase. */}
        <button type="button" onClick={() => setLine((value) => value + 1)} aria-label="Otra frase" className="h-32 w-24 shrink-0 transition-transform active:scale-95">
          <Figure id={id} />
        </button>
        <p key={`${id}-${line}`} className={`relative mb-6 flex-1 animate-[goal-in_0.5s_ease-out] rounded-2xl rounded-bl-sm px-3 py-2.5 text-sm font-bold leading-snug shadow-lg ${look.bubble}`}>
          {lines[line % lines.length]}
        </p>
      </div>

      <div className="relative mt-1">
        <div className="flex items-baseline justify-between gap-2 text-xs text-white/75">
          <span>Este mes juntaste <b className={`font-display text-base ${look.accent}`}>{formatARS(month)}</b></span>
          <span>Cobro: <b className="text-white">{count}/{size}</b></span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Próximo cobro" aria-valuemin={0} aria-valuemax={size} aria-valuenow={count}>
          <div className={`relative h-full rounded-full transition-[width] duration-1000 ${look.bar}`} style={{ width: `${share * 100}%` }}>
            <span className="absolute inset-0 animate-[goal-shine_2.4s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] bg-[length:50%_100%] bg-no-repeat motion-reduce:hidden" />
          </div>
        </div>
      </div>

      <div role="radiogroup" aria-label="Personaje" className="relative mt-3 flex gap-1.5">
        {(Object.keys(CHARACTERS) as CharacterId[]).map((key) => (
          <button key={key} type="button" role="radio" aria-checked={id === key} onClick={() => pick(key)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${id === key ? look.chip : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>{CHARACTERS[key].name}</button>
        ))}
      </div>
    </section>
  )
}
