import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardPaste, Pencil, Printer, Trash2, UserPlus, Users, X } from 'lucide-react'
import Layout from '../components/Layout'
import { Avatar, Button, ButtonLink, Card, PageHeader, Spinner } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { Menu } from './Quizzes'
import { supabase } from '../lib/supabase'
import type { ClassRow, Student } from '../lib/types'
import { errorMessage } from '../lib/util'
import { MAX_CARDS } from '../scan/markers'

const parseNames = (text: string) => text.split('\n').map((n) => n.replace(/^\s*\d+[.)]?\s+/, '').trim()).filter(Boolean)

export default function ClassEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { confirm, prompt, toast } = useFeedback()
  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [bulk, setBulk] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [c, s] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id!).single(),
      supabase.from('students').select('*').eq('class_id', id!).order('card_number'),
    ])
    if (c.error) return setError(errorMessage(c.error))
    setCls(c.data)
    setStudents(s.data ?? [])
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function rename() {
    const name = await prompt({ title: 'Ganti nama kelas', label: 'Nama kelas', defaultValue: cls!.name })
    if (!name) return
    const { error } = await supabase.from('classes').update({ name }).eq('id', id!)
    if (error) return toast(errorMessage(error), 'error')
    setCls({ ...cls!, name })
    toast('Nama kelas diperbarui')
  }

  async function deleteClass() {
    if (!(await confirm({ title: `Hapus kelas ${cls!.name}?`, message: 'Daftar siswa ikut terhapus. Riwayat ulangan tetap tersimpan.', danger: true, confirmText: 'Hapus kelas' }))) return
    const { error } = await supabase.from('classes').delete().eq('id', id!)
    if (error) return toast(errorMessage(error), 'error')
    toast('Kelas dihapus')
    navigate('/kelas')
  }

  async function addStudents() {
    const names = parseNames(bulk)
    if (!names.length) return
    const used = new Set(students.map((s) => s.card_number))
    const free: number[] = []
    for (let n = 1; n <= MAX_CARDS && free.length < names.length; n++) if (!used.has(n)) free.push(n)
    if (free.length < names.length) return toast(`Maksimal ${MAX_CARDS} siswa per kelas`, 'error')
    setBusy(true)
    const { error } = await supabase.from('students').insert(names.map((name, i) => ({ class_id: id, name, card_number: free[i] })))
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    setBulk('')
    toast(`${names.length} siswa ditambahkan`)
    load()
  }

  async function renameStudent(s: Student, name: string) {
    if (!name.trim() || name.trim() === s.name) return
    const { error } = await supabase.from('students').update({ name: name.trim() }).eq('id', s.id)
    if (error) return toast(errorMessage(error), 'error')
    setStudents((list) => list.map((x) => (x.id === s.id ? { ...x, name: name.trim() } : x)))
    toast('Nama disimpan')
  }

  async function changeCard(s: Student, value: string) {
    const n = Number(value)
    if (n === s.card_number) return
    const other = students.find((x) => x.card_number === n)
    // Tukar nomor bila nomor tujuan sudah dipakai siswa lain
    if (other) {
      const r = await supabase.from('students').update({ card_number: 1000 + s.card_number }).eq('id', s.id)
      if (r.error) return toast(errorMessage(r.error), 'error')
      await supabase.from('students').update({ card_number: s.card_number }).eq('id', other.id)
    }
    const { error } = await supabase.from('students').update({ card_number: n }).eq('id', s.id)
    if (error) toast(errorMessage(error), 'error')
    else toast(other ? `Kartu ditukar dengan ${other.name}` : 'Nomor kartu diperbarui')
    load()
  }

  async function removeStudent(s: Student) {
    if (!(await confirm({ title: `Hapus ${s.name}?`, danger: true, confirmText: 'Hapus' }))) return
    const { error } = await supabase.from('students').delete().eq('id', s.id)
    if (error) return toast(errorMessage(error), 'error')
    setStudents((list) => list.filter((x) => x.id !== s.id))
  }

  if (error) return <Layout><p className="text-rose-600">{error}</p></Layout>
  if (!cls) return <Layout><Spinner /></Layout>

  const pending = parseNames(bulk)

  return (
    <Layout>
      <PageHeader back="/kelas" title={`Kelas ${cls.name}`} subtitle={`${students.length} siswa · maksimal ${MAX_CARDS}`} icon={Users}
        actions={
          <>
            <ButtonLink to={`/kartu?kelas=${id}`} variant="secondary" icon={Printer} disabled={!students.length}>Cetak kartu</ButtonLink>
            <Menu items={[
              { label: 'Ganti nama', icon: Pencil, onClick: rename },
              { label: 'Hapus kelas', icon: Trash2, onClick: deleteClass, danger: true },
            ]} />
          </>
        } />

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-extrabold text-slate-900">Daftar siswa</h2>
            <span className="text-xs font-semibold text-slate-400">Ketuk nama untuk mengubah</span>
          </div>
          {students.length === 0 ? (
            <div className="px-6 py-14 text-center text-slate-500">
              <Users className="mx-auto mb-3 size-10 text-slate-300" />
              Belum ada siswa. Tempel daftar nama di panel sebelah.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              <AnimatePresence initial={false}>
                {students.map((s) => (
                  <motion.li key={s.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                    className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80">
                    <label className="relative" title="Nomor kartu">
                      <span className="sr-only">Nomor kartu</span>
                      <select value={s.card_number} onChange={(e) => changeCard(s, e.target.value)}
                        className="h-10 w-16 cursor-pointer appearance-none rounded-xl bg-brand-50 text-center font-extrabold text-brand-800 ring-1 ring-brand-200 outline-none hover:bg-brand-100 focus:ring-2 focus:ring-brand-500">
                        {Array.from({ length: MAX_CARDS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <Avatar name={s.name} className="hidden sm:grid" />
                    <input defaultValue={s.name} onBlur={(e) => renameStudent(s, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 font-semibold text-slate-800 outline-none hover:bg-white focus:bg-white focus:ring-2 focus:ring-brand-500/30" />
                    <button onClick={() => removeStudent(s)} aria-label="Hapus siswa"
                      className="grid size-9 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100">
                      <X className="size-4.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:sticky lg:top-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><ClipboardPaste className="size-5" /></span>
            <div>
              <h2 className="font-extrabold text-slate-900">Tambah siswa</h2>
              <p className="text-xs text-slate-500">Satu nama per baris, bisa disalin dari Excel</p>
            </div>
          </div>
          <textarea rows={9} value={bulk} onChange={(e) => setBulk(e.target.value)} className="input resize-y font-medium"
            placeholder={'Ahmad Fauzi\nAisyah Putri\nMuhammad Rizki\n…'} />
          <Button className="mt-3 w-full" icon={UserPlus} loading={busy} disabled={!pending.length} onClick={addStudents}>
            {pending.length ? `Tambahkan ${pending.length} siswa` : 'Tambahkan'}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Nomor kartu dibagikan otomatis dan tetap untuk siswa yang sama. Ubah nomor lewat kotak hijau. Jika nomornya sudah dipakai, kartu kedua siswa akan ditukar.
          </p>
        </Card>
      </div>
    </Layout>
  )
}
