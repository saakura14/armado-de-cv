'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MessageCircle, X } from 'lucide-react'
import { formatARS, whatsappUrl, type Product } from '@/lib/catalog'
import { savePending } from '@/lib/cart'

export function OrderDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const router = useRouter()
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [choice, setChoice] = useState(product.choice?.options[0]?.id ?? '')
  const closeButton = useRef<HTMLButtonElement>(null)

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
  const lines = selected.map(({ group, option, detail }) => ({ text: `${option.label}${detail ? `: ${detail}` : ''}`, price: group.unitPrice }))
  const total = product.price + lines.reduce((sum, line) => sum + line.price, 0)
  const missingOther = selected.some(({ option, detail }) => option.isOther && !detail)
  const choiceLabel = product.choice?.options.find((option) => option.id === choice)?.label
  const unavailable = Boolean(product.choice && !choiceLabel)

  function toggle(groupId: string, optionId: string) {
    setPicked((current) => {
      const list = current[groupId] ?? []
      return { ...current, [groupId]: list.includes(optionId) ? list.filter((item) => item !== optionId) : [...list, optionId] }
    })
  }

  function checkout() {
    savePending({
      item: { product_id: product.id, ebook_id: product.choice ? choice : null, extras: selected.map(({ group, option, detail }) => ({ group_id: group.id, option_id: option.id, detail })) },
      productName: product.name,
      subtitle: choiceLabel ?? product.subtitle,
      delivery: product.delivery,
      lines,
      total,
      notes: product.notes,
    })
    document.body.style.overflow = ''
    router.push('/comprar')
  }

  const question = `¡Hola! Tengo una consulta sobre ${product.name}${product.subtitle ? ` (${product.subtitle})` : ''}.`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/50 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-blanco shadow-2xl sm:max-w-lg sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="overflow-y-auto overscroll-contain p-5 sm:p-7">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Tu pedido</p>
              <h2 id="order-title" className="mt-1 font-script text-4xl font-normal leading-none text-rosa">{product.name}</h2>
              {product.subtitle && <p className="text-sm text-piedra">{product.subtitle}</p>}
            </div>
            <button ref={closeButton} type="button" onClick={onClose} className="rounded-full p-2 text-piedra hover:bg-arena" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>

          {product.choice && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-ciruela">{product.choice.label}</legend>
              <div className="mt-2 space-y-2">
                {product.choice.options.map((option) => (
                  <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm ${choice === option.id ? 'border-rosa bg-petalo-wash' : 'border-line bg-white'}`}>
                    <input type="radio" name="choice" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} className="accent-rosa" />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {groups.map((group) => {
            const otherOption = group.options.find((option) => option.isOther)
            return (
              <fieldset key={group.id} className="mt-5">
                <legend className="flex w-full justify-between gap-2 text-sm font-semibold text-ciruela"><span>{group.label}</span><span className="shrink-0 text-piedra">+{formatARS(group.unitPrice)}{group.options.length > 1 ? ' c/u' : ''}</span></legend>
                {group.hint && <p className="mt-0.5 text-xs text-piedra">{group.hint}</p>}
                <div className={`mt-2 grid gap-2 ${group.options.length > 2 ? 'grid-cols-2' : ''}`}>
                  {group.options.map((option) => {
                    const checked = (picked[group.id] ?? []).includes(option.id)
                    return (
                      <label key={option.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-sm ${checked ? 'border-rosa bg-petalo-wash' : 'border-line bg-white'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(group.id, option.id)} className="accent-rosa" />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
                {otherOption && (picked[group.id] ?? []).includes(otherOption.id) && (
                  <input value={other[group.id] ?? ''} onChange={(event) => setOther((current) => ({ ...current, [group.id]: event.target.value }))} placeholder="¿Cuál necesitás?" aria-label={otherOption.label} className="mt-2 w-full rounded-xl border border-rosa bg-white px-3 py-2.5 text-base outline-none" />
                )}
              </fieldset>
            )
          })}

          {product.notes.length > 0 && (
            <div className="mt-5 rounded-2xl bg-papel p-4">
              <p className="text-sm font-semibold text-ciruela">Antes de comprar</p>
              <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-ink">{product.notes.map((note) => <li key={note} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rosa" aria-hidden="true" />{note}</li>)}</ul>
            </div>
          )}

          <a href={whatsappUrl(question)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-whatsapp hover:underline"><MessageCircle className="h-4 w-4" />¿Tenés dudas? Consultame antes de comprar</a>
        </div>

        {/* Sticky footer: total and CTA always within thumb reach */}
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {missingOther && <p role="alert" className="mb-2 text-xs font-semibold text-rosa-deep">Contame cuál necesitás en el campo de arriba.</p>}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Total</p>
              <p className="font-display text-xl font-extrabold text-ciruela">{formatARS(total)}</p>
            </div>
            <button type="button" onClick={checkout} disabled={missingOther || unavailable} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ciruela px-4 py-3 font-display text-sm font-bold text-white shadow-lg transition-colors hover:bg-rosa disabled:pointer-events-none disabled:opacity-50">
              Continuar compra<ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-piedra">Pagás por transferencia. Te muestro los datos en el siguiente paso.</p>
        </div>
      </div>
    </div>
  )
}
