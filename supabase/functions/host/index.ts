// Edge Function: host
// Host-only operations: generate AI plan, lock plan, update plan status.
// Uses service role key to bypass RLS, but verifies host_device_id.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateInput {
  action: 'generate'
  plan_id: string
  device_id: string
  ai_plan: any
  final_date_option?: string
  final_place_option?: string
  final_movie_option?: string
  final_budget?: number
  meeting_point?: any
}

interface LockInput {
  action: 'lock'
  plan_id: string
  device_id: string
}

interface UpdateDetailsInput {
  action: 'update_details'
  plan_id: string
  device_id: string
  details: any
}

type HostInput = GenerateInput | LockInput | UpdateDetailsInput

async function verifyHost(planId: string, deviceId: string): Promise<boolean> {
  const { data: plan } = await supabase
    .from('plans')
    .select('host_device_id')
    .eq('id', planId)
    .maybeSingle()

  if (!plan || plan.host_device_id !== deviceId) {
    return false
  }
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const input: HostInput = await req.json()
    const { action, plan_id, device_id } = input

    // Verify this device is the host
    const isHost = await verifyHost(plan_id, device_id)
    if (!isHost) {
      return new Response(
        JSON.stringify({ error: 'Not authorized: you are not the host' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'generate') {
      const { ai_plan, final_date_option, final_place_option, final_movie_option, final_budget, meeting_point } = input as GenerateInput

      const updates: any = {
        ai_plan,
        final_date_option: final_date_option || null,
        final_place_option: final_place_option || null,
        final_movie_option: final_movie_option || null,
        final_budget: final_budget || null,
        meeting_point: meeting_point || null,
      }

      const { error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', plan_id)

      if (error) {
        throw new Error(error.message)
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'lock') {
      const { error } = await supabase
        .from('plans')
        .update({ status: 'locked', locked_at: new Date().toISOString() })
        .eq('id', plan_id)

      if (error) {
        throw new Error(error.message)
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_details') {
      const { details } = input as UpdateDetailsInput

      const { error } = await supabase
        .from('plans')
        .update({ details })
        .eq('id', plan_id)

      if (error) {
        throw new Error(error.message)
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Host function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Host function failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
