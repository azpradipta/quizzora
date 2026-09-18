import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle, ArrowDown, ArrowUp, Check, CheckCircle2, CloudOff, Copy, FileSpreadsheet, ImagePlus, Loader2, Play, Plus,
  ToggleLeft, Trash2, X,
} from 'lucide-react'
import Layout from '../components/Layout'
import { Badge, Button, ButtonLink, Card, OPTION_STYLES, Spinner, cn } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { Menu } from './Quizzes'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Question } from '../lib/types'
import { LETTERS, errorMessage } from '../lib/util'
import { downloadQuestionTemplate, readQuestionsFile } from '../lib/excel'

type Draft = Omit<Question, 'quiz_id' | 'position'>
type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const blank = (): Draft => ({ id: crypto.randomUUID(), text: '', image_url: null, options: ['', '', '', ''], correct: 0 })
const trueFalse = (): Draft => ({ ...blank(), options: ['Benar', 'Salah', '', ''] })

/** Soal siap dipakai: ada pertanyaan/gambar, ≥2 pilihan, dan kuncinya terisi. */
export function questionProblem(q: Pick<Draft, 'text' | 'image_url' | 'options' | 'correct'>): string | null {
  if (!q.text.trim() && !q.image_url) return 'Pertanyaan masih kosong'
  if (q.options.filter((o) => o.trim()).length < 2) return 'Isi minimal 2 pilihan'
  if (!q.options[q.correct]?.trim()) return `Kunci ${LETTERS[q.correct]} belum diisi`
  return null
}

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { confirm, toast } = useFeedback()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Draft[] | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const savedIds = useRef<string[]>([])
  const latest = useRef({ title, questions })
  latest.current = { title, questions }
  const saving = useRef(false)

  useEffect(() => {
    Promise.all([
      supabase.from('quizzes').select('*').eq('id', id!).single(),
      supabase.from('questions').select('*').eq('quiz_id', id!).order('position'),
    ]).then(([q, qs]) => {
      if (q.error) return setLoadError(errorMessage(q.error))
      setTitle(q.data.title)
      const rows = (qs.data as Question[]) ?? []
      savedIds.current = rows.map((r) => r.id)
      setQuestions(rows.length ? rows : [blank()])
      if (!rows.length) setSaveState('dirty')
    })
  }, [id])

  const save = useCallback(async () => {
    if (saving.current) return
    saving.current = true
    setSaveState('saving')
    const { title, questions } = latest.current
    try {
      const ids = questions!.map((q) => q.id)
      const removed = savedIds.current.filter((x) => !ids.includes(x))
      const r1 = await supabase.from('quizzes').update({ title: title.trim() || 'Tanpa judul', updated_at: new Date().toISOString() }).eq('id', id!)
      if (r1.error) throw r1.error
      if (removed.length) {
        const r2 = await supabase.from('questions').delete().in('id', removed)
        if (r2.error) throw r2.error
      }
      if (questions!.length) {
        const r3 = await supabase.from('questions').upsert(questions!.map((q, position) => ({
          id: q.id, quiz_id: id, position, text: q.text, image_url: q.image_url, options: q.options, correct: q.correct,
        })))
        if (r3.error) throw r3.error
      }
      savedIds.current = ids
      // Ada perubahan baru selama menyimpan? Simpan lagi setelah ini.
      const changed = latest.current.questions !== questions || latest.current.title !== title
      setSaveState(changed ? 'dirty' : 'saved')
      if (changed) setTimeout(() => saveRef.current(), 600)
    } catch (e) {
      setSaveState('error')
      toast('Gagal menyimpan: ' + errorMessage(e), 'error')
    } finally {
      saving.current = false
    }
  }, [id, toast])
  const saveRef = useRef(save)
  saveRef.current = save

  // Simpan otomatis 1 detik setelah berhenti mengetik
  useEffect(() => {
    if (saveState !== 'dirty') return
    const t = setTimeout(save, 1000)
    return () => clearTimeout(t)
  }, [saveState, title, questions, save])

  useEffect(() => {
    if (saveState === 'saved') return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveState])

  const mutate = (fn: (qs: Draft[]) => Draft[]) => {
    setQuestions((qs) => fn(qs!))
    setSaveState('dirty')
  }
  const update = (qid: string, patch: Partial<Draft>) => mutate((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)))
  const move = (i: number, d: number) => mutate((qs) => {
    const next = [...qs]
    const [item] = next.splice(i, 1)
    next.splice(i + d, 0, item)
    return next
  })
  const add = (factory: () => Draft) => {
    const q = factory()
    mutate((qs) => [...qs, q])
    setTimeout(() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }
  const duplicateQ = (i: number) => mutate((qs) => {
    const next = [...qs]
    next.splice(i + 1, 0, { ...qs[i], id: crypto.randomUUID(), options: [...qs[i].options] })
    return next
  })
  const remove = async (i: number) => {
    const q = questions![i]
    if ((q.text || q.options.some(Boolean)) && !(await confirm({ title: `Hapus soal nomor ${i + 1}?`, danger: true, confirmText: 'Hapus' }))) return
    mutate((qs) => qs.filter((_, j) => j !== i))
  }

  async function deleteQuiz() {
    if (!(await confirm({ title: `Hapus kuis “${title}”?`, message: 'Semua soal ikut terhapus. Riwayat ulangan tetap tersimpan.', danger: true, confirmText: 'Hapus kuis' }))) return
    const { error } = await supabase.from('quizzes').delete().eq('id', id!)
    if (error) return toast(errorMessage(error), 'error')
    setSaveState('saved')
    toast('Kuis dihapus')
    navigate('/kuis')
  }

  async function uploadImage(qid: string, file: File) {
    if (file.size > 5 * 1024 * 1024) return toast('Ukuran gambar maksimal 5 MB', 'error')
    setUploading(qid)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${session!.user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('question-images').upload(path, file, { contentType: file.type })
    setUploading(null)
    if (error) return toast('Gagal mengunggah gambar: ' + errorMessage(error), 'error')
    update(qid, { image_url: supabase.storage.from('question-images').getPublicUrl(path).data.publicUrl })
  }

  async function importExcel(file: File) {
    try {
      const imported = await readQuestionsFile(file)
      if (!imported.length) return toast('Tidak ada soal yang terbaca di file itu', 'error')
      mutate((qs) => {
        const onlyBlank = qs.length === 1 && !qs[0].text && qs[0].options.every((o) => !o)
        return [...(onlyBlank ? [] : qs), ...imported.map((q) => ({ ...blank(), ...q }))]
      })
      toast(`${imported.length} soal berhasil diimpor`)
    } catch (e) {
      toast('Gagal membaca Excel: ' + errorMessage(e), 'error')
    }
  }

  if (loadError) return <Layout><p className="text-rose-600">{loadError}</p></Layout>
  if (!questions) return <Layout><Spinner /></Layout>

  const problems = questions.map(questionProblem)
  const readyCount = problems.filter((p) => !p).length

  return (
    <Layout wide>
      {/* Header lengket */}
      <div className="sticky top-16.25 z-20 -mx-4 mb-6 border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/kuis" className="text-sm font-semibold text-slate-500 hover:text-brand-700">← Kuis</Link>
          <input value={title} onChange={(e) => { setTitle(e.target.value); setSaveState('dirty') }}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-xl font-extrabold tracking-tight text-slate-900 outline-none hover:bg-white focus:bg-white focus:ring-2 focus:ring-brand-500/30 sm:text-2xl"
            placeholder="Judul kuis" aria-label="Judul kuis" />
          <SaveIndicator state={saveState} onRetry={save} />
          <Menu items={[
            { label: 'Impor Excel', icon: FileSpreadsheet, onClick: () => fileInput.current?.click() },
            { label: 'Template Excel', icon: FileSpreadsheet, onClick: downloadQuestionTemplate },
            { label: 'Hapus kuis', icon: Trash2, onClick: deleteQuiz, danger: true },
          ]} />
          <ButtonLink to={`/mulai/${id}`} icon={Play} disabled={readyCount === 0 || saveState !== 'saved'}>Mulai</ButtonLink>
        </div>
        <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel(f); e.target.value = '' }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Navigator soal */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 uppercase">Soal · {readyCount}/{questions.length} siap</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  title={problems[i] ?? 'Siap'}
                  className={cn('grid aspect-square place-items-center rounded-lg text-sm font-bold transition hover:scale-110',
                    problems[i] ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' : 'bg-brand-600 text-white')}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button onClick={() => fileInput.current?.click()} className="mt-5 flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-white">
              <FileSpreadsheet className="size-5 text-brand-600" /> Impor soal dari Excel
            </button>
            <button onClick={downloadQuestionTemplate} className="mt-1 w-full px-3 text-left text-xs font-semibold text-brand-700 hover:underline">Unduh template</button>
          </div>
        </aside>

        <div className="min-w-0">
          <AnimatePresence initial={false}>
            {questions.map((q, i) => (
              <motion.div key={q.id} id={`q-${q.id}`} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ layout: { duration: 0.25 } }} className="mb-4">
                <Card className="p-4 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-brand-600 font-extrabold text-white">{i + 1}</span>
                    {problems[i] ? <Badge tone="amber"><AlertCircle className="size-3" />{problems[i]}</Badge> : <Badge tone="brand"><Check className="size-3" />Siap</Badge>}
                    <div className="flex-1" />
                    <IconBtn title="Naikkan" disabled={i === 0} onClick={() => move(i, -1)} icon={ArrowUp} />
                    <IconBtn title="Turunkan" disabled={i === questions.length - 1} onClick={() => move(i, 1)} icon={ArrowDown} />
                    <IconBtn title="Duplikat" onClick={() => duplicateQ(i)} icon={Copy} />
                    <IconBtn title="Hapus" onClick={() => remove(i)} icon={Trash2} danger />
                  </div>

                  <textarea dir="auto" rows={2} placeholder="Tulis pertanyaan di sini…" value={q.text}
                    onChange={(e) => update(q.id, { text: e.target.value })}
                                        className="min-h-14 w-full resize-none rounded-xl border-0 bg-slate-50 [field-sizing:content] px-4 py-3 text-lg font-semibold text-slate-900 ring-1 ring-slate-200 transition outline-none placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500" />

                  <div className="mt-3">
                    {q.image_url ? (
                      <div className="group relative inline-block">
                        <img src={q.image_url} alt="" className="max-h-52 rounded-xl ring-1 ring-slate-200" />
                        <button onClick={() => update(q.id, { image_url: null })} className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-slate-900/70 text-white opacity-0 transition group-hover:opacity-100" aria-label="Hapus gambar">
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-brand-700">
                        {uploading === q.id ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                        {uploading === q.id ? 'Mengunggah…' : 'Tambah gambar'}
                        <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(q.id, f); e.target.value = '' }} />
                      </label>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {q.options.map((o, k) => {
                      const isKey = q.correct === k
                      const st = OPTION_STYLES[k]
                      return (
                        <div key={k} className={cn('group/opt flex items-center gap-2 rounded-2xl p-1.5 pr-3 ring-2 transition',
                          isKey ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 focus-within:ring-slate-300')}>
                          <button type="button" onClick={() => update(q.id, { correct: k })} title="Jadikan kunci jawaban"
                            className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-lg font-extrabold text-white transition hover:scale-105', st.bg)}>
                            {LETTERS[k]}
                          </button>
                          <input dir="auto" value={o} placeholder={k < 2 ? `Pilihan ${LETTERS[k]}` : `Pilihan ${LETTERS[k]} (opsional)`}
                            onChange={(e) => update(q.id, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })}
                            className="min-w-0 flex-1 bg-transparent py-2 font-medium text-slate-800 outline-none placeholder:text-slate-400" />
                          <button type="button" onClick={() => update(q.id, { correct: k })}
                            className={cn('grid size-7 shrink-0 place-items-center rounded-full transition',
                              isKey ? 'bg-brand-600 text-white' : 'text-slate-300 ring-2 ring-slate-200 hover:text-brand-500 hover:ring-brand-300')}
                            aria-label="Kunci jawaban">
                            <Check className="size-4" strokeWidth={3} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Klik huruf atau tanda ✓ untuk menandai kunci jawaban. Pilihan C & D boleh dikosongkan.</p>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => add(blank)} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 py-5 font-bold text-brand-700 transition hover:border-brand-500 hover:bg-brand-50">
              <Plus className="size-5" /> Soal Pilihan Ganda
            </button>
            <button onClick={() => add(trueFalse)} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-5 font-bold text-slate-600 transition hover:border-slate-400 hover:bg-white">
              <ToggleLeft className="size-5" /> Soal Benar / Salah
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">Teks Arab (ayat, doa) bisa langsung diketik atau ditempel.</p>
        </div>
      </div>
    </Layout>
  )
}

function IconBtn({ icon: Icon, danger, ...rest }: { icon: typeof Copy; danger?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} aria-label={rest.title}
      className={cn('grid size-9 place-items-center rounded-lg text-slate-400 transition disabled:opacity-30', danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-700')}>
      <Icon className="size-4.5" />
    </button>
  )
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'error') {
    return <Button variant="ghost" size="sm" icon={CloudOff} onClick={onRetry} className="text-rose-600">Gagal, coba lagi</Button>
  }
  return (
    <span className={cn('flex items-center gap-1.5 text-sm font-semibold', state === 'saved' ? 'text-brand-600' : 'text-slate-400')}>
      {state === 'saved' ? <CheckCircle2 className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
      <span className="hidden sm:inline">{state === 'saved' ? 'Tersimpan' : 'Menyimpan…'}</span>
    </span>
  )
}
