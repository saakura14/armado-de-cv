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

// Sharing to the panel app from WhatsApp (Android share sheet, see share_target in admin.webmanifest). A shared note
// opens "Venta por WhatsApp" as always; shared files (a CV, photos, voice notes, an exported chat) wait in the
// "compartido" cache until the panel asks which order they belong to.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/admin/compartir') return
  event.respondWith((async () => {
    const data = await event.request.formData()
    const params = new URLSearchParams()
    for (const key of ['title', 'text', 'url']) {
      const value = data.get(key)
      if (typeof value === 'string' && value.trim()) params.set(key, value)
    }
    const files = data.getAll('files').filter((file) => file instanceof File && file.size > 0)
    if (files.length) {
      const cache = await caches.open('compartido')
      for (const request of await cache.keys()) await cache.delete(request)
      await Promise.all(files.map((file, index) => cache.put(`/compartido/${index}`, new Response(file, {
        headers: { 'content-type': file.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(file.name || `archivo-${index + 1}`) },
      }))))
      params.set('archivos', String(files.length))
    }
    return Response.redirect(`/admin${params.size ? `?${params}` : ''}`, 303)
  })())
})
