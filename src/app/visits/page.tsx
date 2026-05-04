'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { visitsApi, usersApi, storesApi, formatDateTime } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { ClipboardList, ChevronRight, RefreshCw, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'

export default function VisitsPage() {
  const { user }  = useAuthStore()
  const isAdmin   = user?.role === 'admin'
  const [visits, setVisits]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [sales, setSales]       = useState<any[]>([])
  const [stores, setStores]     = useState<any[]>([])
  const [filterSales, setFilterSales]   = useState('')
  const [filterStore, setFilterStore]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate]     = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      if (isAdmin) {
        const [vRes, uRes, stRes] = await Promise.all([
          visitsApi.list({
            sales_id: filterSales,
            store_id: filterStore,
            status:   filterStatus,
            date:     filterDate,
          }),
          usersApi.list({ role: 'sales' }),
          storesApi.list(),
        ])
        setVisits(vRes.data || [])
        setSales(uRes.data || [])
        setStores(stRes.data || [])
      } else {
        const res = await visitsApi.my(filterDate)
        setVisits(res.data || [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterSales, filterStore, filterStatus, filterDate])

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold text-surface-900">
            {isAdmin ? 'Semua Kunjungan' : 'Riwayat Kunjungan'}
          </h1>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={() => setShowFilters(!showFilters)}
                className={cn('btn-ghost px-3 py-2 text-xs flex items-center gap-1.5',
                  showFilters ? 'bg-brand-50 text-brand-600' : '')}>
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            )}
            <button onClick={load} className="p-2 btn-ghost">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {(isAdmin && showFilters || !isAdmin) && (
          <div className="space-y-2">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="input text-sm" placeholder="Filter tanggal" />
            {isAdmin && (
              <div className="grid grid-cols-2 gap-2">
                <select value={filterSales} onChange={e => setFilterSales(e.target.value)} className="input text-sm">
                  <option value="">Semua Sales</option>
                  {sales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input text-sm">
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="checked_in">Checked In</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-surface-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Belum ada kunjungan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visits.map((v: any) => (
              <Link key={v.ID} href={`/visits/${v.ID}`}
                className="card p-4 flex items-start gap-3 hover:bg-surface-50 transition active:scale-[0.99]">
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0',
                  v.status === 'completed' ? 'bg-green-100' : v.status === 'checked_in' ? 'bg-blue-100' : 'bg-surface-100')}>
                  <ClipboardList className={cn('w-5 h-5',
                    v.status === 'completed' ? 'text-green-600' : v.status === 'checked_in' ? 'text-blue-600' : 'text-surface-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-surface-900 truncate">{v.store?.name}</p>
                  <p className="text-xs text-surface-500 truncate">
                    {isAdmin ? `${v.sales?.name} · ` : ''}{v.check_in_at ? formatDateTime(v.check_in_at) : '—'}
                  </p>
                  {v.stock_counts?.length > 0 && (
                    <p className="text-xs text-brand-500 mt-0.5">📦 {v.stock_counts.length} produk dihitung</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={v.status} />
                  <ChevronRight className="w-4 h-4 text-surface-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
