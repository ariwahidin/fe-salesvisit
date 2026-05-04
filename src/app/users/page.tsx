'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { usersApi } from '@/lib/api'
import { Users, Plus, Edit, Trash2, X, Save, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UsersPage() {
  const [users, setUsers]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')
  const [modal, setModal]   = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm]     = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const load = async () => {
    setLoading(true)
    try { const r = await usersApi.list({ role: filterRole || undefined }); setUsers(r.data || []) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterRole])

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', phone: '', role: 'sales' })
    setSelected(null); setError(''); setModal('create')
  }
  const openEdit = (u: any) => {
    setForm({ name: u.name, email: u.email, phone: u.phone, role: u.role, password: '' })
    setSelected(u); setError(''); setModal('edit')
  }

  const save = async () => {
    if (!form.name || !form.email) { setError('Nama dan email wajib diisi'); return }
    if (modal === 'create' && !form.password) { setError('Password wajib untuk user baru'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (modal === 'create') await usersApi.create(payload)
      else await usersApi.update(selected.id, payload)
      setModal(null); load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const deactivate = async (u: any) => {
    if (!confirm(`Nonaktifkan user "${u.name}"?`)) return
    await usersApi.remove(u.id); load()
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-extrabold">Pengguna</h1>
          <button onClick={openCreate} className="btn-brand px-3 py-2 text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        {/* Role filter */}
        <div className="flex gap-2">
          {[['', 'Semua'], ['admin', 'Admin'], ['sales', 'Sales']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterRole(val)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition',
                filterRole === val ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-500')}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-surface-100 rounded-3xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="card p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0',
                  u.role === 'admin' ? 'bg-brand-100' : 'bg-blue-50')}>
                  <User className={cn('w-5 h-5', u.role === 'admin' ? 'text-brand-600' : 'text-blue-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-surface-900 truncate">{u.name}</p>
                    <span className={cn('badge flex-shrink-0',
                      u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700')}>
                      {u.role}
                    </span>
                    {!u.is_active && <span className="badge bg-red-100 text-red-500">Nonaktif</span>}
                  </div>
                  <p className="text-xs text-surface-500 truncate">{u.email}</p>
                  {u.phone && <p className="text-xs text-surface-400">{u.phone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {u.is_active && (
                    <button onClick={() => deactivate(u)} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-4xl sm:rounded-4xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold">{modal === 'create' ? 'Tambah User' : 'Edit User'}</h2>
                <button onClick={() => setModal(null)} className="p-1.5 text-surface-400 hover:bg-surface-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              {error && <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{error}</div>}
              <div className="space-y-3">
                <div>
                  <label className="label">Nama *</label>
                  <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Budi Santoso" className="input" />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="budi@perusahaan.com" className="input" />
                </div>
                <div>
                  <label className="label">Password {modal === 'edit' && <span className="normal-case font-normal">(kosongkan jika tidak diubah)</span>}</label>
                  <input type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••" className="input" />
                </div>
                <div>
                  <label className="label">No. HP</label>
                  <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08123456789" className="input" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={form.role || 'sales'} onChange={e => setForm({ ...form, role: e.target.value })} className="input">
                    <option value="sales">Sales</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button onClick={save} disabled={saving} className="btn-brand w-full py-3 mt-4 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
