import type { Metadata } from 'next'

// The team's screen: private, never indexed.
export const metadata: Metadata = {
  title: 'Equipo',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
