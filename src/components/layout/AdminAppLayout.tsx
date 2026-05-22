'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarDays, ClipboardList,
  Store, Package, Users, BarChart2, LogOut, MapPin, User,
  ShoppingCart, ChevronLeft, ChevronRight, Settings, Bell
} from 'lucide-react'
import { OfflineBanner } from '../OfflineBanner'
import { initSyncManager } from '@/lib/sync-manager'

const adminMainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedules', label: 'Jadwal', icon: CalendarDays },
  { href: '/visits', label: 'Kunjungan', icon: ClipboardList },
  { href: '/admin/orders', label: 'Order', icon: ShoppingCart },
  { href: '/reports', label: 'Laporan', icon: BarChart2 },
  { href: '/tracking', label: 'Live Tracking', icon: Bell },
]

const adminSecondaryNav = [
  { href: '/stores', label: 'Store', icon: Store },
  { href: '/products', label: 'Product', icon: Package },
  { href: '/users', label: 'User', icon: Users },
  { href: '/territory', label: 'Orgranization', icon: Settings },
]

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, init } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    init()
    if (!localStorage.getItem('token')) router.replace('/login')
    initSyncManager()
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const handleLogout = () => { logout(); router.replace('/login') }

  return (
    <div className="min-h-screen flex bg-[#fafaf8]">
      <OfflineBanner />

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'h-screen sticky top-0 flex flex-col bg-white border-r border-surface-100 transition-all duration-300 ease-in-out z-40 shadow-[2px_0_12px_rgba(0,0,0,0.04)]',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center border-b border-surface-100 h-16 px-4 shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-extrabold text-surface-900 text-sm tracking-tight leading-tight">SalesVisit</p>
              <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest">Admin</p>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {adminMainNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group relative',
                  active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-surface-500 hover:bg-surface-50 hover:text-surface-800'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0 transition-colors', active ? 'text-brand-500' : 'text-surface-400 group-hover:text-surface-600')} />
                {!collapsed && <span className="truncate">{label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                )}
                {/* Tooltip saat collapsed */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-900 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    {label}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Divider + Secondary nav */}
          <div className={cn('pt-4 pb-1', collapsed ? 'px-0' : 'px-1')}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest px-2 mb-2">Master Data</p>
            )}
            {collapsed && <div className="border-t border-surface-100 mb-2" />}
          </div>

          {adminSecondaryNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group relative',
                  active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-surface-500 hover:bg-surface-50 hover:text-surface-800'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-brand-500' : 'text-surface-400 group-hover:text-surface-600')} />
                {!collapsed && <span className="truncate">{label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                )}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-900 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                    {label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="shrink-0 border-t border-surface-100 p-3 space-y-1">
          <div className={cn('flex items-center gap-2.5 px-2 py-2 rounded-xl', collapsed && 'justify-center')}>
            <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-brand-600" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-surface-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-surface-400 font-medium">Administrator</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Keluar' : undefined}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-semibold text-surface-400 hover:text-red-500 hover:bg-red-50 transition-all group',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Keluar</span>}
            {collapsed && (
              <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-900 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                Keluar
              </span>
            )}
          </button>
        </div>

        {/* Toggle collapse button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-[72px] w-7 h-7 bg-white border border-surface-200 rounded-full flex items-center justify-center shadow-sm text-surface-400 hover:text-brand-500 hover:border-brand-300 hover:shadow-md transition-all z-50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-surface-100 sticky top-0 z-30 flex items-center px-6 gap-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          {/* Page title — bisa di-inject via context, fallback ke breadcrumb pathname */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-surface-800 truncate capitalize">
              {pathname.replace(/^\//, '').replace(/\//g, ' / ') || 'Dashboard'}
            </h1>
            <p className="text-xs text-surface-400 font-medium">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-xl text-surface-400 hover:bg-surface-50 hover:text-surface-700 transition">
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-surface-100" />
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface-50">
              <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-brand-600" />
              </div>
              <span className="text-xs font-semibold text-surface-700 max-w-[120px] truncate">{user?.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">Admin</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}