'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CreditCard, ExternalLink, Home, Loader2, HelpCircle, LogOut, Menu, PlayCircle, ShoppingBag, Star, Tag, UserRound, Video, X } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { Avatar } from '@/components/avatar'
import { AppSetup } from '@/components/admin/app-setup'
import { WhatsappSaleDialog } from '@/components/admin/whatsapp-sale-dialog'
import { UpdateBanner } from '@/components/admin/update-banner'
import { AuthPanel } from '@/components/auth-panel'
import { CoursesAdmin } from '@/components/admin/courses-admin'
import { DashboardAdmin, type OpenTarget } from '@/components/admin/dashboard-admin'
import { EbooksAdmin } from '@/components/admin/ebooks-admin'
import { FaqsAdmin } from '@/components/admin/faqs-admin'
import { OrdersAdmin, type Filter } from '@/components/admin/orders-admin'
import { PaymentAdmin } from '@/components/admin/payment-admin'
import { ProductsAdmin } from '@/components/admin/products-admin'
import { SessionsAdmin } from '@/components/admin/sessions-admin'
import { TestimonialsAdmin } from '@/components/admin/testimonials-admin'
import { formatARS } from '@/lib/catalog'
import { setAppBadge, syncPush } from '@/lib/push'
import { countSessionsToSchedule } from '@/lib/sessions'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'

const TABS = [
  // `short` fits the one-line tab bar on the computer; `label` is used in titles and the "Más" menu.
  { id: 'inicio', label: 'Inicio', short: 'Inicio', icon: Home },
  { id: 'pedidos', label: 'Pedidos', short: 'Pedidos', icon: ShoppingBag },
  { id: 'sesiones', label: 'Sesiones', short: 'Sesiones', icon: Video },
  { id: 'productos', label: 'Packs y precios', short: 'Precios', icon: Tag },
  { id: 'ebooks', label: 'E-books', short: 'E-books', icon: BookOpen },
  { id: 'cursos', label: 'Cursos', short: 'Cursos', icon: PlayCircle },
  { id: 'sakura', label: 'Sakura (preguntas)', short: 'Sakura', icon: HelpCircle },
  { id: 'testimonios', label: 'Testimonios', short: 'Testimonios', icon: Star },
  { id: 'pago', label: 'Datos de pago', short: 'Cobros', icon: CreditCard },
] as const
type TabId = (typeof TABS)[number]['id']
const isTab = (value: unknown): value is TabId => TABS.some((item) => item.id === value)
// On the phone the bottom bar holds the daily sections; the rest live under "Más".
const BAR: TabId[] = ['inicio', 'pedidos', 'sesiones']

const standalone = () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

