'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { areasApi, usersApi } from '@/lib/api'
import {
  Calendar, Plus, Search, Edit, Trash2, X, Save, Loader2,
  ChevronLeft, ChevronRight, Clock, CheckCircle2,
  AlertCircle, User, Filter, SlidersHorizontal,
  CalendarDays, SkipForward, RotateCcw, MapPin,
  Upload, Download, CheckSquare, Square, Minus,
  LayoutList, LayoutGrid, MoreHorizontal, ChevronDown,
  FileSpreadsheet, AlertTriangle, XCircle, Eye, EyeOff,
  RefreshCw, Columns, ArrowUpDown, Info, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Schedule {
  ID: number
  company_id: number
  sales_id: number
  store_id: number
  visit_date: string
  notes: string
  status: 'scheduled' | 'completed' | 'skipped'
  import_batch_id?: number
  sales: { ID: number; name: string; email: string }
  store: { ID: number; name: string; code: string; city: string; area?: { name: string; region?: { name: string } } }
  CreatedAt: string
}

interface SalesUser { ID: number; name: string; email: string; is_active: boolean }
interface Area { ID: number; name: string; code: string; region_id: number }
interface StoreItem { ID: number; name: string; code: string; city: string }

type ViewMode = 'table' | 'calendar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || ''

function apiToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function getDaysInMonth(d: Date) {
  const start = startOfMonth(d)
  const end = endOfMonth(d)
  const days: Date[] = []
  for (let cur = new Date(start); cur <= end; cur = addDays(cur, 1)) {
    days.push(new Date(cur))
  }
  return days
}
function monthLabel(d: Date) {
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_MAP = {
  scheduled: { label: 'Dijadwalkan', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', icon: Clock },
  completed: { label: 'Selesai', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  skipped: { label: 'Dilewati', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500', icon: SkipForward },
}

function StatusBadge({ status, size = 'md' }: { status: Schedule['status']; size?: 'sm' | 'md' }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.scheduled
  const Icon = cfg.icon
  if (size === 'sm') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md', cfg.badge)}>
        <Icon className="w-2.5 h-2.5" /> {cfg.label}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg', cfg.badge)}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, onChange }: {
  checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer accent-blue-600"
    />
  )
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  count, onDelete, onStatus, onClose,
}: {
  count: number
  onDelete: () => void
  onStatus: (s: Schedule['status']) => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg">
      <button onClick={onClose} className="p-1 hover:bg-blue-500 rounded-lg transition">
        <X className="w-4 h-4" />
      </button>
      <span className="text-sm font-bold">{count} dipilih</span>
      <div className="w-px h-4 bg-blue-400" />
      <span className="text-xs font-semibold text-blue-200">Ubah status:</span>
      {Object.entries(STATUS_MAP).map(([v, cfg]) => (
        <button
          key={v}
          onClick={() => onStatus(v as Schedule['status'])}
          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-blue-500 hover:bg-blue-400 rounded-lg transition"
        >
          <cfg.icon className="w-3 h-3" /> {cfg.label}
        </button>
      ))}
      <div className="w-px h-4 bg-blue-400" />
      <button
        onClick={onDelete}
        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-rose-500 hover:bg-rose-400 rounded-lg transition"
      >
        <Trash2 className="w-3 h-3" /> Hapus
      </button>
    </div>
  )
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ salesList, onClose, onDone }: {
  salesList: SalesUser[]
  onClose: () => void
  onDone: () => void
}) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [rows, setRows] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const REQUIRED_COLS = ['sales_email', 'store_code', 'visit_date']
  const TEMPLATE_HEADER = 'sales_email,store_code,visit_date,notes\n'
  const EXAMPLE_ROWS = [
    'sales@example.com,STR001,2025-07-01,Kunjungan rutin',
    'sales2@example.com,STR002,2025-07-02,',
  ]

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADER + EXAMPLE_ROWS.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_jadwal.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return { rows: [], errors: ['File kosong atau hanya header'] }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const missing = REQUIRED_COLS.filter(c => !header.includes(c))
    if (missing.length > 0) return { rows: [], errors: [`Kolom wajib tidak ditemukan: ${missing.join(', ')}`] }

    const errs: string[] = []
    const parsed = lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(v => v.trim())
      const row: any = {}
      header.forEach((h, idx) => { row[h] = vals[idx] || '' })

      if (!row.sales_email) errs.push(`Baris ${i + 2}: sales_email kosong`)
      if (!row.store_code) errs.push(`Baris ${i + 2}: store_code kosong`)
      if (!row.visit_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.visit_date))
        errs.push(`Baris ${i + 2}: format visit_date harus YYYY-MM-DD`)

      return row
    })

    return { rows: parsed, errors: errs }
  }

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrors(['Hanya file .csv yang didukung'])
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const { rows: r, errors: e2 } = parseCSV(e.target?.result as string)
      setRows(r)
      setErrors(e2)
      if (r.length > 0) setStep('preview')
    }
    reader.readAsText(file)
  }

  const doImport = async () => {
    setImporting(true)
    try {
      const res = await apiFetch('/api/schedules/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      })
      setResult({ success: res.success ?? rows.length, failed: res.failed ?? 0 })
      setStep('result')
    } catch (e: any) {
      setErrors([e.message])
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Import Jadwal Bulky</h2>
              <p className="text-xs text-slate-400">Upload file CSV untuk import jadwal sekaligus</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-slate-100 bg-slate-50">
          {(['upload', 'preview', 'result'] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition',
                step === s ? 'bg-blue-600 text-white' : i < ['upload', 'preview', 'result'].indexOf(step) ? 'text-emerald-600' : 'text-slate-400'
              )}>
                {i < ['upload', 'preview', 'result'].indexOf(step) ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                {s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview' : 'Hasil'}
              </div>
              {i < 2 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Template download */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Template CSV</p>
                    <p className="text-[11px] text-slate-400">Kolom: sales_email, store_code, visit_date, notes</p>
                  </div>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                  <Download className="w-3 h-3" /> Download Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition group"
              >
                <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mx-auto mb-3 transition" />
                <p className="font-bold text-slate-600 text-sm">Klik atau drag & drop file CSV</p>
                <p className="text-xs text-slate-400 mt-1">Maks 10.000 baris per upload</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {errors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-rose-600 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-sm font-bold text-slate-700">{rows.length} baris siap diimport</span>
                </div>
                <button onClick={() => { setStep('upload'); setRows([]); setErrors([]) }}
                  className="text-xs text-blue-600 hover:underline font-semibold">Ganti file</button>
              </div>

              {errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-1">Peringatan ({errors.length})</p>
                  {errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-amber-600">{e}</p>
                  ))}
                  {errors.length > 5 && <p className="text-xs text-amber-500 mt-1">+{errors.length - 5} lainnya...</p>}
                </div>
              )}

              {/* Preview table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-bold text-slate-500">Email Sales</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-500">Kode Toko</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-500">Tanggal</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-500">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600">{row.sales_email}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{row.store_code}</td>
                        <td className="px-3 py-2 text-slate-600">{row.visit_date}</td>
                        <td className="px-3 py-2 text-slate-400 truncate max-w-[160px]">{row.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
                    +{rows.length - 20} baris lainnya tidak ditampilkan
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="text-center py-8 space-y-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mx-auto',
                result.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'
              )}>
                {result.failed === 0
                  ? <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  : <AlertTriangle className="w-8 h-8 text-amber-500" />
                }
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">Import Selesai</p>
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-600">{result.success}</p>
                    <p className="text-xs text-slate-400">Berhasil</p>
                  </div>
                  {result.failed > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-black text-rose-500">{result.failed}</p>
                      <p className="text-xs text-slate-400">Gagal</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition flex-1">
            {step === 'result' ? 'Tutup' : 'Batal'}
          </button>
          {step === 'preview' && (
            <button onClick={doImport} disabled={importing || rows.length === 0}
              className="flex-[2] py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Mengimport...' : `Import ${rows.length} Jadwal`}
            </button>
          )}
          {step === 'result' && (
            <button onClick={() => { onDone(); onClose() }}
              className="flex-[2] py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Schedule Form Modal ──────────────────────────────────────────────────────

function ScheduleModal({ mode, schedule, salesList, onClose, onSave }: {
  mode: 'create' | 'edit'
  schedule?: Schedule
  salesList: SalesUser[]
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    sales_id: schedule?.sales_id?.toString() ?? '',
    store_id: schedule?.store_id?.toString() ?? '',
    visit_date: schedule?.visit_date?.slice(0, 10) ?? isoDate(new Date()),
    notes: schedule?.notes ?? '',
    status: schedule?.status ?? 'scheduled',
  })
  const [stores, setStores] = useState<StoreItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const STATUS_OPTIONS = ["scheduled", "completed", "skipped"] as const;
  type VisitStatus = typeof STATUS_OPTIONS[number]; // "scheduled" | "completed" | "skipped"

  useEffect(() => {
    apiFetch('/api/stores?active_only=true').then(r => setStores(r.data || [])).catch(() => { })
  }, [])

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.sales_id || !form.store_id || !form.visit_date) {
      setError('Sales, toko, dan tanggal wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      const body = {
        sales_id: Number(form.sales_id),
        store_id: Number(form.store_id),
        visit_date: form.visit_date,
        notes: form.notes,
      }
      if (mode === 'create') {
        await apiFetch('/api/schedules', { method: 'POST', body: JSON.stringify(body) })
      } else {
        await apiFetch(`/api/schedules/${schedule!.ID}`, {
          method: 'PUT',
          body: JSON.stringify({ ...body, status: form.status }),
        })
      }
      onSave()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{mode === 'create' ? 'Tambah Jadwal' : 'Edit Jadwal'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal *</label>
            <input type="date" value={form.visit_date} onChange={f('visit_date')} className={cn(inputCls, 'mt-1.5 font-mono')} />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales *</label>
            <select value={form.sales_id} onChange={f('sales_id')} className={cn(inputCls, 'mt-1.5')}>
              <option value="">Pilih sales...</option>
              {salesList.filter(s => s.is_active).map(s => (
                <option key={s.ID} value={s.ID}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toko *</label>
            <select value={form.store_id} onChange={f('store_id')} className={cn(inputCls, 'mt-1.5')}>
              <option value="">Pilih toko...</option>
              {stores.map(s => (
                <option key={s.ID} value={s.ID}>{s.name} ({s.code}){s.city ? ` — ${s.city}` : ''}</option>
              ))}
            </select>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {Object.entries(STATUS_MAP).map(([v, cfg]) => (
                  <button
                    key={v}
                    // onClick={() => setForm(p => ({ ...p, status: v }))}
                    onClick={() => setForm(p => ({ ...p, status: v as VisitStatus }))}
                    disabled={schedule?.status === 'completed'}
                    className={cn(
                      'py-2 text-xs font-bold rounded-xl border transition flex flex-col items-center gap-1',
                      form.status === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50',
                      schedule?.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                  >
                    <cfg.icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Opsional..."
              className={cn(inputCls, 'mt-1.5 resize-none')} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition flex-1">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : mode === 'create' ? 'Buat Jadwal' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ schedules, month, onMonthChange, onDayClick }: {
  schedules: Schedule[]
  month: Date
  onMonthChange: (d: Date) => void
  onDayClick: (date: string) => void
}) {
  const days = getDaysInMonth(month)
  const firstDow = startOfMonth(month).getDay() // 0=Sun
  const adjustedFirstDow = firstDow === 0 ? 6 : firstDow - 1 // Mon-start

  const byDate = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    for (const s of schedules) {
      const d = s.visit_date.slice(0, 10)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(s)
    }
    return map
  }, [schedules])

  const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  const today = isoDate(new Date())

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <button onClick={() => onMonthChange(addMonths(month, -1))}
          className="p-1.5 hover:bg-slate-100 rounded-xl transition">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="font-bold text-slate-800 capitalize">{monthLabel(month)}</span>
        <button onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1.5 hover:bg-slate-100 rounded-xl transition">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DOW.map(d => (
          <div key={d} className="text-center py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells */}
        {Array.from({ length: adjustedFirstDow }).map((_, i) => (
          <div key={`empty-${i}`} className="border-r border-b border-slate-100 min-h-[90px] bg-slate-50/50" />
        ))}

        {days.map(day => {
          const ds = isoDate(day)
          const items = byDate.get(ds) || []
          const isToday = ds === today
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const completed = items.filter(s => s.status === 'completed').length
          const scheduled = items.filter(s => s.status === 'scheduled').length
          const skipped = items.filter(s => s.status === 'skipped').length

          return (
            <div
              key={ds}
              onClick={() => items.length > 0 && onDayClick(ds)}
              className={cn(
                'border-r border-b border-slate-100 min-h-[90px] p-1.5 transition-all',
                items.length > 0 ? 'cursor-pointer hover:bg-blue-50/50' : '',
                isWeekend ? 'bg-slate-50/50' : ''
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1',
                isToday ? 'bg-blue-600 text-white' : 'text-slate-500'
              )}>
                {day.getDate()}
              </div>

              {items.length > 0 && (
                <div className="space-y-0.5">
                  {/* Summary dots */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {completed > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded-md leading-4">
                        {completed}✓
                      </span>
                    )}
                    {scheduled > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded-md leading-4">
                        {scheduled}~
                      </span>
                    )}
                    {skipped > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded-md leading-4">
                        {skipped}×
                      </span>
                    )}
                  </div>
                  {/* First 2 items preview */}
                  {items.slice(0, 2).map(s => (
                    <div key={s.ID} className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium leading-4',
                      STATUS_MAP[s.status]?.badge
                    )}>
                      {s.sales?.name?.split(' ')[0]} · {s.store?.code}
                    </div>
                  ))}
                  {items.length > 2 && (
                    <div className="text-[10px] text-slate-400 px-1.5">+{items.length - 2} lagi</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  schedules, selected, onSelect, onSelectAll, onEdit, onDelete, loading,
}: {
  schedules: Schedule[]
  selected: Set<number>
  onSelect: (id: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onEdit: (s: Schedule) => void
  onDelete: (s: Schedule) => void
  loading: boolean
}) {
  const allChecked = schedules.length > 0 && selected.size === schedules.length
  const someChecked = selected.size > 0 && selected.size < schedules.length

  const cols = [
    { key: 'date', label: 'Tanggal', w: 'w-32' },
    { key: 'sales', label: 'Sales', w: 'w-40' },
    { key: 'store', label: 'Toko', w: '' },
    { key: 'area', label: 'Area', w: 'w-36' },
    { key: 'status', label: 'Status', w: 'w-32' },
    { key: 'notes', label: 'Catatan', w: 'w-40' },
    { key: 'actions', label: '', w: 'w-16' },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={onSelectAll}
                />
              </th>
              {cols.map(c => (
                <th key={c.key} className={cn('text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap', c.w)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: cols.length + 1 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-16 text-slate-400">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-slate-500 text-sm">Tidak ada jadwal</p>
                </td>
              </tr>
            ) : (
              schedules.map(s => {
                const area = s.store?.area
                const region = area?.region
                const isSelected = selected.has(s.ID)

                return (
                  <tr
                    key={s.ID}
                    className={cn(
                      'group hover:bg-slate-50 transition-colors',
                      isSelected ? 'bg-blue-50/60' : '',
                      s.status === 'skipped' ? 'opacity-60' : ''
                    )}
                  >
                    <td className="w-10 px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={v => onSelect(s.ID, v)}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {fmtDateShort(s.visit_date)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-800">{s.sales?.name ?? '-'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.store?.name ?? '-'}</p>
                        <p className="text-xs text-slate-400 font-mono">{s.store?.code ?? ''}{s.store?.city ? ` · ${s.store.city}` : ''}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-500">
                      {region?.name && <span className="text-slate-400">{region.name} › </span>}
                      {area?.name ? <span className="text-blue-600 font-medium">{area.name}</span> : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 max-w-[160px] truncate">
                      {s.notes || <span className="italic">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {s.status !== 'completed' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => onEdit(s)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onDelete(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      {!loading && schedules.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">{schedules.length} jadwal</span>
          {selected.size > 0 && (
            <span className="text-xs font-semibold text-blue-600">{selected.size} dipilih</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ schedules }: { schedules: Schedule[] }) {
  const total = schedules.length
  const completed = schedules.filter(s => s.status === 'completed').length
  const scheduled = schedules.filter(s => s.status === 'scheduled').length
  const skipped = schedules.filter(s => s.status === 'skipped').length
  const pct = total ? Math.round((completed / total) * 100) : 0

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Total', value: total, color: 'text-slate-800', dot: 'bg-slate-400' },
        { label: 'Dijadwalkan', value: scheduled, color: 'text-amber-600', dot: 'bg-amber-400' },
        { label: 'Selesai', value: completed, color: 'text-emerald-600', dot: 'bg-emerald-500' },
        { label: 'Dilewati', value: skipped, color: 'text-slate-400', dot: 'bg-slate-300' },
      ].map(({ label, value, color, dot }) => (
        <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dot)} />
          <div>
            <p className={cn('text-xl font-black', color)}>{value}</p>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
          </div>
          {label === 'Selesai' && total > 0 && (
            <span className="ml-auto text-xs font-bold text-emerald-500">{pct}%</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [salesList, setSalesList] = useState<SalesUser[]>([])
  const [areaList, setAreaList] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Date range — month mode
  const [calMonth, setCalMonth] = useState(new Date())

  // Filters (shared between views)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return isoDate(d)
  })
  const [dateTo, setDateTo] = useState(() => {
    const d = endOfMonth(new Date()); return isoDate(d)
  })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ sales_id: '', area_id: '', status: '' })

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Modals
  const [modal, setModal] = useState<'create' | 'edit' | 'import' | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>()

  // Sync calendar month → date range
  useEffect(() => {
    if (viewMode === 'calendar') {
      setDateFrom(isoDate(startOfMonth(calMonth)))
      setDateTo(isoDate(endOfMonth(calMonth)))
    }
  }, [calMonth, viewMode])

  // Load meta
  useEffect(() => {
    Promise.all([
      usersApi.list({ role: 'sales' }).catch(() => ({ data: [] })),
      areasApi.list({}).catch(() => ({ data: [] })),
    ]).then(([uRes, aRes]) => {
      setSalesList(uRes.data || [])
      setAreaList(aRes.data || [])
    })
  }, [])

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const q = new URLSearchParams()
      q.set('date_from', dateFrom)
      q.set('date_to', dateTo)
      if (filters.sales_id) q.set('sales_id', filters.sales_id)
      if (filters.area_id) q.set('area_id', filters.area_id)
      if (filters.status) q.set('status', filters.status)

      const data = await apiFetch(`/api/schedules?${q}`)
      setSchedules(data.data || [])
    } catch { setSchedules([]) }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, filters])

  useEffect(() => { loadSchedules() }, [loadSchedules])

  // Client search
  const displayed = useMemo(() => {
    if (!search) return schedules
    const q = search.toLowerCase()
    return schedules.filter(s =>
      s.store?.name?.toLowerCase().includes(q) ||
      s.store?.code?.toLowerCase().includes(q) ||
      s.sales?.name?.toLowerCase().includes(q) ||
      s.store?.city?.toLowerCase().includes(q)
    )
  }, [schedules, search])

  // Selection
  const handleSelect = (id: number, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }
  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(displayed.map(s => s.ID)) : new Set())
  }

  // Bulk actions
  const bulkStatus = async (status: Schedule['status']) => {
    const ids = Array.from(selected)
    try {
      await apiFetch('/api/schedules/bulk-status', {
        method: 'PUT',
        body: JSON.stringify({ ids, status }),
      })
    } catch (e: any) { alert(e.message) }
    await loadSchedules()
  }

  const bulkDelete = async () => {
    const ids = Array.from(selected)
    if (!confirm(`Hapus ${ids.length} jadwal yang dipilih?`)) return
    try {
      await apiFetch('/api/schedules/bulk-delete', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      })
    } catch (e: any) { alert(e.message) }
    await loadSchedules()
  }

  const deleteSingle = async (s: Schedule) => {
    if (!confirm(`Hapus jadwal "${s.store?.name}"?`)) return
    try {
      await apiFetch(`/api/schedules/${s.ID}`, { method: 'DELETE' })
      await loadSchedules()
    } catch (e: any) { alert(e.message) }
  }

  // Month quick set
  const setThisMonth = () => {
    const d = new Date()
    setCalMonth(d)
    setDateFrom(isoDate(startOfMonth(d)))
    setDateTo(isoDate(endOfMonth(d)))
  }

  const setMonthRange = (m: Date) => {
    setCalMonth(m)
    setDateFrom(isoDate(startOfMonth(m)))
    setDateTo(isoDate(endOfMonth(m)))
  }

  const activeFilterCount = [filters.sales_id, filters.area_id, filters.status].filter(Boolean).length

  return (
    <AppLayout>
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Jadwal Kunjungan</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? 'Memuat...' : `${schedules.length} jadwal`}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filter aktif`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Import */}
            <button
              onClick={() => setModal('import')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            {/* Export */}
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {/* Add */}
            <button
              onClick={() => { setSelectedSchedule(undefined); setModal('create') }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Tambah Jadwal
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {!loading && <StatsBar schedules={schedules} />}

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm font-mono text-slate-700 border-0 bg-transparent focus:outline-none w-32"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-sm font-mono text-slate-700 border-0 bg-transparent focus:outline-none w-32"
            />
            <button onClick={setThisMonth}
              className="text-[11px] font-bold text-blue-600 hover:underline ml-1 whitespace-nowrap">
              Bulan ini
            </button>
          </div>

          {/* Month nav (calendar mode) */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setMonthRange(addMonths(calMonth, -1))}
                className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-sm font-bold text-slate-700 px-2 capitalize">{monthLabel(calMonth)}</span>
              <button onClick={() => setMonthRange(addMonths(calMonth, 1))}
                className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari toko, sales, kota..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={filters.sales_id}
              onChange={e => setFilters(p => ({ ...p, sales_id: e.target.value }))}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Semua Sales</option>
              {salesList.map(s => <option key={s.ID} value={s.ID}>{s.name}</option>)}
            </select>

            <select
              value={filters.area_id}
              onChange={e => setFilters(p => ({ ...p, area_id: e.target.value }))}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Semua Area</option>
              {areaList.map(a => <option key={a.ID} value={a.ID}>{a.name}</option>)}
            </select>

            <select
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Semua Status</option>
              {Object.entries(STATUS_MAP).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
            </select>

            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ sales_id: '', area_id: '', status: '' })}
                className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 ml-auto shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition',
                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <LayoutList className="w-3.5 h-3.5" /> Tabel
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition',
                viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Kalender
            </button>
          </div>

          {/* Refresh */}
          <button onClick={loadSchedules}
            className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition', loading && 'animate-spin opacity-50')}>
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* ── Bulk action bar ── */}
        {selected.size > 0 && (
          <BulkActionBar
            count={selected.size}
            onClose={() => setSelected(new Set())}
            onDelete={bulkDelete}
            onStatus={bulkStatus}
          />
        )}

        {/* ── Content ── */}
        {viewMode === 'table' ? (
          <TableView
            schedules={displayed}
            selected={selected}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onEdit={s => { setSelectedSchedule(s); setModal('edit') }}
            onDelete={deleteSingle}
            loading={loading}
          />
        ) : (
          <CalendarView
            schedules={displayed}
            month={calMonth}
            onMonthChange={setMonthRange}
            onDayClick={date => {
              // Switch to table view filtered by that date
              setDateFrom(date)
              setDateTo(date)
              setViewMode('table')
            }}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {(modal === 'create' || modal === 'edit') && (
        <ScheduleModal
          mode={modal}
          schedule={selectedSchedule}
          salesList={salesList}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); loadSchedules() }}
        />
      )}

      {modal === 'import' && (
        <ImportModal
          salesList={salesList}
          onClose={() => setModal(null)}
          onDone={loadSchedules}
        />
      )}
    </AppLayout>
  )
}