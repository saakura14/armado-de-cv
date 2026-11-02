'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = {
  balance: { balance: number; threshold: number; alert: number; perDay: number } | null
  limit: { left: number; limit: number; perDay: number } | null
}
type Warning = { tone: 'red' | 'amber'; text: string; reset?: boolean }

const usd = (value: number) => `US$${value.toFixed(2).replace('.', ',')}`
const today = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
const daysLeft = (amount: number, perDay: number) => {
  if (!perDay) return ''
  const days = Math.floor(amount / perDay)
  return days < 1 ? 'hoy mismo' : `en ${days} ${days === 1 ? 'día' : 'días'}`
}

/** What meta-ads last computed (every 3 hours): the spend against the account limit and the balance until Meta charges. */
function warningsOf(status: Status | null): Warning[] {
  const warnings: Warning[] = []
  const limit = status?.limit
  if (limit && limit.left <= 0) warnings.push({ tone: 'red', reset: true, text: `Se cortaron los anuncios: llegaste al límite de gasto de ${usd(limit.limit)}. Pagá el saldo en Meta → Facturación y tocá "Restablecer" en el límite.` })
  else if (limit && limit.left <= 15) warnings.push({ tone: 'red', reset: true, text: `Quedan ${usd(limit.left)} para el límite de ${usd(limit.limit)}: los anuncios se cortan ${daysLeft(limit.left, limit.perDay)}. Pagá el saldo en Meta → Facturación y tocá "Restablecer".` })
  const balance = status?.balance
  if (balance && balance.balance >= balance.alert - 15) {
    warnings.push({ tone: balance.balance >= balance.alert ? 'red' : 'amber', text: `Saldo de Meta en ${usd(balance.balance)}: te cobra solo al llegar a ${usd(balance.threshold)}, ${daysLeft(balance.threshold - balance.balance, balance.perDay)}. Tené los dólares en la tarjeta o pagalo antes.` })
  }
  return warnings
}

/**
 * The urgent bar on top of every section of the panel: phone notifications are easy to miss, so what meta-ads warns
 * about (the account limit and the balance) also stays here, in red, until it's solved. After paying and resetting
 * the limit in Billing, "Ya pagué" starts the count again and asks meta-ads to recompute.
 */
export function MetaAlert({ onOpen }: { onOpen: () => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('savings_goal').select('meta_status').eq('id', 1).maybeSingle()
    setStatus((data?.meta_status as Status | null) ?? null)
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(load, 10 * 60 * 1000)
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer) }
  }, [load])

  async function paid() {
    setBusy(true)
    // Paying leaves the balance at zero and "Restablecer" starts the limit again from today.
    await supabase.from('savings_goal').update({ meta_limit_spent_usd: 0, meta_limit_on: today(), meta_balance_usd: 0, meta_balance_on: today(), updated_at: new Date().toISOString() }).eq('id', 1)
    await supabase.functions.invoke('meta-ads', { body: {} })
    await load()
    setBusy(false)
  }

  const warnings = warningsOf(status)
  if (!warnings.length) return null
  return (
    <div role="alert" className="mb-4 space-y-2">
      {warnings.map((warning) => (
        <div key={warning.text} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3 text-sm shadow-sm ${warning.tone === 'red' ? 'bg-rosa-deep text-white' : 'bg-[#e0a43a] text-ciruela'}`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 font-semibold">{warning.text}</p>
          <span className="flex gap-2">
            {warning.reset && (
              <button type="button" onClick={paid} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-display text-xs font-bold text-rosa-deep disabled:opacity-60">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Ya pagué y restablecí
              </button>
            )}
            <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-full border border-current px-3 py-1.5 font-display text-xs font-bold">Ver<ArrowRight className="h-3.5 w-3.5" /></button>
          </span>
        </div>
      ))}
    </div>
  )
}
