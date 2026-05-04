'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { schedulesApi, recurringApi, usersApi, storesApi, DAY_NAMES, formatDate } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Plus, Repeat2, CalendarDays, Loader2, X, Save,
  Trash2, RefreshCw, Zap, ChevronDown
} from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'

type Tab = 'manual' | 'recurring'

export default function SchedulesPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  return isAdmin ? <AdminSchedules /> : <SalesSchedules />
}

/* ─── Admin ──────────────────────────────────────────────────────────────── */
function AdminSchedules() {
  const [tab, setTab] = useState<Tab>('manual')
  const [schedules, setSchedules] = useState<any[]>([])
  const [recurrings, setRecurrings] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterSales, setFilterSales] = useState('')
  const [modal, setModal] = useState<'schedule' | 'recurring' | 'generate' | null>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [genResult, setGenResult] = useState<any>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, rRes, uRes, stRes] = await Promise.all([
        schedulesApi.list({ date: filterDate, sales_id: filterSales }),
        recurringApi.list(),
        usersApi.list({ role: 'sales', active_only: true }),
        storesApi.list({ active_only: true }),
      ])
      setSchedules(sRes.data || [])
      setRecurrings(rRes.data || [])
      setSales(uRes.data || [])
      setStores(stRes.data || [])
    } finally { setLoading(false) }
  }, [filterDate, filterSales])

  useEffect(() => { loadAll() }, [loadAll])

  const openCreate = (type: Tab) => {
    setForm({})
    setError('')
    setModal(type === 'manual' ? 'schedule' : 'recurring')
  }

  // const saveSchedule = async () => {
  //   if (!form.sales_id || !form.store_id || !form.visit_date) {
  //     setError('Sales, toko, dan tanggal wajib diisi'); return
  //   }
  //   setSaving(true); setError('')
  //   try {
  //     await schedulesApi.create(form)
  //     setModal(null); loadAll()
  //   } catch (e: any) { setError(e.message) }
  //   finally { setSaving(false) }
  // }

  // const saveRecurring = async () => {
  //   if (!form.sales_id || !form.store_id || form.day_of_week === undefined) {
  //     setError('Sales, toko, dan hari wajib diisi'); return
  //   }
  //   setSaving(true); setError('')
  //   try {
  //     await recurringApi.create({ ...form, day_of_week: parseInt(form.day_of_week) })
  //     setModal(null); loadAll()
  //   } catch (e: any) { setError(e.message) }
  //   finally { setSaving(false) }
  // }


  const saveSchedule = async () => {
    if (!form.sales_id || !form.store_id || !form.visit_date) {
      setError('Sales, toko, dan tanggal wajib diisi'); return
    }

    console.log('All Sales:', sales)

    console.log('Saving schedule with data:', {
      ...form,
      sales_id: parseInt(form.sales_id),
      store_id: parseInt(form.store_id),
    })

    // return

    setSaving(true); setError('')
    try {
      await schedulesApi.create({
        ...form,
        sales_id: parseInt(form.sales_id),  // ← tambah ini
        store_id: parseInt(form.store_id),  // ← tambah ini
      })
      setModal(null); loadAll()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const saveRecurring = async () => {
    if (!form.sales_id || !form.store_id || form.day_of_week === undefined) {
      setError('Sales, toko, dan hari wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      await recurringApi.create({
        ...form,
        sales_id: parseInt(form.sales_id),    // ← tambah ini
        store_id: parseInt(form.store_id),    // ← tambah ini
        day_of_week: parseInt(form.day_of_week), // sudah ada, pastikan tetap
      })
      setModal(null); loadAll()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const generate = async () => {
    if (!form.start_date || !form.end_date) {
      setError('Tanggal mulai dan selesai wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      const res = await recurringApi.generate(form.start_date, form.end_date)
      setGenResult(res)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const deleteSchedule = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return
    await schedulesApi.remove(id); loadAll()
  }

  const deleteRecurring = async (id: number) => {
    if (!confirm('Hapus recurring ini?')) return
    await recurringApi.remove(id); loadAll()
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold text-surface-900">Jadwal</h1>
          <div className="flex gap-2">
            <button onClick={() => { setModal('generate'); setForm({}); setGenResult(null); setError('') }}
              className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Generate
            </button>
            <button onClick={() => openCreate(tab)}
              className="btn-brand px-3 py-2 text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-1 p-1 bg-surface-100 rounded-2xl">
          {(['manual', 'recurring'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5',
                tab === t ? 'bg-white text-surface-900 shadow-card' : 'text-surface-500')}>
              {t === 'manual' ? <><CalendarDays className="w-3.5 h-3.5" /> Manual</> : <><Repeat2 className="w-3.5 h-3.5" /> Recurring</>}
            </button>
          ))}
        </div>

        {tab === 'manual' && (
          <>
            {/* Filters */}
            <div className="flex gap-2">
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="input flex-1 text-xs py-2" />
              <select value={filterSales} onChange={e => setFilterSales(e.target.value)}
                className="input flex-1 text-xs py-2">
                <option value="">Semua Sales</option>
                {sales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={loadAll} className="p-2 btn-ghost">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? <Skeleton /> : schedules.length === 0 ? (
              <Empty label="Belum ada jadwal" />
            ) : (
              <div className="space-y-2">
                {schedules.map((s: any) => (
                  <div key={s.ID} className="card p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={s.status} />
                        <span className="text-xs text-surface-400">{formatDate(s.visit_date)}</span>
                      </div>
                      <p className="font-bold text-sm text-surface-900">{s.store?.name}</p>
                      <p className="text-xs text-surface-500">{s.sales?.name}</p>
                      {s.notes && <p className="text-xs text-surface-400 mt-0.5 italic">"{s.notes}"</p>}
                    </div>
                    {s.status === 'scheduled' && (
                      <button onClick={() => deleteSchedule(s.ID)}
                        className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'recurring' && (
          <>
            {loading ? <Skeleton /> : recurrings.length === 0 ? (
              <Empty label="Belum ada jadwal recurring" />
            ) : (
              <div className="space-y-2">
                {recurrings.map((r: any) => (
                  <div key={r.ID} className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-600">{DAY_NAMES[r.day_of_week].slice(0, 3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-surface-900">{r.store?.name}</p>
                      <p className="text-xs text-surface-500">{r.sales?.name} · setiap {DAY_NAMES[r.day_of_week]}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn('badge', r.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-500')}>
                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button onClick={() => deleteRecurring(r.ID)}
                        className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Schedule Modal */}
      {modal === 'schedule' && (
        <Modal title="Tambah Jadwal" onClose={() => setModal(null)}>
          {error && <ErrBox msg={error} />}
          <div className="space-y-3">
            <div>
              <label className="label">Sales</label>
              <select value={form.sales_id || ''} onChange={e => setForm({ ...form, sales_id: e.target.value })} className="input">
                <option value="">Pilih sales...</option>
                {sales.map(s => <option key={s.ID} value={s.ID}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Toko</label>
              <select value={form.store_id || ''} onChange={e => setForm({ ...form, store_id: e.target.value })} className="input">
                <option value="">Pilih toko...</option>
                {stores.map(s => <option key={s.ID} value={s.ID}>{s.name} - {s.city}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tanggal Kunjungan</label>
              <input type="date" value={form.visit_date || ''} onChange={e => setForm({ ...form, visit_date: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Catatan</label>
              <input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opsional" className="input" />
            </div>
            <button onClick={saveSchedule} disabled={saving} className="btn-brand w-full py-3 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Jadwal
            </button>
          </div>
        </Modal>
      )}

      {/* Create Recurring Modal */}
      {modal === 'recurring' && (
        <Modal title="Tambah Recurring" onClose={() => setModal(null)}>
          {error && <ErrBox msg={error} />}
          <div className="space-y-3">
            <div>
              <label className="label">Sales</label>
              <select value={form.sales_id || ''} onChange={e => setForm({ ...form, sales_id: e.target.value })} className="input">
                <option value="">Pilih sales...</option>
                {sales.map(s => <option key={s.ID} value={s.ID}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Toko</label>
              <select value={form.store_id || ''} onChange={e => setForm({ ...form, store_id: e.target.value })} className="input">
                <option value="">Pilih toko...</option>
                {stores.map(s => <option key={s.ID} value={s.ID}>{s.name} - {s.city}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hari Kunjungan</label>
              <select value={form.day_of_week ?? ''} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className="input">
                <option value="">Pilih hari...</option>
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Catatan</label>
              <input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opsional" className="input" />
            </div>
            <button onClick={saveRecurring} disabled={saving} className="btn-brand w-full py-3 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat2 className="w-4 h-4" />}
              Simpan Recurring
            </button>
          </div>
        </Modal>
      )}

      {/* Generate Modal */}
      {modal === 'generate' && (
        <Modal title="Generate Jadwal dari Recurring" onClose={() => setModal(null)}>
          {error && <ErrBox msg={error} />}
          {genResult ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-surface-900">Generate Selesai</p>
              <p className="text-sm text-surface-500 mt-1">{genResult.created} jadwal dibuat, {genResult.skipped} dilewati</p>
              <button onClick={() => { setModal(null); loadAll() }} className="btn-brand w-full py-3 mt-4">Tutup & Refresh</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-surface-600">Sistem akan membuat jadwal dari semua recurring aktif dalam rentang tanggal ini.</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Dari Tanggal</label>
                  <input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Sampai Tanggal</label>
                  <input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input" />
                </div>
              </div>
              <button onClick={generate} disabled={saving} className="btn-brand w-full py-3 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {saving ? 'Generating...' : 'Generate Sekarang'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </AppLayout>
  )
}

/* ─── Sales: own schedules ───────────────────────────────────────────────── */
function SalesSchedules() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    try { const r = await schedulesApi.my(date); setSchedules(r.data || []) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [date])

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold">Jadwal Saya</h1>
          <button onClick={load} className="p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
        {loading ? <Skeleton /> : schedules.length === 0 ? (
          <Empty label="Tidak ada jadwal hari ini" />
        ) : (
          <div className="space-y-3">
            {schedules.map((s: any) => (
              <div key={s.ID} className={cn('card p-4 border-l-4',
                s.status === 'completed' ? 'border-green-400' :
                  s.status === 'in_progress' ? 'border-amber-400' : 'border-surface-200')}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-surface-900">{s.store?.name}</p>
                    <p className="text-xs text-surface-500">{s.store?.city} · {s.store?.address}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                {!s.visit && s.status === 'scheduled' && (
                  <a href={`/schedules/${s.ID}/checkin`}
                    className="btn-brand w-full py-2.5 text-sm mt-3 flex items-center justify-center gap-1.5">
                    📍 Check-In
                  </a>
                )}
                {s.visit?.status === 'checked_in' && (
                  <a href={`/visits/${s.visit.ID}/checkout`}
                    className="btn-brand w-full py-2.5 text-sm mt-3 flex items-center justify-center gap-1.5"
                    style={{ background: '#f59e0b' }}>
                    📦 Input Stok & Check-Out
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

/* ─── Shared UI ──────────────────────────────────────────────────────────── */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-4xl sm:rounded-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-xl transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{msg}</div>
}
function Skeleton() {
  return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface-100 rounded-3xl animate-pulse" />)}</div>
}
function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-12 text-surface-400">
      <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-semibold">{label}</p>
    </div>
  )
}
