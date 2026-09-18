import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import {
  BarChart3, ChevronLeft, ChevronRight, Crown, Eye, EyeOff, Flag, Home, Maximize, Minimize, Play, Smartphone, Timer, Trophy, Wifi, WifiOff,
} from 'lucide-react'
import { useLiveSession } from '../lib/useLiveSession'
import { LETTERS } from '../lib/util'
import { sessionStats } from '../lib/stats'
import { QuestionView } from '../components/QuestionView'
import { Button, ButtonLink, Modal, cn } from '../components/ui'
import { Logo } from '../components/Layout'
import { useFeedback } from '../components/feedback'
import type { Session } from '../lib/types'
import { TIMER_OPTIONS, loadTimer, saveTimer } from '../lib/timer'

export default function Presenter() {
  const { id } = useParams<{ id: string }>()
  const { session, answers, error, connected, goTo, setPhase, end, resume } = useLiveSession(id!)
  const { confirm } = useFeedback()
  const [qr, setQr] = useState('')
  const [lobby, setLobby] = useState<boolean | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [timerLen, setTimerLenState] = useState(() => loadTimer(id!))
  const setTimerLen = (t: number) => { setTimerLenState(t); saveTimer(id!, t) }
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const scanUrl = `${window.location.origin}/sesi/${id}/pindai`

  useEffect(() => { QRCode.toDataURL(scanUrl, { width: 520, margin: 1, color: { dark: '#022c25' } }).then(setQr) }, [scanUrl])
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Layar lobi di awal ulangan (belum ada jawaban & masih di soal pertama)
  useEffect(() => {
    if (session && lobby === null) setLobby(session.status === 'live' && answers.size === 0 && session.current_index === 0 && session.phase === 'question')
  }, [session, answers, lobby])

  const current = session?.current_index ?? 0
  const q = session?.questions[current]
  const reveal = session?.phase === 'reveal'
  const currentAnswers = useMemo(() => answers.get(current) ?? new Map<number, number>(), [answers, current])
  const enrolled = useMemo(() => new Set(session?.students.map((s) => s.card_number)), [session])
  const answeredCount = [...currentAnswers.keys()].filter((c) => enrolled.has(c)).length
  const total = session?.students.length ?? 0

  const counts = [0, 0, 0, 0]
  for (const [card, a] of currentAnswers) if (enrolled.has(card)) counts[a]++
  const correctPct = answeredCount && q ? counts[q.correct] / answeredCount : 0

  // Timer: mulai ulang setiap ganti soal
  useEffect(() => { setTimeLeft(timerLen && !lobby ? timerLen : null) }, [current, timerLen, lobby])
  useEffect(() => {
    if (timeLeft === null || reveal) return
    if (timeLeft <= 0) { chime(); return }
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, reveal])

  // Konfeti saat mayoritas benar
  const lastConfetti = useRef('')
  useEffect(() => {
    const key = `${current}-${reveal}`
    if (reveal && correctPct >= 0.7 && lastConfetti.current !== key) {
      lastConfetti.current = key
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.7 }, colors: ['#10b98c', '#fbbf24', '#ffffff', '#0ea5e9'] })
    }
  }, [reveal, correctPct, current])

  useEffect(() => {
    if (!session || session.status !== 'live' || lobby) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(current + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(current - 1)
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPhase(reveal ? 'question' : 'reveal') }
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, current, reveal, goTo, setPhase, lobby])

  if (error) return <div className="grid min-h-screen place-items-center bg-brand-950 text-white"><p>{error} <Link to="/" className="underline">Kembali</Link></p></div>
  if (!session || !q) return <div className="grid min-h-screen place-items-center bg-brand-950 text-brand-200">Memuat…</div>
  if (session.status === 'ended') return <EndScreen session={session} answers={answers} onResume={resume} />

  const isLast = current === session.questions.length - 1
  const finish = async () => { if (await confirm({ title: 'Selesaikan ulangan?', message: 'Nilai siswa akan langsung dihitung.', confirmText: 'Selesai' })) end() }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-brand-950 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/3 size-144 rounded-full bg-brand-500/20 blur-3xl" />

      {/* Bar atas */}
      <header className="relative flex items-center gap-3 px-4 py-3 lg:px-6">
        <Link to="/" className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" title="Beranda"><Home className="size-5" /></Link>
        <div className="min-w-0">
          <p className="truncate font-bold">{session.quiz_title}</p>
          <p className="text-xs text-brand-200">Kelas {session.class_name}</p>
        </div>
        <div className="flex-1" />
        <span title={connected ? 'Tersambung' : 'Menyambung ulang…'} className={cn('hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:flex', connected ? 'bg-brand-500/20 text-brand-200' : 'animate-pulse bg-rose-500/30 text-rose-100')}>
          {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{connected ? 'Online' : 'Offline'}
        </span>
        <button onClick={() => setTimerLen(TIMER_OPTIONS[(TIMER_OPTIONS.indexOf(timerLen as (typeof TIMER_OPTIONS)[number]) + 1) % TIMER_OPTIONS.length])}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-semibold transition hover:bg-white/20" title="Atur timer per soal">
          <Timer className="size-4.5" /> {timerLen ? `${timerLen} dtk` : 'Timer'}
        </button>
        <Button variant="glass" size="icon" onClick={() => setShowQr(true)} title="Buka pemindai di HP"><Smartphone className="size-5" /></Button>
        <Button variant="glass" size="icon" onClick={toggleFullscreen} title="Layar penuh (F)">{fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}</Button>
        <Button variant="glass" size="sm" icon={Flag} onClick={finish} className="h-10 max-sm:hidden">Akhiri</Button>
      </header>

      {/* Progres soal */}
      <div className="relative mx-4 flex gap-1 lg:mx-6">
        {session.questions.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} title={`Soal ${i + 1}`}
            className={cn('h-1.5 flex-1 rounded-full transition-all', i < current ? 'bg-brand-400' : i === current ? 'bg-amber-300' : 'bg-white/15 hover:bg-white/30')} />
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 flex-1 flex-col px-4 py-5 lg:px-10 lg:py-6">
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold tracking-wide text-brand-100">SOAL {current + 1} / {session.questions.length}</span>
            {timeLeft !== null && !reveal && <TimerBadge left={timeLeft} total={timerLen} />}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={current} className="min-h-0 flex-1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }}>
              <QuestionView question={q} reveal={reveal} counts={counts} total={answeredCount} />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Panel siswa */}
        <aside className="flex max-h-[32vh] shrink-0 flex-col border-white/10 bg-black/20 p-4 backdrop-blur lg:max-h-none lg:w-80 lg:border-l">
          <div className="mb-4 flex items-center gap-4">
            <ProgressRing value={answeredCount} max={total} />
            <div>
              <p className="text-sm font-semibold text-brand-100">sudah terpindai</p>
              {reveal && answeredCount > 0 && <p className="mt-1 text-sm font-bold text-amber-300">{Math.round(correctPct * 100)}% benar</p>}
              {!reveal && answeredCount === total && total > 0 && <p className="mt-1 text-sm font-bold text-amber-300">Semua sudah! 🎉</p>}
            </div>
          </div>
          <div className="grid min-h-0 grid-cols-3 gap-1.5 overflow-y-auto pr-1 lg:grid-cols-2">
            {session.students.map((s) => {
              const a = currentAnswers.get(s.card_number)
              const state = a === undefined ? 'none' : !reveal ? 'answered' : a === q.correct ? 'right' : 'wrong'
              return (
                <motion.div key={`${current}-${s.card_number}-${state}`} initial={state !== 'none' ? { scale: 0.7 } : false} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }} title={s.name}
                  className={cn('flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold',
                    state === 'none' && 'bg-white/5 text-white/50',
                    state === 'answered' && 'bg-brand-500 text-white shadow-lg shadow-brand-500/30',
                    state === 'right' && 'bg-brand-500 text-white',
                    state === 'wrong' && 'bg-rose-500 text-white')}>
                  <span className="grid h-5 min-w-5 place-items-center rounded bg-black/20 px-1 text-[10px] font-extrabold">{s.card_number}</span>
                  <span className="truncate">{s.name.split(' ')[0]}</span>
                  {reveal && a !== undefined && <span className="ml-auto font-black">{LETTERS[a]}</span>}
                </motion.div>
              )
            })}
          </div>
        </aside>
      </div>

      {/* Kontrol */}
      <footer className="relative flex items-center justify-center gap-2 border-t border-white/10 bg-black/20 px-4 py-3 backdrop-blur sm:gap-3">
        <Button variant="glass" size="lg" icon={ChevronLeft} disabled={current === 0} onClick={() => goTo(current - 1)} className="max-sm:px-4"><span className="max-sm:hidden">Sebelumnya</span></Button>
        <Button variant={reveal ? 'glass' : 'accent'} size="lg" icon={reveal ? EyeOff : Eye} onClick={() => setPhase(reveal ? 'question' : 'reveal')} className="min-w-52">
          {reveal ? 'Sembunyikan' : 'Tampilkan jawaban'}
        </Button>
        {isLast
          ? <Button size="lg" icon={Trophy} onClick={finish} className="bg-brand-500 hover:bg-brand-400">Selesai</Button>
          : <Button size="lg" onClick={() => goTo(current + 1)} className="bg-brand-500 hover:bg-brand-400"><span className="max-sm:hidden">Berikutnya</span><ChevronRight className="size-5" /></Button>}
      </footer>

      {/* Lobi */}
      <AnimatePresence>
        {lobby && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center overflow-auto bg-brand-950 p-6" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }}>
            <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
              <div>
                <Logo light />
                <h1 className="mt-8 text-4xl leading-tight font-extrabold lg:text-5xl">{session.quiz_title}</h1>
                <p className="mt-2 text-xl text-brand-200">Kelas {session.class_name} · {session.questions.length} soal · {total} siswa</p>
                <ol className="mt-8 space-y-3 text-lg text-brand-50">
                  <li className="flex gap-3"><Num n={1} /> Bagikan kartu sesuai nomor masing-masing.</li>
                  <li className="flex gap-3"><Num n={2} /> Angkat kartu, dan <b className="text-amber-300">huruf di atas</b> adalah jawabanmu.</li>
                  <li className="flex gap-3"><Num n={3} /> Jangan tutupi kotak hitam dengan jari 🙂</li>
                </ol>
                <Button variant="accent" size="lg" icon={Play} className="mt-10 h-16 px-10 text-lg" onClick={() => setLobby(false)}>Mulai soal pertama</Button>
              </div>
              <div className="rounded-4xl bg-white p-6 text-center text-slate-900 shadow-2xl">
                <p className="flex items-center justify-center gap-2 font-bold text-brand-800"><Smartphone className="size-5" /> Pindai dengan HP guru</p>
                {qr && <img src={qr} alt="QR pemindai" className="mx-auto mt-3 w-full max-w-72" />}
                <p className="mt-2 text-sm text-slate-500">Gunakan kamera HP, lalu masuk dengan akun yang sama.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={showQr} onClose={() => setShowQr(false)} title="Buka pemindai di HP">
        <p className="text-sm text-slate-500">Pindai kode ini dengan kamera HP (HP harus masuk dengan akun yang sama).</p>
        {qr && <img src={qr} alt="QR pemindai" className="mx-auto my-4 w-64" />}
        <p className="rounded-xl bg-slate-100 p-3 text-center font-mono text-xs break-all text-slate-600">{scanUrl}</p>
      </Modal>
    </div>
  )
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen().catch(() => {})
}

