'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, MoveHorizontal } from 'lucide-react'

const AFTER = {
  moderno: { src: '/img/antes-despues/despues-moderno.webp', label: 'CV moderno' },
  ats: { src: '/img/antes-despues/despues-ats.webp', label: 'CV para ATS' },
} as const

const CHANGES = [
  { before: '"Busco crecer profesionalmente…"', after: 'Un perfil que dice qué hace y en qué es fuerte' },
  { before: 'Tareas sueltas en una línea', after: 'Logros, herramientas (Tango, SAP) y resultados' },
  { before: 'Barras de habilidades que el ATS no lee', after: 'Las palabras clave que buscan las empresas' },
  { before: 'Dos columnas y datos de más (DNI, estado civil)', after: 'Una sola columna, clara y fácil de leer' },
]

/**
 * Before and after of a CV (fictitious person, Lucía Fernández) with a slider, and the real score of the free ATS test.
 * The slider wiggles once when it comes into view so people notice it can be dragged.
 */
export function BeforeAfter() {
  const [version, setVersion] = useState<keyof typeof AFTER>('moderno')
  const [position, setPosition] = useState(50)
  const [easing, setEasing] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = box.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timers: number[] = []
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      setEasing(true)
      ;[[300, 22], [1100, 78], [1900, 50], [2600, -1]].forEach(([at, value]) => timers.push(window.setTimeout(() => (value < 0 ? setEasing(false) : setPosition(value)), at)))
    }, { threshold: 0.5 })
    observer.observe(element)
    return () => { observer.disconnect(); timers.forEach((timer) => window.clearTimeout(timer)) }
  }, [])

  return (
    <div className="mx-auto mt-10 grid max-w-5xl items-center gap-8 md:grid-cols-[1fr_1.1fr] md:gap-12">
      <div className="order-2 md:order-1">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-rosa/10 px-4 py-2 text-center"><span className="block font-display text-3xl font-extrabold text-rosa-deep">40</span><span className="text-[11px] font-semibold uppercase tracking-wider text-piedra">Antes</span></span>
          <ArrowRight className="h-6 w-6 text-piedra" aria-hidden="true" />
          <span className="rounded-2xl bg-[#1f9d5a]/10 px-4 py-2 text-center"><span className="block font-display text-3xl font-extrabold text-[#128c4a]">94</span><span className="text-[11px] font-semibold uppercase tracking-wider text-piedra">Después</span></span>
          <p className="text-sm leading-snug text-piedra">puntos en el <a href="/test-ats" className="font-semibold text-rosa-deep hover:underline">test ATS</a>, con la misma experiencia</p>
        </div>
        <ul className="mt-6 space-y-3">
          {CHANGES.map((change) => (
            <li key={change.after} className="rounded-2xl bg-white p-4 shadow-[0_14px_30px_-26px_rgba(67,32,44,0.6)]">
              <p className="text-sm text-piedra line-through decoration-rosa/60">{change.before}</p>
              <p className="mt-1 font-semibold text-ciruela">{change.after}</p>
            </li>
          ))}
        </ul>
        <a href="#que-pack" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-rosa px-6 py-3 font-display text-sm font-bold text-white shadow-lg shadow-rosa/25 hover:bg-rosa-deep">Quiero el mío así<ArrowRight className="h-4 w-4" /></a>
        <p className="mt-3 text-xs text-piedra">Ejemplo con una persona ficticia. Los packs Simple, Medium y Premium traen las dos versiones: moderna y para ATS.</p>
      </div>

      <div className="order-1 md:order-2">
        <div className="mb-3 flex justify-center gap-2" role="group" aria-label="Versión del después">
          {(Object.keys(AFTER) as (keyof typeof AFTER)[]).map((key) => (
            <button key={key} type="button" onClick={() => setVersion(key)} aria-pressed={version === key} className={`rounded-full px-4 py-2 font-display text-xs font-bold transition-colors ${version === key ? 'bg-ciruela text-white' : 'bg-white text-piedra hover:text-ciruela'}`}>{AFTER[key].label}</button>
          ))}
        </div>
        <div ref={box} className="relative mx-auto aspect-[900/1273] w-full max-w-md select-none overflow-hidden rounded-3xl bg-white shadow-[0_30px_60px_-34px_rgba(67,32,44,0.7)]">
          <Image src={AFTER[version].src} alt={`Después: ${AFTER[version].label} de Lucía Fernández`} fill sizes="(min-width: 768px) 448px, 92vw" className="object-cover" />
          <div className={`absolute inset-0 ${easing ? 'transition-[clip-path] duration-700 ease-in-out' : ''}`} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
            <Image src="/img/antes-despues/antes.webp" alt="Antes: CV con plantilla genérica" fill sizes="(min-width: 768px) 448px, 92vw" className="object-cover" />
          </div>
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ciruela/85 px-3 py-1 font-display text-xs font-bold text-white">Antes · 40</span>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#1f9d5a] px-3 py-1 font-display text-xs font-bold text-white">Después · 94</span>
          <div className={`pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(67,32,44,0.15)] ${easing ? 'transition-[left] duration-700 ease-in-out' : ''}`} style={{ left: `${position}%` }}>
            <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ciruela shadow-lg"><MoveHorizontal className="h-5 w-5" /></span>
          </div>
          <input type="range" min={0} max={100} value={position} onChange={(event) => { setEasing(false); setPosition(Number(event.target.value)) }} aria-label="Deslizá para comparar el antes y el después" style={{ touchAction: 'pan-y' }} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-piedra">Deslizá para comparar</p>
      </div>
    </div>
  )
}
