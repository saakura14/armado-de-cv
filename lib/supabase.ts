import { createClient } from '@supabase/supabase-js'

// Publishable (public) credentials: safe to ship in the browser. Every table is protected by RLS.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wdcijkjmdfypltbafdol.supabase.co'
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_CksvQRs2oz0m36dP50WX8A_1QBUcpXQ'

const isBrowser = typeof window !== 'undefined'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: isBrowser, autoRefreshToken: isBrowser, detectSessionInUrl: isBrowser },
})

/** Turns Supabase/Postgres errors into a message a customer can read. */
export function errorMessage(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error)
  if (/Invalid login credentials/i.test(message)) return 'El email o la contraseña no coinciden.'
  if (/User already registered/i.test(message)) return 'Ya existe una cuenta con ese email. Probá ingresar.'
  if (/Password should be at least/i.test(message)) return 'La contraseña tiene que tener al menos 6 caracteres.'
  if (/Email not confirmed/i.test(message)) return 'Tenés que confirmar tu email antes de ingresar.'
  if (/Failed to fetch|NetworkError/i.test(message)) return 'No hay conexión. Revisá tu internet y probá de nuevo.'
  return message
}