function Num({ n }: { n: number }) {
  return <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-extrabold text-amber-950">{n}</span>
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 34, c = 2 * Math.PI * r
  const pct = max ? value / max : 0
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="8" />
        <motion.circle cx="40" cy="40" r={r} fill="none" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 0.5 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <span><span className="text-2xl font-black">{value}</span><span className="text-sm text-white/50">/{max}</span></span>
      </div>
    </div>
  )
}

function TimerBadge({ left, total }: { left: number; total: number }) {
  const urgent = left <= 5
  return (
    <motion.span animate={urgent && left > 0 ? { scale: [1, 1.12, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}
      className={cn('relative flex items-center gap-1.5 overflow-hidden rounded-full px-4 py-1.5 text-sm font-extrabold', urgent ? 'bg-rose-500 text-white' : 'bg-amber-400 text-amber-950')}>
      <span className="absolute inset-y-0 left-0 bg-black/10 transition-all duration-1000" style={{ width: `${(1 - left / total) * 100}%` }} />
      <Timer className="relative size-4" />
      <span className="relative">{left > 0 ? `${left} dtk` : 'Waktu habis!'}</span>
    </motion.span>
  )
}

function EndScreen({ session, answers, onResume }: { session: Session; answers: Map<number, Map<number, number>>; onResume: () => void }) {
  const [showPodium, setShowPodium] = useState(false)
  const responses = [...answers].flatMap(([qi, m]) => [...m].map(([card, answer]) => ({ question_index: qi, card_number: card, answer })))
  const st = sessionStats(session, responses)
  const top = [...st.rows].filter((r) => r.answered).sort((a, b) => b.score - a.score || a.card_number - b.card_number).slice(0, 3)

  useEffect(() => {
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors: ['#10b98c', '#fbbf24', '#ffffff'] })
  }, [])
  useEffect(() => {
    if (showPodium) confetti({ particleCount: 220, spread: 120, startVelocity: 45, origin: { y: 0.5 } })
  }, [showPodium])

  const podium = [top[1], top[0], top[2]]
  const heights = ['h-28', 'h-40', 'h-20']
  const medals = ['🥈', '🥇', '🥉']

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-950 p-6 text-center text-white">
      <div className="absolute -top-40 size-160 rounded-full bg-brand-500/20 blur-3xl" />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
        className="relative grid size-20 place-items-center rounded-3xl bg-amber-400 text-amber-950 shadow-2xl"><Trophy className="size-10" /></motion.div>
      <h1 className="relative mt-6 text-4xl font-extrabold lg:text-5xl">Alhamdulillah, selesai! 🎉</h1>
      <p className="relative mt-2 text-lg text-brand-200">{session.quiz_title} · Kelas {session.class_name}</p>

      <div className="relative mt-8 grid grid-cols-3 gap-3 sm:gap-6">
        {[{ v: st.avg, l: 'Rata-rata kelas' }, { v: `${st.participants}/${session.students.length}`, l: 'Siswa ikut' }, { v: st.max, l: 'Nilai tertinggi' }].map((x, i) => (
          <motion.div key={x.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
            className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/10 backdrop-blur sm:px-8">
            <p className="text-3xl font-black text-amber-300 sm:text-4xl">{x.v}</p>
            <p className="text-xs text-brand-100 sm:text-sm">{x.l}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showPodium && top.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative mt-10 flex items-end justify-center gap-3">
            {podium.map((r, i) => r && (
              <motion.div key={r.card_number} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: [0.4, 0.8, 0.2][i] }} className="flex w-28 flex-col items-center sm:w-36">
                {i === 1 && <Crown className="mb-1 size-7 text-amber-300" />}
                <p className="text-3xl">{medals[i]}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold">{r.name}</p>
                <p className="text-xs text-brand-200">Nilai {r.score}</p>
                <div className={cn('mt-2 w-full rounded-t-2xl bg-linear-to-b from-amber-300 to-amber-500', heights[i])} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        {!showPodium && top.length > 0 && <Button variant="accent" size="lg" icon={Crown} onClick={() => setShowPodium(true)}>Tampilkan 3 besar</Button>}
        <ButtonLink to={`/sesi/${session.id}/laporan`} size="lg" icon={BarChart3} className="bg-brand-500 hover:bg-brand-400">Lihat nilai lengkap</ButtonLink>
        <Button variant="glass" size="lg" onClick={onResume}>Lanjutkan ulangan</Button>
        <ButtonLink to="/" variant="glass" size="lg" icon={Home}>Beranda</ButtonLink>
      </div>
    </div>
  )
}

function chime() {
  try {
    const ctx = new AudioContext()
    ;[660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.4)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.18)
      o.stop(ctx.currentTime + i * 0.18 + 0.4)
    })
  } catch { /* suara opsional */ }
}
