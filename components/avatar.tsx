'use client'

import { useState } from 'react'
import { UserRound } from 'lucide-react'

/** Profile photo (Google) with the person icon as fallback when there is none or it fails to load. */
export function Avatar({ src, size = 'h-8 w-8', className = '' }: { src: string | null; size?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <span className={`flex shrink-0 items-center justify-center rounded-full bg-petalo-wash text-rosa-deep ${size} ${className}`}><UserRound className="h-1/2 w-1/2" /></span>
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`shrink-0 rounded-full object-cover ${size} ${className}`} />
}
