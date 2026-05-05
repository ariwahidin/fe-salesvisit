'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { visitsApi, productsApi } from '@/lib/api'
import { Product } from '@/types'
import { Loader2, CheckCircle, AlertCircle, MapPin, Search, Plus, Minus, ArrowLeft, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Html5Qrcode } from 'html5-qrcode'

import { db } from '@/lib/db'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

interface CountItem { product: Product; qty: number; notes: string }
interface LastStockItem { product_id: number; qty: number; product: Product }

export default function CheckOutPage() {
  const { id } = useParams()
  const router = useRouter()

  const [visit, setVisit] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [counts, setCounts] = useState<CountItem[]>([])
  const [search, setSearch] = useState('')
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [step, setStep] = useState<'stock' | 'gps' | 'review'>('stock')
  const [lastVisit, setLastVisit] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const codeReaderRef = useRef<Html5Qrcode | null>(null)

  const isOnline = useOnlineStatus()

  // useEffect PERTAMA - ganti ini
  useEffect(() => {
    const loadData = async () => {
      if (navigator.onLine) {
        Promise.all([
          visitsApi.get(Number(id)),
          productsApi.list({ active_only: true }),
        ])
          .then(([v, p]) => {
            setVisit(v)
            setLastVisit(v.last_visit || null)
            const prods = p.data || []
            setProducts(prods)
            if (v.draft_stock) {
              try {
                const draft = JSON.parse(v.draft_stock)
                setNotes(draft.notes || '')
                setCounts(prods.map((prod: Product) => {
                  const saved = draft.stock_counts?.find((s: any) => s.product_id === prod.ID)
                  return { product: prod, qty: saved?.qty ?? 0, notes: saved?.notes ?? '' }
                }))
              } catch {
                setCounts(prods.map((prod: Product) => ({ product: prod, qty: 0, notes: '' })))
              }
            } else {
              setCounts(prods.map((prod: Product) => ({ product: prod, qty: 0, notes: '' })))
            }
          }).catch(() => router.back())

      } else {
        try {
          const cachedProducts = await db.products
            .where('is_active').equals(1)
            .toArray()

          const cachedSchedule = await db.schedules
            .filter(s => s.visit?.id === Number(id))
            .first()

          if (!cachedSchedule?.visit) {
            router.back()
            return
          }

          const cachedVisit = cachedSchedule.visit
          setVisit({ ...cachedVisit, store: cachedSchedule.store })
          setProducts(cachedProducts as any)

          if (cachedVisit.draft_stock) {
            try {
              const draft = JSON.parse(cachedVisit.draft_stock)
              setNotes(draft.notes || '')
              setCounts(cachedProducts.map(prod => {
                const saved = draft.stock_counts?.find((s: any) => s.product_id === prod.id)
                return { product: prod as any, qty: saved?.qty ?? 0, notes: saved?.notes ?? '' }
              }))
            } catch {
              setCounts(cachedProducts.map(prod => ({ product: prod as any, qty: 0, notes: '' })))
            }
          } else {
            setCounts(cachedProducts.map(prod => ({ product: prod as any, qty: 0, notes: '' })))
          }

        } catch {
          router.back()
        }
      }
    }

    loadData()
  }, [id])

  // useEffect KEDUA - biarkan seperti semula
  useEffect(() => {
    if (!visit || counts.length === 0) return
    const timer = setTimeout(() => {
      visitsApi.saveDraft(Number(id), {
        notes,
        stock_counts: counts.map(c => ({
          product_id: c.product.ID,
          qty: c.qty,
          notes: c.notes,
        })),
      }).catch(() => { })
    }, 1000)
    return () => clearTimeout(timer)
  }, [counts, notes])

  // useEffect(() => {
  //   Promise.all([
  //     visitsApi.get(Number(id)),
  //     productsApi.list({ active_only: true }),
  //   ])
  //     .then(([v, p]) => {
  //       setVisit(v)
  //       setLastVisit(v.last_visit || null)
  //       const prods = p.data || []
  //       setProducts(prods)
  //       if (v.draft_stock) {
  //         try {
  //           const draft = JSON.parse(v.draft_stock)
  //           setNotes(draft.notes || '')
  //           setCounts(prods.map((prod: Product) => {
  //             const saved = draft.stock_counts?.find((s: any) => s.product_id === prod.ID)
  //             return { product: prod, qty: saved?.qty ?? 0, notes: saved?.notes ?? '' }
  //           }))
  //         } catch {
  //           setCounts(prods.map((prod: Product) => ({ product: prod, qty: 0, notes: '' })))
  //         }
  //       } else {
  //         setCounts(prods.map((prod: Product) => ({ product: prod, qty: 0, notes: '' })))
  //       }
  //     }).catch(() => router.back())
  // }, [id])

  useEffect(() => {
    if (!visit || counts.length === 0) return
    const timer = setTimeout(() => {
      visitsApi.saveDraft(Number(id), {
        notes,
        stock_counts: counts.map(c => ({
          product_id: c.product.ID,
          qty: c.qty,
          notes: c.notes,
        })),
      }).catch(() => { })
    }, 1000)
    return () => clearTimeout(timer)
  }, [counts, notes])

  const getGPS = useCallback(() => {
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
        setStep('review')
      },
      err => { setGpsError(err.message); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }, [])

  const updateQty = (productId: number, delta: number) => {
    setCounts(prev => prev.map(c =>
      c.product.ID === productId
        ? { ...c, qty: Math.max(0, c.qty + delta) }
        : c
    ))
  }

  const setQty = (productId: number, val: string) => {
    const qty = parseInt(val) || 0
    setCounts(prev => prev.map(c =>
      c.product.ID === productId ? { ...c, qty: Math.max(0, qty) } : c
    ))
  }

  const setItemNotes = (productId: number, notes: string) => {
    setCounts(prev => prev.map(c =>
      c.product.ID === productId ? { ...c, notes } : c
    ))
  }

  const startScan = async () => {
    console.log('startScan called')
    setScanning(true)
    try {
      console.log('creating Html5Qrcode')
      const html5Qrcode = new Html5Qrcode('qr-reader')
      codeReaderRef.current = html5Qrcode
      console.log('starting...')
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setSearch(decodedText)
          stopScan()
        },
        undefined
      )
      console.log('started!')
    } catch (e) {
      console.error('scan error:', e)
      setScanning(false)
    }
  }

  const stopScan = async () => {
    try {
      await codeReaderRef.current?.stop()
    } catch { }
    setScanning(false)
  }


  const handleSubmit = async () => {
    if (!gps) return
    setSubmitting(true)
    setError('')
    try {
      await visitsApi.checkOut(Number(id), {
        latitude: gps.lat,
        longitude: gps.lng,
        notes,
        stock_counts: counts.map(c => ({
          product_id: c.product.ID,
          qty: c.qty,
          notes: c.notes,
        })),
      })
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCounts = counts.filter(c =>
    c.product.name.toLowerCase().includes(search.toLowerCase()) ||
    c.product.sku.toLowerCase().includes(search.toLowerCase())
  )

  const filledCount = counts.filter(c => c.qty > 0).length
  const totalItems = counts.reduce((s, c) => s + c.qty, 0)

  if (!visit) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      </AppLayout>
    )
  }

  if (done) {
    return (
      <AppLayout>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="card p-8 text-center w-full animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-extrabold text-xl text-surface-900">Check-Out Berhasil!</h2>
            <p className="text-surface-500 text-sm mt-2">{filledCount} produk tercatat · {totalItems} unit total</p>
            <p className="text-surface-400 text-xs mt-4">Mengalihkan ke dashboard...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="p-4 pb-0">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-surface-500 text-sm hover:text-surface-700 mb-3">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <div className="card p-4 mb-4">
            <p className="font-extrabold text-surface-900">{visit.store?.name}</p>
            <p className="text-xs text-surface-500">{visit.store?.city}</p>
            <div className="flex gap-3 mt-2 text-xs text-surface-500">
              <span>🟢 Check-in: {visit.check_in_at ? new Date(visit.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="flex gap-1 mb-4">
            {(['stock', 'gps', 'review'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === s ? 'bg-brand-500 text-white scale-110' :
                    ['gps', 'review'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-surface-100 text-surface-400'
                )}>
                  {(['gps', 'review'].indexOf(step) > i) ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={cn('flex-1 h-0.5 rounded',
                  (step === 'gps' && i === 0) || step === 'review' ? 'bg-green-400' : 'bg-surface-200')} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Stock Count */}
        {step === 'stock' && (
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-surface-900">Input Stok</h2>
              <span className="badge bg-brand-100 text-brand-700">{filledCount}/{products.length} produk</span>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari produk atau scan barcode..." className="input pl-9 py-2.5" />
              </div>
              <button onClick={scanning ? stopScan : startScan}
                className={cn('px-3 py-2 rounded-xl border text-sm font-semibold transition',
                  scanning ? 'bg-red-50 border-red-200 text-red-600' : 'bg-surface-50 border-surface-200 text-surface-600')}>
                {scanning ? '✕' : '📷'}
              </button>
            </div>


            <div id="qr-reader" className={cn('rounded-2xl overflow-hidden w-full', scanning ? 'block' : 'hidden')} />
            {scanning && (
              <div id="qr-reader" className="rounded-2xl overflow-hidden w-full" />
            )}

            {/* Product list */}
            <div className="space-y-2 pb-28">
              {filteredCounts.map(({ product, qty, notes: itemNotes }) => (
                <div key={product.ID} className={cn('card p-3', qty > 0 ? 'ring-1 ring-brand-200' : '')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      qty > 0 ? 'bg-brand-100' : 'bg-surface-100')}>
                      <Package className={cn('w-4 h-4', qty > 0 ? 'text-brand-600' : 'text-surface-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-900 leading-tight">{product.name}</p>
                      {/* <p className="text-xs text-surface-400">{product.sku} · {product.unit}</p> */}
                      <p className="text-xs text-surface-400">{product.sku} · {product.unit}</p>
                      {lastVisit && (() => {
                        const last = lastVisit.stock_counts?.find((s: LastStockItem) => s.product_id === product.ID)
                        return (
                          <p className="text-xs text-surface-400 mt-0.5">
                            Kunjungan lalu: <span className={cn('font-semibold', last?.qty > 0 ? 'text-brand-600' : 'text-surface-400')}>
                              {last ? `${last.qty} ${product.unit}` : '-'}
                            </span>
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    {/* Qty stepper */}
                    <div className="flex items-center gap-2 bg-surface-50 rounded-2xl p-1">
                      <button onClick={() => updateQty(product.ID, -1)}
                        className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-card text-surface-600 hover:bg-red-50 hover:text-red-500 transition">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input type="number" min="0" value={qty === 0 ? '' : qty}
                        onChange={e => setQty(product.ID, e.target.value)}
                        onBlur={e => { if (e.target.value === '') setQty(product.ID, '0') }}
                        placeholder="0"
                        className="w-14 text-center font-bold text-surface-900 bg-transparent border-0 focus:outline-none text-sm" />
                      <button onClick={() => updateQty(product.ID, 1)}
                        className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white hover:bg-brand-600 transition">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Notes */}
                    <input value={itemNotes} onChange={e => setItemNotes(product.ID, e.target.value)}
                      placeholder="Catatan..."
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky bottom */}
            <div className="fixed bottom-0 inset-x-0 max-w-2xl mx-auto px-4 pb-2 ">
              <div className="bg-white rounded-3xl shadow-up p-3 flex items-center gap-3">
                <div className="flex-1 text-sm">
                  <p className="font-bold text-surface-900">{filledCount} produk · {totalItems} unit</p>
                  <p className="text-xs text-surface-400">Semua produk dengan qty 0 tetap akan disimpan</p>
                </div>
                <button onClick={() => setStep('gps')}
                  className="btn-brand px-5 py-3 text-sm whitespace-nowrap">
                  Lanjut →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: GPS */}
        {step === 'gps' && (
          <div className="px-4">
            <div className="card p-6 text-center">
              <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4',
                gpsLoading ? 'bg-brand-100 animate-pulse' : 'bg-brand-50')}>
                <MapPin className="w-10 h-10 text-brand-500" />
              </div>
              <h2 className="font-extrabold text-lg mb-1">Ambil Lokasi Check-Out</h2>
              <p className="text-surface-500 text-sm mb-4">Konfirmasi kamu masih di lokasi toko</p>
              {gpsError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />{gpsError}
                </div>
              )}
              <div className="mb-4">
                <label className="label">Catatan Kunjungan</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Kondisi toko, hal perlu diperhatikan, dll..."
                  rows={3} className="input resize-none" />
              </div>
              <button onClick={getGPS} disabled={gpsLoading}
                className="btn-brand w-full py-3.5 flex items-center justify-center gap-2">
                {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                {gpsLoading ? 'Mengambil lokasi...' : 'Ambil GPS & Lanjut'}
              </button>
              <button onClick={() => setStep('stock')} className="btn-ghost w-full py-3 mt-2 text-sm">
                ← Kembali Edit Stok
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 'review' && gps && (
          <div className="px-4 space-y-3">
            <div className="card p-4 space-y-2">
              <h2 className="font-extrabold text-surface-900">Ringkasan Check-Out</h2>
              <div className="text-xs text-surface-500 space-y-1">
                <p>📍 GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
                <p>📦 {filledCount} produk diisi · {totalItems} unit total</p>
                {notes && <p>📝 {notes}</p>}
              </div>
            </div>

            {/* Summary table */}
            <div className="card p-4">
              <h3 className="font-bold text-sm text-surface-800 mb-3">Detail Stok</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {counts.filter(c => c.qty > 0).map(c => (
                  <div key={c.product.ID} className="flex items-center justify-between text-sm">
                    <span className="text-surface-700 truncate flex-1 mr-2">{c.product.name}</span>
                    <span className="font-bold text-brand-600 flex-shrink-0">{c.qty} {c.product.unit}</span>
                  </div>
                ))}
                {counts.filter(c => c.qty === 0).length > 0 && (
                  <p className="text-xs text-surface-400 pt-1 border-t border-surface-100">
                    + {counts.filter(c => c.qty === 0).length} produk kosong (qty 0)
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />{error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              className="btn-brand w-full py-4 text-base flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? 'Menyimpan...' : 'Submit Check-Out'}
            </button>
            <button onClick={() => setStep('gps')} className="btn-ghost w-full py-3 text-sm">
              ← Kembali
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
