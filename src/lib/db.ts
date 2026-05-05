import Dexie, { Table } from 'dexie'

// ─── Tipe data (mengikuti model backend Go) ──────────────────────────────────

export interface LocalStore {
  id: number
  name: string
  code: string
  address: string
  city: string
  phone?: string
  latitude?: number
  longitude?: number
}

export interface LocalProduct {
  id: number
  name: string
  sku: string
  barcode?: string
  category?: string
  unit: string
  is_active: boolean
  cachedAt: number
}

export interface LocalStockCount {
  product_id: number
  product?: LocalProduct
  qty: number
  notes?: string
}

export interface LocalVisit {
  id: number
  schedule_id: number
  sales_id: number
  store_id: number
  check_in_at?: string
  check_in_lat?: number
  check_in_lng?: number
  check_in_photo_url?: string
  check_out_at?: string
  check_out_lat?: number
  check_out_lng?: number
  status: 'pending' | 'checked_in' | 'completed' | 'in_progress'
  notes?: string
  draft_stock?: string
  stock_counts?: LocalStockCount[]
}

export interface LocalSchedule {
  id: number
  sales_id: number
  store_id: number
  store?: LocalStore
  visit_date: string        // "2006-01-02"
  notes?: string
  status: 'scheduled' | 'completed' | 'skipped' | 'in_progress'
  visit?: LocalVisit        // nested, sesuai MyScheduleResponse
  cachedAt: number
}

export interface PendingAction {
  id?: number               // auto-increment IndexedDB
  uuid: string              // idempotency key
  type: 'CHECK_IN' | 'CHECK_OUT'
  scheduleId: number
  visitId?: number          // ada setelah check-in berhasil
  payload: string           // JSON: lat, lng, notes, stock_counts
  photoBlob?: Blob          // hanya untuk CHECK_IN
  status: 'pending' | 'syncing' | 'error'
  errorMessage?: string
  retryCount: number
  createdAt: number
}

// ─── Database ────────────────────────────────────────────────────────────────

class AppDatabase extends Dexie {
  schedules!: Table<LocalSchedule>
  products!: Table<LocalProduct>
  pendingActions!: Table<PendingAction>

  constructor() {
    super('SalesVisitDB')

    this.version(1).stores({
      // index yang sering diquery
      schedules:      'id, visit_date, status, cachedAt',
      products:       'id, sku, barcode, cachedAt',
      pendingActions: '++id, uuid, type, scheduleId, status, createdAt',
    })
  }
}

export const db = new AppDatabase()

// ─── Expiry config ───────────────────────────────────────────────────────────

const EXPIRY_MS = {
  schedules: 1 * 24 * 60 * 60 * 1000,  // 1 hari
  products:  7 * 24 * 60 * 60 * 1000,  // 7 hari
}

export function isExpired(cachedAt: number, type: keyof typeof EXPIRY_MS) {
  return Date.now() - cachedAt > EXPIRY_MS[type]
}

export async function clearExpiredCache() {
  const now = Date.now()
  await db.schedules
    .where('cachedAt').below(now - EXPIRY_MS.schedules)
    .delete()
  await db.products
    .where('cachedAt').below(now - EXPIRY_MS.products)
    .delete()
}