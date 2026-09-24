'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/catalog'

export const SECTIONS = [
  { href: '/', label: 'Armado de CV' },
  { href: '/asesorias', label: 'Asesorías' },
] as const

export function isAsesorias(pathname: string) {
  return pathname.startsWith('/asesorias')
}

/** Segmented control that switches between the two lines of the business. */
export function SectionTabs() {
  const pathname = usePathname()
  const active = isAsesorias(pathname) ? '/asesorias' : '/'
  return (
    <nav aria-label="Secciones" className="inline-flex rounded-full bg-arena/70 p-1">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          aria-current={active === section.href ? 'page' : undefined}
          className={`rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors ${active === section.href ? 'bg-white text-ciruela shadow-sm' : 'text-piedra hover:text-ciruela'}`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const asesorias = isAsesorias(pathname)
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-blanco/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={asesorias ? '/asesorias' : '/'} aria-label={asesorias ? 'Armado de CV Asesorías — inicio' : 'Armado de CV — inicio'} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asesorias ? '/brand/asesorias-horizontal.svg' : '/brand/logo-horizontal.svg'} alt="" className="h-11 w-auto sm:h-12" />
        </Link>
        <div className="hidden md:block"><SectionTabs /></div>
        <a href={whatsappUrl('¡Hola! Quiero hacer una consulta.')} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-full bg-whatsapp px-4 py-2 font-display text-sm font-bold text-white lg:inline-flex">
          <MessageCircle className="h-4 w-4" />Escribime
        </a>
      </div>
      <div className="flex justify-center pb-2.5 md:hidden"><SectionTabs /></div>
    </header>
  )
}
