import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { BarChart3, Eye, EyeOff, Lock, LogIn, Mail, ScanLine, Send, UserPlus, Users } from 'lucide-react'
import { AccountRequestModal } from '../components/AccountRequestForm'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Credit, Logo } from '../components/Layout'
import { Button } from '../components/ui'
import { markerSvg } from '../scan/markers'

const FEATURES = [
  { icon: ScanLine, text: 'Pindai jawaban satu kelas dalam hitungan detik' },
  { icon: Users, text: 'Tanpa HP untuk siswa, cukup kartu kertas' },
  { icon: BarChart3, text: 'Nilai & analisis soal langsung jadi, siap Excel' },
]

export default function Login() {
  const { session } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message)
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel kiri */}
      <div className="relative hidden overflow-hidden bg-brand-950 px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute -top-40 -right-40 size-120 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-105 rounded-full bg-amber-400/15 blur-3xl" />
        <Logo light />
        <div className="relative my-auto">
          <FloatingCards />
          <h1 className="mt-10 max-w-md text-4xl leading-tight font-extrabold tracking-tight">
            Ulangan jadi seru,<br />nilai langsung <span className="text-amber-300">terekam.</span>
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.li key={text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }}
                className="flex items-center gap-3 text-brand-50">
                <span className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icon className="size-5 text-amber-300" /></span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>
        <Credit light className="relative max-w-md" />
      </div>

      {/* Form */}
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 px-5 py-6 sm:px-8 lg:py-3">
        {/* Latar lembut: titik halus + cahaya warna */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-size-[22px_22px] opacity-70" />
        <div className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-amber-100/80 blur-3xl" />

        <div className="relative lg:hidden"><Logo /></div>

        <div className="relative my-auto flex flex-col items-center py-6 lg:py-4">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl bg-white/90 p-6 shadow-lift ring-1 ring-slate-900/5 backdrop-blur sm:p-8">
          <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-900/25">
            <LogIn className="size-6" />
          </motion.span>
          <h2 className="mt-4 text-[28px] font-extrabold tracking-tight text-slate-900">Selamat datang 👋</h2>
          <p className="mt-1.5 text-slate-500">Masuk untuk mengelola kuis, kelas, dan nilai siswa.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" />
                <input id="email" className="input pl-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="pw">Kata sandi</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" />
                <input id="pw" className="input px-11" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Tampilkan kata sandi">
                  {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
              {error}
            </motion.p>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full" loading={busy}>Masuk</Button>

          <ContactBox />
        </motion.form>
        </div>

        <div className="relative mx-auto text-center lg:hidden"><Credit /></div>
      </div>
    </div>
  )
}

/** Ajakan menghubungi pengembang lewat formulir (minta akun / reset kata sandi). */
function ContactBox() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><UserPlus className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-700">Belum punya akun?</p>
        <p className="text-xs text-slate-500">Atau lupa kata sandi? Kirim pesan ke pengembang.</p>
      </div>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-700 active:scale-95">
        <Send className="size-3.5" /> Hubungi
      </button>
      <AccountRequestModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

/** Ilustrasi kartu jawaban yang melayang. */
function FloatingCards() {
  const cards = [
    { n: 3, rot: 'A', cls: 'left-0 top-0', delay: '0s' },
    { n: 12, rot: 'B', cls: 'left-40 top-8', delay: '-2s' },
    { n: 27, rot: 'C', cls: 'left-80 -top-2', delay: '-4s' },
  ]
  return (
    <div className="relative h-44">
      {cards.map((c) => (
        <div key={c.n} className={`absolute ${c.cls} animate-float`} style={{ animationDelay: c.delay }}>
          <div className="relative rounded-2xl bg-white p-3 shadow-2xl">
            <div className="size-24" dangerouslySetInnerHTML={{ __html: markerSvg(c.n).replace('<svg ', '<svg width="100%" height="100%" ') }} />
            <span className="absolute -top-3 -right-3 grid size-9 place-items-center rounded-full bg-amber-400 text-sm font-extrabold text-amber-950 shadow-lg">{c.rot}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
