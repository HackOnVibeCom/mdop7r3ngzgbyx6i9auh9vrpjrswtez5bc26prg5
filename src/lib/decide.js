import { median } from './money'

/**
 * Decision logic: pick the best date, place, and budget from votes.
 * CRITICAL: This is code, not AI. Results must be fair and deterministic.
 * Safe with zero or one voter.
 */

/**
 * Best date: highest score (Yes = 2 pts, Maybe = 1 pt, No = 0).
 * Tie: earliest date wins.
 */
export function bestDate(dateOptions = [], votes = []) {
  if (!dateOptions.length) return null

  const scores = {}
  dateOptions.forEach((opt) => {
    scores[opt.id] = 0
  })

  votes.forEach((v) => {
    if (!Object.prototype.hasOwnProperty.call(scores, v.option_id)) return
    if (v.value === 'yes') scores[v.option_id] += 2
    if (v.value === 'maybe') scores[v.option_id] += 1
  })

  const sorted = dateOptions
    .map((opt) => ({ ...opt, score: scores[opt.id] || 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.value || '').localeCompare(b.value || '')
    })

  return sorted[0] || null
}

/**
 * Best place: most Yes votes.
 * Tie: first place option in the original list.
 */
export function bestPlace(placeOptions = [], votes = []) {
  if (!placeOptions.length) return null

  const counts = {}
  placeOptions.forEach((opt) => {
    counts[opt.id] = 0
  })

  votes.forEach((v) => {
    if (!Object.prototype.hasOwnProperty.call(counts, v.option_id)) return
    if (v.value === 'yes') counts[v.option_id] += 1
  })

  const order = new Map(placeOptions.map((opt, i) => [opt.id, i]))
  const sorted = placeOptions
    .map((opt) => ({ ...opt, count: counts[opt.id] || 0 }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    })

  return sorted[0] || null
}

/**
 * Best budget: median of all participant budget votes.
 */
export function bestBudget(budgetVotes = []) {
  const values = budgetVotes.filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
  if (!values.length) return null
  return median(values)
}

export function votingStats(participants = [], votes = [], options = []) {
  const voted = new Set(votes.map((v) => v.participant_id))
  const didVote = participants.filter((p) => voted.has(p.id) || p.has_voted)
  const didntVote = participants.filter((p) => !voted.has(p.id) && !p.has_voted)

  const optionCounts = {}
  options.forEach((opt) => {
    optionCounts[opt.id] = { yes: 0, maybe: 0, no: 0 }
  })

  votes.forEach((v) => {
    if (optionCounts[v.option_id]) {
      optionCounts[v.option_id][v.value] = (optionCounts[v.option_id][v.value] || 0) + 1
    }
  })

  return {
    total: participants.length,
    voted: didVote.length,
    didVote,
    didntVote,
    optionCounts,
  }
}
