'use client'
import { useRouter } from 'next/navigation'
import { ShieldOff } from 'lucide-react'

export default function AccessDeniedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <ShieldOff className="w-16 h-16 text-red-500" />
      <h1 className="text-2xl font-bold">Akses Ditolak</h1>
      <p className="text-muted-foreground max-w-sm">
        Kamu tidak memiliki izin untuk mengakses halaman ini.
        Hubungi administrator jika ini adalah kesalahan.
      </p>
      <div className="flex gap-2">
        <button onClick={() => router.back()} className="btn btn-outline">
          Kembali
        </button>
        <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
          Ke Dashboard
        </button>
      </div>
    </div>
  )
}