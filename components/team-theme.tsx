'use client'

import type { CharacterId } from '@/components/team-cheer'
import type { TeamTask } from '@/lib/team'

/**
 * Gustavo's panel dressed as the character he picked: only the page around the cards changes (background, greeting,
 * titles, a status strip and soft animations). The CV cards and the work mode stay white, so the texts read the same.
 * Everything is drawn here (no game art, music or logos), and the moving parts stop with "reduce motion".
 */
export const PANEL_THEMES: Record<CharacterId, {
  page: string; hello: string; text: string; label: string; strip: string
  groups: [urgent: string, rest: string]; empty: string
}> = {
  snake: {
    page: 'bg-[#07130c]', hello: 'font-mono text-[#7dffa8]', text: 'text-[#c9ffd9]/80', label: 'font-mono text-[#7dffa8]/85',
    strip: 'bg-[#0f2d1b] text-[#c9ffd9] ring-1 ring-[#7dffa8]/40 font-mono',
    groups: ['❗ Alerta · primero estos', 'En la zona'], empty: 'Zona despejada: no hay CVs. Cuando Vale te pase uno, te llega por codec (un aviso).',
  },
  ezio: {
    page: 'bg-[#efe9dd]', hello: 'text-[#c8302b]', text: 'text-[#5a5650]', label: 'text-[#5a5650]',
    strip: 'bg-[#f8f4ec] text-[#151517] ring-1 ring-[#c8302b]/30',
    groups: ['🗡️ Objetivos prioritarios', 'Próximos objetivos'], empty: 'Ningún objetivo a la vista. Cuando Vale te pase un CV, te llega un aviso.',
  },
  freddie: {
    page: 'bg-[radial-gradient(120%_60%_at_50%_0%,#5b2a86_0%,#2a1240_55%,#140a1f_100%)]', hello: 'text-[#f6c945]', text: 'text-white/80', label: 'text-[#f6c945]/90',
    strip: 'bg-white/10 text-white ring-1 ring-[#f6c945]/40 backdrop-blur-sm',
    groups: ['🎤 Abren el show', 'Lista de temas'], empty: 'Todavía no hay temas en la lista. Cuando Vale te pase un CV, te llega un aviso.',
  },
}

/** The background of each theme, behind everything: scanlines; rooftops and an eagle crossing now and then; stage lights. */
export function ThemeBackdrop({ id }: { id: CharacterId }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {id === 'snake' && (
        <>
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(125,255,168,0.05)_0_1px,transparent_1px_3px)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(125,255,168,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(125,255,168,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </>
      )}
      {id === 'ezio' && (
        <>
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-40 w-full opacity-[0.12]">
            <path d="M0 80V52h24V40h18v12h14V30l10-12 10 12v22h26V44h30V30h14v22h22V36h12v16h26V24l6-14 6 14v28h24V46h30V34h16v18h22V42h20v38z" fill="#151517" />
          </svg>
          <span className="absolute bottom-36 animate-[eagle-fly_34s_linear_infinite] text-2xl opacity-60 motion-reduce:hidden">🦅</span>
        </>
      )}
      {id === 'freddie' && (
        <>
          <div className="absolute -top-10 left-[12%] h-[70vh] w-40 origin-top animate-[spot-sway_9s_ease-in-out_infinite] bg-[#f6c945]/10 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] motion-reduce:animate-none" />
          <div className="absolute -top-10 right-[10%] h-[70vh] w-40 origin-top animate-[spot-sway_11s_ease-in-out_infinite_reverse] bg-[#ff4f7b]/10 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] motion-reduce:animate-none" />
        </>
      )}
    </div>
  )
}

/** Snake's radar: a dot for each CV in the list, red for the urgent ones. */
function Radar({ urgent, others }: { urgent: number; others: number }) {
  const dots = [...Array(Math.min(urgent, 6)).fill(true), ...Array(Math.min(others, 10)).fill(false)] as boolean[]
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#07130c" stroke="#3ddc84" strokeOpacity="0.6" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#3ddc84" strokeOpacity="0.25" />
      <circle cx="32" cy="32" r="10" fill="none" stroke="#3ddc84" strokeOpacity="0.25" />
      <g className="origin-center animate-[radar-sweep_4s_linear_infinite] motion-reduce:animate-none" style={{ transformBox: 'view-box' }}>
        <path d="M32 32 L32 2 A30 30 0 0 1 58 17 Z" fill="#3ddc84" fillOpacity="0.28" />
      </g>
      {dots.map((isUrgent, index) => {
        // Spread on a spiral, the urgent ones closer to the center.
        const angle = index * 2.4
        const radius = 7 + (index % 4) * 5.5
        return <circle key={index} cx={32 + Math.cos(angle) * radius} cy={32 + Math.sin(angle) * radius} r={isUrgent ? 2.6 : 2} fill={isUrgent ? '#ff4848' : '#7dffa8'} />
      })}
    </svg>
  )
}

/** One line on top of the list, in each character's words, that also says where to start. */
export function ThemeStrip({ id, urgent, pending }: { id: CharacterId; urgent: TeamTask[]; pending: TeamTask[] }) {
  const theme = PANEL_THEMES[id]
  const others = pending.length - urgent.length
  const first = urgent[0] ?? pending[0]
  let text: string
  if (id === 'snake') text = pending.length ? `Radar: ${urgent.length ? `${urgent.length} ${urgent.length === 1 ? 'urgente' : 'urgentes'} · ` : ''}${others} en la zona.${first ? ` Objetivo: ${first.client_name} #${first.order_number}.` : ''}` : 'Radar limpio. Sin CVs en la zona.'
  else if (id === 'ezio') text = urgent.length ? `Vista de águila: ${urgent.length === 1 ? 'el urgente brilla' : `los ${urgent.length} urgentes brillan`}, el resto espera. Empezá por ${first!.client_name}.` : pending.length ? `Sin objetivos urgentes. Seguí en orden: ${first!.client_name} primero.` : 'La Hermandad descansa: no hay CVs pendientes.'
  else text = pending.length ? `Lista de temas de hoy: ${pending.length}. ${urgent.length ? 'Abre el show' : 'Arranca'} ${first!.client_name}${urgent.length ? ' 🎤' : ''}.` : 'Telón abajo: no hay temas pendientes. 👑'
  return (
    <div className={`mt-3 flex items-center gap-3 rounded-2xl px-3 py-2 text-[13px] font-semibold leading-snug ${theme.strip}`}>
      {id === 'snake' ? <Radar urgent={urgent.length} others={others} /> : <span aria-hidden className="text-2xl">{id === 'ezio' ? '👁️' : '🎤'}</span>}
      <p className="min-w-0 flex-1">{text}</p>
    </div>
  )
}

/** Snake only: opening a CV looks like an incoming codec call for a moment (it doesn't block anything). */
export function CodecCall({ task }: { task: TeamTask }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[58] flex items-center justify-center bg-[#07130c]/70 animate-[codec-in_1.1s_ease-out_forwards] motion-reduce:hidden">
      <div className="rounded-2xl bg-[#0f2d1b] px-6 py-4 text-center font-mono text-[#c9ffd9] ring-1 ring-[#7dffa8]/60">
        <p className="text-xs tracking-[0.3em] text-[#7dffa8]">📡 CODEC · LLAMADA ENTRANTE</p>
        <p className="mt-1 text-lg font-bold">Pedido #{task.order_number} · {task.client_name}</p>
      </div>
    </div>
  )
}
