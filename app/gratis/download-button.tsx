'use client'

import { Download } from 'lucide-react'
import { track } from '@/lib/pixel'

export const CHECKLIST_URL = 'https://wdcijkjmdfypltbafdol.supabase.co/storage/v1/object/public/social/gratis/Checklist-revisa-tu-CV-Armado-de-CV.pdf'

/** Opens the free PDF and records the download as a lead for the ads. */
export function DownloadButton() {
  return (
    <a href={CHECKLIST_URL} target="_blank" rel="noopener noreferrer" onClick={() => track('Lead', { content_name: 'Checklist gratis CV' })}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ciruela px-7 py-3 font-display text-sm font-bold text-white shadow-lg transition-colors hover:bg-rosa">
      <Download className="h-4 w-4" />Descargar gratis (PDF)
    </a>
  )
}
