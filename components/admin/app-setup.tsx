'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Smartphone } from 'lucide-react'
import { errorMessage } from '@/lib/supabase'
import { disablePush, enablePush, pushState, sendTestPush, type PushState } from '@/lib/push'
import { Button, cardClass } from './ui'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

// Chrome offers the install prompt once, as the page loads: keep it for the button.
let savedPrompt: InstallPrompt | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); savedPrompt = event as InstallPrompt })
}

/** "Your panel on the phone": install the admin app and turn on order notifications. */
export function AppSetup({ userId }: { userId: string }) {
  const [installed, setInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [push, setPush] = useState<PushState | null>(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    setCanInstall(Boolean(savedPrompt))
    const onPrompt = () => setCanInstall(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    pushState().then(setPush)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function install() {
    if (!savedPrompt) return
    await savedPrompt.prompt()
    const { outcome } = await savedPrompt.userChoice
    savedPrompt = null
    setCanInstall(false)
    if (outcome === 'accepted') setMessage({ tone: 'ok', text: 'Listo: vas a encontrar "Panel ACV" entre tus apps.' })
  }

  async function run(action: string, work: () => Promise<string>) {
    setBusy(action); setMessage(null)
    try {
      setMessage({ tone: 'ok', text: await work() })
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error) })
    }
    setPush(await pushState())
    setBusy('')
  }

  // Once everything is set up, the card gets out of the way.
  if (installed && push === 'on' && !message) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-piedra">
        <BellRing className="h-4 w-4 text-whatsapp" />Notificaciones activadas en este celu.
        <button type="button" className="font-semibold text-rosa-deep hover:underline" onClick={() => run('test', async () => { await sendTestPush(); return 'Te mandé una notificación de prueba.' })}>Probar</button>
      </p>
    )
  }

  return (
    <section className={cardClass} aria-labelledby="app-title">
      <h2 id="app-title" className="flex items-center gap-2 font-display text-lg font-bold text-ciruela"><Smartphone className="h-5 w-5 text-rosa" />Tu panel en el celu</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-papel p-4">
          <p className="font-display text-sm font-bold text-ciruela">1. Instalá la app</p>
          {installed ? (
            <p className="mt-1 text-sm text-ink">¡Ya la estás usando como app! ✅</p>
          ) : canInstall ? (
            <>
              <p className="mt-1 text-sm text-ink">Queda como &quot;Panel ACV&quot; entre tus apps y abre directo acá.</p>
              <Button className="mt-3" onClick={install}>Instalar el panel</Button>
            </>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-ink">Abrí esta página en <b>Chrome</b> desde tu celu, tocá el menú <b>⋮</b> y elegí <b>&quot;Instalar app&quot;</b> o <b>&quot;Agregar a la pantalla principal&quot;</b>. Después abrí &quot;Panel ACV&quot; desde el ícono.</p>
          )}
        </div>
        <div className="rounded-2xl bg-papel p-4">
          <p className="font-display text-sm font-bold text-ciruela">2. Activá los avisos</p>
          <p className="mt-1 text-sm text-ink">Te llega una notificación cuando entra un pedido o te suben un comprobante.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {push === 'on' ? (
              <>
                <Button variant="success" busy={busy === 'test'} onClick={() => run('test', async () => { const sent = await sendTestPush(); return sent ? 'Te mandé una notificación de prueba.' : 'No encontré tu celu: desactivá y volvé a activar.' })}><BellRing className="h-4 w-4" />Probar</Button>
                <Button variant="secondary" busy={busy === 'off'} onClick={() => run('off', async () => { await disablePush(); return 'Avisos desactivados en este dispositivo.' })}><BellOff className="h-4 w-4" />Desactivar</Button>
              </>
            ) : push === 'denied' ? (
              <p className="text-sm text-rosa-deep">Las notificaciones están bloqueadas. Habilitalas en Ajustes → Apps → Panel ACV (o Chrome) → Notificaciones.</p>
            ) : push === 'unsupported' ? (
              <p className="text-sm text-piedra">Este navegador no permite avisos. Instalá el panel y abrilo desde el ícono.</p>
            ) : (
              <Button busy={busy === 'on'} onClick={() => run('on', async () => { await enablePush(userId); await sendTestPush().catch(() => 0); return '¡Listo! Te mandé una notificación de prueba.' })}><Bell className="h-4 w-4" />Activar avisos</Button>
            )}
          </div>
        </div>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${message.tone === 'ok' ? 'bg-whatsapp/10 text-whatsapp' : 'bg-petalo-wash text-rosa-deep'}`}>{message.text}</p>}
    </section>
  )
}
