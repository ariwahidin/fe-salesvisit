import { db, LocalSchedule, LocalProduct, isExpired } from './db'
import { schedulesApi, productsApi } from './api'

// ─── Schedules ───────────────────────────────────────────────────────────────

/**
 * Ambil jadwal untuk tanggal tertentu.
 * Online  → fetch dari server, simpan ke IndexedDB, return data
 * Offline → ambil dari IndexedDB
 */
export async function getSchedules(date: string): Promise<LocalSchedule[]> {
  const isOnline = navigator.onLine

  if (isOnline) {
    try {
      const res = await schedulesApi.my(date)
      const data: LocalSchedule[] = (res.data || []).map((s: any) => ({
        id:         s.ID,
        sales_id:   s.sales_id,
        store_id:   s.store_id,
        store:      s.store ? {
          id:        s.store.ID,
          name:      s.store.name,
          code:      s.store.code,
          address:   s.store.address,
          city:      s.store.city,
          phone:     s.store.phone,
          latitude:  s.store.latitude,
          longitude: s.store.longitude,
        } : undefined,
        visit_date: date,
        notes:      s.notes,
        status:     s.status,
        visit:      s.visit ? {
          id:                  s.visit.ID,
          schedule_id:         s.visit.schedule_id,
          sales_id:            s.visit.sales_id,
          store_id:            s.visit.store_id,
          check_in_at:         s.visit.check_in_at,
          check_in_lat:        s.visit.check_in_lat,
          check_in_lng:        s.visit.check_in_lng,
          check_in_photo_url:  s.visit.check_in_photo_url,
          check_out_at:        s.visit.check_out_at,
          status:              s.visit.status,
          notes:               s.visit.notes,
          draft_stock:         s.visit.draft_stock,
          stock_counts:        s.visit.stock_counts || [],
        } : undefined,
        cachedAt: Date.now(),
      }))

      // Simpan ke IndexedDB (upsert)
      await db.schedules.bulkPut(data)
      return data

    } catch (err) {
      // Fetch gagal walau online (misal server error) → fallback ke cache
      console.warn('[Cache] Fetch schedules gagal, pakai cache:', err)
      return getSchedulesFromCache(date)
    }

  } else {
    return getSchedulesFromCache(date)
  }
}

async function getSchedulesFromCache(date: string): Promise<LocalSchedule[]> {
  const cached = await db.schedules
    .where('visit_date').equals(date)
    .toArray()

  // Filter expired
  return cached.filter(s => !isExpired(s.cachedAt, 'schedules'))
}

// ─── Products ────────────────────────────────────────────────────────────────

/**
 * Ambil semua produk aktif.
 * Online  → fetch dari server jika cache expired atau kosong
 * Offline → ambil dari IndexedDB
 */
export async function getProducts(): Promise<LocalProduct[]> {
  const isOnline = navigator.onLine

  if (isOnline) {
    // Cek dulu apakah cache masih valid
    const cached = await db.products.toArray()
    const stillValid = cached.length > 0 && !isExpired(cached[0].cachedAt, 'products')

    if (stillValid) {
      return cached.filter(p => p.is_active)
    }

    try {
      const res = await productsApi.list({ active_only: true })
      const data: LocalProduct[] = (res.data || []).map((p: any) => ({
        id:        p.ID,
        name:      p.name,
        sku:       p.sku,
        barcode:   p.barcode,
        category:  p.category,
        unit:      p.unit,
        is_active: p.is_active,
        cachedAt:  Date.now(),
      }))

      await db.products.bulkPut(data)
      return data

    } catch (err) {
      console.warn('[Cache] Fetch products gagal, pakai cache:', err)
      return db.products.where('is_active').equals(1).toArray()
    }

  } else {
    return db.products.where('is_active').equals(1).toArray()
  }
}

// ─── Update status lokal (saat offline action) ───────────────────────────────

/**
 * Update status schedule di IndexedDB secara lokal
 * Dipanggil saat check-in/checkout offline agar UI langsung update
 */
export async function updateLocalScheduleStatus(
  scheduleId: number,
  status: LocalSchedule['status'],
  visit?: LocalSchedule['visit']
) {
  await db.schedules.where('id').equals(scheduleId).modify(s => {
    s.status = status
    if (visit) s.visit = visit
  })
}