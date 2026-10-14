'use client'

import { useEffect, useState } from 'react'

/** A character that cheers someone up: its colors, an original drawing and phrases built from their numbers. */
export type Character<Mood> = {
  name: string; card: string; accent: string; bar: string; chip: string; bubble: string
  /** Optional texture over the background (scanlines, sparkles...). */
  overlay?: string
  figure: React.ReactNode
  lines: (mood: Mood) => string[]
}

/**
 * The cheering card shared by Gustavo's panel and Vale's: pick a character (remembered on this device), a phrase that
 * changes every few seconds or when the character is tapped and, optionally, one number with a progress bar. Colors are
 * fixed so the card looks the same in light and dark.
 */
export function CheerCard<Id extends string, Mood>({ characters, storageKey, mood, meter }: {
  characters: Record<Id, Character<Mood>>; storageKey: string; mood: Mood
  meter?: { label: string; value: string; side: React.ReactNode; progress: number; progressLabel: string }
}) {
  const ids = Object.keys(characters) as Id[]
  const [id, setId] = useState<Id>(ids[0])
  const [line, setLine] = useState(0)
  useEffect(() => { try { const saved = localStorage.getItem(storageKey); if (saved && saved in characters) setId(saved as Id) } catch { /* private mode */ } }, [storageKey, characters])
  useEffect(() => { const timer = window.setInterval(() => setLine((current) => current + 1), 8000); return () => window.clearInterval(timer) }, [])
  function pick(next: Id) { setId(next); setLine(0); try { localStorage.setItem(storageKey, next) } catch { /* private mode */ } }

  const look = characters[id]
  const lines = look.lines(mood)
  const share = meter ? Math.min(Math.max(meter.progress, 0), 1) : 0

  return (
    <section className={`relative overflow-hidden rounded-3xl p-4 text-white shadow-[0_18px_40px_-24px_rgba(20,10,31,0.9)] ${look.card}`} aria-label="Ánimo">
      {look.overlay && <div className={`pointer-events-none absolute inset-0 ${look.overlay}`} />}
      <div className="relative flex items-end gap-2">
        {/* Tapping the character brings the next phrase. */}
        <button type="button" onClick={() => setLine((current) => current + 1)} aria-label="Otra frase" className="h-32 w-24 shrink-0 transition-transform active:scale-95">
          {look.figure}
        </button>
        <p key={`${id}-${line}`} className={`relative mb-6 flex-1 animate-[goal-in_0.5s_ease-out] rounded-2xl rounded-bl-sm px-3 py-2.5 text-sm font-bold leading-snug shadow-lg ${look.bubble}`}>
          {lines[line % lines.length]}
        </p>
      </div>

      {meter && (
        <div className="relative mt-1">
          <div className="flex items-baseline justify-between gap-2 text-xs text-white/75">
            <span>{meter.label} <b className={`font-display text-base ${look.accent}`}>{meter.value}</b></span>
            <span>{meter.side}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={meter.progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
            <div className={`relative h-full rounded-full transition-[width] duration-1000 ${look.bar}`} style={{ width: `${share * 100}%` }}>
              <span className="absolute inset-0 animate-[goal-shine_2.4s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] bg-[length:50%_100%] bg-no-repeat motion-reduce:hidden" />
            </div>
          </div>
        </div>
      )}

      <div role="radiogroup" aria-label="Personaje" className="relative mt-3 flex flex-wrap gap-1.5">
        {ids.map((key) => (
          <button key={key} type="button" role="radio" aria-checked={id === key} onClick={() => pick(key)} className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${id === key ? look.chip : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>{characters[key].name}</button>
        ))}
      </div>
    </section>
  )
}
