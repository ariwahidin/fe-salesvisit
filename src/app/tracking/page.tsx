'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import AppLayout from '@/components/layout/AppLayout'
import {
  RefreshCw, Users, Navigation, Clock,
  Radio, ChevronRight, Loader2, Signal
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Leaflet dynamic import (no SSR) ─────────────────────────────────────────
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false })
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false })
const Popup        = dynamic(() => import('react-leaflet').then(m => m.Popup),        { ssr: false })
const Polyline     = dynamic(() => import('react-leaflet').then(m => m.Polyline),     { ssr: false })

// MapController di-dynamic juga agar useMap hanya jalan di client
const MapController = dynamic(() => Promise.resolve(MapControllerInner), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveLocation {
  user_id: number
  user_name: string
  lat: number
  lng: number
  accuracy: number
  created_at: string
}
interface TrailPoint {
  lat: number
  lng: number
  created_at: string
}
interface TrailResponse {
  user_id: string
  date: string
  total: number
  total_raw: number
  trail: TrailPoint[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || ''

function apiToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

async function apiFetch(path: string) {
  const t = apiToken()
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function fmt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  // zero value dari Go: 0001-01-01
  if (d.getFullYear() <= 1) return '—'
  return d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDateStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function secondsAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}d lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`
  return `${Math.floor(diff / 3600)}j lalu`
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]
function salesColor(userId: number) {
  return COLORS[userId % COLORS.length]
}

// ─── Custom marker icon ───────────────────────────────────────────────────────
function useLeafletIcon(color: string, label: string) {
  const [icon, setIcon] = useState<any>(null)
  useEffect(() => {
    import('leaflet').then(L => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="18" y="23" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="sans-serif">${label.slice(0, 2).toUpperCase()}</text>
        <polygon points="12,30 24,30 18,44" fill="${color}"/>
      </svg>`
      setIcon(L.divIcon({
        html: svg,
        className: '',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      }))
    })
  }, [color, label])
  return icon
}

// ─── Sales Marker ─────────────────────────────────────────────────────────────
function SalesMarker({ loc, isSelected, onClick }: {
  loc: LiveLocation
  isSelected: boolean
  onClick: () => void
}) {
  const color = salesColor(loc.user_id)
  const icon  = useLeafletIcon(color, loc.user_name)
  if (!icon) return null
  return (
    <Marker position={[loc.lat, loc.lng]} icon={icon} eventHandlers={{ click: onClick }}>
      <Popup>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{loc.user_name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(loc.created_at)}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</div>
      </Popup>
    </Marker>
  )
}

