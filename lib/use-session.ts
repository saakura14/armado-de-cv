'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Profile = { id: string; email: string | null; full_name: string | null; phone: string | null; avatar_url: string | null; role: 'client' | 'admin' }

/** Current Supabase session plus the profile row (role decides access to /admin). */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); if (!data.session) setReady(true) } })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      if (!next) { setProfile(null); setReady(true) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(({ data }) => {
      if (!active) return
      setProfile((data as Profile | null) ?? null)
      setReady(true)
    })
    return () => { active = false }
  }, [userId])

  return { session, user: session?.user ?? null, profile, setProfile, ready, isAdmin: profile?.role === 'admin' }
}
