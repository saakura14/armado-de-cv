import type { Metadata } from 'next'

// The team's screen: private, never indexed. Its own manifest so it installs on the tablet or phone
// as a separate app ("Armado de CV - Equipo") that opens straight in /equipo.
export const metadata: Metadata = {
  title: 'Equipo',
  robots: { index: false, follow: false },
  manifest: '/equipo.webmanifest',
  appleWebApp: { capable: true, title: 'CV Equipo', statusBarStyle: 'default' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
