import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Response, Session } from './types'
import { errorMessage } from './util'

/** Jawaban per soal: answers[questionIndex].get(cardNumber) = 0..3 */
export type AnswerMap = Map<number, Map<number, number>>

const addTo = (map: AnswerMap, r: Pick<Response, 'question_index' | 'card_number' | 'answer'>) => {
  if (!map.has(r.question_index)) map.set(r.question_index, new Map())
  map.get(r.question_index)!.set(r.card_number, r.answer)
}

/**
 * Status ulangan yang tersinkron antara layar proyektor dan HP pemindai
 * lewat Supabase Realtime, dengan muat ulang berkala sebagai cadangan jika sinyal putus.
 */
export function useLiveSession(id: string) {
  const [session, setSession] = useState<Session | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>(new Map())
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  sessionRef.current = session

  const refetch = useCallback(async () => {
    const [s, r] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', id).single(),
      supabase.from('responses').select('question_index, card_number, answer').eq('session_id', id),
    ])
    if (s.error) return setError(errorMessage(s.error))
    setSession(s.data as Session)
    const map: AnswerMap = new Map()
    for (const row of (r.data ?? []) as Response[]) addTo(map, row)
    setAnswers(map)
  }, [id])

  useEffect(() => {
    refetch()
    const channel = supabase
      .channel(`session-${id}-${crypto.randomUUID()}`) // nama unik: hindari bentrok saat komponen dipasang ulang
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` },
        (p) => setSession(p.new as Session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses', filter: `session_id=eq.${id}` },
        (p) => {
          setAnswers((prev) => {
            const next: AnswerMap = new Map([...prev].map(([k, v]) => [k, new Map(v)]))
            if (p.eventType === 'DELETE') {
              const old = p.old as Partial<Response>
              if (old.session_id && old.session_id !== id) return prev
              next.get(old.question_index!)?.delete(old.card_number!)
            } else {
              addTo(next, p.new as Response)
            }
            return next
          })
        })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') refetch()
      })
    const timer = setInterval(refetch, 15000)
    const onVisible = () => document.visibilityState === 'visible' && refetch()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [id, refetch])

  const patchSession = useCallback(async (patch: Partial<Session>) => {
    setSession((s) => (s ? { ...s, ...patch } : s))
    const { error } = await supabase.from('sessions').update(patch).eq('id', id)
    if (error) alert('Gagal menyimpan: ' + errorMessage(error))
  }, [id])

  const goTo = useCallback((index: number) => {
    const s = sessionRef.current
    if (!s || index < 0 || index >= s.questions.length) return
    patchSession({ current_index: index, phase: 'question' })
  }, [patchSession])

  const setPhase = useCallback((phase: Session['phase']) => patchSession({ phase }), [patchSession])

  const end = useCallback(() => patchSession({ status: 'ended', ended_at: new Date().toISOString() }), [patchSession])
  const resume = useCallback(() => patchSession({ status: 'live', ended_at: null }), [patchSession])

  /** Simpan jawaban hasil pindaian (menimpa jawaban lama siswa untuk soal itu). */
  const saveAnswers = useCallback(async (questionIndex: number, items: { card: number; answer: number }[]) => {
    if (!items.length) return true
    setAnswers((prev) => {
      const next: AnswerMap = new Map(prev)
      const m = new Map(prev.get(questionIndex) ?? [])
      for (const it of items) m.set(it.card, it.answer)
      next.set(questionIndex, m)
      return next
    })
    const { error } = await supabase.from('responses').upsert(
      items.map((it) => ({ session_id: id, question_index: questionIndex, card_number: it.card, answer: it.answer, updated_at: new Date().toISOString() })),
      { onConflict: 'session_id,question_index,card_number' },
    )
    return !error
  }, [id])

  const clearQuestion = useCallback(async (questionIndex: number) => {
    setAnswers((prev) => {
      const next: AnswerMap = new Map(prev)
      next.delete(questionIndex)
      return next
    })
    const { error } = await supabase.from('responses').delete().eq('session_id', id).eq('question_index', questionIndex)
    if (error) alert(errorMessage(error))
  }, [id])

  return { session, answers, error, connected, goTo, setPhase, end, resume, saveAnswers, clearQuestion, refetch }
}
