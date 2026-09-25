'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, MessageCircle, Send, X } from 'lucide-react'
import { whatsappUrl } from '@/lib/catalog'
import { getFaqs, rankFaqs, type Faq } from '@/lib/faq'
import { SAKURA_IMAGE } from './sakura'

const OPEN_EVENT = 'sakura:open'

type Message =
  | { from: 'sakura'; text: string; suggestions?: Faq[]; whatsapp?: string }
  | { from: 'user'; text: string }

function Avatar({ size = 'h-9 w-9' }: { size?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SAKURA_IMAGE} alt="" className={`${size} shrink-0 rounded-full bg-petalo-wash object-cover`} />
}

/** Floating FAQ assistant. Answers come from the "faqs" table (editable in /admin). */
export function SakuraChat() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [faqs, setFaqs] = useState<Faq[] | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const section: Faq['section'] = pathname.startsWith('/asesorias') ? 'asesorias' : 'cv'

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  useEffect(() => {
    if (!open || faqs) return
    getFaqs().then((list) => {
      setFaqs(list)
      const starters = [...list.filter((faq) => faq.section === section), ...list.filter((faq) => faq.section === 'general')].slice(0, 4)
      setMessages([{ from: 'sakura', text: '¡Hola! Soy Sakura, la versión anime de Valeria 🌸 Escribime tu duda o elegí una de estas:', suggestions: starters }])
    })
  }, [open, faqs, section])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function answer(faq: Faq, others: Faq[] = []) {
    setMessages((list) => [...list, { from: 'user', text: faq.question }, { from: 'sakura', text: faq.answer, suggestions: others.length ? others : undefined }])
  }

  function ask(event: React.FormEvent) {
    event.preventDefault()
    const question = input.trim()
    if (!question || !faqs) return
    setInput('')
    const ranked = rankFaqs(question, faqs)
    if (ranked.length === 0) {
      setMessages((list) => [...list, { from: 'user', text: question }, {
        from: 'sakura',
        text: 'Mmm, esa no la tengo anotada 🙈 Escribile a Valeria por WhatsApp y te responde personalmente.',
        whatsapp: whatsappUrl(`¡Hola! Tengo una consulta: ${question}`),
      }])
      return
    }
    const [best, ...rest] = ranked
    const others = rest.filter((item) => item.score >= best.score / 2).slice(0, 2).map((item) => item.faq)
    setMessages((list) => [...list, { from: 'user', text: question }, { from: 'sakura', text: best.faq.answer, suggestions: others.length ? others : undefined }])
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/comprar')) return null

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Preguntale a Sakura" className="group fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-white p-1 pr-1 shadow-[0_14px_34px_-14px_rgba(67,32,44,0.6)] ring-2 ring-petalo transition-transform hover:scale-[1.03] lg:bottom-24 lg:right-6 lg:pr-4">
          <Avatar size="h-12 w-12" />
          <span className="hidden text-left leading-tight lg:block"><span className="block font-script text-xl text-rosa">Sakura</span><span className="font-display text-xs font-semibold text-ciruela">¿Tenés dudas?</span></span>
        </button>
      )}

      {open && (
        <div role="dialog" aria-modal="false" aria-label="Chat con Sakura" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-blanco shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-3xl">
          <header className="flex items-center gap-3 bg-ciruela px-4 py-3 text-white">
            <Avatar size="h-11 w-11" />
            <div className="flex-1"><p className="font-script text-2xl leading-none text-petalo">Sakura</p><p className="text-xs text-white/75">Respondo las preguntas frecuentes</p></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar chat"><X className="h-5 w-5" /></button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
            {!faqs && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>}
            {messages.map((message, index) => message.from === 'user' ? (
              <p key={index} className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-ciruela px-4 py-2.5 text-sm text-white">{message.text}</p>
            ) : (
              <div key={index} className="flex items-end gap-2">
                <Avatar size="h-7 w-7" />
                <div className="max-w-[85%] space-y-2">
                  <p className="whitespace-pre-line rounded-3xl rounded-bl-md bg-white px-4 py-2.5 text-sm leading-relaxed text-ink shadow-sm">{message.text}</p>
                  {message.whatsapp && <a href={message.whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-whatsapp px-4 py-2 font-display text-xs font-bold text-white"><MessageCircle className="h-4 w-4" />Escribirle a Valeria</a>}
                  {message.suggestions && (
                    <div className="flex flex-col items-start gap-1.5">
                      {index > 0 && <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-piedra">También te puede servir</p>}
                      {message.suggestions.map((faq) => (
                        <button key={faq.id} type="button" onClick={() => answer(faq)} className="rounded-full border border-petalo bg-petalo-wash px-3 py-1.5 text-left text-xs font-semibold text-rosa-deep hover:border-rosa">{faq.question}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={ask} className="flex items-center gap-2 border-t border-line bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:pb-3">
            <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escribí tu pregunta..." aria-label="Tu pregunta" className="min-h-11 flex-1 rounded-full border border-line bg-blanco px-4 text-base outline-none focus:border-rosa sm:text-sm" />
            <button disabled={!input.trim() || !faqs} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rosa text-white disabled:opacity-40" aria-label="Enviar"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  )
}

/** Opens the Sakura chat from anywhere on the page. */
export function AskSakura() {
  return (
    <div className="mt-8 flex justify-center">
      <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="inline-flex min-h-12 items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-5 font-display text-sm font-bold text-ciruela shadow-[0_14px_30px_-20px_rgba(67,32,44,0.6)] ring-1 ring-petalo hover:ring-rosa">
        <Avatar size="h-9 w-9" />¿No encontrás tu duda? Preguntale a Sakura
      </button>
    </div>
  )
}
