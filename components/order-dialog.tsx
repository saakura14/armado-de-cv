'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, MessageCircle, X } from 'lucide-react'
import { TRANSFER, formatARS, whatsappUrl, type Product } from '@/lib/catalog'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { /* the value stays visible to copy by hand */ }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-piedra">{label}</p>
        <p className="break-all font-mono text-sm font-semibold text-ink">{value}</p>
      </div>
      <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ciruela hover:bg-petalo-wash" aria-label={`Copiar ${label}`}>
        {copied ? <Check className="h-3.5 w-3.5 text-whatsapp" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

export function OrderDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [choice, setChoice] = useState(product.choice?.options[0] ?? '')
  const [name, setName] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const groups = product.extras ?? []
  const lines = groups.flatMap((group) => (picked[group.id] ?? []).map((optionId) => {
    const option = group.options.find((item) => item.id === optionId)!
    const detail = optionId === group.otherOptionId && other[group.id]?.trim() ? `: ${other[group.id].trim()}` : ''
    return { key: `${group.id}-${optionId}`, text: `${option.label}${detail}`, price: group.unitPrice }
  }))
  const total = product.price + lines.reduce((sum, line) => sum + line.price, 0)
  const missingOther = groups.some((group) => group.otherOptionId && (picked[group.id] ?? []).includes(group.otherOptionId) && !other[group.id]?.trim())

  const message = [
    '¡Hola! Quiero contratar:',
    `• ${product.name}${product.subtitle ? ` — ${product.subtitle}` : ''} (${formatARS(product.price)})`,
    ...(product.choice && choice ? [`• E-book: ${choice}`] : []),
    ...lines.map((line) => `• Extra: ${line.text} (+${formatARS(line.price)})`),
    `Total: ${formatARS(total)}`,
    ...(name.trim() ? [`Mi nombre: ${name.trim()}`] : []),
    '¿Cómo seguimos?',
  ].join('\n')

  function toggle(groupId: string, optionId: string) {
    setPicked((current) => {
      const list = current[groupId] ?? []
      return { ...current, [groupId]: list.includes(optionId) ? list.filter((item) => item !== optionId) : [...list, optionId] }
    })
  }

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
                <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${choice === option ? 'border-rosa bg-petalo-wash' : 'border-line bg-white'}`}>
                  <input type="radio" name="choice" value={option} checked={choice === option} onChange={() => setChoice(option)} className="accent-rosa" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {groups.map((group) => (
          <fieldset key={group.id} className="mt-5">
            <legend className="flex w-full justify-between gap-2 text-sm font-semibold text-ciruela"><span>{group.label}</span><span className="shrink-0 text-piedra">+{formatARS(group.unitPrice)}{group.options.length > 1 ? ' c/u' : ''}</span></legend>
            {group.hint && <p className="mt-0.5 text-xs text-piedra">{group.hint}</p>}
            <div className={`mt-2 grid gap-2 ${group.options.length > 2 ? 'grid-cols-2' : ''}`}>
              {group.options.map((option) => {
                const checked = (picked[group.id] ?? []).includes(option.id)
                return (
                  <label key={option.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${checked ? 'border-rosa bg-petalo-wash' : 'border-line bg-white'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(group.id, option.id)} className="accent-rosa" />
                    {option.label}
                  </label>
                )
              })}
            </div>
            {group.otherOptionId && (picked[group.id] ?? []).includes(group.otherOptionId) && (
              <input value={other[group.id] ?? ''} onChange={(event) => setOther((current) => ({ ...current, [group.id]: event.target.value }))} placeholder={group.id === 'idiomas' ? '¿Qué idioma?' : '¿Qué plataforma?'} aria-label={group.id === 'idiomas' ? 'Otro idioma' : 'Otra plataforma'} className="mt-2 w-full rounded-xl border border-rosa bg-white px-3 py-2.5 text-sm outline-none" />
            )}
          </fieldset>
        ))}

        <div className="mt-5 rounded-2xl border border-line bg-papel p-4">
          <p className="text-sm font-semibold text-ciruela">Pagás por transferencia</p>
          <p className="mt-0.5 text-xs text-piedra">Transferí el total y mandame el comprobante por WhatsApp.</p>
          <div className="mt-3 space-y-2">
            <CopyField label="Alias" value={TRANSFER.alias} />
            <CopyField label="CBU / CVU" value={TRANSFER.cbu} />
            <p className="px-1 text-xs text-piedra">Titular: <span className="font-semibold text-ink">{TRANSFER.holder}</span></p>
          </div>
        </div>

        {product.notes && <ul className="mt-4 space-y-1 text-xs text-piedra">{product.notes.map((note) => <li key={note}>· {note}</li>)}</ul>}

        <label className="mt-5 block text-sm font-semibold text-ciruela" htmlFor="order-name">Tu nombre (opcional)
          <input id="order-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Para saber a quién le respondo" className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-rosa" />
        </label>

        </div>

        {/* Sticky footer: total and CTA always within thumb reach */}
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {missingOther && <p role="alert" className="mb-2 text-xs font-semibold text-rosa-deep">Contame qué idioma o plataforma necesitás en el campo de arriba.</p>}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-piedra">Total</p>
              <p className="font-display text-xl font-extrabold text-ciruela">{formatARS(total)}</p>
            </div>
            <a href={missingOther ? undefined : whatsappUrl(message)} aria-disabled={missingOther} target="_blank" rel="noreferrer" className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp px-4 py-3 font-display text-sm font-bold text-white shadow-lg transition-transform ${missingOther ? 'pointer-events-none opacity-50' : 'hover:scale-[1.01] active:scale-[0.99]'}`}>
              <MessageCircle className="h-5 w-5" />Enviar pedido
            </a>
          </div>
          <p className="mt-2 text-center text-[11px] text-piedra">Se abre WhatsApp con tu pedido ya escrito.</p>
        </div>
      </div>
    </div>
  )
}
