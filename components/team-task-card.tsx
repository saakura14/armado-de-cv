'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, RotateCcw, SkipForward } from 'lucide-react'
import { TASK_STATUS, dueLabel, type TeamTask } from '@/lib/team'

/** Paragraphs (separated by a blank line), each with its lines: the pieces that get pasted one by one in Canva. */
function splitPieces(text: string) {
  return text.replace(/\r\n/g, '\n').split(/\n[ \t]*\n+/).map((piece) => piece.replace(/^\n+|\n+$/g, '')).filter((piece) => piece.trim())
}

async function writeClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

/** Remembered on this device, so going to Canva and back (or closing the app) keeps track of what was already copied. */
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    try { const saved = localStorage.getItem(key); if (saved) setValue(JSON.parse(saved) as T) } catch { /* private mode: only for this visit */ }
  }, [key])
  function save(next: T | ((current: T) => T)) {
    setValue((current) => {
      const value = typeof next === 'function' ? (next as (current: T) => T)(current) : next
      try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
      return value
    })
  }
  return [value, save] as const
}

/**
 * One text to paste in Canva (CV moderno, ATS or the letter), split in paragraphs.
 * Tap a line to copy that line, the button of a paragraph to copy the paragraph, "Copiar siguiente" for the next one not copied yet,
 * or select any part by hand. What was copied stays ticked, and the next paragraph is highlighted.
 */
