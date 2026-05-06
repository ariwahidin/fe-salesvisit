'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { productsApi } from '@/lib/api'
import { Product } from '@/types'
import {
  Loader2, ArrowLeft, ShoppingCart, Plus, Minus,
  Package, Trash2, ChevronDown, ChevronUp, CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  product: Product
  qty: number
  price: number
  subtotal: number
}

interface OrderDraft {
  notes: string
  items: OrderItem[]
  totalAmount: number
  totalQty: number
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderTakingPage() {
  const { id } = useParams()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Multi-order: list of order drafts
  const [orders, setOrders] = useState<OrderDraft[]>([
    { notes: '', items: [], totalAmount: 0, totalQty: 0 }
  ])
  const [activeOrderIdx, setActiveOrderIdx] = useState(0)
  const [collapsedOrders, setCollapsedOrders] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // ─── Load products + restore draft ────────────────────────────────────────

  useEffect(() => {
    productsApi.list({ active_only: true })
      .then(res => {
        setProducts(res.data || [])

        // Restore dari sessionStorage jika ada
        try {
          const raw = sessionStorage.getItem(`order_draft_${id}`)
          if (raw) {
            const parsed: OrderDraft[] = JSON.parse(raw)
            if (parsed.length > 0) setOrders(parsed)
          }
        } catch { }
      })
      .finally(() => setLoading(false))
  }, [id])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const recalc = (items: OrderItem[]): Pick<OrderDraft, 'totalAmount' | 'totalQty'> => ({
    totalAmount: items.reduce((s, i) => s + i.subtotal, 0),
    totalQty: items.reduce((s, i) => s + i.qty, 0),
  })

  const updateOrder = (idx: number, updater: (o: OrderDraft) => OrderDraft) => {
    setOrders(prev => prev.map((o, i) => i === idx ? updater(o) : o))
  }

  const addItemToOrder = (orderIdx: number, product: Product) => {
    updateOrder(orderIdx, order => {
      const exists = order.items.find(i => i.product.ID === product.ID)
      if (exists) return order // sudah ada, skip

      const price = (product as any).price ?? 0
      const newItem: OrderItem = { product, qty: 1, price, subtotal: price }
      const items = [...order.items, newItem]
      return { ...order, items, ...recalc(items) }
    })
    setSearch('') // clear search setelah add
  }

  const updateItemQty = (orderIdx: number, productId: number, delta: number) => {
    updateOrder(orderIdx, order => {
      const items = order.items.map(item => {
        if (item.product.ID !== productId) return item
        const qty = Math.max(1, item.qty + delta)
        return { ...item, qty, subtotal: item.price * qty }
      })
      return { ...order, items, ...recalc(items) }
    })
  }

  const setItemQty = (orderIdx: number, productId: number, val: string) => {
    const qty = Math.max(1, parseInt(val) || 1)
    updateOrder(orderIdx, order => {
      const items = order.items.map(item => {
        if (item.product.ID !== productId) return item
        return { ...item, qty, subtotal: item.price * qty }
      })
      return { ...order, items, ...recalc(items) }
    })
  }

  const removeItem = (orderIdx: number, productId: number) => {
    updateOrder(orderIdx, order => {
      const items = order.items.filter(i => i.product.ID !== productId)
      return { ...order, items, ...recalc(items) }
    })
  }

  const setOrderNotes = (orderIdx: number, notes: string) => {
    updateOrder(orderIdx, o => ({ ...o, notes }))
  }

  const addNewOrder = () => {
    // Collapse order aktif sekarang
    setCollapsedOrders(prev => new Set([...prev, activeOrderIdx]))
    const newIdx = orders.length
    setOrders(prev => [...prev, { notes: '', items: [], totalAmount: 0, totalQty: 0 }])
    setActiveOrderIdx(newIdx)
  }

  const removeOrder = (idx: number) => {
    if (orders.length === 1) return // minimal 1 order
    setOrders(prev => prev.filter((_, i) => i !== idx))
    setActiveOrderIdx(Math.max(0, idx - 1))
    setCollapsedOrders(prev => {
      const next = new Set(prev)
      next.delete(idx)
      return next
    })
  }

  const toggleCollapse = (idx: number) => {
    setCollapsedOrders(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  // ─── Save & kembali ───────────────────────────────────────────────────────

  const handleSave = () => {
    setSaving(true)
    // Filter order yang ada isinya
    const validOrders = orders.filter(o => o.items.length > 0)
    try {
      sessionStorage.setItem(`order_draft_${id}`, JSON.stringify(validOrders))
    } catch { }
    setDone(true)
    setTimeout(() => router.back(), 1200)
  }

  const handleSkip = () => {
    sessionStorage.removeItem(`order_draft_${id}`)
    router.back()
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const activeOrder = orders[activeOrderIdx]
  const activeProductIds = new Set(activeOrder?.items.map(i => i.product.ID))

  const filteredProducts = search.length >= 1
    ? products.filter(p =>
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
         p.sku.toLowerCase().includes(search.toLowerCase())) &&
        !activeProductIds.has(p.ID)
      ).slice(0, 8)
    : []

  const grandTotal = orders.reduce((s, o) => s + o.totalAmount, 0)
  const grandQty = orders.reduce((s, o) => s + o.totalQty, 0)
  const totalOrders = orders.filter(o => o.items.length > 0).length

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      </AppLayout>
    )
  }

  // ─── Done ─────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <AppLayout>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="card p-8 text-center w-full animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-extrabold text-xl text-surface-900">Order Tersimpan!</h2>
            <p className="text-surface-500 text-sm mt-2">
              {totalOrders} order · {grandQty} item · Rp {grandTotal.toLocaleString('id-ID')}
            </p>
            <p className="text-surface-400 text-xs mt-4">Kembali ke checkout...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="animate-fade-in">

        {/* Header */}
        <div className="p-4 pb-0">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-surface-500 text-sm hover:text-surface-700 mb-3">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Checkout
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-extrabold text-surface-900 text-lg">Order Taking</h1>
              <p className="text-xs text-surface-500">
                {totalOrders > 0
                  ? `${totalOrders} order · ${grandQty} item · Rp ${grandTotal.toLocaleString('id-ID')}`
                  : 'Belum ada order'}
              </p>
            </div>
            <button onClick={addNewOrder}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-semibold border border-brand-200 hover:bg-brand-100 transition">
              <Plus className="w-4 h-4" /> Order Baru
            </button>
          </div>
        </div>

        <div className="px-4 space-y-3 pb-32">

          {/* ── Order Cards ─────────────────────────────────────────────── */}
          {orders.map((order, oi) => {
            const isCollapsed = collapsedOrders.has(oi)
            const isActive = oi === activeOrderIdx
            const isEmpty = order.items.length === 0

            return (
              <div key={oi} className={cn(
                'card overflow-hidden transition-all',
                isActive ? 'ring-2 ring-brand-400' : 'opacity-80'
              )}>

                {/* Order header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => {
                    setActiveOrderIdx(oi)
                    if (isCollapsed) toggleCollapse(oi)
                  }}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      isActive ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500'
                    )}>
                      {oi + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-surface-900">
                        Order {oi + 1}
                        {isEmpty && <span className="text-surface-400 font-normal ml-1">(kosong)</span>}
                      </p>
                      {!isEmpty && (
                        <p className="text-xs text-surface-500">
                          {order.totalQty} item · Rp {order.totalAmount.toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {orders.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); removeOrder(oi) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleCollapse(oi) }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 text-surface-400 transition">
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Order body */}
                {!isCollapsed && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-100">

                    {/* Search & add product — hanya di order aktif */}
                    {isActive && (
                      <div className="pt-3">
                        <div className="relative">
                          <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari & tambah produk..."
                            className="input py-2.5 pl-4 pr-4 w-full"
                          />
                        </div>

                        {/* Dropdown hasil search */}
                        {filteredProducts.length > 0 && (
                          <div className="mt-1 bg-white border border-surface-200 rounded-2xl shadow-lg overflow-hidden">
                            {filteredProducts.map(product => (
                              <button
                                key={product.ID}
                                onClick={() => addItemToOrder(oi, product)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition text-left border-b border-surface-100 last:border-0">
                                <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-surface-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-surface-900 truncate">{product.name}</p>
                                  <p className="text-xs text-surface-400">{product.sku} · {product.unit}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-brand-600">
                                    Rp {((product as any).price ?? 0).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {search.length >= 1 && filteredProducts.length === 0 && (
                          <p className="text-xs text-surface-400 text-center py-3">
                            {products.filter(p => !activeProductIds.has(p.ID)).length === 0
                              ? 'Semua produk sudah ditambahkan'
                              : 'Produk tidak ditemukan'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Item list */}
                    {order.items.length === 0 ? (
                      <div className="text-center py-6 text-surface-400">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada produk</p>
                        <p className="text-xs mt-1">Cari produk di atas untuk menambahkan</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {order.items.map(item => (
                          <div key={item.product.ID}
                            className="flex items-center gap-3 py-2 border-b border-surface-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-surface-900 truncate">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-surface-400">
                                Rp {item.price.toLocaleString('id-ID')} / {item.product.unit}
                              </p>
                            </div>

                            {/* Qty stepper */}
                            <div className="flex items-center gap-1.5 bg-surface-50 rounded-xl p-1">
                              <button
                                onClick={() => updateItemQty(oi, item.product.ID, -1)}
                                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm text-surface-600 hover:bg-red-50 hover:text-red-500 transition">
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number" min="1"
                                value={item.qty}
                                onChange={e => setItemQty(oi, item.product.ID, e.target.value)}
                                className="w-10 text-center font-bold text-surface-900 bg-transparent border-0 focus:outline-none text-sm"
                              />
                              <button
                                onClick={() => updateItemQty(oi, item.product.ID, 1)}
                                className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white hover:bg-brand-600 transition">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right w-24 flex-shrink-0">
                              <p className="text-sm font-bold text-brand-600">
                                Rp {item.subtotal.toLocaleString('id-ID')}
                              </p>
                            </div>

                            {/* Remove */}
                            <button
                              onClick={() => removeItem(oi, item.product.ID)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-surface-300 hover:text-red-400 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* Order total */}
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm text-surface-500">
                            {order.totalQty} item
                          </span>
                          <span className="text-sm font-extrabold text-surface-900">
                            Rp {order.totalAmount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Order notes */}
                    <input
                      value={order.notes}
                      onChange={e => setOrderNotes(oi, e.target.value)}
                      placeholder="Catatan order (opsional)..."
                      className="input text-sm py-2 w-full"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Sticky Bottom ─────────────────────────────────────────────── */}
        <div className="fixed bottom-0 inset-x-0 max-w-2xl mx-auto px-4 pb-2">
          <div className="bg-white rounded-3xl shadow-up p-3 space-y-2">

            {/* Grand total */}
            {grandQty > 0 && (
              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-surface-500">
                  {totalOrders} order · {grandQty} item
                </span>
                <span className="text-sm font-extrabold text-brand-700">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="btn-ghost flex-1 py-3 text-sm text-surface-500">
                Tidak Ada Order
              </button>
              <button
                onClick={handleSave}
                disabled={saving || totalOrders === 0}
                className={cn(
                  'flex-1 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition',
                  totalOrders > 0
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                )}>
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                Simpan & Kembali
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}