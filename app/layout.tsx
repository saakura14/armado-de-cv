import type { Metadata, Viewport } from 'next'
import { Great_Vibes, Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap', weight: ['400', '500', '600', '700', '800'] })
const greatVibes = Great_Vibes({ subsets: ['latin'], variable: '--font-great-vibes', display: 'swap', weight: '400' })

export const metadata: Metadata = {
  title: 'Armado de CV — Asesorías para tu búsqueda laboral',
  description: 'CV modernos y optimizados para filtros ATS, perfil de LinkedIn, cartas de presentación, e-books para entrevistas y psicotécnicos y test vocacional.',
  icons: { icon: '/img/isotipo.webp', apple: '/img/isotipo.webp' },
  openGraph: {
    title: 'Armado de CV — Asesorías',
    description: 'Tu CV listo para pasar los filtros y llegar a la entrevista.',
    images: ['/img/hero-banner.webp'],
    locale: 'es_AR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#fcfaf6',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${montserrat.variable} ${greatVibes.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
