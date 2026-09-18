import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Hand, Info, Printer, RotateCw } from 'lucide-react'
import Layout from '../components/Layout'
import { Button, Card, PageHeader, cn } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { ClassRow, Student } from '../lib/types'
import { MAX_CARDS, markerSvg } from '../scan/markers'

type PerPage = 1 | 2 | 4
interface CardSpec { number: number; name?: string }

const LAYOUTS: { value: PerPage; label: string; hint: string }[] = [
  { value: 1, label: '1 / halaman', hint: 'Paling besar, kelas luas' },
  { value: 2, label: '2 / halaman', hint: 'Disarankan' },
  { value: 4, label: '4 / halaman', hint: 'Hemat kertas' },
]

export default function PrintCards() {
  const [params, setParams] = useSearchParams()
  const classId = params.get('kelas') ?? ''
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [count, setCount] = useState(40)
  const [perPage, setPerPage] = useState<PerPage>(2)

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => setClasses(data ?? []))
  }, [])
  useEffect(() => {
    if (!classId) return setStudents([])
    supabase.from('students').select('*').eq('class_id', classId).order('card_number').then(({ data }) => setStudents(data ?? []))
  }, [classId])

  const cards: CardSpec[] = useMemo(() => classId
    ? students.map((s) => ({ number: s.card_number, name: s.name }))
    : Array.from({ length: Math.min(count, MAX_CARDS) }, (_, i) => ({ number: i + 1 })), [classId, students, count])

  const pages: CardSpec[][] = []
  for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage))

  const print = () => {
    try { localStorage.setItem('qz-printed', '1') } catch { /* abaikan */ }
    window.print()
  }

  return (
    <Layout wide>
      <PageHeader title="Cetak Kartu Jawaban" subtitle={`${cards.length} kartu · ${pages.length} halaman A4`} icon={Printer}
        actions={<Button icon={Printer} onClick={print} disabled={!cards.length}>Cetak sekarang</Button>} />

      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 no-print lg:sticky lg:top-6">
          <Card className="space-y-5 p-5">
            <div>
              <label className="label">Kartu untuk</label>
              <select className="input" value={classId} onChange={(e) => setParams(e.target.value ? { kelas: e.target.value } : {})}>
                <option value="">Nomor saja (tanpa nama)</option>
                {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.name}, dengan nama siswa</option>)}
              </select>
            </div>
            {!classId && (
              <div>
                <label className="label">Jumlah kartu: <span className="text-brand-700">{count}</span></label>
                <input type="range" min={1} max={MAX_CARDS} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-brand-600" />
              </div>
            )}
            <div>
              <span className="label">Ukuran kartu</span>
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map((l) => (
                  <button key={l.value} onClick={() => setPerPage(l.value)}
                    className={cn('rounded-xl p-2.5 text-left ring-2 transition', perPage === l.value ? 'bg-brand-50 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300')}>
                    <span className={cn('mb-2 grid h-12 gap-0.5 rounded-md bg-white p-1 ring-1 ring-slate-200', l.value === 4 ? 'grid-cols-2' : 'grid-cols-1')}>
                      {Array.from({ length: l.value }, (_, i) => <span key={i} className="rounded-sm bg-slate-800" />)}
                    </span>
                    <span className="block text-xs font-bold text-slate-800">{l.label}</span>
                    <span className="block text-[10px] text-slate-500">{l.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5 text-sm text-slate-600">
            <p className="flex gap-3"><RotateCw className="size-5 shrink-0 text-brand-600" /><span><b className="text-slate-800">Cara menjawab:</b> huruf yang ada di <b>atas</b> saat kartu diangkat adalah jawaban siswa.</span></p>
            <p className="flex gap-3"><Hand className="size-5 shrink-0 text-amber-500" /><span>Jari jangan menutupi kotak hitam. Pegang kartu di bagian pinggir.</span></p>
            <p className="flex gap-3"><Info className="size-5 shrink-0 text-sky-500" /><span>Cetak dengan skala <b>100% / Actual size</b> di kertas HVS atau art paper. Laminasi <b>doff</b> (tidak mengilap) supaya awet dan tidak memantulkan cahaya.</span></p>
          </Card>
        </div>

        <div className={cn('print-area overflow-x-auto rounded-3xl bg-slate-200/60 p-4 sm:p-8 print-only-reset', 'per-' + perPage)}>
          <div className="space-y-6 print-only-reset">
            {pages.map((page, i) => (
              <div key={i} className="print-page shadow-xl">
                {page.map((c) => <AnswerCard key={c.number} {...c} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export function AnswerCard({ number, name }: CardSpec) {
  const svg = useMemo(() => markerSvg(number).replace('<svg ', '<svg width="100%" height="100%" shape-rendering="crispEdges" '), [number])
  return (
    <div className="answer-card">
      <div className="ac-label ac-top"><b>A</b><span>{number}</span></div>
      <div className="ac-label ac-right"><b>B</b><span>{number}</span></div>
      <div className="ac-label ac-bottom"><b>C</b><span>{number}</span></div>
      <div className="ac-label ac-left"><b>D</b><span>{number}</span></div>
      <div className="ac-marker" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="ac-corner">{name ? `${number}. ${name}` : `Kartu ${number}`}</div>
    </div>
  )
}
