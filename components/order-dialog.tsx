'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Plus, Sparkles, Video, X, Zap } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { formatARS, whatsappUrl, type ExtraGroup, type Product } from '@/lib/catalog'
import { savePending } from '@/lib/cart'
import { track } from '@/lib/pixel'

// Short codes read well everywhere (flag emojis render as letters on Windows).
const LANGUAGE_CODE: Record<string, string> = { ingles: 'EN', italiano: 'IT', portugues: 'PT', frances: 'FR', espanol: 'ES', aleman: 'DE', 'otro-idioma': '+' }

/** Counts smoothly from the previous value to the new one. */
function useAnimatedNumber(value: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), initial = from.current, delta = value - initial
    if (delta === 0) return
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 350)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(Math.round(initial + delta * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); from.current = value }
  }, [value])
  return shown
}

function groupIcon(group: ExtraGroup) {
  if (group.id === 'express') return <Zap className="h-5 w-5" />
  if (group.options.some((option) => /meet/i.test(option.label))) return <Video className="h-5 w-5" />
  return <Plus className="h-5 w-5" />
}

export function OrderDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const router = useRouter()
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [choice, setChoice] = useState(product.choice?.options[0]?.id ?? '')
  const [pulse, setPulse] = useState(0)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => { track('ViewContent', { content_name: product.name, content_ids: [product.id], value: product.price, currency: 'ARS' }) }, [product])

  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const groups = product.extras
  const selected = groups.flatMap((group) => (picked[group.id] ?? []).flatMap((optionId) => {
    const option = group.options.find((item) => item.id === optionId)
    if (!option) return []
    const detail = option.isOther ? other[group.id]?.trim() || null : null
    return [{ group, option, detail }]
  }))
  const lines = selected.map(({ group, option, detail }) => ({ key: `${group.id}-${option.id}`, groupId: group.id, optionId: option.id, text: `${option.label}${detail ? `: ${detail}` : ''}`, price: group.unitPrice }))
  const total = product.price + lines.reduce((sum, line) => sum + line.price, 0)
  const shownTotal = useAnimatedNumber(total)
  const missingOther = selected.some(({ option, detail }) => option.isOther && !detail)
  const choiceLabel = product.choice?.options.find((option) => option.id === choice)?.label
  const unavailable = Boolean(product.choice && !choiceLabel)

  function toggle(groupId: string, optionId: string) {
    setPicked((current) => {
      const list = current[groupId] ?? []
      return { ...current, [groupId]: list.includes(optionId) ? list.filter((item) => item !== optionId) : [...list, optionId] }
    })
    setPulse((value) => value + 1)
  }

  function checkout() {
    savePending({
      item: { product_id: product.id, ebook_id: product.choice ? choice : null, extras: selected.map(({ group, option, detail }) => ({ group_id: group.id, option_id: option.id, detail })) },
      productName: product.name,
      subtitle: choiceLabel ?? product.subtitle,
      delivery: product.delivery,
      lines: lines.map(({ text, price }) => ({ text, price })),
      total,
      notes: product.notes,
    })
    document.body.style.overflow = ''
    router.push('/comprar')
  }

  const question = `¡Hola! Tengo una consulta sobre ${product.name}${product.subtitle ? ` (${product.subtitle})` : ''}.`

  return (
    <div className="fixed inset-0 z-50 flex animate-[fade_.2s_ease-out] items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full animate-[sheet_.28s_cubic-bezier(.2,.9,.3,1.1)] flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-ciruela to-[#5c2c3c] px-5 pb-5 pt-4 text-white sm:px-7 sm:pt-6">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-petalo"><Sparkles className="h-3.5 w-3.5" />Armá tu pedido</p>
              <h2 id="order-title" className="mt-1 font-script text-[40px] font-normal leading-none text-white">{product.name}</h2>
              {product.subtitle && <p className="mt-1 text-sm text-white/75">{product.subtitle}</p>}
            </div>
            <button ref={closeButton} type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
          <ul className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {product.features.slice(0, 3).map((feature) => <li key={feature} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white/90"><Check className="h-3 w-3 text-petalo" />{feature}</li>)}
          </ul>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {product.choice && (
            <fieldset>
              <legend className="font-display text-sm font-bold text-ciruela">{product.choice.label}</legend>
              <div className="mt-3 grid gap-2">
                {product.choice.options.map((option) => {
                  const active = choice === option.id
                  return (
                    <button key={option.id} type="button" onClick={() => setChoice(option.id)} aria-pressed={active} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm transition-all duration-200 ${active ? 'scale-[1.01] border-rosa bg-petalo-wash shadow-sm' : 'border-line bg-white hover:border-petalo'}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${active ? 'border-rosa bg-rosa' : 'border-line'}`}>{active && <Check className="h-3 w-3 text-white" />}</span>
                      <span className="font-semibold text-ink">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {groups.map((group) => {
            const list = picked[group.id] ?? []
            const otherOption = group.options.find((option) => option.isOther)

            // Single-option groups (Express, Meet) are a switch card.
            if (group.options.length === 1) {
              const option = group.options[0]
              const on = list.includes(option.id)
              return (
                <button key={group.id} type="button" role="switch" aria-checked={on} onClick={() => toggle(group.id, option.id)} className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${on ? 'border-rosa bg-petalo-wash' : 'border-line bg-white hover:border-petalo'}`}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-rosa text-white' : 'bg-arena text-ciruela'}`}>{groupIcon(group)}</span>
                  <span className="flex-1">
                    <span className="block font-display text-sm font-bold text-ciruela">{option.label}</span>
                    {group.hint && <span className="mt-0.5 block text-xs leading-snug text-piedra">{group.hint}</span>}
                    <span className="mt-1 block text-xs font-bold text-rosa-deep">+{formatARS(group.unitPrice)}</span>
                  </span>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-rosa' : 'bg-line'}`} aria-hidden="true">
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${on ? 'left-6' : 'left-1'}`} />
                  </span>
                </button>
              )
            }

            return (
              <fieldset key={group.id}>
                <legend className="flex w-full items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-bold text-ciruela">{group.label}</span>
                  <span className="shrink-0 text-xs font-semibold text-piedra">+{formatARS(group.unitPrice)} c/u{list.length > 0 && <span className="ml-1.5 rounded-full bg-rosa px-2 py-0.5 text-white">{list.length}</span>}</span>
                </legend>
                {group.hint && <p className="mt-0.5 text-xs text-piedra">{group.hint}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const on = list.includes(option.id)
                    const code = group.id === 'idiomas' ? LANGUAGE_CODE[option.id] : null
                    return (
                      <button key={option.id} type="button" aria-pressed={on} onClick={() => toggle(group.id, option.id)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-all duration-200 active:scale-95 ${on ? 'border-rosa bg-rosa text-white shadow-md shadow-rosa/25' : 'border-line bg-white text-ink hover:border-petalo'}`}>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-[10px] font-bold transition-colors ${on ? 'bg-white/20 text-white' : 'bg-arena text-ciruela'}`}>
                          {on ? <Check className="h-4 w-4" /> : code ?? <Plus className="h-3.5 w-3.5" />}
                        </span>
                        {option.label}
                      </button>
                    )
                  })}
                </div>
                {otherOption && list.includes(otherOption.id) && (
                  <input value={other[group.id] ?? ''} onChange={(event) => setOther((current) => ({ ...current, [group.id]: event.target.value }))} placeholder="¿Cuál necesitás?" aria-label={otherOption.label} autoFocus className="mt-3 w-full rounded-xl border-2 border-rosa bg-white px-4 py-2.5 text-base outline-none" />
                )}
              </fieldset>
            )
          })}

          {/* Summary */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="font-display text-xs font-bold uppercase tracking-[0.15em] text-piedra">Tu pedido</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex justify-between gap-3"><span className="font-semibold text-ink">{product.name}{choiceLabel ? ` · ${choiceLabel}` : ''}</span><span className="shrink-0 font-semibold">{formatARS(product.price)}</span></li>
              {lines.map((line) => (
                <li key={line.key} className="flex animate-[fade_.25s_ease-out] items-center justify-between gap-3 text-piedra">
                  <span className="flex items-center gap-1.5"><button type="button" onClick={() => toggle(line.groupId, line.optionId)} className="rounded-full p-0.5 hover:bg-petalo-wash hover:text-rosa-deep" aria-label={`Quitar ${line.text}`}><X className="h-3.5 w-3.5" /></button>{line.text}</span>
                  <span className="shrink-0">+{formatARS(line.price)}</span>
                </li>
              ))}
            </ul>
          </div>

          {product.notes.length > 0 && (
            <details className="group rounded-2xl bg-papel p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm font-bold text-ciruela">Antes de comprar<span className="text-lg text-rosa transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink">{product.notes.map((note) => <li key={note} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rosa" aria-hidden="true" />{note}</li>)}</ul>
            </details>
          )}

          <a href={whatsappUrl(question)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-whatsapp hover:underline"><WhatsAppIcon className="h-4 w-4" />¿Tenés dudas? Consultame antes de comprar</a>
        </div>

        {/* Sticky footer: total and CTA always within thumb reach */}
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {missingOther && <p role="alert" className="mb-2 text-xs font-semibold text-rosa-deep">Contame cuál necesitás en el campo de arriba.</p>}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Total</p>
              <p key={pulse} className="animate-[pop_.3s_ease-out] font-display text-2xl font-extrabold tabular-nums text-ciruela" aria-live="polite">{formatARS(shownTotal)}</p>
            </div>
            <button type="button" onClick={checkout} disabled={missingOther || unavailable} className="group flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-rosa px-4 py-3 font-display text-sm font-bold text-white shadow-lg shadow-rosa/30 transition-all hover:bg-rosa-deep disabled:pointer-events-none disabled:opacity-50">
              Continuar compra<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-piedra">Pagás por transferencia. Te muestro los datos en el siguiente paso.</p>
        </div>
      </div>
    </div>
  )
}
