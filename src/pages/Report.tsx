import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowDownWideNarrow, BarChart3, FileSpreadsheet, Hash, Printer, Radio, Target, Trash2, TrendingDown, TrendingUp, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { Badge, Button, Card, PageHeader, Spinner, OPTION_STYLES, cn } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { Menu } from './Quizzes'
import { supabase } from '../lib/supabase'
import type { Response, Session } from '../lib/types'
import { LETTERS, errorMessage, formatDate } from '../lib/util'
import { downloadWorkbook } from '../lib/excel'
import { scoreTone, sessionStats } from '../lib/stats'

const BINS = [
  { label: '<50', min: 0, max: 49 }, { label: '50–59', min: 50, max: 59 }, { label: '60–69', min: 60, max: 69 },
  { label: '70–79', min: 70, max: 79 }, { label: '80–89', min: 80, max: 89 }, { label: '90–100', min: 90, max: 100 },
]

const readKkm = () => { try { return Number(localStorage.getItem('qz-kkm')) || 75 } catch { return 75 } }

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const [session, setSession] = useState<Session | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<'card' | 'score'>('card')
  const [kkm, setKkm] = useState(readKkm)

  useEffect(() => {
    Promise.all([
      supabase.from('sessions').select('*').eq('id', id!).single(),
      supabase.from('responses').select('*').eq('session_id', id!),
    ]).then(([s, r]) => {
      if (s.error) return setError(errorMessage(s.error))
      setSession(s.data as Session)
      setResponses((r.data as Response[]) ?? [])
    })
  }, [id])

  const st = useMemo(() => (session ? sessionStats(session, responses) : null), [session, responses])

  const changeKkm = (v: number) => {
    const n = Math.max(0, Math.min(100, v || 0))
    setKkm(n)
    try { localStorage.setItem('qz-kkm', String(n)) } catch { /* abaikan */ }
  }

  if (error) return <Layout><p className="text-rose-600">{error}</p></Layout>
  if (!session || !st) return <Layout><Spinner /></Layout>

  const participants = st.rows.filter((r) => r.answered)
  const passed = participants.filter((r) => r.score >= kkm).length
  const rows = [...st.rows].sort((a, b) => (sortBy === 'score' ? b.score - a.score || a.card_number - b.card_number : a.card_number - b.card_number))
  const bins = BINS.map((b) => participants.filter((r) => r.score >= b.min && r.score <= b.max).length)
  const binMax = Math.max(1, ...bins)

  async function exportExcel() {
    const s = session!
    const head = ['No. Kartu', 'Nama', ...s.questions.map((_, i) => `S${i + 1}`), 'Benar', 'Nilai', `Tuntas (KKM ${kkm})`]
    const keyRow = ['', 'KUNCI', ...s.questions.map((q) => LETTERS[q.correct]), '', '', '']
    const body = st!.rows.map((r) => [r.card_number, r.name, ...r.answers.map((a) => (a === undefined ? '-' : LETTERS[a])), r.correct, r.answered ? r.score : '-', r.answered ? (r.score >= kkm ? 'Tuntas' : 'Belum') : '-'])
    const summary = s.questions.map((q, i) => [i + 1, q.text, LETTERS[q.correct], st!.perQuestion[i].answered, st!.perQuestion[i].right, `${st!.perQuestion[i].pct}%`])
    await downloadWorkbook(`Nilai ${s.quiz_title} - Kelas ${s.class_name}.xlsx`.replace(/[\\/:*?"<>|]/g, '-'), [
      { name: 'Nilai', rows: [[`${s.quiz_title} – Kelas ${s.class_name}`], [formatDate(s.created_at)], [], head, keyRow, ...body, [], ['', 'Rata-rata kelas', ...s.questions.map(() => ''), '', st!.avg]], cols: [10, 28, ...s.questions.map(() => 5), 8, 8, 14] },
      { name: 'Analisis Soal', rows: [['No', 'Soal', 'Kunci', 'Menjawab', 'Benar', '% Benar'], ...summary], cols: [5, 60, 7, 10, 8, 9] },
    ])
    toast('File Excel diunduh')
  }

  async function remove() {
    if (!(await confirm({ title: 'Hapus riwayat ulangan ini?', message: 'Semua nilai di ulangan ini akan hilang permanen.', danger: true, confirmText: 'Hapus' }))) return
    const { error } = await supabase.from('sessions').delete().eq('id', id!)
    if (error) return toast(errorMessage(error), 'error')
    toast('Riwayat dihapus')
    navigate('/riwayat')
  }

  const statCards = [
    { label: 'Rata-rata', value: st.avg, icon: BarChart3, color: 'from-brand-400 to-brand-600' },
    { label: 'Tertinggi', value: st.max, icon: TrendingUp, color: 'from-sky-400 to-indigo-500' },
    { label: 'Terendah', value: st.min, icon: TrendingDown, color: 'from-rose-400 to-pink-600' },
    { label: `Tuntas (≥${kkm})`, value: `${passed}/${participants.length}`, icon: Target, color: 'from-amber-300 to-orange-500' },
  ]

  return (
    <Layout wide>
      <PageHeader back="/riwayat" title={session.quiz_title} icon={BarChart3}
        subtitle={<>Kelas {session.class_name} · {session.questions.length} soal · {formatDate(session.created_at)}</>}
        actions={
          <>
            {session.status === 'live' && <Link to={`/sesi/${id}`}><Badge tone="amber" className="py-2"><Radio className="size-3.5" /> Masih berlangsung, buka</Badge></Link>}
            <Button variant="secondary" icon={Printer} onClick={() => window.print()} className="max-sm:hidden">Cetak</Button>
            <Button icon={FileSpreadsheet} onClick={exportExcel}>Unduh Excel</Button>
            <Menu items={[{ label: 'Hapus riwayat', icon: Trash2, onClick: remove, danger: true }]} />
          </>
        } />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="flex items-center gap-4 p-4 sm:p-5">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-lg', s.color)}><s.icon className="size-6" /></span>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{participants.length ? s.value : '–'}</p>
                <p className="text-sm font-medium text-slate-500">{s.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        {/* Tabel nilai */}
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="font-extrabold text-slate-900">Nilai siswa <span className="font-semibold text-slate-400">({participants.length}/{session.students.length} ikut)</span></h2>
            <div className="flex items-center gap-2 no-print">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                KKM
                <input type="number" value={kkm} onChange={(e) => changeKkm(Number(e.target.value))} className="h-9 w-16 rounded-lg px-2 text-center font-bold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" />
              </label>
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                <button onClick={() => setSortBy('card')} className={cn('flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition', sortBy === 'card' ? 'bg-white text-slate-900 shadow' : 'text-slate-500')}><Hash className="size-3.5" />No.</button>
                <button onClick={() => setSortBy('score')} className={cn('flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition', sortBy === 'score' ? 'bg-white text-slate-900 shadow' : 'text-slate-500')}><ArrowDownWideNarrow className="size-3.5" />Nilai</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase">
                  <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-bold">Siswa</th>
                  {session.questions.map((q, i) => <th key={i} title={q.text} className="px-1 py-3 text-center font-bold">{i + 1}</th>)}
                  <th className="px-3 py-3 text-center font-bold">Nilai</th>
                </tr>
                <tr className="bg-brand-50/60 text-xs font-extrabold text-brand-800">
                  <td className="sticky left-0 z-10 bg-brand-50 px-4 py-1.5">Kunci</td>
                  {session.questions.map((q, i) => <td key={i} className="px-1 py-1.5 text-center">{LETTERS[q.correct]}</td>)}
                  <td />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.card_number} className={cn('hover:bg-slate-50/70', !r.answered && 'opacity-50')}>
                    <td className="sticky left-0 z-10 max-w-48 bg-white px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 min-w-6 place-items-center rounded-md bg-slate-100 text-[11px] font-extrabold text-slate-500">{r.card_number}</span>
                        <span className="truncate font-semibold text-slate-800">{r.name}</span>
                      </div>
                    </td>
                    {r.answers.map((a, i) => {
                      const ok = a === session.questions[i].correct
                      return (
                        <td key={i} className="px-0.5 py-1.5 text-center">
                          <span className={cn('inline-grid size-7 place-items-center rounded-md text-xs font-extrabold',
                            a === undefined ? 'text-slate-300' : ok ? 'bg-brand-100 text-brand-800' : 'bg-rose-100 text-rose-700')}>
                            {a === undefined ? '·' : LETTERS[a]}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-1.5 text-center">
                      {r.answered ? <Badge tone={scoreTone(r.score, kkm)} className="min-w-11 justify-center text-sm">{r.score}</Badge> : <span className="text-xs text-slate-400">absen</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Sebaran nilai */}
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold text-slate-900"><Users className="size-4.5 text-brand-600" /> Sebaran nilai</h2>
            <div className="flex h-40 gap-2">
              {bins.map((n, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-bold text-slate-600">{n || ''}</span>
                  <motion.div className={cn('w-full rounded-t-lg', BINS[i].min >= kkm ? 'bg-brand-500' : BINS[i].max >= kkm ? 'bg-sky-400' : 'bg-rose-300')}
                    initial={{ height: 0 }} animate={{ height: `${(n / binMax) * 75}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} style={{ minHeight: n ? 6 : 2 }} />
                  <span className="text-[10px] font-semibold text-slate-400">{BINS[i].label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Analisis soal */}
          <Card className="p-5">
            <h2 className="font-extrabold text-slate-900">Analisis soal</h2>
            <p className="mb-4 text-xs text-slate-500">Soal dengan persentase benar rendah mungkin perlu dijelaskan ulang.</p>
            <ul className="space-y-3">
              {session.questions.map((q, i) => {
                const pq = st.perQuestion[i]
                return (
                  <li key={i}>
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-extrabold text-slate-600">{i + 1}</span>
                      <span dir="auto" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700" title={q.text}>{q.text || '(gambar)'}</span>
                      <span className={cn('text-sm font-extrabold', pq.pct >= 75 ? 'text-brand-600' : pq.pct >= 50 ? 'text-amber-600' : 'text-rose-600')}>{pq.answered ? `${pq.pct}%` : '–'}</span>
                    </div>
                    {pq.answered > 0 && (
                      <div className="mt-1.5 ml-8 flex h-2 overflow-hidden rounded-full bg-slate-100" title={pq.dist.map((d, k) => `${LETTERS[k]}: ${d}`).join(' · ')}>
                        {pq.dist.map((d, k) => d > 0 && (
                          <div key={k} className={cn(OPTION_STYLES[k].bg, k !== q.correct && 'opacity-40')} style={{ width: `${(d / pq.answered) * 100}%` }} />
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
