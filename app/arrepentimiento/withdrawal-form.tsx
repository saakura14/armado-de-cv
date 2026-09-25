'use client'

import { useState } from 'react'
import { Mail, MessageCircle } from 'lucide-react'
import { CONTACT, whatsappUrl } from '@/lib/catalog'

export function WithdrawalForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState('')
  const ready = name.trim() && email.trim() && order.trim()
  const message = `Solicito revocar mi compra (botón de arrepentimiento).\nNombre: ${name.trim()}\nEmail: ${email.trim()}\nPedido: #${order.trim().replace(/^#/, '')}`
  const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal outline-none focus:border-rosa'

  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-papel p-5">
      <label className="block text-sm font-semibold text-ciruela">Nombre y apellido<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={input} /></label>
      <label className="block text-sm font-semibold text-ciruela">Email de la compra<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={input} /></label>
      <label className="block text-sm font-semibold text-ciruela">Número de pedido<input value={order} onChange={(event) => setOrder(event.target.value)} inputMode="numeric" placeholder="Lo ves en Mi cuenta" className={input} /></label>
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <a aria-disabled={!ready} href={ready ? whatsappUrl(message) : undefined} target="_blank" rel="noreferrer" className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3 font-display text-sm font-bold text-white ${ready ? '' : 'pointer-events-none opacity-50'}`}><MessageCircle className="h-4 w-4" />Enviar por WhatsApp</a>
        <a aria-disabled={!ready} href={ready ? `mailto:${CONTACT.email}?subject=${encodeURIComponent('Botón de arrepentimiento')}&body=${encodeURIComponent(message)}` : undefined} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-ciruela px-5 py-3 font-display text-sm font-bold text-ciruela ${ready ? '' : 'pointer-events-none opacity-50'}`}><Mail className="h-4 w-4" />Enviar por email</a>
      </div>
    </div>
  )
}
