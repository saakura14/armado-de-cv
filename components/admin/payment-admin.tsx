'use client'

import { useEffect, useState } from 'react'
import { errorMessage, supabase } from '@/lib/supabase'
import { Button, Field, cardClass, inputClass, useFlash } from './ui'

export function PaymentAdmin() {
  const [form, setForm] = useState({ alias: '', cbu: '', holder: '', bank: '', card_enabled: false })
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const flash = useFlash()

  useEffect(() => {
    supabase.from('payment_settings').select('alias, cbu, holder, bank, card_enabled').maybeSingle().then(({ data }) => {
      if (data) setForm({ alias: data.alias, cbu: data.cbu, holder: data.holder, bank: data.bank ?? '', card_enabled: data.card_enabled })
    })
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('payment_settings').update({
      alias: form.alias.trim(), cbu: form.cbu.replace(/\s/g, ''), holder: form.holder.trim(), bank: form.bank.trim() || null, card_enabled: form.card_enabled, updated_at: new Date().toISOString(),
    }).eq('id', 1)
    setBusy(false)
    flash.show(error ? 'error' : 'ok', error ? errorMessage(error) : 'Datos de pago guardados.')
  }

  async function checkUala() {
    setChecking(true)
    const { data, error } = await supabase.functions.invoke('uala', { body: { action: 'check' } })
    setChecking(false)
    const mode = data?.env === 'production' ? 'producción' : 'prueba'
    if (error || !data?.ok) flash.show('error', `Ualá (modo ${mode}): no conecta. ${data?.error ?? errorMessage(error)}`)
    else flash.show('ok', `Conectado con Ualá en modo ${mode}.`)
  }

  const set = (key: 'alias' | 'cbu' | 'holder' | 'bank') => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return (
    <form onSubmit={save} className={`${cardClass} max-w-xl space-y-4`}>
      <p className="text-sm text-piedra">Estos datos solo los ven los clientes que ya iniciaron sesión y confirmaron un pedido.</p>
      <Field label="Alias"><input required value={form.alias} onChange={set('alias')} className={inputClass} /></Field>
      <Field label="CBU / CVU"><input required value={form.cbu} onChange={set('cbu')} inputMode="numeric" className={inputClass} /></Field>
      <Field label="Titular"><input required value={form.holder} onChange={set('holder')} className={inputClass} /></Field>
      <Field label="Banco o billetera (opcional)"><input value={form.bank} onChange={set('bank')} className={inputClass} /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-blanco p-4 text-sm leading-relaxed">
        <input type="checkbox" checked={form.card_enabled} onChange={(event) => setForm((current) => ({ ...current, card_enabled: event.target.checked }))} className="mt-1 accent-rosa" />
        <span><b>Ofrecer pago con tarjeta (Ualá)</b> como segunda opción, debajo de la transferencia. El cliente paga el costo de Ualá (4,9% + IVA). Los clientes la ven solo con las credenciales de producción (<code>UALA_ENV = production</code>); en modo prueba la ves únicamente vos, para probar.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" busy={checking} onClick={checkUala}>Probar conexión con Ualá</Button>
        <span className="text-xs text-piedra">Verifica que las credenciales cargadas en Supabase funcionen. No cobra nada.</span>
      </div>
      <Button busy={busy}>Guardar</Button>
      {flash.node}
    </form>
  )
}
