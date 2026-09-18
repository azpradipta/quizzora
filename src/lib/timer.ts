/** Pilihan timer per soal (detik). 0 = tanpa timer. */
export const TIMER_OPTIONS = [0, 15, 30, 60, 90] as const

// Disimpan di browser laptop proyektor saja (timer hanya berjalan di layar itu).
const key = (sessionId: string) => `qz-timer-${sessionId}`
const LAST = 'qz-timer-last'

const read = (k: string) => { try { return Number(localStorage.getItem(k)) || 0 } catch { return 0 } }
const write = (k: string, v: number) => { try { localStorage.setItem(k, String(v)) } catch { /* abaikan */ } }

/** Durasi terakhir yang dipakai guru, jadi pilihan awal di halaman Mulai. */
export const lastTimer = () => read(LAST)

export const loadTimer = (sessionId: string) => read(key(sessionId))

export function saveTimer(sessionId: string, seconds: number) {
  write(key(sessionId), seconds)
  write(LAST, seconds)
}
