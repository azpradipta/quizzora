import { AR } from './aruco-vendor.js'

/**
 * Kamus marker Quizzora: 60 kode 5x5 yang dipilih oleh scripts/gen-dictionary.mjs
 * (jarak Hamming minimum 8 antar kode termasuk rotasinya). Nomor kartu = indeks + 1.
 */
const CODES = ["198d8aa","4c9c9e","54e8a1","b1252b","fa4550","579a50","1c6262c","e77da7","105db39","285f1","b8cd93","27aea9","1e7b41f","8d1b95","14e511a","1e0bb7b","12a94e7","d0bfe2","9aa2a4","1143722","116fd7","218117","450fed","115a40c","1bb3b92","7939d4","791fba","d75bfa","e1d79d","14d9431","821718","134feb8","5008ff","1ae0d79","106d455","59e46a","643b0d","1745a35","1b1e257","16f1b74","1684efc","9725e0","9d0a7b","830b06","53863c","a98c66","19f685d","ac91a1","112a1df","1837fb1","209d0a","6bf720","10f79bf","30eccc","13e8b46","1eae716","4ae91c","bf7989","1e3516d","fb6695"]

export const DICTIONARY_NAME = 'QUIZZORA_5X5'
export const MAX_CARDS = CODES.length

AR.DICTIONARIES[DICTIONARY_NAME] = { nBits: 25, tau: 4, codeList: CODES }

export type Answer = 0 | 1 | 2 | 3 // A, B, C, D
export const LETTERS = ['A', 'B', 'C', 'D'] as const

/** SVG marker (termasuk bingkai hitam) untuk kartu nomor 'cardNumber' (1-based). */
export function markerSvg(cardNumber: number): string {
  const dict = new AR.Dictionary(DICTIONARY_NAME)
  return dict.generateSVG(cardNumber - 1)
}

export interface Point { x: number; y: number }
export interface Detection {
  card: number
  answer: Answer
  corners: Point[]
}

/**
 * Sisi kartu yang menghadap ke atas menentukan jawaban.
 * Di kartu cetak: A di atas, B di kanan, C di bawah, D di kiri (orientasi asli marker).
 * corners[0..3] = pojok kiri-atas, kanan-atas, kanan-bawah, kiri-bawah marker asli.
 */
export function answerFromCorners(c: Point[]): Answer {
  // Vektor "atas" marker asli di koordinat gambar
  const ux = (c[0].x + c[1].x) / 2 - (c[3].x + c[2].x) / 2
  const uy = (c[0].y + c[1].y) / 2 - (c[3].y + c[2].y) / 2
  if (Math.abs(uy) >= Math.abs(ux)) return uy < 0 ? 0 : 2 // atas asli menghadap atas → A; terbalik → C
  // Atas asli menghadap kanan (kartu diputar searah jarum jam) → sisi kiri (D) di atas
  return ux > 0 ? 3 : 1
}

export function createDetector() {
  return new AR.Detector({ dictionaryName: DICTIONARY_NAME, maxHammingDistance: 3 })
}

type Img = Pick<ImageData, 'width' | 'height' | 'data'>

/** Perkecil gambar 2x (rata-rata 2x2 piksel). */
function halve(src: Img): Img {
  const w = src.width >> 1, h = src.height >> 1
  const out = new Uint8ClampedArray(w * h * 4)
  const s = src.data, sw = src.width * 4
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * 2) * sw + x * 8
      const o = (y * w + x) * 4
      for (let c = 0; c < 3; c++) out[o + c] = (s[i + c] + s[i + 4 + c] + s[i + sw + c] + s[i + sw + 4 + c]) >> 2
      out[o + 3] = 255
    }
  }
  return { width: w, height: h, data: out }
}

/**
 * Deteksi di resolusi penuh (kartu kecil/jauh) dan setengah resolusi (kartu buram/goyang),
 * lalu gabungkan hasilnya per nomor kartu.
 */
export function detect(detector: ReturnType<typeof createDetector>, image: Img): Detection[] {
  const seen = new Map<number, Detection>()
  const add = (markers: { id: number; corners: Point[] }[], scale: number) => {
    for (const m of markers) {
      const card = m.id + 1
      if (seen.has(card)) continue
      const corners = m.corners.map((p) => ({ x: p.x * scale, y: p.y * scale }))
      seen.set(card, { card, answer: answerFromCorners(corners), corners })
    }
  }
  add(detector.detect(image), 1)
  if (image.width >= 960) add(detector.detect(halve(image)), 2)
  return [...seen.values()]
}
