'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { PasswordInput } from '@/components/password-input'
import { errorMessage, supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'

/** New password: reached from the reset email (recovery session) or from "Mi cuenta" when already signed in. */
export default function NewPasswordPage() {
  const { user, ready } = useSession()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  // The recovery link signs the customer in a moment after the page loads.
  const [waited, setWaited] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setWaited(true), 2500); return () => window.clearTimeout(timer) }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== repeat) { setError('Las dos contraseñas no coinciden.'); return }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) { setError(errorMessage(updateError)); return }
    setDone(true)
  }

  const card = 'mx-auto w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8'
  const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal outline-none focus:border-rosa'

  if (!ready || (!user && !waited)) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>

  return (
    <section className="bg-arena/40 px-4 py-16">
      <div className={card}>
        <p className="font-script text-4xl leading-none text-rosa">Nueva contraseña</p>
        {done ? (
          <div className="mt-5 space-y-4">
            <p className="flex items-start gap-2 rounded-xl bg-arena px-3 py-3 text-sm text-ink"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />Listo, tu contraseña quedó cambiada.</p>
            <Link href="/cuenta" className="flex min-h-12 w-full items-center justify-center rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white hover:bg-rosa">Ir a mi cuenta</Link>
          </div>
        ) : !user ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-piedra">El enlace venció o ya se usó. Pedí uno nuevo desde <b>&quot;¿Olvidaste tu contraseña?&quot;</b> en la pantalla de ingreso.</p>
            <Link href="/cuenta" className="flex min-h-12 w-full items-center justify-center rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white hover:bg-rosa">Ir a ingresar</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-piedra">Cuenta: <b className="text-ink">{user.email}</b></p>
            <label className="block text-sm font-semibold text-ciruela">Contraseña nueva
              <PasswordInput required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className={input} />
            </label>
            <label className="block text-sm font-semibold text-ciruela">Repetila
              <PasswordInput required minLength={6} value={repeat} onChange={(event) => setRepeat(event.target.value)} autoComplete="new-password" className={input} />
            </label>
            <p className="text-xs text-piedra">Mínimo 6 caracteres.</p>
            {error && <p role="alert" className="rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
            <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-rosa disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar contraseña
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
