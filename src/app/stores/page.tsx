'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { storesApi, regionsApi, areasApi, productsApi } from '@/lib/api'
import {
  Store, Plus, Search, Edit, Trash2, X, Save, Loader2, MapPin,
  Package, ChevronDown, CheckCircle2, Circle, AlertCircle,
  ChevronRight, Building2, RefreshCw, Eye, Map, Filter,
  ToggleLeft, ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Level = 'must_check' | 'regular' | 'optional'

interface region { ID: number; name: string; code: string; is_active: boolean }
interface area   { ID: number; name: string; code: string; region_id: number; is_active: boolean; region?: region }
interface StoreT {
  ID: number; name: string; code: string; address: string; city: string
  phone: string; latitude: number; longitude: number; is_active: boolean
  area_id?: number; area?: area; company_id: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVELS: { value: Level; label: string; badge: string; dot: string }[] = [
  { value: 'must_check', label: 'Must Check', badge: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-400' },
  { value: 'regular',    label: 'Regular',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  { value: 'optional',   label: 'Optional',   badge: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-300' },
]

// ─── Store Products API ───────────────────────────────────────────────────────

const storeProductsApi = {
  get: async (storeId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stores/${storeId}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  },
  set: async (storeId: number, products: { product_id: number; level: Level }[]) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stores/${storeId}/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ products }),
    })
    return res.json()
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 transition"

function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
      </div>
      <div className={cn('w-2 h-8 rounded-full ml-auto', color)} />
    </div>
  )
}

function StatusPill({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Aktif</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-300" />Nonaktif</span>
}

function LevelBadge({ level }: { level: Level }) {
  const l = LEVELS.find(x => x.value === level)
  if (!l) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg', l.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', l.dot)} />{l.label}
    </span>
  )
}

