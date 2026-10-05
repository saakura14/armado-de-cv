// Exporta el catálogo a PNG 1080×1920: node brand-src/catalogo/render.mjs (necesita Playwright instalado).
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '../../public/social/catalogo')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
// Detrás de un proxy, Chromium no llega a Google Fonts: las fuentes se bajan con curl y se le pasan a la página.
if (process.env.HTTPS_PROXY) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
    const url = route.request().url()
    const body = execFileSync('curl', ['-sSL', '-A', 'Mozilla/5.0 Chrome/120', url], { maxBuffer: 1 << 26 })
    route.fulfill({ body, contentType: url.includes('googleapis') ? 'text/css' : 'font/woff2' })
  })
}
await page.goto('file://' + join(here, 'catalogo-cv.html'), { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: join(out, 'catalogo-cv.png') })
await browser.close()
console.log('Listo:', join(out, 'catalogo-cv.png'))
