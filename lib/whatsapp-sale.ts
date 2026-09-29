// Reads Vale's WhatsApp sale notes ("Nombre del cliente / Pack Medium 28/09") into sales to record.
// Works line by line, so many notes (or several copied WhatsApp messages) can be pasted at once.

export type SaleProduct = { id: string; name: string; category: string; price: number }

export type ParsedSale = {
  raw: string
  name: string
  productId: string | null
  date: string // YYYY-MM-DD
  express: boolean
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Words that don't tell products apart.
const NOISE = new Set(['pack', 'guia', 'para', 'con', 'del', 'las', 'los', 'una', 'por', 'de', 'la', 'el', 'tu', 'sin', 'a', 'y', 'e', 'book', 'ebook'])

function todayAR() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Best product for a piece of text: most matching words; ties go to CV packs over guides. */
export function matchProduct(text: string, products: SaleProduct[]) {
  const words = new Set(plain(text).split(/[^a-z0-9]+/).filter(Boolean))
  const wantsGuide = words.has('guia') || words.has('ebook') || words.has('book')
  let best: { product: SaleProduct; score: number } | null = null
  for (const product of products) {
    const tokens = plain(product.name).split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !NOISE.has(token))
    const hits = tokens.filter((token) => words.has(token)).length
    if (!hits) continue
    const score = hits + hits / Math.max(tokens.length, 1) + (wantsGuide && product.category === 'guias' ? 0.25 : 0)
    const better = !best || score > best.score || (score === best.score && product.category === 'cv' && best.product.category !== 'cv')
    if (better) best = { product, score }
  }
  return best?.product ?? null
}

function parseDate(day: string, month: string, year: string | undefined) {
  const today = todayAR()
  let fullYear = year ? Number(year.length === 2 ? `20${year}` : year) : Number(today.slice(0, 4))
  const iso = (value: number) => `${value}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  // Without a year, a date "in the future" means last year's.
  if (!year && iso(fullYear) > today) fullYear -= 1
  const date = iso(fullYear)
  return Number.isNaN(new Date(`${date}T12:00:00Z`).getTime()) ? today : date
}

export function parseSales(text: string, products: SaleProduct[]): ParsedSale[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((raw) => {
    // Copied WhatsApp messages start with "[28/9/26, 10:32] Vale:" — drop it.
    let line = raw.replace(/^\[[^\]]*\]\s*[^:]{1,40}:\s*/, '').trim()
    if (!line) return []
    let date = todayAR()
    const dates = [...line.matchAll(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/g)]
    const last = dates.at(-1)
    if (last) {
      date = parseDate(last[1], last[2], last[3])
      line = (line.slice(0, last.index) + line.slice(last.index! + last[0].length)).trim()
    }
    const parts = line.split(/\s*[/|]\s*|\s+-\s+/).map((part) => part.replace(/^[+\s-]+|[+\s-]+$/g, '').trim()).filter(Boolean)
    const rest = parts.slice(1).join(' ') || line
    const product = matchProduct(rest, products)
    let name = parts[0] ?? ''
    // No "/" between name and product ("Sofía Díaz pack simple"): the name ends where the product starts.
    if (parts.length === 1 && product) {
      const productWords = new Set(['pack', 'guia', 'kit', 'ebook', ...plain(product.name).split(/[^a-z0-9]+/)])
      const words = name.split(/\s+/)
      const cut = words.findIndex((word) => productWords.has(plain(word).replace(/[^a-z0-9]/g, '')))
      if (cut > 0) name = words.slice(0, cut).join(' ')
    }
    return [{ raw, name, productId: product?.id ?? null, date, express: /express/i.test(line) }]
  })
}