function LevelSelector({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const [open, setOpen] = useState(false)
  const current = LEVELS.find(l => l.value === value)!
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition', current.badge)}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', current.dot)} />
        {current.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
          {LEVELS.map(l => (
            <button
              key={l.value}
              onClick={() => { onChange(l.value); setOpen(false) }}
              className={cn('flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition text-left', value === l.value && 'bg-slate-50')}
            >
              <span className={cn('w-2 h-2 rounded-full', l.dot)} />
              <span>{l.label}</span>
              {value === l.value && <CheckCircle2 className="w-3 h-3 text-blue-500 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Assign Products Modal ────────────────────────────────────────────────────

function AssignProductsModal({ store, onClose }: { store: StoreT; onClose: () => void }) {
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [assigned, setAssigned] = useState<Record<number, Level>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState<Level | 'all'>('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [prodRes, assignRes] = await Promise.all([
          productsApi.list({ active_only: true }),
          storeProductsApi.get(store.ID),
        ])
        setAllProducts(prodRes.data || [])
        const map: Record<number, Level> = {}
        for (const sp of (assignRes.data || [])) map[sp.product_id] = sp.level
        setAssigned(map)
      } finally { setLoading(false) }
    }
    load()
  }, [store.ID])

  const filtered = useMemo(() => {
    let list = allProducts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p: any) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
      )
    }
    if (activeFilter !== 'all') list = list.filter((p: any) => assigned[p.ID] === activeFilter)
    return list
  }, [allProducts, search, activeFilter, assigned])

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const p of filtered) {
      const cat = p.category || 'Lainnya'
      if (!map[cat]) map[cat] = []
      map[cat].push(p)
    }
    return map
  }, [filtered])

  const toggle = (productId: number, level: Level) => {
    setAssigned(prev => {
      const next = { ...prev }
      if (next[productId] === level) delete next[productId]
      else next[productId] = level
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const products = Object.entries(assigned).map(([id, level]) => ({ product_id: Number(id), level }))
      await storeProductsApi.set(store.ID, products)
      onClose()
    } finally { setSaving(false) }
  }

  const counts = {
    must:     Object.values(assigned).filter(l => l === 'must_check').length,
    regular:  Object.values(assigned).filter(l => l === 'regular').length,
    optional: Object.values(assigned).filter(l => l === 'optional').length,
    total:    Object.keys(assigned).length,
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900">Assign Produk</h2>
            <p className="text-xs text-slate-400 truncate">
              {store.name} · <span className="font-mono">{store.code}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-5 py-3 border-b border-slate-100 flex-wrap">
          {[
            { f: 'all' as const,       label: `Semua · ${allProducts.length}`,  cls: 'bg-slate-100 text-slate-600' },
            { f: 'must_check' as const, label: `Must Check · ${counts.must}`,    cls: 'bg-rose-100 text-rose-700' },
            { f: 'regular' as const,   label: `Regular · ${counts.regular}`,    cls: 'bg-blue-100 text-blue-700' },
            { f: 'optional' as const,  label: `Optional · ${counts.optional}`,  cls: 'bg-slate-100 text-slate-500' },
          ].map(({ f, label, cls }) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'text-[11px] font-bold px-3 py-1 rounded-xl transition',
                cls,
                activeFilter === f ? 'ring-2 ring-offset-1 ring-blue-400' : 'opacity-60 hover:opacity-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, SKU, kategori..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50" />
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Tidak ada produk</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, products]) => (
                <div key={category}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{category}</p>
                  <div className="space-y-1">
                    {products.map((p: any) => {
                      const currentLevel = assigned[p.ID]
                      const isAssigned = !!currentLevel
                      return (
                        <div key={p.ID} className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition',
                          isAssigned ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent hover:border-slate-200'
                        )}>
                          <button onClick={() => toggle(p.ID, currentLevel || 'regular')} className="shrink-0">
                            {isAssigned
                              ? <CheckCircle2 className="w-5 h-5 text-blue-500" />
                              : <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400 transition" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-semibold truncate', isAssigned ? 'text-slate-900' : 'text-slate-500')}>{p.name}</p>
                            <p className="text-xs text-slate-400">{p.sku} · {p.unit}</p>
                          </div>
                          {isAssigned && (
                            <LevelSelector value={currentLevel} onChange={level => setAssigned(prev => ({ ...prev, [p.ID]: level }))} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          <span className="text-xs text-slate-400 flex-1">
            <span className="font-bold text-slate-700">{counts.total}</span> produk di-assign
          </span>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Store Form Modal ─────────────────────────────────────────────────────────

function StoreModal({ mode, store, areas, onClose, onSave }: {
  mode: 'create' | 'edit'
  store?: StoreT
  areas: area[]
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState<any>(
    store
      ? { ...store, area_id: store.area_id ?? '', latitude: store.latitude || '', longitude: store.longitude || '' }
      : { name: '', code: '', address: '', city: '', phone: '', latitude: '', longitude: '', area_id: '', is_active: true }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groupedAreas = useMemo(() => {
    const map: Record<string, area[]> = {}
    for (const a of areas) {
      const rname = a.region?.name ?? 'Tanpa Region'
      if (!map[rname]) map[rname] = []
      map[rname].push(a)
    }
    return map
  }, [areas])

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.name || !form.code) { setError('Nama dan kode wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        latitude:  parseFloat(form.latitude)  || 0,
        longitude: parseFloat(form.longitude) || 0,
        area_id:   form.area_id ? Number(form.area_id) : null,
      }
      if (mode === 'create') await storesApi.create(payload)
      else await storesApi.update(store!.ID, payload)
      onSave()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">{mode === 'create' ? 'Tambah Toko' : 'Edit Toko'}</h2>
            {mode === 'edit' && store && <p className="text-xs text-slate-400 font-mono mt-0.5">{store.code}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
          )}

          {/* Nama + Kode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nama Toko" required>
                <input value={form.name || ''} onChange={f('name')} placeholder="Toko Maju Jaya" className={inputCls} />
              </Field>
            </div>
            <Field label="Kode" required>
              <input value={form.code || ''} onChange={f('code')} placeholder="TK-001" className={cn(inputCls, 'font-mono')} />
            </Field>
            <Field label="Telepon">
              <input value={form.phone || ''} onChange={f('phone')} placeholder="021-xxx" className={inputCls} />
            </Field>
          </div>

          {/* Area */}
          <Field label="Area">
            <select value={form.area_id || ''} onChange={f('area_id')} className={inputCls}>
              <option value="">Tanpa Area</option>
              {Object.entries(groupedAreas).map(([region, areaList]) => (
                <optgroup key={region} label={region}>
                  {areaList.map(a => (
                    <option key={a.ID} value={a.ID}>{a.name} ({a.code})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          {/* Kota + Alamat */}
          <Field label="Kota">
            <input value={form.city || ''} onChange={f('city')} placeholder="Jakarta" className={inputCls} />
          </Field>

          <Field label="Alamat">
            <textarea value={form.address || ''} onChange={f('address')} placeholder="Jl. Sudirman No. 1" rows={2}
              className={cn(inputCls, 'resize-none')} />
          </Field>

          {/* Koordinat */}
          <Field label={<span className="flex items-center gap-1.5"><Map className="w-3.5 h-3.5" />Koordinat</span>}>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="any" value={form.latitude || ''} onChange={f('latitude')}
                placeholder="-6.2088" className={cn(inputCls, 'font-mono')} />
              <input type="number" step="any" value={form.longitude || ''} onChange={f('longitude')}
                placeholder="106.8456" className={cn(inputCls, 'font-mono')} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Latitude · Longitude</p>
          </Field>

          {/* Status toggle (edit only) */}
          {mode === 'edit' && (
            <Field label="Status">
              <div className="flex gap-2">
                {[{ v: true, label: 'Aktif', cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                  { v: false, label: 'Nonaktif', cls: 'bg-red-50 border-red-300 text-red-500' }].map(({ v, label, cls }) => (
                  <button
                    key={String(v)}
                    onClick={() => setForm((p: any) => ({ ...p, is_active: v }))}
                    className={cn(
                      'flex-1 py-2 text-xs font-bold rounded-xl border-2 transition',
                      form.is_active === v ? cls : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : mode === 'create' ? 'Buat Toko' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StoresPage() {
  const [stores, setStores]   = useState<StoreT[]>([])
  const [regions, setRegions] = useState<region[]>([])
  const [areas, setAreas]     = useState<area[]>([])
  const [loading, setLoading] = useState(true)
  const [productCounts, setProductCounts] = useState<Record<number, number>>({})

  // Filters
  const [search, setSearch]           = useState('')
  const [filterRegion, setFilterRegion] = useState(0)
  const [filterArea, setFilterArea]   = useState(0)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [modal, setModal]             = useState<'create' | 'edit' | null>(null)
  const [selectedStore, setSelectedStore] = useState<StoreT | undefined>()
  const [assignStore, setAssignStore] = useState<StoreT | null>(null)

  // Load meta once
  useEffect(() => {
    Promise.all([
      regionsApi.list({ active_only: false }),
      areasApi.list({ active_only: false }),
    ]).then(([rRes, aRes]) => {
      setRegions(rRes.data || [])
      setAreas(aRes.data || [])
    })
  }, [])

  const loadStores = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (search) q.set('search', search)
      if (filterArea) q.set('area_id', String(filterArea))
      else if (filterRegion) q.set('region_id', String(filterRegion))
      if (filterStatus === 'active') q.set('active_only', 'true')

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stores?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setStores(data.data || [])
    } finally { setLoading(false) }
  }, [search, filterRegion, filterArea, filterStatus])

  useEffect(() => { loadStores() }, [loadStores])

  // Load product counts
  useEffect(() => {
    if (!stores.length) return
    Promise.all(stores.map(async s => {
      try {
        const res = await storeProductsApi.get(s.ID)
        return [s.ID, res.total || 0] as const
      } catch { return [s.ID, 0] as const }
    })).then(results => {
      setProductCounts(Object.fromEntries(results))
    })
  }, [stores])

  const filteredAreas = filterRegion
    ? areas.filter(a => a.region_id === filterRegion)
    : areas

  const displayed = useMemo(() => {
    if (filterStatus !== 'inactive') return stores
    return stores.filter(s => !s.is_active)
  }, [stores, filterStatus])

  const stats = useMemo(() => ({
    total:    stores.length,
    active:   stores.filter(s => s.is_active).length,
    inactive: stores.filter(s => !s.is_active).length,
    withArea: stores.filter(s => s.area_id).length,
  }), [stores])

  const remove = async (s: StoreT) => {
    if (!confirm(`Nonaktifkan toko "${s.name}"?`)) return
    await storesApi.remove(s.ID)
    loadStores()
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Toko</h1>
            <p className="text-sm text-slate-400 mt-0.5">Kelola data toko dan assign produk</p>
          </div>
          <button
            onClick={() => { setSelectedStore(undefined); setModal('create') }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Toko
          </button>
        </div>

        {/* ── Stats ── */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total Toko"   value={stats.total}    color="bg-slate-300" />
            <StatCard label="Aktif"        value={stats.active}   color="bg-emerald-400" />
            <StatCard label="Nonaktif"     value={stats.inactive} color="bg-red-300" />
            <StatCard label="Punya Area"   value={stats.withArea} color="bg-blue-400" />
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, kode, kota..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Region */}
          <select
            value={filterRegion}
            onChange={e => { setFilterRegion(Number(e.target.value)); setFilterArea(0) }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value={0}>Semua Region</option>
            {regions.map(r => <option key={r.ID} value={r.ID}>{r.name}</option>)}
          </select>

          {/* Area */}
          <select
            value={filterArea}
            onChange={e => setFilterArea(Number(e.target.value))}
            disabled={filteredAreas.length === 0}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          >
            <option value={0}>Semua Area</option>
            {filteredAreas.map(a => <option key={a.ID} value={a.ID}>{a.name}</option>)}
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {/* Reset */}
          {(filterRegion || filterArea || filterStatus !== 'all') && (
            <button
              onClick={() => { setFilterRegion(0); setFilterArea(0); setFilterStatus('all') }}
              className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}

          {/* Refresh */}
          <button onClick={loadStores}
            className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition ml-auto', loading && 'opacity-50 pointer-events-none')}>
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Head */}
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[260px]">Toko</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[180px]">Area</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[160px]">Kota / Alamat</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[100px]">Produk</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[90px]">Status</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Koordinat</th>
                <th className="w-24 px-3 py-3" />
              </tr>
            </thead>
          </table>

          {/* Body */}
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 rounded animate-pulse w-48" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
                  </div>
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-20" />
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-12" />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-500 text-sm">Tidak ada toko</p>
              <p className="text-xs mt-1">Coba ubah filter atau tambah toko baru</p>
            </div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {displayed.map(s => {
                  const area   = s.area
                  const region = area?.region
                  const pc     = productCounts[s.ID]

                  return (
                    <tr key={s.ID}
                      className={cn(
                        'group hover:bg-slate-50 transition-colors',
                        !s.is_active && 'opacity-50'
                      )}>

                      {/* Toko */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                            s.is_active ? 'bg-blue-50' : 'bg-slate-100'
                          )}>
                            <Store className={cn('w-4 h-4', s.is_active ? 'text-blue-500' : 'text-slate-400')} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">{s.name}</p>
                            <p className="text-xs font-mono text-slate-400">{s.code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Area */}
                      <td className="px-3 py-3.5">
                        {(region || area) ? (
                          <div className="text-xs text-slate-500">
                            {region && <span className="text-slate-400">{region.name}</span>}
                            {region && area && <ChevronRight className="w-3 h-3 inline mx-0.5 text-slate-300" />}
                            {area && <span className="text-blue-600 font-medium">{area.name}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Kota */}
                      <td className="px-3 py-3.5">
                        <p className="text-sm text-slate-700 truncate max-w-[150px]">
                          {s.city || <span className="text-slate-300 italic text-xs">—</span>}
                        </p>
                        {s.address && (
                          <p className="text-xs text-slate-400 truncate max-w-[150px]">{s.address}</p>
                        )}
                      </td>

                      {/* Produk */}
                      <td className="px-3 py-3.5">
                        <button
                          onClick={() => setAssignStore(s)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition"
                        >
                          <Package className="w-3.5 h-3.5" />
                          {pc !== undefined ? (pc > 0 ? `${pc} produk` : 'Assign') : '...'}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <StatusPill active={s.is_active} />
                      </td>

                      {/* Koordinat */}
                      <td className="px-3 py-3.5">
                        {(s.latitude || s.longitude) ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                          <button onClick={() => setAssignStore(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                            title="Assign Produk">
                            <Package className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setSelectedStore(s); setModal('edit') }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => remove(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Footer count */}
          {!loading && displayed.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-400">{displayed.length} toko</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {assignStore && (
        <AssignProductsModal
          store={assignStore}
          onClose={() => { setAssignStore(null); loadStores() }}
        />
      )}

      {modal && (
        <StoreModal
          mode={modal}
          store={selectedStore}
          areas={areas}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); loadStores() }}
        />
      )}
    </AppLayout>
  )
}