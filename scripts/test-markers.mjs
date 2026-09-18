// Uji: gambar beberapa marker (diputar 0/90/180/270) ke gambar sintetis lalu deteksi.
import { AR } from '../src/scan/aruco-vendor.js'
const CODES = JSON.parse((await import('node:fs')).readFileSync(new URL('./dict-5x5-d8.json', import.meta.url), 'utf8')).codes.slice(0, 60)
AR.DICTIONARIES.Q = { nBits: 25, tau: 4, codeList: CODES }
const dict = new AR.Dictionary('Q')
const W = 900, H = 300, cell = 20
const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) }
const grid = (id) => { // 9x9 dengan quiet zone putih, bingkai hitam, isi kode
  const code = dict.codeList[id], g = []
  for (let y = 0; y < 9; y++) { g.push([]); for (let x = 0; x < 9; x++) {
    let v = 1; if (y >= 1 && y <= 7 && x >= 1 && x <= 7) v = 0
    if (y >= 2 && y <= 6 && x >= 2 && x <= 6) v = +code[(y - 2) * 5 + (x - 2)]
    g[y].push(v) } }
  return g }
const rotCW = (g) => g[0].map((_, i) => g.map((r) => r[i]).reverse())
const place = (g, ox, oy) => { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) {
  const p = ((oy + y * cell + dy) * W + ox + x * cell + dx) * 4; const v = g[y][x] ? 255 : 0; img.data[p] = img.data[p + 1] = img.data[p + 2] = v } }
const cases = [[5, 0], [17, 1], [33, 2], [59, 3]] // [id, putaran searah jarum jam]
cases.forEach(([id, r], i) => { let g = grid(id); for (let k = 0; k < r; k++) g = rotCW(g); place(g, 20 + i * 220, 60) })
const det = new AR.Detector({ dictionaryName: 'Q', maxHammingDistance: 3 })
const found = det.detect(img)
// Salin logika answerFromCorners
const ans = (c) => { const ux = (c[0].x + c[1].x) / 2 - (c[3].x + c[2].x) / 2, uy = (c[0].y + c[1].y) / 2 - (c[3].y + c[2].y) / 2
  if (Math.abs(uy) >= Math.abs(ux)) return uy < 0 ? 0 : 2; return ux > 0 ? 3 : 1 }
for (const m of found.sort((a, b) => a.corners[0].x - b.corners[0].x)) console.log('id', m.id, 'jawaban', 'ABCD'[ans(m.corners)])
