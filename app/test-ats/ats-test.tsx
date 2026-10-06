'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Lock, RotateCcw, XCircle } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { analyzeCv, readPdf, type AtsResult } from '@/lib/ats-check'
import { whatsappUrl } from '@/lib/catalog'
import { track } from '@/lib/pixel'
import { errorMessage, supabase } from '@/lib/supabase'

type Stage = 'subir' | 'leyendo' | 'puntaje' | 'detalle' | 'usado'

const verdict = (score: number) =>
  score >= 85 ? { tone: 'text-[#128c4a]', ring: '#1f9d5a', title: '¡Tu CV está bien preparado para los filtros!', text: 'Pasa los puntos básicos de un ATS. Ahora la diferencia está en cómo contás tu experiencia y en tu LinkedIn.' }
    : score >= 65 ? { tone: 'text-[#b7791f]', ring: '#d69e2e', title: 'Tu CV puede quedar afuera en algunos filtros', text: 'Tiene una buena base, pero hay detalles que hacen que algunos sistemas lo descarten o lo ordenen abajo.' }
      : { tone: 'text-rosa-deep', ring: '#c9506d', title: 'Tu CV probablemente no está pasando los filtros', text: 'Por eso puede que no te llamen aunque tengas el perfil: el sistema lo descarta antes de que lo vea una persona.' }

