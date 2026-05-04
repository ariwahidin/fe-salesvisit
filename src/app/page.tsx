'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const token = localStorage.getItem('token')
    router.replace(token ? '/dashboard' : '/login')
  }, [])
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-500">
      <div className="text-white text-center">
        <div className="text-5xl mb-2">📍</div>
        <p className="font-bold text-lg">SalesVisit</p>
      </div>
    </div>
  )
}
