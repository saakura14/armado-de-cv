'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyField({ label, value }: { label: string; value: string }) {
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
      <button type="button" onClick={copy} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ciruela hover:bg-petalo-wash" aria-label={`Copiar ${label}`}>
        {copied ? <Check className="h-3.5 w-3.5 text-whatsapp" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
