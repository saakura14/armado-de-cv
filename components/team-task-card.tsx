'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Columns2, Copy, ExternalLink, MessageCircle, RotateCcw, SkipForward, X } from 'lucide-react'
import { whatsappUrl } from '@/lib/catalog'
import { dueLabel, type TeamTask } from '@/lib/team'

/** Paragraphs (separated by a blank line), each with its lines: the pieces that get pasted one by one in Canva. */
function splitPieces(text: string) {
  return text.replace(/\r\n/g, '\n').split(/\n[ \t]*\n+/).map((piece) => piece.replace(/^\n+|\n+$/g, '')).filter((piece) => piece.trim())
}

type Piece = { text: string; lines: string[] }

/** The pieces "Copiar siguiente" goes through. */
function piecesOf(text: string, whole = false): Piece[] {
  // The cover letter goes whole (one block); the CVs go paragraph by paragraph.
  const paragraphs = whole ? [text.trim()] : splitPieces(text)
  // A long text pasted without blank lines: each line is a piece, so "Copiar siguiente" still goes bit by bit.
  const list = !whole && paragraphs.length === 1 && paragraphs[0].split('\n').length > 6 ? paragraphs[0].split('\n').filter((line) => line.trim()) : paragraphs
  return list.map((piece) => ({ text: piece, lines: piece.split('\n') }))
}

/** A paragraph is done when it was copied whole, or line by line. */
function isPieceDone(pieces: Piece[], copied: string[], index: number) {
  return copied.includes(`p${index}`) || pieces[index].lines.every((line, lineIndex) => !line.trim() || copied.includes(`p${index}l${lineIndex}`))
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
      // The lists show how much was copied: they listen to this.
      window.setTimeout(() => window.dispatchEvent(new Event('acv-stored')), 0)
      return value
    })
  }
  return [value, save] as const
}

type NextStep = { label: string; go: () => void }

/**
 * One text to paste in Canva (CV moderno, ATS or the letter), split in paragraphs.
 * Tap a line to copy that line, the button of a paragraph to copy the paragraph, "Copiar siguiente" for the next one not copied yet,
 * or select any part by hand. What was copied stays ticked, and the next paragraph is highlighted.
 * `focus` is the work mode: always open, with the buttons in a bar at the bottom (the thumb's reach) and, once everything
 * is copied, a button to the next text.
 */
