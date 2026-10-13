'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const ITEMS = [
  { id: 'elegidos', label: 'Más elegidos' },
  { id: 'precios', label: 'Packs y precios' },
  { id: 'antes-despues', label: 'Antes y después' },
  { id: 'que-pack', label: '¿Qué pack necesito?' },
  { id: 'test', label: 'Test ATS gratis', href: '/test-ats' },
  { id: 'guias', label: 'Guías' },
  { id: 'como-comprar', label: 'Cómo comprar' },
  { id: 'preguntas', label: 'Preguntas' },
] as const

/**
 * The home's sections as a row of chips under the header: the one on screen is highlighted and scrolled into view.
 * On phones it replaces the Armado de CV / Asesorías tabs, so Asesorías goes at the end (desktop keeps the tabs in the header).
 */
export function HomeMenu() {
  const [active, setActive] = useState<string | null>(null)
  const row = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = ITEMS.flatMap((item) => { const element = document.getElementById(item.id); return element ? [element] : [] })
    // A section counts as current when it crosses a line a bit below the header.
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActive(visible.target.id)
    }, { rootMargin: '-140px 0px -55% 0px' })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  // Keep the current chip visible in the row (only the row scrolls, never the page).
  useEffect(() => {
    const container = row.current
    const chip = container?.querySelector<HTMLElement>(`[data-id="${active}"]`)
    if (container && chip) container.scrollTo({ left: chip.offsetLeft - container.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' })
  }, [active])

  const chip = (current: boolean) => `shrink-0 rounded-full px-3.5 py-1.5 font-display text-xs font-bold transition-colors ${current ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`
  return (
    <nav aria-label="Secciones de la página" ref={row} className="no-scrollbar relative h-11 overflow-x-auto">
      {/* Centered when it fits, scrolls sideways when it does not. */}
      <div className="mx-auto flex h-full w-max items-center gap-2 px-4 sm:px-6">
        {ITEMS.map((item) => 'href' in item
          ? <Link key={item.id} href={item.href} className="shrink-0 rounded-full border border-rosa/40 bg-white px-3.5 py-1.5 font-display text-xs font-bold text-rosa-deep transition-colors hover:bg-petalo-wash">{item.label}</Link>
          : <a key={item.id} href={`#${item.id}`} data-id={item.id} aria-current={active === item.id ? 'true' : undefined} className={chip(active === item.id)}>{item.label}</a>)}
        <Link href="/asesorias" className={`${chip(false)} md:hidden`}>Asesorías</Link>
      </div>
    </nav>
  )
}
