// Library Excel cukup besar, jadi dimuat hanya saat dibutuhkan.
const loadXlsx = () => import('xlsx')

export interface ImportedQuestion {
  text: string
  options: string[]
  correct: number
}

const HEADER = ['Soal', 'A', 'B', 'C', 'D', 'Kunci']

export async function downloadQuestionTemplate() {
  const XLSX = await loadXlsx()
  const ws = XLSX.utils.aoa_to_sheet([
    HEADER,
    ['Rukun Islam ada …', '3', '4', '5', '6', 'C'],
    ['Kitab suci umat Islam adalah …', 'Taurat', 'Zabur', 'Injil', 'Al-Qur’an', 'D'],
    ['Salat lima waktu hukumnya wajib. (Benar/Salah)', 'Benar', 'Salah', '', '', 'A'],
  ])
  ws['!cols'] = [{ wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Soal')
  XLSX.writeFile(wb, 'template-soal-quizzora.xlsx')
}

/** Baca file Excel dengan kolom: Soal, A, B, C, D, Kunci (huruf A–D). Baris pertama = judul kolom. */
export async function readQuestionsFile(file: File): Promise<ImportedQuestion[]> {
  const XLSX = await loadXlsx()
  const wb = XLSX.read(await file.arrayBuffer())
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  const out: ImportedQuestion[] = []
  rows.slice(1).forEach((r, idx) => {
    const cells = r.map((c) => String(c ?? '').trim())
    const [text, a, b, c, d, key] = cells
    if (!text) return
    const options = [a, b, c, d].map((o) => o ?? '')
    const correct = 'ABCD'.indexOf((key ?? '').toUpperCase().charAt(0))
    if (correct < 0 || !options[correct]) throw new Error(`Baris ${idx + 2}: kolom Kunci harus A/B/C/D dan pilihan itu tidak boleh kosong.`)
    if (options.filter(Boolean).length < 2) throw new Error(`Baris ${idx + 2}: minimal 2 pilihan jawaban.`)
    out.push({ text, options, correct })
  })
  return out
}

export async function downloadWorkbook(fileName: string, sheets: { name: string; rows: (string | number)[][]; cols?: number[] }[]) {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows)
    if (s.cols) ws['!cols'] = s.cols.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, s.name.replace(/[\\/?*[\]:]/g, '-').slice(0, 31))
  }
  XLSX.writeFile(wb, fileName)
}