function CopyBlock({ storageKey, label, text, whole = false, focus = false, hidden = false, nextStep, onProgress }: {
  storageKey: string; label: string; text: string; whole?: boolean
  focus?: boolean; hidden?: boolean; nextStep?: NextStep; onProgress?: (done: number, total: number) => void
}) {
  const pieces = useMemo(() => piecesOf(text, whole), [text, whole])
  const [storedOpen, setOpen] = useStored(`acv-open-${storageKey}`, false)
  const open = focus || storedOpen
  const [copied, setCopied] = useStored<string[]>(`acv-copied-${storageKey}`, [])
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const textRef = useRef<HTMLDivElement>(null)
  // "Marcar" mode: tapping the text doesn't copy, so placing the finger and dragging the handles is easy.
  const [mode, setMode] = useStored<'tocar' | 'marcar'>('acv-copy-mode', 'tocar')
  // The part marked by hand inside this text, for the "Copiar lo marcado" button.
  const [marked, setMarked] = useState('')
  useEffect(() => {
    let clear: number | undefined
    function onSelection() {
      const selection = window.getSelection()
      const value = selection && !selection.isCollapsed ? selection.toString() : ''
      window.clearTimeout(clear)
      if (value.trim() && textRef.current?.contains(selection!.anchorNode)) { setMarked(value); return }
      // On a tablet the selection goes away as the button is touched: keep it a moment so the tap still copies it.
      clear = window.setTimeout(() => setMarked(''), 700)
    }
    document.addEventListener('selectionchange', onSelection)
    return () => { document.removeEventListener('selectionchange', onSelection); window.clearTimeout(clear) }
  }, [])
  async function copyMarked() {
    const value = marked
    setMarked('')
    window.getSelection()?.removeAllRanges()
    await copy(value, [])
  }

  const pieceDone = (index: number) => isPieceDone(pieces, copied, index)
  const doneCount = whole ? (copied.length ? 1 : 0) : pieces.filter((_, index) => pieceDone(index)).length
  const next = pieces.findIndex((_, index) => !pieceDone(index))
  useEffect(() => { onProgress?.(doneCount, pieces.length) }, [onProgress, doneCount, pieces.length])

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

  const copyAll = (
    <button type="button" onClick={() => copy(text, ['all'])} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 font-display text-xs font-bold ${copied.includes('all') ? 'bg-whatsapp text-white' : 'bg-ciruela text-white hover:bg-rosa'}`}>
      {copied.includes('all') ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{whole ? 'Copiar la carta' : 'Todo'}
    </button>
  )
  // Floating messages sit above the work mode's bottom bar.
  const floating = focus ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'

  return (
    <div className={`${hidden ? 'hidden' : ''} ${focus ? '' : 'rounded-2xl border border-line bg-white'}`}>
      {!focus && (
        // Stays at the top while scrolling a long text, so "Copiar siguiente" is always at hand.
        <div className={`flex flex-wrap items-center gap-2 rounded-t-2xl bg-white px-3 py-2 ${open ? 'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-line shadow-[0_8px_16px_-14px_rgba(67,32,44,0.5)]' : 'rounded-b-2xl'}`}>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 flex-1 items-center gap-2 text-left">
            <ChevronDown className={`h-4 w-4 shrink-0 text-piedra transition-transform ${open ? 'rotate-180' : ''}`} />
            <span className="font-display text-sm font-bold text-ciruela">{label}</span>
            {!whole && <span className={`rounded-full px-2 py-0.5 font-display text-[11px] font-bold ${doneCount === pieces.length ? 'bg-whatsapp/15 text-whatsapp' : 'bg-papel text-piedra'}`}>{doneCount}/{pieces.length}</span>}
          </button>
          <div className="flex gap-2">
            {!whole && next >= 0 && (
              <button type="button" onClick={copyNext} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-rosa px-3.5 font-display text-xs font-bold text-white hover:bg-rosa-deep">
                <SkipForward className="h-4 w-4" />{doneCount ? 'Copiar siguiente' : 'Copiar el 1°'}
              </button>
            )}
            {copyAll}
          </div>
        </div>
      )}

      {open && (
        <div className={focus ? '' : 'px-2 py-2 sm:px-3'}>
          {/* How tapping the text works: copy the line, or mark by hand just the part needed. */}
          <div className="flex flex-wrap items-center gap-2 px-1.5 pb-2">
            <div role="radiogroup" aria-label="Al tocar el texto" className="inline-flex rounded-full bg-papel p-0.5">
              {([['tocar', 'Tocar copia el renglón'], ['marcar', 'Seleccionar texto']] as const).map(([id, text]) => (
                <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className={`rounded-full px-3 py-1 font-display text-[11px] font-bold ${mode === id ? 'bg-ciruela text-white' : 'text-piedra'}`}>{text}</button>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-piedra">{mode === 'tocar' ? 'O el botón del bloque para el párrafo entero.' : 'Seleccioná solo la parte que necesites y tocá "Copiar lo seleccionado".'}</p>
          </div>
          <div ref={textRef} className="space-y-1.5">
            {pieces.map((piece, index) => {
              const done = pieceDone(index)
              return (
                <div key={index} ref={(element) => { refs.current[index] = element }} className={`flex scroll-mt-20 items-start gap-2 rounded-xl border p-1.5 transition-colors ${index === next && !whole ? 'border-rosa bg-petalo-wash/40' : done ? 'border-transparent bg-whatsapp/5' : 'border-transparent bg-papel/50'}`}>
                  <div className="min-w-0 flex-1 select-text font-sans text-[15px] leading-relaxed text-ink">
                    {piece.lines.map((line, lineIndex) => !line.trim() ? <span key={lineIndex} className="block h-2" /> : mode === 'marcar' ? (
                      <span key={lineIndex} className={`block cursor-text whitespace-pre-wrap break-words px-1.5 py-0.5 ${!done && copied.includes(`p${index}l${lineIndex}`) ? 'text-whatsapp' : ''}`}>{line}</span>
                    ) : (
                      <span key={lineIndex} role="button" tabIndex={0}
                        onClick={(event) => copy(line.trim(), [`p${index}l${lineIndex}`], event.currentTarget, true)}
                        onKeyDown={(event) => { if (event.key === 'Enter') copy(line.trim(), [`p${index}l${lineIndex}`], event.currentTarget, true) }}
                        className={`block cursor-pointer whitespace-pre-wrap break-words rounded-lg px-1.5 py-0.5 hover:bg-white active:bg-rosa/10 ${!done && copied.includes(`p${index}l${lineIndex}`) ? 'text-whatsapp' : ''}`}>{line}</span>
                    ))}
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
            {!focus && <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-piedra hover:text-ciruela">Cerrar texto</button>}
          </div>
        </div>
      )}

      {/* Work mode: the main buttons at the bottom, where the thumb is. */}
      {focus && (
        <div className="fixed inset-x-0 bottom-0 z-[56] border-t border-line bg-blanco/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            {copyAll}
            {!whole && next >= 0 ? (
              <button type="button" onClick={copyNext} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-rosa px-4 font-display text-sm font-bold text-white hover:bg-rosa-deep">
                <SkipForward className="h-5 w-5" />{doneCount ? `Copiar siguiente (${doneCount + 1} de ${pieces.length})` : 'Copiar el 1° bloque'}
              </button>
            ) : nextStep ? (
              <button type="button" onClick={nextStep.go} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp px-4 font-display text-sm font-bold text-white">
                {nextStep.label}<ArrowRight className="h-5 w-5" />
              </button>
            ) : <span className="flex-1" />}
          </div>
        </div>
      )}

      {marked && !toast && (
        // pointerdown is cancelled so a click with the mouse doesn't erase the selection before copying it.
        <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={copyMarked}
          className={`fixed inset-x-4 ${floating} z-[60] mx-auto flex max-w-md items-center justify-center gap-2 rounded-full bg-rosa px-4 py-3 font-display text-sm font-bold text-white shadow-lg`}>
          <Copy className="h-4 w-4 shrink-0" /><span className="truncate">Copiar lo seleccionado: «{marked.replace(/\s+/g, ' ').trim().slice(0, 30)}{marked.trim().length > 30 ? '…' : ''}»</span>
        </button>
      )}
      {toast && (
        <p role="status" className={`pointer-events-none fixed inset-x-4 ${floating} z-[60] mx-auto max-w-md rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg ${toast.ok ? 'bg-ciruela' : 'bg-rosa-deep'}`}>{toast.text}</p>
      )}
    </div>
  )
}

/** The texts of a task, in order: CV moderno, CV ATS and the letter when there is one. */
function sectionsOf(task: TeamTask) {
  const list: { id: string; label: string; text: string; whole?: boolean }[] = [
    { id: 'moderno', label: 'CV moderno', text: task.cv_modern },
    { id: 'ats', label: 'CV ATS', text: task.cv_ats },
  ]
  if (task.has_letter && task.letter) list.push({ id: 'carta', label: 'Carta', text: task.letter, whole: true })
  return list
}

/**
 * Work mode: one CV at a time, full screen, made to sit next to Canva in split screen (it works narrow).
 * Tabs for each text, the big "Copiar siguiente" at the bottom, and "Empecé"/"Terminé" at the end.
 * Canva can't be shown inside the panel (Canva doesn't allow it), so there is a button to open it.
 */
export function TaskWorkspace({ task, actions, onClose }: { task: TeamTask; actions?: React.ReactNode; onClose: () => void }) {
  const sections = sectionsOf(task)
  const [tab, setTab] = useState(sections[0].id)
  const [progress, setProgress] = useState<Record<string, [number, number]>>({})
  const [tipSeen, setTipSeen] = useStored('acv-split-tip', false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const due = dueLabel(task.due_on)
  const report = useCallback((id: string) => (done: number, total: number) => setProgress((current) => (current[id]?.[0] === done && current[id]?.[1] === total ? current : { ...current, [id]: [done, total] })), [])
  const reporters = useMemo(() => Object.fromEntries(sections.map((section) => [section.id, report(section.id)])), [report, sections.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // The phone's back button closes the work mode instead of leaving the screen.
  useEffect(() => {
    // Going straight to the next CV reuses the same history entry.
    if (!(history.state as { work?: boolean } | null)?.work) history.pushState({ acv: 'overlay', work: true }, '')
    const onPop = () => onClose()
    window.addEventListener('popstate', onPop)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('popstate', onPop); document.body.style.overflow = '' }
  }, [onClose])
  const close = () => { if ((history.state as { work?: boolean } | null)?.work) history.back(); else onClose() }

  function goTo(id: string) {
    setTab(id)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-blanco" role="dialog" aria-modal="true" aria-label={`Armando el CV del pedido ${task.order_number}`}>
      <header className="border-b border-line bg-blanco pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <button type="button" onClick={close} aria-label="Volver" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-papel text-ciruela hover:bg-arena"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">{task.order_number ? `Pedido #${task.order_number}` : 'Ejemplo'}{due ? ` · ${due.text}` : ''}</p>
            <p className="truncate text-[15px] font-bold text-ink">{task.pack_name} · {task.client_name}</p>
          </div>
          <a href="https://www.canva.com/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 font-display text-xs font-bold text-ciruela hover:border-ciruela">Canva<ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
        <div role="tablist" className="mx-auto flex max-w-3xl gap-1.5 overflow-x-auto px-3 pb-2">
          {sections.map((section) => {
            const [done, total] = progress[section.id] ?? [0, 0]
            const complete = total > 0 && done >= total
            return (
              <button key={section.id} type="button" role="tab" aria-selected={tab === section.id} onClick={() => goTo(section.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-sm font-bold ${tab === section.id ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>
                {complete && <Check className="h-4 w-4 text-whatsapp" />}{section.label}{!section.whole && total > 0 && !complete ? <span className="text-xs font-semibold opacity-75">{done}/{total}</span> : null}
              </button>
            )
          })}
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-3 px-3 pb-32 pt-3">
          {!tipSeen && (
            <div className="flex items-start gap-3 rounded-2xl bg-petalo-wash/60 p-3 text-sm text-ink">
              <Columns2 className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">Tené Canva y esta app lado a lado</p>
                <p className="text-xs leading-relaxed text-piedra"><b>iPad:</b> abrí Canva, deslizá desde abajo para ver el Dock y arrastrá esta app hacia un costado. <b>Android:</b> botón de apps recientes → tocá el ícono de esta app → &quot;Pantalla dividida&quot;. Esta pantalla se acomoda angosta.</p>
              </div>
              <button type="button" onClick={() => setTipSeen(true)} aria-label="Entendido" className="rounded-full p-1 text-piedra hover:text-ciruela"><X className="h-4 w-4" /></button>
            </div>
          )}
          {task.notes && <p className="rounded-2xl bg-papel px-3.5 py-2.5 text-sm text-ink"><b>Notas de Vale:</b> {task.notes}</p>}
          {task.has_letter && !task.letter && <p className="px-1 text-xs font-semibold text-rosa-deep">Lleva carta: el texto te lo pasa Vale.</p>}

          {sections.map((section, index) => {
            const following = sections[index + 1]
            return (
              <CopyBlock key={section.id} focus hidden={tab !== section.id} storageKey={`${task.id}-${section.id}`} label={section.label} text={section.text} whole={section.whole}
                onProgress={reporters[section.id]}
                nextStep={following
                  ? { label: `Seguir con ${following.label === 'Carta' ? 'la carta' : `el ${following.label}`}`, go: () => goTo(following.id) }
                  : actions ? { label: 'Listo: marcalo como terminado', go: () => actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } : undefined} />
            )
          })}

          {actions && <div ref={actionsRef} className="rounded-2xl bg-white p-3">{actions}</div>}
          {/* A doubt goes to Vale's WhatsApp with the order already written, so she knows which CV it is. */}
          <a href={whatsappUrl(`Hola Vale, tengo una duda con el CV del pedido #${task.order_number} (${task.pack_name} de ${task.client_name}): `)} target="_blank" rel="noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 font-display text-sm font-bold text-ciruela hover:border-ciruela">
            <MessageCircle className="h-4 w-4 text-whatsapp" />¿Una duda con este CV? Escribile a Vale
          </a>
        </div>
      </div>
    </div>
  )
}

/** How much of a CV was already copied on this device (0 to 1), from what CopyBlock keeps. Updates as it is copied. */
function useTaskProgress(task: TeamTask) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    function read() {
      let done = 0
      let total = 0
      for (const section of sectionsOf(task)) {
        const pieces = piecesOf(section.text, section.whole)
        let copied: string[] = []
        try { copied = JSON.parse(localStorage.getItem(`acv-copied-${task.id}-${section.id}`) ?? '[]') as string[] } catch { /* private mode */ }
        total += pieces.length
        done += section.whole ? (copied.length ? 1 : 0) : pieces.filter((_, index) => isPieceDone(pieces, copied, index)).length
      }
      setProgress(total ? done / total : 0)
    }
    read()
    window.addEventListener('acv-stored', read)
    return () => window.removeEventListener('acv-stored', read)
  }, [task])
  return progress
}

