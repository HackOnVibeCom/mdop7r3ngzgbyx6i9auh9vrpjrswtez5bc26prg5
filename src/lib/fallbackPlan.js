/**
 * Fallback plan generator when AI fails or times out.
 * Returns a minimal but valid itinerary structure.
 */

export function generateFallbackPlan({ place, date, days, budget_per_person_inr, type }) {
  const dayItems = []
  
  for (let i = 1; i <= (days || 1); i++) {
    dayItems.push({
      day: i,
      items: [
        { time: '09:00', activity: `Meet at ${place || 'starting point'}` },
        { time: '12:00', activity: type === 'movie' ? 'Movie time' : 'Lunch break' },
        { time: '15:00', activity: type === 'trip' ? 'Explore the area' : 'Main activity' },
        { time: '18:00', activity: type === 'birthday' ? 'Cake cutting' : 'Evening chill' },
        { time: '21:00', activity: 'Wrap up and head back' },
      ],
    })
  }

  return {
    reason: 'Plan auto-generated based on group votes',
    itinerary: dayItems,
    cost_breakdown: [
      { item: 'Food & drinks', inr_per_person: Math.floor(budget_per_person_inr * 0.4) },
      { item: 'Transport', inr_per_person: Math.floor(budget_per_person_inr * 0.3) },
      { item: 'Activities', inr_per_person: Math.floor(budget_per_person_inr * 0.3) },
    ],
    packing_list: ['Water bottle', 'Phone charger', 'Sunglasses', 'Cash/cards'],
    approx: true, // Mark as fallback
  }
}
