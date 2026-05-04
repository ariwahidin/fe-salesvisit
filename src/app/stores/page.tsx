'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { storesApi } from '@/lib/api'
import { Store, Plus, Search, Edit, Trash2, X, Save, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StoresPage() {
  const [stores, setStores]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm]       = useState<any>({})
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const load = async () => {
    setLoading(true)
    try { const r = await storesApi.list({ search }); setStores(r.data || []) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  const openCreate = () => {
    setForm({ name: '', code: '', address: '', city: '', phone: '', latitude: '', longitude: '', is_active: true })
    setSelected(null); setError(''); setModal('create')
  }
  const openEdit = (s: any) => {
    setForm({ ...s }); setSelected(s); setError(''); setModal('edit')
  }

  const save = async () => {
    if (!form.name || !form.code) { setError('Nama dan kode wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, latitude: parseFloat(form.latitude) || 0, longitude: parseFloat(form.longitude) || 0 }
      if (modal === 'create') await storesApi.create(payload)
      else await storesApi.update(selected.ID, payload)
      setModal(null); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (s: any) => {
    if (!confirm(`Nonaktifkan toko "${s.name}"?`)) return
    await storesApi.remove(s.ID); load()
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold">Toko</h1>
          <button onClick={openCreate} className="btn-brand px-3 py-2 text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, kode, kota..." className="input pl-9" />
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface-100 rounded-3xl animate-pulse" />)}</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Belum ada toko</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stores.map(s => (
              <div key={s.ID} className="card p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-surface-900">{s.name}</p>
                    <span className="text-xs text-surface-400 font-mono">{s.code}</span>
                    {!s.is_active && <span className="badge bg-red-100 text-red-500">Nonaktif</span>}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5 truncate">{s.address}, {s.city}</p>
                  {(s.latitude || s.longitude) && (
                    <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(s)} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-4xl sm:rounded-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold">{modal === 'create' ? 'Tambah Toko' : 'Edit Toko'}</h2>
                <button onClick={() => setModal(null)} className="p-1.5 text-surface-400 hover:bg-surface-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {error && <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{error}</div>}
              <div className="space-y-3">
                {[
                  { key: 'name',    label: 'Nama Toko *',   placeholder: 'Toko Maju Jaya' },
                  { key: 'code',    label: 'Kode Toko *',   placeholder: 'TK-001' },
                  { key: 'address', label: 'Alamat',         placeholder: 'Jl. Sudirman No. 1' },
                  { key: 'city',    label: 'Kota',           placeholder: 'Jakarta' },
                  { key: 'phone',   label: 'Telepon',        placeholder: '021-1234567' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder} className="input" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Latitude</label>
                    <input type="number" step="any" value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: e.target.value })} className="input" placeholder="-6.2088" />
                  </div>
                  <div>
                    <label className="label">Longitude</label>
                    <input type="number" step="any" value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: e.target.value })} className="input" placeholder="106.8456" />
                  </div>
                </div>
              </div>
              <button onClick={save} disabled={saving} className="btn-brand w-full py-3 mt-4 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
