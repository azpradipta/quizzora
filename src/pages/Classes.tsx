import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronRight, Plus, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { Avatar, Button, Card, EmptyState, PageHeader, Skeleton } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/util'

type ClassItem = { id: string; name: string; students: { name: string }[] }

export function useCreateClass() {
  const navigate = useNavigate()
  const { prompt, toast } = useFeedback()
  return async () => {
    const name = await prompt({ title: 'Kelas baru', label: 'Nama kelas', placeholder: 'mis. 4A', confirmText: 'Buat kelas' })
    if (!name) return
    const { data, error } = await supabase.from('classes').insert({ name }).select().single()
    if (error) return toast(errorMessage(error), 'error')
    navigate(`/kelas/${data.id}`)
  }
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassItem[] | null>(null)
  const createClass = useCreateClass()

  useEffect(() => {
    supabase.from('classes').select('id, name, students(name)').order('name')
      .then(({ data }) => setClasses((data as ClassItem[]) ?? []))
  }, [])

  return (
    <Layout>
      <PageHeader title="Kelas" subtitle="Setiap siswa memegang kartu dengan nomor tetap." icon={Users}
        actions={<Button icon={Plus} onClick={createClass}>Kelas Baru</Button>} />

      {classes === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : classes.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada kelas" description="Buat kelas lalu tempel daftar nama siswa. Nomor kartu dibagikan otomatis."
          action={<Button icon={Plus} onClick={createClass}>Buat Kelas Pertama</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/kelas/${c.id}`} className="group block">
                <Card className="p-5 transition group-hover:-translate-y-1 group-hover:shadow-lift">
                  <div className="flex items-center gap-4">
                    <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-700 text-xl font-extrabold text-white shadow-lg shadow-brand-900/20">
                      {c.name.slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold text-slate-900">Kelas {c.name}</p>
                      <p className="text-sm text-slate-500">{c.students.length} siswa</p>
                    </div>
                    <ChevronRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
                  </div>
                  <div className="mt-4 flex items-center">
                    <div className="flex -space-x-2">
                      {c.students.slice(0, 6).map((s, k) => <Avatar key={k} name={s.name} className="size-8 text-[11px]" />)}
                    </div>
                    {c.students.length > 6 && <span className="ml-2 text-xs font-semibold text-slate-500">+{c.students.length - 6} lainnya</span>}
                    {c.students.length === 0 && <span className="text-xs font-semibold text-amber-600">Belum ada siswa, klik untuk menambahkan</span>}
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
      {classes && classes.length > 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">
          💡 Kartu bisa dipakai bergantian antarkelas (kartu no. 5 di kelas 4A dan 4B boleh sama).
        </p>
      )}
    </Layout>
  )
}
