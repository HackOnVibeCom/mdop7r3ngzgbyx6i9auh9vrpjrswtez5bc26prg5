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
          why: 'River rafting aur yoga, chill vibes',
        },
        {
          name: 'Mussoorie',
          distance_km: 280,
          approx_cost_inr: Math.round(budget_per_person_inr),
          why: 'Hill station, mast views',
        },
        {
          name: 'Jim Corbett',
          distance_km: 250,
          approx_cost_inr: Math.round(budget_per_person_inr * 1.1),
          why: 'Wildlife safari, adventure',
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
}) {
  try {
    const result = await callFunction('ai', {
      mode: 'plan',
      place,
      date,
      days,
      budget_per_person_inr,
      people,
      type,
      comments,
    })
    return result
  } catch (err) {
    console.error('AI plan failed:', err)
    // Fallback: minimal plan
    return {
      reason: `${people} log ${place} ja rahe hain!`,
      itinerary: [
        {
          day: 1,
          items: [
            { time: '08:00', activity: 'Niklo ghar se' },
            { time: '12:00', activity: 'Lunch break' },
            { time: '15:00', activity: `${place} pahuncho aur explore karo` },
            { time: '20:00', activity: 'Dinner aur rest' },
          ],
        },
      ],
      cost_breakdown: [
        { item: 'Travel', inr_per_person: Math.round(budget_per_person_inr * 0.3) },
        { item: 'Stay', inr_per_person: Math.round(budget_per_person_inr * 0.4) },
        { item: 'Food', inr_per_person: Math.round(budget_per_person_inr * 0.2) },
        { item: 'Misc', inr_per_person: Math.round(budget_per_person_inr * 0.1) },
      ],
      packing_list: ['Kapde', 'Charger', 'Paani ki bottle', 'Sunglasses', 'First aid'],
    }
  }
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
      'Cab book karo',
      'Hotel confirm karo',
      'Snacks lekar aao',
      'Playlist bana lo',
      'First-aid kit',
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
      title: `${place} trip ✨`,
      recap: `${people} dost, ${days} din, zero jhagde!`,
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
