// Edge Function: ai
// Calls Gemini API with strict JSON prompts for suggest, plan, tasks, recap.
// Environment: GEMINI_API_KEY, GEMINI_MODEL (set via `supabase secrets set`)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash-exp'

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

async function callGemini(prompt: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in Supabase secrets')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  const result = await response.json()
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Gemini returned empty response')
  }

  // Strip markdown code fences if present
  let cleanText = text.trim()
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '')
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '')
  }

  return JSON.parse(cleanText)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const input: AIInput = await req.json()

    // Ping mode: just health check
    if (input.mode === 'ping') {
      return new Response(
        JSON.stringify({ ok: true, model: GEMINI_MODEL }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = buildPrompt(input)
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode or input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await callGemini(prompt)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'AI function failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
