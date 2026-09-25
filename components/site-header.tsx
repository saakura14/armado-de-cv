'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, UserRound } from 'lucide-react'
import { whatsappUrl } from '@/lib/catalog'
import { useSession } from '@/lib/use-session'

export const SECTIONS = [
  { href: '/', label: 'Armado de CV' },
  { href: '/asesorias', label: 'Asesorías' },
] as const

export function isAsesorias(pathname: string) {
  return pathname.startsWith('/asesorias')
}

/** Current section, or null outside the two sales pages (cuenta, admin, legales...). */
function activeSection(pathname: string) {
  if (isAsesorias(pathname)) return '/asesorias'
  return pathname === '/' ? '/' : null
}

/** Text tabs with an underline: inline next to the logo on desktop, full-width row on phones. */
function SectionTabs({ variant }: { variant: 'desktop' | 'mobile' }) {
  const active = activeSection(usePathname())
  return (
    <nav aria-label="Secciones" className={variant === 'mobile' ? 'grid grid-cols-2' : 'flex h-full gap-8'}>
      {SECTIONS.map((section) => {
        const current = active === section.href
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? 'page' : undefined}
            className={`relative flex items-center justify-center font-display text-sm font-semibold transition-colors ${variant === 'mobile' ? 'h-11' : 'h-full'} ${current ? 'text-ciruela' : 'text-piedra hover:text-ciruela'}`}
          >
            {section.label}
            <span aria-hidden="true" className={`absolute bottom-0 left-1/2 h-[3px] -translate-x-1/2 rounded-t-full bg-rosa transition-all ${current ? (variant === 'mobile' ? 'w-24' : 'w-full') : 'w-0'}`} />
          </Link>
        )
      })}
    </nav>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const asesorias = isAsesorias(pathname)
  const { user } = useSession()
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-blanco/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-[72px]">
        <Link href={asesorias ? '/asesorias' : '/'} aria-label={asesorias ? 'Armado de CV Asesorías — inicio' : 'Armado de CV — inicio'} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asesorias ? '/brand/asesorias-horizontal.svg' : '/brand/logo-horizontal.svg'} alt="" className="h-11 w-auto sm:h-12" />
        </Link>
        <div className="hidden h-full md:block"><SectionTabs variant="desktop" /></div>
        <div className="flex items-center gap-2">
          <Link href="/cuenta" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-3 py-2 font-display text-sm font-semibold text-ciruela transition-colors hover:border-ciruela sm:px-4" aria-label={user ? 'Mi cuenta' : 'Ingresar'}>
            <UserRound className="h-4 w-4" /><span className="hidden sm:inline">{user ? 'Mi cuenta' : 'Ingresar'}</span>
          </Link>
          <a href={whatsappUrl('¡Hola! Quiero hacer una consulta.')} target="_blank" rel="noreferrer" className="hidden min-h-10 items-center gap-2 rounded-full bg-whatsapp px-4 py-2 font-display text-sm font-bold text-white lg:inline-flex">
            <MessageCircle className="h-4 w-4" />Escribime
          </a>
        </div>
      </div>
      <div className="border-t border-line/60 md:hidden"><SectionTabs variant="mobile" /></div>
    </header>
  )
}