export default function AdminPage() {
  const { user, profile, ready, isAdmin, avatarUrl } = useSession()
  const [tab, setTab] = useState<TabId>('inicio')
  // pedidos: new orders not seen yet + payments to check; sessions: to schedule.
  const [counts, setCounts] = useState<{ orders: number; sessions: number }>({ orders: 0, sessions: 0 })
  // A web order that came in while the panel is open.
  const [incoming, setIncoming] = useState<{ number: number; name: string; total: number } | null>(null)
  // WhatsApp sale form: opened by the button, the app shortcut (?venta=1) or by sharing a WhatsApp note to the app (?text=...).
  const [sale, setSale] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const [account, setAccount] = useState(false)
  const [refresh, setRefresh] = useState(0)
  // How Pedidos opens when coming from the home: a status filter or one order ("#7").
  const [ordersView, setOrdersView] = useState<{ filter: Filter; search: string } | null>(null)
  const historyReady = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shared = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\n').trim()
    if (shared || params.has('venta')) {
      setSale(shared)
      history.replaceState(history.state, '', `/admin${window.location.hash}`)
    }
  }, [])

  /*
   * The phone's back button moves between sections and closes windows instead of leaving the panel.
   * Without this, after logging in with Google, "back" went to Google's login pages.
   * A base entry sits under the sections: reaching it inside the app re-opens Inicio.
   */
  useEffect(() => {
    if (!isAdmin || historyReady.current) return
    historyReady.current = true
    const fromHash = window.location.hash.slice(1)
    const first: TabId = isTab(fromHash) ? fromHash : 'inicio'
    setTab(first)
    history.replaceState({ acv: 'base' }, '', `/admin#${first}`)
    history.pushState({ acv: 'tab', tab: first }, '', `/admin#${first}`)
    const onPop = (event: PopStateEvent) => {
      const state = event.state as { acv?: string; tab?: string } | null
      setMore(false); setAccount(false); setSale(null)
      if (state?.acv === 'tab' && isTab(state.tab)) { setTab(state.tab); return }
      if (state?.acv === 'overlay') return
      if (standalone()) {
        history.pushState({ acv: 'tab', tab: 'inicio' }, '', '/admin#inicio')
        setTab('inicio')
      } else {
        history.back()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isAdmin])

  const recount = useCallback(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .or('seen_at.is.null,status.eq.payment_review,payment_check.eq.pending').neq('status', 'cancelled').lt('number', 90000),
      countSessionsToSchedule(),
    ]).then(([orders, sessions]) => setCounts({ orders: orders.count ?? 0, sessions }))
  }, [])

  useEffect(() => { if (isAdmin) recount() }, [isAdmin, tab, refresh, recount])

  // Live: recount on every change and show a notice when a web order comes in, even if the phone notification is late.
  useEffect(() => {
    if (!isAdmin) return
    let timer: number | undefined
    const channel = supabase.channel('admin-shell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (change) => {
        window.clearTimeout(timer); timer = window.setTimeout(recount, 800)
        const row = change.new as { number?: number; source?: string; customer_name?: string | null; total?: number }
        if (change.eventType === 'INSERT' && row.source === 'web' && (row.number ?? 90000) < 90000) {
          setIncoming({ number: row.number!, name: row.customer_name || 'Cliente', total: row.total ?? 0 })
          navigator.vibrate?.(200)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => { window.clearTimeout(timer); timer = window.setTimeout(recount, 800) })
      .subscribe()
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel) }
  }, [isAdmin, recount])

  // Keep this device's notification subscription saved.
  useEffect(() => { if (isAdmin && user) syncPush(user.id) }, [isAdmin, user])

  // Pending count on the browser tab and on the app icon.
  useEffect(() => {
    if (!isAdmin) return
    const pending = counts.orders + counts.sessions
    document.title = counts.orders ? `(${counts.orders}) Administración · Armado de CV` : 'Administración · Armado de CV'
    setAppBadge(pending)
  }, [isAdmin, counts])

  const select = useCallback((id: TabId, view: { filter: Filter; search: string } | null = null) => {
    setOrdersView(view)
    setMore(false); setAccount(false)
    if (id === tab && history.state?.acv === 'tab') return
    // From a menu window, replace its entry so "back" doesn't reopen it.
    if (history.state?.acv === 'overlay') history.replaceState({ acv: 'tab', tab: id }, '', `/admin#${id}`)
    else history.pushState({ acv: 'tab', tab: id }, '', `/admin#${id}`)
    setTab(id)
    window.scrollTo(0, 0)
  }, [tab])

  const openFromHome = useCallback((target: OpenTarget) => {
    if (target.tab === 'sesiones') { select('sesiones'); return }
    select('pedidos', target.order ? { filter: 'todos', search: `#${target.order}` } : { filter: target.filter ?? 'activos', search: '' })
  }, [select])

  // Windows (menu, account, WhatsApp sale) get their own history entry so "back" closes them.
  function openOverlay(open: () => void) {
    if (history.state?.acv !== 'overlay') history.pushState({ acv: 'overlay' }, '', window.location.href)
    open()
  }
  function closeOverlay() {
    if (history.state?.acv === 'overlay') history.back()
    else { setMore(false); setAccount(false); setSale(null) }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.replace('/')
  }

  if (!ready) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="min-h-[80vh] bg-arena/40 px-4 py-16"><AdminLogo className="mb-8 justify-center" /><AuthPanel title="Administración" text="Área privada." /></section>
  if (!isAdmin) return <section className="mx-auto max-w-md px-4 py-20 text-center"><p className="font-script text-5xl text-rosa">Sin acceso</p><p className="mt-3 text-piedra">Esta sección es solo para administración.</p><Link href="/cuenta" className="mt-6 inline-block font-semibold text-rosa-deep underline">Ir a Mi cuenta</Link></section>

  const badge = (id: TabId) => (id === 'pedidos' ? counts.orders : id === 'sesiones' ? counts.sessions : 0)
  const current = TABS.find((item) => item.id === tab)!
  const moreBadge = TABS.filter((item) => !BAR.includes(item.id)).reduce((sum, item) => sum + badge(item.id), 0)
  const name = profile?.full_name?.trim() || user.email || ''

  return (
    <div className="min-h-dvh bg-arena/40">
      {/* App header */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-blanco/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-16">
          <AdminLogo />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => openOverlay(() => setAccount(true))} aria-label="Tu cuenta" className="rounded-full ring-2 ring-transparent transition hover:ring-rosa/40">
              <Avatar src={avatarUrl} size="h-9 w-9" />
            </button>
          </div>
        </div>
        {/* Desktop: all sections as tabs */}
        <nav aria-label="Secciones del panel" className="mx-auto hidden max-w-6xl px-6 lg:block">
          <ul className="-mx-3 flex gap-0.5 overflow-x-auto overflow-y-hidden xl:justify-between">
            {TABS.map(({ id, label, short, icon: Icon }) => (
              <li key={id}>
                <button type="button" onClick={() => select(id)} aria-current={tab === id ? 'page' : undefined} title={label} className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-1 font-display text-sm font-semibold transition-colors ${tab === id ? 'text-ciruela after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-rosa' : 'text-piedra hover:text-ciruela'}`}>
                  <Icon className="h-4 w-4 shrink-0" />{short}
                  {badge(id) > 0 && <span className="rounded-full bg-rosa px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{badge(id)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-4 pt-4 sm:px-6 lg:pb-12 lg:pt-8">
        {tab !== 'inicio' && <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-ciruela lg:hidden"><current.icon className="h-5 w-5 text-rosa" />{current.label}</h1>}
        <div key={refresh}>
          {tab === 'inicio' && (
            <div className="space-y-6">
              <AppSetup userId={user.id} />
              <DashboardAdmin firstName={profile?.full_name?.trim().split(/\s+/)[0] || 'Vale'} onOpen={openFromHome} />
            </div>
          )}
          {tab === 'pedidos' && <OrdersAdmin key={`${ordersView?.filter}-${ordersView?.search}`} initialFilter={ordersView?.filter} initialSearch={ordersView?.search} />}
          {tab === 'sesiones' && <SessionsAdmin />}
          {tab === 'productos' && <ProductsAdmin />}
          {tab === 'ebooks' && <EbooksAdmin />}
          {tab === 'cursos' && <CoursesAdmin />}
          {tab === 'sakura' && <FaqsAdmin />}
          {tab === 'testimonios' && <TestimonialsAdmin />}
          {tab === 'pago' && <PaymentAdmin />}
        </div>
      </div>

      {/* Phone: bottom bar with the daily sections and the WhatsApp sale in the middle */}
      <nav aria-label="Secciones del panel" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-blanco/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
          {BAR.slice(0, 2).map((id) => <BarButton key={id} tab={TABS.find((item) => item.id === id)!} active={tab === id} badge={badge(id)} onClick={() => select(id)} />)}
          <li className="flex justify-center">
            <button type="button" onClick={() => openOverlay(() => setSale(''))} aria-label="Venta por WhatsApp" className="-mt-5 mb-1 flex flex-col items-center gap-0.5 font-display text-[10px] font-bold text-whatsapp">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg shadow-whatsapp/30 ring-4 ring-blanco"><WhatsAppIcon className="h-7 w-7" /></span>
              Venta
            </button>
          </li>
          <BarButton tab={TABS.find((item) => item.id === 'sesiones')!} active={tab === 'sesiones'} badge={badge('sesiones')} onClick={() => select('sesiones')} />
          <li>
            <button type="button" onClick={() => openOverlay(() => setMore(true))} aria-expanded={more} className={`relative flex w-full flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold ${!BAR.includes(tab) ? 'text-ciruela' : 'text-piedra'}`}>
              <Menu className={`h-5 w-5 ${!BAR.includes(tab) ? 'text-rosa' : ''}`} />Más
              {moreBadge > 0 && <span className="absolute right-4 top-1.5 h-2 w-2 rounded-full bg-rosa" />}
            </button>
          </li>
        </ul>
      </nav>

      {/* Computer: WhatsApp sale as a floating button (on the phone it sits in the middle of the bottom bar) */}
      <button type="button" onClick={() => openOverlay(() => setSale(''))} aria-label="Venta por WhatsApp" className="group fixed bottom-6 right-6 z-30 hidden h-14 items-center gap-2 rounded-full bg-whatsapp pl-4 pr-4 font-display text-sm font-bold text-white shadow-xl shadow-whatsapp/30 transition-all hover:pr-5 lg:flex">
        <WhatsAppIcon className="h-6 w-6 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-40 group-focus-visible:max-w-40">Venta por WhatsApp</span>
      </button>

      {/* "Más": the rest of the sections */}
      {more && (
        <Sheet title="Más secciones" onClose={closeOverlay}>
          <ul className="grid grid-cols-2 gap-2">
            {TABS.filter((item) => !BAR.includes(item.id)).map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button type="button" onClick={() => select(id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left font-display text-sm font-semibold ${tab === id ? 'border-rosa bg-petalo-wash text-ciruela' : 'border-line bg-white text-ink'}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-papel text-rosa"><Icon className="h-4 w-4" /></span>{label}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {/* Account */}
      {account && (
        <Sheet title="Tu cuenta" onClose={closeOverlay}>
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl} size="h-14 w-14" />
            <div className="min-w-0"><p className="truncate font-bold text-ink">{name}</p><p className="truncate text-sm text-piedra">{user.email}</p></div>
          </div>
          <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white">
            <li><a href="/" className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-ink"><ExternalLink className="h-4 w-4 text-rosa" />Ver la web</a></li>
            <li><a href="/cuenta?cliente" className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-ink"><UserRound className="h-4 w-4 text-rosa" />Ver mi cuenta como cliente</a></li>
            <li><button type="button" onClick={signOut} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-rosa-deep"><LogOut className="h-4 w-4" />Cerrar sesión</button></li>
          </ul>
        </Sheet>
      )}

      {incoming && <IncomingOrder order={incoming} onOpen={() => { setIncoming(null); select('pedidos', { filter: 'activos', search: '' }) }} onClose={() => setIncoming(null)} />}
      <UpdateBanner />
      {sale !== null && <WhatsappSaleDialog initialText={sale} onClose={closeOverlay} onSaved={() => setRefresh((value) => value + 1)} />}
    </div>
  )
}

/** Notice for an order that just came in through the web. Stays until opened or closed. */
function IncomingOrder({ order, onOpen, onClose }: { order: { number: number; name: string; total: number }; onOpen: () => void; onClose: () => void }) {
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ciruela p-3 pl-4 text-white shadow-2xl">
      <ShoppingBag className="h-5 w-5 shrink-0 text-petalo" />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block font-display text-sm font-bold">¡Nuevo pedido #{order.number}!</span>
        <span className="block truncate text-xs text-white/80">{order.name}{order.total ? ` · ${formatARS(order.total)}` : ''}</span>
      </button>
      <button type="button" onClick={onOpen} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-xs font-bold text-ciruela">Ver<ArrowRight className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 rounded-full p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
    </div>
  )
}

function AdminLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/isotipo.svg" alt="" className="h-9 w-9" />
      <span className="leading-none">
        <span className="block font-script text-2xl text-rosa">Armado de CV</span>
        <span className="block font-display text-[10px] font-bold uppercase tracking-[0.3em] text-ciruela">Admin</span>
      </span>
    </span>
  )
}

function BarButton({ tab, active, badge, onClick }: { tab: (typeof TABS)[number]; active: boolean; badge: number; onClick: () => void }) {
  const Icon = tab.icon
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`relative flex w-full flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-semibold ${active ? 'text-ciruela' : 'text-piedra'}`}>
        <Icon className={`h-5 w-5 ${active ? 'text-rosa' : ''}`} />{tab.label}
        {badge > 0 && <span className="absolute right-3 top-1 min-w-4 rounded-full bg-rosa px-1 text-center text-[10px] font-bold leading-4 text-white">{badge}</span>}
      </button>
    </li>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full rounded-t-[28px] bg-blanco px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-w-md sm:rounded-[28px] sm:pb-5" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-base font-bold text-ciruela">{title}</p>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-piedra hover:bg-papel" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
