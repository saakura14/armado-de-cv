'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SUPABASE_KEY, SUPABASE_URL, errorMessage, supabase } from '@/lib/supabase'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** The Google button shows up by itself once the provider is enabled in Supabase (Sign In / Providers → Google). */
function useGoogleEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((response) => response.json())
      .then((settings: { external?: { google?: boolean } }) => setEnabled(Boolean(settings.external?.google)))
      .catch(() => setEnabled(false))
  }, [])
  return enabled
}

/** Sign in with Google or email + password. Pages using useSession() re-render once the session exists. */
export function AuthPanel({ title = 'Ingresá para continuar', text }: { title?: string; text?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const googleEnabled = useGoogleEnabled()

  async function google() {
    setError('')
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
    if (authError) setError(errorMessage(authError))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setInfo('')
    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.href },
        })
        if (authError) throw authError
        if (!data.session) setInfo('Te mandamos un email para confirmar tu cuenta. Abrilo y volvé a esta página.')
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal outline-none focus:border-rosa'
  return (
    <div className="mx-auto w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-8">
      <p className="font-script text-4xl leading-none text-rosa">{title}</p>
      {text && <p className="mt-2 text-sm leading-relaxed text-piedra">{text}</p>}
      {googleEnabled && (
        <>
          <button type="button" onClick={google} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-5 py-3 font-display text-sm font-bold text-ink transition-colors hover:border-ciruela">
        <GoogleIcon />Continuar con Google
      </button>
          <div className="my-5 flex items-center gap-3 text-xs text-piedra"><span className="h-px flex-1 bg-line" />o con tu email<span className="h-px flex-1 bg-line" /></div>
        </>
      )}
      {!googleEnabled && <div className="mt-6" />}
      <div className="grid grid-cols-2 rounded-full bg-arena/70 p-1 text-sm font-semibold" role="tablist">
        {(['login', 'signup'] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => { setMode(value); setError(''); setInfo('') }} className={`rounded-full py-2 font-display ${mode === value ? 'bg-white text-ciruela shadow-sm' : 'text-piedra'}`}>
            {value === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === 'signup' && (
          <label className="block text-sm font-semibold text-ciruela">Nombre y apellido
            <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={input} />
          </label>
        )}
        <label className="block text-sm font-semibold text-ciruela">Email
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={input} />
        </label>
        <label className="block text-sm font-semibold text-ciruela">Contraseña
          <input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={input} />
        </label>
        {error && <p role="alert" className="rounded-xl bg-petalo-wash px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>}
        {info && <p role="status" className="rounded-xl bg-arena px-3 py-2 text-sm text-ink">{info}</p>}
        <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-rosa disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
        </button>
      </form>
    </div>
  )
}
