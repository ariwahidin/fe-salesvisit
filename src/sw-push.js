// ─── Push Notification Handler ───────────────────────────────────────────────
// File ini di-merge otomatis oleh next-pwa ke dalam service worker

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'salesVisit', body: event.data.text() }
  }

  const title = payload.title || 'salesVisit'
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/dashboard' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau app sudah terbuka, fokus ke tab itu
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Kalau belum terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})