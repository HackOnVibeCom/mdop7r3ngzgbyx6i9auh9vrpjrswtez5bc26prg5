import { createClient } from '@supabase/supabase-js'

// Strip stray surrounding quotes/whitespace that misconfigured env vars often carry
// (e.g. a value accidentally stored as "https://..." with the quotes included).
function cleanEnv(v) {
  return String(v || '').trim().replace(/^['"]+|['"]+$/g, '').trim()
}

function isValidHttpUrl(u) {
  try {
    const p = new URL(u)
    return p.protocol === 'https:' || p.protocol === 'http:'
  } catch {
    return false
  }
}

const url = cleanEnv(import.meta.env.VITE_SUPABASE_URL)
const anonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

/** False when env vars are missing OR invalid. The UI must still render (never white-screen). */
export const isSupabaseConfigured = isValidHttpUrl(url) && Boolean(anonKey)

/** DEMO MODE: disabled - real Supabase is always used */
export const DEMO_MODE = false

let client = null
if (isSupabaseConfigured) {
  try {
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  } catch (err) {
    // A bad URL/key must not crash the whole app at import time.
    console.error('Supabase client init failed — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY:', err?.message || err)
    client = null
  }
}

export const supabase = client

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
