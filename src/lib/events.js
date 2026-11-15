import { supabase, isSupabaseConfigured } from './supabase'
import { getDeviceId } from './device'

/**
 * Fire-and-forget analytics for the viral loop.
 * Never throws, never blocks the UI.
 * type: plan_view | vote | plan_created | cta_click | share_click | locked | card_download | expense_added
 */
export function track(type, planId = null) {
  if (!isSupabaseConfigured) return
  try {
    supabase
      .from('events')
      .insert({ type, plan_id: planId, device_id: getDeviceId() })
      .then(() => {})
      // eslint-disable-next-line no-console
      .catch(() => {})
  } catch {
    /* analytics must never break a flow */
  }
}
