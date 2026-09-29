'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatARS } from './catalog'

const KEY = 'acv-hide-money'
const EVENT = 'acv-hide-money'

/**
 * "Ocultar montos" for the whole panel (Inicio and Pedidos share it), remembered on this device.
 * `money` formats an amount, or masks it when hidden.
 */
export function useHideMoney() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const read = () => { try { setHidden(localStorage.getItem(KEY) === '1') } catch { /* storage blocked */ } }
    read()
    window.addEventListener(EVENT, read)
    return () => window.removeEventListener(EVENT, read)
  }, [])

  const toggle = useCallback(() => {
    try { localStorage.setItem(KEY, hidden ? '0' : '1') } catch { /* storage blocked */ }
    setHidden(!hidden)
    window.dispatchEvent(new Event(EVENT))
  }, [hidden])

  const money = useCallback((value: number) => (hidden ? '$ •••••' : formatARS(value)), [hidden])
  return { hidden, toggle, money }
}