/** Free ATS test: reads the PDF in the browser, shows the score, and unlocks the detail with name and WhatsApp. */
export function AtsTest() {
  const [stage, setStage] = useState<Stage>('subir')
  const [ad, setAd] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<AtsResult | null>(null)
  const [error, setError] = useState('')
  const [lead, setLead] = useState({ name: '', phone: '', ok: false })
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function analyze(file: File | undefined) {
    if (!file) return
    setError('')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError('Subí tu CV en PDF. Si lo tenés en Word o Google Docs: Archivo → Descargar → PDF.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('El archivo pesa más de 10 MB. Exportalo de nuevo como PDF y probá otra vez.'); return }
    setFileName(file.name)
    setStage('leyendo')
    try {
      const data = await readPdf(file)
      setResult(analyzeCv(data, ad))
      setStage('puntaje')
      track('ViewContent', { content_name: 'Test ATS' })
    } catch {
      setError('No pude abrir ese PDF. Probá exportarlo de nuevo o subí otro archivo.')
      setStage('subir')
    }
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault()
    if (!result) return
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('ats_check_submit', { p_name: lead.name, p_phone: lead.phone, p_score: result.score, p_issues: result.failed, p_has_job_ad: Boolean(result.keywords) })
    setBusy(false)
    if (rpcError) { setError(errorMessage(rpcError)); return }
    track('Lead', { content_name: 'Test ATS', value: result.score })
    setStage((data as { first: boolean }).first ? 'detalle' : 'usado')
  }

  function restart() {
    setResult(null); setFileName(''); setStage('subir'); setError('')
    if (input.current) input.current.value = ''
  }

  if (stage === 'subir' || stage === 'leyendo') {
    return (
      <div className="rounded-[32px] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(67,32,44,0.55)] sm:p-8">
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-rosa/40 bg-petalo-wash/50 px-6 py-10 text-center transition-colors hover:border-rosa ${stage === 'leyendo' ? 'pointer-events-none opacity-70' : ''}`}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); analyze(event.dataTransfer.files[0]) }}>
          {stage === 'leyendo' ? <Loader2 className="h-10 w-10 animate-spin text-rosa" /> : <FileUp className="h-10 w-10 text-rosa" />}
          <span className="font-display text-lg font-bold text-ciruela">{stage === 'leyendo' ? `Analizando ${fileName}…` : 'Subí tu CV en PDF'}</span>
          <span className="text-sm text-piedra">{stage === 'leyendo' ? 'Lo leo como lo leería un sistema ATS.' : 'Tocá acá o arrastralo. Máximo 10 MB.'}</span>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => analyze(event.target.files?.[0])} />
        </label>
        <label className="mt-5 block">
          <span className="font-display text-sm font-bold text-ciruela">Opcional: pegá el aviso al que te querés postular</span>
          <span className="block text-xs text-piedra">Así te digo cuántas palabras clave del aviso tiene tu CV.</span>
          <textarea rows={4} value={ad} onChange={(event) => setAd(event.target.value)} placeholder="Ej: Buscamos analista administrativo/a con manejo de Excel avanzado, SAP, facturación…" className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-rosa sm:text-sm" />
        </label>
        <p className="mt-4 flex items-start gap-2 text-xs text-piedra"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />Tu CV se analiza en tu propio celu o compu: no se sube a ningún servidor ni se guarda.</p>
        {error && <p className="mt-4 rounded-2xl bg-rosa/10 px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}
      </div>
    )
  }

  if (!result) return null
  const view = verdict(result.score)
  const failed = result.checks.filter((check) => !check.ok)
  const passed = result.checks.filter((check) => check.ok)
  const sales = whatsappUrl(`¡Hola Vale! Hice el test ATS en la web y mi CV sacó ${result.score}/100. Quiero que me ayudes a mejorarlo.`)

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(67,32,44,0.55)] sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${view.ring} ${result.score * 3.6}deg, #f3e7e9 0deg)` }}>
            <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
              <span className="font-display text-4xl font-extrabold text-ciruela">{result.score}<span className="text-lg text-piedra">/100</span></span>
            </div>
          </div>
          <div>
            <p className={`font-display text-xl font-extrabold leading-tight ${view.tone}`}>{view.title}</p>
            <p className="mt-2 text-piedra">{view.text}</p>
            {result.cap && <p className="mt-2 flex items-start gap-2 rounded-xl bg-rosa/10 px-3 py-2 text-left text-sm font-semibold text-rosa-deep"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{result.cap}</p>}
            <p className="mt-2 text-sm font-semibold text-ciruela">{failed.length === 0 ? 'No encontré problemas en los puntos que reviso.' : `Encontré ${failed.length} ${failed.length === 1 ? 'cosa' : 'cosas'} para corregir.`}</p>
          </div>
        </div>
      </div>

      {stage === 'puntaje' && (
        <form onSubmit={unlock} className="rounded-[32px] bg-ciruela p-5 text-white sm:p-8">
          <p className="font-script text-4xl leading-none text-petalo">Mirá qué corregir</p>
          <p className="mt-2 text-white/85">Dejame tu nombre y tu WhatsApp y te muestro el detalle de cada punto, con cómo arreglarlo. Es 1 análisis gratis por persona.</p>
          <ul className="mt-4 space-y-2 blur-[3px] select-none" aria-hidden="true">
            {failed.slice(0, 3).map((check) => <li key={check.id} className="flex items-center gap-2 text-sm"><XCircle className="h-4 w-4 text-petalo" />{check.title}</li>)}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input required minLength={2} maxLength={80} value={lead.name} onChange={(event) => setLead((c) => ({ ...c, name: event.target.value }))} placeholder="Tu nombre" autoComplete="given-name" className="rounded-2xl border-0 bg-white px-4 py-3 text-base text-ink outline-none" />
            <input required inputMode="tel" value={lead.phone} onChange={(event) => setLead((c) => ({ ...c, phone: event.target.value }))} placeholder="Tu WhatsApp (ej: 11 2345-6789)" autoComplete="tel" className="rounded-2xl border-0 bg-white px-4 py-3 text-base text-ink outline-none" />
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-white/80">
            <input type="checkbox" required checked={lead.ok} onChange={(event) => setLead((c) => ({ ...c, ok: event.target.checked }))} className="mt-0.5 accent-rosa" />
            <span>Acepto que Armado de CV me escriba por WhatsApp sobre mi CV. Ver <Link href="/privacidad" className="underline">política de privacidad</Link>.</span>
          </label>
          {error && <p className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">{error}</p>}
          <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-rosa px-6 py-3 font-display font-bold text-white transition-colors hover:bg-rosa-deep disabled:opacity-60 sm:w-auto">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Ver mi resultado completo
          </button>
          <p className="mt-4 text-sm text-white/80">¿Preferís una revisión honesta, hecha por mí? <Link href="/#precios" className="font-bold text-petalo underline">Elegí tu pack</Link> y te dejo el CV listo para postular.</p>
        </form>
      )}

      {stage === 'usado' && (
        <div className="rounded-[32px] bg-papel p-5 sm:p-8">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-ciruela"><AlertTriangle className="h-5 w-5 text-rosa" />Ya usaste tu análisis gratis con este número</p>
          <p className="mt-2 text-piedra">El detalle se muestra una sola vez por persona. Si querés que revise tu CV y lo deje listo para pasar los filtros, escribime y lo vemos juntos.</p>
        </div>
      )}

      {stage === 'detalle' && (
        <div className="rounded-[32px] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(67,32,44,0.55)] sm:p-8">
          <p className="font-script text-4xl leading-none text-rosa">Tu resultado, punto por punto</p>
          {failed.length > 0 && (
            <ul className="mt-5 space-y-3">
              {failed.map((check) => (
                <li key={check.id} className="rounded-2xl bg-rosa/5 p-4">
                  <p className="flex items-start gap-2 font-display font-bold text-ciruela"><XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />{check.title}</p>
                  <p className="mt-1 pl-7 text-sm leading-relaxed text-ink">{check.detail}</p>
                  {check.id === 'palabras' && result.keywords && <p className="mt-2 pl-7 text-sm text-piedra">Te faltan: <b className="text-ciruela">{result.keywords.missing.join(', ')}</b></p>}
                </li>
              ))}
            </ul>
          )}
          {passed.length > 0 && (
            <ul className="mt-5 space-y-2">
              {passed.map((check) => <li key={check.id} className="flex items-start gap-2 text-sm text-piedra"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1f9d5a]" /><span><b className="text-ciruela">{check.title}.</b> {check.detail}</span></li>)}
            </ul>
          )}
          <p className="mt-5 text-xs text-piedra">Resultado orientativo y automático: cada empresa usa un sistema distinto. Para una revisión profesional de tu CV, hecha por una persona, elegí un pack.</p>
        </div>
      )}

      {stage !== 'puntaje' && (
        <div className="rounded-[32px] bg-petalo-wash p-5 sm:p-8">
          <p className="font-display text-xl font-extrabold text-ciruela">{result.score >= 85 ? '¿Querés una opinión honesta de verdad?' : '¿Querés que lo deje listo por vos?'}</p>
          <p className="mt-2 text-ink"><b className="text-ciruela">Este test es una guía automática:</b> mira el formato y los puntos básicos, pero no sabe si tu experiencia está bien contada, si tu perfil vende ni si convencés a un reclutador. Eso lo reviso yo, persona a persona, en cada pack.</p>
          <p className="mt-2 text-ink">{result.score >= 85
            ? 'Con el Pack Premium reviso y potencio tu CV, y sumás tu perfil de LinkedIn y la carta de presentación.'
            : 'Te armo dos CV: una versión moderna con foto, para mandar por mail o entregar, y otra optimizada para ATS, sin foto, que pasa los filtros. En 3 a 4 días hábiles.'}</p>
          <p className="mt-2 text-sm text-piedra">Lo comprás acá mismo en la web en 2 minutos y pagás por transferencia.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/#precios" className="inline-flex min-h-12 items-center rounded-full bg-ciruela px-6 py-3 font-display text-sm font-bold text-white hover:bg-rosa">Ver packs y precios</Link>
            <a href={sales} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-display text-sm font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />Escribirle a Vale</a>
          </div>
        </div>
      )}

      <button type="button" onClick={restart} className="inline-flex items-center gap-2 text-sm font-semibold text-piedra hover:text-ciruela"><RotateCcw className="h-4 w-4" />Analizar otro CV</button>
    </div>
  )
}
