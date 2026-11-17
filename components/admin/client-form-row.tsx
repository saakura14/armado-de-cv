'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, ClipboardList, Copy, ExternalLink, FileText, Link2, X } from 'lucide-react'
import { clientFormUrl, formFileLabel, formNeeds, formTarget, formatAnswers, oneForm, questionsFor, takesForm, unseenForm, type ClientForm } from '@/lib/client-form'
import { formatDate, type Order } from '@/lib/orders'
import { sourceLabel } from '@/lib/source-files'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, useBackdropClose, useFlash } from './ui'

/** What the customer answered in their form (armadodecv.com/datos/…), to read it, open the files and copy it all. */
function ClientFormDialog({ order, firstName, onClose, onSeen }: { order: Order; firstName: string; onClose: () => void; onSeen: () => void }) {
  const backdrop = useBackdropClose(onClose)
  const [form, setForm] = useState<ClientForm | null | undefined>(undefined)
  const [copied, setCopied] = useState(false)
  const flash = useFlash()
  const needs = formNeeds(order.order_items.map((item) => item.product_id))
  // The board reloads often; the latest callback, without reloading the form each time.
  const seen = useRef(onSeen)
  seen.current = onSeen

  useEffect(() => {
    supabase.from('client_forms').select('token, answers, files, photo, submitted_at, seen_at, updated_at').eq('order_id', order.id).maybeSingle().then(async ({ data }) => {
      const row = data as ClientForm | null
      setForm(row)
      // Opening it is reading it: it leaves "Hoy" until the customer sends it again.
      if (unseenForm(row)) {
        await supabase.from('client_forms').update({ seen_at: new Date().toISOString() }).eq('order_id', order.id)
        seen.current()
      }
    })
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [order.id, onClose])

  async function open(path: string) {
    const { data, error } = await supabase.storage.from('cv-sources').createSignedUrl(path, 300)
    if (error || !data) flash.show('error', /not found|no existe/i.test(errorMessage(error)) ? 'Ese archivo ya no está: se borra al asignar el CV al equipo.' : errorMessage(error))
    else window.open(data.signedUrl, '_blank', 'noopener')
  }

  function copyAll() {
    if (!form) return
    const target = formTarget(form.answers)
    const text = [target ? `PUESTO OBJETIVO\n${target}` : '', formatAnswers(form.answers, needs)].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }, () => flash.show('error', 'No se pudo copiar.'))
  }

  const answered = form ? questionsFor(needs).filter((question) => form.answers[question.id]?.trim()) : []
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ciruela/55 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="client-form-title" {...backdrop}>
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-blanco shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 bg-ciruela px-5 py-4 text-white sm:px-7">
          <div>
            <p id="client-form-title" className="flex items-center gap-2 font-display text-lg font-bold"><ClipboardList className="h-5 w-5" />Datos de {firstName}</p>
            <p className="text-sm text-white/85">Pedido #{order.number}{form?.submitted_at ? ` · enviados el ${formatDate(form.submitted_at, true)}` : form?.updated_at ? ' · todavía no los envió (guardado a medias)' : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {form === undefined && <p className="text-sm text-piedra">Cargando…</p>}
          {form && <p className="rounded-2xl bg-papel px-4 py-3 text-sm text-ink">Estas respuestas y el CV que subió vienen cargados solos en <b>Textos con Claude</b> (si todavía no los pediste para este pack).</p>}
          {form && (form.files.length > 0 || form.photo) && (
            <ul className="space-y-1.5">
              {form.files.map((path) => (
                <li key={path}><button type="button" onClick={() => open(path)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm hover:bg-papel"><span className="flex min-w-0 items-center gap-1.5"><FileText className="h-4 w-4 shrink-0 text-rosa" /><span className="truncate">{path.includes('/whatsapp/') ? `${sourceLabel(path)} · de WhatsApp` : formFileLabel(path)}</span></span><ExternalLink className="h-4 w-4 shrink-0 text-piedra" /></button></li>
              ))}
              {form.photo && <li><button type="button" onClick={() => open(form.photo!)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm hover:bg-papel"><span className="flex min-w-0 items-center gap-1.5"><Camera className="h-4 w-4 shrink-0 text-rosa" /><span className="truncate">Foto para el CV · {formFileLabel(form.photo)}</span></span><ExternalLink className="h-4 w-4 shrink-0 text-piedra" /></button></li>}
            </ul>
          )}
          {form?.answers.first_job && <p className="text-sm font-semibold text-ink">Busca su primer empleo.</p>}
          {answered.map((question) => (
            <section key={question.id}>
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-piedra">{question.label}</h3>
              <p className="mt-1 select-text whitespace-pre-wrap rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink">{form!.answers[question.id]}</p>
            </section>
          ))}
          {form && !answered.length && !form.files.length && <p className="text-sm text-piedra">Todavía no completó nada.</p>}
        </div>
        <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
          {flash.node && <div className="mb-2">{flash.node}</div>}
          <Button className="w-full" disabled={!answered.length} onClick={copyAll}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? '¡Copiado!' : 'Copiar todas las respuestas'}</Button>
        </div>
      </div>
    </div>
  )
}

