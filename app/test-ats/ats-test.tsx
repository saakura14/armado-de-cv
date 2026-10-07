'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Lock, RotateCcw, XCircle } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { analyzeCv, formatYears, readPdf, type AtsResult } from '@/lib/ats-check'
import { OTHER_AREA, ROLE_AREAS } from '@/lib/ats-roles'
import { whatsappUrl } from '@/lib/catalog'
import { track } from '@/lib/pixel'
import { errorMessage, supabase } from '@/lib/supabase'

type Stage = 'subir' | 'leyendo' | 'puntaje' | 'detalle' | 'usado'

const verdict = (score: number) =>
  score >= 85 ? { tone: 'text-[#128c4a]', ring: '#1f9d5a', title: '¡Tu CV está bien preparado para los filtros!', text: 'Pasa los puntos básicos de un ATS. Ahora la diferencia está en cómo contás tu experiencia y en tu LinkedIn.' }
    : score >= 65 ? { tone: 'text-[#b7791f]', ring: '#d69e2e', title: 'Tu CV puede quedar afuera en algunos filtros', text: 'Tiene una buena base, pero hay detalles que hacen que algunos sistemas lo descarten o lo ordenen abajo.' }
      : { tone: 'text-rosa-deep', ring: '#c9506d', title: 'Tu CV probablemente no está pasando los filtros', text: 'Por eso puede que no te llamen aunque tengas el perfil: el sistema lo descarta antes de que lo vea una persona.' }

const tone = (value: number) => value >= 80 ? 'bg-[#1f9d5a]' : value >= 55 ? 'bg-[#d69e2e]' : 'bg-rosa'

function Part({ label, hint, value }: { label: string; hint: string; value: number | null }) {
  return (
    <div>
      <p className="flex items-baseline justify-between gap-2 font-display text-sm font-bold text-ciruela"><span>{label}</span><span>{value === null ? '—' : `${value}%`}</span></p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-petalo-wash"><div className={`h-full rounded-full ${value === null ? '' : tone(value)}`} style={{ width: `${value ?? 0}%` }} /></div>
      <p className="mt-1 text-xs text-piedra">{hint}</p>
    </div>
  )
}

/** The candidate record the ATS fills from the CV: what the recruiter sees when opening the application. */
function RecordCard({ result }: { result: AtsResult }) {
  const record = result.record!
  const row = (label: string, value: React.ReactNode, ok: boolean, warn?: string) => (
    <div className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1f9d5a]" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-piedra">{label}</p>
        <div className="break-words text-sm text-ink">{value}</div>
        {warn && <p className="mt-0.5 text-xs font-semibold text-rosa-deep">{warn}</p>}
      </div>
    </div>
  )
  const empty = <span className="italic text-piedra">No lo encontró</span>
  return (
    <div className="rounded-[32px] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(67,32,44,0.55)] sm:p-8">
      <p className="font-script text-4xl leading-none text-rosa">Así te lee un ATS</p>
      <p className="mt-2 text-sm text-piedra">Antes de que una persona vea tu CV, el sistema lo convierte en esta ficha. Es lo que ve el reclutador cuando abre tu postulación: lo que no está acá, para él no existe.</p>
      <div className="mt-4">
        {row('Nombre', record.name ?? empty, Boolean(record.name) && !record.nameSpaced, record.nameSpaced ? 'Lo lee con las letras separadas: así no te encuentran si buscan tu nombre.' : undefined)}
        {row('Email', record.email ?? empty, Boolean(record.email))}
        {row('Teléfono', record.phone ?? empty, Boolean(record.phone))}
        {row('Ciudad o zona', record.location ? <span className="capitalize">{record.location}</span> : empty, Boolean(record.location), record.location ? undefined : 'Muchos filtran por zona: sin ciudad, quedás afuera de esas búsquedas.')}
        {row('Experiencia', record.jobs.length ? (
          <ul className="space-y-0.5">{record.jobs.slice(0, 5).map((job, index) => <li key={index}><b className="font-semibold">{job.title.slice(0, 70)}</b> <span className="text-piedra">· {job.period}</span></li>)}</ul>
        ) : empty, record.jobs.length > 0, record.jobs.length ? `Años de experiencia que calcula: ${formatYears(record.years)}` : 'No pudo armar tu historial: le faltan el título "Experiencia" o las fechas de cada trabajo.')}
        {row('Estudios', record.education.length ? <ul className="space-y-0.5">{record.education.slice(0, 3).map((item, index) => <li key={index}>{item.slice(0, 80)}</li>)}</ul> : empty, record.education.length > 0)}
        {row('Habilidades', record.skills.length ? `${record.skills.length} cargadas: ${record.skills.slice(0, 8).join(', ')}${record.skills.length > 8 ? '…' : ''}` : empty, record.skills.length >= 5, record.skills.length > 0 && record.skills.length < 5 ? 'Muy pocas: el filtro busca habilidades concretas en esta sección.' : undefined)}
        {result.match && row('Palabras del puesto', `${result.match.found.length} de ${result.match.found.length + result.match.missing.length} que más se repiten en ${result.match.against}`, result.match.found.length / (result.match.found.length + result.match.missing.length) >= 0.5)}
      </div>
    </div>
  )
}

