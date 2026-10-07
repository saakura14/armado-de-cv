'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/** Reads the private token of the link and stops the Test ATS emails for that person. */
export function Unsubscribe() {
  const [state, setState] = useState<'working' | 'done' | 'invalid'>('working')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t') ?? ''
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setState('invalid'); return }
    supabase.rpc('ats_unsubscribe', { p_token: token }).then(({ data, error }) => setState(!error && data ? 'done' : 'invalid'))
  }, [])

  if (state === 'working') return <Loader2 className="mx-auto h-6 w-6 animate-spin text-rosa" />
  return (
    <>
      <p className="font-script text-5xl text-rosa">{state === 'done' ? 'Listo' : 'Link no válido'}</p>
      <p className="mt-3 text-piedra">{state === 'done' ? 'No te voy a mandar más mails por el test ATS. ¡Mucha suerte en tu búsqueda!' : 'No encontré ese pedido de baja. Si querés dejar de recibir mails, respondé el mail que te llegó y lo hago a mano.'}</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-rosa-deep underline">Ir a Armado de CV</Link>
    </>
  )
}
