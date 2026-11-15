import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Share2, Sparkles, Lock, Calendar, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import BoardingPass from '../components/BoardingPass'
import JourneyRail, { JOURNEY_STAGES } from '../components/JourneyRail'
import Button from '../components/Button'
import Field from '../components/Field'
import DualRange from '../components/DualRange'
import Avatar from '../components/Avatar'
import Logo from '../components/Logo'
import ViralFooter from '../components/ViralFooter'
import HandNote from '../components/HandNote'
import StatusCard from '../components/StatusCard'
import TicketCard from '../components/TicketCard'
import { TicketSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { fetchPlanByCode, optionsOfKind, isHost } from '../lib/plans'
import { deadlineLabel, prettyDate, slotLabel } from '../lib/dates'
import { rupees, approx } from '../lib/money'
import { track } from '../lib/events'
import { supabase, isSupabaseConfigured, callFunction } from '../lib/supabase'
import { getDeviceId, getName, setName as saveNameToStorage } from '../lib/device'
import { bestDate, bestPlace, bestBudget, votingStats } from '../lib/decide'
import { aiPlan as callAIPlan, aiTasks as callAITasks } from '../lib/ai'
import { downloadIcs, makeIcs, nudgeText, whatsappLink } from '../lib/share'
import { generateFallbackPlan } from '../lib/fallbackPlan'

const STAGE_FOR_STATUS = { voting: 2, deciding: 3, decided: 4, locked: 5, live: 6, done: 7 }

export default function PlanPage() {
  const { code = '' } = useParams()
  const clean = code.toLowerCase()
  const toast = useToast()

  const [state, setState] = useState({ loading: true, plan: null, options: [], error: '' })
  const [participants, setParticipants] = useState([])
  const [votes, setVotes] = useState([])
  const [tasks, setTasks] = useState([])
  const [expenses, setExpenses] = useState([])

  const [myName, setMyName] = useState(getName() || '')
  const [myArea, setMyArea] = useState('')
  const [myBudget, setMyBudget] = useState(3000)
  const [myComment, setMyComment] = useState('')
  const [myVotes, setMyVotes] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [locking, setLocking] = useState(false)

  const [myParticipant, setMyParticipant] = useState(null)
  const [editingVote, setEditingVote] = useState(false)
  const hasVoted = myParticipant?.has_voted || false
  const ownsVote = Boolean(myParticipant && myParticipant.device_id === getDeviceId())
  const [autoDeciding, setAutoDeciding] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState({ loading: false, plan: null, options: [], error: 'Supabase keys not configured' })
      return
    }
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const result = await fetchPlanByCode(clean)
      if (!result) {
        setState({ loading: false, plan: null, options: [], error: 'Plan not found' })
        return
      }
      setState({ loading: false, plan: result.plan, options: result.options, error: '' })
      track('plan_view', result.plan.id)

      loadParticipants(result.plan.id)
      loadVotes(result.plan.id)
      loadTasks(result.plan.id)
      loadExpenses(result.plan.id)
    } catch (err) {
      setState({ loading: false, plan: null, options: [], error: err.message || 'Failed to load plan' })
    }
  }, [clean])

  const loadParticipants = useCallback(async (planId) => {
    const { data } = await supabase.from('participants').select('*').eq('plan_id', planId)
    setParticipants(data || [])

    const mine = (data || []).find((p) => p.device_id === getDeviceId())
    setMyParticipant(mine || null)
    if (mine) {
      setMyName(mine.name)
      setMyArea(mine.area || '')
      setMyBudget(mine.budget_vote || 3000)
      setMyComment(mine.comment || '')
    }
  }, [])

  const loadVotes = useCallback(async (planId) => {
    const { data: optionsData } = await supabase.from('options').select('id').eq('plan_id', planId)
    if (!optionsData) return

    const optionIds = optionsData.map((o) => o.id)
    const { data } = await supabase.from('votes').select('*').in('option_id', optionIds)
    setVotes(data || [])
  }, [])

  const loadTasks = useCallback(async (planId) => {
    const { data } = await supabase.from('tasks').select('*, assignee:assignee_id(*)').eq('plan_id', planId)
    setTasks(data || [])
  }, [])

  const loadExpenses = useCallback(async (planId) => {
    const { data } = await supabase.from('expenses').select('*').eq('plan_id', planId)
    setExpenses(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Auto-decide when deadline passes — first client to open the plan wins the DB lock.
  useEffect(() => {
    if (!state.plan || state.plan.status !== 'voting' || autoDeciding) return
    if (!state.plan.deadline) return
    if (new Date(state.plan.deadline) > new Date()) return
    setAutoDeciding(true)
    autoDecide()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plan, autoDeciding])

  async function autoDecide() {
    const planRow = state.plan
    if (!planRow) {
      setAutoDeciding(false)
      return
    }
    try {
      const dateOptions = optionsOfKind(state.options, 'date')
      const placeOptions = optionsOfKind(state.options, 'place')
      const winningDate = bestDate(dateOptions, votes)
      const winningPlace = bestPlace(placeOptions, votes)
      const winningBudget = bestBudget(participants.map((p) => p.budget_vote)) || 3000

      const { data: updated, error: updateError } = await supabase
        .from('plans')
        .update({ status: 'deciding' })
        .eq('id', planRow.id)
        .eq('status', 'voting')
        .select('id')
        .maybeSingle()

      if (updateError || !updated) {
        return
      }

      const payload = {
        place: winningPlace?.label || planRow.from_city || 'destination',
        date: winningDate?.value || new Date().toISOString().slice(0, 10),
        days: planRow.days || 1,
        budget_per_person_inr: winningBudget,
        people: Math.max(1, participants.length),
        type: planRow.type,
        comments: participants.map((p) => p.comment).filter(Boolean),
      }

      let plan
      try {
        plan = await callAIPlan(payload, { timeoutMs: 10000 })
      } catch {
        plan = generateFallbackPlan(payload)
      }

      await supabase
        .from('plans')
        .update({
          status: 'decided',
          ai_plan: plan,
          final_date_option: winningDate?.id || null,
          final_place_option: winningPlace?.id || null,
          final_budget: winningBudget,
        })
        .eq('id', planRow.id)
        .eq('status', 'deciding')

      toast.success('Plan auto-generated based on votes!')
      load()
    } catch {
      await supabase
        .from('plans')
        .update({ status: 'voting' })
        .eq('id', state.plan.id)
        .eq('status', 'deciding')
    } finally {
      setAutoDeciding(false)
    }
  }

  // Realtime
  useEffect(() => {
    if (!state.plan) return

    const ch1 = supabase.channel(`plan-${state.plan.id}-participants`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `plan_id=eq.${state.plan.id}` }, () => loadParticipants(state.plan.id))
      .subscribe()

    const ch2 = supabase.channel(`plan-${state.plan.id}-votes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => loadVotes(state.plan.id))
      .subscribe()

    const ch3 = supabase.channel(`plan-${state.plan.id}-tasks`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `plan_id=eq.${state.plan.id}` }, () => loadTasks(state.plan.id))
      .subscribe()

    const ch4 = supabase.channel(`plan-${state.plan.id}-plan`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plans', filter: `id=eq.${state.plan.id}` }, (payload) => {
        setState((s) => ({ ...s, plan: payload.new }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      supabase.removeChannel(ch3)
      supabase.removeChannel(ch4)
    }
  }, [state.plan, loadParticipants, loadVotes, loadTasks])

  async function submitVote() {
    if (!myName.trim()) {
      toast.error('Please enter your name!')
      return
    }
    setSubmitting(true)
    try {
      saveNameToStorage(myName)

      let participant = myParticipant
      if (!participant) {
        const { data, error } = await supabase.from('participants').insert({
          plan_id: state.plan.id,
          name: myName.trim(),
          device_id: getDeviceId(),
          area: myArea.trim() || null,
          budget_vote: myBudget,
          comment: myComment.trim() || null,
          has_voted: true,
        }).select().single()

        if (error) throw new Error(error.message)
        participant = data
        setMyParticipant(data)
      } else {
        // Only allow editing own vote
        if (participant.device_id !== getDeviceId()) {
          toast.error('You can only edit your own vote')
          setSubmitting(false)
          return
        }

        const { error } = await supabase.from('participants').update({
          name: myName.trim(),
          area: myArea.trim() || null,
          budget_vote: myBudget,
          comment: myComment.trim() || null,
          has_voted: true,
        }).eq('id', participant.id)

        if (error) throw new Error(error.message)
      }

      if (participant.device_id !== getDeviceId()) {
        throw new Error('You can only edit your own vote')
      }
      await supabase.from('votes').delete().eq('participant_id', participant.id)

      // Insert new votes
      const voteRows = Object.entries(myVotes).map(([optionId, value]) => ({
        option_id: optionId,
        participant_id: participant.id,
        value,
      }))

      if (voteRows.length) {
        const { error } = await supabase.from('votes').insert(voteRows)
        if (error) throw new Error(error.message)
      }

      track('vote', state.plan.id)
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } })
      toast.success(`You are #${participants.length + (hasVoted ? 0 : 1)} to vote!`)
      setEditingVote(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }

  async function generateAIPlan() {
    if (!isHost(state.plan)) {
      toast.error('Only the host can generate the plan')
      return
    }
    setGenerating(true)
    try {
      const dateOptions = optionsOfKind(state.options, 'date')
      const placeOptions = optionsOfKind(state.options, 'place')
      const winningDate = bestDate(dateOptions, votes)
      const winningPlace = bestPlace(placeOptions, votes)
      const winningBudget = bestBudget(participants.map((p) => p.budget_vote)) || 3000

      const payload = {
        place: winningPlace?.label || state.plan.from_city || 'destination',
        date: winningDate?.value || new Date().toISOString().slice(0, 10),
        days: state.plan.days || 1,
        budget_per_person_inr: winningBudget,
        people: Math.max(1, participants.length),
        type: state.plan.type,
        comments: participants.map((p) => p.comment).filter(Boolean),
      }

      let plan
      try {
        plan = await callAIPlan(payload, { timeoutMs: 10000 })
      } catch {
        plan = generateFallbackPlan(payload)
      }

      try {
        await callFunction('host', {
          action: 'generate',
          plan_id: state.plan.id,
          device_id: getDeviceId(),
          ai_plan: plan,
          final_date_option: winningDate?.id || null,
          final_place_option: winningPlace?.id || null,
          final_budget: winningBudget,
        })
      } catch {
        await supabase
          .from('plans')
          .update({
            status: state.plan.status === 'voting' ? 'decided' : state.plan.status,
            ai_plan: plan,
            final_date_option: winningDate?.id || null,
            final_place_option: winningPlace?.id || null,
            final_budget: winningBudget,
          })
          .eq('id', state.plan.id)
      }

      toast.success(plan.approx ? 'Template itinerary ready (approx)' : 'AI has generated your itinerary!')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to generate AI plan')
    } finally {
      setGenerating(false)
    }
  }

  async function lockPlan() {
    if (!isHost(state.plan)) {
      toast.error('Only the host can lock the plan')
      return
    }
    setLocking(true)
    try {
      try {
        await callFunction('host', {
          action: 'lock',
          plan_id: state.plan.id,
          device_id: getDeviceId(),
        })
      } catch (hostErr) {
        console.warn('Host function fallback to direct DB update:', hostErr)
        await supabase
          .from('plans')
          .update({ status: 'locked', locked_at: new Date().toISOString() })
          .eq('id', state.plan.id)
      }

      // Generate tasks
      const tasksResult = await callAITasks({
        plan: state.plan,
        people: participants.map((p) => p.name),
      })

      const taskRows = tasksResult.tasks.map((t) => {
        const assignee = participants.find((p) => p.name === t.assignee)
        return {
          plan_id: state.plan.id,
          title: t.title,
          assignee_id: assignee?.id || null,
        }
      })

      await supabase.from('tasks').insert(taskRows)

      track('locked', state.plan.id)
      confetti({ particleCount: 100, spread: 70 })
      toast.success('Plan locked! You can now add it to your calendar.')
    } catch (err) {
      toast.error(err.message || 'Failed to lock plan')
    } finally {
      setLocking(false)
    }
  }

  function downloadCalendar() {
    if (!state.plan.ai_plan) return
    const winningDateOption = state.options.find((o) => o.id === state.plan.final_date_option)
    const winningPlaceOption = state.options.find((o) => o.id === state.plan.final_place_option)

    const ics = makeIcs({
      title: state.plan.title,
      emoji: state.plan.emoji,
      startDate: winningDateOption?.value || new Date().toISOString(),
      days: state.plan.days || 1,
      place: winningPlaceOption?.label || '',
      code: state.plan.code,
    })

    downloadIcs(ics, `${state.plan.title}.ics`)
    toast.success('Added to calendar!')
  }

  const { loading, plan, options, error } = state

  if (loading) {
    return (
      <PageTransition className="px-4 pt-6">
        <TicketSkeleton lines={4} />
      </PageTransition>
    )
  }

  if (error || !plan) {
    return (
      <PageTransition className="px-4 pb-16 pt-6">
        <Logo size="sm" />
        <div className="mt-8 rounded-card border-2 border-ink bg-paper p-5 text-center shadow-riso">
          <p className="font-hand text-h2 text-rani">404</p>
          <h1 className="mt-1 text-h2 font-black">{error || 'Plan not found'}</h1>
          <p className="mt-2 text-small text-ink/70">
            Invalid link or the plan has been removed.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button as={Link} to="/new" tone="saffron" block>
              Create New Plan
            </Button>
          </div>
        </div>
      </PageTransition>
    )
  }

  const dateOptions = optionsOfKind(options, 'date')
  const placeOptions = optionsOfKind(options, 'place')
  const movieOptions = optionsOfKind(options, 'movie')
  const host = isHost(plan)
  const stats = votingStats(participants, votes, options)

  const canGenerate =
    host && (plan.status === 'voting' || plan.status === 'decided') && participants.length >= 0
  const isLocked = plan.status === 'locked' || plan.status === 'live' || plan.status === 'done'

  return (
    <PageTransition className="pb-10">
      <header className="flex items-center justify-between px-4 pt-5">
        <Logo size="sm" />
        <Link
          to={`/p/${clean}/share`}
          className="inline-flex items-center gap-1 rounded-[10px] border-2 border-ink bg-paper-dark px-2.5 py-1 text-micro font-bold uppercase"
        >
          <Share2 size={14} strokeWidth={2.5} /> Share
        </Link>
      </header>

      <div className="px-4 pt-4">
        <BoardingPass plan={plan} dateOptions={dateOptions} placeOptions={placeOptions} showQr={false} />
      </div>

      <div className="mt-4 px-4">
        <div className="rounded-card border-2 border-ink bg-paper-dark p-3">
          <JourneyRail stages={JOURNEY_STAGES} current={STAGE_FOR_STATUS[plan.status] ?? 2} compact />
        </div>
      </div>

      {(plan.status === 'deciding' || autoDeciding) && (
        <section className="mt-6 px-4">
          <TicketSkeleton lines={3} />
          <p className="mt-2 text-center text-small text-ink/70">Locking in votes and writing the itinerary…</p>
        </section>
      )}

      {plan.status === 'voting' && hasVoted && ownsVote && !editingVote && (
        <section className="mt-6 px-4">
          <div className="rounded-card border-2 border-ink bg-paper p-4">
            <p className="text-small font-bold">Your vote is in.</p>
            <p className="mt-1 text-micro text-ink/60">Only you can change or remove it from this device.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" tone="paper" size="sm" onClick={() => setEditingVote(true)}>
                Edit my vote
              </Button>
              <Button
                type="button"
                tone="chili"
                size="sm"
                onClick={async () => {
                  if (!ownsVote || !myParticipant) return
                  await supabase.from('votes').delete().eq('participant_id', myParticipant.id)
                  await supabase
                    .from('participants')
                    .update({ has_voted: false })
                    .eq('id', myParticipant.id)
                    .eq('device_id', getDeviceId())
                  toast.success('Vote removed')
                  load()
                }}
              >
                <Trash2 size={16} strokeWidth={2.5} /> Delete my vote
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* VOTING PHASE */}
      {plan.status === 'voting' && (!hasVoted || (ownsVote && editingVote)) && (
        <section className="mt-6 space-y-4 px-4">
          <TicketCard tone="peacock" tilt={false}>
            <div className="space-y-4 p-4">
              <div>
                <p className="font-mono text-micro uppercase tracking-widest text-ink/50">
                  voting · {deadlineLabel(plan.deadline)}
                </p>
                <h2 className="mt-1 text-h2 font-black">Cast Your Vote</h2>
              </div>

              <Field
                label="Your Name"
                placeholder="e.g. Alex"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                maxLength={30}
              />

              {plan.mode === 'short' && (
                <Field
                  label="Your Area / Neighborhood"
                  placeholder="e.g. Downtown"
                  value={myArea}
                  onChange={(e) => setMyArea(e.target.value)}
                  maxLength={60}
                  hint="Used to find the optimal central meeting point"
                />
              )}

              <div>
                <span className="label-ink">Date options</span>
                {dateOptions.map((opt) => (
                  <div key={opt.id} className="mt-2 flex items-center gap-2">
                    <div className="grid h-12 w-16 shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-paper text-center font-mono text-micro font-bold">
                      {prettyDate(opt.value)}
                    </div>
                    <div className="flex flex-1 gap-2">
                      {['yes', 'maybe', 'no'].map((val) => {
                        const active = myVotes[opt.id] === val
                        const colorClass = val === 'yes' ? 'bg-peacock text-paper' : val === 'maybe' ? 'bg-haldi text-ink' : 'bg-chili text-paper'
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMyVotes((v) => ({ ...v, [opt.id]: val }))}
                            className={`flex-1 rounded-[10px] border-2 border-ink py-2 text-small font-bold uppercase ${active ? colorClass : 'bg-paper-dark text-ink/60'}`}
                          >
                            {val === 'yes' ? 'Yes' : val === 'maybe' ? 'Maybe' : 'No'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {placeOptions.length > 0 && (
                <div>
                  <span className="label-ink">Destinations</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {placeOptions.map((opt) => {
                      const active = myVotes[opt.id] === 'yes'
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMyVotes((v) => ({ ...v, [opt.id]: 'yes' }))}
                          className={`rounded-[12px] border-2 border-ink px-3 py-2 text-small font-bold ${active ? 'bg-rani text-paper' : 'bg-paper-dark text-ink/70'}`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <DualRange
                label="Your budget per person"
                min={plan.budget_min || 0}
                max={plan.budget_max || 10000}
                step={plan.mode === 'trip' ? 250 : 50}
                value={[myBudget, myBudget]}
                onChange={([val]) => setMyBudget(val)}
                singleThumb
              />

              <Field
                label="Notes or comments (optional)"
                placeholder="e.g. Free after 10 AM, prefer morning drive"
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                maxLength={120}
                as="textarea"
                rows={2}
              />

              <Button type="button" tone="saffron" size="lg" block loading={submitting} onClick={submitVote}>
                {submitting ? 'Saving your vote...' : editingVote ? 'Update Vote' : 'Submit Vote'}
              </Button>
              {editingVote && (
                <Button type="button" tone="paper" block onClick={() => setEditingVote(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </TicketCard>
        </section>
      )}

      {/* LIVE RESULTS */}
      {(plan.status === 'voting' || plan.status === 'deciding') && (
        <section className="mt-6 space-y-4 px-4">
          <StatusCard
            title="Live Results"
            subtitle={`${stats.voted}/${stats.total} participants have voted`}
            tone="haldi"
          >
            {dateOptions.map((opt) => {
              const counts = stats.optionCounts[opt.id] || { yes: 0, maybe: 0, no: 0 }
              const total = counts.yes + counts.maybe + counts.no
              return (
                <div key={opt.id} className="mt-3">
                  <p className="text-small font-bold">{prettyDate(opt.value)}</p>
                  <div className="mt-1 flex h-8 overflow-hidden rounded-[8px] border-2 border-ink">
                    {total > 0 ? (
                      <>
                        <div className="bg-peacock" style={{ width: `${(counts.yes / total) * 100}%` }} />
                        <div className="bg-haldi" style={{ width: `${(counts.maybe / total) * 100}%` }} />
                        <div className="bg-chili" style={{ width: `${(counts.no / total) * 100}%` }} />
                      </>
                    ) : (
                      <div className="w-full bg-paper-dark" />
                    )}
                  </div>
                  <p className="mt-1 text-micro text-ink/60">
                    {counts.yes} Yes · {counts.maybe} Maybe · {counts.no} No
                  </p>
                </div>
              )
            })}

            {stats.didntVote.length > 0 && (
              <div className="mt-4">
                <p className="text-micro font-bold text-ink/60">Pending votes:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {stats.didntVote.map((p) => (
                    <Avatar key={p.id} name={p.name} size="sm" />
                  ))}
                </div>
              </div>
            )}

            {host && stats.didntVote.length > 0 && (
              <div className="mt-4">
                <Button
                  as="a"
                  href={whatsappLink(
                    nudgeText({
                      remaining: stats.didntVote.length,
                      timeLeft: deadlineLabel(plan.deadline).replace(' left', ''),
                      code: plan.code,
                    })
                  )}
                  target="_blank"
                  rel="noreferrer"
                  tone="haldi"
                  block
                >
                  Nudge ({stats.didntVote.length} pending)
                </Button>
              </div>
            )}
            {canGenerate && (
              <div className="mt-4">
                <Button type="button" tone="rani" block loading={generating} onClick={generateAIPlan}>
                  <Sparkles size={16} strokeWidth={2.5} />
                  {generating ? 'Generating AI itinerary...' : 'Generate AI Plan'}
                </Button>
              </div>
            )}
            {!host && (
              <p className="mt-3 text-micro text-ink/60">
                Read-only for guests — only the host can generate and lock this plan.
              </p>
            )}
          </StatusCard>
        </section>
      )}

      {/* AI PLAN REVEAL */}
      {plan.ai_plan && (
        <section className="mt-6 space-y-4 px-4">
          <StatusCard
            title={plan.ai_plan.approx ? 'Final Plan (approx)' : 'Final Plan'}
            subtitle={plan.ai_plan.reason}
            tone="rani"
          >
            <div className="mt-3 space-y-3">
              {plan.ai_plan.itinerary?.map((day, i) => (
                <div key={i}>
                  <p className="font-bold text-small">Day {day.day}</p>
                  <ul className="mt-1 space-y-1">
                    {day.items.map((item, j) => (
                      <li key={j} className="text-small text-ink/80">
                        <span className="font-mono text-micro">{item.time}</span> {item.activity}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {plan.ai_plan.cost_breakdown && (
              <div className="mt-4">
                <p className="text-micro font-bold uppercase text-ink/50">Cost per person</p>
                <ul className="mt-1 space-y-1">
                  {plan.ai_plan.cost_breakdown.map((item, i) => (
                    <li key={i} className="flex justify-between text-small">
                      <span>{item.item}</span>
                      <span className="font-mono">{approx(item.inr_per_person)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.ai_plan.packing_list && (
              <div className="mt-4">
                <p className="text-micro font-bold uppercase text-ink/50">Packing list</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {plan.ai_plan.packing_list.map((item, i) => (
                    <li key={i} className="rounded-[8px] border-2 border-ink bg-paper-dark px-2 py-1 text-micro">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {host && !isLocked && (
              <div className="mt-4">
                <Button type="button" tone="saffron" block loading={locking} onClick={lockPlan}>
                  <Lock size={16} strokeWidth={2.5} />
                  {locking ? 'Locking...' : 'Lock Plan'}
                </Button>
              </div>
            )}
          </StatusCard>
        </section>
      )}

      {/* LOCKED PHASE */}
      {isLocked && (
        <section className="mt-6 space-y-4 px-4">
          <StatusCard title="Plan Locked!" subtitle="Download your calendar invite" tone="peacock">
            <Button type="button" tone="haldi" block onClick={downloadCalendar}>
              <Calendar size={16} strokeWidth={2.5} />
              Add to Calendar (.ics)
            </Button>
          </StatusCard>

          {tasks.length > 0 && (
            <StatusCard title="Tasks" subtitle={`${tasks.filter((t) => t.done).length}/${tasks.length} done`}>
              <ul className="mt-3 space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 text-small">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={async () => {
                        await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
                      }}
                      className="h-5 w-5"
                    />
                    <span className={task.done ? 'line-through text-ink/50' : ''}>{task.title}</span>
                    {task.assignee && (
                      <Avatar name={task.assignee.name} size="xs" className="ml-auto" />
                    )}
                  </li>
                ))}
              </ul>
            </StatusCard>
          )}
        </section>
      )}

      {host && <HandNote dir="down">You are the host — control settings and finalization</HandNote>}

      <ViralFooter refCode={plan.code} planId={plan.id} />
    </PageTransition>
  )
}
