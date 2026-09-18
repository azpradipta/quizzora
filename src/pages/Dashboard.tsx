import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight, BookOpenCheck, CheckCircle2, ChevronRight, Circle, History, Play, Plus, Printer, Radio, Sparkles, Users,
} from 'lucide-react'
import Layout from '../components/Layout'
import { Badge, ButtonLink, Card, Skeleton, coverGradient, cn } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { Response, Session } from '../lib/types'
import { formatDate } from '../lib/util'
import { scoreTone, sessionStats } from '../lib/stats'
import { useCreateQuiz } from './Quizzes'

type QuizItem = { id: string; title: string; updated_at: string; questions: { count: number }[] }
type ClassItem = { id: string; name: string; students: { count: number }[] }
type SessionItem = Session & { avg?: number; participants?: number }

function greeting() {
  const h = new Date().getHours()
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'
}

function hijriDate() {
  try {
    return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  } catch {
    return ''
  }
}

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<QuizItem[] | null>(null)
  const [classes, setClasses] = useState<ClassItem[] | null>(null)
  const [sessions, setSessions] = useState<SessionItem[] | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const createQuiz = useCreateQuiz()

  useEffect(() => {
    const load = async () => {
      const [q, c, s] = await Promise.all([
        supabase.from('quizzes').select('id, title, updated_at, questions(count)').order('updated_at', { ascending: false }),
        supabase.from('classes').select('id, name, students(count)').order('name'),
        supabase.from('sessions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
      ])
      setQuizzes((q.data as QuizItem[]) ?? [])
      setClasses((c.data as ClassItem[]) ?? [])
      setSessionCount(s.count ?? 0)
      const list = (s.data as Session[]) ?? []
      if (list.length) {
        const { data: resp } = await supabase.from('responses').select('session_id, question_index, card_number, answer').in('session_id', list.map((x) => x.id))
        setSessions(list.map((x) => {
          const st = sessionStats(x, ((resp ?? []) as Response[]).filter((r) => r.session_id === x.id))
          return { ...x, avg: st.avg, participants: st.participants }
        }))
      } else setSessions([])
    }
    load()
  }, [])

  const studentTotal = classes?.reduce((a, c) => a + (c.students[0]?.count ?? 0), 0) ?? 0
  const live = sessions?.find((s) => s.status === 'live')
  const loading = quizzes === null || classes === null || sessions === null

  const steps = [
    { done: (classes?.length ?? 0) > 0 && studentTotal > 0, label: 'Buat kelas & isi nama siswa', to: '/kelas', icon: Users },
    { done: localStorage.getItem('qz-printed') === '1', label: 'Cetak kartu jawaban', to: '/kartu', icon: Printer },
    { done: (quizzes?.some((q) => (q.questions[0]?.count ?? 0) > 0)) ?? false, label: 'Buat kuis & soal', to: '/kuis', icon: BookOpenCheck },
    { done: sessionCount > 0, label: 'Mulai ulangan pertama', to: '/mulai', icon: Play },
  ]
  const doneCount = steps.filter((s) => s.done).length

  const stats = [
    { label: 'Kuis', value: quizzes?.length, icon: BookOpenCheck, color: 'from-brand-400 to-brand-600', to: '/kuis' },
    { label: 'Kelas', value: classes?.length, icon: Users, color: 'from-sky-400 to-indigo-500', to: '/kelas' },
    { label: 'Siswa', value: studentTotal, icon: Sparkles, color: 'from-amber-300 to-orange-500', to: '/kelas' },
    { label: 'Ulangan', value: sessionCount, icon: History, color: 'from-rose-400 to-pink-600', to: '/riwayat' },
  ]

  return (
    <Layout>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-700 via-brand-800 to-brand-950 p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -top-24 -right-16 size-72 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-brand-200">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{hijriDate() && ` · ${hijriDate()}`}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}, Bu! 👋</h1>
            <p className="mt-2 max-w-lg text-brand-100">Siap mengadakan ulangan hari ini? Pilih kuis, bagikan kartu, lalu pindai.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/mulai" variant="accent" size="lg" icon={Play}>Mulai Ulangan</ButtonLink>
            <button onClick={createQuiz} className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white/10 px-5 font-semibold ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-[0.97]">
              <Plus className="size-5" /> Kuis Baru
            </button>
          </div>
        </div>
      </motion.div>

      {/* Ulangan yang masih berlangsung */}
      {live && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <Link to={`/sesi/${live.id}`} className="group mt-4 flex items-center gap-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 transition hover:bg-amber-100">
            <span className="relative grid size-11 place-items-center rounded-xl bg-amber-400 text-amber-950">
              <Radio className="size-5" />
              <span className="absolute -top-1 -right-1 size-3 animate-ping rounded-full bg-rose-500" />
              <span className="absolute -top-1 -right-1 size-3 rounded-full bg-rose-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">Sedang berlangsung</p>
              <p className="truncate font-bold text-slate-900">{live.quiz_title} · Kelas {live.class_name}</p>
            </div>
            <span className="hidden items-center gap-1 font-semibold text-amber-800 sm:flex">Lanjutkan <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
          </Link>
        </motion.div>
      )}

      {/* Statistik */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <Link to={s.to}>
              <Card className="group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
                <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-lg', s.color)}>
                  <s.icon className="size-6" />
                </span>
                <div>
                  {loading ? <Skeleton className="h-7 w-10" /> : <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>}
                  <p className="text-sm font-medium text-slate-500">{s.label}</p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        {/* Ulangan terakhir */}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Ulangan terakhir</h2>
            <Link to="/riwayat" className="text-sm font-semibold text-brand-700 hover:underline">Lihat semua</Link>
          </div>
          {sessions === null ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Belum ada ulangan. Nilai siswa akan muncul di sini setelah ulangan pertama.
            </div>
          ) : (
            <ul className="-mx-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link to={s.status === 'live' ? `/sesi/${s.id}` : `/sesi/${s.id}/laporan`}
                    className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br text-white', coverGradient(s.quiz_title))}>
                      <BookOpenCheck className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{s.quiz_title}</p>
                      <p className="truncate text-xs text-slate-500">Kelas {s.class_name} · {formatDate(s.created_at)}</p>
                    </div>
                    {s.status === 'live' ? <Badge tone="amber">● Berlangsung</Badge> : s.participants ? (
                      <div className="text-right">
                        <Badge tone={scoreTone(s.avg ?? 0)} className="text-sm">{s.avg}</Badge>
                        <p className="mt-0.5 text-[11px] text-slate-400">rata-rata</p>
                      </div>
                    ) : <Badge>Tanpa jawaban</Badge>}
                    <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Panduan mulai */}
        <Card className="p-5 sm:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Langkah persiapan</h2>
            <span className="text-sm font-bold text-brand-700">{doneCount}/4</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600" initial={{ width: 0 }} animate={{ width: `${doneCount * 25}%` }} transition={{ duration: 0.8 }} />
          </div>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link to={s.to} className="group flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-slate-50">
                  {s.done ? <CheckCircle2 className="size-6 shrink-0 text-brand-500" /> : <Circle className="size-6 shrink-0 text-slate-300" />}
                  <span className={cn('flex-1 text-sm font-semibold', s.done ? 'text-slate-400 line-through' : 'text-slate-800')}>
                    {i + 1}. {s.label}
                  </span>
                  <s.icon className="size-4 text-slate-300 group-hover:text-brand-600" />
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
            <p className="font-bold">💡 Cara main</p>
            <p className="mt-1 text-brand-800">Siswa mengangkat kartu. <b>Huruf yang ada di atas</b> adalah jawabannya. Guru cukup mengarahkan kamera HP ke kelas.</p>
          </div>
        </Card>
      </div>

      {/* Kuis terbaru */}
      {quizzes && quizzes.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Kuis terbaru</h2>
            <Link to="/kuis" className="text-sm font-semibold text-brand-700 hover:underline">Semua kuis</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quizzes.slice(0, 4).map((q) => (
              <Link key={q.id} to={`/kuis/${q.id}`} className="group">
                <Card className="overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-lift">
                  <div className={cn('relative h-20 bg-linear-to-br', coverGradient(q.title))}>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 font-bold text-slate-900">{q.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{q.questions[0]?.count ?? 0} soal</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  )
}
