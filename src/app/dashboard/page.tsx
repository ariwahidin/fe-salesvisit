// 'use client'
// import { useEffect, useState } from 'react'
// import AppLayout from '@/components/layout/AppLayout'
// import { dashboardApi, schedulesApi, formatDateTime, DAY_NAMES } from '@/lib/api'
// import { useAuthStore } from '@/lib/store'
// import { DashboardSummary, Schedule } from '@/types'
// import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
// import { CalendarDays, CheckCircle2, Clock, Users, Store, Package, RefreshCw, ArrowRight, TrendingUp } from 'lucide-react'
// import Link from 'next/link'
// import { cn } from '@/lib/utils'
// import { StatusBadge } from '@/components/StatusBadge'
// import { getSchedules } from '@/lib/offline-cache'
// import { subscribePush, isPushSubscribed } from '@/lib/push'


// export default function DashboardPage() {
//   const { user } = useAuthStore()
//   const isAdmin = user?.role === 'admin'

//   return isAdmin ? <AdminDashboard /> : <SalesDashboard />
// }

// /* ─── Admin Dashboard ──────────────────────────────────────────────────────── */
// function AdminDashboard() {
//   const [data, setData] = useState<DashboardSummary | null>(null)
//   const [loading, setLoading] = useState(true)

//   const load = async () => {
//     setLoading(true)
//     try { setData(await dashboardApi.summary()) }
//     finally { setLoading(false) }
//   }
//   useEffect(() => { load() }, [])

//   const perfData = data?.sales_performance.map(p => ({
//     name: p.sales_name.split(' ')[0],
//     total: p.total,
//     done: p.completed,
//   })) || []

//   return (
//     <AppLayout>
//       <div className="p-4 space-y-4 animate-fade-in">
//         <div className="flex items-center justify-between pt-2">
//           <div>
//             <h1 className="text-xl font-extrabold text-surface-900">Dashboard</h1>
//             <p className="text-surface-500 text-xs mt-0.5">
//               {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
//             </p>
//           </div>
//           <button onClick={load} className="p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
//             <RefreshCw className="w-4 h-4" />
//           </button>
//         </div>

//         {loading ? <LoadingSkeleton /> : data && (
//           <>
//             {/* KPI row */}
//             <div className="grid grid-cols-3 gap-3">
//               <StatCard label="Jadwal Hari Ini" value={data.today_schedules} icon={CalendarDays} color="orange" />
//               <StatCard label="Selesai" value={data.today_completed} icon={CheckCircle2} color="green" />
//               <StatCard label="Belum" value={data.today_pending} icon={Clock} color="amber" />
//             </div>

//             <div className="grid grid-cols-3 gap-3">
//               <StatCard label="Total Sales" value={data.total_sales} icon={Users} color="blue" />
//               <StatCard label="Total Toko" value={data.total_stores} icon={Store} color="purple" />
//               <StatCard label="Produk Aktif" value={data.total_products} icon={Package} color="teal" />
//             </div>

