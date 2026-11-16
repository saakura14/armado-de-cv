'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Palette, X } from 'lucide-react'
import type { Order, OrderItem } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { ATS_ONLY_PACKS, PACKS_WITH_LETTER } from '@/lib/team'
import { Button, Field, inputClass, useBackdropClose, useFlash } from './ui'

/** "Armarlo yo": the CV built in Canva by the scheduled Claude task on Vale's computer, with the client's own link. */
export type BuildState = { order_item_id: string; status: 'pedido' | 'armando' | 'listo' | 'error'; edit_url: string | null; error: string | null }

const BUILD_STATE: Record<BuildState['status'], { label: string; tone: string }> = {
  pedido: { label: 'Esperando a Claude', tone: 'bg-papel text-ciruela' },
  armando: { label: 'Armando en Canva…', tone: 'bg-petalo-wash text-rosa-deep' },
  listo: { label: 'Abrir en Canva', tone: 'bg-whatsapp/15 text-whatsapp' },
  error: { label: 'No se pudo armar', tone: 'bg-petalo-wash text-rosa-deep' },
}

const PAGE_LABEL: Record<string, string> = { moderno: 'CV moderno', ats: 'CV ATS', carta: 'carta' }

/** The Spanish pages the pack takes, and the languages that add their own CV pages after them. */
export function buildPages(item: OrderItem, hasLetter: boolean) {
  const pages = ATS_ONLY_PACKS.includes(item.product_id) ? ['ats'] : hasLetter ? ['moderno', 'ats', 'carta'] : ['moderno', 'ats']
  const languages = item.extras.filter((extra) => extra.group_id === 'idiomas' && extra.option_id !== 'espanol').map((extra) => extra.detail?.trim() || extra.label)
  return { pages, languages }
}

