import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sesaat setelah login, token dari server Auth bisa "lebih cepat" sepersekian detik
 * dibanding jam server database sehingga ditolak dengan "JWT issued at future".
 * Request seperti itu cukup diulang setelah jeda singkat.
 */
async function fetchWithClockSkewRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(input, init)
    if (res.status !== 401 || attempt >= 4) return res
    const body = await res.clone().text()
    if (!body.includes('issued at future')) return res
    await sleep(700 * (attempt + 1))
  }
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  global: { fetch: fetchWithClockSkewRetry },
})