//             {/* Sales performance chart */}
//             {perfData.length > 0 && (
//               <div className="card p-4">
//                 <div className="flex items-center justify-between mb-3">
//                   <h2 className="font-bold text-sm text-surface-800">Performa Sales (Bulan Ini)</h2>
//                   <TrendingUp className="w-4 h-4 text-brand-400" />
//                 </div>
//                 <div className="h-40">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <BarChart data={perfData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
//                       <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
//                       <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
//                       <Tooltip
//                         contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
//                         formatter={(v, n) => [v, n === 'done' ? 'Selesai' : 'Total']}
//                       />
//                       <Bar dataKey="total" fill="#fed7aa" radius={[6, 6, 0, 0]} />
//                       <Bar dataKey="done" fill="#f97316" radius={[6, 6, 0, 0]} />
//                     </BarChart>
//                   </ResponsiveContainer>
//                 </div>
//                 <div className="flex gap-4 mt-1">
//                   <div className="flex items-center gap-1.5 text-xs text-surface-500">
//                     <div className="w-2.5 h-2.5 rounded bg-fed7aa bg-[#fed7aa]" />Total
//                   </div>
//                   <div className="flex items-center gap-1.5 text-xs text-surface-500">
//                     <div className="w-2.5 h-2.5 rounded bg-[#f97316]" />Selesai
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Recent visits */}
//             {data.recent_visits.length > 0 && (
//               <div className="card p-4">
//                 <div className="flex items-center justify-between mb-3">
//                   <h2 className="font-bold text-sm text-surface-800">Kunjungan Terkini</h2>
//                   <Link href="/visits" className="text-xs text-brand-500 font-semibold flex items-center gap-1">
//                     Lihat semua <ArrowRight className="w-3 h-3" />
//                   </Link>
//                 </div>
//                 <div className="space-y-2">
//                   {data.recent_visits.slice(0, 5).map(v => (
//                     <Link key={v.ID} href={`/visits/${v.ID}`}
//                       className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl hover:bg-brand-50 transition">
//                       <div className="flex-1 min-w-0">
//                         <p className="text-sm font-semibold text-surface-800 truncate">{v.store?.name}</p>
//                         <p className="text-xs text-surface-400">{v.sales?.name} · {v.check_in_at ? formatDateTime(v.check_in_at) : '—'}</p>
//                       </div>
//                       <StatusBadge status={v.status} />
//                     </Link>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </AppLayout>
//   )
// }

// /* ─── Sales Dashboard ──────────────────────────────────────────────────────── */
// function SalesDashboard() {
//   const { user } = useAuthStore()
//   const [schedules, setSchedules] = useState<any[]>([])
//   const [loading, setLoading] = useState(true)
//   const [date, setDate] = useState(new Date().toISOString().split('T')[0])

//   const load = async () => {
//     setLoading(true)
//     try {
//       const data = await getSchedules(date)
//       console.log('Loaded schedules:', data)
//       setSchedules(data)
//     } finally {
//       setLoading(false)
//     }
//   }
//   useEffect(() => { load() }, [date])

//   // Subscribe push notification sekali saat pertama masuk dashboard
//   useEffect(() => {
//     const trySubscribe = async () => {
//       const already = await isPushSubscribed()
//       if (!already) await subscribePush()
//     }
//     trySubscribe()
//   }, [])

//   const done = schedules.filter(s => s.status === 'completed').length
//   const pending = schedules.filter(s => s.status !== 'completed').length

//   return (
//     <AppLayout>
//       <div className="p-4 space-y-4 animate-fade-in">
//         {/* Greeting */}
//         <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
//           <p className="text-brand-100 text-xs font-medium">Selamat datang 👋</p>
//           <h1 className="text-xl font-extrabold mt-0.5">{user?.name}</h1>
//           <p className="text-brand-200 text-xs mt-1">
//             {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
//           </p>
//           <div className="flex gap-3 mt-4">
//             <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
//               <p className="text-xl font-extrabold">{done}</p>
//               <p className="text-xs text-brand-100">Selesai</p>
//             </div>
//             <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
//               <p className="text-xl font-extrabold">{pending}</p>
//               <p className="text-xs text-brand-100">Tersisa</p>
//             </div>
//             <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
//               <p className="text-xl font-extrabold">{schedules.length}</p>
//               <p className="text-xs text-brand-100">Total</p>
//             </div>
//           </div>
//         </div>

//         {/* Date picker */}
//         <div className="flex items-center gap-2">
//           <CalendarDays className="w-4 h-4 text-surface-400" />
//           <input type="date" value={date} onChange={e => setDate(e.target.value)}
//             className="text-sm font-semibold text-surface-700 bg-transparent border-0 focus:outline-none" />
//           <button onClick={load} className="ml-auto p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
//             <RefreshCw className="w-3.5 h-3.5" />
//           </button>
//         </div>

//         {/* Schedule cards */}
//         <div>
//           <h2 className="font-bold text-sm text-surface-700 mb-3">Jadwal Kunjungan</h2>
//           {loading ? <LoadingSkeleton /> : schedules.length === 0 ? (
//             <div className="text-center py-12 text-surface-400">
//               <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
//               <p className="font-semibold">Tidak ada jadwal</p>
//               <p className="text-sm">Pilih tanggal lain</p>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {schedules.map((s: any) => (
//                 <SalesScheduleCard key={s.id} schedule={s} onRefresh={load} />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </AppLayout>
//   )
// }

