// Edge Function: ai
// Calls Gemini with strict JSON prompts for suggest, plan, tasks, recap, ping.
// Environment: GEMINI_API_KEY, GEMINI_MODEL (set via `supabase secrets set`).
// The API key is sent via the x-goog-api-key header (never in the URL or logs).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const DEFAULT_MODEL = 'gemini-3.8-flash'
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL
// Ordered fallbacks. The configured model is tried first, then these.
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SuggestInput {
  mode: 'suggest'
  from_city: string
  budget_per_person_inr: number
  vibe: string
  days: number
}

interface PlanInput {
  mode: 'plan'
  place: string
  date: string
  days: number
  budget_per_person_inr: number
  people: number
  type: string
  comments: string[]
}

interface TasksInput {
  mode: 'tasks'
  plan: any
  people: string[]
}

interface RecapInput {
  mode: 'recap'
  place: string
  days: number
  people: number
  highlights: string[]
}

type AIInput = SuggestInput | PlanInput | TasksInput | RecapInput | { mode: 'ping' }

function buildPrompt(input: AIInput): string | null {
  if (input.mode === 'ping') return null

  if (input.mode === 'suggest') {
    const { from_city, budget_per_person_inr, vibe, days } = input
    return `You suggest weekend getaway or outing places for a group of Indian college students.

Input: from_city="${from_city}", budget_per_person_inr=${budget_per_person_inr}, vibe="${vibe}", days=${days}

Return ONLY valid JSON (no markdown, no explanation):
{
  "places": [
    {"name": "string", "distance_km": number, "approx_cost_inr": number, "why": "string"}
  ]
}

Rules:
- Exactly 3 places
- "why" max 12 words, casual Hinglish
- Costs are rough estimates within the budget
- Places should match the vibe: ${vibe === 'chill' ? 'relaxed, peaceful' : vibe === 'adventure' ? 'trekking, rafting, outdoor' : vibe === 'party' ? 'nightlife, events' : 'temples, meditation'}
- Distance from ${from_city}, realistic for ${days} days`
  }

  if (input.mode === 'plan') {
    const { place, date, days, budget_per_person_inr, people, type, comments } = input
    const commentsText = comments && comments.length ? comments.join('; ') : 'none'
    return `You write a short trip plan for a group of Indian friends.

Input: place="${place}", date="${date}", days=${days}, budget_per_person=${budget_per_person_inr}, people=${people}, type="${type}", comments="${commentsText}"

Return ONLY valid JSON (no markdown):
{
  "reason": "string",
  "itinerary": [
    {"day": number, "items": [{"time": "HH:MM", "activity": "string"}]}
  ],
  "cost_breakdown": [{"item": "string", "inr_per_person": number}],
  "packing_list": ["string"]
}

Rules:
- "reason" in 1-2 lines, casual Hinglish, explain why this date/place is good
- Max 5 items per day, realistic times
- Total cost_breakdown must sum close to ${budget_per_person_inr} per person
- Cost items: Travel, Stay, Food, Entry/Activities, Misc
- Packing list: 5-8 practical items based on weather and activities
- Never claim prices are exact - they are estimates
- Use friends' comments if relevant`
  }

  if (input.mode === 'tasks') {
    const { plan, people } = input
    const placeLabel = plan?.title || 'trip'
    const daysLabel = plan?.days || 1
    return `Create a task list for this group plan and assign tasks fairly.

Input: plan="${placeLabel}", days=${daysLabel}, people=${JSON.stringify(people)}

Return ONLY valid JSON:
{
  "tasks": [{"title": "string", "assignee": "string"}]
}

Rules:
- 5-10 tasks total
- Every person gets at least one task
- Task titles max 6 words
- Tasks like: "Cab book karo", "Hotel confirm karo", "Snacks lekar aao", "Playlist bana lo", "First-aid kit", "Speaker lekar aana"
- Assignee must be one of the people from the input list`
  }

  if (input.mode === 'recap') {
    const { place, days, people, highlights } = input
    const highlightsText = highlights && highlights.length ? highlights.join(', ') : 'fun memories'
    return `Write a fun 2-line recap of a finished group trip for an Instagram story card.

Input: place="${place}", days=${days}, people=${people}, highlights="${highlightsText}"

Return ONLY valid JSON:
{
  "title": "string",
  "recap": "string"
}

Rules:
- "title" max 4 words, like "${place} diaries ✨"
- "recap" max 25 words total, Hinglish, no hashtags
- Mention the highlights if relevant
- Vibe: nostalgic, fun, group bonding`
  }

  return null
}

