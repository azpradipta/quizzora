import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronRight, History as HistoryIcon, Play } from 'lucide-react'
import Layout from '../components/Layout'
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Skeleton, cn, coverGradient } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { Response, Session } from '../lib/types'
import { formatDate } from '../lib/util'
import { scoreTone, sessionStats } from '../lib/stats'

type Item = Session & { avg: number; participants: number }

export default function History() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [cls, setCls] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(200)
      const list = (data as Session[]) ?? []
      const { data: resp } = list.length
        ? await supabase.from('responses').select('session_id, question_index, card_number, answer').in('session_id', list.map((s) => s.id))
        : { data: [] }
      setItems(list.map((s) => {
        const st = sessionStats(s, ((resp ?? []) as Response[]).filter((r) => r.session_id === s.id))
        return { ...s, avg: st.avg, participants: st.participants }
      }))
    }
    load()
  }, [])

  const classNames = useMemo(() => [...new Set(items?.map((i) => i.class_name))].sort(), [items])
  const shown = items?.filter((i) => !cls || i.class_name === cls)

  return (
    <Layout>
      <PageHeader title="Riwayat Ulangan" subtitle="Semua ulangan yang pernah diadakan beserta nilainya." icon={HistoryIcon} />

      {classNames.length > 1 && (
        <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
          {['', ...classNames].map((c) => (
            <button key={c || 'all'} onClick={() => setCls(c)}
              className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition', cls === c ? 'bg-brand-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>
              {c ? `Kelas ${c}` : 'Semua kelas'}
            </button>
          ))}
        </div>
      )}

      {items === null ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="Belum ada ulangan" description="Setelah ulangan pertama selesai, nilai siswa tersimpan di sini."
          action={<ButtonLink to="/mulai" icon={Play}>Mulai Ulangan</ButtonLink>} />
      ) : (
        <div className="space-y-3">
          {shown!.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <Link to={s.status === 'live' ? `/sesi/${s.id}` : `/sesi/${s.id}/laporan`} className="group block">
                <Card className="flex items-center gap-4 p-4 transition group-hover:shadow-lift">
                  <span className={cn('hidden size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-lg font-extrabold text-white sm:grid', coverGradient(s.quiz_title))}>
                    {s.class_name.slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{s.quiz_title}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      Kelas {s.class_name} · {s.questions.length} soal · {s.participants}/{s.students.length} siswa · {formatDate(s.created_at)}
                    </p>
                  </div>
                  {s.status === 'live' ? (
                    <Badge tone="amber">● Berlangsung</Badge>
                  ) : s.participants ? (
                    <div className="flex flex-col items-center">
                      <Badge tone={scoreTone(s.avg)} className="px-3 text-base">{s.avg}</Badge>
                      <span className="mt-0.5 text-[11px] text-slate-400">rata-rata</span>
                    </div>
                  ) : <Badge>Kosong</Badge>}
                  <ChevronRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  )
}
