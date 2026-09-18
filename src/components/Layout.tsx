import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BookOpenCheck, History, LayoutDashboard, LogOut, Printer, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useFeedback } from './feedback'
import { cn } from './ui'

const NAV = [
  { to: '/', label: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/kuis', label: 'Kuis', icon: BookOpenCheck },
  { to: '/kelas', label: 'Kelas', icon: Users },
  { to: '/riwayat', label: 'Riwayat', icon: History },
  { to: '/kartu', label: 'Kartu', icon: Printer },
]

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid size-10 place-items-center rounded-xl bg-linear-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/25">
        <span className="grid grid-cols-2 gap-0.75">
          <span className="size-2 rounded-xs bg-white" />
          <span className="size-2 rounded-xs bg-white" />
          <span className="size-2 rounded-xs bg-white" />
          <span className="size-2 rounded-xs bg-amber-300" />
        </span>
      </span>
      <span className={cn('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
        Quizz<span className={light ? 'text-amber-300' : 'text-brand-600'}>ora</span>
      </span>
    </span>
  )
}

/** Watermark pembuat aplikasi. */
export function Credit({ light, className }: { light?: boolean; className?: string }) {
  return (
    <p className={cn('text-xs leading-relaxed', light ? 'text-brand-200/70' : 'text-slate-400', className)}>
      Dikembangkan oleh{' '}
      <a href="https://github.com/azpradipta" target="_blank" rel="noreferrer"
        className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle font-bold transition',
          light ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
        <GithubIcon />azpradipta
      </a>
    </p>
  )
}

function GithubIcon() {
  return (
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden="true">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
  )
}

export default function Layout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { session } = useAuth()
  const { confirm } = useFeedback()
  const email = session?.user.email ?? ''

  const logout = async () => {
    if (await confirm({ title: 'Keluar dari Quizzora?', confirmText: 'Keluar' })) supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen lg:pl-64 print:pl-0">
      {/* Sidebar (laptop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-950 px-4 py-6 text-white lg:flex no-print">
        <NavLink to="/" className="px-2"><Logo light /></NavLink>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition',
                isActive ? 'bg-white text-brand-900 shadow-lg' : 'text-brand-100/80 hover:bg-white/10 hover:text-white')}>
              <Icon className="size-5" strokeWidth={2.2} />
              {label === 'Kartu' ? 'Cetak Kartu' : label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
          <p className="text-xs text-brand-200">Masuk sebagai</p>
          <p className="truncate text-sm font-semibold">{email}</p>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand-200 transition hover:text-white">
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
        <Credit light className="mt-3 px-2" />
      </aside>

      {/* Header (HP) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-lg lg:hidden no-print">
        <NavLink to="/"><Logo /></NavLink>
        <button onClick={logout} className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Keluar">
          <LogOut className="size-5" />
        </button>
      </header>

      <main className={cn('mx-auto px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16 print-only-reset', wide ? 'max-w-7xl' : 'max-w-6xl')}>
        {children}
      </main>

      {/* Navigasi bawah (HP) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-lg lg:hidden no-print">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition', isActive ? 'text-brand-700' : 'text-slate-400')}>
            {({ isActive }) => (
              <>
                <span className={cn('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-brand-100')}>
                  <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
