import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveSession } from '../lib/useLiveSession'
import { useCardScanner } from '../scan/useCardScanner'
import type { Detection } from '../scan/markers'
import { LETTERS, filledOptions } from '../lib/util'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft, CameraOff, ChevronLeft, ChevronRight, Eye, Flashlight, Loader2, Lock, RotateCcw, ScanLine, Users, ZoomIn,
} from 'lucide-react'
import { Button, Modal, OPTION_STYLES, cn } from '../components/ui'
import { useFeedback } from '../components/feedback'

const CONFIRM_HITS = 2 // kartu harus terbaca sama di 2 frame sebelum dicatat
const CONFIRM_WINDOW_MS = 1500
const HOLD_OVERLAY_MS = 600

interface Pending { answer: number; hits: number; last: number }

export default function Scanner() {
  const { id } = useParams<{ id: string }>()
  const { session, answers, connected, goTo, setPhase, saveAnswers, clearQuestion } = useLiveSession(id!)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const pending = useRef(new Map<number, Pending>())
  // Antrean simpan: kunci `${soal}:${kartu}` agar tidak tertukar saat guru pindah soal
  const queue = useRef(new Map<string, { q: number; card: number; answer: number }>())
  const lastSeen = useRef(new Map<number, { det: Detection; at: number }>())
  const [flash, setFlash] = useState<string | null>(null)
  const [showList, setShowList] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const { confirm } = useFeedback()

  const current = session?.current_index ?? 0
  const reveal = session?.phase === 'reveal'
  const live = session?.status === 'live'
  const currentAnswers = answers.get(current) ?? new Map<number, number>()
  const byCard = useMemo(() => new Map(session?.students.map((s) => [s.card_number, s.name])), [session])
  const answeredCount = [...currentAnswers.keys()].filter((c) => byCard.has(c)).length

  // Ref untuk dipakai di callback frame (tanpa membuat ulang kamera)
  const stateRef = useRef({ current, reveal, live, currentAnswers, byCard })
  stateRef.current = { current, reveal, live, currentAnswers, byCard }

  // Ganti soal → reset kartu yang sedang dikonfirmasi (antrean simpan tetap dikirim)
  useEffect(() => {
    pending.current.clear()
    lastSeen.current.clear()
  }, [current])

  // Kunci layar tetap menyala selama memindai
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const req = () => nav.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    req()
    const onVis = () => document.visibilityState === 'visible' && req()
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release() }
  }, [])

  // Kirim jawaban yang sudah terkonfirmasi secara berkelompok
  useEffect(() => {
    const t = setInterval(async () => {
      if (!queue.current.size) return
      const entries = [...queue.current.values()]
      queue.current.clear()
      let allOk = true
      for (const q of new Set(entries.map((e) => e.q))) {
        const items = entries.filter((e) => e.q === q)
        const ok = await saveAnswers(q, items)
        if (!ok) {
          allOk = false
          for (const it of items) if (!queue.current.has(`${q}:${it.card}`)) queue.current.set(`${q}:${it.card}`, it)
        }
      }
      setSaveFailed(!allOk)
    }, 400)
    return () => clearInterval(t)
  }, [saveAnswers])

  const onFrame = useCallback((detections: Detection[], frame: { width: number; height: number }) => {
    const { current, reveal, live, currentAnswers, byCard } = stateRef.current
    const now = performance.now()
    let newlyCaptured = 0
    for (const d of detections) {
      lastSeen.current.set(d.card, { det: d, at: now })
      if (reveal || !live || !byCard.has(d.card)) continue
      const p = pending.current.get(d.card)
      const hits = p && p.answer === d.answer && now - p.last < CONFIRM_WINDOW_MS ? p.hits + 1 : 1
      pending.current.set(d.card, { answer: d.answer, hits, last: now })
      const key = `${current}:${d.card}`
      const saved = queue.current.get(key)?.answer ?? currentAnswers.get(d.card)
      if (hits >= CONFIRM_HITS && saved !== d.answer) {
        if (saved === undefined) newlyCaptured++
        queue.current.set(key, { q: current, card: d.card, answer: d.answer })
      }
    }
    if (newlyCaptured) {
      navigator.vibrate?.(40)
      beep()
    }
    drawOverlay(overlayRef.current, videoRef.current, frame, lastSeen.current, now, stateRef.current, queue.current)
  }, [])

  const scanning = Boolean(live && !reveal)
  const { error: camError, ready, fps, controls } = useCardScanner(videoRef, true, onFrame)

  useEffect(() => {
    if (!reveal) return
    setFlash('Jawaban ditampilkan. Pemindaian dikunci.')
    const t = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(t)
  }, [reveal])

  if (!session) return <div className="grid min-h-screen place-items-center bg-black text-white/60">Memuat…</div>

  const q = session.questions[current]
  const isLast = current === session.questions.length - 1
  const missing = session.students.filter((s) => !currentAnswers.has(s.card_number))
  const counts = [0, 1, 2, 3].map((k) => [...currentAnswers].filter(([c, a]) => a === k && byCard.has(c)).length)
  const pct = session.students.length ? answeredCount / session.students.length : 0

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 size-full object-cover" />
        <canvas ref={overlayRef} className="absolute inset-0 size-full" />
        {!ready && !camError && <Msg><Loader2 className="mx-auto mb-2 size-8 animate-spin text-brand-400" />Membuka kamera…</Msg>}
        {camError && <Msg><CameraOff className="mx-auto mb-2 size-8 text-rose-400" />{camError}</Msg>}
        {!live && <Msg>Ulangan sudah diakhiri. <Link to={`/sesi/${id}/laporan`} className="font-bold text-brand-300 underline">Lihat laporan</Link></Msg>}
        <AnimatePresence>
          {flash && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-24 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold whitespace-nowrap text-amber-950 shadow-xl">
              <Lock className="size-4" />{flash}
            </motion.div>
          )}
        </AnimatePresence>
        {controls.zoom && (
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full bg-black/40 px-2 py-3 backdrop-blur">
            <ZoomIn className="size-4 text-white/70" />
            <input type="range" min={controls.zoom.min} max={controls.zoom.max} step={0.1} value={controls.zoom.value}
              onChange={(e) => controls.setZoom(Number(e.target.value))} aria-label="Zoom"
              className="h-40 w-2 accent-amber-400 [direction:rtl] [writing-mode:vertical-lr]" />
            <span className="text-[10px] font-bold">{controls.zoom.value.toFixed(1)}x</span>
          </div>
        )}
      </div>

      {/* Atas */}
      <header className="absolute inset-x-0 top-0 bg-linear-to-b from-black/80 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8">
        <div className="flex items-center gap-2">
          <Link to="/" className="grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label="Beranda"><ArrowLeft className="size-5" /></Link>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Soal {current + 1}<span className="text-white/50">/{session.questions.length}</span></p>
            <p className={cn('flex items-center gap-1 text-xs font-bold', scanning ? 'text-brand-300' : 'text-amber-300')}>
              {scanning ? <><span className="size-1.5 animate-pulse rounded-full bg-brand-400" /> Memindai · {fps} fps</> : reveal ? 'Terkunci, jawaban ditampilkan' : 'Berhenti'}
            </p>
          </div>
          <span className={cn('size-2.5 rounded-full', connected && !saveFailed ? 'bg-brand-400 shadow-[0_0_0_3px_rgb(52_211_166/0.3)]' : 'animate-pulse bg-rose-500')}
            title={saveFailed ? 'Gagal menyimpan, mencoba lagi' : connected ? 'Tersambung' : 'Menyambung…'} />
          {controls.torch !== null && (
            <button onClick={() => controls.setTorch(!controls.torch)} aria-label="Senter"
              className={cn('grid size-10 place-items-center rounded-full backdrop-blur transition', controls.torch ? 'bg-amber-400 text-amber-950' : 'bg-white/15')}>
              <Flashlight className="size-5" />
            </button>
          )}
          <button onClick={() => setShowList(true)} className="relative h-11 overflow-hidden rounded-full bg-white/15 px-4 font-extrabold backdrop-blur">
            <span className="absolute inset-y-0 left-0 bg-brand-500 transition-all" style={{ width: `${pct * 100}%` }} />
            <span className="relative flex items-center gap-1.5"><Users className="size-4" />{answeredCount}/{session.students.length}</span>
          </button>
        </div>
      </header>

      {/* Bawah */}
      <footer className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/85 to-transparent px-3 pt-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p dir="auto" className="line-clamp-2 text-[15px] font-semibold">{q.text || '(soal bergambar)'}</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {filledOptions(q).map(({ i }) => (
            <div key={i} className={cn('flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-extrabold', OPTION_STYLES[i].bg,
              reveal && i !== q.correct && 'opacity-40', reveal && i === q.correct && 'ring-2 ring-white')}>
              <span>{LETTERS[i]}</span><span>{counts[i]}</span>
            </div>
          ))}
        </div>
        {!reveal && missing.length > 0 && (
          <p className="mt-2 truncate text-xs text-white/60">Belum: {missing.slice(0, 5).map((s) => s.name.split(' ')[0]).join(', ')}{missing.length > 5 && ` +${missing.length - 5}`}</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="glass" size="lg" className="shrink-0 px-3.5" disabled={current === 0} onClick={() => goTo(current - 1)} aria-label="Sebelumnya"><ChevronLeft className="size-6" /></Button>
          <Button variant={reveal ? 'glass' : 'accent'} size="lg" className="min-w-0 flex-1 px-3" icon={reveal ? ScanLine : Eye} onClick={() => setPhase(reveal ? 'question' : 'reveal')}>
            {reveal ? 'Pindai lagi' : <>Tampilkan<span className="max-[380px]:hidden"> jawaban</span></>}
          </Button>
          <Button size="lg" className="shrink-0 bg-brand-500 px-3.5 hover:bg-brand-400" disabled={isLast} onClick={() => goTo(current + 1)} aria-label="Berikutnya"><ChevronRight className="size-6" /></Button>
        </div>
      </footer>

      <Modal open={showList} onClose={() => setShowList(false)} title={`Soal ${current + 1} · ${answeredCount}/${session.students.length} terpindai`}>
        <ul className="-mx-2 max-h-[55vh] overflow-y-auto">
          {[...session.students].sort((a, b) => Number(currentAnswers.has(a.card_number)) - Number(currentAnswers.has(b.card_number))).map((s) => {
            const a = currentAnswers.get(s.card_number)
            return (
              <li key={s.card_number} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600">{s.card_number}</span>
                <span className={cn('flex-1 truncate font-semibold', a === undefined ? 'text-rose-600' : 'text-slate-800')}>{s.name}</span>
                {a === undefined
                  ? <span className="text-xs font-bold text-rose-500">belum</span>
                  : <span className={cn('grid size-8 place-items-center rounded-lg font-extrabold text-white', OPTION_STYLES[a].bg)}>{LETTERS[a]}</span>}
              </li>
            )
          })}
        </ul>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" icon={RotateCcw} className="text-rose-600" onClick={async () => {
            if (await confirm({ title: 'Pindai ulang soal ini?', message: 'Semua jawaban soal ini akan dihapus.', danger: true, confirmText: 'Hapus & ulangi' })) {
              clearQuestion(current)
              setShowList(false)
            }
          }}>Pindai ulang</Button>
          <div className="flex-1" />
          <Button onClick={() => setShowList(false)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  )
}

