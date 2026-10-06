import type { Metadata } from 'next'
import { SITE_URL } from './catalog'

/** Public pages Google should list, with how often they change. */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/asesorias', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/test-ats', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/gratis', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/cursos', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terminos', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/privacidad', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/arrepentimiento', priority: 0.2, changeFrequency: 'yearly' },
] as const

/** Own title, description, canonical address and share preview for a public page (the layout's would repeat on every page). */
export function pageMetadata({ path, title, description, image = '/img/hero-banner.jpg' }: { path: string; title?: string; description: string; image?: string }): Metadata {
  const shareTitle = title ? `${title} · Armado de CV` : 'Armado de CV'
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: { title: shareTitle, description, url: path, siteName: 'Armado de CV', images: [image], locale: 'es_AR', type: 'website' },
  }
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`
