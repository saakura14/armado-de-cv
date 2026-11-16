'use client'

import { sectionsOf } from '@/components/team-task-card'
import type { TeamTask } from '@/lib/team'
import { startedLabel } from './task-start'

/** Share of the texts already copied to Canva (0 to 1), or null if his work mode never reported. */
export function progressShare(task: Pick<TeamTask, 'progress' | 'cv_modern' | 'cv_ats' | 'has_letter' | 'letter'>) {
  const parts = sectionsOf(task).map((section) => task.progress?.[section.id]).filter((part): part is [number, number] => Array.isArray(part) && part[1] > 0)
  if (!parts.length) return null
  return parts.reduce((sum, [done]) => sum + done, 0) / parts.reduce((sum, [, total]) => sum + total, 0)
}

/**
 * Only in Vale's panel: how far the team member got in a CV he is building. For each text (CV moderno, CV ATS, carta),
 * the parts he already copied to Canva, and when he last moved. It updates live while he works.
 */
export function TaskProgress({ task }: { task: TeamTask }) {
  if (task.status !== 'haciendo') return null
  const sections = sectionsOf(task)
  const reported = progressShare(task) !== null
  return (
    <div className="rounded-2xl bg-papel/70 p-3">
      <p className="font-display text-[11px] font-bold uppercase tracking-wider text-piedra">Por dónde va</p>
      {!reported ? (
        <p className="mt-1 text-xs text-piedra">Todavía no copió nada a Canva desde el modo de trabajo.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sections.map((section) => {
            const [done, total] = task.progress?.[section.id] ?? [0, 0]
            const share = total ? Math.min(done / total, 1) : 0
            return (
              <li key={section.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold text-ink">{section.label}</span>
                  <span className={share >= 1 ? 'font-bold text-whatsapp' : 'text-piedra'}>{share >= 1 ? '✓ Listo' : section.whole ? (done ? 'Copiada' : 'Sin empezar') : `${done} de ${total} partes`}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white"><div className={`h-1.5 rounded-full ${share >= 1 ? 'bg-whatsapp' : 'bg-rosa'}`} style={{ width: `${share * 100}%` }} /></div>
              </li>
            )
          })}
        </ul>
      )}
      {task.progress_at && <p className="mt-2 text-[11px] text-piedra">Último movimiento {startedLabel(task.progress_at)}</p>}
    </div>
  )
}
