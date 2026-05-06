'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { ordersApi, formatDate } from '@/lib/api'
import {
  Loader2, ShoppingBag, ChevronRight,
  CheckCircle, XCircle, Clock, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'submitted' | 'approved' | 'rejected'

interface Order {
  ID: number
  order_no: string
  status: OrderStatus
  notes: string
  rejection_reason: string
  total_amount: number
  approved_at?: string
  rejected_at?: string
  created_at: string
  store: { name: string; city: string; code: string }
  sales: { name: string; email: string }
  items: { ID: number; qty: number; subtotal: number; product: { name: string; unit: string } }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  icon: React.ReactNode
  cardClass: string
  badgeClass: string
}> = {
  submitted: {
    label: 'Menunggu',
    icon: <Clock className="w-3.5 h-3.5" />,
    cardClass: 'border-l-4 border-l-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'Disetujui',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    cardClass: 'border-l-4 border-l-green-400',
    badgeClass: 'bg-green-50 text-green-700 border border-green-200',
  },
  rejected: {
    label: 'Ditolak',
    icon: <XCircle className="w-3.5 h-3.5" />,
    cardClass: 'border-l-4 border-l-red-400',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    ordersApi.list().then(res => setOrders(res.data || [])).finally(() => setLoading(false))
  }, [])

  // ─── Derived ────────────────────────────────────────────────────────────────

  const filtered = orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        o.order_no.toLowerCase().includes(q) ||
        o.store?.name.toLowerCase().includes(q) ||
        o.sales?.name.toLowerCase().includes(q)
      )
    })

  const counts = {
    all: orders.length,
    submitted: orders.filter(o => o.status === 'submitted').length,
    approved: orders.filter(o => o.status === 'approved').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="animate-fade-in">

        {/* Header */}
        <div className="p-4 pb-0">
          <h1 className="font-extrabold text-surface-900 text-lg mb-1">Manajemen Order</h1>
          <p className="text-xs text-surface-500 mb-4">
            {counts.all} order · <span className="text-amber-600 font-semibold">{counts.submitted} perlu ditinjau</span>
          </p>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Cari order, toko, atau sales..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {([
              { key: 'all', label: 'Semua' },
              { key: 'submitted', label: 'Menunggu' },
              { key: 'approved', label: 'Disetujui' },
              { key: 'rejected', label: 'Ditolak' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border',
                  filterStatus === tab.key
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-surface-500 border-surface-200 hover:border-brand-300'
                )}>
                {tab.label}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold',
                  filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
                )}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card p-10 text-center">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-7 h-7 text-surface-300" />
              </div>
              <p className="font-bold text-surface-500">Tidak ada order</p>
              <p className="text-xs text-surface-400 mt-1">
                {search ? 'Coba kata kunci lain' : 'Belum ada order masuk'}
              </p>
            </div>
          )}

          {!loading && filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status]
            const totalQty = order.items?.reduce((s, i) => s + i.qty, 0) ?? 0

            return (
              <div
                key={order.ID}
                onClick={() => router.push(`/admin/orders/${order.ID}`)}
                className={cn('card p-4 cursor-pointer hover:shadow-md transition-shadow', cfg.cardClass)}>

                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-surface-900 text-sm">{order.store?.name}</p>
                    <p className="text-xs text-surface-400">{order.store?.city} · {order.store?.code}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', cfg.badgeClass)}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-surface-300" />
                  </div>
                </div>

                {/* Order no + date */}
                <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
                  <span className="font-mono font-semibold text-surface-600">{order.order_no}</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>

                {/* Sales info */}
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-600">
                      {order.sales?.name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <span className="text-xs text-surface-500">{order.sales?.name}</span>
                </div>

                {/* Items preview */}
                {order.items?.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {order.items.slice(0, 2).map(item => (
                      <div key={item.ID} className="flex items-center justify-between text-xs">
                        <span className="text-surface-600 truncate flex-1 mr-2">{item.product?.name}</span>
                        <span className="text-surface-400 flex-shrink-0">{item.qty} {item.product?.unit}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-xs text-surface-400">+{order.items.length - 2} produk lainnya</p>
                    )}
                  </div>
                )}

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                  <span className="text-xs text-surface-400">{totalQty} item</span>
                  <span className="text-sm font-extrabold text-brand-700">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Submitted highlight */}
                {order.status === 'submitted' && (
                  <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-semibold">⏳ Butuh persetujuan Anda</p>
                  </div>
                )}

                {/* Rejection reason */}
                {order.status === 'rejected' && order.rejection_reason && (
                  <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">Alasan: </span>
                      {order.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}