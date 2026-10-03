'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { TASK_STATUS, dueLabel, type TeamTask } from '@/lib/team'

/** One block of text to paste in Canva, with its own copy button. */
function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { setOpen(true) }
  }
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-left font-display text-sm font-bold text-ciruela">{label} <span className="font-sans text-xs font-normal text-piedra">· {open ? 'ocultar' : 'ver texto'}</span></button>
        <button type="button" onClick={copy} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 font-display text-xs font-bold ${copied ? 'bg-whatsapp text-white' : 'bg-ciruela text-white hover:bg-rosa'}`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {open && <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-line px-3.5 py-3 font-sans text-sm leading-relaxed text-ink">{text}</pre>}
    </div>
  )
}

/**
 * A CV to build, as the team member sees it: the texts with copy buttons and the next step.
 * `actions` holds the buttons of each screen (the member's "Empecé"/"Terminé", or Vale's own tools).
 */
export function TeamTaskCard({ task, actions, children }: { task: TeamTask; actions?: React.ReactNode; children?: React.ReactNode }) {
  const due = task.status !== 'terminado' ? dueLabel(task.due_on) : null
  const status = TASK_STATUS[task.status]
  return (
    <li className="rounded-3xl bg-white p-4 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Pedido #{task.order_number}</p>
          <p className="mt-0.5 text-[15px] font-bold text-ink">{task.pack_name} · {task.client_name}</p>
          <p className="text-xs text-piedra">CV moderno + CV ATS{task.has_letter ? ' + carta de presentación' : ''}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold ${status.tone}`}>{status.label}</span>
          {due && <span className={`rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold ${due.urgent ? 'bg-rosa-deep text-white' : 'bg-papel text-ciruela'}`}>{due.text}</span>}
        </div>
      </div>
      {task.notes && <p className="mt-3 rounded-2xl bg-papel px-3.5 py-2.5 text-sm text-ink"><b>Notas de Vale:</b> {task.notes}</p>}
      {task.status !== 'terminado' && (
        <div className="mt-3 space-y-2">
          <CopyBlock label="CV moderno" text={task.cv_modern} />
          <CopyBlock label="CV ATS" text={task.cv_ats} />
          {task.has_letter && task.letter && <CopyBlock label="Carta de presentación" text={task.letter} />}
          {task.has_letter && !task.letter && <p className="px-1 text-xs font-semibold text-rosa-deep">Lleva carta: el texto te lo pasa Vale.</p>}
        </div>
      )}
      {task.status === 'terminado' && task.design_url && (
        <a href={task.design_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rosa-deep hover:underline">Ver el diseño en Canva<ExternalLink className="h-3.5 w-3.5" /></a>
      )}
      {children}
      {actions && <div className="mt-3">{actions}</div>}
    </li>
  )
}
