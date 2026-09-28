import type { MetadataRoute } from 'next'
import { PUBLIC_PAGES, absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({ url: absoluteUrl(page.path), changeFrequency: page.changeFrequency, priority: page.priority }))
}
