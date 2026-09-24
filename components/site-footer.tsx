import Link from 'next/link'
import { Camera, Mail, MessageCircle } from 'lucide-react'
import { CONTACT, whatsappUrl } from '@/lib/catalog'

export function SiteFooter() {
  return (
    <footer className="bg-ciruela px-4 pb-10 pt-12 text-white/80 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-blanco.svg" alt="Armado de CV" className="h-12 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">CV, LinkedIn y asesorías para que tu experiencia se note y llegues a la entrevista con confianza.</p>
        </div>
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-petalo">Secciones</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/" className="hover:text-white">Armado de CV</Link></li>
            <li><Link href="/asesorias" className="hover:text-white">Asesorías</Link></li>
            <li><a href={CONTACT.testimonials} target="_blank" rel="noreferrer" className="hover:text-white">Testimonios</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-petalo">Contacto</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href={whatsappUrl('¡Hola! Quiero hacer una consulta.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white"><MessageCircle className="h-4 w-4" />{CONTACT.whatsappLabel}</a></li>
            <li><a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white"><Camera className="h-4 w-4" />@{CONTACT.instagram}</a></li>
            <li><a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 break-all hover:text-white"><Mail className="h-4 w-4 shrink-0" />{CONTACT.email}</a></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-white/15 pt-6 text-xs text-white/60">© {new Date().getFullYear()} Armado de CV · Asesorías</p>
    </footer>
  )
}
