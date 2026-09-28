import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/catalog'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/cuenta', '/comprar'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
