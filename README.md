# Quizzora

Aplikasi ulangan pilihan ganda dengan **kartu jawaban cetak** (seperti "paper mode"):
siswa mengangkat kartu, huruf yang menghadap ke **atas** adalah jawabannya, lalu guru
memindai seluruh kelas dengan kamera HP. Nilai langsung terekam.

- **Laptop + proyektor**: menampilkan soal, siapa yang sudah terpindai, dan kunci jawaban.
- **HP guru**: kamera pemindai + tombol kendali (soal berikutnya, tampilkan jawaban).
- Keduanya tersinkron otomatis (Supabase Realtime).
- Laporan nilai per siswa + analisis soal, bisa diunduh sebagai Excel.
- Soal bisa diimpor dari Excel, bisa memakai gambar, dan mendukung teks Arab.

## Alur pemakaian

1. **Kelas**: buat kelas, lalu tempel daftar nama siswa. Nomor kartu dibagikan otomatis.
2. **Cetak kartu**: Beranda → *Cetak Kartu* → pilih kelas → *Cetak*. Setiap siswa selalu memakai kartu bernomor yang sama.
3. **Kuis**: buat kuis dan isi soal (atau *Impor dari Excel*, templatenya tersedia).
4. **Mulai**: di laptop yang tersambung ke proyektor, klik *▶ Mulai*, lalu pilih kelas.
5. Pindai **kode QR** di layar dengan HP untuk membuka pemindai. HP harus login dengan akun yang sama.
6. Bacakan soal. Siswa mengangkat kartu, lalu guru mengarahkan HP ke kelas. Kartu yang terbaca diberi kotak hijau dan HP bergetar.
7. *Tampilkan jawaban*, lalu *Berikutnya*. Di akhir ulangan, klik *Selesai* → *Lihat nilai siswa* → *Unduh Excel*.

Tips memindai: jarak ideal 2–5 m dan cahaya cukup. Gunakan slider zoom (jika HP mendukung)
untuk barisan belakang. Jari siswa jangan menutupi kotak hitam. Jawaban hanya dicatat setelah
kartu terbaca sama di 2 frame, dan siswa yang mengganti jawaban sebelum kunci ditampilkan
akan tercatat jawaban terakhirnya.

---

## Deploy (sekali saja, ±20 menit, semua gratis)

### 1. Supabase (database + login)

1. Daftar di <https://supabase.com> → **New project** (region: *Southeast Asia (Singapore)*). Simpan password database.
2. Buka **SQL Editor** → **New query**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu klik **Run**.
3. Buka **Authentication → Users → Add user → Create new user**. Isi email & kata sandi untuk Ibu dan centang *Auto Confirm User*.
4. Buka **Authentication → Sign In / Providers**, lalu **matikan** *Allow new users to sign up*. Dengan begitu hanya akun Ibu yang bisa masuk.
5. Buka **Project Settings → API** dan catat **Project URL** serta **anon public key**.

> Proyek Supabase gratis akan *di-pause* jika tidak dipakai selama 7 hari. Jika aplikasi tidak bisa login
> setelah libur panjang, buka dashboard Supabase lalu klik **Restore project**.

### 2. Vercel (hosting web)

1. Unggah folder ini ke repositori GitHub (boleh *private*).
2. Daftar di <https://vercel.com> dengan akun GitHub → **Add New → Project**, lalu pilih repositori tersebut.
3. Di **Environment Variables**, isi:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
   - `VITE_WEB3FORMS_KEY` = access key Web3Forms (untuk formulir "Hubungi pengembang" di halaman login; lihat bawah)
4. Klik **Deploy**. Hasilnya adalah alamat seperti `https://quizzora-xxx.vercel.app`. Buka alamat itu di laptop dan HP, lalu login.

### 3. Formulir "Hubungi pengembang" (opsional)

Di halaman login ada tombol **Hubungi** untuk calon pengguna yang ingin minta akun atau lupa kata sandi.
Isinya (nama, email, WhatsApp, sekolah, pesan) dikirim ke email Anda lewat [Web3Forms](https://web3forms.com) (gratis, 250 pesan/bulan):

1. Buka <https://web3forms.com>, masukkan email Anda, lalu klik **Create Access Key**. Key akan dikirim ke email tersebut.
2. Isi `VITE_WEB3FORMS_KEY` di `.env.local` dan di Environment Variables Vercel, lalu deploy ulang.
3. Balas email yang masuk dengan **Reply**, dan balasan langsung tertuju ke email pengirim.

Kamera HP hanya berfungsi di alamat **https://**, dan Vercel sudah menyediakannya otomatis.
Di HP, gunakan **Chrome** (Android) atau **Safari** (iPhone), lalu izinkan akses kamera.

---

## Pengembangan lokal

```bash
npm install
cp .env.example .env.local   # isi URL & key Supabase
npm run dev                  # http://localhost:5173
npm run dev:hp               # HTTPS + bisa diakses HP di jaringan Wi-Fi yang sama (untuk uji kamera)
npm run build
```

### Struktur

| Bagian | Berkas |
| --- | --- |
| Halaman | `src/pages/*` (Home, QuizEditor, ClassEditor, PrintCards, StartSession, Presenter, Scanner, Report) |
| Sinkron realtime | `src/lib/useLiveSession.ts` |
| Deteksi kartu | `src/scan/markers.ts` (kamus marker & arah jawaban), `src/scan/worker.ts` (Web Worker), `src/scan/useCardScanner.ts` (kamera) |
| Library marker | `src/scan/aruco-vendor.js` (js-aruco2, BSD, digabung jadi modul ES) |
| Database | `supabase/schema.sql` |

### Kartu & marker

Kartu memakai marker persegi 5x5 buatan sendiri (`scripts/gen-dictionary.mjs`). Ada 60 kode dengan jarak
Hamming minimal 8 antar kode, termasuk terhadap versi rotasinya, sehingga nomor kartu dan arah jawaban
tidak mudah tertukar. Maksimal 60 siswa per kelas.

Uji deteksi:

- `node scripts/test-markers.mjs`: uji arah A/B/C/D pada gambar sintetis.
- `scripts/scan-test.html`: buka lewat `npm run dev` di `/scripts/scan-test.html?size=40&blur=1&tilt=15` untuk menguji 30 kartu kecil dalam satu frame 1080p.
- `scripts/cards-test.html`: pratinjau kartu cetak.
