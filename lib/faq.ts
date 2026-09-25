import { formatARS } from './catalog'
import { supabase } from './supabase'

export type Faq = { id: string; section: 'cv' | 'asesorias' | 'general'; question: string; answer: string; keywords: string[]; show_on_page: boolean; sort: number }
export type Prices = { products: Record<string, number>; extras: Record<string, number> }

/** Replaces {{precio:<product>}} and {{extra:<group>}} with the current prices. */
export function fillPrices(text: string, prices: Prices) {
  return text.replace(/\{\{(precio|extra):([a-z0-9-]+)\}\}/g, (match, kind: string, id: string) => {
    const value = kind === 'precio' ? prices.products[id] : prices.extras[id]
    return typeof value === 'number' ? formatARS(value) : 'consultar'
  })
}

export async function loadPrices(): Promise<Prices> {
  const [p, e] = await Promise.all([
    supabase.from('products').select('id, price'),
    supabase.from('extra_groups').select('id, unit_price'),
  ])
  return {
    products: Object.fromEntries(((p.data as { id: string; price: number }[] | null) ?? []).map((row) => [row.id, row.price])),
    extras: Object.fromEntries(((e.data as { id: string; unit_price: number }[] | null) ?? []).map((row) => [row.id, row.unit_price])),
  }
}

/** Active FAQs with prices already filled in. `sections` narrows them for a page's FAQ list. */
export async function getFaqs(options: { sections?: Faq['section'][]; onPageOnly?: boolean } = {}) {
  let query = supabase.from('faqs').select('*').eq('active', true).order('sort')
  if (options.sections) query = query.in('section', options.sections)
  if (options.onPageOnly) query = query.eq('show_on_page', true)
  const [{ data }, prices] = await Promise.all([query, loadPrices()])
  return ((data as Faq[] | null) ?? []).map((faq) => ({ ...faq, answer: fillPrices(faq.answer, prices) }))
}

const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'y', 'o', 'que', 'en', 'es', 'se', 'me', 'mi', 'mis', 'tu', 'te', 'lo', 'le', 'por', 'para', 'con', 'como', 'cual', 'hay', 'si', 'no', 'yo', 'vos', 'hola', 'quiero', 'queria', 'quisiera', 'saber', 'puedo', 'tengo', 'tiene', 'son', 'esta', 'este', 'eso', 'hacen', 'hace', 'ustedes', 'buenas', 'buen', 'dia', 'gracias', 'consulta'])

export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ\s]/g, ' ')
}

function tokens(text: string) {
  return normalize(text).split(/\s+/).filter((word) => word.length > 1 && !STOPWORDS.has(word))
}

/** Loose match so "idiomas" finds "idioma" and "demora" finds "demoran". */
const similar = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5))))

// Words that show up in many questions ("¿cuánto sale...?") and say little about the topic.
const GENERIC = new Set(['precio', 'precios', 'cuesta', 'cuestan', 'sale', 'salen', 'valor', 'cuanto', 'cuantos', 'costo', 'pack', 'packs', 'perfil'])

/** Scores every FAQ against the question; best first. Specific keywords weigh more than generic ones or words in the question text. */
export function rankFaqs(question: string, faqs: Faq[]) {
  const words = tokens(question)
  if (words.length === 0) return []
  return faqs
    .map((faq) => {
      const keys = faq.keywords.map(normalize)
      const questionWords = tokens(faq.question)
      const score = words.reduce((total, word) => {
        const keyword = keys.some((key) => similar(word, key)) ? (GENERIC.has(word) ? 1 : 3) : 0
        return total + keyword + (questionWords.some((q) => similar(word, q)) ? 1 : 0)
      }, 0)
      return { faq, score }
    })
    .filter((item) => item.score >= 1)
    .sort((a, b) => b.score - a.score || a.faq.sort - b.faq.sort)
}