/** On CV and LinkedIn orders: whether the customer filled in their form, the link to send them and their answers. */
export function ClientFormRow({ order, firstName, onChanged }: { order: Order; firstName: string; onChanged: () => void }) {
  const [viewing, setViewing] = useState(false)
  const close = useCallback(() => setViewing(false), [])
  const flash = useFlash()
  const form = oneForm(order.client_forms)
  const ids = order.order_items.map((item) => item.product_id)
  const going = ['pending_payment', 'payment_review', 'paid', 'in_progress'].includes(order.status) || (order.status === 'delivered' && order.linkedin_pending)
  if (!form || !takesForm(ids) || !going) return null

  const fresh = unseenForm(form)
  // Files Vale shared from WhatsApp count as material even if the customer never opened the form.
  const shared = (form.files ?? []).filter((path) => path.includes('/whatsapp/')).length
  const state = form.submitted_at
    ? { label: `${fresh ? 'Nuevos · ' : ''}Recibidos el ${formatDate(form.submitted_at)}`, tone: fresh ? 'bg-rosa text-white' : 'bg-whatsapp/15 text-whatsapp' }
    : form.updated_at ? { label: 'Lo empezó, no lo envió', tone: 'bg-arena text-ciruela' }
      : shared ? { label: `Sin completar · ${shared} ${shared === 1 ? 'archivo' : 'archivos'} de WhatsApp`, tone: 'bg-arena text-ciruela' }
        : { label: 'Sin completar', tone: 'bg-papel text-piedra' }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(clientFormUrl(form!.token))
      flash.show('ok', 'Link copiado: pegalo en WhatsApp.')
    } catch {
      flash.show('error', 'No se pudo copiar.')
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line px-3.5 py-2.5">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-piedra"><ClipboardList className="h-3.5 w-3.5 text-rosa" />Datos del cliente
          <span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${state.tone}`}>{state.label}</span>
        </p>
        <span className="flex flex-wrap gap-1.5">
          <button type="button" onClick={copyLink} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-3 font-display text-xs font-bold text-ciruela hover:bg-papel"><Link2 className="h-3.5 w-3.5 text-rosa" />Copiar link</button>
          {(form.submitted_at || form.updated_at || shared > 0) && <button type="button" onClick={() => setViewing(true)} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-rosa/40 px-3 font-display text-xs font-bold text-rosa-deep hover:bg-petalo-wash"><FileText className="h-3.5 w-3.5" />Ver datos</button>}
        </span>
      </div>
      {flash.node && <div className="mt-2">{flash.node}</div>}
      {viewing && <ClientFormDialog order={order} firstName={firstName} onClose={close} onSeen={onChanged} />}
    </div>
  )
}

