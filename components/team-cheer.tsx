'use client'

import { useEffect, useState } from 'react'
import { CheerCard, type Character } from '@/components/cheer-card'
import { formatARS } from '@/lib/catalog'

type Mood = { pending: number; today: number; month: number; count: number; size: number }
export type CharacterId = 'freddie' | 'snake' | 'ezio'

/**
 * A character he likes cheers him up with phrases in its own style (written here, no song lyrics). The drawings are
 * original silhouettes, not photos or game art. Colors are fixed so the card looks the same in light and dark.
 */
const CHARACTERS: Record<CharacterId, Character<Mood>> = {
  freddie: {
    name: '👑 Freddie', figure: <Figure id="freddie" />, card: 'bg-[radial-gradient(120%_90%_at_20%_0%,#5b2a86_0%,#2a1240_45%,#140a1f_100%)]',
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
    name: '❗ Snake', figure: <Figure id="snake" />, overlay: 'bg-[repeating-linear-gradient(0deg,rgba(125,255,168,0.06)_0_1px,transparent_1px_3px)]', card: 'bg-[linear-gradient(180deg,#0d1f14_0%,#07130c_100%)]',
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
    name: '🦅 Ezio', figure: <Figure id="ezio" />, card: 'bg-[linear-gradient(160deg,#2b2b2e_0%,#151517_60%,#3a0d0d_100%)]',
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
export function TeamCheer(mood: Mood) {
  return (
    <CheerCard characters={CHARACTERS} storageKey="acv-cheer-character" mood={mood} 
      meter={{ label: 'Este mes juntaste', value: formatARS(mood.month), side: <>Cobro: <b className="text-white">{mood.count}/{mood.size}</b></>, progress: mood.count / Math.max(mood.size, 1), progressLabel: 'Próximo cobro' }} />
  )
}

const CELEBRATION: Record<CharacterId, { title: string; text: (count: number) => string }> = {
  freddie: { title: '¡Eeeeee-oh!', text: (count) => `¡${count} CVs, darling! El estadio entero está de pie aplaudiéndote. ¡Sos una leyenda! 👑🎤` },
  snake: { title: 'MISIÓN CUMPLIDA ★', text: (count) => `${count} objetivos completados sin que nadie te detecte. Rango: leyenda. ¿Te hice esperar, eh? Extracción con el cobro asegurada. 📦` },
  ezio: { title: 'Sincronización 100%', text: (count) => `${count} CVs completados. La Hermandad celebra tu trabajo: ¡salto de fe hacia tu cobro! 🦅` },
}
const CONFETTI = ['#f6c945', '#ff4f7b', '#7dffa8', '#6fb6ff', '#ffffff', '#ff8a3d']

/** Full screen party when he completes the CVs of a payment: his character jumps, confetti falls and it congratulates him. */
export function TeamCelebration({ count, onClose }: { count: number; onClose: () => void }) {
  const [id, setId] = useState<CharacterId>('freddie')
  useEffect(() => { try { const saved = localStorage.getItem('acv-cheer-character'); if (saved && saved in CHARACTERS) setId(saved as CharacterId) } catch { /* private mode */ } }, [])
  const look = CHARACTERS[id]
  const words = CELEBRATION[id]
  return (
    <div className={`fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden p-6 text-center text-white ${look.card}`} role="dialog" aria-modal="true" aria-label="¡Felicitaciones!">
      {look.overlay && <div className={`pointer-events-none absolute inset-0 ${look.overlay}`} />}
      {/* Confetti */}
      {Array.from({ length: 42 }, (_, index) => (
        <span key={index} aria-hidden className="pointer-events-none absolute top-[-5%] block h-3 w-2 animate-[confetti-fall_linear_infinite] rounded-sm motion-reduce:hidden"
          style={{ left: `${(index * 37) % 100}%`, background: CONFETTI[index % CONFETTI.length], animationDuration: `${2.6 + (index % 7) * 0.45}s`, animationDelay: `${(index % 11) * 0.25}s` }} />
      ))}
      <p className={`relative font-display text-3xl font-extrabold tracking-wide ${look.accent}`}>{words.title}</p>
      <div className="relative mt-4 h-64 w-48 animate-[cheer-bounce_1.1s_ease-in-out_infinite] motion-reduce:animate-none">{look.figure}</div>
      <p className={`relative mt-4 max-w-sm animate-[goal-in_0.6s_ease-out] rounded-3xl px-5 py-4 text-lg font-bold leading-snug shadow-2xl ${look.bubble}`}>{words.text(count)}</p>
      <p className="relative mt-3 text-sm text-white/80">¡Completaste los {count} CVs de este cobro! 🎉</p>
      <button type="button" onClick={onClose} className={`relative mt-6 rounded-full px-8 py-3 font-display text-base font-extrabold shadow-lg ${look.chip}`}>¡Gracias! 🙌</button>
    </div>
  )
}

/** The character he picked on the cheering card (Freddie until he picks one). Follows the change right away. */
export function useCheerCharacter() {
  const [id, setId] = useState<CharacterId>('freddie')
  useEffect(() => {
    function read() { try { const saved = localStorage.getItem('acv-cheer-character'); if (saved && saved in CHARACTERS) setId(saved as CharacterId) } catch { /* private mode */ } }
    read()
    window.addEventListener('acv-character', read)
    return () => window.removeEventListener('acv-character', read)
  }, [])
  return id
}

/** An urgent CV, in the style of his character: the alert over Snake's head, the hidden blade, the first song of the show. */
const URGENT_MARK: Record<CharacterId, { icon: string; label: string }> = {
  snake: { icon: '❗', label: '¡Alerta!' },
  ezio: { icon: '🗡️', label: 'Objetivo prioritario' },
  freddie: { icon: '🎤', label: 'Abre el show' },
}
export function UrgentMark({ compact = false, short = false }: { compact?: boolean; short?: boolean }) {
  const id = useCheerCharacter()
  const mark = URGENT_MARK[id]
  // Snake's "!" pops up when it appears, like when a guard spots him.
  const pop = id === 'snake' ? ' inline-block animate-[alert-pop_0.7s_ease-out_2]' : ''
  if (compact) return <span role="img" aria-label={`Urgente: ${mark.label}`} className={`shrink-0 self-center text-sm leading-none${pop}`}>{mark.icon}</span>
  return <span title={mark.label} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#d6342c] px-2 py-px font-display text-[11px] font-bold text-white"><span aria-hidden className={pop}>{mark.icon}</span>{short ? 'Urgente' : `Urgente · ${mark.label}`}</span>
}

/** What his character says each time he finishes a CV (written here, in each one's style). */
const DONE_LINES: Record<CharacterId, string[]> = {
  freddie: [
    '¡Bravo, darling! Otro CV y el público pide bis. 🎤',
    'Ese CV fue un hit de estadio. 👑',
    '¡Eeee-oh! Tema terminado, el show sigue. 🎸',
    'Ovación de pie: CV entregado con estilo. ✨',
    'Darling, eso no fue un CV: fue un clásico. 💛',
  ],
  snake: [
    'Misión cumplida. CV entregado sin activar ninguna alarma. 📦',
    '📡 Codec: Buen trabajo. El próximo objetivo ya está en el radar.',
    'Objetivo asegurado. Volvé a la caja y preparate para la próxima. 📦',
    'Infiltración perfecta: nadie te vio, pero el CV quedó impecable. ★',
    'Rango de la misión: Big Boss. ★',
  ],
  ezio: [
    'Salto de fe perfecto: el CV aterrizó impecable. 🍂',
    'Sincronización 100% con este CV. 🦅',
    'La Hermandad anota otro objetivo cumplido. 🗡️',
    'Silencioso y preciso: así se entrega un CV. 🦅',
    'Otro punto de vista conquistado. Seguimos, hermano. 🦅',
  ],
}

const BURST: Record<CharacterId, string> = { snake: '★', ezio: '🍂', freddie: '✨' }

/** The message when he finishes a CV: his character's colors, a phrase of its own and how it went (his time, the next one). */
export function FinishCheer({ text }: { text: string }) {
  const id = useCheerCharacter()
  const look = CHARACTERS[id]
  const [pick] = useState(() => Math.floor(Math.random() * 1000))
  const lines = DONE_LINES[id]
  return (
    <div role="status" className={`fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md animate-[goal-in_0.5s_ease-out] items-center gap-3 overflow-hidden rounded-3xl p-3 text-white shadow-2xl ${look.card}`}>
      {look.overlay && <div className={`pointer-events-none absolute inset-0 ${look.overlay}`} />}
      {/* A short burst: leaves of the leap of faith, stage sparkles or mission stars. */}
      {Array.from({ length: 7 }, (_, index) => (
        <span key={index} aria-hidden className="pointer-events-none absolute top-0 animate-[leaf-fall_1.8s_ease-in_forwards] text-base opacity-0 motion-reduce:hidden"
          style={{ left: `${8 + index * 13}%`, animationDelay: `${(index % 4) * 0.18}s` }}>{BURST[id]}</span>
      ))}
      <div className="relative h-20 w-14 shrink-0">{look.figure}</div>
      <div className="relative min-w-0 flex-1">
        <p className={`rounded-2xl rounded-bl-sm px-3 py-2 text-sm font-bold leading-snug ${look.bubble}`}>{lines[pick % lines.length]}</p>
        <p className="mt-1.5 text-xs font-semibold leading-snug text-white/85">{text}</p>
      </div>
    </div>
  )
}
