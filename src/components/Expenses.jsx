import { useState } from 'react'
import { Plus, Trash2, IndianRupee } from 'lucide-react'
import Button from './Button'
import Field from './Field'
import Avatar from './Avatar'
import { useToast } from './Toast'
import { supabase } from '../lib/supabase'
import { rupees } from '../lib/money'
import { calculateBalances, settle, EXPENSE_CATEGORIES, categoryLabel } from '../lib/settle'

export default function Expenses({ plan, participants }) {
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [shares, setShares] = useState([])
  const [settlements, setSettlements] = useState([])
  
  const [adding, setAdding] = useState(false)
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'other',
    paid_by: null,
    for_all: true,
    selected_people: [],
  })

  // Load data
  async function loadData() {
    const [expRes, sharesRes, settleRes] = await Promise.all([
      supabase.from('expenses').select('*, payer:paid_by(*)').eq('plan_id', plan.id),
      supabase.from('expense_shares').select('*'),
      supabase.from('settlements').select('*, from:from_id(*), to:to_id(*)').eq('plan_id', plan.id),
    ])

    setExpenses(expRes.data || [])
    setShares(sharesRes.data || [])
    setSettlements(settleRes.data || [])
  }

  async function addExpense() {
    if (!newExpense.title.trim() || !newExpense.amount || !newExpense.paid_by) {
      toast.error('Please fill in all fields!')
      return
    }

    try {
      const { data: exp, error } = await supabase
        .from('expenses')
        .insert({
          plan_id: plan.id,
          title: newExpense.title.trim(),
          amount: Number(newExpense.amount),
          category: newExpense.category,
          paid_by: newExpense.paid_by,
        })
        .select()
        .single()

      if (error) throw error

      // Add shares
      const shareRows = newExpense.for_all
        ? participants.map((p) => ({ expense_id: exp.id, participant_id: p.id }))
        : newExpense.selected_people.map((pid) => ({ expense_id: exp.id, participant_id: pid }))

      await supabase.from('expense_shares').insert(shareRows)

      // Recalculate settlements
      await recalculateSettlements()

      setNewExpense({
        title: '',
        amount: '',
        category: 'other',
        paid_by: null,
        for_all: true,
        selected_people: [],
      })
      setAdding(false)
      toast.success('Expense added successfully!')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to save expense')
    }
  }

  async function deleteExpense(expenseId) {
    await supabase.from('expenses').delete().eq('id', expenseId)
    await recalculateSettlements()
    loadData()
    toast.success('Expense deleted')
  }

  async function recalculateSettlements() {
    // Load fresh data
    const { data: allExpenses } = await supabase.from('expenses').select('*').eq('plan_id', plan.id)
    const { data: allShares } = await supabase.from('expense_shares').select('*')

    const balances = calculateBalances(participants, allExpenses || [], allShares || [])
    const transactions = settle(balances)

    // Delete old settlements
    await supabase.from('settlements').delete().eq('plan_id', plan.id)

    // Insert new
    const rows = transactions.map((t) => ({
      plan_id: plan.id,
      from_id: t.from,
      to_id: t.to,
      amount: t.amount,
      status: 'pending',
    }))

    if (rows.length) {
      await supabase.from('settlements').insert(rows)
    }
  }

  async function markSettled(settlementId, status) {
    await supabase.from('settlements').update({ status }).eq('id', settlementId)
    loadData()
  }

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const perPerson = participants.length > 0 ? totalExpense / participants.length : 0

  return (
    <div className="space-y-4">
      <div className="rounded-card border-2 border-ink bg-paper p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-micro uppercase tracking-widest text-ink/50">total expenses</p>
            <p className="mt-1 text-h2 font-black">{rupees(totalExpense)}</p>
            <p className="text-small text-ink/70">{rupees(perPerson)} per person (avg)</p>
          </div>
          <Button type="button" tone="peacock" size="sm" onClick={() => setAdding(!adding)}>
            <Plus size={16} strokeWidth={2.5} /> Add
          </Button>
        </div>
      </div>

      {adding && (
        <div className="rounded-card border-2 border-ink bg-paper-dark p-4 space-y-3">
          <Field
            label="Description"
            placeholder="e.g. Cab fare, Dinner"
            value={newExpense.title}
            onChange={(e) => setNewExpense((n) => ({ ...n, title: e.target.value }))}
            maxLength={60}
          />

          <Field
            label="Amount"
            type="number"
            placeholder="500"
            inputMode="numeric"
            value={newExpense.amount}
            onChange={(e) => setNewExpense((n) => ({ ...n, amount: e.target.value }))}
          />

          <Field
            label="Category"
            as="select"
            value={newExpense.category}
            onChange={(e) => setNewExpense((n) => ({ ...n, category: e.target.value }))}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {categoryLabel(cat.value)}
              </option>
            ))}
          </Field>

          <Field
            label="Paid by"
            as="select"
            value={newExpense.paid_by || ''}
            onChange={(e) => setNewExpense((n) => ({ ...n, paid_by: e.target.value }))}
          >
            <option value="">Select person</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Field>

          <div className="flex gap-2">
            <Button type="button" tone="saffron" block onClick={addExpense}>
              Save
            </Button>
            <Button type="button" tone="paper" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="rounded-card border-2 border-ink bg-paper p-4">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">expenses</p>
          <ul className="mt-2 space-y-2">
            {expenses.map((exp) => (
              <li key={exp.id} className="flex items-center justify-between rounded-input border-2 border-ink bg-paper-dark p-2">
                <div className="flex-1">
                  <p className="text-small font-bold">{exp.title}</p>
                  <p className="text-micro text-ink/60">
                    {exp.payer?.name} paid · {categoryLabel(exp.category)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{rupees(exp.amount)}</span>
                  <button
                    type="button"
                    onClick={() => deleteExpense(exp.id)}
                    className="text-chili"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {settlements.length > 0 && (
        <div className="rounded-card border-2 border-ink bg-rani/10 p-4">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">settlement</p>
          <p className="mt-1 text-small text-ink/70">Who owes whom</p>
          <ul className="mt-2 space-y-2">
            {settlements.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-input border-2 border-ink bg-paper p-2">
                <Avatar name={s.from?.name} size="sm" />
                <div className="flex-1">
                  <p className="text-small">
                    <span className="font-bold">{s.from?.name}</span> → <span className="font-bold">{s.to?.name}</span>
                  </p>
                  <p className="font-mono text-small font-bold text-rani">{rupees(s.amount)}</p>
                </div>
                {s.status === 'pending' && (
                  <Button type="button" tone="peacock" size="sm" onClick={() => markSettled(s.id, 'settled')}>
                    Settled
                  </Button>
                )}
                {s.status === 'settled' && (
                  <span className="rounded-[8px] bg-peacock px-2 py-1 text-micro font-bold text-paper">
                    ✓ Done
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {expenses.length === 0 && !adding && (
        <div className="rounded-card border-2 border-dashed border-ink/40 bg-paper p-4 text-center">
          <p className="text-small text-ink/60">No expenses logged yet. Add anytime to split costs.</p>
        </div>
      )}
    </div>
  )
}
