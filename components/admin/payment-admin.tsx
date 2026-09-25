'use client'

import { useEffect, useState } from 'react'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

export function PaymentAdmin() {
  const [form, setForm] = useState({ alias: '', cbu: '', holder: '', bank: '' })
  const [busy, setBusy] = useState(false)
  const flash = useFlash()

  useEffect(() => {
    supabase.from('payment_settings').select('alias, cbu, holder, bank').maybeSingle().then(({ data }) => {
      if (data) setForm({ alias: data.alias, cbu: data.cbu, holder: data.holder, bank: data.bank ?? '' })
    })
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('payment_settings').update({
      alias: form.alias.trim(), cbu: form.cbu.replace(/\s/g, ''), holder: form.holder.trim(), bank: form.bank.trim() || null, updated_at: new Date().toISOString(),
    }).eq('id', 1)
    setBusy(false)
    flash.show(error ? 'error' : 'ok', error ? errorMessage(error) : 'Datos de pago guardados.')
  }

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return (
    <form onSubmit={save} className={`${cardClass} max-w-xl space-y-4`}>
      <p className="text-sm text-piedra">Estos datos solo los ven los clientes que ya iniciaron sesión y confirmaron un pedido.</p>
      <Field label="Alias"><input required value={form.alias} onChange={set('alias')} className={inputClass} /></Field>
      <Field label="CBU / CVU"><input required value={form.cbu} onChange={set('cbu')} inputMode="numeric" className={inputClass} /></Field>
      <Field label="Titular"><input required value={form.holder} onChange={set('holder')} className={inputClass} /></Field>
      <Field label="Banco o billetera (opcional)"><input value={form.bank} onChange={set('bank')} className={inputClass} /></Field>
      <Button busy={busy}>Guardar</Button>
      {flash.node}
    </form>
  )
}
