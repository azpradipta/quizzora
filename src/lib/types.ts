export interface ClassRow {
  id: string
  name: string
  created_at: string
}

export interface Student {
  id: string
  class_id: string
  name: string
  card_number: number
}

export interface Quiz {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  quiz_id: string
  position: number
  text: string
  image_url: string | null
  options: string[]
  correct: number
}

export interface SessionQuestion {
  text: string
  image_url: string | null
  options: string[]
  correct: number
}

export interface SessionStudent {
  name: string
  card_number: number
}

export interface Session {
  id: string
  quiz_id: string | null
  class_id: string | null
  quiz_title: string
  class_name: string
  questions: SessionQuestion[]
  students: SessionStudent[]
  current_index: number
  phase: 'question' | 'reveal'
  status: 'live' | 'ended'
  created_at: string
  ended_at: string | null
}

export interface Response {
  session_id: string
  question_index: number
  card_number: number
  answer: number
  updated_at: string
}
