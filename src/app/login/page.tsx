'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, Loader2, MapPin,
  ArrowRight, Map, ShoppingCart, ClipboardCheck,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

// ─────────────────────────────────────────────
// Palette
//   Page bg     : #FFF7ED  (orange-50)
//   Primary     : #F97316  (orange-500)
//   Primary hov : #EA6A0A  (orange-600)
//   Focus ring  : rgba(249,115,22,0.12)
// ─────────────────────────────────────────────

const DEMO_CREDS = [
  { role: 'Admin', email: 'admin@salesvisit.id', password: 'admin123' },
  { role: 'Sales', email: 'budi@salesvisit.id',  password: 'sales123' },
]

// ── SVG background — FMCG route map ──────────────────────────────────────
function FmcgBackground() {
  const nodes: [number, number][] = [
    [80, 200], [680, 300], [1300, 320],
    [40, 580], [640, 640], [1380, 680],
  ]
  const pulseNodes: [number, number, string][] = [
    [680, 300, '3s'],
    [640, 640, '3.5s'],
  ]
  const barcodeOffsets = [0, 4, 7, 12, 15, 19, 22]

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1440 900"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="fmcg-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="#F97316" opacity="0.13" />
        </pattern>
      </defs>

      {/* Dot grid */}
      <rect width="1440" height="900" fill="url(#fmcg-dots)" />

      {/* Animated route lines */}
      <g stroke="#F97316" strokeOpacity="0.18" fill="none" strokeDasharray="8 6">
        {[
          { d: 'M 80 200 Q 400 100 680 300 Q 900 460 1300 320', dur: '4s' },
          { d: 'M 40 580 Q 350 480 640 640 Q 900 780 1380 680', dur: '5s' },
          { d: 'M 100 800 Q 400 740 780 820 Q 1060 870 1400 800', dur: '6s', opacity: 0.7 },
          { d: 'M 1200 60 Q 1280 300 1240 560 Q 1210 720 1300 880', dur: '4.5s' },
          { d: 'M 140 40 Q 180 260 120 480 Q 80 640 160 840', dur: '5.5s' },
        ].map(({ d, dur, opacity }, i) => (
          <path key={i} d={d} strokeWidth="1.2" opacity={opacity ?? 1}>
            <animate attributeName="strokeDashoffset" from="0" to="-84" dur={dur} repeatCount="indefinite" />
          </path>
        ))}
      </g>

      {/* Static nodes */}
      {nodes.map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx},${cy})`}>
          <circle cx="0" cy="0" r="6" fill="#F97316" opacity="0.22" />
          <circle cx="0" cy="0" r="3" fill="#F97316" opacity="0.6" />
        </g>
      ))}

      {/* Pulsing rings */}
      {pulseNodes.map(([cx, cy, dur], i) => (
        <circle key={i} cx={cx} cy={cy} r="10" fill="none" stroke="#F97316" strokeWidth="1" opacity="0.3">
          <animate attributeName="r"       values="8;18;8"    dur={dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur={dur} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Barcode — top-right */}
      <g transform="translate(1340,40)" opacity="0.09">
        {barcodeOffsets.map((x, i) => (
          <rect key={i} x={x} y="0" width={i % 2 === 0 ? 2 : 1} height="22" fill="#F97316" />
        ))}
      </g>

      {/* Barcode — bottom-left */}
      <g transform="translate(60,855)" opacity="0.08">
        {barcodeOffsets.map((x, i) => (
          <rect key={i} x={x} y="0" width={i % 2 === 0 ? 2 : 1} height="22" fill="#F97316" />
        ))}
      </g>

      {/* Box icon — top-left */}
      <g transform="translate(60,52)" opacity="0.1" stroke="#F97316" strokeWidth="1.5" fill="none">
        <rect x="0" y="8" width="28" height="22" rx="2" />
        <line x1="0"  y1="14" x2="28" y2="14" />
        <line x1="14" y1="8"  x2="14" y2="30" />
        <path d="M6 8 L6 0 L22 0 L22 8" />
      </g>

      {/* Truck icon — bottom-right */}
      <g transform="translate(1340,832)" opacity="0.1" stroke="#F97316" strokeWidth="1.5" fill="none">
        <rect x="0" y="4" width="24" height="18" rx="2" />
        <path d="M24 9 L33 9 L37 16 L37 22 L24 22" />
        <circle cx="8"  cy="24" r="3" />
        <circle cx="29" cy="24" r="3" />
      </g>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      setAuth(res.user, res.token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
    setError('')
  }

  return (
    <div className="relative min-h-screen bg-orange-50 flex items-center justify-center px-4 py-10 overflow-hidden">

      {/* FMCG SVG background */}
      <FmcgBackground />

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-3xl flex rounded-2xl overflow-hidden shadow-xl shadow-orange-100/80 border border-orange-100">

        {/* LEFT PANEL — hidden on mobile */}
        <aside className="hidden md:flex flex-col justify-between bg-[#F97316] w-[42%] flex-shrink-0 p-9 relative overflow-hidden">
          {/* Decorative circles */}
          <span className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-white/[0.08]" aria-hidden />
          <span className="absolute -top-5  -right-5  w-32 h-32 rounded-full bg-white/[0.06]" aria-hidden />
          <span className="absolute -bottom-14 -left-14 w-52 h-52 rounded-full bg-white/[0.06]" aria-hidden />

          <div className="relative z-10">
            {/* Brand mark */}
            <div className="w-9 h-9 rounded-[10px] bg-white/[0.2] flex items-center justify-center mb-4">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight mb-1">SalesVisit</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-7">
              Sales Visit &amp; Stock Count
            </p>

            {/* Feature list */}
            <ul className="space-y-3">
              {[
                { icon: <Map            className="w-[11px] h-[11px] text-white" />, label: 'Kunjungan & check-in otomatis berbasis GPS' },
                { icon: <ShoppingCart   className="w-[11px] h-[11px] text-white" />, label: 'Order taking dengan generate PDF instan'   },
                { icon: <ClipboardCheck className="w-[11px] h-[11px] text-white" />, label: 'Stock count & approval workflow'            },
              ].map(({ icon, label }) => (
                <li key={label} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-white/[0.18] flex items-center justify-center flex-shrink-0 mt-px">
                    {icon}
                  </span>
                  <span className="text-[12px] text-white/75 leading-snug">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="relative z-10 pt-5 border-t border-white/[0.15] flex">
            {[
              { n: '—', label: 'Kunjungan hari ini' },
              { n: '—', label: 'Order aktif'        },
            ].map(({ n, label }, i) => (
              <div key={label} className={`flex-1 ${i > 0 ? 'border-l border-white/[0.15] pl-3.5' : ''}`}>
                <p className="text-[17px] font-semibold text-white">{n}</p>
                <p className="text-[10px] text-white/45 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT PANEL — form */}
        <main className="flex-1 bg-white px-8 py-9 sm:px-10 flex flex-col justify-center">

          {/* Mobile brand mark */}
          <div className="flex items-center gap-2 mb-7 md:hidden">
            <div className="w-7 h-7 rounded-md bg-[#F97316] flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">SalesVisit</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <p className="
              text-[10px] uppercase tracking-[0.1em] text-gray-400 font-medium mb-2
              flex items-center gap-2
              after:content-[''] after:flex-1 after:h-px after:bg-gray-100
            ">
              Autentikasi akun
            </p>
            <h2 className="text-[21px] font-semibold text-gray-900 tracking-tight mb-1">
              Selamat datang
            </h2>
            <p className="text-[13px] text-gray-400">
              Masuk menggunakan akun yang diberikan administrator
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-[13px] flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[10px] font-semibold text-gray-400 uppercase tracking-[0.07em]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                required
                autoComplete="email"
                className="
                  w-full h-[39px] px-3 text-[13px] rounded-lg
                  bg-gray-50 border border-gray-200 text-gray-900
                  placeholder:text-gray-300 outline-none
                  focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10
                  transition-all duration-150
                "
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[10px] font-semibold text-gray-400 uppercase tracking-[0.07em]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="
                    w-full h-[39px] px-3 pr-10 text-[13px] rounded-lg
                    bg-gray-50 border border-gray-200 text-gray-900
                    placeholder:text-gray-300 outline-none
                    focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10
                    transition-all duration-150
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full h-[40px] mt-1 rounded-lg
                bg-[#F97316] hover:bg-[#EA6A0A] active:scale-[0.99]
                text-white text-[14px] font-semibold
                flex items-center justify-center gap-2
                shadow-sm shadow-orange-200
                transition-all duration-150
                disabled:opacity-55 disabled:cursor-not-allowed
              "
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</>
                : <><ArrowRight className="w-4 h-4" /> Masuk</>
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 rounded-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300">
                Demo credentials
              </p>
            </div>
            {DEMO_CREDS.map(({ role, email: e, password: p }) => (
              <div
                key={role}
                className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-50 last:border-0"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-orange-50 text-orange-700 flex-shrink-0">
                  {role}
                </span>
                <span className="flex-1 text-[11px] font-mono text-gray-400 truncate">{e}</span>
                <button
                  type="button"
                  onClick={() => fillDemo(e, p)}
                  className="text-[11px] font-semibold text-[#F97316] hover:text-[#EA6A0A] transition-colors flex-shrink-0"
                >
                  Gunakan
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}