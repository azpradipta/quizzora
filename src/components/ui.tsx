import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2, X, type LucideIcon } from 'lucide-react'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ===== Tombol =====
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'dark' | 'glass'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-700 focus-visible:ring-brand-500/40',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 shadow-xs hover:bg-slate-50 hover:ring-slate-300 focus-visible:ring-brand-500/40',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40',
  accent: 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-900/20 hover:bg-amber-300 focus-visible:ring-amber-400/50',
  dark: 'bg-slate-900 text-white hover:bg-slate-800',
  glass: 'bg-white/10 text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/20',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
}
const base = 'inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-45'

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra)
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-[1.1em] animate-spin" /> : Icon && <Icon className="size-[1.15em] shrink-0" strokeWidth={2.2} />}
      {children}
    </button>
  )
})

export function ButtonLink({ variant = 'primary', size = 'md', icon: Icon, className, children, disabled, ...rest }:
  ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: LucideIcon; disabled?: boolean }) {
  return (
    <Link className={buttonClass(variant, size, cn(className, disabled && 'pointer-events-none opacity-45'))} {...rest}>
      {Icon && <Icon className="size-[1.15em] shrink-0" strokeWidth={2.2} />}
      {children}
    </Link>
  )
}

// ===== Kartu & tata letak =====
export function Card({ className, children, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5', className)} {...rest}>{children}</div>
}

export function PageHeader({ title, subtitle, back, actions, icon: Icon }: {
  title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode; icon?: LucideIcon
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 no-print">
      <div className="min-w-0">
        {back && (
          <Link to={back} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-brand-700">
            ← Kembali
          </Link>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700">
              <Icon className="size-5.5" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ tone = 'slate', children, className }: { tone?: 'slate' | 'brand' | 'amber' | 'rose' | 'sky' | 'violet'; children: ReactNode; className?: string }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-100 text-brand-800',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700',
    violet: 'bg-violet-100 text-violet-700',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', tones[tone], className)}>{children}</span>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
      <Loader2 className="size-5 animate-spin text-brand-600" /> {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-100/60 blur-xl" />
        <span className="relative grid size-16 place-items-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-lift">
          <Icon className="size-7" strokeWidth={2} />
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  )
}

// ===== Modal =====
export function Modal({ open, onClose, title, children, size = 'md', dark }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; size?: 'sm' | 'md' | 'lg'; dark?: boolean
}) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }
  // Portal ke <body> agar modal tidak terjepit/bersarang di dalam elemen lain (mis. <form>)
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            className={cn('relative max-h-[92vh] w-full overflow-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl', widths[size],
              dark ? 'bg-slate-900 text-white' : 'bg-white')}
            initial={{ y: 40, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}>
            <button onClick={onClose} aria-label="Tutup"
              className={cn('absolute top-4 right-4 grid size-9 place-items-center rounded-full transition', dark ? 'text-white/60 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}>
              <X className="size-5" />
            </button>
            {title && <h2 className="mb-4 pr-10 text-xl font-extrabold tracking-tight">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ===== Lain-lain =====
const AVATAR_COLORS = ['bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-brand-500', 'bg-orange-500', 'bg-cyan-500', 'bg-pink-500']

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function Avatar({ name, seed, className }: { name: string; seed?: number; className?: string }) {
  const color = AVATAR_COLORS[(seed ?? [...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length]
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-white', color, className)}>
      {initials(name)}
    </span>
  )
}

/** Gradasi sampul kuis yang konsisten berdasarkan judul. */
const COVERS = [
  'from-brand-500 to-teal-700', 'from-sky-500 to-indigo-600', 'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600', 'from-violet-500 to-purple-700', 'from-cyan-500 to-blue-600',
]
export function coverGradient(key: string) {
  return COVERS[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length]
}

export const OPTION_STYLES = [
  { bg: 'bg-opt-a', soft: 'bg-sky-50 ring-sky-200', text: 'text-sky-700', ring: 'ring-opt-a' },
  { bg: 'bg-opt-b', soft: 'bg-amber-50 ring-amber-200', text: 'text-amber-700', ring: 'ring-opt-b' },
  { bg: 'bg-opt-c', soft: 'bg-rose-50 ring-rose-200', text: 'text-rose-700', ring: 'ring-opt-c' },
  { bg: 'bg-opt-d', soft: 'bg-violet-50 ring-violet-200', text: 'text-violet-700', ring: 'ring-opt-d' },
]

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  )
}
