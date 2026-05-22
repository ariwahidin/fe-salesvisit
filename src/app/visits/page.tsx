'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useAuthStore } from '@/lib/store'
import {
  MapPin, Clock, Package, FileText, Loader2, RefreshCw,
  Search, ChevronDown, ChevronRight, Image as ImageIcon,
  ShoppingCart, TrendingDown, Eye, X, Calendar,
  CheckCircle2, Circle, AlertCircle, User, Store,
  BarChart3, Navigation, Camera, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitUser { ID: number; name: string; email: string }
interface VisitStore { ID: number; name: string; city: string; address: string }
interface Product { ID: number; name: string; sku: string; unit: string }
interface StockCount {
  ID: number; product: Product; qty: number
  shelf_price?: number; promo_price?: number; exp_date?: string; notes: string
}
interface VisitPhoto { ID: number; photo_url: string; caption: string; sort_order: number }
interface OrderItem { ID: number; product: Product; price: number; qty: number; subtotal: number }
interface Order {
  ID: number; order_no: string; status: string; notes: string
  rejection_reason: string; total_amount: number
  approved_at?: string; rejected_at?: string
  items: OrderItem[]
}
interface CompetitorPhoto { ID: number; photo_url: string }
interface Competitor {
  ID: number; product: Product; brand: string; item_name: string
  price?: number; promo_price?: number; notes: string
  photos: CompetitorPhoto[]
}
interface Schedule { ID: number; visit_date: string; status: string }
interface Visit {
  ID: number; company_id: number
  sales: VisitUser; store: VisitStore; schedule: Schedule
  check_in_at?: string; check_in_lat: number; check_in_lng: number; check_in_photo_url: string
  check_out_at?: string; check_out_lat: number; check_out_lng: number
  status: string; notes: string; draft_stock: string
  stock_counts: StockCount[]; photos: VisitPhoto[]; orders: Order[]
  last_visit?: Visit
  CreatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || ''
function apiToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') : null }
async function apiFetch(path: string, opts: RequestInit = {}) {
  const t = apiToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...opts.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const STATUS_META: Record<string, { label: string; badge: string; dot: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', icon: Circle },
  checked_in: { label: 'Aktif', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', icon: Navigation },
  completed: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', icon: CheckCircle2 },
}

const ORDER_STATUS: Record<string, { label: string; badge: string }> = {
  submitted: { label: 'Submitted', badge: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Disetujui', badge: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-600' },
  revised: { label: 'Revisi', badge: 'bg-amber-100 text-amber-700' },
}

function fmt(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function duration(a?: string, b?: string) {
  if (!a || !b) return null
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.pending
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold', m.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

function OrderBadge({ status }: { status: string }) {
  const m = ORDER_STATUS[status] ?? ORDER_STATUS.submitted
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold', m.badge)}>
      {m.label}
    </span>
  )
}

// ─── Photo Lightbox ───────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={`${API}${src}`}
        alt="foto"
        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

// ─── Visit Detail Drawer ──────────────────────────────────────────────────────

function VisitDetail({ visitId, onClose }: { visitId: number; onClose: () => void }) {
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)
  // const [tab, setTab] = useState<'overview' | 'stock' | 'orders' | 'photos'>('overview')
  const [tab, setTab] = useState<'overview' | 'stock' | 'orders' | 'competitors' | 'photos'>('overview')
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loadingComp, setLoadingComp] = useState(false)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/visits/${visitId}`)
      .then(d => setVisit(d))
      .finally(() => setLoading(false))
  }, [visitId])

  useEffect(() => {
    if (tab !== 'competitors' || !visitId) return
    if (competitors.length > 0) return // already loaded
    setLoadingComp(true)
    apiFetch(`/api/visits/${visitId}/competitors`)
      .then(d => setCompetitors(d.data ?? []))
      .finally(() => setLoadingComp(false))
  }, [tab, visitId])

  const dur = visit ? duration(visit.check_in_at, visit.check_out_at) : null

  const tabs = [
    { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
    { key: 'stock', label: `Stok (${visit?.stock_counts?.length ?? 0})`, icon: Package },
    { key: 'orders', label: `Order (${visit?.orders?.length ?? 0})`, icon: ShoppingCart },
    { key: 'competitors', label: `Kompetitor`, icon: TrendingDown },
    { key: 'photos', label: `Foto (${visit?.photos?.length ?? 0})`, icon: Camera },
  ] as const

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-100 rounded w-48 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-32 animate-pulse" />
              </div>
            ) : visit ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-base text-slate-900 truncate">{visit.store?.name}</p>
                  <StatusBadge status={visit.status} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {visit.store?.city} · {visit.sales?.name} · {fmtDate(visit.CreatedAt)}
                </p>
              </>
            ) : null}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-slate-100">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition whitespace-nowrap',
                tab === key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : !visit ? (
            <div className="text-center py-20 text-slate-400 text-sm">Data tidak ditemukan</div>
          ) : (

            // ── Overview ──────────────────────────────────────────────────
            tab === 'overview' ? (
              <div className="p-5 space-y-4">

                {/* Check-in photo */}
                {visit.check_in_photo_url && (
                  <div
                    className="relative h-44 rounded-2xl overflow-hidden cursor-pointer group"
                    onClick={() => setLightbox(visit.check_in_photo_url)}
                  >
                    <img
                      src={`${API}${visit.check_in_photo_url}`}
                      alt="Check-in"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-3 opacity-0 group-hover:opacity-100 transition">
                      <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg">
                        📸 Foto Check-In
                      </span>
                    </div>
                  </div>
                )}

                {/* Duration pill */}
                {dur !== null && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-slate-700">Durasi Kunjungan</span>
                    <span className="ml-auto text-sm font-extrabold text-blue-600">{dur} menit</span>
                  </div>
                )}

                {/* Timeline */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Timeline</span>
                  </div>
                  <div className="p-4 space-y-0">
                    {/* Check-in */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-100" />
                        <div className="w-px flex-1 bg-slate-200 my-1" />
                      </div>
                      <div className="pb-4">
                        <p className="text-xs font-bold text-slate-700">Check-In</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{fmt(visit.check_in_at)}</p>
                        {visit.check_in_lat !== 0 && (
                          <a
                            href={`https://maps.google.com/?q=${visit.check_in_lat},${visit.check_in_lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-0.5"
                          >
                            <MapPin className="w-3 h-3" />
                            {visit.check_in_lat.toFixed(5)}, {visit.check_in_lng.toFixed(5)}
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Check-out */}
                    {visit.check_out_at ? (
                      <div className="flex gap-3">
                        <div className="pt-0.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-rose-100" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Check-Out</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{fmt(visit.check_out_at)}</p>
                          {visit.check_out_lat !== 0 && (
                            <a
                              href={`https://maps.google.com/?q=${visit.check_out_lat},${visit.check_out_lng}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-0.5"
                            >
                              <MapPin className="w-3 h-3" />
                              {visit.check_out_lat.toFixed(5)}, {visit.check_out_lng.toFixed(5)}
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="pt-0.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-slate-100 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-400 italic">Belum check-out</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {visit.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Catatan</p>
                    <p className="text-sm text-amber-800">{visit.notes}</p>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Produk', value: visit.stock_counts?.length ?? 0, color: 'bg-blue-100 text-blue-700' },
                    { label: 'Order', value: visit.orders?.length ?? 0, color: 'bg-violet-100 text-violet-700' },
                    { label: 'Foto', value: visit.photos?.length ?? 0, color: 'bg-rose-100 text-rose-700' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-center">
                      <p className={cn('text-2xl font-black', s.color.split(' ')[1])}>{s.value}</p>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Store info */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Info Toko</p>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-slate-800">{visit.store?.name}</p>
                    {visit.store?.address && <p className="text-xs text-slate-400">{visit.store.address}</p>}
                    {visit.store?.city && <p className="text-xs text-slate-400">{visit.store.city}</p>}
                  </div>
                </div>

                {/* Jadwal */}
                {visit.schedule && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Jadwal</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {fmtDate(visit.schedule.visit_date)}
                      </div>
                      <StatusBadge status={visit.schedule.status} />
                    </div>
                  </div>
                )}

                {/* Last visit */}
                {visit.last_visit && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kunjungan Terakhir</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">{fmt(visit.last_visit.CreatedAt)}</p>
                      <span className="text-xs text-slate-400">{visit.last_visit.stock_counts?.length ?? 0} produk di-check</span>
                    </div>
                  </div>
                )}
              </div>

              // ── Stock ─────────────────────────────────────────────────────
            ) : tab === 'stock' ? (
              <div className="p-4">
                {!visit.stock_counts?.length ? (
                  <div className="text-center py-12 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data stok</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produk</th>
                          <th className="text-right px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Qty</th>
                          <th className="text-right px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 hidden sm:table-cell">Shelf</th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 hidden sm:table-cell">Promo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visit.stock_counts.map(sc => (
                          <tr key={sc.ID} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{sc.product?.name}</p>
                              <p className="text-[11px] text-slate-400">{sc.product?.sku}</p>
                              {sc.notes && <p className="text-[11px] text-slate-400 italic truncate">"{sc.notes}"</p>}
                              {sc.exp_date && (
                                <p className="text-[11px] text-amber-500 font-medium">Exp: {fmtDate(sc.exp_date)}</p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className={cn('font-extrabold text-base', sc.qty === 0 ? 'text-red-400' : 'text-blue-600')}>
                                {sc.qty}
                              </span>
                              <p className="text-[10px] text-slate-400">{sc.product?.unit}</p>
                            </td>
                            <td className="px-3 py-3 text-right hidden sm:table-cell">
                              <span className="text-xs text-slate-500">
                                {sc.shelf_price ? fmtCurrency(sc.shelf_price) : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <span className="text-xs text-emerald-600 font-semibold">
                                {sc.promo_price ? fmtCurrency(sc.promo_price) : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">{visit.stock_counts.length} produk dihitung</span>
                    </div>
                  </div>
                )}
              </div>

              // ── Orders ────────────────────────────────────────────────────
            ) : tab === 'orders' ? (
              <div className="p-4 space-y-3">
                {!visit.orders?.length ? (
                  <div className="text-center py-12 text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada order</p>
                  </div>
                ) : visit.orders.map(order => (
                  <div key={order.ID} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{order.order_no}</p>
                        {order.notes && <p className="text-[11px] text-slate-400">{order.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-800">
                          {fmtCurrency(order.total_amount)}
                        </span>
                        <OrderBadge status={order.status} />
                      </div>
                    </div>

                    {order.rejection_reason && (
                      <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                        <p className="text-[11px] text-red-600">
                          <span className="font-bold">Alasan ditolak:</span> {order.rejection_reason}
                        </p>
                      </div>
                    )}

                    <table className="w-full">
                      <tbody className="divide-y divide-slate-100">
                        {order.items?.map(item => (
                          <tr key={item.ID}>
                            <td className="px-4 py-2.5">
                              <p className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{item.product?.name}</p>
                              <p className="text-[11px] text-slate-400">{item.product?.sku}</p>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-slate-500 w-16">
                              ×{item.qty}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-slate-400 w-24">
                              {fmtCurrency(item.price)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-700 w-24">
                              {fmtCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {(order.approved_at || order.rejected_at) && (
                      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                        <p className="text-[11px] text-slate-400">
                          {order.approved_at ? `✅ Disetujui ${fmt(order.approved_at)}` : `❌ Ditolak ${fmt(order.rejected_at)}`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            ) : tab === 'competitors' ? (
              <div className="p-4 space-y-3">
                {loadingComp ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </div>
                ) : !competitors.length ? (
                  <div className="text-center py-12 text-slate-400">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data kompetitor</p>
                  </div>
                ) : competitors.map(comp => (
                  <div key={comp.ID} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {comp.brand || '—'} · {comp.item_name || comp.product?.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Vs: {comp.product?.name} ({comp.product?.sku})
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {comp.price && (
                            <p className="text-xs font-extrabold text-slate-800">{fmtCurrency(comp.price)}</p>
                          )}
                          {comp.promo_price && (
                            <p className="text-[11px] text-emerald-600 font-semibold">
                              Promo: {fmtCurrency(comp.promo_price)}
                            </p>
                          )}
                        </div>
                      </div>
                      {comp.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-1">"{comp.notes}"</p>
                      )}
                    </div>

                    {/* Competitor photos */}
                    {comp.photos?.length > 0 && (
                      <div className="p-3 grid grid-cols-3 gap-2">
                        {comp.photos.map(p => (
                          <div
                            key={p.ID}
                            className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
                            onClick={() => setLightbox(p.photo_url)}
                          >
                            <img src={`${API}${p.photo_url}`} alt="competitor" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              // ── Photos ────────────────────────────────────────────────────
            ) : (
              <div className="p-4 space-y-3">
                {/* Visit photos */}
                {visit.photos?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Foto Kunjungan ({visit.photos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {visit.photos.map(p => (
                        <div
                          key={p.ID}
                          className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
                          onClick={() => setLightbox(p.photo_url)}
                        >
                          <img src={`${API}${p.photo_url}`} alt={p.caption || 'foto'} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Check-in photo */}
                {visit.check_in_photo_url && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Foto Check-In
                    </p>
                    <div
                      className="aspect-video rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
                      onClick={() => setLightbox(visit.check_in_photo_url)}
                    >
                      <img src={`${API}${visit.check_in_photo_url}`} alt="check-in" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {!visit.photos?.length && !visit.check_in_photo_url && (
                  <div className="text-center py-12 text-slate-400">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada foto</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <div className={cn('w-2 h-8 rounded-full ml-auto', color)} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VisitsPage() {
  const { user: me } = useAuthStore()
  const myRole = (me as any)?.role as string | undefined

  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVisit, setSelectedVisit] = useState<number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const STATUS_TABS = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'checked_in', label: 'Aktif' },
    { value: 'completed', label: 'Selesai' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterDate) params.set('date', filterDate)
      const res = await apiFetch(`/api/visits?${params.toString()}`)
      setVisits(res.data ?? [])
    } catch { setVisits([]) }
    finally { setLoading(false) }
  }, [filterStatus, filterDate])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!search) return visits
    const q = search.toLowerCase()
    return visits.filter(v =>
      v.store?.name.toLowerCase().includes(q) ||
      v.sales?.name.toLowerCase().includes(q) ||
      v.store?.city?.toLowerCase().includes(q)
    )
  }, [visits, search])

  const stats = useMemo(() => ({
    total: visits.length,
    completed: visits.filter(v => v.status === 'completed').length,
    active: visits.filter(v => v.status === 'checked_in').length,
    pending: visits.filter(v => v.status === 'pending').length,
  }), [visits])

  return (
    <AppLayout>
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Kunjungan</h1>
            <p className="text-sm text-slate-400 mt-0.5">Monitor aktivitas kunjungan sales</p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} color="bg-slate-300" />
          <StatCard label="Selesai" value={stats.completed} sub={`${stats.total ? Math.round(stats.completed / stats.total * 100) : 0}%`} color="bg-emerald-400" />
          <StatCard label="Aktif" value={stats.active} color="bg-amber-400" />
          <StatCard label="Pending" value={stats.pending} color="bg-slate-300" />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari toko atau sales..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <button
            onClick={load}
            className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition', loading && 'opacity-50 pointer-events-none')}
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>

        {/* ── Status tabs ── */}
        <div className="flex gap-1.5">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border',
                filterStatus === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          {/* Table head */}
          <div className="border-b border-slate-100">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[220px]">Toko</th>
                  <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[160px]">Sales</th>
                  <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[100px]">Status</th>
                  <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Check-In</th>
                  <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[72px]">Durasi</th>
                  <th className="text-center px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">Stok</th>
                  <th className="text-center px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">Order</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
            </table>
          </div>

          {/* Body */}
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 rounded animate-pulse w-36" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
                  </div>
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-20" />
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-14" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-28" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-500 text-sm">Tidak ada kunjungan</p>
              <p className="text-xs mt-1">Coba ubah filter atau tanggal</p>
            </div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {filtered.map(v => {
                  const dur = duration(v.check_in_at, v.check_out_at)
                  const isSelected = selectedVisit === v.ID
                  return (
                    <tr
                      key={v.ID}
                      onClick={() => setSelectedVisit(v.ID)}
                      className={cn(
                        'group cursor-pointer transition-colors',
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      )}
                    >
                      {/* Toko */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{v.store?.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{v.store?.city}</p>
                          </div>
                        </div>
                      </td>

                      {/* Sales */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{v.sales?.name}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <StatusBadge status={v.status} />
                      </td>

                      {/* Check-in time */}
                      <td className="px-3 py-3 text-[11px] text-slate-400">
                        {v.check_in_at ? fmt(v.check_in_at) : <span className="italic">—</span>}
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-3 text-xs font-semibold text-slate-500 tabular-nums">
                        {dur !== null ? `${dur}m` : '—'}
                      </td>

                      {/* Stok count */}
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          'inline-block w-7 h-5 rounded-md text-[11px] font-bold leading-5',
                          (v.stock_counts?.length ?? 0) > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                        )}>
                          {v.stock_counts?.length ?? 0}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          'inline-block w-7 h-5 rounded-md text-[11px] font-bold leading-5',
                          (v.orders?.length ?? 0) > 0
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-400'
                        )}>
                          {v.orders?.length ?? 0}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="px-3 py-3">
                        <ChevronRight className={cn(
                          'w-4 h-4 transition-colors',
                          isSelected ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'
                        )} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-400">{filtered.length} kunjungan</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {selectedVisit !== null && (
        <VisitDetail visitId={selectedVisit} onClose={() => setSelectedVisit(null)} />
      )}
    </AppLayout>
  )
}