// Service worker of the admin app: shows push notifications (new orders, receipts) and opens the panel when tapped.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = { title: 'Armado de CV', body: 'Tenés una novedad en el panel.', url: '/admin' }
  try { data = { ...data, ...event.data.json() } } catch { /* plain text or empty push */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url },
    tag: data.title,
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const open = windows.find((client) => client.url.includes('/admin'))
    if (open) return open.navigate(url).then((client) => (client || open).focus())
    return self.clients.openWindow(url)
  }))
})
