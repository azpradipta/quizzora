import { createDetector, detect } from './markers'

export interface ScanRequest { width: number; height: number; buffer: ArrayBuffer }
export interface ScanResult { detections: ReturnType<typeof detect>; buffer: ArrayBuffer; ms: number }

const detector = createDetector()
const ctx = self as unknown as Worker

ctx.onmessage = (e: MessageEvent<ScanRequest>) => {
  const { width, height, buffer } = e.data
  const t0 = performance.now()
  const detections = detect(detector, { width, height, data: new Uint8ClampedArray(buffer) })
  const result: ScanResult = { detections, buffer, ms: performance.now() - t0 }
  ctx.postMessage(result, [buffer])
}
