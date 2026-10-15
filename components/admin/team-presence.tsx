'use client'

import { useCallback, useEffect, useState } from 'react'
import { cardClass } from './ui'
import { supabase } from '@/lib/supabase'

type Visit = { id: string; started_at: string; last_seen_at: string; ended_at: string | null }

const AR = 'America/Argentina/Buenos_Aires'
const hour = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: AR })
const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: AR })
const dayOf = (value: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: AR }).format(new Date(value))
// His app sends a signal every minute: without one for 2.5 minutes he is no longer there.
const ACTIVE_MS = 150 * 1000

function minutesLabel(ms: number) {
  const minutes = Math.max(Math.round(ms / 60000), 1)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim()
}
function dayLabel(value: string) {
  const day = dayOf(value)
  if (day === dayOf(new Date())) return 'Hoy'
  if (day === dayOf(new Date(Date.now() - 864e5))) return 'Ayer'
  return dayName.format(new Date(value))
}

/**
 * Only in Vale's panel: whether the team member has his panel open right now, and when he came in and left
 * (his app reports it; he doesn't see this). Updates live.
 */
export function TeamPresence({ memberId, name }: { memberId: string; name: string }) {
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    const { data } = await supabase.from('team_sessions').select('id, started_at, last_seen_at, ended_at').eq('member_id', memberId).order('started_at', { ascending: false }).limit(30)
    setVisits((data as Visit[] | null) ?? [])
  }, [memberId])

  useEffect(() => {
    load()
    const channel = supabase.channel(`presence-${memberId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'team_sessions' }, () => load()).subscribe()
    // The "active" state ages by itself even without new signals.
    const timer = window.setInterval(() => setTick((value) => value + 1), 30000)
    return () => { supabase.removeChannel(channel); window.clearInterval(timer) }
  }, [load, memberId])

  if (visits === null) return null
  const latest = visits[0]
  const active = Boolean(latest && !latest.ended_at && Date.now() - new Date(latest.last_seen_at).getTime() < ACTIVE_MS)
  // A visit still open without signals ended at its last signal (the tablet slept or lost the connection).
  const endOf = (visit: Visit) => (visit.ended_at ?? (visit === latest && active ? null : visit.last_seen_at))

  return (
    <section className={cardClass} aria-labelledby="presence-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="presence-title" className="font-display text-base font-bold text-ciruela">Conexión de {name}</h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold ${active ? 'bg-whatsapp/15 text-whatsapp' : 'bg-papel text-piedra'}`}>
          <span className={`h-2 w-2 rounded-full ${active ? 'animate-pulse bg-whatsapp' : 'bg-piedra/50'}`} />{active ? 'Activo ahora' : 'Desconectado'}
        </span>
      </div>
      <p className="mt-1 text-sm text-piedra">
        {!latest ? 'Todavía no entró al panel desde que se empezó a registrar.'
          : active ? `Entró a las ${hour.format(new Date(latest.started_at))} hs (hace ${minutesLabel(Date.now() - new Date(latest.started_at).getTime())}).`
          : `Última vez: ${dayLabel(endOf(latest)!).toLowerCase()} a las ${hour.format(new Date(endOf(latest)!))} hs.`}
      </p>
      {visits.length > 0 && (
        <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm">
          {visits.map((visit) => {
            const end = endOf(visit)
            return (
              <li key={visit.id} className="flex items-baseline justify-between gap-2 border-t border-line pt-1.5 first:border-0 first:pt-0">
                <span className="text-ink"><b className="font-semibold">{dayLabel(visit.started_at)}</b> · {hour.format(new Date(visit.started_at))} → {end ? hour.format(new Date(end)) : 'ahora'}</span>
                <span className="shrink-0 text-xs text-piedra">{minutesLabel((end ? new Date(end).getTime() : Date.now()) - new Date(visit.started_at).getTime())}</span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-piedra">Solo lo ves vos. Cuenta mientras tiene el panel abierto en pantalla.</p>
    </section>
  )
}
