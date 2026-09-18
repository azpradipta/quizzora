/**
 * Formulir "Minta akun" di halaman login dikirim ke email pengembang lewat Web3Forms (gratis).
 * Access key didapat dari https://web3forms.com (masukkan email tujuan → key dikirim ke email itu),
 * lalu isi VITE_WEB3FORMS_KEY di .env.local dan di Environment Variables Vercel.
 * Key ini memang aman untuk dipakai di sisi browser.
 */
export const WEB3FORMS_KEY = (import.meta.env.VITE_WEB3FORMS_KEY as string | undefined) ?? ''

export const REQUEST_TYPES = ['Minta akun baru', 'Lupa kata sandi', 'Pertanyaan lain'] as const

export interface AccountRequest {
  type: (typeof REQUEST_TYPES)[number]
  name: string
  email: string
  whatsapp: string
  school: string
  message: string
  botcheck: boolean // jebakan bot: harus tetap kosong
}

export async function sendAccountRequest(r: AccountRequest) {
  if (!WEB3FORMS_KEY) throw new Error('Formulir belum diaktifkan oleh pengembang (VITE_WEB3FORMS_KEY belum diisi).')
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `[Quizzora] ${r.type}: ${r.name}`,
      from_name: 'Quizzora',
      replyto: r.email,
      botcheck: r.botcheck,
      'Keperluan': r.type,
      'Nama': r.name,
      'Email': r.email,
      'WhatsApp': r.whatsapp || '-',
      'Sekolah / instansi': r.school,
      'Pesan': r.message || '-',
      'Dikirim dari': window.location.origin,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string }
  if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengirim. Periksa koneksi internet lalu coba lagi.')
}
