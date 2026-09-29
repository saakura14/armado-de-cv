'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useHideMoney } from '@/lib/hide-money'

export function HideMoneyButton({ className = 'px-3 py-2 text-xs', labelClass = 'hidden sm:inline' }: { className?: string; labelClass?: string }) {
  const { hidden, toggle } = useHideMoney()
  return (
    <button type="button" onClick={toggle} aria-pressed={hidden} title={hidden ? 'Mostrar montos' : 'Ocultar montos'} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white font-display font-bold text-piedra hover:text-ciruela ${className}`}>
      {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}<span className={labelClass}>{hidden ? 'Mostrar montos' : 'Ocultar montos'}</span>
    </button>
  )
}
