// Service worker of the installed apps (Vale's panel and the team's screen): shows push notifications and opens the right screen when tapped.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = { title: 'Armado de CV', body: 'Tenés una novedad en el panel.', url: '/admin' }
  try { data = { ...data, ...event.data.json() } } catch { /* plain text or empty push */ }
  // A dot/number on the app icon until the panel is opened (where supported).
  if (self.navigator.setAppBadge) self.navigator.setAppBadge().catch(() => {})
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: data.url },
    // Each item its own notification (two packs of one order show twice), with sound and vibration so it pops up.
    tag: data.tag || data.title,
    renotify: true,
    vibrate: [200, 100, 200],
    // A new CV stays on screen until it is tapped or dismissed.
    requireInteraction: Boolean(data.sticky),
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin)
  // Open it in the app it belongs to: Vale's panel (/admin) or the team's screen (/equipo).
  const section = url.pathname.split('/')[1]
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const open = windows.find((client) => new URL(client.url).pathname.split('/')[1] === section)
    if (open) return open.navigate(url.href).then((client) => (client || open).focus())
    return self.clients.openWindow(url.href)
  }))
})
