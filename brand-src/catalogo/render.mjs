// Exporta el catálogo a PNG: node brand-src/catalogo/render.mjs (necesita Playwright instalado).
// Historia de Instagram 1080×1920 y versión para WhatsApp (2 imágenes 4:5, al doble de resolución para que se vea nítida).
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const PAGES = [
  { html: 'catalogo-historia.html', png: 'catalogo-historia.png', width: 1080, height: 1920, scale: 1 },
  { html: 'whatsapp-1-packs.html', png: 'whatsapp-1-packs.png', width: 1080, height: 1350, scale: 2 },
  { html: 'whatsapp-2-extras.html', png: 'whatsapp-2-extras.png', width: 1080, height: 1350, scale: 2 },
]

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '../../public/social/catalogo')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
for (const { html, png, width, height, scale } of PAGES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  // Detrás de un proxy, Chromium no llega a Google Fonts: las fuentes se bajan con curl y se le pasan a la página.
  if (process.env.HTTPS_PROXY) {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
      const url = route.request().url()
      const body = execFileSync('curl', ['-sSL', '-A', 'Mozilla/5.0 Chrome/120', url], { maxBuffer: 1 << 26 })
      route.fulfill({ body, contentType: url.includes('googleapis') ? 'text/css' : 'font/woff2' })
    })
  }
  await page.goto('file://' + join(here, html), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(out, png) })
  await page.close()
  console.log('Listo:', join(out, png))
}
await browser.close()
