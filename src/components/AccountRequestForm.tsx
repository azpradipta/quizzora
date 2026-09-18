import { useState, type FormEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, Send } from 'lucide-react'
import { Button, Modal, cn } from './ui'
import { REQUEST_TYPES, sendAccountRequest, type AccountRequest } from '../lib/contact'
import { errorMessage } from '../lib/util'

const empty: AccountRequest = { type: 'Minta akun baru', name: '', email: '', whatsapp: '', school: '', message: '', botcheck: false }

/** Formulir permintaan akun / reset kata sandi yang dikirim ke email pengembang. */
export function AccountRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<AccountRequest>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const set = <K extends keyof AccountRequest>(k: K, v: AccountRequest[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation() // jangan ikut memicu submit form login di belakangnya
    setBusy(true)
    setError('')
    try {
      await sendAccountRequest(form)
      setSent(true)
      setForm(empty)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    onClose()
    setTimeout(() => { setSent(false); setError('') }, 300)
  }

  return (
    <Modal open={open} onClose={close} size="lg" title={sent ? undefined : 'Hubungi pengembang'}>
      {sent ? (
        <div className="py-4 text-center">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600">
            <CheckCircle2 className="size-9" />
          </motion.span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">Pesan terkirim!</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
            Terima kasih. Pengembang akan membalas ke email Anda secepatnya.
          </p>
          <Button className="mt-6" onClick={close}>Tutup</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="-mt-2 text-sm text-slate-500">Isi data di bawah. Pesan akan dikirim ke email pengembang, dan balasannya dikirim ke email Anda.</p>

          <div>
            <span className="label">Keperluan</span>
            <div className="grid grid-cols-3 gap-2">
              {REQUEST_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={cn('rounded-xl px-2 py-2.5 text-xs font-bold ring-2 transition sm:text-sm',
                    form.type === t ? 'bg-brand-50 text-brand-800 ring-brand-500' : 'text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap" required>
              <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Siti Aminah, S.Pd.I" autoComplete="name" />
            </Field>
            <Field label="Email" required>
              <input className="input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@email.com" autoComplete="email" />
            </Field>
            <Field label="No. WhatsApp" hint="opsional">
              <input className="input" type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="08xx xxxx xxxx" autoComplete="tel" />
            </Field>
            <Field label="Sekolah / instansi" required>
              <input className="input" required value={form.school} onChange={(e) => set('school', e.target.value)} placeholder="SD Negeri 1 …" autoComplete="organization" />
            </Field>
          </div>

          <Field label="Pesan" hint="opsional">
            <textarea className="input min-h-24 resize-y" value={form.message} onChange={(e) => set('message', e.target.value)}
              placeholder={form.type === 'Lupa kata sandi' ? 'Email akun yang lupa kata sandinya…' : 'Mis. mengajar PAI kelas 4–6, sekitar 60 siswa.'} />
          </Field>

          {/* Jebakan bot: disembunyikan dari manusia */}
          <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" className="hidden"
            checked={form.botcheck} onChange={(e) => set('botcheck', e.target.checked)} />

          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

          <Button type="submit" size="lg" icon={Send} loading={busy} className="w-full">Kirim pesan</Button>
        </form>
      )}
    </Modal>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">
        {label}{required && <span className="text-rose-500"> *</span>}
        {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
      </span>
      {children}
    </label>
  )
}
