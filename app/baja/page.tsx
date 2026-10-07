import type { Metadata } from 'next'
import { Unsubscribe } from './unsubscribe'

export const metadata: Metadata = { title: 'Darte de baja', robots: { index: false, follow: false } }

/** "No quiero recibir más mails": the link at the bottom of the Test ATS follow-up email. */
export default function UnsubscribePage() {
  return (
    <section className="mx-auto max-w-md px-4 py-20 text-center">
      <Unsubscribe />
    </section>
  )
}
