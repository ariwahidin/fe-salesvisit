'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { companiesApi, regionsApi, areasApi } from '@/lib/api'
import {
  Building2, MapPin, Map, Plus, Edit, X, Save, Loader2,
  Search, RefreshCw, PowerOff, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  ID: number; name: string; code: string
  address?: string; phone?: string; email?: string; is_active: boolean
}
interface Region {
  ID: number; company_id: number; name: string; code: string; is_active: boolean
}
interface Area {
  ID: number; company_id: number; region_id: number
  name: string; code: string; is_active: boolean
  region?: { ID: number; name: string }
}

type ModalMode = 'create' | 'edit' | null
type TabId = 'companies' | 'regions' | 'areas'

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Aktif
    </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-500">
      <span className="w-1.5 h-1.5 rounded-full bg-red-300" />Nonaktif
    </span>
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-slate-100 rounded animate-pulse w-48" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
          </div>
          <div className="h-5 bg-slate-100 rounded animate-pulse w-14" />
          <div className="h-5 bg-slate-100 rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-semibold text-slate-500 text-sm">{text}</p>
    </div>
  )
}

// ─── Generic Modal ────────────────────────────────────────────────────────────

function FormModal({ title, subtitle, icon: Icon, onClose, onSave, saving, error, children }: {
  title: string; subtitle?: string; icon: React.ElementType
  onClose: () => void; onSave: () => void
  saving: boolean; error: string
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
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
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-[2] py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status toggle for edit ───────────────────────────────────────────────────

function StatusToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[{ v: true, label: 'Aktif', cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
      { v: false, label: 'Nonaktif', cls: 'bg-red-50 border-red-300 text-red-500' }].map(({ v, label, cls }) => (
        <button key={String(v)} onClick={() => onChange(v)}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-xl border-2 transition',
            value === v ? cls : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
          )}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── TAB: Companies ───────────────────────────────────────────────────────────

function CompaniesTab() {
  const [items, setItems] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Company | null>(null)
  const [form, setForm] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await companiesApi.list({ search: search || undefined })
      setItems(res.data ?? [])
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const displayed = useMemo(() => {
    if (filterStatus === 'active') return items.filter(i => i.is_active)
    if (filterStatus === 'inactive') return items.filter(i => !i.is_active)
    return items
  }, [items, filterStatus])

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.is_active).length,
    inactive: items.filter(i => !i.is_active).length,
  }), [items])

  const openCreate = () => {
    setForm({ name: '', code: '', address: '', phone: '', email: '' })
    setSelected(null); setError(''); setModal('create')
  }
  const openEdit = (item: Company) => {
    setForm({ ...item })
    setSelected(item); setError(''); setModal('edit')
  }
  const save = async () => {
    if (!form.name || !form.code) { setError('Nama dan kode wajib diisi'); return }
    setSaving(true); setError('')
    try {
      // if (modal === 'create') await companiesApi.create(form)
      if (modal === 'create') {
        if (!form.name || !form.code) return;
        await companiesApi.create(form as Company);
      }
      else if (selected) await companiesApi.update(selected.ID, form)
      setModal(null); load()
    } catch (e: any) { setError(e.message ?? 'Terjadi kesalahan') }
    finally { setSaving(false) }
  }
  const deactivate = async (item: Company) => {
    if (!confirm(`Nonaktifkan perusahaan "${item.name}"?`)) return
    try { await companiesApi.remove(item.ID); load() } catch (e: any) { alert(e.message) }
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total" value={stats.total} color="bg-slate-300" />
          <StatCard label="Aktif" value={stats.active} color="bg-emerald-400" />
          <StatCard label="Nonaktif" value={stats.inactive} color="bg-red-300" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button onClick={load} className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition', loading && 'opacity-50 pointer-events-none')}>
          <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Perusahaan</th>
              <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[200px]">Kontak</th>
              <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[200px]">Alamat</th>
              <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[90px]">Status</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
        </table>

        {loading ? <SkeletonRows /> : displayed.length === 0 ? (
          <EmptyState icon={Building2} text="Belum ada perusahaan" />
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {displayed.map(item => (
                <tr key={item.ID} className={cn('group hover:bg-slate-50 transition-colors', !item.is_active && 'opacity-50')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">{item.code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-slate-500">
                    <p>{item.email || '—'}</p>
                    <p className="text-slate-400">{item.phone || ''}</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-slate-400 max-w-[180px] truncate">{item.address || '—'}</td>
                  <td className="px-3 py-3.5"><StatusPill active={item.is_active} /></td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                      <button onClick={() => openEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {item.is_active && (
                        <button onClick={() => deactivate(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && displayed.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{displayed.length} perusahaan</span>
          </div>
        )}
      </div>

      {modal && (
        <FormModal
          title={modal === 'create' ? 'Tambah Perusahaan' : 'Edit Perusahaan'}
          subtitle={selected?.name}
          icon={Building2}
          onClose={() => setModal(null)} onSave={save}
          saving={saving} error={error}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nama Perusahaan" required>
                <input value={form.name ?? ''} onChange={f('name')} placeholder="PT Contoh Maju" className={inputCls} />
              </Field>
            </div>
            <Field label="Kode" required>
              <input value={form.code ?? ''} onChange={f('code')} placeholder="CM" className={cn(inputCls, 'font-mono')} />
            </Field>
            <Field label="No. Telepon">
              <input value={form.phone ?? ''} onChange={f('phone')} placeholder="021-12345678" className={inputCls} />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" value={form.email ?? ''} onChange={f('email')} placeholder="info@perusahaan.com" className={inputCls} />
          </Field>
          <Field label="Alamat">
            <input value={form.address ?? ''} onChange={f('address')} placeholder="Jl. Sudirman No. 1" className={inputCls} />
          </Field>
          {modal === 'edit' && (
            <Field label="Status">
              <StatusToggle value={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </Field>
          )}
        </FormModal>
      )}
    </div>
  )
}

// ─── TAB: Regions ─────────────────────────────────────────────────────────────

function RegionsTab() {
  const [items, setItems] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Region | null>(null)
  const [form, setForm] = useState<Partial<Region>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await regionsApi.list({ search: search || undefined })
      setItems(res.data ?? [])
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const displayed = useMemo(() => {
    if (filterStatus === 'active') return items.filter(i => i.is_active)
    if (filterStatus === 'inactive') return items.filter(i => !i.is_active)
    return items
  }, [items, filterStatus])

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.is_active).length,
    inactive: items.filter(i => !i.is_active).length,
  }), [items])

  const openCreate = () => { setForm({ name: '', code: '', is_active: true }); setSelected(null); setError(''); setModal('create') }
  const openEdit = (item: Region) => { setForm({ ...item }); setSelected(item); setError(''); setModal('edit') }
  const save = async () => {
    if (!form.name || !form.code) { setError('Nama dan kode wajib diisi'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'create') await regionsApi.create({ name: form.name, code: form.code, is_active: form.is_active })
      else if (selected) await regionsApi.update(selected.ID, form)
      setModal(null); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }
  const deactivate = async (item: Region) => {
    if (!confirm(`Nonaktifkan region "${item.name}"?`)) return
    try { await regionsApi.remove(item.ID); load() } catch (e: any) { alert(e.message) }
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total" value={stats.total} color="bg-slate-300" />
          <StatCard label="Aktif" value={stats.active} color="bg-emerald-400" />
          <StatCard label="Nonaktif" value={stats.inactive} color="bg-red-300" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button onClick={load} className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition', loading && 'opacity-50 pointer-events-none')}>
          <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Region</th>
              <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[90px]">Status</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
        </table>

        {loading ? <SkeletonRows /> : displayed.length === 0 ? (
          <EmptyState icon={Map} text="Belum ada region" />
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {displayed.map(item => (
                <tr key={item.ID} className={cn('group hover:bg-slate-50 transition-colors', !item.is_active && 'opacity-50')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                        <Map className="w-4 h-4 text-teal-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">{item.code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5"><StatusPill active={item.is_active} /></td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {item.is_active && (
                        <button onClick={() => deactivate(item)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && displayed.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{displayed.length} region</span>
          </div>
        )}
      </div>

      {modal && (
        <FormModal
          title={modal === 'create' ? 'Tambah Region' : 'Edit Region'}
          subtitle={selected?.name} icon={Map}
          onClose={() => setModal(null)} onSave={save}
          saving={saving} error={error}
        >
          <Field label="Nama Region" required>
            <input value={form.name ?? ''} onChange={f('name')} placeholder="Jabodetabek" className={inputCls} />
          </Field>
          <Field label="Kode" required>
            <input value={form.code ?? ''} onChange={f('code')} placeholder="JBT" className={cn(inputCls, 'font-mono')} />
          </Field>
          {modal === 'edit' && (
            <Field label="Status">
              <StatusToggle value={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </Field>
          )}
        </FormModal>
      )}
    </div>
  )
}

// ─── TAB: Areas ───────────────────────────────────────────────────────────────

function AreasTab() {
  const [items, setItems] = useState<Area[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterRegion, setFilterRegion] = useState(0)
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Area | null>(null)
  const [form, setForm] = useState<Partial<Area>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [areaRes, regionRes] = await Promise.all([
        areasApi.list({ search: search || undefined, region_id: filterRegion || undefined }),
        regionsApi.list(),
      ])
      setItems(areaRes.data ?? [])
      setRegions(regionRes.data ?? [])
    } finally { setLoading(false) }
  }, [search, filterRegion])

  useEffect(() => { load() }, [load])

  const displayed = useMemo(() => {
    if (filterStatus === 'active') return items.filter(i => i.is_active)
    if (filterStatus === 'inactive') return items.filter(i => !i.is_active)
    return items
  }, [items, filterStatus])

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.is_active).length,
    inactive: items.filter(i => !i.is_active).length,
    regions: new Set(items.map(i => i.region_id)).size,
  }), [items])

  const openCreate = () => {
    setForm({ name: '', code: '', region_id: regions.find(r => r.is_active)?.ID ?? 0, is_active: true })
    setSelected(null); setError(''); setModal('create')
  }
  const openEdit = (item: Area) => { setForm({ ...item }); setSelected(item); setError(''); setModal('edit') }
  const save = async () => {
    if (!form.name || !form.code) { setError('Nama dan kode wajib diisi'); return }
    if (!form.region_id) { setError('Region wajib dipilih'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'create') await areasApi.create({ name: form.name, code: form.code, region_id: form.region_id, is_active: form.is_active })
      else if (selected) await areasApi.update(selected.ID, form)
      setModal(null); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }
  const deactivate = async (item: Area) => {
    if (!confirm(`Nonaktifkan area "${item.name}"?`)) return
    try { await areasApi.remove(item.ID); load() } catch (e: any) { alert(e.message) }
  }

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      {!loading && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} color="bg-slate-300" />
          <StatCard label="Aktif" value={stats.active} color="bg-emerald-400" />
          <StatCard label="Nonaktif" value={stats.inactive} color="bg-red-300" />
          <StatCard label="Region" value={stats.regions} color="bg-amber-400" />
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <select value={filterRegion} onChange={e => setFilterRegion(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value={0}>Semua Region</option>
          {regions.map(r => <option key={r.ID} value={r.ID}>{r.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button onClick={load} className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition', loading && 'opacity-50 pointer-events-none')}>
          <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Area</th>
              <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[180px]">Region</th>
              <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[90px]">Status</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
        </table>

        {loading ? <SkeletonRows /> : displayed.length === 0 ? (
          <EmptyState icon={MapPin} text="Belum ada area" />
        ) : (
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {displayed.map(item => (
                <tr key={item.ID} className={cn('group hover:bg-slate-50 transition-colors', !item.is_active && 'opacity-50')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">{item.code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    {item.region ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Map className="w-3 h-3 text-teal-400 shrink-0" />
                        {item.region.name}
                      </span>
                    ) : <span className="text-xs text-slate-300 italic">—</span>}
                  </td>
                  <td className="px-3 py-3.5"><StatusPill active={item.is_active} /></td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {item.is_active && (
                        <button onClick={() => deactivate(item)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && displayed.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{displayed.length} area</span>
          </div>
        )}
      </div>

      {modal && (
        <FormModal
          title={modal === 'create' ? 'Tambah Area' : 'Edit Area'}
          subtitle={selected?.name} icon={MapPin}
          onClose={() => setModal(null)} onSave={save}
          saving={saving} error={error}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nama Area" required>
                <input value={form.name ?? ''} onChange={f('name')} placeholder="Jakarta Selatan" className={inputCls} />
              </Field>
            </div>
            <Field label="Kode" required>
              <input value={form.code ?? ''} onChange={f('code')} placeholder="JAKSEL" className={cn(inputCls, 'font-mono')} />
            </Field>
            <Field label="Region" required>
              <select value={form.region_id ?? 0}
                onChange={e => setForm(p => ({ ...p, region_id: Number(e.target.value) }))}
                className={inputCls}>
                <option value={0} disabled>Pilih region</option>
                {regions.filter(r => r.is_active).map(r => (
                  <option key={r.ID} value={r.ID}>{r.name}</option>
                ))}
              </select>
            </Field>
          </div>
          {modal === 'edit' && (
            <Field label="Status">
              <StatusToggle value={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </Field>
          )}
        </FormModal>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'companies', label: 'Perusahaan', icon: Building2 },
  { id: 'regions', label: 'Region', icon: Map },
  { id: 'areas', label: 'Area', icon: MapPin },
]

export default function OrganizationPage() {
  const [tab, setTab] = useState<TabId>('companies')

  return (
    <AppLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organisasi</h1>
          <p className="text-sm text-slate-400 mt-0.5">Kelola perusahaan, region, dan area</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition',
                tab === id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'regions' && <RegionsTab />}
        {tab === 'areas' && <AreasTab />}

      </div>
    </AppLayout>
  )
}