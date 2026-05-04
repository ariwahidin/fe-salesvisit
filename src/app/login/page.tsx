'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Eye, EyeOff, Loader2, MapPin } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      setAuth(res.user, res.token)
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      {/* Top band */}
      <div className="bg-brand-500 px-6 pt-16 pb-20 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-brand-400/40" />
        <div className="absolute top-8 -right-4 w-24 h-24 rounded-full bg-brand-600/30" />
        <div className="relative">
          <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">SalesVisit</h1>
          <p className="text-brand-200 text-sm mt-1 font-medium">Sales Visit & Stock Count</p>
        </div>
      </div>

      {/* Form card — overlaps the band */}
      <div className="flex-1 px-5 -mt-8 relative z-10">
        <div className="bg-white rounded-4xl shadow-card p-7">
          <h2 className="text-xl font-bold text-surface-900 mb-1">Masuk</h2>
          <p className="text-surface-500 text-sm mb-6">Gunakan akun yang diberikan admin</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com" required className="input"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required className="input pr-12"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-brand w-full py-3.5 flex items-center justify-center gap-2 mt-2 text-sm">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>

          {/* Demo creds */}
          <div className="mt-5 p-4 bg-surface-50 rounded-2xl">
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-2">Demo</p>
            <div className="space-y-1 text-xs text-surface-600">
              <div className="flex justify-between">
                <span className="font-semibold">Admin:</span>
                <span className="font-mono">admin@salesvisit.id / admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Sales:</span>
                <span className="font-mono">budi@salesvisit.id / sales123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
