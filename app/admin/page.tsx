'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CreditCard, Loader2, HelpCircle, PlayCircle, ShoppingBag, Tag, Video } from 'lucide-react'
import { AuthPanel } from '@/components/auth-panel'
import { CoursesAdmin } from '@/components/admin/courses-admin'
import { EbooksAdmin } from '@/components/admin/ebooks-admin'
import { FaqsAdmin } from '@/components/admin/faqs-admin'
import { OrdersAdmin } from '@/components/admin/orders-admin'
import { PaymentAdmin } from '@/components/admin/payment-admin'
import { ProductsAdmin } from '@/components/admin/products-admin'
import { SessionsAdmin } from '@/components/admin/sessions-admin'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'

const TABS = [
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
  { id: 'sesiones', label: 'Sesiones', icon: Video },
  { id: 'productos', label: 'Packs y precios', icon: Tag },
  { id: 'ebooks', label: 'E-books', icon: BookOpen },
  { id: 'cursos', label: 'Cursos', icon: PlayCircle },
  { id: 'sakura', label: 'Sakura (preguntas)', icon: HelpCircle },
  { id: 'pago', label: 'Datos de pago', icon: CreditCard },
] as const
type TabId = (typeof TABS)[number]['id']

export default function AdminPage() {
  const { user, ready, isAdmin } = useSession()
  const [tab, setTab] = useState<TabId>('pedidos')
  const [counts, setCounts] = useState<{ review: number; sessions: number }>({ review: 0, sessions: 0 })

  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as TabId
    if (TABS.some((item) => item.id === fromHash)) setTab(fromHash)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'payment_review'),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'to_schedule'),
    ]).then(([orders, sessions]) => setCounts({ review: orders.count ?? 0, sessions: sessions.count ?? 0 }))
  }, [isAdmin, tab])

  function select(id: TabId) {
    setTab(id)
    history.replaceState(null, '', `#${id}`)
  }

  if (!ready) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="bg-arena/40 px-4 py-16"><AuthPanel title="Administración" text="Ingresá con ayuda.armadodecv@gmail.com o valeeria.gil@gmail.com." /></section>
  if (!isAdmin) return <section className="mx-auto max-w-md px-4 py-20 text-center"><p className="font-script text-5xl text-rosa">Sin acceso</p><p className="mt-3 text-piedra">Esta sección es solo para administración.</p><Link href="/cuenta" className="mt-6 inline-block font-semibold text-rosa-deep underline">Ir a Mi cuenta</Link></section>

  const badge = (id: TabId) => (id === 'pedidos' ? counts.review : id === 'sesiones' ? counts.sessions : 0)

  return (
    <section className="min-h-[70vh] bg-arena/40 px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-script text-5xl leading-none text-rosa">Panel</p>
        <h1 className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-ciruela">Administración</h1>

        <nav aria-label="Secciones del panel" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1 border-b border-line">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button type="button" onClick={() => select(id)} aria-current={tab === id ? 'page' : undefined} className={`relative flex items-center gap-2 px-3.5 pb-3 pt-2 font-display text-sm font-semibold transition-colors ${tab === id ? 'text-ciruela after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-rosa' : 'text-piedra hover:text-ciruela'}`}>
                  <Icon className="h-4 w-4" />{label}
                  {badge(id) > 0 && <span className="rounded-full bg-rosa px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{badge(id)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6">
          {tab === 'pedidos' && <OrdersAdmin />}
          {tab === 'sesiones' && <SessionsAdmin />}
          {tab === 'productos' && <ProductsAdmin />}
          {tab === 'ebooks' && <EbooksAdmin />}
          {tab === 'cursos' && <CoursesAdmin />}
          {tab === 'sakura' && <FaqsAdmin />}
          {tab === 'pago' && <PaymentAdmin />}
        </div>
      </div>
    </section>
  )
}
