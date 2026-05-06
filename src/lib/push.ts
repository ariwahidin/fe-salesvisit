import { req } from './api'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

// Convert VAPID public key dari base64 ke Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer
}

// Minta permission + subscribe ke push service
export async function subscribePush(): Promise<boolean> {
  try {
    // Cek support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notification tidak didukung browser ini')
      return false
    }

    // Minta permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Permission push notification ditolak')
      return false
    }

    // Ambil service worker registration
    const registration = await navigator.serviceWorker.ready

    // Subscribe ke push service browser
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    // Kirim subscription token ke backend — pakai req() supaya bawa JWT
    const sub = subscription.toJSON()
    await req('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: sub.keys?.p256dh,
        auth: sub.keys?.auth,
      }),
    })

    return true
  } catch (err) {
    console.error('Gagal subscribe push:', err)
    return false
  }
}

// Unsubscribe dari push
export async function unsubscribePush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    const sub = subscription.toJSON()
    await req('/api/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })

    await subscription.unsubscribe()
  } catch (err) {
    console.error('Gagal unsubscribe push:', err)
  }
}

// Cek apakah sudah subscribe
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}