/** Free ATS test: reads the PDF in the browser, shows the score, and unlocks the detail with name and WhatsApp. */
export function AtsTest() {
  const [stage, setStage] = useState<Stage>('subir')
  const [ad, setAd] = useState('')
  // An ATS ranks against a role: without a job ad, the test compares with the usual words of the chosen area.
  const [area, setArea] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<AtsResult | null>(null)
  const [error, setError] = useState('')
  const [lead, setLead] = useState({ name: '', email: '', phone: '', ok: false })
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function analyze(file: File | undefined) {
    if (!file) return
    setError('')
    const clear = () => { if (input.current) input.current.value = '' }
    if (!area) { setError('Primero elegí a qué área te postulás: el ATS te compara contra ese puesto.'); clear(); return }
    if (area === OTHER_AREA && ad.trim().length < 40) { setError('Pegá el aviso al que te querés postular: sin un puesto, el ATS no tiene contra qué compararte.'); clear(); return }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError('Subí tu CV en PDF. Si lo tenés en Word o Google Docs: Archivo → Descargar → PDF.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('El archivo pesa más de 10 MB. Exportalo de nuevo como PDF y probá otra vez.'); return }
    setFileName(file.name)
    setStage('leyendo')
    try {
      const data = await readPdf(file)
      setResult(analyzeCv(data, { jobAd: ad, area }))
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
    const { data, error: rpcError } = await supabase.rpc('ats_check_submit', { p_name: lead.name, p_phone: lead.phone, p_score: result.score, p_issues: result.failed, p_has_job_ad: ad.trim().length > 40, p_area: area, p_email: lead.email })
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
        <label className="mb-5 block">
          <span className="font-display text-sm font-bold text-ciruela"><span className="text-rosa">1.</span> ¿A qué área te postulás?</span>
          <span className="block text-xs text-piedra">El ATS no te evalúa en el aire: te compara contra el puesto. Sin esto, el puntaje no sirve.</span>
          <select required value={area} onChange={(event) => { setArea(event.target.value); setError('') }} className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-rosa sm:text-sm">
            <option value="" disabled>Elegí un área</option>
            {ROLE_AREAS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            <option value={OTHER_AREA}>Otra (pego el aviso abajo)</option>
          </select>
        </label>
        <label className="mb-5 block">
          <span className="font-display text-sm font-bold text-ciruela"><span className="text-rosa">2.</span> {area === OTHER_AREA ? 'Pegá el aviso al que te querés postular' : 'Recomendado: pegá el aviso al que te querés postular'}</span>
          <span className="block text-xs text-piedra">Es lo que hace el ATS de verdad: compara tu CV con ESE aviso, palabra por palabra, y revisa los años de experiencia que pide.</span>
          <textarea rows={4} value={ad} onChange={(event) => setAd(event.target.value)} placeholder="Ej: Buscamos analista administrativo/a con manejo de Excel avanzado, SAP, facturación…" className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-rosa sm:text-sm" />
        </label>
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-rosa/40 bg-petalo-wash/50 px-6 py-10 text-center transition-colors hover:border-rosa ${stage === 'leyendo' ? 'pointer-events-none opacity-70' : ''}`}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); analyze(event.dataTransfer.files[0]) }}>
          {stage === 'leyendo' ? <Loader2 className="h-10 w-10 animate-spin text-rosa" /> : <FileUp className="h-10 w-10 text-rosa" />}
          <span className="font-display text-lg font-bold text-ciruela">{stage === 'leyendo' ? `Analizando ${fileName}…` : <><span className="text-rosa">3.</span> Subí tu CV en PDF</>}</span>
          <span className="text-sm text-piedra">{stage === 'leyendo' ? 'Lo leo como lo leería un sistema ATS.' : 'Tocá acá o arrastralo. Máximo 10 MB.'}</span>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => analyze(event.target.files?.[0])} />
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
          <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${view.ring} ${result.score * 3.6}deg, var(--color-petalo-wash) 0deg)` }}>
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
        {result.parts && (
          <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
            <Part label="Lectura" hint="Qué datos tuyos pudo cargar el sistema" value={result.parts.lectura} />
            <Part label="Formato" hint="Si el diseño deja leer bien tu CV" value={result.parts.formato} />
            <Part label="Coincidencia con el puesto" hint="Cómo te ubica en el ranking" value={result.parts.coincidencia} />
          </div>
        )}
      </div>

      {result.record && <RecordCard result={result} />}

      {stage === 'puntaje' && (
        <form onSubmit={unlock} className="rounded-[32px] bg-ciruela p-5 text-white sm:p-8">
          <p className="font-script text-4xl leading-none text-petalo">Mirá qué corregir</p>
          <p className="mt-2 text-white/85">Dejame tu nombre, tu WhatsApp y tu mail y te muestro el detalle de cada punto, con cómo arreglarlo. Es 1 análisis gratis por persona.</p>
          <ul className="mt-4 space-y-2 blur-[3px] select-none" aria-hidden="true">
            {failed.slice(0, 3).map((check) => <li key={check.id} className="flex items-center gap-2 text-sm"><XCircle className="h-4 w-4 text-petalo" />{check.title}</li>)}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input required minLength={2} maxLength={80} value={lead.name} onChange={(event) => setLead((c) => ({ ...c, name: event.target.value }))} placeholder="Tu nombre" autoComplete="given-name" className="rounded-2xl border-0 bg-white px-4 py-3 text-base text-ink outline-none" />
            <input required inputMode="tel" value={lead.phone} onChange={(event) => setLead((c) => ({ ...c, phone: event.target.value }))} placeholder="Tu WhatsApp (ej: 11 2345-6789)" autoComplete="tel" className="rounded-2xl border-0 bg-white px-4 py-3 text-base text-ink outline-none" />
            <input required type="email" maxLength={120} value={lead.email} onChange={(event) => setLead((c) => ({ ...c, email: event.target.value }))} placeholder="Tu mail" autoComplete="email" className="rounded-2xl border-0 bg-white px-4 py-3 text-base text-ink outline-none sm:col-span-2" />
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-white/80">
            <input type="checkbox" required checked={lead.ok} onChange={(event) => setLead((c) => ({ ...c, ok: event.target.checked }))} className="mt-0.5 accent-rosa" />
            <span>Acepto que Armado de CV me escriba por mail y por WhatsApp sobre mi CV (me puedo dar de baja cuando quiera). Ver <Link href="/privacidad" className="underline">política de privacidad</Link>.</span>
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
                  {check.id === 'palabras' && result.match && <p className="mt-2 pl-7 text-sm text-piedra">Te faltan: <b className="text-ciruela">{result.match.missing.join(', ')}</b></p>}
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
