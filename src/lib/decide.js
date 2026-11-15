import { median } from './money'

/**
 * Decision logic: pick the best date, place, and budget from votes.
 * CRITICAL: This is code, not AI. Results must be fair and deterministic.
 */

/**
 * Best date: highest score (Yes = 2 pts, Maybe = 1 pt, No = 0).
 * Tie: earliest date wins.
 */
export function bestDate(dateOptions, votes) {
  if (!dateOptions.length) return null

  const scores = {}
  dateOptions.forEach((opt) => {
    scores[opt.id] = 0
  })

  votes.forEach((v) => {
    if (v.value === 'yes') scores[v.option_id] = (scores[v.option_id] || 0) + 2
    if (v.value === 'maybe') scores[v.option_id] = (scores[v.option_id] || 0) + 1
  })

  const sorted = dateOptions
    .map((opt) => ({ ...opt, score: scores[opt.id] || 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Tie: prefer earlier date
      return (a.value || '').localeCompare(b.value || '')
    })

  return sorted[0]
}

/**
 * Best place: most Yes votes.
 * Tie: let AI pick with a one-line reason.
 */
export function bestPlace(placeOptions, votes) {
  if (!placeOptions.length) return null

  const counts = {}
  placeOptions.forEach((opt) => {
    counts[opt.id] = 0
  })

  votes.forEach((v) => {
    if (v.value === 'yes') counts[v.option_id] = (counts[v.option_id] || 0) + 1
  })

  const sorted = placeOptions
    .map((opt) => ({ ...opt, count: counts[opt.id] || 0 }))
    .sort((a, b) => b.count - a.count)

  // Check for tie at the top
  const topCount = sorted[0].count
  const tied = sorted.filter((p) => p.count === topCount)
  if (tied.length > 1) {
    return { options: tied, needsTieBreak: true }
  }

  return sorted[0]
}

/**
 * Best budget: median of all participant budget votes.
 * Median is fairer than average (one rich friend doesn't skew the budget).
 */
export function bestBudget(budgetVotes) {
  const values = budgetVotes.filter((v) => typeof v === 'number' && v > 0)
  if (!values.length) return null
  return median(values)
}

/**
 * Voting stats for the UI:
 * - Total participants
 * - Who voted, who didn't
 * - Vote counts per option
 */
export function votingStats(participants, votes, options) {
  const voted = new Set(votes.map((v) => v.participant_id))
  const didVote = participants.filter((p) => voted.has(p.id))
  const didntVote = participants.filter((p) => !voted.has(p.id))

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