function CopyBlock({ storageKey, label, text }: { storageKey: string; label: string; text: string }) {
  const pieces = useMemo(() => {
    const paragraphs = splitPieces(text)
    // A long text pasted without blank lines: each line is a piece, so "Copiar siguiente" still goes bit by bit.
    const list = paragraphs.length === 1 && paragraphs[0].split('\n').length > 6 ? paragraphs[0].split('\n').filter((line) => line.trim()) : paragraphs
    return list.map((piece) => ({ text: piece, lines: piece.split('\n') }))
  }, [text])
  const [open, setOpen] = useStored(`acv-open-${storageKey}`, false)
  const [copied, setCopied] = useStored<string[]>(`acv-copied-${storageKey}`, [])
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // A paragraph is done when it was copied whole, or line by line.
  const pieceDone = (index: number) => copied.includes(`p${index}`) || pieces[index].lines.every((line, lineIndex) => !line.trim() || copied.includes(`p${index}l${lineIndex}`))
  const doneCount = pieces.filter((_, index) => pieceDone(index)).length
  const next = pieces.findIndex((_, index) => !pieceDone(index))

  function notify(ok: boolean, message: string) {
    window.clearTimeout(timer.current)
    setToast({ ok, text: message })
    timer.current = window.setTimeout(() => setToast(null), 1800)
  }
  async function copy(value: string, mark: string[], element?: HTMLElement | null, tap = false) {
    // Dragging over a line to select part of it is not a tap to copy the whole line.
    if (tap && window.getSelection()?.toString()) return
    if (await writeClipboard(value)) {
      setCopied((current) => [...new Set([...current, ...mark])])
      const preview = value.replace(/\s+/g, ' ').trim()
      notify(true, `Copiado: «${preview.length > 42 ? `${preview.slice(0, 42)}…` : preview}»`)
    } else if (element) {
      // No clipboard access: leave it selected so the system "Copiar" works.
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges(); selection?.addRange(range)
      notify(false, 'Quedó seleccionado: tocá "Copiar" en el menú.')
    }
  }
  function copyNext() {
    if (next < 0) return
    if (!open) setOpen(true)
    copy(pieces[next].text, [`p${next}`], refs.current[next])
    // Shows where it is in the text.
    window.setTimeout(() => refs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  return (
    <div className="rounded-2xl border border-line bg-white">
      {/* Stays at the top while scrolling a long text, so "Copiar siguiente" is always at hand. */}
      <div className={`flex flex-wrap items-center gap-2 rounded-t-2xl bg-white px-3 py-2 ${open ? 'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-line shadow-[0_8px_16px_-14px_rgba(67,32,44,0.5)]' : 'rounded-b-2xl'}`}>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 flex-1 items-center gap-2 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-piedra transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="font-display text-sm font-bold text-ciruela">{label}</span>
          <span className={`rounded-full px-2 py-0.5 font-display text-[11px] font-bold ${doneCount === pieces.length ? 'bg-whatsapp/15 text-whatsapp' : 'bg-papel text-piedra'}`}>{doneCount}/{pieces.length}</span>
        </button>
        <div className="flex gap-2">
          {next >= 0 && (
            <button type="button" onClick={copyNext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-rosa px-3.5 font-display text-xs font-bold text-white hover:bg-rosa-deep">
              <SkipForward className="h-4 w-4" />{doneCount ? 'Copiar siguiente' : 'Copiar el 1°'}
            </button>
          )}
          <button type="button" onClick={() => copy(text, ['all'])} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 font-display text-xs font-bold ${copied.includes('all') ? 'bg-whatsapp text-white' : 'bg-ciruela text-white hover:bg-rosa'}`}>
            {copied.includes('all') ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}Todo
          </button>
        </div>
      </div>

      {open && (
        <div className="px-2 py-2 sm:px-3">
          <p className="px-1.5 pb-2 text-[11px] leading-snug text-piedra">Tocá un renglón para copiarlo o el botón del bloque para copiar el párrafo. También podés seleccionar con el dedo solo una parte. Lo copiado queda tildado.</p>
          <div className="space-y-1.5">
            {pieces.map((piece, index) => {
              const done = pieceDone(index)
              return (
                <div key={index} ref={(element) => { refs.current[index] = element }} className={`flex scroll-mt-20 items-start gap-2 rounded-xl border p-1.5 transition-colors ${index === next ? 'border-rosa bg-petalo-wash/40' : done ? 'border-transparent bg-whatsapp/5' : 'border-transparent bg-papel/50'}`}>
                  <div className="min-w-0 flex-1 select-text font-sans text-[15px] leading-relaxed text-ink">
                    {piece.lines.map((line, lineIndex) => line.trim() ? (
                      <span key={lineIndex} role="button" tabIndex={0}
                        onClick={(event) => copy(line.trim(), [`p${index}l${lineIndex}`], event.currentTarget, true)}
                        onKeyDown={(event) => { if (event.key === 'Enter') copy(line.trim(), [`p${index}l${lineIndex}`], event.currentTarget, true) }}
                        className={`block cursor-pointer whitespace-pre-wrap break-words rounded-lg px-1.5 py-0.5 hover:bg-white active:bg-rosa/10 ${!done && copied.includes(`p${index}l${lineIndex}`) ? 'text-whatsapp' : ''}`}>{line}</span>
                    ) : <span key={lineIndex} className="block h-2" />)}
                  </div>
                  <button type="button" onClick={(event) => copy(piece.text, [`p${index}`], event.currentTarget.previousElementSibling as HTMLElement | null)} aria-label={`Copiar el bloque ${index + 1}`}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? 'bg-whatsapp text-white' : index === next ? 'bg-rosa text-white' : 'bg-white text-ciruela hover:bg-ciruela hover:text-white'}`}>
                    {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1.5">
            {copied.length > 0 ? <button type="button" onClick={() => setCopied([])} className="inline-flex items-center gap-1 text-xs font-semibold text-piedra hover:text-ciruela"><RotateCcw className="h-3.5 w-3.5" />Desmarcar lo copiado</button> : <span />}
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-piedra hover:text-ciruela">Cerrar texto</button>
          </div>
        </div>
      )}

      {toast && (
        <p role="status" className={`pointer-events-none fixed inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg ${toast.ok ? 'bg-ciruela' : 'bg-rosa-deep'}`}>{toast.text}</p>
      )}
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
          <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">{task.order_number ? `Pedido #${task.order_number}` : 'Ejemplo'}</p>
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
          <CopyBlock storageKey={`${task.id}-moderno`} label="CV moderno" text={task.cv_modern} />
          <CopyBlock storageKey={`${task.id}-ats`} label="CV ATS" text={task.cv_ats} />
          {task.has_letter && task.letter && <CopyBlock storageKey={`${task.id}-carta`} label="Carta de presentación" text={task.letter} />}
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
