'use client'
import { useEffect, useState, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { productsApi } from '@/lib/api'
import {
  Package, Plus, Search, Edit, Trash2, X, Save, Loader2,
  RefreshCw, Tag, Barcode, Boxes, ChevronDown, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  ID: number
  name: string
  sku: string
  barcode?: string
  category?: string
  unit: string
  price: number
  is_active: boolean
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
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Aktif
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-500">
        <span className="w-1.5 h-1.5 rounded-full bg-red-300" />Nonaktif
      </span>
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return <span className="text-xs text-slate-300 italic">—</span>
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600">
      <Tag className="w-3 h-3" />{category}
    </span>
  )
}

const UNITS = ['pcs', 'box', 'karton', 'lusin', 'kg', 'liter', 'botol', 'sachet']

// ─── Product Modal ────────────────────────────────────────────────────────────

function ProductModal({ mode, product, onClose, onSave }: {
  mode: 'create' | 'edit'
  product?: Product
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name:      product?.name      ?? '',
    sku:       product?.sku       ?? '',
    barcode:   product?.barcode   ?? '',
    category:  product?.category  ?? '',
    unit:      product?.unit      ?? 'pcs',
    price:     product?.price     ?? 0,
    is_active: product?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.name || !form.sku) { setError('Nama dan SKU wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, price: Number(form.price) }
      if (mode === 'create') await productsApi.create(payload)
      else await productsApi.update(product!.ID, payload)
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
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">{mode === 'create' ? 'Tambah Produk' : 'Edit Produk'}</h2>
            {product && <p className="text-xs text-slate-400 font-mono mt-0.5">{product.sku}</p>}
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

          {/* Nama */}
          <Field label="Nama Produk" required>
            <input value={form.name} onChange={f('name')} placeholder="Indomie Goreng" className={inputCls} />
          </Field>

          {/* SKU + Barcode */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" required>
              <input value={form.sku} onChange={f('sku')} placeholder="PRD-001" className={cn(inputCls, 'font-mono')} />
            </Field>
            <Field label="Barcode">
              <input value={form.barcode} onChange={f('barcode')} placeholder="8996001302291" className={cn(inputCls, 'font-mono')} />
            </Field>
          </div>

          {/* Kategori + Satuan */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kategori">
              <input value={form.category} onChange={f('category')} placeholder="Mie Instan" className={inputCls} />
            </Field>
            <Field label="Satuan">
              <select value={form.unit} onChange={f('unit')} className={inputCls}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          {/* Harga */}
          <Field label="Harga Global">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">Rp</span>
              <input
                type="number" min="0" value={form.price}
                onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))}
                placeholder="0" className={cn(inputCls, 'pl-9')}
              />
            </div>
          </Field>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <Field label="Status">
              <div className="flex gap-2">
                {[{ v: true, label: 'Aktif', cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                  { v: false, label: 'Nonaktif', cls: 'bg-red-50 border-red-300 text-red-500' }].map(({ v, label, cls }) => (
                  <button
                    key={String(v)}
                    onClick={() => setForm(p => ({ ...p, is_active: v }))}
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
            {saving ? 'Menyimpan...' : mode === 'create' ? 'Buat Produk' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)

  // Filters
  const [search, setSearch]           = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus]     = useState<'all' | 'active' | 'inactive'>('all')

  // Modal
  const [modal, setModal]       = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Product | undefined>()

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        productsApi.list({ search, category: filterCategory }),
        productsApi.categories(),
      ])
      setProducts(pRes.data || [])
      setCategories(cRes.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, filterCategory])

  const displayed = useMemo(() => {
    if (filterStatus === 'active')   return products.filter(p => p.is_active)
    if (filterStatus === 'inactive') return products.filter(p => !p.is_active)
    return products
  }, [products, filterStatus])

  const stats = useMemo(() => ({
    total:    products.length,
    active:   products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
    cats:     new Set(products.map(p => p.category).filter(Boolean)).size,
  }), [products])

  const remove = async (p: Product) => {
    if (!confirm(`Nonaktifkan produk "${p.name}"?`)) return
    await productsApi.remove(p.ID)
    load()
  }

  const fmtPrice = (n: number) =>
    n > 0 ? `Rp ${n.toLocaleString('id-ID')}` : <span className="text-slate-300 italic text-xs">—</span>

  return (
    <AppLayout>
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Produk</h1>
            <p className="text-sm text-slate-400 mt-0.5">Kelola data produk dan harga</p>
          </div>
          <button
            onClick={() => { setSelected(undefined); setModal('create') }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Produk
          </button>
        </div>

        {/* ── Stats ── */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total Produk"  value={stats.total}    color="bg-slate-300" />
            <StatCard label="Aktif"         value={stats.active}   color="bg-emerald-400" />
            <StatCard label="Nonaktif"      value={stats.inactive} color="bg-red-300" />
            <StatCard label="Kategori"      value={stats.cats}     color="bg-violet-400" />
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, SKU, barcode..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Category */}
          <select
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Status */}
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {/* Reset */}
          {(filterCategory || filterStatus !== 'all') && (
            <button
              onClick={() => { setFilterCategory(''); setFilterStatus('all') }}
              className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}

          {/* Refresh */}
          <button onClick={load}
            className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition ml-auto', loading && 'opacity-50 pointer-events-none')}>
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>

        {/* ── Category tabs ── */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {[{ v: '', label: 'Semua' }, ...categories.map(c => ({ v: c, label: c }))].map(({ v, label }) => (
              <button key={v} onClick={() => setFilterCategory(v)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border',
                  filterCategory === v
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                )}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[280px]">Produk</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[120px]">SKU</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[80px]">Barcode</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[120px]">Kategori</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[70px]">Satuan</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[120px]">Harga</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[90px]">Status</th>
                <th className="w-20 px-3 py-3" />
              </tr>
            </thead>
          </table>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 rounded animate-pulse w-48" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
                  </div>
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-16" />
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-12" />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-500 text-sm">Tidak ada produk</p>
              <p className="text-xs mt-1">Coba ubah filter atau tambah produk baru</p>
            </div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {displayed.map(p => (
                  <tr key={p.ID}
                    className={cn(
                      'group hover:bg-slate-50 transition-colors',
                      !p.is_active && 'opacity-50'
                    )}>

                    {/* Produk */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          p.is_active ? 'bg-blue-50' : 'bg-slate-100'
                        )}>
                          <Package className={cn('w-4 h-4', p.is_active ? 'text-blue-500' : 'text-slate-400')} />
                        </div>
                        <p className="font-semibold text-sm text-slate-900 truncate max-w-[200px]">{p.name}</p>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-3.5">
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{p.sku}</span>
                    </td>

                    {/* Barcode */}
                    <td className="px-3 py-3.5">
                      {p.barcode
                        ? <span className="text-xs font-mono text-slate-400">{p.barcode}</span>
                        : <span className="text-xs text-slate-300 italic">—</span>}
                    </td>

                    {/* Kategori */}
                    <td className="px-3 py-3.5">
                      <CategoryBadge category={p.category} />
                    </td>

                    {/* Satuan */}
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-medium">{p.unit}</span>
                    </td>

                    {/* Harga */}
                    <td className="px-3 py-3.5 text-sm font-semibold text-slate-700">
                      {fmtPrice(p.price)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      <StatusPill active={p.is_active} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                        <button onClick={() => { setSelected(p); setModal('edit') }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer count */}
          {!loading && displayed.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-400">{displayed.length} produk</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <ProductModal
          mode={modal}
          product={selected}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </AppLayout>
  )
}