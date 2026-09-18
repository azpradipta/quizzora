import type { Response, Session } from './types'

export interface StudentResult {
  name: string
  card_number: number
  answers: (number | undefined)[]
  correct: number
  answered: number
  score: number
}

export function sessionStats(session: Pick<Session, 'questions' | 'students'>, responses: Pick<Response, 'question_index' | 'card_number' | 'answer'>[]) {
  const map = new Map<string, number>()
  for (const r of responses) map.set(`${r.question_index}:${r.card_number}`, r.answer)
  const qCount = session.questions.length
  const rows: StudentResult[] = session.students.map((s) => {
    const answers = session.questions.map((_, qi) => map.get(`${qi}:${s.card_number}`))
    const correct = answers.filter((a, qi) => a === session.questions[qi].correct).length
    const answered = answers.filter((a) => a !== undefined).length
    return { ...s, answers, correct, answered, score: qCount ? Math.round((correct / qCount) * 100) : 0 }
  })
  const perQuestion = session.questions.map((q, qi) => {
    const got = rows.map((r) => r.answers[qi]).filter((a): a is number => a !== undefined)
    const right = got.filter((a) => a === q.correct).length
    const dist = [0, 1, 2, 3].map((k) => got.filter((a) => a === k).length)
    return { answered: got.length, right, dist, pct: got.length ? Math.round((right / got.length) * 100) : 0 }
  })
  const participants = rows.filter((r) => r.answered > 0)
  const scores = participants.map((r) => r.score)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  return {
    rows,
    perQuestion,
    avg,
    participants: participants.length,
    max: scores.length ? Math.max(...scores) : 0,
    min: scores.length ? Math.min(...scores) : 0,
  }
}

export function scoreTone(score: number, kkm = 75) {
  if (score >= Math.max(kkm, 85)) return 'brand' as const
  if (score >= kkm) return 'sky' as const
  if (score >= kkm - 20) return 'amber' as const
  return 'rose' as const
}
