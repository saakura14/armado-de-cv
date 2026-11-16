import type { Metadata } from 'next'

// Private links with the customer's data: never indexed.
export const metadata: Metadata = { title: 'Tus datos para el CV', robots: { index: false, follow: false } }

export default function ClientFormLayout({ children }: { children: React.ReactNode }) {
  return children
}
