import type { Metadata, Viewport } from 'next'
import { Cookie, Montserrat, Nunito_Sans } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import { BottomNav } from '@/components/bottom-nav'
import { SiteFooter } from '@/components/site-footer'
import { SakuraChat } from '@/components/sakura-chat'
import { MetaPixel } from '@/components/meta-pixel'
import './globals.css'

const cookie = Cookie({ subsets: ['latin'], variable: '--font-cookie', display: 'swap', weight: '400' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap', weight: ['500', '600', '700', '800'] })
const nunito = Nunito_Sans({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.armadodecv.com'),
  title: { default: 'Armado de CV — Tu CV listo para llegar a la entrevista', template: '%s · Armado de CV' },
  description: 'CV modernos y optimizados para filtros ATS, perfil de LinkedIn, cartas de presentación y carga en plataformas de empleo. Asesorías para entrevistas, psicotécnicos y test vocacional.',
  applicationName: 'Armado de CV',
  icons: { icon: [{ url: '/brand/isotipo.svg', type: 'image/svg+xml' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/apple-icon.png' },
  appleWebApp: { capable: true, title: 'Armado de CV', statusBarStyle: 'default' },
  openGraph: {
    title: 'Armado de CV',
    description: 'Tu CV listo para pasar los filtros y llegar a la entrevista.',
    images: ['/img/hero-banner.jpg'],
    locale: 'es_AR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#fcfaf7',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${cookie.variable} ${montserrat.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased">
        <SiteHeader />
        <main className="pb-24 lg:pb-0">{children}</main>
        <SiteFooter />
        <BottomNav />
        <SakuraChat />
        <MetaPixel />
      </body>
    </html>
  )
}
