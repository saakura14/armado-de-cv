'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'

export const inputClass = 'mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base font-normal text-ink outline-none focus:border-rosa sm:text-sm'
export const cardClass = 'rounded-3xl bg-white p-5 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)]'

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-xs font-semibold uppercase tracking-wider text-piedra ${className}`}>{label}{children}</label>
}

export function Button({ busy, variant = 'primary', className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'success' }) {
  const styles = {
    primary: 'bg-ciruela text-white hover:bg-rosa',
    secondary: 'border border-line bg-white text-ciruela hover:border-ciruela',
    danger: 'border border-rosa/40 bg-white text-rosa-deep hover:bg-petalo-wash',
    success: 'bg-whatsapp text-white hover:brightness-95',
  }[variant]
  return (
    <button {...props} disabled={busy || props.disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 font-display text-sm font-bold transition-colors disabled:opacity-50 ${styles} ${className}`}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>
  )
}

/** Small status line under a form: "Guardado" or the error. */
export function useFlash() {
  const [flash, setFlash] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const show = useCallback((tone: 'ok' | 'error', text: string) => {
    setFlash({ tone, text })
    if (tone === 'ok') window.setTimeout(() => setFlash(null), 2500)
  }, [])
  const node = flash ? <p role={flash.tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3 py-2 text-sm font-semibold ${flash.tone === 'ok' ? 'bg-whatsapp/10 text-whatsapp' : 'bg-petalo-wash text-rosa-deep'}`}>{flash.text}</p> : null
  return { show, node }
}

export function slugify(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

/** One item per line <-> array. */
export const linesToArray = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean)
