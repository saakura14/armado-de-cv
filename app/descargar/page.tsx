import type { Metadata } from 'next'
import { Downloads } from './downloads'

export const metadata: Metadata = { title: 'Descargar tus guías', robots: { index: false, follow: false } }

/** The private link emailed to buyers without an account: their guides, downloadable from any device. */
export default function DownloadsPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <Downloads />
    </section>
  )
}
