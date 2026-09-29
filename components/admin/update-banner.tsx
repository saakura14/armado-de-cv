'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'

/**
 * The installed app (and an open browser tab) can keep running an old version for days.
 * When a new deploy is live, offer to reload: checked when the panel comes back to the screen and every 10 minutes.
 */
export function UpdateBanner() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (BUILD === 'dev') return
    const check = () => fetch('/api/version', { cache: 'no-store' })
      .then((response) => response.json())
      .then(({ version }: { version: string }) => { if (version && version !== 'dev' && version !== BUILD) setAvailable(true) })
      .catch(() => undefined)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    check()
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(check, 10 * 60 * 1000)
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer) }
  }, [])

  if (!available) return null
  return (
    <div role="status" className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ciruela px-4 py-3 text-sm text-white shadow-xl">
      <span className="flex-1">Hay una versión nueva del panel.</span>
      <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-display text-xs font-bold text-ciruela"><RefreshCw className="h-3.5 w-3.5" />Actualizar</button>
    </div>
  )
}
