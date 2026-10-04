'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, LogOut, RefreshCw } from 'lucide-react'
import { AuthPanel } from '@/components/auth-panel'
import { AppSetup } from '@/components/admin/app-setup'
import { TeamLogo, TeamView } from '@/components/team-view'
import { ThemeToggle } from '@/components/theme-toggle'
import { setAppBadge, syncPush } from '@/lib/push'
import { errorMessage, supabase } from '@/lib/supabase'
import { TASK_SELECT, type TeamMember, type TeamPayment, type TeamTask } from '@/lib/team'
import { useSession } from '@/lib/use-session'

type Data = { member: TeamMember; tasks: TeamTask[]; payments: TeamPayment[] }

export default function TeamPage() {
  const { user, ready } = useSession()
  const [data, setData] = useState<Data | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    // Links the Google account the first time; null when this email isn't on the team.
    const { data: memberId, error: linkError } = await supabase.rpc('team_link_account')
    if (linkError) { setError(errorMessage(linkError)); setLoading(false); return }
    if (!memberId) { setData(null); setLoading(false); return }
    const [member, tasks, payments] = await Promise.all([
      supabase.from('team_members').select('*').eq('id', memberId).single(),
      supabase.from('team_tasks').select(TASK_SELECT).eq('member_id', memberId).order('assigned_at', { ascending: false }).limit(1000),
      supabase.from('team_payments').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
    ])
    setLoading(false)
    const failed = member.error ?? tasks.error ?? payments.error
    if (failed) { setError(errorMessage(failed)); return }
    setError('')
    const list = (tasks.data as TeamTask[]) ?? []
    setData({ member: member.data as TeamMember, tasks: list, payments: (payments.data as TeamPayment[]) ?? [] })
    // The number on the app icon: CVs still to build.
    setAppBadge(list.filter((task) => task.status !== 'terminado').length)
  }, [])

  useEffect(() => { if (user) { load(); syncPush(user.id) } }, [user, load])

  // New tasks and payments show up without reloading (and when the tablet wakes up).
  useEffect(() => {
    if (!user) return
    let timer: number | undefined
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(load, 600) }
    const channel = supabase.channel('team-screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_tasks' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_payments' }, soon)
      .subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') soon() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', soon)
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('online', soon) }
  }, [user, load])

  async function signOut() {
    // Only this device: signing out elsewhere (phone app, computer) stays as it is.
    await supabase.auth.signOut({ scope: 'local' })
    window.location.replace('/equipo')
  }

  if (!ready || (user && data === undefined && !error)) return <div className="flex min-h-dvh items-center justify-center bg-arena/40"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="min-h-dvh bg-arena/40 px-4 py-16"><div className="mb-8 flex justify-center"><TeamLogo /></div><AuthPanel title="Equipo" text="Entrá con la cuenta de Google que te pasó Vale." /></section>
  if (!data) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-script text-5xl text-rosa">{error ? 'Algo falló' : 'Sin acceso'}</p>
        <p className="mt-3 text-piedra">{error || <>La cuenta <b className="text-ink">{user.email}</b> no está en el equipo. Pedile a Vale que la agregue y volvé a entrar.</>}</p>
        <div className="mt-6 flex justify-center gap-4">
          {error && <button type="button" onClick={load} className="font-semibold text-rosa-deep underline">Reintentar</button>}
          <button type="button" onClick={signOut} className="font-semibold text-rosa-deep underline">Entrar con otra cuenta</button>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-dvh">
      <TeamView
        member={data.member}
        tasks={data.tasks}
        payments={data.payments}
        onChanged={load}
        setup={<AppSetup userId={user.id} app="equipo" />}
        headerRight={(
          <>
            <ThemeToggle />
            <button type="button" onClick={load} aria-label="Actualizar" className="rounded-full p-2 text-piedra hover:bg-papel hover:text-ciruela"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-ciruela"><LogOut className="h-4 w-4" />Salir</button>
          </>
        )}
      />
      {error && <p role="alert" className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl bg-petalo-wash px-4 py-3 text-center text-sm font-semibold text-rosa-deep shadow-lg">No se pudo actualizar: {error}</p>}
    </div>
  )
}
