'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, MessageCircle, X } from 'lucide-react'
import { whatsappUrl } from '@/lib/catalog'

const links = [
  { href: '#cv', label: 'Armado de CV' },
  { href: '#entrevistas', label: 'Entrevistas y tests' },
  { href: '#vocacional', label: 'Test vocacional' },
  { href: '#como-comprar', label: 'Cómo comprar' },
  { href: '#sobre-mi', label: 'Sobre mí' },
  { href: '#preguntas', label: 'Preguntas' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#inicio" className="flex items-center gap-2" aria-label="Armado de CV — inicio">
          <Image src="/img/isotipo.webp" alt="" width={40} height={40} className="h-10 w-10 rounded-full" priority />
          <span className="font-script text-3xl leading-none text-rose">Armado de CV</span>
        </a>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Secciones">
          {links.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-stone transition-colors hover:text-rose">{link.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href={whatsappUrl('¡Hola! Quiero hacer una consulta.')} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-sm font-bold text-white sm:inline-flex"><MessageCircle className="h-4 w-4" />Escribime</a>
          <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-line p-2 text-plum lg:hidden" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line bg-paper px-4 py-3 lg:hidden" aria-label="Secciones">
          <ul className="grid gap-1">
            {links.map((link) => <li key={link.href}><a href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-plum hover:bg-sand">{link.label}</a></li>)}
            <li><a href={whatsappUrl('¡Hola! Quiero hacer una consulta.')} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Escribime por WhatsApp</a></li>
          </ul>
        </nav>
      )}
    </header>
  )
}
