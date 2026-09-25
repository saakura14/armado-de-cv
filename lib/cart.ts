import type { Delivery } from './catalog'

/** What the customer picked in the order dialog, kept until the order is created (survives the Google sign-in redirect). */
export type PendingOrder = {
  item: { product_id: string; ebook_id: string | null; extras: { group_id: string; option_id: string; detail: string | null }[] }
  productName: string
  subtitle: string | null
  delivery: Delivery
  lines: { text: string; price: number }[]
  total: number
  notes: string[]
}

const KEY = 'adc-pedido'

export function savePending(order: PendingOrder) {
  try { localStorage.setItem(KEY, JSON.stringify(order)) } catch { /* storage blocked: the checkout page will ask to pick again */ }
}

export function loadPending(): PendingOrder | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingOrder) : null
  } catch {
    return null
  }
}

export function clearPending() {
  try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}
