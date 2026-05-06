'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { ordersApi, formatDate, formatDateTime, API_URL } from '@/lib/api'
import {
  Loader2, ArrowLeft, CheckCircle, XCircle,
  Clock, Download, Store, User, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'submitted' | 'approved' | 'rejected'

interface OrderItem {
  ID: number
  product: { name: string; sku: string; unit: string }
  price: number
  qty: number
  subtotal: number
}

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
  store: { name: string; city: string; address: string; code: string }
  sales: { name: string; email: string }
  items: OrderItem[]
  visit: { ID: number; check_in_at: string }
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  icon: React.ReactNode
  bannerClass: string
  badgeClass: string
}> = {
  submitted: {
    label: 'Menunggu Konfirmasi',
    icon: <Clock className="w-4 h-4" />,
    bannerClass: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'Disetujui',
    icon: <CheckCircle className="w-4 h-4" />,
    bannerClass: 'bg-green-50 border-green-200 text-green-800',
    badgeClass: 'bg-green-50 text-green-700 border border-green-200',
  },
  rejected: {
    label: 'Ditolak',
    icon: <XCircle className="w-4 h-4" />,
    bannerClass: 'bg-red-50 border-red-200 text-red-800',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
  },
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Sheet */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-5 shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-extrabold text-surface-900 text-base">Tolak Order</h2>
            <p className="text-xs text-surface-500">Berikan alasan penolakan</p>
          </div>
        </div>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Contoh: Stok tidak tersedia, harga tidak sesuai, dll..."
          rows={4}
          className="w-full px-4 py-3 rounded-2xl border border-surface-200 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none transition"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition">
            Batal
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={loading || !reason.trim()}
            className={cn(
              'flex-1 py-3 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2',
              reason.trim() && !loading
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-surface-100 text-surface-400 cursor-not-allowed'
            )}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Tolak Order
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    ordersApi.getAdmin(Number(id))
      .then(setOrder)
      .catch(() => router.back())
      .finally(() => setLoading(false))
  }, [id])

  const handleApprove = async () => {
    if (!order) return
    setApproving(true)
    try {
      const updated = await ordersApi.approve(order.ID)
      setOrder(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (reason: string) => {
    if (!order) return
    setRejecting(true)
    try {
      const updated = await ordersApi.reject(order.ID, reason)
      setOrder(updated)
      setShowRejectModal(false)
    } catch (e) {
      console.error(e)
    } finally {
      setRejecting(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (!order) return
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/api/my/orders/${order.ID}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      </AppLayout>
    )
  }

  if (!order) return null

  const cfg = STATUS_CONFIG[order.status]
  const totalQty = order.items?.reduce((s, i) => s + i.qty, 0) ?? 0

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="animate-fade-in">

        {/* Header */}
        <div className="p-4 pb-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-surface-500 text-sm hover:text-surface-700 mb-3">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h1 className="font-extrabold text-surface-900 text-lg leading-tight">
                {order.order_no}
              </h1>
              <p className="text-xs text-surface-400 mt-0.5">{formatDateTime(order.created_at)}</p>
            </div>
            <span className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0',
              cfg.badgeClass
            )}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="px-4 space-y-3 pb-36">

          {/* Status banner */}
          <div className={cn('flex items-start gap-3 p-4 rounded-2xl border', cfg.bannerClass)}>
            <div className="mt-0.5">{cfg.icon}</div>
            <div>
              <p className="font-bold text-sm">{cfg.label}</p>
              {order.status === 'submitted' && (
                <p className="text-xs mt-0.5 opacity-80">Order ini menunggu tindakan Anda</p>
              )}
              {order.status === 'approved' && order.approved_at && (
                <p className="text-xs mt-0.5 opacity-80">
                  Disetujui pada {formatDateTime(order.approved_at)}
                </p>
              )}
              {order.status === 'rejected' && order.rejected_at && (
                <p className="text-xs mt-0.5 opacity-80">
                  Ditolak pada {formatDateTime(order.rejected_at)}
                </p>
              )}
            </div>
          </div>

          {/* Rejection reason */}
          {order.status === 'rejected' && order.rejection_reason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-xs font-bold text-red-700 mb-1 uppercase tracking-wide">
                Alasan Penolakan
              </p>
              <p className="text-sm text-red-800">{order.rejection_reason}</p>
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Store */}
            <div className="card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Store className="w-3.5 h-3.5 text-surface-400" />
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wide">Outlet</p>
              </div>
              <p className="text-sm font-bold text-surface-900 leading-tight">{order.store?.name}</p>
              <p className="text-xs text-surface-400 mt-0.5">{order.store?.city}</p>
              <p className="text-xs text-surface-400">{order.store?.code}</p>
            </div>

            {/* Sales */}
            <div className="card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-surface-400" />
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wide">Sales</p>
              </div>
              <p className="text-sm font-bold text-surface-900 leading-tight">{order.sales?.name}</p>
              <p className="text-xs text-surface-400 mt-0.5">{order.sales?.email}</p>
              {order.visit?.check_in_at && (
                <p className="text-xs text-surface-400 mt-0.5">
                  Visit: {formatDate(order.visit.check_in_at)}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card p-4">
              <p className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-1">
                Catatan Order
              </p>
              <p className="text-sm text-surface-700">{order.notes}</p>
            </div>
          )}

          {/* Items */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-surface-400" />
              <h2 className="font-bold text-surface-900 text-sm">Detail Produk</h2>
              <span className="ml-auto text-xs text-surface-400">
                {order.items?.length} produk · {totalQty} item
              </span>
            </div>

            <div className="space-y-0">
              {order.items?.map((item, i) => (
                <div
                  key={item.ID}
                  className={cn(
                    'py-3 flex items-center gap-3',
                    i < order.items.length - 1 ? 'border-b border-surface-100' : ''
                  )}>
                  <div className="w-6 h-6 bg-surface-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-surface-500">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 truncate">{item.product?.name}</p>
                    <p className="text-xs text-surface-400">
                      {item.product?.sku} · Rp {item.price.toLocaleString('id-ID')} / {item.product?.unit}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-surface-900">
                      {item.qty} {item.product?.unit}
                    </p>
                    <p className="text-xs text-brand-600 font-semibold">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-surface-100">
              <span className="text-sm font-bold text-surface-700">Total</span>
              <span className="text-base font-extrabold text-brand-700">
                Rp {order.total_amount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

        </div>

        {/* Sticky bottom actions */}
        <div className="fixed bottom-0 inset-x-0 max-w-2xl mx-auto px-4 pb-2">
          <div className="bg-white rounded-3xl shadow-up p-3 space-y-2">

            {/* Approve / Reject — hanya untuk submitted */}
            {order.status === 'submitted' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={approving}
                  className="flex-1 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition">
                  <XCircle className="w-4 h-4" />
                  Tolak
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 py-3 rounded-2xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition">
                  {approving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  Setujui
                </button>
              </div>
            )}

            {/* Preview PDF — selalu tampil */}
            <button
              onClick={handlePreviewPDF}
              className="w-full py-3 rounded-2xl bg-surface-100 text-surface-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-200 transition">
              <Download className="w-4 h-4" />
              Preview PDF Order
            </button>
          </div>
        </div>

      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
          loading={rejecting}
        />
      )}

    </AppLayout>
  )
}