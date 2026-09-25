import { Lock, ShieldCheck } from 'lucide-react'
import { AskSakura } from './sakura-chat'

export function SectionTitle({ script, title, text, id, align = 'center' }: { script: string; title: string; text?: string; id?: string; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="font-script text-[52px] leading-none text-rosa sm:text-6xl" aria-hidden="true">{script}</p>
      <h2 id={id} className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-ciruela sm:text-sm">{title}</h2>
      {text && <p className="mt-4 text-[16px] leading-relaxed text-piedra">{text}</p>}
    </div>
  )
}

export function HowToBuy({ steps, note }: { steps: { title: string; text: string }[]; note?: string }) {
  return (
    <section id="como-comprar" className="scroll-mt-28 bg-ciruela px-4 py-16 text-white sm:px-6 lg:py-20" aria-labelledby="como-title">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-script text-[52px] leading-none text-petalo" aria-hidden="true">Cómo comprar</p>
        <h2 id="como-title" className="mt-1 text-center text-xs font-semibold uppercase tracking-[0.35em] sm:text-sm">En {steps.length} pasos</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-3xl bg-white/10 p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petalo font-display font-bold text-ciruela">{index + 1}</span>
              <h3 className="mt-4 font-bold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/80">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 rounded-3xl bg-white/10 px-6 py-4 text-center text-sm"><Lock className="h-4 w-4 shrink-0 text-petalo" />Pagás por transferencia bancaria. Los datos para transferir te aparecen al confirmar tu pedido.</p>
        {note && <p className="mx-auto mt-4 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-white/70"><ShieldCheck className="h-4 w-4 shrink-0" />{note}</p>}
      </div>
    </section>
  )
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section id="preguntas" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl">
        <SectionTitle id="faq-title" script="Preguntas" title="Frecuentes" />
        <AskSakura />
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-line bg-white px-5 py-4 open:border-rosa">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-display font-semibold text-ciruela">{item.q}<span className="text-2xl leading-none text-rosa transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
              <p className="mt-3 leading-relaxed text-piedra">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
