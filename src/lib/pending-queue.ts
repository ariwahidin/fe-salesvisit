import { db, PendingAction } from './db'
import { v4 as uuidv4 } from 'uuid'

// ─── Tambah ke queue ─────────────────────────────────────────────────────────

export async function queueCheckIn(
  scheduleId: number,
  payload: { latitude: number; longitude: number },
  photoBlob: Blob
) {
  const action: PendingAction = {
    uuid:       uuidv4(),
    type:       'CHECK_IN',
    scheduleId,
    payload:    JSON.stringify(payload),
    photoBlob,
    status:     'pending',
    retryCount: 0,
    createdAt:  Date.now(),
  }
  await db.pendingActions.add(action)
  return action.uuid
}

// ─── Ambil semua pending ─────────────────────────────────────────────────────

export async function getPendingActions() {
  return db.pendingActions
    .where('status').anyOf(['pending', 'error'])
    .sortBy('createdAt')
}

// ─── Hapus setelah berhasil sync ─────────────────────────────────────────────

export async function removePendingAction(uuid: string) {
  await db.pendingActions.where('uuid').equals(uuid).delete()
}

// ─── Update status di queue ──────────────────────────────────────────────────

export async function updatePendingStatus(
  uuid: string,
  status: PendingAction['status'],
  errorMessage?: string
) {
  await db.pendingActions.where('uuid').equals(uuid).modify(a => {
    a.status = status
    if (errorMessage) a.errorMessage = errorMessage
    if (status === 'error') a.retryCount += 1
  })
}