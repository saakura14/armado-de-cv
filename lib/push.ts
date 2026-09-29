'use client'

// Push notifications on the admin's phone. The private half of the VAPID key lives in Supabase Vault.
import { supabase } from './supabase'

export const VAPID_PUBLIC_KEY = 'BAUX54pcyjJPBzFUUmOqegMR22QJybsguN4izT2yMfqDiyjC1vAhURMWo5_jQOfK0squ_WR2AmRxHZR5FXQBl5I'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  return subscription && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Asks for permission, subscribes this device and saves it for the notify-admin function. */
export async function enablePush(userId: string) {
  if (!pushSupported()) throw new Error('Este navegador no permite notificaciones. Instalá el panel en la pantalla de inicio y abrilo desde ahí.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('No diste permiso para las notificaciones. Podés habilitarlo en los ajustes del celu, en la app o en Chrome.')
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  const subscription = (await registration.pushManager.getSubscription())
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
  const { endpoint, keys } = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.from('push_subscriptions').upsert({ endpoint, user_id: userId, p256dh: keys.p256dh, auth: keys.auth })
  if (error) throw error
}

/**
 * Runs each time the panel opens: if notifications are allowed here, make sure this device's current subscription is saved.
 * Phones renew subscriptions on their own (app reinstalled, Chrome updated); without this the old one kept receiving nothing.
 */
export async function syncPush(userId: string) {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    const subscription = (await registration.pushManager.getSubscription())
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
    const { endpoint, keys } = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    await supabase.from('push_subscriptions').upsert({ endpoint, user_id: userId, p256dh: keys.p256dh, auth: keys.auth })
  } catch { /* notifications are a bonus: the panel works the same */ }
}

/** Number on the app icon (where the phone or computer supports it). */
export function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  if (count > 0) nav.setAppBadge?.(count).catch(() => undefined)
  else nav.clearAppBadge?.().catch(() => undefined)
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('notify-admin', { body: { test: true } })
  if (error) throw error
  return (data as { sent: number }).sent
}

/** Tells the admin about a new order or receipt. Never blocks or breaks the customer's flow. */
export function notifyAdmin(orderId: string, kind: 'new_order' | 'receipt') {
  supabase.functions.invoke('notify-admin', { body: { order_id: orderId, kind } }).then(() => undefined, () => undefined)
}
