// Reads Vale's WhatsApp sale notes into sales to record, e.g.
//   "Cecilia Sanchez / Pack premium + pack medium + servicio de linkedin 29/09"
// One note per line (so many notes, or copied WhatsApp messages, can be pasted at once). Each note can hold several
// products and add-ons (express, languages, platforms, LinkedIn services...).

export type SaleProduct = { id: string; name: string; category: string; price: number; groups: string[] }
export type SaleExtra = { groupId: string; optionId: string; groupLabel: string; label: string; price: number; isOther: boolean }
export type SaleItem = { productId: string | null; extras: { groupId: string; optionId: string }[] }

export type ParsedSale = {
  raw: string
  name: string
  items: SaleItem[]
  date: string // YYYY-MM-DD
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Singular form, so "servicio" matches "Servicios".
const stem = (word: string) => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word)
const wordsOf = (text: string) => plain(text).split(/[^a-z0-9]+/).filter(Boolean).map(stem)

// Words that don't tell products apart.
const NOISE = new Set(['pack', 'guia', 'para', 'con', 'del', 'las', 'los', 'una', 'por', 'de', 'la', 'el', 'tu', 'sin', 'a', 'y', 'e', 'book', 'ebook'])
// Words of add-on names too generic to recognize them by.
const GENERIC = new Set(['version', 'dentro', 'habile', 'hora', 'otro', 'otra', 'idioma', 'plataforma', 'seccion', 'linkedin', 'carga', 'perfil', 'personalizada', 'google', 'meet', 'empleo', 'entrega'])

function todayAR() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Best product for a piece of text: most matching words; ties go to CV packs over guides. `skip` words are ignored. */
export function matchProduct(text: string, products: SaleProduct[], skip: Set<string> = new Set()) {
  const words = new Set(wordsOf(text).filter((word) => !skip.has(word)))
  const wantsGuide = words.has('guia') || words.has('ebook') || words.has('book')
  let best: { product: SaleProduct; score: number } | null = null
  for (const product of products) {
    const tokens = wordsOf(product.name).filter((token) => token.length >= 3 && !NOISE.has(token))
    const hits = tokens.filter((token) => words.has(token)).length
    if (!hits) continue
    const score = hits + hits / Math.max(tokens.length, 1) + (wantsGuide && product.category === 'guias' ? 0.25 : 0)
    const better = !best || score > best.score || (score === best.score && product.category === 'cv' && best.product.category !== 'cv')
    if (better) best = { product, score }
  }
  return best?.product ?? null
}

/** Add-ons mentioned in a piece of text ("express", "inglés", "bumeran", "servicio de linkedin"...). */
export function matchExtras(text: string, extras: SaleExtra[]) {
  const words = new Set(wordsOf(text))
  return extras.filter((extra) => {
    if (extra.isOther) return false
    const keys = wordsOf(extra.label).filter((word) => word.length >= 4 && !GENERIC.has(word) && !NOISE.has(word))
    if (extra.groupId === 'express') keys.push('express')
    return keys.some((key) => words.has(key))
  })
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

export function parseSales(text: string, products: SaleProduct[], extras: SaleExtra[]): ParsedSale[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((raw) => {
    // Copied WhatsApp messages start with "[28/9/26, 10:32] Vale:" — drop it.
    let line = raw.replace(/^\[[^\]]*\]\s*[^:]{1,40}:\s*/, '').trim()
    if (!line) return []
    let date = todayAR()
    const last = [...line.matchAll(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/g)].at(-1)
    if (last) {
      date = parseDate(last[1], last[2], last[3])
      line = (line.slice(0, last.index) + line.slice(last.index! + last[0].length)).trim()
    }

    // "Name / what they bought"
    const split = line.match(/^(.*?)\s*(?:[/|]|\s-\s)\s*(.*)$/)
    let name = (split ? split[1] : line).trim()
    const bought = split ? split[2] : line
    if (!split) {
      // No separator ("Sofía Díaz pack simple"): the name ends where the first product word starts.
      const first = matchProduct(line, products)
      if (first) {
        const productWords = new Set(['pack', 'guia', 'kit', 'ebook', ...wordsOf(first.name)])
        const words = name.split(/\s+/)
        const cut = words.findIndex((word) => productWords.has(stem(plain(word).replace(/[^a-z0-9]/g, ''))))
        if (cut > 0) name = words.slice(0, cut).join(' ')
      }
    }

    const items: SaleItem[] = []
    const loose: SaleExtra[] = []
    const attach = (extra: SaleExtra, preferred: SaleItem | null) => {
      const offers = (item: SaleItem) => products.find((product) => product.id === item.productId)?.groups.includes(extra.groupId)
      const target = (preferred && offers(preferred) ? preferred : null) ?? [...items].reverse().find(offers) ?? preferred ?? items.at(-1)
      if (!target) { loose.push(extra); return }
      if (!target.extras.some((item) => item.groupId === extra.groupId && item.optionId === extra.optionId)) target.extras.push({ groupId: extra.groupId, optionId: extra.optionId })
    }

    for (const segment of bought.split(/\s*(?:\+|,|\s+y\s+|\s+con\s+|\s+mas\s+|\s+más\s+)\s*/i).filter((part) => part.trim())) {
      const found = matchExtras(segment, extras)
      // Words that named an add-on don't count for the product ("servicio de linkedin" is not the LinkedIn profile).
      const skip = new Set(found.flatMap((extra) => [...wordsOf(extra.groupLabel), ...wordsOf(extra.label)]))
      const product = matchProduct(segment, products, skip)
      const item = product ? { productId: product.id, extras: [] } : null
      if (item) items.push(item)
      for (const extra of found) attach(extra, item)
    }
    if (!items.length) items.push({ productId: null, extras: [] })
    for (const extra of loose) attach(extra, null)
    return [{ raw, name, items, date }]
  })
}
