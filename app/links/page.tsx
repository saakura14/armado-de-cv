import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, ChevronRight, FileCheck2, Gift, Sparkles } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { whatsappUrl } from '@/lib/catalog'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({ path: '/links', title: 'Links', description: 'Test ATS gratis, packs de CV, guías para tu búsqueda laboral y WhatsApp de Armado de CV.' })

const LINKS = [
  { href: '/test-ats', icon: FileCheck2, title: '¿Tu CV pasa los filtros?', text: 'Hacé el test ATS gratis en 2 minutos', tone: 'bg-ciruela text-white', sub: 'text-white/80' },
  { href: '/#precios', icon: Sparkles, title: 'Packs de CV y LinkedIn', text: 'Tu CV moderno + CV ATS, desde $35.000', tone: 'bg-rosa text-white', sub: 'text-white/85' },
  { href: '/#guias', icon: BookOpen, title: 'Guías para tu búsqueda', text: 'LinkedIn, portales, filtros ATS · desde $5.900', tone: 'bg-white text-ciruela', sub: 'text-piedra' },
  { href: '/#etapas', icon: BookOpen, title: 'Guías según tu edad', text: 'A los 20, 30, 40 y 50+ · $12.000', tone: 'bg-white text-ciruela', sub: 'text-piedra' },
  { href: '/gratis', icon: Gift, title: 'Checklist gratis', text: 'Revisá tu CV en 10 minutos', tone: 'bg-white text-ciruela', sub: 'text-piedra' },
]

/** The Instagram bio link: the test, the packs and the guides in big buttons, instead of landing everyone on the home. */
export default function LinksPage() {
  return (
    <section className="bg-papel/60 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <p className="text-center font-script text-5xl leading-none text-rosa">Armado de CV</p>
        <p className="mt-2 text-center text-sm text-piedra">CVs que pasan los filtros y guías para tu búsqueda laboral</p>
        <ul className="mt-8 space-y-3">
          {LINKS.map(({ href, icon: Icon, title, text, tone, sub }) => (
            <li key={href}>
              <Link href={href} className={`flex items-center gap-4 rounded-[24px] px-5 py-4 shadow-[0_18px_36px_-28px_rgba(67,32,44,0.6)] transition-transform hover:-translate-y-0.5 ${tone}`}>
                <Icon className="h-6 w-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold">{title}</span>
                  <span className={`block text-sm ${sub}`}>{text}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-70" />
              </Link>
            </li>
          ))}
          <li>
            <a href={whatsappUrl('¡Hola Vale! Vengo de Instagram y quiero consultarte por mi CV.')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-[24px] bg-whatsapp px-5 py-4 text-white shadow-[0_18px_36px_-28px_rgba(67,32,44,0.6)] transition-transform hover:-translate-y-0.5">
              <WhatsAppIcon className="h-6 w-6 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold">Escribime por WhatsApp</span>
                <span className="block text-sm text-white/85">Te digo qué pack te conviene</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 opacity-70" />
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
