'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { schedulesApi, visitsApi, formatDate } from '@/lib/api'
import { MapPin, Camera, Loader2, CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import FaceCamera from '@/components/FaceCamera'
import { cn } from '@/lib/utils'
import { queueCheckIn } from '@/lib/pending-queue'
import { updateLocalScheduleStatus } from '@/lib/offline-cache'
import { db } from '@/lib/db'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type Step = 'gps' | 'photo' | 'confirm' | 'done'

export default function CheckInPage() {
  const { id } = useParams()
  const router = useRouter()

  const [schedule, setSchedule] = useState<any>(null)
  const [step, setStep] = useState<Step>('gps')
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Load schedule
  useEffect(() => {
    const loadSchedule = async () => {
      if (navigator.onLine) {
        schedulesApi.get(Number(id))
          .then(setSchedule)
          .catch(() => router.back())
      } else {
        const cached = await db.schedules
          .where('id').equals(Number(id))
          .first()
        if (cached) setSchedule(cached)
        else router.back()
      }
    }
    loadSchedule()
  }, [id])

  // useEffect(() => {
  //   schedulesApi.get(Number(id)).then(setSchedule).catch(() => router.back())
  // }, [id])

  // Get GPS
  const getGPS = useCallback(() => {
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
        setStep('photo')
      },
      (err) => {
        setGpsError('Gagal mendapatkan lokasi: ' + err.message)
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }, [])

  // Photo select
  // const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   if (!file) return
  //   setPhoto(file)
  //   setPhotoPreview(URL.createObjectURL(file))
  //   setStep('confirm')
  // }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto(compressed)
    setPhotoPreview(URL.createObjectURL(compressed))
    setStep('confirm')
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        let { width, height } = img
        const maxSize = 1280
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize }
          else { width = (width / height) * maxSize; height = maxSize }
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob(
          (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
          'image/jpeg', 0.8
        )
      }
      img.src = url
    })
  }

  const isOnline = useOnlineStatus()

  // Submit check-in
  const handleSubmit = async () => {
    if (!gps || !photo) return
    setSubmitting(true)
    setError('')

    try {
      if (isOnline) {
        // ─── Online: kirim langsung ke server ───
        const form = new FormData()
        form.append('latitude', String(gps.lat))
        form.append('longitude', String(gps.lng))
        form.append('photo', photo)
        await visitsApi.checkIn(Number(id), form)

      } else {
        // ─── Offline: simpan ke queue ────────────
        await queueCheckIn(
          Number(id),
          { latitude: gps.lat, longitude: gps.lng },
          photo
        )

        // Update status lokal agar UI dashboard ikut update
        await updateLocalScheduleStatus(Number(id), 'completed', {
          id: 0,       // belum ada dari server
          schedule_id: Number(id),
          sales_id: 0,
          store_id: 0,
          status: 'checked_in',
          check_in_at: new Date().toISOString(),
          check_in_lat: gps.lat,
          check_in_lng: gps.lng,
        })
      }

      setStep('done')
      setTimeout(() => router.push('/dashboard'), 1800)

    } catch (e: any) {
      setError(e.message)
      setStep('confirm')
    } finally {
      setSubmitting(false)
    }
  }

  // const handleSubmit = async () => {
  //   if (!gps || !photo) return
  //   setSubmitting(true)
  //   setError('')
  //   try {
  //     const form = new FormData()
  //     form.append('latitude', String(gps.lat))
  //     form.append('longitude', String(gps.lng))
  //     form.append('photo', photo)
  //     await visitsApi.checkIn(Number(id), form)
  //     setStep('done')
  //     setTimeout(() => router.push('/dashboard'), 1800)
  //   } catch (e: any) {
  //     setError(e.message)
  //     setStep('confirm')
  //   } finally {
  //     setSubmitting(false)
  //   }
  // }

  if (!schedule) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-surface-500 text-sm hover:text-surface-700">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {/* Store info */}
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-extrabold text-surface-900">{schedule.store?.name}</p>
              <p className="text-xs text-surface-500 mt-0.5">{schedule.store?.address}, {schedule.store?.city}</p>
              <p className="text-xs text-surface-400 mt-0.5">{formatDate(schedule.visit_date)}</p>
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1">
          {(['gps', 'photo', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                step === s ? 'bg-brand-500 text-white scale-110' :
                  ['photo', 'confirm', 'done'].indexOf(step) > ['gps', 'photo', 'confirm'].indexOf(s)
                    ? 'bg-green-500 text-white' : 'bg-surface-100 text-surface-400'
              )}>
                {['photo', 'confirm', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={cn('flex-1 h-0.5 rounded', step !== 'gps' && i === 0 ? 'bg-green-400' : step === 'confirm' && i === 1 ? 'bg-green-400' : 'bg-surface-200')} />}
            </div>
          ))}
        </div>

        {/* Step: GPS */}
        {step === 'gps' && (
          <div className="card p-6 text-center">
            <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all',
              gpsLoading ? 'bg-brand-100 animate-pulse' : 'bg-brand-50')}>
              <MapPin className={cn('w-10 h-10', gpsLoading ? 'text-brand-400' : 'text-brand-500')} />
            </div>
            <h2 className="font-extrabold text-lg text-surface-900 mb-1">Ambil Lokasi GPS</h2>
            <p className="text-surface-500 text-sm mb-6">Pastikan kamu berada di lokasi toko untuk check-in</p>
            {gpsError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{gpsError}
              </div>
            )}
            <button onClick={getGPS} disabled={gpsLoading}
              className="btn-brand w-full py-3.5 flex items-center justify-center gap-2">
              {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              {gpsLoading ? 'Mengambil lokasi...' : 'Izinkan & Ambil GPS'}
            </button>
          </div>
        )}

        {/* Step: Photo */}
        {step === 'photo' && gps && (
          <div className="space-y-3">
            {/* GPS success */}
            <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              GPS OK: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
            </div>
            <div className="card p-4">
              <h2 className="font-extrabold text-surface-900 mb-1 text-center">Selfie Bukti Kunjungan</h2>
              <p className="text-surface-500 text-xs text-center mb-4">
                Pastikan wajah kamu terlihat jelas · Tanpa masker
              </p>
              <FaceCamera
                onCapture={(file) => {
                  setPhoto(file)
                  setPhotoPreview(URL.createObjectURL(file))
                  setStep('confirm')
                }}
                onError={(msg) => {
                  setGpsError(msg)
                  setStep('gps')
                }}
              />
            </div>
            <button onClick={() => setStep('gps')} className="btn-ghost w-full py-3 text-sm">
              ← Kembali
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && photoPreview && (
          <div className="space-y-3">
            <div className="card overflow-hidden">
              {/* Photo preview */}
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full h-56 object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-3">
                  <p className="text-white text-xs font-semibold">{schedule.store?.name}</p>
                  <p className="text-white/70 text-xs">{new Date().toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  GPS: {gps?.lat.toFixed(5)}, {gps?.lng.toFixed(5)}
                </div>
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Foto: {photo?.name} ({((photo?.size || 0) / 1024).toFixed(0)} KB)
                </div>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              className="btn-brand w-full py-4 text-base flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? 'Menyimpan...' : 'Konfirmasi Check-In'}
            </button>
            <button onClick={() => { setPhoto(null); setPhotoPreview(''); setStep('photo') }}
              className="btn-ghost w-full py-3 text-sm">
              <RefreshCw className="w-4 h-4 inline mr-1" /> Ulangi Foto
            </button>
          </div>
        )}

        {/* Step: Done */}

        {step === 'done' && (
          <div className="card p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-extrabold text-xl text-surface-900">
              {isOnline ? 'Check-In Berhasil!' : 'Tersimpan Lokal!'}
            </h2>
            <p className="text-surface-500 text-sm mt-2">
              {isOnline
                ? 'Kunjungan tercatat. Silakan hitung stok di toko.'
                : 'Data akan dikirim otomatis saat koneksi pulih.'}
            </p>
            {!isOnline && (
              <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs">
                ⏳ Menunggu koneksi internet
              </div>
            )}
            <p className="text-surface-400 text-xs mt-4">Mengalihkan ke dashboard...</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}


// 'use client'
// import { useState, useRef, useCallback, useEffect } from 'react'
// import { useParams, useRouter } from 'next/navigation'
// import AppLayout from '@/components/layout/AppLayout'
// import { schedulesApi, visitsApi, formatDate } from '@/lib/api'
// import { MapPin, Camera, Loader2, CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
// import { cn } from '@/lib/utils'
// import { queueCheckIn } from '@/lib/pending-queue'
// import { updateLocalScheduleStatus } from '@/lib/offline-cache'
// import { db } from '@/lib/db'
// import { useOnlineStatus } from '@/hooks/useOnlineStatus'

// type Step = 'gps' | 'photo' | 'confirm' | 'done'

// export default function CheckInPage() {
//   const { id } = useParams()
//   const router = useRouter()

//   const [schedule, setSchedule] = useState<any>(null)
//   const [step, setStep] = useState<Step>('gps')
//   const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
//   const [gpsError, setGpsError] = useState('')
//   const [gpsLoading, setGpsLoading] = useState(false)
//   const [photo, setPhoto] = useState<File | null>(null)
//   const [photoPreview, setPhotoPreview] = useState('')
//   const [submitting, setSubmitting] = useState(false)
//   const [error, setError] = useState('')
//   const fileRef = useRef<HTMLInputElement>(null)

//   // Load schedule
//   useEffect(() => {
//     const loadSchedule = async () => {
//       if (navigator.onLine) {
//         schedulesApi.get(Number(id))
//           .then(setSchedule)
//           .catch(() => router.back())
//       } else {
//         const cached = await db.schedules
//           .where('id').equals(Number(id))
//           .first()
//         if (cached) setSchedule(cached)
//         else router.back()
//       }
//     }
//     loadSchedule()
//   }, [id])


//   // Get GPS
//   const getGPS = useCallback(() => {
//     setGpsLoading(true)
//     setGpsError('')
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
//         setGpsLoading(false)
//         setStep('photo')
//       },
//       (err) => {
//         setGpsError('Gagal mendapatkan lokasi: ' + err.message)
//         setGpsLoading(false)
//       },
//       { enableHighAccuracy: true, timeout: 15000 }
//     )
//   }, [])


//   const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return
//     const compressed = await compressImage(file)
//     setPhoto(compressed)
//     setPhotoPreview(URL.createObjectURL(compressed))
//     setStep('confirm')
//   }

//   const compressImage = (file: File): Promise<File> => {
//     return new Promise((resolve) => {
//       const canvas = document.createElement('canvas')
//       const img = new Image()
//       const url = URL.createObjectURL(file)
//       img.onload = () => {
//         let { width, height } = img
//         const maxSize = 1280
//         if (width > maxSize || height > maxSize) {
//           if (width > height) { height = (height / width) * maxSize; width = maxSize }
//           else { width = (width / height) * maxSize; height = maxSize }
//         }
//         canvas.width = width
//         canvas.height = height
//         canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
//         URL.revokeObjectURL(url)
//         canvas.toBlob(
//           (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
//           'image/jpeg', 0.8
//         )
//       }
//       img.src = url
//     })
//   }

//   const isOnline = useOnlineStatus()

//   // Submit check-in
//   const handleSubmit = async () => {
//     if (!gps || !photo) return
//     setSubmitting(true)
//     setError('')

//     try {
//       if (isOnline) {
//         // ─── Online: kirim langsung ke server ───
//         const form = new FormData()
//         form.append('latitude', String(gps.lat))
//         form.append('longitude', String(gps.lng))
//         form.append('photo', photo)
//         await visitsApi.checkIn(Number(id), form)

//       } else {
//         // ─── Offline: simpan ke queue ────────────
//         await queueCheckIn(
//           Number(id),
//           { latitude: gps.lat, longitude: gps.lng },
//           photo
//         )

//         // Update status lokal agar UI dashboard ikut update
//         await updateLocalScheduleStatus(Number(id), 'completed', {
//           id: 0,       // belum ada dari server
//           schedule_id: Number(id),
//           sales_id: 0,
//           store_id: 0,
//           status: 'checked_in',
//           check_in_at: new Date().toISOString(),
//           check_in_lat: gps.lat,
//           check_in_lng: gps.lng,
//         })
//       }

//       setStep('done')
//       setTimeout(() => router.push('/dashboard'), 1800)

//     } catch (e: any) {
//       setError(e.message)
//       setStep('confirm')
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   // const handleSubmit = async () => {
//   //   if (!gps || !photo) return
//   //   setSubmitting(true)
//   //   setError('')
//   //   try {
//   //     const form = new FormData()
//   //     form.append('latitude', String(gps.lat))
//   //     form.append('longitude', String(gps.lng))
//   //     form.append('photo', photo)
//   //     await visitsApi.checkIn(Number(id), form)
//   //     setStep('done')
//   //     setTimeout(() => router.push('/dashboard'), 1800)
//   //   } catch (e: any) {
//   //     setError(e.message)
//   //     setStep('confirm')
//   //   } finally {
//   //     setSubmitting(false)
//   //   }
//   // }

//   if (!schedule) {
//     return (
//       <AppLayout>
//         <div className="flex items-center justify-center py-20">
//           <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
//         </div>
//       </AppLayout>
//     )
//   }

//   return (
//     <AppLayout>
//       <div className="p-4 space-y-4 animate-fade-in">
//         {/* Back */}
//         <button onClick={() => router.back()} className="flex items-center gap-2 text-surface-500 text-sm hover:text-surface-700">
//           <ArrowLeft className="w-4 h-4" /> Kembali
//         </button>

//         {/* Store info */}
//         <div className="card p-4">
//           <div className="flex items-start gap-3">
//             <div className="w-10 h-10 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
//               <MapPin className="w-5 h-5 text-brand-600" />
//             </div>
//             <div>
//               <p className="font-extrabold text-surface-900">{schedule.store?.name}</p>
//               <p className="text-xs text-surface-500 mt-0.5">{schedule.store?.address}, {schedule.store?.city}</p>
//               <p className="text-xs text-surface-400 mt-0.5">{formatDate(schedule.visit_date)}</p>
//             </div>
//           </div>
//         </div>

//         {/* Steps indicator */}
//         <div className="flex items-center gap-1">
//           {(['gps', 'photo', 'confirm'] as Step[]).map((s, i) => (
//             <div key={s} className="flex items-center gap-1 flex-1">
//               <div className={cn(
//                 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
//                 step === s ? 'bg-brand-500 text-white scale-110' :
//                   ['photo', 'confirm', 'done'].indexOf(step) > ['gps', 'photo', 'confirm'].indexOf(s)
//                     ? 'bg-green-500 text-white' : 'bg-surface-100 text-surface-400'
//               )}>
//                 {['photo', 'confirm', 'done'].indexOf(step) > i ? '✓' : i + 1}
//               </div>
//               {i < 2 && <div className={cn('flex-1 h-0.5 rounded', step !== 'gps' && i === 0 ? 'bg-green-400' : step === 'confirm' && i === 1 ? 'bg-green-400' : 'bg-surface-200')} />}
//             </div>
//           ))}
//         </div>

//         {/* Step: GPS */}
//         {step === 'gps' && (
//           <div className="card p-6 text-center">
//             <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all',
//               gpsLoading ? 'bg-brand-100 animate-pulse' : 'bg-brand-50')}>
//               <MapPin className={cn('w-10 h-10', gpsLoading ? 'text-brand-400' : 'text-brand-500')} />
//             </div>
//             <h2 className="font-extrabold text-lg text-surface-900 mb-1">Ambil Lokasi GPS</h2>
//             <p className="text-surface-500 text-sm mb-6">Pastikan kamu berada di lokasi toko untuk check-in</p>
//             {gpsError && (
//               <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-2">
//                 <AlertCircle className="w-4 h-4 flex-shrink-0" />{gpsError}
//               </div>
//             )}
//             <button onClick={getGPS} disabled={gpsLoading}
//               className="btn-brand w-full py-3.5 flex items-center justify-center gap-2">
//               {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
//               {gpsLoading ? 'Mengambil lokasi...' : 'Izinkan & Ambil GPS'}
//             </button>
//           </div>
//         )}

//         {/* Step: Photo */}
//         {step === 'photo' && gps && (
//           <div className="card p-6 text-center">
//             {/* GPS success */}
//             <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs flex items-center gap-2">
//               <CheckCircle className="w-4 h-4 flex-shrink-0" />
//               GPS OK: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
//             </div>
//             <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <Camera className="w-10 h-10 text-surface-400" />
//             </div>
//             <h2 className="font-extrabold text-lg text-surface-900 mb-1">Foto Bukti Kunjungan</h2>
//             <p className="text-surface-500 text-sm mb-6">Ambil foto depan toko sebagai bukti kunjungan</p>
//             <input ref={fileRef} type="file" accept="image/*" capture="environment"
//               onChange={handlePhoto} className="hidden" />
//             <button onClick={() => fileRef.current?.click()}
//               className="btn-brand w-full py-3.5 flex items-center justify-center gap-2">
//               <Camera className="w-5 h-5" /> Ambil Foto
//             </button>
//             <button onClick={() => fileRef.current?.click()}
//               className="btn-ghost w-full py-3 mt-2 text-sm">
//               Pilih dari Galeri
//             </button>
//           </div>
//         )}

//         {/* Step: Confirm */}
//         {step === 'confirm' && photoPreview && (
//           <div className="space-y-3">
//             <div className="card overflow-hidden">
//               {/* Photo preview */}
//               <div className="relative">
//                 <img src={photoPreview} alt="Preview" className="w-full h-56 object-cover" />
//                 <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-3">
//                   <p className="text-white text-xs font-semibold">{schedule.store?.name}</p>
//                   <p className="text-white/70 text-xs">{new Date().toLocaleString('id-ID')}</p>
//                 </div>
//               </div>
//               <div className="p-4 space-y-2">
//                 <div className="flex items-center gap-2 text-xs text-surface-500">
//                   <CheckCircle className="w-4 h-4 text-green-500" />
//                   GPS: {gps?.lat.toFixed(5)}, {gps?.lng.toFixed(5)}
//                 </div>
//                 <div className="flex items-center gap-2 text-xs text-surface-500">
//                   <CheckCircle className="w-4 h-4 text-green-500" />
//                   Foto: {photo?.name} ({((photo?.size || 0) / 1024).toFixed(0)} KB)
//                 </div>
//               </div>
//             </div>

//             {error && (
//               <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-2">
//                 <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
//               </div>
//             )}

//             <button onClick={handleSubmit} disabled={submitting}
//               className="btn-brand w-full py-4 text-base flex items-center justify-center gap-2">
//               {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
//               {submitting ? 'Menyimpan...' : 'Konfirmasi Check-In'}
//             </button>
//             <button onClick={() => { setPhoto(null); setPhotoPreview(''); setStep('photo') }}
//               className="btn-ghost w-full py-3 text-sm">
//               <RefreshCw className="w-4 h-4 inline mr-1" /> Ulangi Foto
//             </button>
//           </div>
//         )}

//         {/* Step: Done */}

//         {step === 'done' && (
//           <div className="card p-8 text-center animate-fade-in">
//             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <CheckCircle className="w-10 h-10 text-green-500" />
//             </div>
//             <h2 className="font-extrabold text-xl text-surface-900">
//               {isOnline ? 'Check-In Berhasil!' : 'Tersimpan Lokal!'}
//             </h2>
//             <p className="text-surface-500 text-sm mt-2">
//               {isOnline
//                 ? 'Kunjungan tercatat. Silakan hitung stok di toko.'
//                 : 'Data akan dikirim otomatis saat koneksi pulih.'}
//             </p>
//             {!isOnline && (
//               <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs">
//                 ⏳ Menunggu koneksi internet
//               </div>
//             )}
//             <p className="text-surface-400 text-xs mt-4">Mengalihkan ke dashboard...</p>
//           </div>
//         )}
//       </div>
//     </AppLayout>
//   )
// }
