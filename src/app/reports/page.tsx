'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { dashboardApi, usersApi, storesApi, productsApi, formatDateTime } from '@/lib/api'
import { BarChart2, Download, RefreshCw, Search, Filter } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const ALLOWED_ROLES = ['admin', 'supervisor']

  useEffect(() => {
    if (!user) return
    if (!ALLOWED_ROLES.includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [user])

  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sales, setSales] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [filters, setFilters] = useState({
    sales_id: '', store_id: '', product_id: '',
    start_date: '', end_date: '',
    today: false,
  })

  useEffect(() => {
    Promise.all([
      usersApi.list({ role: 'sales' }),
      storesApi.list(),
      productsApi.list(),
    ]).then(([u, s, p]) => {
      setSales(u.data || [])
      setStores(s.data || [])
      setProducts(p.data || [])
    })
    loadReport({ today: true } as any)
  }, [])

  const loadReport = async (f = filters) => {
    setLoading(true)
    try {
      const res = await dashboardApi.stockReport(f)
      setRows(res.data || [])
    } finally { setLoading(false) }
  }

  const setF = (key: string, val: any) => setFilters(f => ({ ...f, [key]: val }))

  const handleExportCSV = () => {
    if (!rows.length) return
    const headers = ['Tanggal', 'Sales', 'Toko', 'Kode Toko', 'Produk', 'SKU', 'Kategori', 'Qty', 'Satuan', 'Catatan']
    const csvRows = rows.map(r => [
      r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '',
      '', r.store_name, r.store_code, r.product_name, r.sku, r.category, r.qty, r.unit, r.notes || ''
    ])
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold text-surface-900">Laporan Stok</h1>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} disabled={!rows.length}
              className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => loadReport()} className="p-2 btn-ghost">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-wide">Filter</p>

          {/* Quick: today toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setF('today', true); setF('start_date', ''); setF('end_date', ''); loadReport({ ...filters, today: true, start_date: '', end_date: '' }) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filters.today ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600'}`}>
              Hari Ini
            </button>
            <button
              onClick={() => setF('today', false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${!filters.today ? 'bg-surface-800 text-white' : 'bg-surface-100 text-surface-600'}`}>
              Rentang Tanggal
            </button>
          </div>

          {!filters.today && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Dari</label>
                <input type="date" value={filters.start_date} onChange={e => setF('start_date', e.target.value)} className="input text-xs" />
              </div>
              <div>
                <label className="label">Sampai</label>
                <input type="date" value={filters.end_date} onChange={e => setF('end_date', e.target.value)} className="input text-xs" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Sales</label>
              <select value={filters.sales_id} onChange={e => setF('sales_id', e.target.value)} className="input text-xs py-2">
                <option value="">Semua</option>
                {sales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Toko</label>
              <select value={filters.store_id} onChange={e => setF('store_id', e.target.value)} className="input text-xs py-2">
                <option value="">Semua</option>
                {stores.map(s => <option key={s.ID} value={s.ID}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Produk</label>
            <select value={filters.product_id} onChange={e => setF('product_id', e.target.value)} className="input text-xs py-2">
              <option value="">Semua</option>
              {products.map(p => <option key={p.ID} value={p.ID}>{p.name}</option>)}
            </select>
          </div>

          <button onClick={() => loadReport()} className="btn-brand w-full py-2.5 text-sm flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Tampilkan
          </button>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-xs text-surface-500 font-medium">{rows.length} baris data</p>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Belum ada data</p>
            <p className="text-sm">Coba ubah filter dan klik Tampilkan</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    <th className="text-left px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Tanggal</th>
                    <th className="text-left px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Toko</th>
                    <th className="text-left px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Produk</th>
                    <th className="text-left px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Kategori</th>
                    <th className="text-right px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Qty</th>
                    <th className="text-left px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Satuan</th>
                    <th className="text-left px-4 py-3 font-bold text-surface-600 whitespace-nowrap">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-surface-50 hover:bg-surface-50 transition">
                      <td className="px-4 py-3 text-surface-500 whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-surface-800">{r.store_name}</p>
                        <p className="text-surface-400">{r.store_code}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-surface-800">{r.product_name}</p>
                        <p className="text-surface-400">{r.sku}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="badge bg-surface-100 text-surface-600">{r.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-extrabold text-sm ${r.qty === 0 ? 'text-red-400' : 'text-brand-600'}`}>{r.qty}</span>
                      </td>
                      <td className="px-4 py-3 text-surface-500">{r.unit}</td>
                      <td className="px-4 py-3 text-surface-400 max-w-[120px] truncate">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
