import { callFunction } from './supabase'

/**
 * AI function wrappers: all Gemini calls go through the Edge Function.
 * Never expose the API key to the frontend.
 */

/**
 * Suggest 3 weekend getaway places based on city, budget, vibe, days.
 * Returns: { places: [{ name, distance_km, approx_cost_inr, why }] }
 */
export async function aiSuggest({ from_city, budget_per_person_inr, vibe, days }) {
  try {
    const result = await callFunction('ai', {
      mode: 'suggest',
      from_city,
      budget_per_person_inr,
      vibe,
      days,
    })
    return result
  } catch (err) {
    console.error('AI suggest failed:', err)
    // Fallback: return cached popular spots
    return {
      places: [
        {
          name: 'Rishikesh',
          distance_km: 240,
          approx_cost_inr: Math.round(budget_per_person_inr * 0.8),
          why: 'River rafting, scenic mountains and serene vibes',
        },
        {
          name: 'Mussoorie',
          distance_km: 280,
          approx_cost_inr: Math.round(budget_per_person_inr),
          why: 'Picturesque hill station with panoramic mountain views',
        },
        {
          name: 'Jim Corbett',
          distance_km: 250,
          approx_cost_inr: Math.round(budget_per_person_inr * 1.1),
          why: 'Wildlife safari and outdoor adventure',
        },
      ],
    }
  }
}

/**
 * Generate the final trip plan: itinerary, cost breakdown, packing list, reason.
 * Returns: { reason, itinerary: [{day, items: [{time, activity}]}], cost_breakdown: [{item, inr_per_person}], packing_list: [string] }
 */
export async function aiPlan({
  place,
  date,
  days,
  budget_per_person_inr,
  people,
  type,
  comments = [],
}, { timeoutMs = 10000 } = {}) {
  const result = await callFunction(
    'ai',
    {
      mode: 'plan',
      place,
      date,
      days,
      budget_per_person_inr,
      people,
      type,
      comments,
    },
    { timeoutMs }
  )
  if (!result || !Array.isArray(result.itinerary)) {
    throw new Error('AI returned an incomplete itinerary')
  }
  return result
}

/**
 * Generate tasks for the trip and auto-assign them.
 * Returns: { tasks: [{ title, assignee }] }
 */
export async function aiTasks({ plan, people }) {
  try {
    const result = await callFunction('ai', {
      mode: 'tasks',
      plan,
      people,
    })
    return result
  } catch (err) {
    console.error('AI tasks failed:', err)
    // Fallback: basic tasks
    const tasks = [
      'Book transportation / cab',
      'Confirm accommodation',
      'Bring snacks and beverages',
      'Curate road trip playlist',
      'Pack emergency first-aid kit',
    ]
    const shuffled = people.sort(() => Math.random() - 0.5)
    return {
      tasks: tasks.map((title, i) => ({
        title,
        assignee: shuffled[i % shuffled.length],
      })),
    }
  }
}

/**
 * Trip recap for the Memory Card.
 * Returns: { title, recap }
 */
export async function aiRecap({ place, days, people, highlights = [] }) {
  try {
    const result = await callFunction('ai', {
      mode: 'recap',
      place,
      days,
      people,
      highlights,
    })
    return result
  } catch (err) {
    console.error('AI recap failed:', err)
    return {
      title: `${place} Trip ✨`,
      recap: `${people} friends, ${days} days, unforgettable memories!`,
    }
  }
}

/**
 * Check if AI is likely to work (Edge Function deployed).
 * This is a quick ping, not an actual AI call.
 */
export async function checkAI() {
  try {
    await callFunction('ai', { mode: 'ping' }, { timeoutMs: 5000 })
    return true
  } catch {
    return false
  }
}
