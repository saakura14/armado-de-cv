'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

export type ThemePref = 'auto' | 'light' | 'dark'

const NEXT: Record<ThemePref, ThemePref> = { auto: 'light', light: 'dark', dark: 'auto' }
const LABEL: Record<ThemePref, string> = { auto: 'Tema automático (como el dispositivo)', light: 'Modo claro', dark: 'Modo oscuro' }
const ICON = { auto: Monitor, light: Sun, dark: Moon }

/** Round button that goes automático → claro → oscuro. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref | null>(null)
  useEffect(() => {
    try { setPref((localStorage.getItem('acv-theme') as ThemePref | null) ?? 'auto') } catch { setPref('auto') }
  }, [])
  function change() {
    const next = NEXT[pref ?? 'auto']
    setPref(next)
    try { localStorage.setItem('acv-theme', next) } catch { /* private mode: only for this visit */ }
    const apply = (window as Window & { __acvTheme?: () => void }).__acvTheme
    if (apply) apply()
    else document.documentElement.dataset.theme = next === 'dark' ? 'dark' : 'light'
  }
  const Icon = ICON[pref ?? 'auto']
  return (
    <button type="button" onClick={change} aria-label={`${LABEL[pref ?? 'auto']}. Tocá para cambiar.`} title={LABEL[pref ?? 'auto']}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-piedra transition-colors hover:border-ciruela hover:text-ciruela ${className}`}>
      <Icon className="h-4 w-4" />
    </button>
  )
}
