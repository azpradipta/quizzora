import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertTriangle, BookOpenCheck, Check, MonitorPlay, Play, Smartphone, Timer, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { Button, Card, PageHeader, Skeleton, Toggle, cn, coverGradient } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { supabase } from '../lib/supabase'
import type { Question, SessionQuestion } from '../lib/types'
import { errorMessage } from '../lib/util'
import { questionProblem } from './QuizEditor'
import { TIMER_OPTIONS, lastTimer, saveTimer } from '../lib/timer'

type QuizItem = { id: string; title: string; questions: { count: number }[] }
type ClassItem = { id: string; name: string; students: { count: number }[] }

export default function StartSession() {
  const { quizId: initialQuiz } = useParams<{ quizId?: string }>()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [quizzes, setQuizzes] = useState<QuizItem[] | null>(null)
  const [classes, setClasses] = useState<ClassItem[] | null>(null)
  const [quizId, setQuizId] = useState(initialQuiz ?? '')
  const [classId, setClassId] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [shuffle, setShuffle] = useState(false)
  const [timer, setTimer] = useState(lastTimer)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('quizzes').select('id, title, questions(count)').order('updated_at', { ascending: false }),
      supabase.from('classes').select('id, name, students(count)').order('name'),
    ]).then(([q, c]) => {
      setQuizzes(((q.data as QuizItem[]) ?? []).filter((x) => (x.questions[0]?.count ?? 0) > 0))
      const list = (c.data as ClassItem[]) ?? []
      setClasses(list)
      if (list.length === 1) setClassId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (!quizId) return setQuestions([])
    supabase.from('questions').select('*').eq('quiz_id', quizId).order('position').then(({ data }) => setQuestions(data ?? []))
  }, [quizId])

  const ready = questions.filter((q) => !questionProblem(q))
  const skipped = questions.length - ready.length
  const quiz = quizzes?.find((q) => q.id === quizId)
  const cls = classes?.find((c) => c.id === classId)
  const studentCount = cls?.students[0]?.count ?? 0

  async function start() {
    setBusy(true)
    try {
      const { data: students, error: e1 } = await supabase.from('students').select('name, card_number').eq('class_id', classId).order('card_number')
      if (e1) throw e1
      let snapshot: SessionQuestion[] = ready.map(({ text, image_url, options, correct }) => ({ text, image_url, options, correct }))
      if (shuffle) snapshot = [...snapshot].sort(() => Math.random() - 0.5)
      const { data, error } = await supabase.from('sessions').insert({
        quiz_id: quizId, class_id: classId, quiz_title: quiz!.title, class_name: cls!.name, questions: snapshot, students,
      }).select('id').single()
      if (error) throw error
      saveTimer(data.id, timer)
      navigate(`/sesi/${data.id}`)
    } catch (e) {
      toast('Gagal memulai: ' + errorMessage(e), 'error')
      setBusy(false)
    }
  }

  const loading = quizzes === null || classes === null

  return (
    <Layout>
      <PageHeader title="Mulai Ulangan" subtitle="Pilih kuis dan kelas, lalu tampilkan di proyektor." icon={Play} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <div className="space-y-6">
          <Step n={1} title="Pilih kuis" done={!!quizId}>
            {loading ? <Skeleton className="h-24" /> : quizzes!.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada kuis yang berisi soal. <Link to="/kuis" className="font-semibold text-brand-700">Buat kuis dulu →</Link></p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {quizzes!.map((q) => (
                  <Choice key={q.id} selected={quizId === q.id} onClick={() => setQuizId(q.id)}>
                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br text-white', coverGradient(q.title))}><BookOpenCheck className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900">{q.title}</span>
                      <span className="text-xs text-slate-500">{q.questions[0]?.count} soal</span>
                    </span>
                  </Choice>
                ))}
              </div>
            )}
          </Step>

          <Step n={2} title="Pilih kelas" done={!!classId}>
            {loading ? <Skeleton className="h-24" /> : classes!.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada kelas. <Link to="/kelas" className="font-semibold text-brand-700">Buat kelas dulu →</Link></p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {classes!.map((c) => (
                  <Choice key={c.id} selected={classId === c.id} onClick={() => setClassId(c.id)} disabled={!c.students[0]?.count}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 font-extrabold text-brand-800">{c.name.slice(0, 3)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900">Kelas {c.name}</span>
                      <span className="text-xs text-slate-500">{c.students[0]?.count ?? 0} siswa</span>
                    </span>
                  </Choice>
                ))}
              </div>
            )}
          </Step>

          <Step n={3} title="Pengaturan">
            <div className="rounded-xl p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Timer className="size-4 text-brand-600" /> Timer per soal</p>
              <p className="mb-3 text-xs text-slate-500">Hitung mundur di layar proyektor. Tetap bisa diubah saat ulangan berlangsung.</p>
              <div className="flex flex-wrap gap-2">
                {TIMER_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => setTimer(t)}
                    className={cn('h-10 min-w-16 rounded-xl px-3 text-sm font-bold ring-2 transition',
                      timer === t ? 'bg-brand-50 text-brand-800 ring-brand-500' : 'text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {t ? `${t} dtk` : 'Tanpa timer'}
                  </button>
                ))}
              </div>
            </div>
            <Toggle checked={shuffle} onChange={setShuffle} label="Acak urutan soal" description="Urutan soal berbeda dari yang ada di editor." />
          </Step>
        </div>

        <Card className="overflow-hidden lg:sticky lg:top-6">
          <div className="relative bg-linear-to-br from-brand-700 to-brand-950 p-5 text-white">
            <div className="relative">
              <p className="text-xs font-bold tracking-wide text-brand-200 uppercase">Ringkasan</p>
              <p className="mt-1 line-clamp-2 text-lg font-extrabold">{quiz?.title ?? 'Belum pilih kuis'}</p>
              <p className="text-sm text-brand-100">{cls ? `Kelas ${cls.name}` : 'Belum pilih kelas'}</p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-extrabold text-slate-900">{ready.length}</p><p className="text-xs text-slate-500">soal</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-extrabold text-slate-900">{studentCount}</p><p className="text-xs text-slate-500">siswa</p></div>
            </div>
            {skipped > 0 && (
              <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{skipped} soal belum lengkap dan akan dilewati. <Link to={`/kuis/${quizId}`} className="font-bold underline">Perbaiki</Link></span>
              </p>
            )}
            <Button size="lg" className="w-full" icon={Play} loading={busy} disabled={!quizId || !classId || !ready.length} onClick={start}>
              Mulai sekarang
            </Button>
            <div className="space-y-2 text-xs text-slate-500">
              <p className="flex gap-2"><MonitorPlay className="size-4 shrink-0 text-brand-600" /><span>Buka halaman ini di <b>laptop yang tersambung ke proyektor</b>.</span></p>
              <p className="flex gap-2"><Smartphone className="size-4 shrink-0 text-brand-600" /><span>Setelah mulai, pindai kode QR di layar dengan HP untuk membuka kamera.</span></p>
              <p className="flex gap-2"><Users className="size-4 shrink-0 text-brand-600" /><span>Bagikan kartu sesuai nomor siswa.</span></p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('grid size-8 place-items-center rounded-full text-sm font-extrabold transition', done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
      </div>
      {children}
    </Card>
  )
}

function Choice({ selected, onClick, disabled, children }: { selected: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} disabled={disabled}
      className={cn('relative flex items-center gap-3 rounded-2xl p-3 text-left ring-2 transition disabled:opacity-40',
        selected ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
      {children}
      {selected && <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-brand-600 text-white shadow"><Check className="size-3.5" strokeWidth={3} /></span>}
    </motion.button>
  )
}
