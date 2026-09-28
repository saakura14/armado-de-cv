'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Anonymous visit counter for the admin dashboard: sends only the page and whether this browser tab
 * just arrived (sessionStorage, no cookies). The database skips the admin and private pages.
 */
export function VisitTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/cuenta') || pathname.startsWith('/comprar')) return
    let newVisit = false
    try {
      newVisit = !sessionStorage.getItem('acv-visit')
      sessionStorage.setItem('acv-visit', '1')
    } catch { /* private mode: count the page view only */ }
    supabase.rpc('track_visit', { p_path: pathname, p_new_visit: newVisit }).then(() => undefined, () => undefined)
  }, [pathname])
  return null
}

/** Funnel step for the admin dashboard, counted once per browser session. */
export function countStep(event: 'lo_quiero' | 'checkout') {
  try {
    if (sessionStorage.getItem(`acv-step-${event}`)) return
    sessionStorage.setItem(`acv-step-${event}`, '1')
  } catch { /* private mode: count it anyway */ }
  supabase.rpc('track_event', { p_event: event }).then(() => undefined, () => undefined)
}
