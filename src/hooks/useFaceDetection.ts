import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

export type FaceStatus = 'loading' | 'no_face' | 'mask' | 'valid'

interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled: boolean
}

interface UseFaceDetectionResult {
  status: FaceStatus
  modelsLoaded: boolean
}

// Indeks landmark mulut & hidung dari model 68-point
// Hidung: 27-35, Bibir luar: 48-59
const NOSE_POINTS  = [27, 28, 29, 30, 31, 32, 33, 34, 35]
const MOUTH_POINTS = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59]

function isMaskWorn(landmarks: faceapi.FaceLandmarks68, faceBox: faceapi.Box): boolean {
  const positions = landmarks.positions
  const boxHeight = faceBox.height

  // Ambil titik hidung & mulut
  const nosePoints  = NOSE_POINTS.map(i => positions[i])
  const mouthPoints = MOUTH_POINTS.map(i => positions[i])
  const allPoints   = [...nosePoints, ...mouthPoints]

  // Hitung rata-rata Y dari titik hidung+mulut
  const avgY = allPoints.reduce((s, p) => s + p.y, 0) / allPoints.length

  // Hitung spread X (seberapa lebar titik tersebar)
  const minX = Math.min(...allPoints.map(p => p.x))
  const maxX = Math.max(...allPoints.map(p => p.x))
  const spreadX = maxX - minX

  // Hitung spread Y
  const minY = Math.min(...allPoints.map(p => p.y))
  const maxY = Math.max(...allPoints.map(p => p.y))
  const spreadY = maxY - minY

  // Kalau spread terlalu kecil relatif terhadap ukuran wajah
  // berarti landmark menumpuk = fitur wajah tertutup (masker)
  const spreadRatioX = spreadX / faceBox.width
  const spreadRatioY = spreadY / boxHeight

  return spreadRatioX < 0.25 || spreadRatioY < 0.08
}

export function useFaceDetection({ videoRef, enabled }: UseFaceDetectionOptions): UseFaceDetectionResult {
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [status, setStatus] = useState<FaceStatus>('loading')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load model sekali saja
  useEffect(() => {
    const load = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models')
        setModelsLoaded(true)
        setStatus('no_face')
      } catch (err) {
        console.error('Gagal load model face-api:', err)
        setStatus('no_face')
      }
    }
    load()
  }, [])

  // Jalankan deteksi setiap 600ms
  const detect = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || !modelsLoaded) return

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)

      if (!detection) {
        setStatus('no_face')
        return
      }

      const masked = isMaskWorn(detection.landmarks, detection.detection.box)
      setStatus(masked ? 'mask' : 'valid')

    } catch {
      setStatus('no_face')
    }
  }, [modelsLoaded, videoRef])

  useEffect(() => {
    if (!enabled || !modelsLoaded) return

    intervalRef.current = setInterval(detect, 600)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, modelsLoaded, detect])

  return { status, modelsLoaded }
}