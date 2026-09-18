import type { SessionQuestion } from './types'

export const LETTERS = ['A', 'B', 'C', 'D']

/** Indeks opsi yang terisi (soal bisa punya 2–4 pilihan). */
export const filledOptions = (q: Pick<SessionQuestion, 'options'>) =>
  q.options.map((text, i) => ({ text, i })).filter((o) => o.text.trim() !== '')

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}
