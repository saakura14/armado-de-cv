'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CalendarClock, ChevronRight, Download, Loader2, LogOut, PlayCircle, Settings, Video } from 'lucide-react'
import { AuthPanel } from '@/components/auth-panel'
import { formatARS } from '@/lib/catalog'
import { ORDER_SELECT, STATUS, formatDate, type Order } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'

type EbookAccess = { ebook_id: string; ebooks: { title: string; description: string | null; file_path: string | null } | null }
type CourseAccess = { course_id: string; expires_at: string; courses: { id: string; title: string; description: string | null; cover_url: string | null } | null }
type Session = { id: string; title: string; duration_minutes: number; status: 'to_schedule' | 'scheduled' | 'done' | 'cancelled'; scheduled_at: string | null; meet_url: string | null }

const card = 'rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)]'

export default function AccountPage() {
  const { user, profile, setProfile, ready, isAdmin } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [ebooks, setEbooks] = useState<EbookAccess[]>([])
  const [courses, setCourses] = useState<CourseAccess[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const [o, e, c, s] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }),
      supabase.from('ebook_access').select('ebook_id, ebooks(title, description, file_path)').order('granted_at', { ascending: false }),
      supabase.from('course_access').select('course_id, expires_at, courses(id, title, description, cover_url)').order('granted_at', { ascending: false }),
      supabase.from('sessions').select('*').order('created_at', { ascending: false }),
    ])
    setOrders((o.data as Order[] | null) ?? [])
    setEbooks((e.data as unknown as EbookAccess[] | null) ?? [])
    setCourses((c.data as unknown as CourseAccess[] | null) ?? [])
    setSessions((s.data as Session[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (user) load() }, [user, load])
  useEffect(() => { if (profile) { setName(profile.full_name ?? ''); setPhone(profile.phone ?? '') } }, [profile])

  async function download(item: EbookAccess) {
    if (!item.ebooks?.file_path) { setError('Este e-book todavía no está disponible para descargar. Escribime y te lo envío.'); return }
    setDownloading(item.ebook_id); setError('')
    // The function stamps the buyer's email and order number on every page.
    const { data, error: downloadError } = await supabase.functions.invoke('ebook-download', { body: { ebook_id: item.ebook_id } })
    setDownloading('')
    if (downloadError || !(data instanceof Blob)) {
      const context = (downloadError as { context?: Response } | null)?.context
      const detail = context ? await context.json().then((body: { error?: string }) => body.error).catch(() => null) : null
      setError(detail ?? errorMessage(downloadError ?? 'No se pudo descargar el e-book.'))
      return
    }
    const extension = item.ebooks.file_path.split('.').pop() ?? 'pdf'
    const link = document.createElement('a')
    link.href = URL.createObjectURL(data)
    link.download = `${item.ebooks.title}.${extension}`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 10000)
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    const { data, error: updateError } = await supabase.from('profiles').update({ full_name: name.trim() || null, phone: phone.trim() || null }).eq('id', user.id).select().single()
    if (updateError) { setError(errorMessage(updateError)); return }
    setProfile(data)
    setSaved(true); window.setTimeout(() => setSaved(false), 2000)
  }

  if (!ready) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="bg-arena/40 px-4 py-16"><AuthPanel title="Mi cuenta" text="Ingresá para ver tus pedidos, descargar tus e-books y acceder a tus cursos." /></section>

  const upcoming = sessions.filter((session) => session.status === 'to_schedule' || session.status === 'scheduled')
  const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-rosa'

  return (
    <section className="bg-arena/40 px-4 py-10 sm:px-6 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-script text-5xl leading-none text-rosa">Hola{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</p>
            <p className="mt-1 text-sm text-piedra">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ciruela px-4 py-2 font-display text-sm font-bold text-white"><Settings className="h-4 w-4" />Panel de administración</Link>}
            <button type="button" onClick={() => supabase.auth.signOut()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-display text-sm font-semibold text-ciruela"><LogOut className="h-4 w-4" />Salir</button>
          </div>
        </div>

        {error && <p role="alert" className="mt-6 rounded-xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div> : (
          <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-5">
              {upcoming.length > 0 && (
                <div className={card}>
                  <h2 className="flex items-center gap-2 font-bold text-ciruela"><Video className="h-5 w-5 text-rosa" />Mis sesiones por Google Meet</h2>
                  <ul className="mt-4 space-y-3">
                    {upcoming.map((session) => (
                      <li key={session.id} className="rounded-2xl bg-papel p-4">
                        <p className="font-semibold text-ink">{session.title}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-piedra"><CalendarClock className="h-4 w-4" />{session.scheduled_at ? formatDate(session.scheduled_at, true) : 'Coordinamos día y horario por WhatsApp'} · {session.duration_minutes} min</p>
                        {session.meet_url && <a href={session.meet_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-ciruela px-4 py-2 font-display text-sm font-bold text-white"><Video className="h-4 w-4" />Entrar a la videollamada</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div id="ebooks" className={`${card} scroll-mt-28`}>
                <h2 className="flex items-center gap-2 font-bold text-ciruela"><BookOpen className="h-5 w-5 text-rosa" />Mis e-books</h2>
                {ebooks.length === 0 ? <p className="mt-3 text-sm text-piedra">Cuando confirme el pago de un e-book, lo vas a poder descargar desde acá. <Link href="/asesorias#precios" className="font-semibold text-rosa-deep underline">Ver e-books</Link></p> : (
                  <ul className="mt-4 divide-y divide-line">
                    {ebooks.map((item) => (
                      <li key={item.ebook_id} className="flex items-center justify-between gap-4 py-3">
                        <div><p className="font-semibold text-ink">{item.ebooks?.title}</p>{item.ebooks?.description && <p className="text-sm text-piedra">{item.ebooks.description}</p>}</div>
                        <button type="button" onClick={() => download(item)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-ciruela px-4 py-2 font-display text-sm font-bold text-white hover:bg-rosa">
                          {downloading === item.ebook_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Descargar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {courses.length > 0 && (
                <div className={card}>
                  <h2 className="flex items-center gap-2 font-bold text-ciruela"><PlayCircle className="h-5 w-5 text-rosa" />Mis cursos</h2>
                  <ul className="mt-4 space-y-2">
                    {courses.map((item) => item.courses && (
                      <li key={item.course_id}>
                        <Link href={`/cuenta/curso/${item.course_id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-papel p-4 hover:bg-petalo-wash">
                          <span><span className="block font-semibold text-ink">{item.courses.title}</span><span className="text-sm text-piedra">{new Date(item.expires_at) > new Date() ? `Disponible hasta el ${formatDate(item.expires_at)}` : 'Acceso vencido'}</span></span>
                          <ChevronRight className="h-5 w-5 shrink-0 text-rosa" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={card}>
                <h2 className="font-bold text-ciruela">Mis pedidos</h2>
                {orders.length === 0 ? <p className="mt-3 text-sm text-piedra">Todavía no hiciste ningún pedido.</p> : (
                  <ul className="mt-3 divide-y divide-line">
                    {orders.map((order) => (
                      <li key={order.id}>
                        <Link href={`/cuenta/pedido/${order.id}`} className="flex items-center justify-between gap-3 py-3">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">#{order.number} · {order.order_items.map((item) => item.product_name).join(' + ')}</span>
                            <span className="text-sm text-piedra">{formatDate(order.created_at)} · {formatARS(order.total)}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2.5 py-1 font-display text-[11px] font-bold ${STATUS[order.status].tone}`}>{STATUS[order.status].label}</span><ChevronRight className="h-4 w-4 text-piedra" /></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <form onSubmit={saveProfile} className={card}>
              <h2 className="font-bold text-ciruela">Mis datos</h2>
              <label className="mt-4 block text-sm font-semibold text-ciruela">Nombre y apellido<input value={name} onChange={(event) => setName(event.target.value)} className={input} /></label>
              <label className="mt-3 block text-sm font-semibold text-ciruela">WhatsApp<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className={input} /></label>
              <button className="mt-4 min-h-10 w-full rounded-full border border-ciruela px-4 py-2 font-display text-sm font-bold text-ciruela hover:bg-ciruela hover:text-white">{saved ? '¡Guardado!' : 'Guardar'}</button>
              <Link href="/cuenta/nueva-clave" className="mt-3 block text-center text-sm font-semibold text-rosa-deep hover:underline">Cambiar contraseña</Link>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}