// ─── Map Controller (client-only, pakai useMap) ───────────────────────────────
function MapControllerInner({ selectedUser, selectedLoc }: {
  selectedUser: number | null
  selectedLoc: LiveLocation | undefined
}) {
  // useMap di-import lazily agar tidak crash SSR
  const { useMap } = require('react-leaflet')
  const map         = useMap()
  const prevSelected = useRef<number | null>(null)

  useEffect(() => {
    // flyTo HANYA saat selectedUser berubah, bukan saat data refresh
    if (selectedUser !== null && selectedLoc && prevSelected.current !== selectedUser) {
      map.flyTo([selectedLoc.lat, selectedLoc.lng], 15, { duration: 1 })
    }
    prevSelected.current = selectedUser
  }, [selectedUser]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const [locations,    setLocations]    = useState<LiveLocation[]>([])
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [trail,        setTrail]        = useState<TrailPoint[]>([])
  const [trailLoading, setTrailLoading] = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [refreshLabel, setRefreshLabel] = useState('')
  const [date,         setDate]         = useState('')   // init kosong, diisi di client
  const [mapReady,     setMapReady]     = useState(false)

  const intervalRef    = useRef<NodeJS.Timeout | null>(null)
  const latestDateRef  = useRef('')   // untuk stale-check race condition

  // Set date hanya di client (hindari server/client mismatch)
  useEffect(() => {
    const today = fmtDateStr(new Date())
    setDate(today)
    latestDateRef.current = today
  }, [])

  // Fix Leaflet default icon
  useEffect(() => {
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      setMapReady(true)
    })
  }, [])

  // ── Load live locations ──
  const loadLocations = useCallback(async (targetDate: string) => {
    if (!targetDate) return
    try {
      const res = await apiFetch(`/api/location/live?date=${targetDate}`)
      // Buang hasil kalau sudah stale (user ganti tanggal lagi)
      if (latestDateRef.current !== targetDate) return
      setLocations(res.data ?? [])
      setRefreshLabel(fmt(new Date().toISOString()))
    } catch {
      if (latestDateRef.current !== targetDate) return
      setLocations([])
    } finally {
      if (latestDateRef.current === targetDate) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!date) return
    setLoading(true)
    loadLocations(date)
    intervalRef.current = setInterval(() => loadLocations(date), 10_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [date, loadLocations])

  // ── Load trail — jalan saat selectedUser ATAU date berubah ──
  useEffect(() => {
    if (selectedUser === null || !date) { setTrail([]); return }
    const targetDate = date
    const targetUser = selectedUser
    setTrailLoading(true)
    apiFetch(`/api/location/trail/${targetUser}?date=${targetDate}`)
      .then((res: TrailResponse) => {
        // Buang kalau sudah stale
        if (latestDateRef.current !== targetDate || selectedUser !== targetUser) return
        setTrail(res.trail ?? [])
      })
      .catch(() => setTrail([]))
      .finally(() => setTrailLoading(false))
  }, [selectedUser, date]) // ← kedua dependency — trail reload saat tanggal berubah juga

  // ── Handler ganti tanggal ──
  function handleDateChange(newDate: string) {
    latestDateRef.current = newDate
    setDate(newDate)
    setLoading(true)
    // selectedUser TIDAK di-reset — rute sales yang sama langsung reload untuk tanggal baru
  }

  const selectedLoc = locations.find(l => l.user_id === selectedUser)
  const center: [number, number] = selectedLoc
    ? [selectedLoc.lat, selectedLoc.lng]
    : locations.length > 0
      ? [locations[0].lat, locations[0].lng]
      : [-6.2088, 106.8456]

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">

          {/* Header */}
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-extrabold text-slate-900">Live Tracking</h1>
                <p className="text-xs text-slate-400 mt-0.5">Posisi sales hari ini</p>
              </div>
              <button
                onClick={() => loadLocations(date)}
                className={cn('p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition', loading && 'opacity-50 pointer-events-none')}
              >
                <RefreshCw className={cn('w-3.5 h-3.5 text-slate-500', loading && 'animate-spin')} />
              </button>
            </div>

            {/* Date picker */}
            {date && (
              <input
                type="date"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
                className="mt-3 w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            )}

            {/* Last refresh */}
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400">
                {refreshLabel ? `Refresh otomatis · ${refreshLabel}` : 'Menunggu data...'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-slate-100">
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-lg font-black text-slate-900">{locations.length}</p>
              <p className="text-[11px] text-slate-400 font-semibold">Sales Aktif</p>
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2">
              <p className="text-lg font-black text-blue-600">
                {trailLoading ? '...' : trail.length}
              </p>
              <p className="text-[11px] text-slate-400 font-semibold">Titik Rute</p>
            </div>
          </div>

          {/* Sales list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 px-4">
                <Signal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-slate-500">Tidak ada data</p>
                <p className="text-xs mt-1">Belum ada sales yang aktif</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {/* Semua */}
                <button
                  onClick={() => setSelectedUser(null)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition border',
                    selectedUser === null ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'
                  )}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700">Semua Sales</p>
                    <p className="text-[11px] text-slate-400">{locations.length} aktif</p>
                  </div>
                  {selectedUser === null && <ChevronRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                </button>

                {locations.map(loc => {
                  const color      = salesColor(loc.user_id)
                  const isSelected = selectedUser === loc.user_id
                  return (
                    <button
                      key={loc.user_id}
                      onClick={() => setSelectedUser(isSelected ? null : loc.user_id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition border',
                        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {loc.user_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{loc.user_name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-[11px] text-slate-400">{secondsAgo(loc.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isSelected && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Trail info */}
          {selectedUser !== null && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-700">Rute Hari Ini</span>
                {trailLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-auto" />}
              </div>
              {!trailLoading && trail.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {trail.length} titik · mulai {fmt(trail[0]?.created_at)} · terakhir {fmt(trail[trail.length - 1]?.created_at)}
                </p>
              )}
              {!trailLoading && trail.length === 0 && (
                <p className="text-[11px] text-slate-400 mt-1">Tidak ada rute di tanggal ini</p>
              )}
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative">

          {/* Loading overlay saat ganti tanggal */}
          {loading && mapReady && (
            <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Memuat data...</p>
                  <p className="text-xs text-slate-400">{date}</p>
                </div>
              </div>
            </div>
          )}

          {!mapReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Memuat peta...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                maxZoom={21}
                maxNativeZoom={21}
              />

              <MapController
                selectedUser={selectedUser}
                selectedLoc={selectedLoc}
              />

              {locations.map(loc => (
                <SalesMarker
                  key={loc.user_id}
                  loc={loc}
                  isSelected={selectedUser === loc.user_id}
                  onClick={() => setSelectedUser(selectedUser === loc.user_id ? null : loc.user_id)}
                />
              ))}

              {selectedUser !== null && trail.length > 1 && (
                <Polyline
                  positions={trail.map(t => [t.lat, t.lng] as [number, number])}
                  color={salesColor(selectedUser)}
                  weight={3}
                  opacity={0.7}
                  dashArray="6, 4"
                />
              )}
            </MapContainer>
          )}

          {/* Overlay info */}
          {mapReady && (
            <div className="absolute top-4 right-4 z-[1000] bg-white rounded-2xl shadow-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{locations.length} Sales Online</p>
                  {date && (
                    <p className="text-[11px] text-slate-400">
                      {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .leaflet-container { z-index: 0; }
        .leaflet-control-zoom { border-radius: 12px !important; overflow: hidden; }
      `}</style>
    </AppLayout>
  )
}