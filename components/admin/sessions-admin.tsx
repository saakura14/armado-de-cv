'use client'

import { useCallback, useEffect, useState } from 'react'
import { Video } from 'lucide-react'
import { formatDate } from '@/lib/orders'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

type Session = {
  id: string; order_id: string; user_id: string; title: string; duration_minutes: number
  status: 'to_schedule' | 'scheduled' | 'done' | 'cancelled'; scheduled_at: string | null; meet_url: string | null; admin_note: string | null
  orders: { number: number; customer_name: string | null; customer_phone: string | null } | null
}

const LABEL: Record<Session['status'], string> = { to_schedule: 'A coordinar', scheduled: 'Agendada', done: 'Realizada', cancelled: 'Cancelada' }

/** datetime-local works in local time; the DB stores UTC. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function SessionCard({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const [when, setWhen] = useState(toLocalInput(session.scheduled_at))
  const [url, setUrl] = useState(session.meet_url ?? '')
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  async function save(status?: Session['status']) {
    setBusy(true)
    const { error } = await supabase.rpc('admin_update_session', {
      p_session: session.id,
      p_scheduled_at: when ? new Date(when).toISOString() : null,
      p_meet_url: url.trim() || null,
      p_status: status ?? null,
      p_note: null,
    })
    setBusy(false)
    if (error) flash.show('error', errorMessage(error))
    else { flash.show('ok', 'Guardado. El cliente ya lo ve en "Mi cuenta".'); onChanged() }
  }

  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ink">{session.title}</p>
          <p className="text-sm text-piedra">Pedido #{session.orders?.number} · {session.orders?.customer_name ?? 'Cliente'}{session.orders?.customer_phone ? ` · ${session.orders.customer_phone}` : ''} · {session.duration_minutes} min</p>
        </div>
        <span className="rounded-full bg-arena px-3 py-1 font-display text-xs font-bold text-ciruela">{LABEL[session.status]}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Día y hora"><input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={inputClass} /></Field>
        <Field label="Link de Google Meet"><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://meet.google.com/..." className={inputClass} /></Field>
      </div>
      <p className="mt-2 text-xs text-piedra">Tip: en Google Calendar creá el evento con &quot;Agregar videoconferencia de Google Meet&quot; e invitá al cliente; pegá acá el link.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button busy={busy} onClick={() => save()}>Guardar</Button>
        {session.status !== 'done' && <Button variant="secondary" onClick={() => save('done')}>Marcar realizada</Button>}
        {session.status !== 'cancelled' && <Button variant="danger" onClick={() => save('cancelled')}>Cancelar</Button>}
        {session.meet_url && <a href={session.meet_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 py-2 font-display text-sm font-bold text-ciruela"><Video className="h-4 w-4" />Abrir Meet</a>}
      </div>
      {session.scheduled_at && <p className="mt-2 text-xs text-piedra">Agendada para el {formatDate(session.scheduled_at, true)} (hora Argentina)</p>}
      {flash.node && <div className="mt-3">{flash.node}</div>}
    </li>
  )
}

export function SessionsAdmin() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showPast, setShowPast] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    let query = supabase.from('sessions').select('*, orders(number, customer_name, customer_phone)').order('scheduled_at', { ascending: true, nullsFirst: true })
    if (!showPast) query = query.in('status', ['to_schedule', 'scheduled'])
    const { data } = await query
    setSessions((data as Session[] | null) ?? [])
    setLoading(false)
  }, [showPast])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-piedra"><input type="checkbox" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} className="accent-rosa" />Mostrar realizadas y canceladas</label>
      {!loading && sessions.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-white p-8 text-center text-piedra">No hay sesiones pendientes. Se crean solas cuando aprobás el pago de un pack con sesión 1 a 1 o de un test con devolución por Meet.</p>
      ) : (
        <ul className="mt-5 grid gap-4 xl:grid-cols-2">{sessions.map((session) => <SessionCard key={session.id} session={session} onChanged={load} />)}</ul>
      )}
    </div>
  )
}
