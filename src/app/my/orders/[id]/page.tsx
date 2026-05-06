'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { ordersApi, formatDate, formatDateTime, API_URL } from '@/lib/api'
import {
    Loader2, ArrowLeft, ShoppingCart, CheckCircle,
    XCircle, Clock, Download, Store, User, Package
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyOrderDetailPage() {
    const { id } = useParams()
    const router = useRouter()

    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        ordersApi.get(Number(id))
            .then(setOrder)
            .catch(() => router.back())
            .finally(() => setLoading(false))
    }, [id])

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

    //   const handleDownloadPDF = () => {
    //     // Buka di tab baru — browser akan trigger download karena header Content-Disposition
    //     window.open(`${API_URL}/api/my/orders/${order.ID}/pdf?token=${token}`, '_blank')
    //   }

    const handleDownloadPDF = async () => {
        const response = await fetch(`${API_URL}/api/my/orders/${order.ID}/pdf`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error("Gagal load PDF");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        window.open(url, '_blank');

        // Cleanup setelah delay biar tab sempat load
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

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

                <div className="px-4 space-y-3 pb-28">

                    {/* Status banner */}
                    <div className={cn('flex items-start gap-3 p-4 rounded-2xl border', cfg.bannerClass)}>
                        <div className="mt-0.5">{cfg.icon}</div>
                        <div>
                            <p className="font-bold text-sm">{cfg.label}</p>
                            {order.status === 'submitted' && (
                                <p className="text-xs mt-0.5 opacity-80">
                                    Order sedang menunggu persetujuan admin
                                </p>
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
                            <h2 className="font-bold text-surface-900 text-sm">
                                Detail Produk
                            </h2>
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
                                    {/* Nomor */}
                                    <div className="w-6 h-6 bg-surface-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-surface-500">{i + 1}</span>
                                    </div>

                                    {/* Info produk */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-surface-900 truncate">
                                            {item.product?.name}
                                        </p>
                                        <p className="text-xs text-surface-400">
                                            {item.product?.sku} · Rp {item.price.toLocaleString('id-ID')} / {item.product?.unit}
                                        </p>
                                    </div>

                                    {/* Qty + subtotal */}
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

                {/* Sticky bottom — Download PDF */}
                <div className="fixed bottom-0 inset-x-0 max-w-2xl mx-auto px-4 pb-2">
                    <div className="bg-white rounded-3xl shadow-up p-3">
                        <button
                            onClick={handleDownloadPDF}
                            className={cn(
                                'w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition',
                                order.status === 'approved'
                                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                                    : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                            )}>
                            <Download className="w-4 h-4" />
                            {order.status === 'approved'
                                ? 'Download PDF Order'
                                : 'Preview PDF Order'}
                        </button>
                    </div>
                </div>

            </div>
        </AppLayout>
    )
}