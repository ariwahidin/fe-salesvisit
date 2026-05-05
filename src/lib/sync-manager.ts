import { db } from './db'
import { getPendingActions, removePendingAction, updatePendingStatus } from './pending-queue'
import { visitsApi } from './api'
import { getSchedules } from './offline-cache'

let isSyncing = false

// ─── Main sync function ──────────────────────────────────────────────────────

export async function syncPendingActions() {
  // Cegah double sync jika dipanggil bersamaan
  if (isSyncing || !navigator.onLine) return
  isSyncing = true

  console.log('[Sync] Mulai sync pending actions...')

  try {
    const pending = await getPendingActions()
    if (pending.length === 0) {
      console.log('[Sync] Tidak ada pending actions')
      return
    }

    console.log(`[Sync] Ditemukan ${pending.length} pending actions`)

    for (const action of pending) {
      // Skip jika sudah terlalu banyak retry (max 3)
      if (action.retryCount >= 3) {
        console.warn(`[Sync] Skip ${action.uuid} - retry limit reached`)
        continue
      }

      try {
        await updatePendingStatus(action.uuid, 'syncing')

        if (action.type === 'CHECK_IN') {
          await syncCheckIn(action)
        } else if (action.type === 'CHECK_OUT') {
          await syncCheckOut(action)
        }

        // Berhasil → hapus dari queue
        await removePendingAction(action.uuid)
        console.log(`[Sync] ✅ ${action.type} scheduleId:${action.scheduleId} berhasil`)

      } catch (err: any) {
        console.error(`[Sync] ❌ ${action.type} gagal:`, err.message)
        await updatePendingStatus(action.uuid, 'error', err.message)
      }
    }

    // Setelah semua sync, refresh cache jadwal hari ini
    const today = new Date().toISOString().split('T')[0]
    await getSchedules(today)
    console.log('[Sync] Cache jadwal diperbarui')

  } finally {
    isSyncing = false
  }
}

// ─── Sync Check-In ───────────────────────────────────────────────────────────

async function syncCheckIn(action: Awaited<ReturnType<typeof getPendingActions>>[0]) {
  if (!action.photoBlob) throw new Error('Photo blob tidak ditemukan')

  const payload = JSON.parse(action.payload)
  const form    = new FormData()

  form.append('latitude',         String(payload.latitude))
  form.append('longitude',        String(payload.longitude))
  form.append('idempotency_key',  action.uuid)  // kirim uuid ke server
  form.append('photo', new File(
    [action.photoBlob],
    'checkin.jpg',
    { type: 'image/jpeg' }
  ))

  await visitsApi.checkIn(action.scheduleId, form)
}

// ─── Sync Check-Out ──────────────────────────────────────────────────────────

async function syncCheckOut(action: Awaited<ReturnType<typeof getPendingActions>>[0]) {
  const payload = JSON.parse(action.payload)
  await visitsApi.checkOut(action.visitId!, payload)
}

// ─── Auto sync saat online ───────────────────────────────────────────────────

export function initSyncManager() {
  // Sync saat koneksi pulih
  window.addEventListener('online', () => {
    console.log('[Sync] Koneksi pulih, memulai sync...')
    syncPendingActions()
  })

  // Sync saat app pertama dibuka (kalau online)
  if (navigator.onLine) {
    syncPendingActions()
  }
}