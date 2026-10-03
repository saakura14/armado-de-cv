'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useConsent } from '@/lib/consent'
import { META_PIXEL_ID } from '@/lib/pixel'

type Fbq = (command: 'consent', value: 'grant' | 'revoke') => void

/**
 * Loads the Meta Pixel and tracks page views, only after the visitor accepts cookies.
 * Never on the admin panel (Vale's own visits would skew the ads).
 */
export function MetaPixel() {
  const pathname = usePathname()
  const { consent } = useConsent()
  // If the pixel was loaded and the visitor changes their mind, stop it for the rest of the visit.
  useEffect(() => {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq
    if (fbq && consent !== 'all') fbq('consent', 'revoke')
  }, [consent])
  if (!META_PIXEL_ID || consent !== 'all' || pathname.startsWith('/admin') || pathname.startsWith('/equipo')) return null
  return (
    <Script id="meta-pixel" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('consent', 'grant'); fbq('init', '${META_PIXEL_ID}'); fbq('track', 'PageView');
    `}</Script>
  )
}
