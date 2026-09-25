// Meta Pixel. Paste the pixel ID from Events Manager here (it's public, not a secret).
// With an empty ID nothing is loaded or tracked.
export const META_PIXEL_ID = ''

type Fbq = (command: 'track' | 'init', event: string, params?: Record<string, unknown>) => void

/** Sends a standard Meta event (ViewContent, InitiateCheckout, Lead, Purchase…) if the pixel is active. */
export function track(event: string, params?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === 'undefined') return
  const fbq = (window as unknown as { fbq?: Fbq }).fbq
  fbq?.('track', event, params)
}
