import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://stxcnjusciiwqebvrboq.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s4g-l9zAgpdlglq73xp2Ww_leRRRayu'

/** False when env vars are missing (fresh clone / first deploy). The UI must still render. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** DEMO MODE: disabled - real Supabase is always used */
export const DEMO_MODE = false

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

/** Base URL of the edge functions, e.g. https://xyz.supabase.co/functions/v1 */
export const functionsBase = isSupabaseConfigured ? `${url}/functions/v1` : ''

/**
 * Call a Supabase Edge Function with the anon key attached.
 * Throws an Error with a human (Hinglish-friendly) message on failure.
 */
export async function callFunction(name, body, { timeoutMs = 25000 } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured (missing environment variables)')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${functionsBase}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    })
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      throw new Error((data && data.error) || `${name} function failed (${res.status})`)
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}