// function SalesScheduleCard({ schedule, onRefresh }: { schedule: any; onRefresh: () => void }) {
//   const visit = schedule.visit
//   const status = schedule.status
//   const done = status === 'completed'
//   const inProg = status === 'in_progress'

//   return (
//     <div className={cn('card p-4 border-l-4', done ? 'border-green-400' : inProg ? 'border-amber-400' : 'border-surface-200')}>
//       <div className="flex items-start justify-between gap-3">
//         <div className="flex-1 min-w-0">
//           <p className="font-bold text-surface-900 truncate">{schedule.store?.name}</p>
//           <p className="text-xs text-surface-500 mt-0.5">{schedule.store?.city} · {schedule.store?.code}</p>
//           {schedule.notes && <p className="text-xs text-surface-400 mt-1 italic">"{schedule.notes}"</p>}
//         </div>
//         <StatusBadge status={status} />
//       </div>

//       {visit && (
//         <div className="mt-3 pt-3 border-t border-surface-100 text-xs text-surface-500 space-y-1">
//           {visit.check_in_at && <p>🟢 Check-in: {formatDateTime(visit.check_in_at)}</p>}
//           {visit.check_out_at && <p>🔴 Check-out: {formatDateTime(visit.check_out_at)}</p>}
//           {visit.stock_counts?.length > 0 && <p>📦 {visit.stock_counts.length} produk dihitung</p>}
//         </div>
//       )}

//       {!done && (
//         <div className="mt-3">
//           {!visit ? (
//             <Link href={`/schedules/${schedule.id}/checkin`}
//               className="btn-brand w-full py-2.5 text-sm flex items-center justify-center gap-1.5">
//               📍 Check-In Sekarang
//             </Link>
//           ) : inProg && (
//             <Link href={`/visits/${visit.id}/checkout`}
//               className="btn-brand w-full py-2.5 text-sm flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600">
//               📦 Input Stok & Check-Out
//             </Link>
//           )}
//         </div>
//       )}

//       {done && visit && (
//         <Link href={`/visits/${visit.id}`}
//           className="mt-3 flex items-center justify-center gap-1 text-xs text-brand-500 font-semibold">
//           Lihat Detail <ArrowRight className="w-3 h-3" />
//         </Link>
//       )}
//     </div>
//   )
// }

// /* ─── Shared Components ────────────────────────────────────────────────────── */
// function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
//   const colors: Record<string, string> = {
//     orange: 'bg-orange-50 text-orange-600',
//     green: 'bg-green-50  text-green-600',
//     amber: 'bg-amber-50  text-amber-600',
//     blue: 'bg-blue-50   text-blue-600',
//     purple: 'bg-purple-50 text-purple-600',
//     teal: 'bg-teal-50   text-teal-600',
//   }
//   return (
//     <div className="card p-3 flex flex-col gap-2">
//       <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', colors[color])}>
//         <Icon className="w-4 h-4" />
//       </div>
//       <div>
//         <p className="text-2xl font-extrabold text-surface-900">{value}</p>
//         <p className="text-xs text-surface-500 leading-tight">{label}</p>
//       </div>
//     </div>
//   )
// }



// function LoadingSkeleton() {
//   return (
//     <div className="space-y-3">
//       {[...Array(3)].map((_, i) => (
//         <div key={i} className="h-24 bg-surface-100 rounded-3xl animate-pulse" />
//       ))}
//     </div>
//   )
// }


'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import {
  dashboardApi, schedulesApi, visitsApi, ordersApi,
  supervisorApi, formatDateTime, DAY_NAMES,
  ForbiddenError
} from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { DashboardSummary } from '@/types'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  CalendarDays, CheckCircle2, Clock, Users, Store, Package,
  RefreshCw, ArrowRight, TrendingUp, ShoppingBag, Shield
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import { getSchedules } from '@/lib/offline-cache'
import { subscribePush, isPushSubscribed } from '@/lib/push'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const role = user?.role

  if (role === 'admin') return <AdminDashboard />
  // if (role === 'supervisor') return <SupervisorDashboard />
  if (role === 'supervisor') return <AdminDashboard />
  return <SalesDashboard />
}

