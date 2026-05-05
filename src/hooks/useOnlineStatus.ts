import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  // ← selalu mulai dengan true (anggap online dulu)
  // baru update setelah mount di client
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // setelah mount, baru baca navigator.onLine yang sebenarnya
    setIsOnline(navigator.onLine)

    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}