/** The texts come from what she sent the team (if it's assigned) or from Claude's texts; she can still change them. */
export function BuildDialog({ order, item, clientName, onClose, onSaved }: { order: Order; item: OrderItem; clientName: string; onClose: () => void; onSaved: () => void }) {
  const backdrop = useBackdropClose(onClose)
  const atsOnly = ATS_ONLY_PACKS.includes(item.product_id)
  const [gender, setGender] = useState<'mujer' | 'hombre' | ''>('')
  const [modern, setModern] = useState('')
  const [ats, setAts] = useState('')
  const [letter, setLetter] = useState('')
  const [hasLetter, setHasLetter] = useState(!atsOnly && PACKS_WITH_LETTER.includes(item.product_id))
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState<'equipo' | 'claude' | 'nada' | null>(null)
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  useEffect(() => {
    Promise.all([
      supabase.from('cv_builds').select('gender, cv_modern, cv_ats, letter, notes').eq('order_item_id', item.id).maybeSingle(),
      supabase.from('team_tasks').select('cv_modern, cv_ats, letter, has_letter, notes').eq('order_item_id', item.id).maybeSingle(),
      supabase.from('cv_drafts').select('status, cv_modern, cv_ats, letter, has_letter').eq('order_item_id', item.id).maybeSingle(),
    ]).then(([build, task, draft]) => {
      const previous = build.data as { gender: 'mujer' | 'hombre'; cv_modern: string; cv_ats: string; letter: string | null; notes: string | null } | null
      const sent = task.data as { cv_modern: string; cv_ats: string; letter: string | null; has_letter: boolean; notes: string | null } | null
      const claude = draft.data as { status: string; cv_modern: string | null; cv_ats: string | null; letter: string | null; has_letter: boolean } | null
      const texts = previous ?? sent ?? (claude?.status === 'listo' ? claude : null)
      if (previous) setGender(previous.gender)
      if (texts) {
        setModern(texts.cv_modern ?? '')
        setAts(texts.cv_ats ?? '')
        setLetter(texts.letter ?? '')
        if (!atsOnly) setHasLetter(Boolean(texts.letter) || (sent?.has_letter ?? claude?.has_letter ?? hasLetter))
      }
      setNotes(previous?.notes ?? sent?.notes ?? '')
      setSource(previous || sent ? 'equipo' : texts ? 'claude' : 'nada')
    })
    // Only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const { pages, languages } = buildPages(item, hasLetter)
  const total = pages.length + languages.length * pages.filter((page) => page !== 'carta').length
  const ready = gender && ats.trim() && (atsOnly || modern.trim()) && (!hasLetter || letter.trim())

  async function save() {
    if (!gender) return
    setBusy(true)
    const { error } = await supabase.from('cv_builds').upsert({
      order_item_id: item.id, order_id: order.id, client_name: clientName, gender, pages, languages,
      cv_modern: atsOnly ? '' : modern.trim(), cv_ats: ats.trim(), letter: hasLetter ? letter.trim() : null, notes: notes.trim() || null,
      status: 'pedido', design_id: null, edit_url: null, error: null, requested_at: new Date().toISOString(), built_at: null,
    })
    setBusy(false)
    if (error) { flash.show('error', errorMessage(error)); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="build-title" {...backdrop}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="build-title" className="flex items-center gap-2 font-display text-lg font-bold"><Palette className="h-5 w-5" />Armarlo yo en Canva</p>
            <p className="text-sm text-white/85">Pedido #{order.number} · {item.product_name} de {clientName}. Claude copia tu plantilla, la nombra &quot;Cv - &quot; con el nombre completo del CV y pone estos textos.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {source === 'nada' && <p className="rounded-2xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep">Todavía no hay textos para este pack: pedíselos a Claude con <b>Textos con Claude</b> o pegalos acá.</p>}
          <div>
            <p className="text-sm font-semibold text-ink">Plantilla</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(['mujer', 'hombre'] as const).map((option) => (
                <button key={option} type="button" onClick={() => setGender(option)} aria-pressed={gender === option}
                  className={`min-h-11 rounded-2xl border px-4 font-display text-sm font-bold capitalize ${gender === option ? 'border-ciruela bg-ciruela text-white' : 'border-line bg-white text-ciruela hover:border-ciruela'}`}>
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-piedra">
              {total} {total === 1 ? 'página' : 'páginas'}: {pages.map((page) => PAGE_LABEL[page]).join(' + ')}
              {languages.length > 0 && <> en español, y {pages.filter((page) => page !== 'carta').map((page) => PAGE_LABEL[page]).join(' + ')} en {languages.join(', ')}</>}.
            </p>
          </div>
          {!atsOnly && <Field label="CV moderno"><textarea value={modern} onChange={(event) => setModern(event.target.value)} rows={8} className={inputClass} /></Field>}
          <Field label="CV ATS"><textarea value={ats} onChange={(event) => setAts(event.target.value)} rows={8} className={inputClass} /></Field>
          {!atsOnly && <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={hasLetter} onChange={(event) => setHasLetter(event.target.checked)} className="accent-rosa" />Lleva carta de presentación</label>}
          {!atsOnly && hasLetter && <Field label="Carta de presentación"><textarea value={letter} onChange={(event) => setLetter(event.target.value)} rows={6} className={inputClass} /></Field>}
          <Field label="Notas para Claude (opcional)"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ej.: sin foto, que el título diga Administrativa contable" className={inputClass} /></Field>
          <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-ink">Cuando esté, te llega un aviso y aparece <b>Abrir en Canva</b> en el pedido. Revisalo, poné la foto del cliente y descargalo como siempre.</p>
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          <Button busy={busy} disabled={!ready} onClick={save} className="w-full"><Palette className="h-4 w-4" />Armar en Canva</Button>
          {!gender && <p className="mt-1.5 text-center text-xs text-piedra">Elegí la plantilla de mujer o de hombre.</p>}
        </div>
      </div>
    </div>
  )
}

/** On each CV pack: the button, or where the Canva build is (and the client's link once it's done). */
export function BuildButton({ build, onOpen }: { build: BuildState | undefined; onOpen: () => void }) {
  if (build?.status === 'listo' && build.edit_url) {
    return (
      <span className="inline-flex items-center gap-1">
        <a href={build.edit_url} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 font-display text-xs font-bold ${BUILD_STATE.listo.tone}`}><ExternalLink className="h-3.5 w-3.5" />Abrir en Canva</a>
        <button type="button" onClick={onOpen} className="inline-flex min-h-8 items-center rounded-full border border-line px-2.5 font-display text-xs font-bold text-ciruela hover:bg-papel" title="Volver a armarlo con otros textos">Rehacer</button>
      </span>
    )
  }
  return (
    <button type="button" onClick={onOpen} title={build?.status === 'error' ? build.error ?? undefined : undefined}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 font-display text-xs font-bold ${build ? BUILD_STATE[build.status].tone : 'border border-line text-ciruela hover:bg-papel'}`}>
      {build ? BUILD_STATE[build.status].label : <><Palette className="h-3.5 w-3.5 text-rosa" />Armarlo yo</>}
    </button>
  )
}
