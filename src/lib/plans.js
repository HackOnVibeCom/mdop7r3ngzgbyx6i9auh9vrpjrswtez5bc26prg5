import { supabase, isSupabaseConfigured } from './supabase'
import { makeCode } from './code'
import { getDeviceId, getRef } from './device'

/** Plan types that always run as a multi-day trip. */
export const TRIP_TYPES = ['trip']

export function modeForType(type) {
  return TRIP_TYPES.includes(type) ? 'trip' : 'short'
}

function requireDb() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase connect nahi hai — .env.local mein keys daalo')
  }
}

/** Resolve the referring plan (from ?ref=code) to its id, so we can attribute the loop. */
async function resolveRefPlanId() {
  const ref = getRef()
  if (!ref) return null
  try {
    const { data } = await supabase.from('plans').select('id').eq('code', ref).maybeSingle()
    return data ? data.id : null
  } catch {
    return null
  }
}

/**
 * Insert the plan with a fresh 6-char code, retrying on the unique-code collision.
 * Then insert its options. Returns the created plan row.
 */
export async function createPlan(draft) {
  requireDb()
  const deviceId = getDeviceId()
  const refPlanId = await resolveRefPlanId()

  const base = {
    type: draft.type,
    mode: modeForType(draft.type),
    title: draft.title.trim(),
    emoji: draft.emoji || '🎒',
    host_name: draft.hostName.trim(),
    host_device_id: deviceId,
    host_upi: draft.hostUpi ? draft.hostUpi.trim() : null,
    from_city: draft.fromCity ? draft.fromCity.trim() : null,
    days: modeForType(draft.type) === 'trip' ? Number(draft.days) || 1 : 1,
    budget_min: Number(draft.budgetMin) || 0,
    budget_max: Number(draft.budgetMax) || 0,
    deadline: draft.deadline || null,
    status: 'voting',
    ref_plan_id: refPlanId,
  }

  let plan = null
  let lastError = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('plans')
      .insert({ ...base, code: makeCode() })
      .select()
      .single()

    if (!error) {
      plan = data
      break
    }
    lastError = error
    // 23505 = unique violation on `code`; anything else is a real failure.
    if (error.code !== '23505') throw new Error(error.message || 'Plan ban nahi paaya')
  }

  if (!plan) {
    throw new Error((lastError && lastError.message) || 'Code generate nahi ho paaya, phir try karo')
  }

  const rows = []
  draft.dates.forEach((date, i) => {
    if (!date.value) return
    rows.push({
      plan_id: plan.id,
      kind: 'date',
      label: date.label || date.value,
      value: date.value,
      meta: date.slot ? { slot: date.slot } : null,
      sort: i,
    })
  })
  draft.places.forEach((place, i) => {
    const label = typeof place === 'string' ? place : place.label
    if (!label || !label.trim()) return
    rows.push({
      plan_id: plan.id,
      kind: 'place',
      label: label.trim(),
      value: label.trim(),
      meta: typeof place === 'string' ? null : place.meta || null,
      sort: i,
    })
  })
  ;(draft.movies || []).forEach((movie, i) => {
    const label = typeof movie === 'string' ? movie : movie.label
    if (!label || !label.trim()) return
    rows.push({
      plan_id: plan.id,
      kind: 'movie',
      label: label.trim(),
      value: label.trim(),
      meta: null,
      sort: i,
    })
  })

  if (rows.length) {
    const { error } = await supabase.from('options').insert(rows)
    if (error) throw new Error(error.message || 'Options save nahi hue')
  }

  return plan
}

/** Fetch a plan plus its options by 6-char code. Returns null when not found. */
export async function fetchPlanByCode(code) {
  requireDb()
  const clean = String(code || '').toLowerCase()
  
  const { data: plan, error } = await supabase
    .from('plans')
    .select('*')
    .eq('code', clean)
    .maybeSingle()

  if (error) throw new Error(error.message || 'Plan load nahi hua')
  if (!plan) return null

  const { data: options, error: optionsError } = await supabase
    .from('options')
    .select('*')
    .eq('plan_id', plan.id)
    .order('kind', { ascending: true })
    .order('sort', { ascending: true })

  if (optionsError) throw new Error(optionsError.message || 'Options load nahi hue')

  return { plan, options: options || [] }
}

export function optionsOfKind(options = [], kind) {
  return options.filter((o) => o.kind === kind)
}

export function isHost(plan) {
  if (!plan) return false
  return plan.host_device_id === getDeviceId()
}
