import { useEffect, useState } from 'react'
import { Plus, Trash2, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Button from './Button'
import Field from './Field'
import Avatar from './Avatar'
import { useToast } from './Toast'
import { supabase } from '../lib/supabase'
import { rupees } from '../lib/money'
import { upiLink } from '../lib/share'
import { getDeviceId } from '../lib/device'
import { calculateBalances, settle, EXPENSE_CATEGORIES, categoryLabel } from '../lib/settle'

export default function Expenses({ plan, participants }) {
  const toast = useToast()
  const deviceId = getDeviceId()
  const [expenses, setExpenses] = useState([])
  const [shares, setShares] = useState([])
  const [settlements, setSettlements] = useState([])
  const [qrOpen, setQrOpen] = useState(null) // settlement id whose QR is expanded
  const [upiDraft, setUpiDraft] = useState({}) // participantId -> typed upi id

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

  // Load existing expenses/settlements as soon as the tab opens, and refresh live.
  useEffect(() => {
    if (!plan?.id) return undefined
    loadData()
    const ch = supabase
      .channel(`plan-${plan.id}-expenses-settlements`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `plan_id=eq.${plan.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `plan_id=eq.${plan.id}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(ch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id])

  // The UPI id a payee should be reached on: their own saved id, or the host's for the host.
  function payeeUpi(payee) {
    if (!payee) return ''
    if (payee.upi_id) return payee.upi_id
    if (plan?.host_upi && payee.device_id === plan.host_device_id) return plan.host_upi
    return ''
  }

  // Let the payee (on their own device) add a UPI id so others can pay them.
  async function savePayeeUpi(payee) {
    const value = (upiDraft[payee.id] || '').trim()
    if (!value) return
    const { error } = await supabase
      .from('participants')
      .update({ upi_id: value })
      .eq('id', payee.id)
      .eq('device_id', deviceId) // own-row guard: you can only set your own UPI
    if (error) {
      toast.error('Could not save UPI id')
      return
    }
    toast.success('UPI id saved — others can pay you now')
    loadData()
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
            {settlements.map((s) => {
              const upi = payeeUpi(s.to)
              const payerIsMe = s.from?.device_id === deviceId
              const payeeIsMe = s.to?.device_id === deviceId
              const link = upi
                ? upiLink({ pa: upi, pn: s.to?.name, am: s.amount, tn: `ChaloPlan ${plan.code}` })
                : ''
              const showQr = qrOpen === s.id
              return (
                <li key={s.id} className="rounded-input border-2 border-ink bg-paper p-2">
                  <div className="flex items-center gap-2">
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
                    {s.status !== 'pending' && (
                      <span className="rounded-[8px] bg-peacock px-2 py-1 text-micro font-bold text-paper">
                        ✓ Done
                      </span>
                    )}
                  </div>

                  {s.status === 'pending' && upi && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-ink/20 pt-2">
                      <Button
                        as="a"
                        href={link}
                        tone="saffron"
                        size="sm"
                        onClick={() => markSettled(s.id, 'paid_upi')}
                      >
                        Pay {rupees(s.amount)} via UPI
                      </Button>
                      <button
                        type="button"
                        onClick={() => setQrOpen(showQr ? null : s.id)}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-[10px] border-2 border-ink bg-paper-dark px-3 text-micro font-bold uppercase"
                        aria-expanded={showQr}
                      >
                        <QrCode size={16} strokeWidth={2.5} /> {showQr ? 'Hide QR' : 'Scan QR'}
                      </button>
                      <span className="font-mono text-micro text-ink/50">{upi}</span>
                      {showQr && (
                        <div className="w-full pt-1 text-center">
                          <div className="inline-block rounded-input border-2 border-ink bg-paper p-3">
                            <QRCodeSVG value={link} size={160} includeMargin={false} />
                          </div>
                          <p className="mt-1 text-micro text-ink/60">
                            Scan with any UPI app to pay {s.to?.name}. ChaloPlan never touches the money.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {s.status === 'pending' && !upi && (
                    <div className="mt-2 border-t-2 border-dashed border-ink/20 pt-2">
                      {payeeIsMe ? (
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Field
                              label="Add your UPI id to get paid"
                              placeholder="name@upi"
                              value={upiDraft[s.to.id] || ''}
                              onChange={(e) => setUpiDraft((d) => ({ ...d, [s.to.id]: e.target.value }))}
                            />
                          </div>
                          <Button type="button" tone="peacock" size="sm" onClick={() => savePayeeUpi(s.to)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="text-micro text-ink/60">
                          {s.to?.name} hasn’t added a UPI id yet
                          {payerIsMe ? ' — settle in cash or nudge them to add one.' : '.'}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
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
