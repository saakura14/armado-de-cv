'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/pixel'

/**
 * Anonymous visit counter for the admin dashboard: sends only the page and whether this browser tab
 * just arrived (sessionStorage, no cookies). The database skips the admin and private pages.
 */
export function VisitTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/equipo') || pathname.startsWith('/cuenta') || pathname.startsWith('/comprar')) return
    // Remember for the whole visit that it came from an ad, to tag the order if they buy.
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.has('fbclid') || params.has('utm_source')) sessionStorage.setItem('acv-origin', 'anuncio')
    } catch { /* private mode: the order is tagged as web */ }
    let newVisit = false
    try {
      newVisit = !sessionStorage.getItem('acv-visit')
      sessionStorage.setItem('acv-visit', '1')
    } catch { /* private mode: count the page view only */ }
    supabase.rpc('track_visit', { p_path: pathname, p_new_visit: newVisit }).then(() => undefined, () => undefined)
  }, [pathname])
  // Every WhatsApp link of the public site (header, bottom bar, hero, Sakura, footer...) counts as the "whatsapp" funnel step.
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/equipo')) return
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="https://wa.me/"]')
      if (link) countStep('whatsapp')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])
  return null
}

/** Funnel step for the admin dashboard, counted once per browser session. */
export function countStep(event: 'lo_quiero' | 'checkout' | 'whatsapp') {
  try {
    if (sessionStorage.getItem(`acv-step-${event}`)) return
    sessionStorage.setItem(`acv-step-${event}`, '1')
  } catch { /* private mode: count it anyway */ }
  supabase.rpc('track_event', { p_event: event }).then(() => undefined, () => undefined)
}

/** 'anuncio' when this browser session arrived from an ad link (Meta adds fbclid; campaigns can add utm_*), else 'web'. */
export function landingOrigin(): 'anuncio' | 'web' {
  try { return sessionStorage.getItem('acv-origin') === 'anuncio' ? 'anuncio' : 'web' } catch { return 'web' }
}

/** Someone goes from the web to the business WhatsApp: a funnel step for the panel and a Contact for the pixel. */
export function trackWhatsapp(value: number) {
  countStep('whatsapp')
  track('Contact', { value, currency: 'ARS' })
}
