'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, FileSearch } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { CHECK_LABELS, type CheckId } from '@/lib/ats-check'
import { ROLE_AREAS } from '@/lib/ats-roles'
import { errorMessage, supabase } from '@/lib/supabase'
import { openBusinessWhatsapp, waLink } from './orders-admin'
import { cardClass, useFlash } from './ui'

type Lead = { id: string; created_at: string; name: string; phone: string; score: number; issues: CheckId[]; has_job_ad: boolean; area: string | null; attempts: number; contacted_at: string | null }

const scoreTone = (score: number) => (score >= 85 ? 'bg-[#1f9d5a]' : score >= 65 ? 'bg-[#d69e2e]' : 'bg-rosa')

function message(lead: Lead) {
  const first = lead.name.trim().split(/\s+/)[0]
  const top = lead.issues.slice(0, 2).map((id) => CHECK_LABELS[id]?.toLowerCase()).filter(Boolean)
  return `¡Hola ${first}! Soy Vale, de Armado de CV 🌸 Vi que hiciste el test ATS y tu CV sacó ${lead.score}/100.${top.length ? ` Lo que más le suma corregir: ${top.join(' y ')}.` : ''} ¿Querés que te lo deje listo para pasar los filtros? Te cuento cómo trabajo.`
}

/** People who did the free ATS test (/test-ats) and left their WhatsApp: who to write to, with the message ready. */
export function AtsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pendingOnly, setPendingOnly] = useState(true)
  const flash = useFlash()

  const load = useCallback(async () => {
    const { data } = await supabase.from('ats_checks').select('*').order('created_at', { ascending: false }).limit(300)
    setLeads((data as Lead[] | null) ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleContacted(lead: Lead) {
    const { error } = await supabase.from('ats_checks').update({ contacted_at: lead.contacted_at ? null : new Date().toISOString() }).eq('id', lead.id)
    if (error) flash.show('error', errorMessage(error)); else load()
  }

  const shown = pendingOnly ? leads.filter((lead) => !lead.contacted_at) : leads
  const average = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0

  return (
    <div className="space-y-4">
      <div className={`${cardClass} flex flex-wrap items-center gap-x-8 gap-y-2`}>
        <p className="flex items-center gap-2 font-display font-bold text-ciruela"><FileSearch className="h-5 w-5 text-rosa" />Test ATS gratis</p>
        <p className="text-sm text-piedra"><b className="text-ciruela">{leads.length}</b> personas · <b className="text-ciruela">{leads.filter((lead) => !lead.contacted_at).length}</b> sin escribir · puntaje promedio <b className="text-ciruela">{average}</b></p>
        <a href="/test-ats" target="_blank" rel="noreferrer" className="text-sm font-semibold text-rosa-deep hover:underline">Ver el test</a>
        <label className="ml-auto flex items-center gap-2 text-sm text-piedra"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} className="accent-rosa" />Solo sin escribir</label>
      </div>
      {loaded && shown.length === 0 && <p className="text-sm text-piedra">{leads.length === 0 ? 'Todavía nadie hizo el test. Compartí armadodecv.com/test-ats en historias y en tus publicaciones.' : 'Ya les escribiste a todos. 🎉'}</p>}
      <ul className="grid gap-3 lg:grid-cols-2">
        {shown.map((lead) => {
          const link = waLink(lead.phone, message(lead))
          return (
            <li key={lead.id} className={`${cardClass} ${lead.contacted_at ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-display font-extrabold text-white ${scoreTone(lead.score)}`}>{lead.score}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-ciruela">{lead.name}</p>
                  <p className="text-xs text-piedra">{new Date(lead.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{lead.area ? ` · ${ROLE_AREAS.find((item) => item.id === lead.area)?.label ?? 'Otra área'}` : ''}{lead.has_job_ad ? ' · con aviso' : ''}{lead.attempts > 1 ? ` · lo intentó ${lead.attempts} veces` : ''}</p>
                  {lead.issues.length > 0 && <p className="mt-1 text-sm text-ink">{lead.issues.map((id) => CHECK_LABELS[id] ?? id).join(' · ')}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {link && <a href={link} onClick={(event) => openBusinessWhatsapp(event, link)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-whatsapp px-4 py-2 font-display text-sm font-bold text-white"><WhatsAppIcon className="h-4 w-4" />Escribirle</a>}
                <button type="button" onClick={() => toggleContacted(lead)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 py-2 font-display text-sm font-bold text-ciruela hover:border-ciruela"><Check className="h-4 w-4" />{lead.contacted_at ? 'Marcar sin escribir' : 'Ya le escribí'}</button>
              </div>
            </li>
          )
        })}
      </ul>
      {flash.node}
    </div>
  )
}
