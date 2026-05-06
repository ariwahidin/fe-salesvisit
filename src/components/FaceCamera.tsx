'use client'
import { useEffect, useRef, useState } from 'react'
import { useFaceDetection, FaceStatus } from '@/hooks/useFaceDetection'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FaceCameraProps {
  onCapture: (file: File) => void
  onError?: (msg: string) => void
}

const STATUS_CONFIG: Record<FaceStatus, { color: string; ring: string; message: string }> = {
  loading:  { color: '#f59e0b', ring: '#f59e0b', message: 'Memuat model deteksi...' },
  no_face:  { color: '#ef4444', ring: '#ef4444', message: 'Arahkan wajah ke kamera' },
  mask:     { color: '#f59e0b', ring: '#f59e0b', message: 'Lepas masker untuk melanjutkan' },
  valid:    { color: '#22c55e', ring: '#22c55e', message: 'Wajah terdeteksi — siap foto!' },
}

export default function FaceCamera({ onCapture, onError }: FaceCameraProps) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  const [camReady, setCamReady]     = useState(false)
  const [capturing, setCapturing]   = useState(false)

  const { status, modelsLoaded } = useFaceDetection({
    videoRef,
    enabled: camReady,
  })

  // Start kamera front (selfie)
  useEffect(() => {
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setCamReady(true)
          }
        }
      } catch (err: any) {
        onError?.('Tidak dapat mengakses kamera: ' + err.message)
      }
    }
    startCam()

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Capture frame dari video → File
  const handleCapture = async () => {
    if (status !== 'valid' || !videoRef.current) return
    setCapturing(true)

    const video  = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')!
    // Mirror balik supaya hasil foto tidak terbalik
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) { setCapturing(false); return }
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
        // Stop kamera setelah capture
        streamRef.current?.getTracks().forEach(t => t.stop())
        onCapture(file)
        setCapturing(false)
      },
      'image/jpeg',
      0.85
    )
  }

  const cfg = STATUS_CONFIG[status]

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Viewfinder */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-black"
           style={{ aspectRatio: '3/4' }}>

        {/* Video feed — mirror untuk selfie */}
        <video
          ref={videoRef}
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Overlay canvas (reserved untuk future landmark drawing) */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* SVG overlay — oval guide + corner brackets */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400"
             xmlns="http://www.w3.org/2000/svg">

          {/* Dim area luar oval */}
          <defs>
            <mask id="oval-mask">
              <rect width="300" height="400" fill="white"/>
              <ellipse cx="150" cy="175" rx="90" ry="115" fill="black"/>
            </mask>
          </defs>
          <rect width="300" height="400" fill="rgba(0,0,0,0.5)" mask="url(#oval-mask)"/>

          {/* Oval guide — warna sesuai status */}
          <ellipse
            cx="150" cy="175" rx="90" ry="115"
            fill="none"
            stroke={cfg.ring}
            strokeWidth="2.5"
            strokeDasharray={status === 'valid' ? 'none' : '10 5'}
            style={{ transition: 'stroke 0.3s ease' }}
          />

          {/* Shoulder silhouette */}
          <path
            d="M60 310 Q62 345 40 370 L260 370 Q238 345 240 310"
            fill="none"
            stroke={cfg.ring}
            strokeWidth="1.5"
            strokeDasharray="8 5"
            opacity="0.6"
            style={{ transition: 'stroke 0.3s ease' }}
          />

          {/* Corner brackets */}
          <path d="M20 20 L20 45 M20 20 L45 20" stroke="white" strokeWidth="2"
                strokeLinecap="round" opacity="0.4"/>
          <path d="M280 20 L280 45 M280 20 L255 20" stroke="white" strokeWidth="2"
                strokeLinecap="round" opacity="0.4"/>
          <path d="M20 380 L20 355 M20 380 L45 380" stroke="white" strokeWidth="2"
                strokeLinecap="round" opacity="0.4"/>
          <path d="M280 380 L280 355 M280 380 L255 380" stroke="white" strokeWidth="2"
                strokeLinecap="round" opacity="0.4"/>
        </svg>

        {/* Status chip */}
        <div className="absolute top-3 inset-x-0 flex justify-center">
          <div
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
            style={{ backgroundColor: cfg.color + 'dd' }}
          >
            {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'valid'   && <span>✓</span>}
            {status === 'no_face' && <span>○</span>}
            {status === 'mask'    && <span>!</span>}
            {cfg.message}
          </div>
        </div>

        {/* Loading overlay saat model belum siap */}
        {!modelsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-white text-sm font-medium">Memuat model deteksi wajah...</p>
            <p className="text-white/50 text-xs">Hanya sekali, ±3 detik</p>
          </div>
        )}
      </div>

      {/* Instruksi */}
      <p className="text-xs text-center text-surface-500 px-4">
        Posisikan wajah di dalam oval · Tanpa masker · Kacamata boleh
      </p>

      {/* Tombol capture */}
      <button
        onClick={handleCapture}
        disabled={status !== 'valid' || capturing}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center transition-all',
          'border-4',
          status === 'valid'
            ? 'border-green-400 bg-green-500 hover:bg-green-600 active:scale-95 shadow-lg'
            : 'border-surface-200 bg-surface-100 cursor-not-allowed opacity-50'
        )}
      >
        {capturing
          ? <Loader2 className="w-6 h-6 animate-spin text-white" />
          : <div className="w-10 h-10 rounded-full bg-white/30" />
        }
      </button>

      <p className={cn(
        'text-xs font-semibold transition-colors',
        status === 'valid' ? 'text-green-600' : 'text-surface-400'
      )}>
        {status === 'valid' ? 'Tekan untuk mengambil foto' : 'Tombol aktif saat wajah terdeteksi'}
      </p>
    </div>
  )
}