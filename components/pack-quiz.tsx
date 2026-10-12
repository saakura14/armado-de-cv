'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { Product } from '@/lib/catalog'
import { ProductGrid } from './product-grid'

type Answers = { experience?: boolean; letter?: boolean; linkedin?: boolean }

const QUESTIONS: { key: keyof Answers; question: string; yes: string; no: string }[] = [
  { key: 'experience', question: '¿Ya trabajaste antes?', yes: 'Sí, tengo experiencia', no: 'Es mi primer trabajo' },
  { key: 'letter', question: '¿Te piden carta de presentación o te postulás por mail?', yes: 'Sí, a veces', no: 'No, solo el CV' },
  { key: 'linkedin', question: '¿Querés que te encuentren los reclutadores en LinkedIn?', yes: 'Sí, también LinkedIn', no: 'Por ahora no' },
]

/** First job → Primer Empleo; LinkedIn → Premium; cover letter → Medium; otherwise Simple. */
function recommend(answers: Answers) {
  if (answers.experience === false) return { id: 'cv-primer-empleo', why: 'Es para tu primer trabajo: destaco tus estudios, cursos y habilidades aunque no tengas experiencia.' }
  if (answers.linkedin) return { id: 'cv-premium', why: 'Incluye los dos CV, la carta y tu perfil de LinkedIn completo, para que también te encuentren.' }
  if (answers.letter) return { id: 'cv-medium', why: 'Los dos CV (moderno y para ATS) más la carta de presentación para tus postulaciones.' }
  return { id: 'cv-simple', why: 'Los dos CV: uno moderno para mandar o entregar y otro que pasa los filtros ATS.' }
}

/** "¿Qué pack necesito?": up to three yes/no questions and the pack that fits, ready to order. */
export function PackQuiz({ products }: { products: Product[] }) {
  const [answers, setAnswers] = useState<Answers>({})
  // The first-job answer ends the quiz; otherwise every question is asked.
  const pending = answers.experience === false ? undefined : QUESTIONS.find((item) => answers[item.key] === undefined)
  const result = pending ? null : recommend(answers)
  const product = result ? products.find((item) => item.id === result.id) : null
  const step = QUESTIONS.findIndex((item) => item === pending) + 1

  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
      {pending ? (
        <div key={pending.key} className="animate-[sheet_.3s_ease-out]">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Pregunta {step} de {answers.experience === false ? 1 : QUESTIONS.length}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-papel"><div className="h-full rounded-full bg-rosa transition-all duration-500" style={{ width: `${((step - 1) / QUESTIONS.length) * 100}%` }} /></div>
          <p className="mt-5 font-display text-2xl font-extrabold leading-tight text-ciruela">{pending.question}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setAnswers((current) => ({ ...current, [pending.key]: true }))} className="min-h-14 rounded-2xl border-2 border-line px-5 py-3 text-left font-display font-bold text-ciruela transition-colors hover:border-rosa hover:bg-petalo-wash">{pending.yes}</button>
            <button type="button" onClick={() => setAnswers((current) => ({ ...current, [pending.key]: false }))} className="min-h-14 rounded-2xl border-2 border-line px-5 py-3 text-left font-display font-bold text-ciruela transition-colors hover:border-rosa hover:bg-petalo-wash">{pending.no}</button>
          </div>
        </div>
      ) : (
        <div className="animate-[sheet_.3s_ease-out]">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Te recomiendo</p>
          <p className="mt-2 font-display text-2xl font-extrabold leading-tight text-ciruela">{product?.name ?? 'Escribime y lo vemos juntos'}</p>
          {result && <p className="mt-2 text-piedra">{result.why}</p>}
          {product && <div className="mx-auto max-w-sm"><ProductGrid products={[product]} /></div>}
        </div>
      )}
      {Object.keys(answers).length > 0 && (
        <button type="button" onClick={() => setAnswers({})} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-piedra hover:text-ciruela"><RotateCcw className="h-4 w-4" />Empezar de nuevo</button>
      )}
    </div>
  )
}
