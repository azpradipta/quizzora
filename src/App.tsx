import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2, Settings } from 'lucide-react'
import { useAuth } from './lib/auth'
import { supabaseConfigured } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Quizzes from './pages/Quizzes'
import Classes from './pages/Classes'
import History from './pages/History'
import QuizEditor from './pages/QuizEditor'
import ClassEditor from './pages/ClassEditor'
import PrintCards from './pages/PrintCards'
import StartSession from './pages/StartSession'
import Presenter from './pages/Presenter'
import Scanner from './pages/Scanner'
import Report from './pages/Report'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-brand-600" /></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="grid min-h-screen place-items-center p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-soft">
          <Settings className="mx-auto mb-4 size-10 text-brand-600" />
          <h2 className="text-xl font-extrabold">Konfigurasi belum lengkap</h2>
          <p className="mt-2 text-sm text-slate-500">
            Isi <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> dan{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> di <code>.env.local</code> atau di Environment Variables Vercel.
          </p>
        </div>
      </div>
    )
  }
  const guard = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={guard(<Dashboard />)} />
      <Route path="/kuis" element={guard(<Quizzes />)} />
      <Route path="/kuis/:id" element={guard(<QuizEditor />)} />
      <Route path="/kelas" element={guard(<Classes />)} />
      <Route path="/kelas/:id" element={guard(<ClassEditor />)} />
      <Route path="/riwayat" element={guard(<History />)} />
      <Route path="/kartu" element={guard(<PrintCards />)} />
      <Route path="/mulai" element={guard(<StartSession />)} />
      <Route path="/mulai/:quizId" element={guard(<StartSession />)} />
      <Route path="/sesi/:id" element={guard(<Presenter />)} />
      <Route path="/sesi/:id/pindai" element={guard(<Scanner />)} />
      <Route path="/sesi/:id/laporan" element={guard(<Report />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
