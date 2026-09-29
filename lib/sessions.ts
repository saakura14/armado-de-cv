import { supabase } from './supabase'

// A 1:1 session bought together with a CV pack is scheduled once the CV is delivered: first the CV, then the session.

/** What a session needs to know about its order (select `orders(status, order_items(products(delivery)))`). */
export type SessionOrder = { status: string; order_items?: { products: { delivery: string } | null }[] } | null

export const SESSION_ORDER_SELECT = 'orders(number, customer_name, customer_phone, status, order_items(products(delivery)))'

/** True while the session waits for the CV of the same order to be delivered. */
export function waitsForCv(session: { status: string; orders: SessionOrder }) {
  const order = session.orders
  if (session.status !== 'to_schedule' || !order) return false
  const hasCv = (order.order_items ?? []).some((item) => item.products?.delivery === 'service')
  return hasCv && order.status !== 'delivered' && order.status !== 'cancelled'
}

/** Sessions Vale can schedule now (the red number on Sesiones). */
export async function countSessionsToSchedule(): Promise<number> {
  const { data } = await supabase.from('sessions').select('status, orders(status, order_items(products(delivery)))').eq('status', 'to_schedule')
  return ((data as { status: string; orders: SessionOrder }[] | null) ?? []).filter((session) => !waitsForCv(session)).length
}
