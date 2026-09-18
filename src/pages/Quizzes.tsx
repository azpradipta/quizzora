import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpenCheck, Copy, MoreVertical, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import { Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton, coverGradient, cn } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { supabase } from '../lib/supabase'
import type { Question } from '../lib/types'
import { errorMessage, formatDate } from '../lib/util'

type QuizItem = { id: string; title: string; updated_at: string; questions: { count: number }[] }

export function useCreateQuiz() {
  const navigate = useNavigate()
  const { prompt, toast } = useFeedback()
  return useCallback(async () => {
    const title = await prompt({
      title: 'Kuis baru', label: 'Judul kuis', placeholder: 'mis. Ulangan Harian Bab 3 – Kelas 4', confirmText: 'Buat kuis',
    })
    if (!title) return
    const { data, error } = await supabase.from('quizzes').insert({ title }).select().single()
    if (error) return toast(errorMessage(error), 'error')
    navigate(`/kuis/${data.id}`)
  }, [navigate, prompt, toast])
}

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<QuizItem[] | null>(null)
  const [query, setQuery] = useState('')
  const createQuiz = useCreateQuiz()
  const { confirm, toast } = useFeedback()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('quizzes').select('id, title, updated_at, questions(count)').order('updated_at', { ascending: false })
    if (error) toast(errorMessage(error), 'error')
    setQuizzes((data as QuizItem[]) ?? [])
  }, [toast])
  useEffect(() => { load() }, [load])

  async function duplicate(q: QuizItem) {
    const { data: copy, error } = await supabase.from('quizzes').insert({ title: `${q.title} (salinan)` }).select().single()
    if (error) return toast(errorMessage(error), 'error')
    const { data: qs } = await supabase.from('questions').select('*').eq('quiz_id', q.id)
    if (qs?.length) {
      await supabase.from('questions').insert((qs as Question[]).map(({ position, text, image_url, options, correct }) =>
        ({ quiz_id: copy.id, position, text, image_url, options, correct })))
    }
    toast('Kuis berhasil diduplikat')
    load()
  }

  async function remove(q: QuizItem) {
    const ok = await confirm({ title: `Hapus “${q.title}”?`, message: 'Semua soal di kuis ini ikut terhapus. Riwayat ulangan tetap tersimpan.', danger: true, confirmText: 'Hapus' })
    if (!ok) return
    const { error } = await supabase.from('quizzes').delete().eq('id', q.id)
    if (error) return toast(errorMessage(error), 'error')
    setQuizzes((list) => list!.filter((x) => x.id !== q.id))
    toast('Kuis dihapus')
  }

  const filtered = quizzes?.filter((q) => q.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <Layout>
      <PageHeader title="Kuis" subtitle="Bank soal pilihan ganda untuk ulangan dengan kartu." icon={BookOpenCheck}
        actions={<Button icon={Plus} onClick={createQuiz}>Kuis Baru</Button>} />

      {quizzes && quizzes.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" />
          <input className="input pl-11" placeholder="Cari kuis…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {quizzes === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="Belum ada kuis" description="Buat kuis pertama lalu isi soal, atau impor langsung dari Excel."
          action={<Button icon={Plus} onClick={createQuiz}>Buat Kuis Pertama</Button>} />
      ) : filtered!.length === 0 ? (
        <p className="py-10 text-center text-slate-500">Tidak ada kuis yang cocok dengan “{query}”.</p>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered!.map((q, i) => {
              const count = q.questions[0]?.count ?? 0
              return (
                <motion.div key={q.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                  <Card className="group flex h-full flex-col overflow-visible transition hover:-translate-y-1 hover:shadow-lift">
                    <Link to={`/kuis/${q.id}`} className={cn('relative block h-24 overflow-hidden rounded-t-2xl bg-linear-to-br', coverGradient(q.title))}>
                      <span className="absolute bottom-3 left-4 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">{count} soal</span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start gap-2">
                        <Link to={`/kuis/${q.id}`} className="line-clamp-2 flex-1 text-[17px] font-bold text-slate-900 hover:text-brand-700">{q.title}</Link>
                        <Menu items={[
                          { label: 'Edit soal', icon: Pencil, to: `/kuis/${q.id}` },
                          { label: 'Duplikat', icon: Copy, onClick: () => duplicate(q) },
                          { label: 'Hapus', icon: Trash2, onClick: () => remove(q), danger: true },
                        ]} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Diubah {formatDate(q.updated_at)}</p>
                      <div className="mt-auto flex gap-2 pt-4">
                        <ButtonLink to={`/kuis/${q.id}`} variant="secondary" size="sm" icon={Pencil} className="flex-1">Edit</ButtonLink>
                        <ButtonLink to={`/mulai/${q.id}`} size="sm" icon={Play} className="flex-1" disabled={count === 0}>Mulai</ButtonLink>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </Layout>
  )
}

interface MenuItem { label: string; icon: typeof Pencil; to?: string; onClick?: () => void; danger?: boolean }

export function Menu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Menu">
        <MoreVertical className="size-4.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-900/10">
            {items.map((it) => {
              const cls = cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition', it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100')
              return it.to ? (
                <Link key={it.label} to={it.to} className={cls}><it.icon className="size-4" />{it.label}</Link>
              ) : (
                <button key={it.label} className={cls} onClick={() => { setOpen(false); it.onClick?.() }}><it.icon className="size-4" />{it.label}</button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
