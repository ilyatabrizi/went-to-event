const CACHE = 'wte-web-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      '/demo',
      '/manifest.webmanifest',
      '/assets/icons/favicon_192.png',
      '/assets/icons/favicon_512.png',
      '/assets/icons/apple-touch-icon.png',
    ])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('wte-web-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/'))),
  )
})

self.addEventListener('push', (event) => {
    let data = { title: 'Went To Event', body: 'You have a new notification.', url: '/demo' }
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) }
  } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/icons/favicon_192.png',
    badge: '/assets/icons/favicon_192.png',
    data: { url: data.url },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url ?? '/demo', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => 'focus' in client)
    return existing ? existing.focus() : clients.openWindow(target)
  }))
})
