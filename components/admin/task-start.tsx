'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { errorMessage, supabase } from '@/lib/supabase'
import type { TaskStatus } from '@/lib/team'

const AR = 'America/Argentina/Buenos_Aires'
const hourFormat = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: AR })
const dayFormat = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: AR })

/** "hoy a las 12:01 hs", "ayer a las 18:30 hs" or "el 10/10 a las 9:05 hs", in Argentina time. */
export function startedLabel(value: string) {
  const date = new Date(value)
  const day = (moment: Date) => dayFormat.format(moment)
  const when = day(date) === day(new Date()) ? 'hoy' : day(date) === day(new Date(Date.now() - 864e5)) ? 'ayer' : `el ${day(date)}`
  return `${when} a las ${hourFormat.format(date)} hs`
}

/**
 * When the team member pressed "Empezar" (or copied a text), so Vale can tell a real start from a mistaken tap.
 * While it is in progress she can reset it: it goes back to "Para hacer" and the clock starts again on his next "Empezar".
 */
export function TaskStart({ task, onChanged }: { task: { id: string; order_number?: number; status: TaskStatus; started_at: string | null }; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!task.started_at || task.status === 'asignado') return null

  async function reset() {
    if (!window.confirm(`¿Reiniciar${task.order_number ? ` el CV del pedido #${task.order_number}` : ' este CV'}? Vuelve a "Para hacer" y el tiempo arranca de nuevo cuando toque "Empezar".`)) return
    setBusy(true)
    const { error: resetError } = await supabase.from('team_tasks').update({ status: 'asignado', started_at: null, progress: {}, progress_at: null }).eq('id', task.id).eq('status', 'haciendo')
    setBusy(false)
    if (resetError) { setError(errorMessage(resetError)); return }
    setError('')
    onChanged()
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-piedra">
      <span>▶ Empezó {startedLabel(task.started_at)}</span>
      {task.status === 'haciendo' && (
        <button type="button" disabled={busy} onClick={reset} className="inline-flex items-center gap-1 font-semibold text-rosa-deep hover:underline disabled:opacity-50">
          <RotateCcw className="h-3 w-3" />Reiniciar
        </button>
      )}
      {error && <span className="text-rosa-deep">{error}</span>}
    </span>
  )
}