/** Vale's notes and the texts with their copy buttons (for looking at a CV without opening the work mode). */
export function TaskTexts({ task }: { task: TeamTask }) {
  return (
    <div className="space-y-2">
      {task.notes && <p className="rounded-xl bg-papel px-3 py-2 text-sm text-ink"><b>Notas de Vale:</b> {task.notes}</p>}
      <CopyBlock storageKey={`${task.id}-moderno`} label="CV moderno" text={task.cv_modern} />
      <CopyBlock storageKey={`${task.id}-ats`} label="CV ATS" text={task.cv_ats} />
      {task.has_letter && task.letter && <CopyBlock storageKey={`${task.id}-carta`} label="Carta de presentación" text={task.letter} whole />}
      {task.has_letter && !task.letter && <p className="px-1 text-xs font-semibold text-rosa-deep">Lleva carta: el texto te lo pasa Vale.</p>}
    </div>
  )
}

/**
 * One CV in a list, in a single compact line: who, which pack, for when and how much was copied, with one button on the right.
 * The colored edge tells the state at a glance (grey to do, pink in progress, green finished).
 * `onOpen` makes the line open the work mode; otherwise `children` unfold under it.
 */
export function TaskRow({ task, action, onOpen, children }: { task: TeamTask; action?: React.ReactNode; onOpen?: () => void; children?: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const progress = useTaskProgress(task)
  const due = task.status !== 'terminado' ? dueLabel(task.due_on) : null
  const edge = task.status === 'terminado' ? 'bg-whatsapp' : task.status === 'haciendo' ? 'bg-rosa' : 'bg-line'
  const toggle = onOpen ?? (children ? () => setExpanded((value) => !value) : undefined)
  return (
    <li className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-26px_rgba(67,32,44,0.6)]">
      <div className="flex items-stretch">
        <span aria-hidden className={`w-1.5 shrink-0 ${edge}`} />
        <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 pr-2.5">
          <button type="button" onClick={toggle} disabled={!toggle} aria-expanded={children && !onOpen ? expanded : undefined} className="min-w-0 flex-1 text-left">
            <p className="flex items-baseline gap-2">
              <span className="truncate text-[15px] font-bold text-ink">{task.client_name}</span>
              <span className="shrink-0 text-xs text-piedra">{task.order_number ? `#${task.order_number}` : 'Ejemplo'}</span>
              {task.status === 'haciendo' && <span className="shrink-0 font-display text-[11px] font-bold text-rosa-deep">· En curso</span>}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-piedra">
              {due && <span className={`rounded-full px-2 py-px font-display text-[11px] font-bold ${due.urgent ? 'bg-rosa-deep text-white' : 'bg-papel text-ciruela'}`}>{due.text}</span>}
              <span className="truncate">{task.pack_name}{task.has_letter ? ' · con carta' : ''}{task.notes ? ' · 📝 nota' : ''}</span>
            </p>
            {task.status !== 'terminado' && progress > 0 && (
              <span className="mt-1.5 flex items-center gap-2">
                <span className="h-1 w-28 rounded-full bg-papel"><span className="block h-1 rounded-full bg-rosa" style={{ width: `${Math.round(progress * 100)}%` }} /></span>
                <span className="text-[11px] text-piedra">{Math.round(progress * 100)}% copiado</span>
              </span>
            )}
          </button>
          {action}
          {children && !onOpen && <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-piedra transition-transform ${expanded ? 'rotate-180' : ''}`} />}
        </div>
      </div>
      {expanded && children && <div className="border-t border-line px-3 py-3">{children}</div>}
    </li>
  )
}
