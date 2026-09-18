import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import type { SessionQuestion } from '../lib/types'
import { LETTERS, filledOptions } from '../lib/util'
import { OPTION_STYLES, cn } from './ui'

/** Soal + pilihan jawaban untuk proyektor. Saat `reveal`, kunci disorot dan jumlah pemilih tiap opsi ditampilkan. */
export function QuestionView({ question, reveal, counts, total }: {
  question: SessionQuestion
  reveal: boolean
  counts?: number[]
  total?: number
}) {
  const options = filledOptions(question)
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
        <p dir="auto" className="max-w-5xl text-[clamp(1.6rem,3.2vw,3rem)] leading-snug font-extrabold whitespace-pre-wrap text-white [[dir=rtl]]:text-[clamp(2.2rem,4.5vw,4rem)] [[dir=rtl]]:leading-[1.8]">
          {question.text}
        </p>
        {question.image_url && (
          <img src={question.image_url} alt="" className="max-h-[34vh] max-w-full rounded-2xl bg-white object-contain p-1 shadow-2xl" />
        )}
      </div>

      <div className={cn('grid gap-3 lg:gap-4', options.length > 1 && 'sm:grid-cols-2')}>
        {options.map(({ text, i }, idx) => {
          const isCorrect = i === question.correct
          const n = counts?.[i] ?? 0
          const pct = total ? Math.round((n / total) * 100) : 0
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: reveal && !isCorrect ? 0.35 : 1, y: 0, scale: reveal && isCorrect ? 1.02 : 1 }}
              transition={{ delay: reveal ? 0 : 0.08 * idx, type: 'spring', stiffness: 260, damping: 22 }}
              className={cn('relative overflow-hidden rounded-3xl p-4 text-white shadow-xl lg:p-5', OPTION_STYLES[i].bg,
                reveal && isCorrect && 'ring-4 ring-white ring-offset-4 ring-offset-brand-950')}>
              <div className="absolute inset-0 bg-linear-to-b from-white/15 to-transparent" />
              <div className="relative flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/25 text-2xl font-black lg:size-14 lg:text-3xl">
                  {reveal && isCorrect ? <Check className="size-7" strokeWidth={3.5} /> : LETTERS[i]}
                </span>
                <span dir="auto" className="min-w-0 flex-1 text-[clamp(1.1rem,2vw,1.9rem)] leading-tight font-bold [[dir=rtl]]:text-[clamp(1.4rem,2.6vw,2.4rem)]">{text}</span>
              </div>
              {reveal && counts && (
                <div className="relative mt-3">
                  <div className="flex justify-between text-sm font-bold opacity-95"><span>{n} siswa</span><span>{pct}%</span></div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/15">
                    <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