/** Configured model first, then ordered fallbacks (de-duplicated). Capped so the
 * total time (attempts x PER_MODEL_TIMEOUT) stays under the edge function limit. */
function modelChain(): string[] {
  const seen = new Set<string>()
  const chain: string[] = []
  for (const m of [GEMINI_MODEL, ...FALLBACK_MODELS]) {
    if (m && !seen.has(m)) {
      seen.add(m)
      chain.push(m)
    }
  }
  return chain.slice(0, 2)
}

/** Strip ```json fences and extract the first {...} block, then JSON.parse. */
function extractJson(text: string): any {
  let t = (text || '').trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    t = t.slice(start, end + 1)
  }
  return JSON.parse(t)
}

type ModelResult =
  | { ok: true; json: any }
  | { ok: false; status: number; error: string }

// Per-model wall-clock budget. Keeps the whole function well under Supabase's
// edge limit even if we fall through the model chain.
const PER_MODEL_TIMEOUT_MS = 22000

async function callOneModel(model: string, prompt: string, maxOutputTokens = 2048): Promise<ModelResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY, // key stays out of the URL / logs
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
            maxOutputTokens,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    )
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError'
    return { ok: false, status: aborted ? 504 : 503, error: aborted ? `model ${model} timed out` : 'network error contacting Gemini' }
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    let msg = ''
    try {
      const body = await response.json()
      msg = body?.error?.message || ''
    } catch {
      msg = ''
    }
    return { ok: false, status: response.status, error: msg || `HTTP ${response.status}` }
  }

  const result = await response.json()
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    return { ok: false, status: 502, error: 'Gemini returned an empty response' }
  }
  try {
    return { ok: true, json: extractJson(text) }
  } catch {
    return { ok: false, status: 502, error: 'Could not parse JSON from Gemini output' }
  }
}

class GeminiError extends Error {
  status: number
  tried: string[]
  constructor(message: string, status: number, tried: string[]) {
    super(message)
    this.status = status
    this.tried = tried
  }
}

/** Walk the model chain, advancing on transient/availability errors. */
async function callGemini(prompt: string): Promise<{ json: any; model: string; tried: string[] }> {
  if (!GEMINI_API_KEY) {
    throw new GeminiError('GEMINI_API_KEY not set in Supabase secrets', 500, [])
  }
  const chain = modelChain()
  const tried: string[] = []
  let lastStatus = 502
  let lastError = 'no models attempted'

  for (const model of chain) {
    tried.push(model)
    const r = await callOneModel(model, prompt)
    if (r.ok) return { json: r.json, model, tried }

    lastStatus = r.status
    lastError = r.error
    // Try the next model only when it's a model-availability / transient error.
    const retryable = [404, 429, 500, 502, 503, 504].includes(r.status)
    if (!retryable) break // 400/401/403 etc. won't be fixed by another model
  }

  throw new GeminiError(`Gemini request failed: ${lastError}`, lastStatus, tried)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  let input: AIInput
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // Ping: make a tiny REAL call so the key + an available model are verified.
  if (input.mode === 'ping') {
    try {
      const { model, tried } = await callGemini('Return ONLY this JSON: {"ok": true}')
      return json({ ok: true, model, model_tried: tried })
    } catch (err) {
      const e = err as GeminiError
      console.error('AI ping failed:', e.message)
      return json({ ok: false, error: e.message, model_tried: e.tried || [] }, e.status || 500)
    }
  }

  const prompt = buildPrompt(input)
  if (!prompt) {
    return json({ error: 'Invalid mode or input' }, 400)
  }

  try {
    const { json: result } = await callGemini(prompt)
    return json(result)
  } catch (err) {
    const e = err as GeminiError
    console.error('AI function error:', e.message)
    return json({ error: e.message, model_tried: e.tried || [] }, e.status || 500)
  }
})
