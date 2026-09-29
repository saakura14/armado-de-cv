import type { Metadata } from 'next'

// Its own manifest so the panel installs on the phone as a separate app ("Panel ACV") that opens in /admin.
export const metadata: Metadata = {
  title: 'Administración',
  robots: { index: false, follow: false },
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'Panel ACV', statusBarStyle: 'default' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
