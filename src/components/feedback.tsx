import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Button, Modal, cn } from './ui'

// ===== Toast =====
type ToastTone = 'success' | 'error' | 'info'
interface Toast { id: number; tone: ToastTone; message: string }

// ===== Dialog konfirmasi / isian (pengganti confirm() & prompt() bawaan browser) =====
interface ConfirmOptions { title: string; message?: ReactNode; confirmText?: string; danger?: boolean }
interface PromptOptions { title: string; label?: string; placeholder?: string; defaultValue?: string; confirmText?: string; hint?: string }

interface FeedbackApi {
  toast: (message: string, tone?: ToastTone) => void
  confirm: (o: ConfirmOptions) => Promise<boolean>
  prompt: (o: PromptOptions) => Promise<string | null>
}

const Ctx = createContext<FeedbackApi | null>(null)

export function useFeedback() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFeedback harus di dalam FeedbackProvider')
  return ctx
}

type DialogState =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOptions; resolve: (v: string | null) => void }

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [value, setValue] = useState('')
  const nextId = useRef(1)

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-3), { id, tone, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3200)
  }, [])

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', opts, resolve })), [])
  const prompt = useCallback((opts: PromptOptions) => new Promise<string | null>((resolve) => {
    setValue(opts.defaultValue ?? '')
    setDialog({ kind: 'prompt', opts, resolve })
  }), [])

  const close = (result: boolean) => {
    if (!dialog) return
    if (dialog.kind === 'confirm') dialog.resolve(result)
    else dialog.resolve(result && value.trim() ? value.trim() : null)
    setDialog(null)
  }

  const icons = { success: CheckCircle2, error: XCircle, info: Info }

  return (
    <Ctx.Provider value={{ toast, confirm, prompt }}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.tone]
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl">
                <Icon className={cn('size-5 shrink-0', t.tone === 'success' && 'text-brand-400', t.tone === 'error' && 'text-rose-400', t.tone === 'info' && 'text-sky-400')} />
                {t.message}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <Modal open={!!dialog} onClose={() => close(false)} size="sm">
        {dialog?.kind === 'confirm' && (
          <div className="text-center">
            <span className={cn('mx-auto mb-4 grid size-14 place-items-center rounded-2xl', dialog.opts.danger ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-700')}>
              {dialog.opts.danger ? <AlertTriangle className="size-7" /> : <Info className="size-7" />}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">{dialog.opts.title}</h2>
            {dialog.opts.message && <div className="mt-2 text-sm text-slate-500">{dialog.opts.message}</div>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => close(false)}>Batal</Button>
              <Button variant={dialog.opts.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {dialog.opts.confirmText ?? 'Ya, lanjutkan'}
              </Button>
            </div>
          </div>
        )}
        {dialog?.kind === 'prompt' && (
          <form onSubmit={(e) => { e.preventDefault(); close(true) }}>
            <h2 className="mb-4 pr-8 text-lg font-extrabold text-slate-900">{dialog.opts.title}</h2>
            {dialog.opts.label && <label className="label">{dialog.opts.label}</label>}
            <input className="input" autoFocus value={value} placeholder={dialog.opts.placeholder} onChange={(e) => setValue(e.target.value)} />
            {dialog.opts.hint && <p className="mt-2 text-xs text-slate-500">{dialog.opts.hint}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>Batal</Button>
              <Button type="submit" disabled={!value.trim()}>{dialog.opts.confirmText ?? 'Simpan'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </Ctx.Provider>
  )
}
