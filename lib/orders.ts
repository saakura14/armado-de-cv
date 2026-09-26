export type OrderStatus = 'pending_payment' | 'payment_review' | 'paid' | 'in_progress' | 'delivered' | 'cancelled'

export type OrderExtra = { group_id: string; option_id: string; label: string; detail: string | null; price: number }

export type OrderItem = {
  id: string
  product_id: string
  product_name: string
  unit_price: number
  chosen_ebook_id: string | null
  extras: OrderExtra[]
  line_total: number
  products?: { delivery: string; category: string } | null
  ebooks?: { title: string } | null
}

export type Order = {
  id: string
  number: number
  user_id: string
  status: OrderStatus
  total: number
  customer_name: string | null
  customer_phone: string | null
  customer_note: string | null
  receipt_path: string | null
  receipt_uploaded_at: string | null
  admin_note: string | null
  paid_at: string | null
  delivered_at: string | null
  /** Instant e-book access: 'pending' until the admin checks the transfer arrived. */
  payment_check: 'pending' | 'ok' | 'rejected' | null
  created_at: string
  order_items: OrderItem[]
}

export const ORDER_SELECT = '*, order_items(*, products(delivery, category), ebooks(title))'

export const STATUS: Record<OrderStatus, { label: string; tone: string; text: string }> = {
  pending_payment: { label: 'Esperando pago', tone: 'bg-arena text-ciruela', text: 'Transferí el total y subí el comprobante.' },
  payment_review: { label: 'Revisando pago', tone: 'bg-petalo-wash text-rosa-deep', text: 'Recibí tu comprobante. Lo confirmo a la brevedad.' },
  paid: { label: 'Pago confirmado', tone: 'bg-whatsapp/15 text-whatsapp', text: 'Tu pago está confirmado. Coordinamos por WhatsApp.' },
  in_progress: { label: 'En proceso', tone: 'bg-rosa/15 text-rosa-deep', text: 'Estoy trabajando en tu pedido.' },
  delivered: { label: 'Entregado', tone: 'bg-ciruela text-white', text: '¡Listo! Tu pedido está entregado.' },
  cancelled: { label: 'Cancelado', tone: 'bg-line text-piedra', text: 'Este pedido fue cancelado.' },
}

/** Orders with only e-books and guides unlock as soon as the receipt is uploaded. */
export function isDigitalOnly(order: Order) {
  return order.order_items.every((item) => item.products?.delivery === 'digital')
}

/** Orders with CV packs, tests or sessions need a WhatsApp conversation after paying. */
export function needsCoordination(order: Order) {
  return order.order_items.some((item) => item.products?.delivery === 'service' || item.products?.delivery === 'session')
}

export function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value))
}