/* ─── Admin Dashboard ──────────────────────────────────────────────────────── */
function AdminDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // const load = async () => {
  //   setLoading(true)
  //   try { setData(await dashboardApi.summary()) }
  //   finally { setLoading(false) }
  // }

  const load = async () => {
    setLoading(true)
    try {
      setData(await dashboardApi.summary())
    } catch (err) {
      if (err instanceof ForbiddenError) {
        router.replace('/access-denied')
      }
      // optional: handle error lain, misal toast
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const perfData = data?.sales_performance.map(p => ({
    name: p.sales_name.split(' ')[0],
    total: p.total,
    done: p.completed,
  })) || []

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-xl font-extrabold text-surface-900">Dashboard</h1>
            <p className="text-surface-500 text-xs mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={load} className="p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? <LoadingSkeleton /> : data && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Jadwal Hari Ini" value={data.today_schedules} icon={CalendarDays} color="orange" />
              <StatCard label="Selesai" value={data.today_completed} icon={CheckCircle2} color="green" />
              <StatCard label="Belum" value={data.today_pending} icon={Clock} color="amber" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Sales" value={data.total_sales} icon={Users} color="blue" />
              <StatCard label="Total Toko" value={data.total_stores} icon={Store} color="purple" />
              <StatCard label="Produk Aktif" value={data.total_products} icon={Package} color="teal" />
            </div>

            {perfData.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-sm text-surface-800">Performa Sales (Bulan Ini)</h2>
                  <TrendingUp className="w-4 h-4 text-brand-400" />
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perfData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                        formatter={(v, n) => [v, n === 'done' ? 'Selesai' : 'Total']}
                      />
                      <Bar dataKey="total" fill="#fed7aa" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="done" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <div className="w-2.5 h-2.5 rounded bg-[#fed7aa]" />Total
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <div className="w-2.5 h-2.5 rounded bg-[#f97316]" />Selesai
                  </div>
                </div>
              </div>
            )}

            {data.recent_visits.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-sm text-surface-800">Kunjungan Terkini</h2>
                  <Link href="/visits" className="text-xs text-brand-500 font-semibold flex items-center gap-1">
                    Lihat semua <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {data.recent_visits.slice(0, 5).map(v => (
                    <Link key={v.ID} href={`/visits/${v.ID}`}
                      className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl hover:bg-brand-50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-800 truncate">{v.store?.name}</p>
                        <p className="text-xs text-surface-400">{v.sales?.name} · {v.check_in_at ? formatDateTime(v.check_in_at) : '—'}</p>
                      </div>
                      <StatusBadge status={v.status} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

/* ─── Supervisor Dashboard ─────────────────────────────────────────────────── */
function SupervisorDashboard() {
  const { user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]

  // Data tim
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [teamVisits, setTeamVisits] = useState<any[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  // Data pribadi (sebagai sales)
  const [mySchedules, setMySchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [teamRes, visitsRes, ordersRes, schedRes] = await Promise.all([
        supervisorApi.myTeam(),
        visitsApi.list({ today: true }),          // backend sudah filter tim
        ordersApi.list({ status: 'submitted' }),  // backend sudah filter tim
        getSchedules(today),                      // jadwal pribadi supervisor
      ])
      setTeamMembers(teamRes.data || [])
      setTeamVisits(visitsRes.data || [])
      setPendingOrders(ordersRes.data || [])
      setMySchedules(schedRes || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Subscribe push notification
  useEffect(() => {
    const trySubscribe = async () => {
      const already = await isPushSubscribed()
      if (!already) await subscribePush()
    }
    trySubscribe()
  }, [])

  // Hitung ringkasan tim
  const teamCompleted = teamVisits.filter(v => v.status === 'completed').length
  const teamCheckedIn = teamVisits.filter(v => v.status === 'checked_in').length
  const teamPending = teamVisits.filter(v => v.status === 'pending').length

  // Performa per anggota tim
  const memberPerf = teamMembers.map(m => {
    const visits = teamVisits.filter(v => v.sales?.id === m.id || v.sales_id === m.id)
    return {
      ...m,
      visitCount: visits.length,
      completed: visits.filter(v => v.status === 'completed').length,
      checkedIn: visits.filter(v => v.status === 'checked_in').length,
    }
  })

  // Ringkasan jadwal pribadi
  const myDone = mySchedules.filter(s => s.status === 'completed').length
  const myPending = mySchedules.filter(s => s.status !== 'completed').length

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-xl font-extrabold text-surface-900">Dashboard</h1>
            <p className="text-surface-500 text-xs mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={load} className="p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? <LoadingSkeleton /> : (
          <>
            {/* ── Greeting card (mirip sales) ── */}
            <div className="card p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-purple-200" />
                <p className="text-purple-200 text-xs font-medium">Supervisor</p>
              </div>
              <h2 className="text-xl font-extrabold">{user?.name}</h2>
              <p className="text-purple-200 text-xs mt-0.5">{teamMembers.length} anggota tim</p>

              {/* Jadwal pribadi hari ini */}
              <div className="flex gap-3 mt-4">
                <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                  <p className="text-xl font-extrabold">{myDone}</p>
                  <p className="text-xs text-purple-100">Selesai</p>
                </div>
                <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                  <p className="text-xl font-extrabold">{myPending}</p>
                  <p className="text-xs text-purple-100">Tersisa</p>
                </div>
                <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                  <p className="text-xl font-extrabold">{mySchedules.length}</p>
                  <p className="text-xs text-purple-100">Total</p>
                </div>
              </div>
            </div>

            {/* ── KPI Tim Hari Ini ── */}
            <div>
              <h2 className="font-bold text-sm text-surface-700 mb-2">Kunjungan Tim Hari Ini</h2>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Selesai" value={teamCompleted} icon={CheckCircle2} color="green" />
                <StatCard label="Berjalan" value={teamCheckedIn} icon={Clock} color="amber" />
                <StatCard label="Belum" value={teamPending} icon={CalendarDays} color="blue" />
              </div>
            </div>

            {/* ── Order perlu persetujuan ── */}
            {pendingOrders.length > 0 && (
              <div className="card p-4 border border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <h2 className="font-bold text-sm text-amber-800">
                      {pendingOrders.length} Order Menunggu Persetujuan
                    </h2>
                  </div>
                  <Link href="/admin/orders" className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                    Tinjau <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {pendingOrders.slice(0, 3).map((o: any) => (
                    <Link key={o.ID} href={`/admin/orders/${o.ID}`}
                      className="flex items-center justify-between p-3 bg-white rounded-2xl hover:bg-amber-50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-800 truncate">{o.store?.name}</p>
                        <p className="text-xs text-surface-400 truncate">{o.sales?.name} · {o.order_no}</p>
                      </div>
                      <span className="text-sm font-extrabold text-brand-700 flex-shrink-0 ml-2">
                        Rp {o.total_amount.toLocaleString('id-ID')}
                      </span>
                    </Link>
                  ))}
                  {pendingOrders.length > 3 && (
                    <p className="text-xs text-amber-600 text-center font-semibold">
                      +{pendingOrders.length - 3} order lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Status per anggota tim ── */}
            {memberPerf.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-sm text-surface-800">Status Tim Hari Ini</h2>
                  <Link href="/visits" className="text-xs text-brand-500 font-semibold flex items-center gap-1">
                    Detail <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {memberPerf.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-extrabold text-blue-600">
                          {m.name?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-800 truncate">{m.name}</p>
                        <p className="text-xs text-surface-400">
                          {m.visitCount === 0
                            ? 'Belum ada kunjungan'
                            : `${m.completed} selesai · ${m.checkedIn} berjalan`}
                        </p>
                      </div>
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        m.checkedIn > 0 ? 'bg-amber-400' :
                          m.completed > 0 ? 'bg-green-400' : 'bg-surface-300'
                      )} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Jadwal pribadi supervisor ── */}
            <div>
              <h2 className="font-bold text-sm text-surface-700 mb-3">Jadwal Saya Hari Ini</h2>
              {mySchedules.length === 0 ? (
                <div className="text-center py-10 text-surface-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Tidak ada jadwal hari ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySchedules.map((s: any) => (
                    <SalesScheduleCard key={s.id} schedule={s} onRefresh={load} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

/* ─── Sales Dashboard ──────────────────────────────────────────────────────── */
function SalesDashboard() {
  const { user } = useAuthStore()
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSchedules(date)
      setSchedules(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [date])

  useEffect(() => {
    const trySubscribe = async () => {
      const already = await isPushSubscribed()
      if (!already) await subscribePush()
    }
    trySubscribe()
  }, [])

  const done = schedules.filter(s => s.status === 'completed').length
  const pending = schedules.filter(s => s.status !== 'completed').length

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
          <p className="text-brand-100 text-xs font-medium">Selamat datang 👋</p>
          <h1 className="text-xl font-extrabold mt-0.5">{user?.name}</h1>
          <p className="text-brand-200 text-xs mt-1">
            {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex gap-3 mt-4">
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-extrabold">{done}</p>
              <p className="text-xs text-brand-100">Selesai</p>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-extrabold">{pending}</p>
              <p className="text-xs text-brand-100">Tersisa</p>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-extrabold">{schedules.length}</p>
              <p className="text-xs text-brand-100">Total</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-surface-400" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm font-semibold text-surface-700 bg-transparent border-0 focus:outline-none" />
          <button onClick={load} className="ml-auto p-2 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <h2 className="font-bold text-sm text-surface-700 mb-3">Jadwal Kunjungan</h2>
          {loading ? <LoadingSkeleton /> : schedules.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Tidak ada jadwal</p>
              <p className="text-sm">Pilih tanggal lain</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s: any) => (
                <SalesScheduleCard key={s.id} schedule={s} onRefresh={load} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

/* ─── Schedule Card (shared Sales + Supervisor) ────────────────────────────── */
function SalesScheduleCard({ schedule, onRefresh }: { schedule: any; onRefresh: () => void }) {
  const visit = schedule.visit
  const status = schedule.status
  const done = status === 'completed'
  const inProg = status === 'in_progress'

  return (
    <div className={cn('card p-4 border-l-4',
      done ? 'border-green-400' : inProg ? 'border-amber-400' : 'border-surface-200')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-surface-900 truncate">{schedule.store?.name}</p>
          <p className="text-xs text-surface-500 mt-0.5">{schedule.store?.city} · {schedule.store?.code}</p>
          {schedule.notes && <p className="text-xs text-surface-400 mt-1 italic">"{schedule.notes}"</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      {visit && (
        <div className="mt-3 pt-3 border-t border-surface-100 text-xs text-surface-500 space-y-1">
          {visit.check_in_at && <p>🟢 Check-in: {formatDateTime(visit.check_in_at)}</p>}
          {visit.check_out_at && <p>🔴 Check-out: {formatDateTime(visit.check_out_at)}</p>}
          {visit.stock_counts?.length > 0 && <p>📦 {visit.stock_counts.length} produk dihitung</p>}
        </div>
      )}

      {!done && (
        <div className="mt-3">
          {!visit ? (
            <Link href={`/schedules/${schedule.id}/checkin`}
              className="btn-brand w-full py-2.5 text-sm flex items-center justify-center gap-1.5">
              📍 Check-In Sekarang
            </Link>
          ) : inProg && (
            <Link href={`/visits/${visit.id}/checkout`}
              className="btn-brand w-full py-2.5 text-sm flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600">
              📦 Input Stok & Check-Out
            </Link>
          )}
        </div>
      )}

      {done && visit && (
        <Link href={`/visits/${visit.id}`}
          className="mt-3 flex items-center justify-center gap-1 text-xs text-brand-500 font-semibold">
          Lihat Detail <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

/* ─── Shared Components ────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any; color: string
}) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50  text-green-600',
    amber: 'bg-amber-50  text-amber-600',
    blue: 'bg-blue-50   text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50   text-teal-600',
  }
  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-surface-900">{value}</p>
        <p className="text-xs text-surface-500 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-surface-100 rounded-3xl animate-pulse" />
      ))}
    </div>
  )
}