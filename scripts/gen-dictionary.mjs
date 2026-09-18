// Membuat kamus marker kustom: kode NxN yang saling berjauhan (jarak Hamming),
// termasuk terhadap versi rotasinya, supaya kartu & arah jawaban tidak tertukar.
// Jalankan: node scripts/gen-dictionary.mjs <n> <minDist> <seed> <tries>
const n = +(process.argv[2] ?? 5), minDist = +(process.argv[3] ?? 7), seed = +(process.argv[4] ?? 1), tries = +(process.argv[5] ?? 300000);
const nBits = n * n;
let s = seed;
const rand = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32);
const toGrid = (c) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Math.floor(c / 2 ** (nBits - 1 - (i * n + j))) % 2));
const fromGrid = (g) => g.flat().reduce((a, b) => a * 2 + b, 0);
const rot = (g) => g.map((row, i) => row.map((_, j) => g[n - j - 1][i]));
const rots = (c) => { const r = [c]; let g = toGrid(c); for (let k = 0; k < 3; k++) { g = rot(g); r.push(fromGrid(g)); } return r; };
const ham = (a, b) => { let d = 0; for (let i = 0; i < nBits; i++) { if (Math.floor(a / 2 ** i) % 2 !== Math.floor(b / 2 ** i) % 2) d++; } return d; };
const chosen = [];
for (let t = 0; t < tries; t++) {
  const c = Math.floor(rand() * 2 ** nBits);
  const r = rots(c);
  if (Math.min(ham(c, r[1]), ham(c, r[2]), ham(c, r[3])) < minDist) continue;
  const ones = ham(c, 0); if (ones < nBits * 0.3 || ones > nBits * 0.7) continue;
  if (chosen.every((o) => r.every((rc) => ham(rc, o) >= minDist))) chosen.push(c);
}
console.log(JSON.stringify({ n, minDist, count: chosen.length, codes: chosen.map((c) => c.toString(16)) }));
