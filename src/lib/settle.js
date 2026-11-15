/**
 * Expense settlement: who owes whom how much.
 * Greedy algorithm: minimize the number of transactions.
 */

/**
 * Calculate net balance for each participant:
 * balance = (what they paid) - (their share of all expenses)
 * 
 * Positive balance = they're owed money
 * Negative balance = they owe money
 */
export function calculateBalances(participants, expenses, expenseShares) {
  const balances = {}
  participants.forEach((p) => {
    balances[p.id] = { name: p.name, net: 0 }
  })

  expenses.forEach((exp) => {
    // Who paid?
    if (balances[exp.paid_by]) {
      balances[exp.paid_by].net += Number(exp.amount)
    }

    // Who shares this expense?
    const shares = expenseShares.filter((s) => s.expense_id === exp.id)
    if (shares.length === 0) return // No shares = skip

    const perPerson = Number(exp.amount) / shares.length
    shares.forEach((share) => {
      if (balances[share.participant_id]) {
        balances[share.participant_id].net -= perPerson
      }
    })
  })

  return balances
}

/**
 * Settle balances with minimum transactions.
 * 
 * @param {Object} balances - { participantId: { name, net } }
 * @returns {Array} - [{ from, to, fromName, toName, amount }]
 */
export function settle(balances) {
  const creditors = [] // People who are owed (positive balance)
  const debtors = [] // People who owe (negative balance)

  Object.entries(balances).forEach(([id, { name, net }]) => {
    if (net > 0.5) creditors.push({ id, name, amount: net })
    else if (net < -0.5) debtors.push({ id, name, amount: -net })
  })

  // Sort descending by amount for greedy matching
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transactions = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(debtor.amount, creditor.amount)

    if (amount >= 0.5) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        fromName: debtor.name,
        toName: creditor.name,
        amount: Math.round(amount),
      })
    }

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount < 0.5) i++
    if (creditor.amount < 0.5) j++
  }

  return transactions
}

/**
 * Categorize expenses for breakdown display.
 */
export const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel', emoji: '🚗' },
  { value: 'stay', label: 'Stay', emoji: '🏠' },
  { value: 'food', label: 'Food', emoji: '🍕' },
  { value: 'tickets', label: 'Tickets', emoji: '🎫' },
  { value: 'other', label: 'Other', emoji: '💰' },
]

export function categoryLabel(cat) {
  const found = EXPENSE_CATEGORIES.find((c) => c.value === cat)
  return found ? `${found.emoji} ${found.label}` : '💰 Other'
}

/**
 * Total expense breakdown by category.
 */
export function expenseBreakdown(expenses) {
  const totals = {
    travel: 0,
    stay: 0,
    food: 0,
    tickets: 0,
    other: 0,
  }

  expenses.forEach((exp) => {
    const cat = exp.category || 'other'
    totals[cat] = (totals[cat] || 0) + Number(exp.amount)
  })

  return totals
}
