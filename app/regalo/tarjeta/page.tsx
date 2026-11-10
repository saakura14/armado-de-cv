import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GiftCard } from './gift-card'

export const metadata: Metadata = { title: 'Tu tarjeta de regalo', robots: { index: false, follow: false } }

/** The gift card emailed to the buyer (/regalo/tarjeta?t=<download_token>), to send by WhatsApp or print. */
export default function GiftCardPage() {
  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 print:bg-white print:p-0">
      <Suspense>
        <GiftCard />
      </Suspense>
    </section>
  )
}
