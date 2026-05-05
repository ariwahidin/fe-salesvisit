import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react'
import { getPendingActions } from '@/lib/pending-queue'
import { syncPendingActions } from '@/lib/sync-manager'

export function OfflineBanner() {
  const isOnline                    = useOnlineStatus()
  const [pendingCount, setPending]  = useState(0)
  const [syncing, setSyncing]       = useState(false)

  // Cek pending actions setiap kali status berubah
  useEffect(() => {
    getPendingActions().then(a => setPending(a.length))
  }, [isOnline])

  // Saat online dan ada pending → tampilkan badge sync
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-blue-500 text-white px-4 py-2.5 flex items-center gap-2 shadow-md">
        <RefreshCw className={`w-4 h-4 flex-shrink-0 ${syncing ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {syncing ? 'Mengirim data...' : `${pendingCount} data belum terkirim`}
          </p>
          <p className="text-xs text-blue-100">
            {syncing ? 'Mohon tunggu sebentar' : 'Koneksi pulih, siap sync'}
          </p>
        </div>
        {!syncing && (
          <button
            onClick={async () => {
              setSyncing(true)
              await syncPendingActions()
              const remaining = await getPendingActions()
              setPending(remaining.length)
              setSyncing(false)
            }}
            className="px-3 py-1.5 bg-white/20 rounded-xl text-xs font-bold hover:bg-white/30 transition">
            Kirim
          </button>
        )}
      </div>
    )
  }

  if (isOnline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center gap-2 shadow-md">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Mode Offline</p>
        <p className="text-xs text-amber-100">Data ditampilkan dari cache lokal</p>
      </div>
      {pendingCount > 0 && (
        <div className="px-2.5 py-1 bg-white/20 rounded-xl text-xs font-bold">
          {pendingCount} pending
        </div>
      )}
    </div>
  )
}