function Msg({ children }: { children: ReactNode }) {
  return <div className="absolute inset-x-6 top-1/3 rounded-2xl bg-black/70 p-5 text-center backdrop-blur">{children}</div>
}

function drawOverlay(
  canvas: HTMLCanvasElement | null, video: HTMLVideoElement | null, frame: { width: number; height: number },
  seen: Map<number, { det: Detection; at: number }>, now: number,
  state: { current: number; currentAnswers: Map<number, number>; byCard: Map<number, string> },
  queued: Map<string, { answer: number }>,
) {
  if (!canvas || !video) return
  const cw = canvas.clientWidth, ch = canvas.clientHeight
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr)
    canvas.height = Math.round(ch * dpr)
  }
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)
  // Video memakai object-fit: cover → hitung skala & offset yang sama
  const scale = Math.max(cw / frame.width, ch / frame.height)
  const ox = (cw - frame.width * scale) / 2
  const oy = (ch - frame.height * scale) / 2
  ctx.lineWidth = 3
  ctx.font = 'bold 14px Nunito, sans-serif'
  for (const [card, { det, at }] of seen) {
    if (now - at > HOLD_OVERLAY_MS) { seen.delete(card); continue }
    const pts = det.corners.map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale }))
    const name = state.byCard.get(card)
    const saved = queued.get(`${state.current}:${card}`)?.answer ?? state.currentAnswers.get(card)
    const color = !name ? '#9ca3af' : saved === det.answer ? '#22c55e' : '#f59e0b'
    ctx.strokeStyle = color
    ctx.fillStyle = color + '33'
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    const cx = pts.reduce((s, p) => s + p.x, 0) / 4
    const top = Math.min(...pts.map((p) => p.y))
    const label = name ? `${name.split(' ')[0]} · ${LETTERS[det.answer]}` : `Kartu ${card} (tidak terdaftar)`
    const w = ctx.measureText(label).width + 12
    ctx.fillStyle = color
    roundRect(ctx, cx - w / 2, top - 26, w, 22, 6)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, top - 15)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

let audioCtx: AudioContext | null = null
function beep() {
  try {
    audioCtx ??= new AudioContext()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.08, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12)
    o.connect(g).connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + 0.12)
  } catch {
    /* suara opsional */
  }
}
