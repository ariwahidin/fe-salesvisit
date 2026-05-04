'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { productsApi, DAY_NAMES } from '@/lib/api'
import { Package, Plus, Search, Edit, Trash2, X, Save, Loader2 } from 'lucide-react'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [modal, setModal]       = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm]         = useState<any>({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        productsApi.list({ search, category }),
        productsApi.categories(),
      ])
      setProducts(pRes.data || [])
      setCategories(cRes.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, category])

  const openCreate = () => {
    setForm({ name: '', sku: '', barcode: '', category: '', unit: 'pcs', is_active: true })
    setSelected(null); setError(''); setModal('create')
  }
  const openEdit = (p: any) => { setForm({ ...p }); setSelected(p); setError(''); setModal('edit') }

  const save = async () => {
    if (!form.name || !form.sku) { setError('Nama dan SKU wajib diisi'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'create') await productsApi.create(form)
      else await productsApi.update(selected.ID, form)
      setModal(null); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (p: any) => {
    if (!confirm(`Nonaktifkan produk "${p.name}"?`)) return
    await productsApi.remove(p.ID); load()
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold">Produk</h1>
          <button onClick={openCreate} className="btn-brand px-3 py-2 text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk, SKU..." className="input pl-9" />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['', ...categories].map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition ${category === cat ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500'}`}>
              {cat || 'Semua'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-surface-100 rounded-3xl animate-pulse" />)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Belum ada produk</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.ID} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-surface-900 truncate">{p.name}</p>
                    {!p.is_active && <span className="badge bg-red-100 text-red-500 flex-shrink-0">Nonaktif</span>}
                  </div>
                  <p className="text-xs text-surface-400">{p.sku} · {p.category} · {p.unit}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(p)} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
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
          <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-4xl sm:rounded-4xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold">{modal === 'create' ? 'Tambah Produk' : 'Edit Produk'}</h2>
                <button onClick={() => setModal(null)} className="p-1.5 text-surface-400 hover:bg-surface-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              {error && <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{error}</div>}
              <div className="space-y-3">
                {[
                  { key: 'name',     label: 'Nama Produk *', placeholder: 'Indomie Goreng' },
                  { key: 'sku',      label: 'SKU *',          placeholder: 'PRD-001' },
                  { key: 'barcode',  label: 'Barcode',        placeholder: '8996001302291' },
                  { key: 'category', label: 'Kategori',       placeholder: 'Mie Instan' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="input" />
                  </div>
                ))}
                <div>
                  <label className="label">Satuan</label>
                  <select value={form.unit || 'pcs'} onChange={e => setForm({ ...form, unit: e.target.value })} className="input">
                    {['pcs', 'box', 'karton', 'lusin', 'kg', 'liter', 'botol', 'sachet'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
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
