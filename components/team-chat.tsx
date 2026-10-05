'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react'
import { errorMessage, supabase } from '@/lib/supabase'

export type TeamMessage = { id: string; member_id: string; sender: 'admin' | 'member'; body: string; task_id: string | null; created_at: string; read_at: string | null }
/** A CV a message can be about ("#18 · Camila"). */
export type ChatTask = { id: string; order_number: number; client_name: string; pack_name: string }
type Side = TeamMessage['sender']

/** Messages from the other side not read yet, live (for the badges). */
export function useTeamUnread(memberId: string | null | undefined, side: Side) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!memberId) return
    const other: Side = side === 'admin' ? 'member' : 'admin'
    const load = () => supabase.from('team_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('sender', other).is('read_at', null)
      .then(({ count: value }) => setCount(value ?? 0))
    load()
    const channel = supabase.channel(`team-unread-${side}-${memberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages', filter: `member_id=eq.${memberId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [memberId, side])
  return count
}

const timeFormat = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
const dayFormat = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
const dayKey = (value: string | Date) => new Date(new Date(value).getTime() - 3 * 3600e3).toISOString().slice(0, 10)
function dayLabel(key: string) {
  const today = dayKey(new Date())
  const yesterday = dayKey(new Date(Date.now() - 864e5))
  if (key === today) return 'Hoy'
  if (key === yesterday) return 'Ayer'
  const text = dayFormat.format(new Date(`${key}T15:00:00Z`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * The conversation between Vale and one team member. Same component on both sides: `side` is who is writing here.
 * A message can be tied to a CV (chip "#18 · Camila"), so questions don't get mixed up.
 */
export function TeamChat({ memberId, side, otherName, tasks = [], draftTask, onDraftTaskUsed }: {
  memberId: string; side: Side; otherName: string; tasks?: ChatTask[]
  draftTask?: ChatTask | null; onDraftTaskUsed?: () => void
}) {
  const [messages, setMessages] = useState<TeamMessage[] | null>(null)
  const [text, setText] = useState('')
  const [about, setAbout] = useState<ChatTask | null>(null)
  const [picking, setPicking] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const other: Side = side === 'admin' ? 'member' : 'admin'
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])

  // "Duda con este CV" from the work mode arrives with the CV already attached.
  useEffect(() => {
    if (!draftTask) return
    setAbout(draftTask)
    onDraftTaskUsed?.()
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }, [draftTask, onDraftTaskUsed])

  const markRead = useCallback(() => {
    if (document.visibilityState !== 'visible') return
    supabase.rpc('team_chat_mark_read', { p_member: memberId }).then(() => undefined, () => undefined)
  }, [memberId])

  useEffect(() => {
    let active = true
    supabase.from('team_messages').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(300).then(({ data, error: loadError }) => {
      if (!active) return
      if (loadError) { setError(errorMessage(loadError)); setMessages([]); return }
      setMessages(((data as TeamMessage[]) ?? []).reverse())
      markRead()
    })
    // New messages and "visto" arrive live.
    const channel = supabase.channel(`team-chat-${side}-${memberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages', filter: `member_id=eq.${memberId}` }, (change) => {
        const row = change.new as TeamMessage
        if (!row?.id) return
        setMessages((current) => {
          const list = current ?? []
          const index = list.findIndex((message) => message.id === row.id)
          if (index >= 0) { const next = [...list]; next[index] = row; return next }
          return [...list, row]
        })
        if (change.eventType === 'INSERT' && row.sender === other) markRead()
      })
      .subscribe()
    const onVisible = () => markRead()
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible) }
  }, [memberId, side, other, markRead])

  // Always shows the latest message.
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages?.length])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError('')
    const { data, error: sendError } = await supabase.from('team_messages').insert({ member_id: memberId, sender: side, body, task_id: about?.id ?? null }).select('*').single()
    setSending(false)
    if (sendError) { setError(errorMessage(sendError)); return }
    const row = data as TeamMessage
    setMessages((current) => (current ?? []).some((message) => message.id === row.id) ? current : [...(current ?? []), row])
    setText(''); setAbout(null)
    if (inputRef.current) inputRef.current.style.height = ''
    // The other side gets a notification on their phone or tablet.
    supabase.functions.invoke('notify-admin', { body: { kind: 'chat', message_id: row.id } }).then(() => undefined, () => undefined)
  }

  function onKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on a computer; on a phone or tablet Enter is a new line and the button sends.
    if (event.key === 'Enter' && !event.shiftKey && window.matchMedia('(pointer: fine)').matches) { event.preventDefault(); send() }
  }
  function grow(element: HTMLTextAreaElement) {
    element.style.height = ''
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`
  }

  const lastMine = messages ? [...messages].reverse().find((message) => message.sender === side) : undefined
  let lastDay = ''

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-3">
        {messages === null && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-rosa" /></div>}
        {messages?.length === 0 && (
          <div className="mx-auto mt-8 max-w-xs text-center text-sm text-piedra">
            <MessageCircle className="mx-auto h-8 w-8 text-rosa" />
            <p className="mt-2">Todavía no hay mensajes. Escribile a {otherName}: le llega un aviso al celu o la tablet.</p>
          </div>
        )}
        {messages?.map((message) => {
          const mine = message.sender === side
          const key = dayKey(message.created_at)
          const separator = key !== lastDay ? <p className="py-2 text-center font-display text-[11px] font-bold uppercase tracking-wider text-piedra">{dayLabel(key)}</p> : null
          lastDay = key
          const task = message.task_id ? taskById.get(message.task_id) : null
          return (
            <div key={message.id}>
              {separator}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[15px] leading-snug shadow-sm ${mine ? 'rounded-br-md bg-ciruela text-white' : 'rounded-bl-md bg-white text-ink'}`}>
                  {message.task_id && (
                    <p className={`mb-1 inline-block rounded-full px-2 py-0.5 font-display text-[11px] font-bold ${mine ? 'bg-white/15 text-white' : 'bg-papel text-ciruela'}`}>
                      {task ? `#${task.order_number} · ${task.client_name}` : 'Sobre un CV'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-piedra'}`}>
                    {timeFormat.format(new Date(message.created_at))}{mine && message.id === lastMine?.id ? (message.read_at ? ' · ✓✓ Visto' : ' · ✓ Enviado') : ''}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-line bg-blanco px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        {error && <p role="alert" className="mb-2 rounded-xl bg-petalo-wash px-3 py-2 text-xs font-semibold text-rosa-deep">{error}</p>}
        {about && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-papel px-3 py-1 font-display text-xs font-bold text-ciruela">
            Sobre: #{about.order_number} · {about.client_name}
            <button type="button" onClick={() => setAbout(null)} aria-label="Quitar el CV" className="text-piedra hover:text-ciruela"><X className="h-3.5 w-3.5" /></button>
          </p>
        )}
        {picking && tasks.length > 0 && (
          <div className="mb-2 max-h-44 overflow-y-auto rounded-2xl border border-line bg-white p-1">
            {tasks.map((task) => (
              <button key={task.id} type="button" onClick={() => { setAbout(task); setPicking(false); inputRef.current?.focus() }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-papel">
                <b className="text-ink">#{task.order_number} · {task.client_name}</b> <span className="text-piedra">{task.pack_name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          {tasks.length > 0 && (
            <button type="button" onClick={() => setPicking((value) => !value)} aria-label="Sobre un CV" title="Sobre un CV" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${picking ? 'border-ciruela bg-ciruela text-white' : 'border-line bg-white text-piedra hover:text-ciruela'}`}>
              <Paperclip className="h-5 w-5" />
            </button>
          )}
          <textarea ref={inputRef} value={text} rows={1} onChange={(event) => { setText(event.target.value); grow(event.target) }} onKeyDown={onKey}
            placeholder={`Escribile a ${otherName}…`} className="min-h-11 flex-1 resize-none rounded-3xl border border-line bg-white px-4 py-2.5 text-base leading-snug text-ink outline-none focus:border-rosa sm:text-sm" />
          <button type="button" onClick={send} disabled={!text.trim() || sending} aria-label="Enviar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rosa text-white hover:bg-rosa-deep disabled:opacity-40">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The chat as a panel: full screen on a phone, a column on the right on a tablet or computer. */
export function TeamChatPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[58] flex justify-end bg-ciruela/40 backdrop-blur-[2px]" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full flex-col bg-arena shadow-2xl sm:max-w-md sm:rounded-l-[28px] sm:border-l sm:border-line">
        <header className="flex items-center gap-3 border-b border-line bg-blanco px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:rounded-tl-[28px]">
          <MessageCircle className="h-5 w-5 text-rosa" />
          <h2 className="flex-1 font-display text-base font-bold text-ciruela">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-piedra hover:bg-papel hover:text-ciruela"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    </div>
  )
}
