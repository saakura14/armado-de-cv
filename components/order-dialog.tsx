'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone">{label}</p>
        <p className="break-all font-mono text-sm font-semibold text-ink">{value}</p>
      </div>
      <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-plum hover:bg-rose-wash" aria-label={`Copiar ${label}`}>
        {copied ? <Check className="h-3.5 w-3.5 text-whatsapp" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

export function OrderDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [extras, setExtras] = useState<string[]>([])
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

  const selected = (product.extras ?? []).filter((extra) => extras.includes(extra.id))
  const total = product.price + selected.reduce((sum, extra) => sum + (extra.price ?? 0), 0)
  const hasQuote = selected.some((extra) => extra.price === null)

  const message = useMemo(() => {
    const lines = [
      '¡Hola! Quiero contratar:',
      `• ${product.name}${product.subtitle ? ` — ${product.subtitle}` : ''} (${formatARS(product.price)})`,
    ]
    if (product.choice && choice) lines.push(`• ${product.choice.label.replace('¿', '').replace('?', '')}: ${choice}`)
    for (const extra of selected) lines.push(`• Extra: ${extra.label}${extra.price === null ? ' (quiero consultar el precio)' : ` (+${formatARS(extra.price)})`}`)
    lines.push(`Total: ${formatARS(total)}${hasQuote ? ' + versión en inglés a consultar' : ''}`)
    if (name.trim()) lines.push(`Mi nombre: ${name.trim()}`)
    lines.push('¿Cómo seguimos?')
    return lines.join('\n')
  }, [product, choice, selected, total, hasQuote, name])

  function toggle(id: string) {
    setExtras((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/50 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={onClose}>
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose">Tu pedido</p>
            <h2 id="order-title" className="mt-1 text-2xl font-bold text-plum">{product.name}</h2>
            {product.subtitle && <p className="text-sm text-stone">{product.subtitle}</p>}
          </div>
          <button ref={closeButton} type="button" onClick={onClose} className="rounded-full p-2 text-stone hover:bg-sand" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        {product.choice && (
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-plum">{product.choice.label}</legend>
            <div className="mt-2 space-y-2">
              {product.choice.options.map((option) => (
                <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${choice === option ? 'border-rose bg-rose-wash' : 'border-line bg-white'}`}>
                  <input type="radio" name="choice" value={option} checked={choice === option} onChange={() => setChoice(option)} className="accent-rose" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {product.extras && (
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-plum">Sumá extras (opcional)</legend>
            <div className="mt-2 space-y-2">
              {product.extras.map((extra) => (
                <label key={extra.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${extras.includes(extra.id) ? 'border-rose bg-rose-wash' : 'border-line bg-white'}`}>
                  <input type="checkbox" checked={extras.includes(extra.id)} onChange={() => toggle(extra.id)} className="mt-0.5 accent-rose" />
                  <span className="flex-1">
                    <span className="flex justify-between gap-2"><span>{extra.label}</span><span className="shrink-0 font-semibold text-plum">{extra.price === null ? 'A consultar' : `+${formatARS(extra.price)}`}</span></span>
                    {extra.hint && <span className="mt-0.5 block text-xs text-stone">{extra.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-5 flex items-baseline justify-between rounded-2xl bg-sand px-4 py-3">
          <span className="text-sm font-semibold text-stone">Total</span>
          <span className="text-2xl font-extrabold text-plum">{formatARS(total)}{hasQuote && <span className="ml-1 text-xs font-semibold text-stone">+ inglés a consultar</span>}</span>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-cream p-4">
          <p className="text-sm font-semibold text-plum">Pagás por transferencia</p>
          <p className="mt-0.5 text-xs text-stone">Transferí el total y mandame el comprobante por WhatsApp.</p>
          <div className="mt-3 space-y-2">
            <CopyField label="Alias" value={TRANSFER.alias} />
            <CopyField label="CBU / CVU" value={TRANSFER.cbu} />
            <p className="px-1 text-xs text-stone">Titular: <span className="font-semibold text-ink">{TRANSFER.holder}</span></p>
          </div>
        </div>

        {product.notes && <ul className="mt-4 space-y-1 text-xs text-stone">{product.notes.map((note) => <li key={note}>· {note}</li>)}</ul>}

        <label className="mt-5 block text-sm font-semibold text-plum" htmlFor="order-name">Tu nombre (opcional)
          <input id="order-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Para saber a quién le respondo" className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-rose" />
        </label>

        <a href={whatsappUrl(message)} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp py-3.5 font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <MessageCircle className="h-5 w-5" />Enviar pedido por WhatsApp
        </a>
        <p className="mt-2 text-center text-xs text-stone">Se abre WhatsApp con tu pedido ya escrito. Solo tenés que enviarlo.</p>
      </div>
    </div>
  )
}
