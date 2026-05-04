'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { visitsApi, formatDateTime, API_URL } from '@/lib/api'
import { ArrowLeft, MapPin, Clock, Package, FileText, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'

export default function VisitDetailPage() {
  const { id }  = useParams()
  const router  = useRouter()
  const [visit, setVisit]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    visitsApi.get(Number(id)).then(v => { setVisit(v); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [id])

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    </AppLayout>
  )

  if (!visit) return (
    <AppLayout>
      <div className="p-4 text-center py-20 text-surface-400">Kunjungan tidak ditemukan</div>
    </AppLayout>
  )

  const duration = visit.check_in_at && visit.check_out_at
    ? Math.round((new Date(visit.check_out_at).getTime() - new Date(visit.check_in_at).getTime()) / 60000)
    : null

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-surface-500 text-sm hover:text-surface-700">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {/* Header card */}
        <div className="card p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-extrabold text-lg text-surface-900">{visit.store?.name}</p>
              <p className="text-sm text-surface-500">{visit.store?.city}</p>
            </div>
            <StatusBadge status={visit.status} />
          </div>
          <p className="text-xs text-surface-400">Sales: {visit.sales?.name}</p>
        </div>

        {/* Check-in photo */}
        {visit.check_in_photo_url && (
          <div className="card overflow-hidden">
            <img
              src={`${API_URL}${visit.check_in_photo_url}`}
              alt="Foto check-in"
              className="w-full h-52 object-cover"
            />
            <div className="p-3">
              <p className="text-xs font-semibold text-surface-600">📸 Foto Bukti Kunjungan</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-sm text-surface-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" /> Timeline
          </h3>
          <div className="space-y-3">
            {visit.check_in_at && (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5" />
                  <div className="w-0.5 flex-1 bg-surface-200 mt-1" />
                </div>
                <div className="pb-3">
                  <p className="text-sm font-semibold text-surface-800">Check-In</p>
                  <p className="text-xs text-surface-500">{formatDateTime(visit.check_in_at)}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    📍 {visit.check_in_lat.toFixed(5)}, {visit.check_in_lng.toFixed(5)}
                  </p>
                </div>
              </div>
            )}
            {visit.check_out_at ? (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-red-400 mt-0.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-800">Check-Out</p>
                  <p className="text-xs text-surface-500">{formatDateTime(visit.check_out_at)}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    📍 {visit.check_out_lat.toFixed(5)}, {visit.check_out_lng.toFixed(5)}
                  </p>
                  {duration !== null && (
                    <p className="text-xs text-brand-600 font-semibold mt-0.5">⏱ Durasi: {duration} menit</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-surface-300 mt-0.5 animate-pulse-dot" />
                <p className="text-sm text-surface-400 italic">Belum check-out</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {visit.notes && (
          <div className="card p-4">
            <h3 className="font-bold text-sm text-surface-800 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-brand-500" /> Catatan
            </h3>
            <p className="text-sm text-surface-600">{visit.notes}</p>
          </div>
        )}

        {/* Stock counts */}
        {visit.stock_counts?.length > 0 && (
          <div className="card p-4">
            <h3 className="font-bold text-sm text-surface-800 flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-brand-500" />
              Hasil Hitung Stok ({visit.stock_counts.length} produk)
            </h3>
            <div className="space-y-2">
              {visit.stock_counts.map((sc: any) => (
                <div key={sc.ID} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800 truncate">{sc.product?.name}</p>
                    <p className="text-xs text-surface-400">{sc.product?.sku} · {sc.product?.unit}</p>
                    {sc.notes && <p className="text-xs text-surface-400 italic mt-0.5">"{sc.notes}"</p>}
                  </div>
                  <div className={`text-right flex-shrink-0`}>
                    <span className={`font-extrabold text-lg ${sc.qty === 0 ? 'text-red-400' : 'text-brand-600'}`}>
                      {sc.qty}
                    </span>
                    <p className="text-xs text-surface-400">{sc.product?.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
