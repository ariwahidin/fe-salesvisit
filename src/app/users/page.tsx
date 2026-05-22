'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { usersApi, supervisorApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  Users, Plus, Edit, UserX, X, Save, Loader2, User,
  ChevronDown, Search, RefreshCw, Shield, Building2,
  Mail, Phone, Check, UserCheck, UserMinus, ChevronRight,
  MoreHorizontal, KeyRound, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserModel {
  ID: number
  name: string
  email: string
  phone?: string
  role: string
  is_active: boolean
  is_super_admin: boolean
}

interface Company {
  ID: number
  name: string
  code: string
  is_active: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ROLES = ['company_admin', 'rtm_staff', 'regional_manager', 'supervisor', 'sales'] as const
type Role = typeof VALID_ROLES[number]

const ROLE_META: Record<string, { label: string; short: string; badge: string; avatar: string; dot: string }> = {
  company_admin:    { label: 'Company Admin',    short: 'Admin',      badge: 'bg-blue-100 text-blue-700',    avatar: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  rtm_staff:        { label: 'RTM Staff',         short: 'RTM',        badge: 'bg-teal-100 text-teal-700',    avatar: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-400' },
  regional_manager: { label: 'Regional Manager',  short: 'Regional',   badge: 'bg-amber-100 text-amber-700',  avatar: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  supervisor:       { label: 'Supervisor',         short: 'SPV',        badge: 'bg-violet-100 text-violet-700', avatar: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  sales:            { label: 'Sales',              short: 'Sales',      badge: 'bg-slate-100 text-slate-600',  avatar: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
}

const ROLE_TABS = [
  { value: '', label: 'Semua' },
  { value: 'company_admin', label: 'Admin' },
  { value: 'rtm_staff', label: 'RTM' },
  { value: 'regional_manager', label: 'Regional' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'sales', label: 'Sales' },
]

// ─── Access control ───────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['company_admin', 'rtm_staff', 'supervisor']
const isAdminRole  = (r?: string) => r === 'company_admin' || r === 'rtm_staff'
const isSuperRole  = (r?: string) => r === 'supervisor'
const canEditRole  = (r?: string) => r === 'company_admin'
const canCreate    = (r?: string) => r === 'company_admin' || r === 'rtm_staff'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

const API = process.env.NEXT_PUBLIC_API_URL || ''
function apiToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') : null }
async function apiFetch(path: string, opts: RequestInit = {}) {
  const t = apiToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...opts.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, role, size = 'md' }: { name: string; role: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = ROLE_META[role] ?? ROLE_META.sales
  const cls = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' }[size]
  return (
    <div className={cn(cls, 'rounded-xl flex items-center justify-center font-bold flex-shrink-0', meta.avatar)}>
      {initials(name)}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.sales
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold', meta.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {meta.short}
    </span>
  )
}

function StatusPill({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Aktif</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-300" />Nonaktif</span>
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition',
        checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 hover:border-slate-400'
      )}
    >
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    </button>
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

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 transition"

// ─── User Form Modal ──────────────────────────────────────────────────────────

function UserModal({
  mode, user, companies, myRole, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  user?: UserModel
  companies: Company[]
  myRole?: string
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    phone: user?.phone ?? '',
    role: user?.role ?? 'sales',
    is_active: user?.is_active ?? true,
    company_id: '',   // will be set from context or chosen
  })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Nama dan email wajib diisi'); return }
    if (mode === 'create' && !form.password) { setError('Password wajib untuk user baru'); return }
    setSaving(true); setError('')
    try {
      const payload: any = { name: form.name, phone: form.phone, role: form.role }
      if (form.password) payload.password = form.password
      if (mode === 'create') {
        payload.email = form.email
        if (form.company_id) payload.company_id = Number(form.company_id)
        await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        if (canEditRole(myRole)) payload.is_active = form.is_active
        if (form.company_id) payload.company_id = Number(form.company_id)
        await apiFetch(`/api/users/${user!.ID}`, { method: 'PUT', body: JSON.stringify(payload) })
      }
      onSave()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">{mode === 'create' ? 'Tambah Pengguna' : 'Edit Pengguna'}</h2>
            {user && <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{error}</div>
          )}

          {/* Name + Email row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nama" required>
              <input value={form.name} onChange={f('name')} placeholder="Budi Santoso" className={inputCls} />
            </Field>
            <Field label="Email" required>
              <input
                type="email" value={form.email} onChange={f('email')}
                placeholder="budi@perusahaan.com" className={inputCls}
                disabled={mode === 'edit'}
              />
            </Field>
          </div>

          {/* Password */}
          <Field label={mode === 'edit' ? 'Password (kosongkan jika tidak diubah)' : 'Password'} required={mode === 'create'}>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password} onChange={f('password')}
                placeholder="••••••••" className={cn(inputCls, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {/* Phone */}
          <Field label="No. HP">
            <input value={form.phone} onChange={f('phone')} placeholder="08123456789" className={inputCls} />
          </Field>

          {/* Role + Company row */}
          <div className="grid grid-cols-2 gap-4">
            {canEditRole(myRole) ? (
              <Field label="Role">
                <select value={form.role} onChange={f('role')} className={inputCls}>
                  <option value="sales">Sales</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="regional_manager">Regional Manager</option>
                  <option value="rtm_staff">RTM Staff</option>
                  <option value="company_admin">Company Admin</option>
                </select>
              </Field>
            ) : (
              <Field label="Role">
                <div className={cn(inputCls, 'text-slate-400 cursor-not-allowed')}>
                  {ROLE_META[form.role]?.label ?? form.role}
                </div>
              </Field>
            )}

            <Field label="Company">
              <select value={form.company_id} onChange={f('company_id')} className={inputCls}>
                <option value="">— Pilih company —</option>
                {companies.filter(c => c.is_active).map(c => (
                  <option key={c.ID} value={c.ID}>{c.name} ({c.code})</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Status (edit only, admin only) */}
          {mode === 'edit' && canEditRole(myRole) && (
            <Field label="Status">
              <div className="flex gap-2">
                {[{ v: true, label: 'Aktif', cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                  { v: false, label: 'Nonaktif', cls: 'bg-red-50 border-red-300 text-red-500' }].map(({ v, label, cls }) => (
                  <button
                    key={String(v)}
                    onClick={() => setForm(p => ({ ...p, is_active: v }))}
                    className={cn(
                      'flex-1 py-2 text-xs font-bold rounded-xl border-2 transition',
                      form.is_active === v ? cls : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : mode === 'create' ? 'Buat Pengguna' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Team Modal ───────────────────────────────────────────────────────────────

function TeamModal({ supervisor, allSales, onClose, onSave }: {
  supervisor: UserModel
  allSales: UserModel[]
  onClose: () => void
  onSave: () => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supervisorApi.getTeam(supervisor.ID)
      .then(r => setSelected((r.data ?? []).map((s: UserModel) => s.ID)))
      .finally(() => setLoading(false))
  }, [supervisor.ID])

  const filtered = useMemo(() =>
    allSales.filter(s => s.is_active && (!search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )), [allSales, search])

  const toggle = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await supervisorApi.setTeam(supervisor.ID, selected)
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Atur Tim Supervisor</h2>
              <p className="text-xs text-slate-400 mt-0.5">{supervisor.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari sales..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Tidak ada sales</p>
          ) : filtered.map(s => {
            const checked = selected.includes(s.ID)
            return (
              <button key={s.ID} onClick={() => toggle(s.ID)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition',
                  checked ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'
                )}>
                <Checkbox checked={checked} onChange={() => toggle(s.ID)} />
                <Avatar name={s.name} role="sales" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.email}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">{selected.length} sales dipilih</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-[2] py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Tim'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: me } = useAuthStore()
  const myRole = (me as any)?.role as string | undefined

  // Access guard
  const isAdmin      = isAdminRole(myRole)
  const isSupervisor = isSuperRole(myRole)
  const allowed      = isAdmin || isSupervisor
  const canAdd       = canCreate(myRole)
  const canRoleEdit  = canEditRole(myRole)

  // Data
  const [users, setUsers]           = useState<UserModel[]>([])
  const [companies, setCompanies]   = useState<Company[]>([])
  const [supervisors, setSupervisors] = useState<UserModel[]>([])
  const [allSales, setAllSales]     = useState<UserModel[]>([])
  const [loading, setLoading]       = useState(true)

  // Filters
  const [filterRole, setFilterRole]     = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterCompany, setFilterCompany] = useState('')
  const [search, setSearch]             = useState('')

  // Supervisor accordion
  const [expandedSup, setExpandedSup]   = useState<number | null>(null)
  const [supTeams, setSupTeams]         = useState<Record<number, UserModel[]>>({})
  const [loadingTeam, setLoadingTeam]   = useState<number | null>(null)

  // Modals
  const [modal, setModal]           = useState<'create' | 'edit' | 'team' | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserModel | undefined>()
  const [teamSup, setTeamSup]       = useState<UserModel | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true)
    try {
      const [usersRes, companiesRes] = await Promise.all([
        isSupervisor
          ? supervisorApi.myTeamUsers()
          : usersApi.list({ role: filterRole || undefined }),
        apiFetch('/api/super/companies').catch(() => ({ data: [] })),
      ])

      setUsers(usersRes.data ?? [])
      setCompanies(companiesRes.data ?? [])

      if (isAdmin) {
        const [supRes, salesRes] = await Promise.all([
          supervisorApi.getSupervisors().catch(() => ({ data: [] })),
          usersApi.list({ role: 'sales' }).catch(() => ({ data: [] })),
        ])
        setSupervisors(supRes.data ?? [])
        setAllSales(salesRes.data ?? [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { if (allowed) load() }, [filterRole])

  // ── Client-side filter ────────────────────────────────────────────────────

  const filtered = useMemo(() => users.filter(u => {
    if (filterStatus === 'active' && !u.is_active) return false
    if (filterStatus === 'inactive' && u.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    return true
  }), [users, filterStatus, search])

  const stats = useMemo(() => ({
    total:      users.length,
    active:     users.filter(u => u.is_active).length,
    supervisors: users.filter(u => u.role === 'supervisor').length,
    sales:      users.filter(u => u.role === 'sales').length,
  }), [users])

  // ── Accordion ─────────────────────────────────────────────────────────────

  const toggleAccordion = async (supId: number) => {
    if (expandedSup === supId) { setExpandedSup(null); return }
    setExpandedSup(supId)
    if (supTeams[supId]) return
    setLoadingTeam(supId)
    try {
      const r = await supervisorApi.getTeam(supId)
      setSupTeams(prev => ({ ...prev, [supId]: r.data ?? [] }))
    } finally { setLoadingTeam(null) }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => { setSelectedUser(undefined); setModal('create') }
  const openEdit   = (u: UserModel) => { setSelectedUser(u); setModal('edit') }

  const deactivate = async (u: UserModel) => {
    if (!confirm(`Nonaktifkan "${u.name}"?`)) return
    await apiFetch(`/api/users/${u.ID}`, { method: 'DELETE' })
    load()
  }

  const openTeam = (sup: UserModel) => { setTeamSup(sup); setModal('team') }

  // ── Not allowed ───────────────────────────────────────────────────────────

  if (!allowed) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-500">Akses Ditolak</p>
            <p className="text-xs mt-1">Halaman ini hanya untuk Admin, RTM, dan Supervisor</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isSupervisor ? 'Tim Saya' : 'Pengguna'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isSupervisor ? 'Anggota tim yang Anda kelola' : 'Kelola akun dan hak akses pengguna'}
            </p>
          </div>
          {canAdd && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition">
              <Plus className="w-4 h-4" /> Tambah Pengguna
            </button>
          )}
        </div>

        {/* ── Stats ── */}
        {isAdmin && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total Pengguna" value={stats.total} color="bg-slate-300" />
            <StatCard label="Aktif" value={stats.active} sub={`${stats.total - stats.active} nonaktif`} color="bg-emerald-400" />
            <StatCard label="Supervisor" value={stats.supervisors} color="bg-violet-400" />
            <StatCard label="Sales" value={stats.sales} color="bg-blue-400" />
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Company filter */}
          {isAdmin && companies.length > 0 && (
            <select
              value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Semua Company</option>
              {companies.map(c => <option key={c.ID} value={c.ID}>{c.name}</option>)}
            </select>
          )}

          {/* Status */}
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {/* Refresh */}
          <button onClick={load}
            className={cn('p-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition', loading && 'opacity-50 pointer-events-none')}>
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>

        {/* ── Role tabs ── */}
        {isAdmin && (
          <div className="flex gap-1.5">
            {ROLE_TABS.map(({ value, label }) => (
              <button key={value} onClick={() => setFilterRole(value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border',
                  filterRole === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                )}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Supervisor accordion (when tab = supervisor) ── */}
        {isAdmin && filterRole === 'supervisor' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supervisor & Tim</span>
              <span className="text-xs text-slate-400">{supervisors.length} supervisor</span>
            </div>

            {supervisors.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Belum ada supervisor</p>
              </div>
            ) : supervisors.map((sup, i) => {
              const isOpen = expandedSup === sup.ID
              const team = supTeams[sup.ID]

              return (
                <div key={sup.ID} className={cn(i > 0 && 'border-t border-slate-100')}>
                  {/* Supervisor row */}
                  <div
                    onClick={() => toggleAccordion(sup.ID)}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition group"
                  >
                    <Avatar name={sup.name} role="supervisor" />
                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_160px_120px] gap-4 items-center">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{sup.name}</p>
                        <p className="text-xs text-slate-400 truncate">{sup.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sup.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill active={sup.is_active} />
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-medium">
                          {team ? `${team.length} anggota` : '?'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openTeam(sup) }}
                        className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition">
                        Atur Tim
                      </button>
                      <button onClick={e => { e.stopPropagation(); openEdit(sup) }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                    </div>
                  </div>

                  {/* Expanded: team grid */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                      {loadingTeam === sup.ID ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                      ) : !team || team.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">Belum ada anggota tim</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {team.map(m => (
                            <div key={m.ID}
                              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                              <Avatar name={m.name} role="sales" size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Main Table ── */}
        {(!isAdmin || filterRole !== 'supervisor') && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Table head */}
            <div className="border-b border-slate-100">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[280px]">Pengguna</th>
                    <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[200px]">Company</th>
                    <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[120px]">Role</th>
                    <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[100px]">Status</th>
                    <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kontak</th>
                    <th className="w-20 px-3 py-3" />
                  </tr>
                </thead>
              </table>
            </div>

            {/* Table body */}
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse w-40" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-56" />
                    </div>
                    <div className="h-5 bg-slate-100 rounded animate-pulse w-16" />
                    <div className="h-5 bg-slate-100 rounded animate-pulse w-12" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-slate-500 text-sm">Tidak ada pengguna</p>
                <p className="text-xs mt-1">Coba ubah filter atau pencarian</p>
              </div>
            ) : (
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(u => (
                    <tr key={u.ID}
                      className={cn(
                        'group hover:bg-slate-50 transition-colors',
                        !u.is_active && 'opacity-50'
                      )}>
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} role={u.role} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Company — placeholder, enriched if API returns it */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {(u as any).company?.name ?? (u as any).company_name ?? '—'}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <StatusPill active={u.is_active} />
                      </td>

                      {/* Phone */}
                      <td className="px-3 py-3.5 text-xs text-slate-400">
                        {u.phone
                          ? <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{u.phone}</span>
                          : <span className="italic">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {u.is_active && (isAdmin || isSupervisor) && (
                            <button onClick={() => deactivate(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Nonaktifkan">
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Footer count */}
            {!loading && filtered.length > 0 && (
              <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
                <span className="text-xs text-slate-400">{filtered.length} pengguna</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {(modal === 'create' || modal === 'edit') && (
        <UserModal
          mode={modal}
          user={selectedUser}
          companies={companies}
          myRole={myRole}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}

      {modal === 'team' && teamSup && (
        <TeamModal
          supervisor={teamSup}
          allSales={allSales}
          onClose={() => setModal(null)}
          onSave={() => {
            setSupTeams(prev => { const n = { ...prev }; delete n[teamSup.ID]; return n })
            setModal(null)
            load()
          }}
        />
      )}
    </AppLayout>
  )
}