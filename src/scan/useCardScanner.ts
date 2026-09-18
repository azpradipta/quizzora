import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Detection } from './markers'
import type { ScanRequest, ScanResult } from './worker'

const MAX_PROCESS_WIDTH = 1920

export interface CameraControls {
  torch: boolean | null // null = tidak didukung
  setTorch: (on: boolean) => void
  zoom: { min: number; max: number; value: number } | null
  setZoom: (z: number) => void
}

/**
 * Menyalakan kamera belakang dan terus mendeteksi kartu di Web Worker.
 * `onFrame` dipanggil setiap selesai satu frame dengan daftar kartu yang terlihat.
 */
export function useCardScanner(videoRef: RefObject<HTMLVideoElement | null>, active: boolean,
  onFrame: (detections: Detection[], frameSize: { width: number; height: number }) => void) {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [fps, setFps] = useState(0)
  const [controls, setControls] = useState<CameraControls>({ torch: null, setTorch: () => {}, zoom: null, setZoom: () => {} })
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let raf = 0
    let busy = false
    let spare: ArrayBuffer | null = null
    let frames = 0
    let lastFpsAt = performance.now()
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    const canvas = document.createElement('canvas')
    const ctx2d = canvas.getContext('2d', { willReadFrequently: true })!

    worker.onmessage = (e: MessageEvent<ScanResult>) => {
      busy = false
      spare = e.data.buffer
      frames++
      const now = performance.now()
      if (now - lastFpsAt > 1000) {
        setFps(Math.round((frames * 1000) / (now - lastFpsAt)))
        frames = 0
        lastFpsAt = now
      }
      if (!stopped) onFrameRef.current(e.data.detections, { width: canvas.width, height: canvas.height })
    }

    const tick = () => {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      const video = videoRef.current
      if (busy || !activeRef.current || !video || video.readyState < 2 || !video.videoWidth) return
      const scale = Math.min(1, MAX_PROCESS_WIDTH / Math.max(video.videoWidth, video.videoHeight))
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; spare = null }
      ctx2d.drawImage(video, 0, 0, w, h)
      const data = ctx2d.getImageData(0, 0, w, h).data
      let buffer: ArrayBuffer
      if (spare && spare.byteLength === data.byteLength) {
        new Uint8ClampedArray(spare).set(data)
        buffer = spare
      } else {
        buffer = data.slice().buffer
      }
      spare = null
      busy = true
      const req: ScanRequest = { width: w, height: h, buffer }
      worker.postMessage(req, [buffer])
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Browser ini tidak mendukung kamera. Gunakan Chrome terbaru dan pastikan alamat diawali https://')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
      } catch (e) {
        const name = (e as DOMException).name
        setError(name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Ketuk ikon gembok di address bar → izinkan Kamera, lalu muat ulang halaman.'
          : 'Kamera tidak bisa dibuka: ' + (e as Error).message)
        return
      }
      // Elemen <video> baru muncul setelah data sesi termuat
      while (!videoRef.current && !stopped) await new Promise((r) => setTimeout(r, 50))
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      const video = videoRef.current!
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play().catch(() => {})
      setReady(true)

      const track = stream.getVideoTracks()[0]
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number } }
      const settings = track.getSettings() as MediaTrackSettings & { zoom?: number }
      const apply = (c: Record<string, unknown>) => track.applyConstraints({ advanced: [c as MediaTrackConstraintSet] }).catch(() => {})
      setControls({
        torch: caps.torch ? false : null,
        setTorch: (on) => { apply({ torch: on }); setControls((c) => ({ ...c, torch: on })) },
        zoom: caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: Math.min(caps.zoom.max, 8), value: settings.zoom ?? caps.zoom.min } : null,
        setZoom: (z) => { apply({ zoom: z }); setControls((c) => (c.zoom ? { ...c, zoom: { ...c.zoom, value: z } } : c)) },
      })
      raf = requestAnimationFrame(tick)
    }
    start()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      worker.terminate()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [videoRef])

  return { error, ready, fps, controls }
}
