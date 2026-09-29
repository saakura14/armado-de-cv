'use client'

import { usePathname } from 'next/navigation'

/** Public site header, footer and chat. The admin panel is an app of its own and brings its own header and menu. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return <>{children}</>
}
