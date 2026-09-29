'use client'

import { useEffect, useState } from 'react'

/** The visitor's answer about Meta's cookies: 'all' loads the pixel, 'necessary' doesn't. null = not asked yet. */
export type Consent = 'all' | 'necessary'

const KEY = 'acv-cookies'
const EVENT = 'acv-cookies'

function read(): Consent | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'all' || value === 'necessary' ? value : null
  } catch { return null }
}

export function setConsent(value: Consent | null) {
  try { if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY) } catch { /* storage blocked: asked again next visit */ }
  window.dispatchEvent(new Event(EVENT))
}

/** `ready` is false until the stored answer is read, so nothing flashes on load. */
export function useConsent() {
  const [consent, setValue] = useState<Consent | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const sync = () => { setValue(read()); setReady(true) }
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  return { consent, ready }
}
