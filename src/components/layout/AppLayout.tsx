'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarDays, ClipboardList,
  Store, Package, Users, BarChart2, LogOut, MapPin, User,
  ShoppingCart
} from 'lucide-react'
import { OfflineBanner } from '../OfflineBanner'

import { initSyncManager } from '@/lib/sync-manager'

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedules', label: 'Jadwal', icon: CalendarDays },
  { href: '/visits', label: 'Kunjungan', icon: ClipboardList },
  { href: '/admin/orders', label: 'Order', icon: ShoppingCart },
  { href: '/reports', label: 'Laporan', icon: BarChart2 },
]

const salesNav = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/schedules', label: 'Jadwal', icon: CalendarDays },
  { href: '/visits', label: 'Riwayat', icon: ClipboardList },
  { href: '/my/orders', label: 'Order', icon: ShoppingCart },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, init } = useAuthStore()

  useEffect(() => {
    init()
    if (!localStorage.getItem('token')) router.replace('/login')

    initSyncManager()
  }, [])

  const nav = user?.role === 'admin' ? adminNav : salesNav
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => { logout(); router.replace('/login') }


  return (
    <div className="min-h-screen flex flex-col bg-surface-50">

      <OfflineBanner />

      {/* Header */}
      <header className="bg-white border-b border-surface-100 sticky top-0 z-30 shadow-card">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-surface-900 text-sm tracking-tight">SalesVisit</span>
              {user?.role && (
                <span className={cn(
                  'ml-2 text-xs font-bold px-2 py-0.5 rounded-full',
                  isAdmin ? 'bg-brand-100 text-brand-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {isAdmin ? 'Admin' : 'Sales'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-1">
                {[
                  { href: '/stores', label: 'Toko', icon: Store },
                  { href: '/products', label: 'Produk', icon: Package },
                  { href: '/users', label: 'User', icon: Users },
                ].map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition',
                      pathname.startsWith(href)
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-surface-500 hover:bg-surface-100'
                    )}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-surface-100 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-surface-500" />
              </div>
              <span className="hidden sm:block text-xs font-semibold text-surface-700 max-w-[80px] truncate">{user?.name}</span>
              <button onClick={handleLogout}
                className="ml-1 p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full content-pb">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-surface-100 z-30 shadow-up">
        <div className="max-w-2xl mx-auto px-4 bottom-safe">
          <div className="flex items-center justify-around py-2">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all min-w-[60px]',
                    active
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-surface-400 hover:text-surface-600'
                  )}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
