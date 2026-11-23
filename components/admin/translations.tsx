'use client'

import type { OrderItem } from '@/lib/orders'
import type { Translation } from '@/lib/team'
import { Field, inputClass } from './ui'

/** The languages a pack takes besides Spanish (the "idiomas" extra; "Otro idioma" comes with the client's detail). */
export function itemLanguages(item: OrderItem) {
  return item.extras.filter((extra) => extra.group_id === 'idiomas' && extra.option_id !== 'espanol').map((extra) => extra.detail?.trim() || extra.label)
}

/** One version per language the pack takes, with what is already written for it (from Claude, the team task or a build). */
export function withLanguages(languages: string[], saved: Translation[] | null | undefined): Translation[] {
  const list = saved ?? []
  return languages.map((language) => list.find((row) => row.language.toLowerCase() === language.toLowerCase()) ?? { language, cv_modern: '', cv_ats: '' })
}

/** Only the versions with something written, trimmed, to save. */
export const cleanTranslations = (list: Translation[], atsOnly: boolean) =>
  list.map((row) => ({ language: row.language, cv_modern: atsOnly ? '' : row.cv_modern.trim(), cv_ats: row.cv_ats.trim() })).filter((row) => row.cv_ats || row.cv_modern)

/** A language version still missing a text (the ATS one, or the modern one when the pack has it). */
export const missingTranslation = (list: Translation[], atsOnly: boolean) => list.find((row) => !row.cv_ats.trim() || (!atsOnly && !row.cv_modern.trim()))

/**
 * The same CV in each language the client asked for, to review and fix by hand: the modern one (unless the pack is ATS
 * only) and the ATS one. Never the letter: the language pages are CV pages only.
 */
export function TranslationFields({ list, atsOnly, rows = 10, onChange, empty }: { list: Translation[]; atsOnly: boolean; rows?: number; onChange: (next: Translation[]) => void; empty?: string }) {
  if (!list.length) return null
  const set = (index: number, key: 'cv_modern' | 'cv_ats', value: string) => onChange(list.map((row, at) => (at === index ? { ...row, [key]: value } : row)))
  return (
    <div className="space-y-3 rounded-2xl border border-ciruela/20 bg-papel/50 p-3">
      <p className="text-sm text-ink"><b>🌎 Versión en {list.map((row) => row.language).join(', ')}:</b> el mismo CV traducido, con los títulos de las secciones también traducidos. Va en páginas aparte, sin carta.</p>
      {empty && list.some((row) => !row.cv_ats.trim()) && <p className="text-xs font-semibold text-rosa-deep">{empty}</p>}
      {list.map((row, index) => (
        <div key={row.language} className="space-y-3">
          {!atsOnly && <Field label={`CV moderno en ${row.language}`}><textarea value={row.cv_modern} onChange={(event) => set(index, 'cv_modern', event.target.value)} rows={rows} className={inputClass} /></Field>}
          <Field label={`CV ATS en ${row.language}`}><textarea value={row.cv_ats} onChange={(event) => set(index, 'cv_ats', event.target.value)} rows={rows} className={inputClass} /></Field>
        </div>
      ))}
    </div>
  )
}
