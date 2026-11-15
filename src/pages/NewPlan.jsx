import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Backpack,
  Cake,
  Clapperboard,
  PartyPopper,
  Plus,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Wand2,
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import TicketCard from '../components/TicketCard'
import JourneyRail from '../components/JourneyRail'
import Button from '../components/Button'
import Field from '../components/Field'
import DualRange from '../components/DualRange'
import Sheet from '../components/Sheet'
import HandNote from '../components/HandNote'
import Logo from '../components/Logo'
import BottomBar from '../components/BottomBar'
import { useToast } from '../components/Toast'
import { createPlan, modeForType } from '../lib/plans'
import { getName, setName } from '../lib/device'
import { track } from '../lib/events'
import { isSupabaseConfigured } from '../lib/supabase'
import { TIME_SLOTS, addDays, todayInput, hoursFromNow, weekdayShort, shortDate } from '../lib/dates'

const WIZARD_STAGES = [
  { key: 'kya', label: 'Kya' },
  { key: 'kab', label: 'Kab' },
  { key: 'kitna', label: 'Kitna' },
]

const PLAN_TYPES = [
  { value: 'trip', label: 'Trip', tone: 'peacock', rotate: -4, Icon: Backpack, emoji: '🎒' },
  { value: 'movie', label: 'Movie', tone: 'rani', rotate: 3, Icon: Clapperboard, emoji: '🍿' },
  { value: 'birthday', label: 'Birthday', tone: 'haldi', rotate: -2, Icon: Cake, emoji: '🎂' },
  { value: 'party', label: 'Party', tone: 'saffron', rotate: 4, Icon: PartyPopper, emoji: '🎉' },
  { value: 'dinner', label: 'Dinner', tone: 'night', rotate: -3, Icon: UtensilsCrossed, emoji: '🍽️' },
  { value: 'other', label: 'Kuch aur', tone: 'paper', rotate: 2, Icon: Sparkles, emoji: '✨' },
]

const EMOJIS = ['🎒', '🍿', '🎂', '🎉', '🍽️', '🏔️', '🏖️', '🚂', '🛺', '☕', '🎸', '✨']

const DEADLINES = [
  { value: 12, label: '12 ghante' },
  { value: 24, label: '24 ghante (default)' },
  { value: 48, label: '2 din' },
  { value: 72, label: '3 din' },
]

const DRAFT_KEY = 'chaloplan.draft'

function emptyDate(offset) {
  return { value: addDays(todayInput(), offset), slot: '' }
}

function initialDraft() {
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
    } catch {
      return null
    }
  })()
  if (saved && saved.dates) return saved
  return {
    type: 'trip',
    title: '',
    emoji: '🎒',
    hostName: getName(),
    fromCity: '',
    days: 2,
    dates: [emptyDate(5), emptyDate(6)],
    places: ['', ''],
    movies: ['', ''],
    budgetMin: 1500,
    budgetMax: 5000,
    deadlineHours: 24,
    hostUpi: '',
  }
}

/** Budget slider bounds depend on the kind of plan. */
function budgetBounds(mode) {
  return mode === 'trip' ? { min: 0, max: 25000, step: 250 } : { min: 0, max: 4000, step: 50 }
}

export default function NewPlan() {
  const navigate = useNavigate()
  const toast = useToast()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(initialDraft)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const mode = modeForType(draft.type)
  const isMovie = draft.type === 'movie'
  const bounds = budgetBounds(mode)

  // Keep the draft across an accidental reload — losing 30 seconds of typing stings.
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* storage blocked: the wizard still works in memory */
    }
  }, [draft])

  // Switching plan type swaps the default emoji and keeps the budget band sane.
  function pickType(value) {
    const preset = PLAN_TYPES.find((t) => t.value === value)
    const nextMode = modeForType(value)
    const nextBounds = budgetBounds(nextMode)
    setDraft((d) => ({
      ...d,
      type: value,
      emoji: preset ? preset.emoji : d.emoji,
      budgetMin: Math.min(d.budgetMin, nextBounds.max - nextBounds.step),
      budgetMax: Math.min(d.budgetMax, nextBounds.max),
      dates:
        nextMode === 'short'
          ? d.dates.map((date) => ({ ...date, slot: date.slot || 'evening' }))
          : d.dates,
    }))
  }

  function patch(partial) {
    setDraft((d) => ({ ...d, ...partial }))
  }

  function patchList(key, index, value) {
    setDraft((d) => {
      const next = [...d[key]]
      next[index] = value
      return { ...d, [key]: next }
    })
  }

  function addToList(key, value) {
    setDraft((d) => (d[key].length >= 4 ? d : { ...d, [key]: [...d[key], value] }))
  }

  function removeFromList(key, index) {
    setDraft((d) => (d[key].length <= 2 ? d : { ...d, [key]: d[key].filter((_, i) => i !== index) }))
  }

  const errors = useMemo(() => {
    const e = {}
    if (step === 0) {
      if (!draft.title.trim()) e.title = 'Plan ka naam likho (chhota chalega)'
      if (!draft.hostName.trim()) e.hostName = 'Tumhara naam? Dost dekhenge'
      if (mode === 'trip' && !draft.fromCity.trim()) e.fromCity = 'Kahan se chal rahe ho?'
      if (mode === 'short' && !draft.fromCity.trim()) e.fromCity = 'Tumhara area likho'
      if (mode === 'trip' && (draft.days < 1 || draft.days > 7)) e.days = '1 se 7 din tak'
    }
    if (step === 1) {
      const dates = draft.dates.filter((d) => d.value)
      if (dates.length < 2) e.dates = 'Kam se kam 2 date options do'
      const uniqueDates = new Set(dates.map((d) => `${d.value}-${d.slot}`))
      if (uniqueDates.size !== dates.length) e.dates = 'Do options same hain'
      const places = draft.places.filter((p) => p.trim())
      if (mode === 'trip' && places.length < 2) e.places = '2 jagah ke options do (ya AI se suggest karwao)'
      if (isMovie) {
        const movies = draft.movies.filter((m) => m.trim())
        if (movies.length < 2) e.movies = '2 movie options do'
      }
    }
    if (step === 2) {
      if (draft.budgetMax <= draft.budgetMin) e.budget = 'Max budget min se zyada hona chahiye'
    }
    return e
  }, [step, draft, mode, isMovie])

  const stepValid = Object.keys(errors).length === 0

  function goNext() {
    setTouched(true)
    if (!stepValid) return
    setTouched(false)
    setStep((s) => Math.min(2, s + 1))
  }

  function goBack() {
    if (step === 0) {
      navigate('/')
      return
    }
    setTouched(false)
    setStep((s) => Math.max(0, s - 1))
  }

  async function submit() {
    setTouched(true)
    if (!stepValid) return
    if (!isSupabaseConfigured) {
      toast.error('Supabase keys set nahi hain — .env.local bhar do')
      return
    }
    setSaving(true)
    try {
      setName(draft.hostName)
      const plan = await createPlan({
        ...draft,
        deadline: hoursFromNow(Number(draft.deadlineHours) || 24),
        places: mode === 'trip' || draft.places.some((p) => p.trim()) ? draft.places : [],
        movies: isMovie ? draft.movies : [],
      })
      track('plan_created', plan.id)
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      navigate(`/p/${plan.code}/share`, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Network ne dhoka diya, phir try karo', {
        action: { label: 'Retry', onClick: submit },
      })
    } finally {
      setSaving(false)
    }
  }

  const show = (key) => (touched ? errors[key] : undefined)

  return (
    <PageTransition className="px-4 pb-10 pt-5">
      <header className="flex items-center justify-between">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-small font-bold">
          <ArrowLeft size={18} strokeWidth={2.5} /> {step === 0 ? 'Wapas' : 'Peeche'}
        </button>
        <Logo size="sm" />
      </header>

      <div className="mt-4 rounded-card border-2 border-ink bg-paper-dark p-3">
        <JourneyRail stages={WIZARD_STAGES} current={step} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mt-5"
        >
          {/* ---------------- Step 1: kya ---------------- */}
          {step === 0 && (
            <TicketCard tone="rani" tilt={false}>
              <div className="space-y-5 p-4">
                <div>
                  <p className="font-mono text-micro uppercase tracking-widest text-ink/50">step 1 / 3</p>
                  <h1 className="mt-1 text-h1 font-black">Kya plan hai?</h1>
                </div>

                <div>
                  <span className="label-ink">Plan type</span>
                  <div className="flex flex-wrap gap-2.5">
                    {PLAN_TYPES.map(({ value, label, tone, rotate, Icon }) => {
                      const active = draft.type === value
                      const toneClass = {
                        peacock: 'bg-peacock text-paper',
                        rani: 'bg-rani text-paper',
                        haldi: 'bg-haldi text-ink',
                        saffron: 'bg-saffron text-ink',
                        night: 'bg-night text-paper',
                        paper: 'bg-paper-dark text-ink',
                      }[tone]
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => pickType(value)}
                          aria-pressed={active}
                          style={{ transform: `rotate(${active ? 0 : rotate}deg)` }}
                          className={`relative inline-flex min-h-[48px] items-center gap-1.5 rounded-[14px] border-2 border-ink px-3 py-2 text-small font-bold uppercase tracking-wide transition-transform ${toneClass} ${
                            active ? 'shadow-riso-ink' : 'opacity-80'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.5} />
                          {label}
                          {active && (
                            <motion.span
                              initial={reduce ? false : { scale: 2.2, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                              className="stamp-rough absolute -right-2 -top-2 rounded-full border-2 border-chili bg-paper px-1 text-[9px] font-black uppercase text-chili"
                            >
                              ✓
                            </motion.span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Field
                  label="Plan ka naam"
                  placeholder={mode === 'trip' ? 'Rishikesh wala plan' : 'Friday night movie'}
                  value={draft.title}
                  maxLength={60}
                  onChange={(e) => patch({ title: e.target.value })}
                  error={show('title')}
                  hint="Jo WhatsApp mein dikhega"
                />

                <div>
                  <span className="label-ink">Emoji</span>
                  <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => patch({ emoji })}
                        aria-pressed={draft.emoji === emoji}
                        aria-label={`Emoji ${emoji}`}
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border-2 border-ink text-h3 ${
                          draft.emoji === emoji ? 'bg-haldi shadow-riso-ink' : 'bg-paper-dark'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <Field
                  label="Tumhara naam (host)"
                  placeholder="Mansi"
                  value={draft.hostName}
                  maxLength={30}
                  onChange={(e) => patch({ hostName: e.target.value })}
                  error={show('hostName')}
                />

                <Field
                  label={mode === 'trip' ? 'Kahan se chalenge?' : 'Tumhara area'}
                  placeholder={mode === 'trip' ? 'Ghaziabad' : 'Indirapuram'}
                  value={draft.fromCity}
                  maxLength={60}
                  onChange={(e) => patch({ fromCity: e.target.value })}
                  error={show('fromCity')}
                  hint={mode === 'trip' ? 'Distance aur fare isi se nikalega' : 'Meeting point isi se banega'}
                />

                {mode === 'trip' && (
                  <Field
                    label="Kitne din?"
                    as="select"
                    value={draft.days}
                    onChange={(e) => patch({ days: Number(e.target.value) })}
                    error={show('days')}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} din
                      </option>
                    ))}
                  </Field>
                )}
              </div>
            </TicketCard>
          )}

          {/* ---------------- Step 2: kab / kahan ---------------- */}
          {step === 1 && (
            <TicketCard tone="peacock" tilt={false}>
              <div className="space-y-6 p-4">
                <div>
                  <p className="font-mono text-micro uppercase tracking-widest text-ink/50">step 2 / 3</p>
                  <h1 className="mt-1 text-h1 font-black">Kab aur kahan?</h1>
                  <p className="mt-1 text-small text-ink/70">2 se 4 options do. Dost vote kar lenge.</p>
                </div>

                {/* date options */}
                <div>
                  <span className="label-ink">Date options</span>
                  <div className="space-y-2">
                    {draft.dates.map((date, i) => (
                      <div
                        key={i}
                        className="flex items-end gap-2 rounded-input border-2 border-ink bg-paper-dark p-2"
                      >
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-paper font-mono text-micro font-bold leading-tight">
                          <span>{weekdayShort(date.value) || '—'}</span>
                          <span>{shortDate(date.value) || ''}</span>
                        </div>
                        <Field
                          label={`Date ${i + 1}`}
                          type="date"
                          min={todayInput()}
                          value={date.value}
                          onChange={(e) => patchList('dates', i, { ...date, value: e.target.value })}
                          className="min-w-0 flex-1"
                        />
                        <Field
                          label="Time"
                          as="select"
                          value={date.slot}
                          onChange={(e) => patchList('dates', i, { ...date, slot: e.target.value })}
                          className="w-28 shrink-0"
                        >
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))}
                        </Field>
                        {draft.dates.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeFromList('dates', i)}
                            aria-label={`Date ${i + 1} hatao`}
                            className="grid h-12 w-10 shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-paper text-chili"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {show('dates') && <p className="mt-1 text-micro font-semibold text-chili">{errors.dates}</p>}
                  {draft.dates.length < 4 && (
                    <Button
                      type="button"
                      tone="paper"
                      size="sm"
                      className="mt-2"
                      onClick={() => addToList('dates', emptyDate(7 + draft.dates.length))}
                    >
                      <Plus size={16} strokeWidth={2.5} /> Date add karo
                    </Button>
                  )}
                </div>

                {/* movie options */}
                {isMovie && (
                  <div>
                    <span className="label-ink">Movie options</span>
                    <div className="space-y-2">
                      {draft.movies.map((movie, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Field
                            placeholder={i === 0 ? 'Movie ka naam' : 'Doosri movie'}
                            value={movie}
                            maxLength={60}
                            onChange={(e) => patchList('movies', i, e.target.value)}
                            className="min-w-0 flex-1"
                          />
                          {draft.movies.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeFromList('movies', i)}
                              aria-label={`Movie ${i + 1} hatao`}
                              className="grid h-12 w-10 shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-paper text-chili"
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {show('movies') && <p className="mt-1 text-micro font-semibold text-chili">{errors.movies}</p>}
                    {draft.movies.length < 4 && (
                      <Button
                        type="button"
                        tone="paper"
                        size="sm"
                        className="mt-2"
                        onClick={() => addToList('movies', '')}
                      >
                        <Plus size={16} strokeWidth={2.5} /> Movie add karo
                      </Button>
                    )}
                  </div>
                )}

                {/* place options */}
                <div>
                  <div className="flex items-end justify-between gap-2">
                    <span className="label-ink mb-0">
                      {mode === 'trip' ? 'Jagah options' : 'Jagah options (optional)'}
                    </span>
                    <Button type="button" tone="haldi" size="sm" onClick={() => setSuggestOpen(true)}>
                      <Wand2 size={15} strokeWidth={2.5} /> AI suggest karo
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {draft.places.map((place, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Field
                          placeholder={
                            mode === 'trip'
                              ? i === 0
                                ? 'Rishikesh'
                                : 'Nainital'
                              : i === 0
                                ? 'PVR Vegas'
                                : 'Cafe Delhi Heights'
                          }
                          value={place}
                          maxLength={60}
                          onChange={(e) => patchList('places', i, e.target.value)}
                          className="min-w-0 flex-1"
                        />
                        {draft.places.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeFromList('places', i)}
                            aria-label={`Jagah ${i + 1} hatao`}
                            className="grid h-12 w-10 shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-paper text-chili"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {show('places') && <p className="mt-1 text-micro font-semibold text-chili">{errors.places}</p>}
                  {draft.places.length < 4 && (
                    <Button
                      type="button"
                      tone="paper"
                      size="sm"
                      className="mt-2"
                      onClick={() => addToList('places', '')}
                    >
                      <Plus size={16} strokeWidth={2.5} /> Jagah add karo
                    </Button>
                  )}
                </div>
              </div>
            </TicketCard>
          )}

          {/* ---------------- Step 3: kitna ---------------- */}
          {step === 2 && (
            <TicketCard tone="haldi" tilt={false}>
              <div className="space-y-6 p-4">
                <div>
                  <p className="font-mono text-micro uppercase tracking-widest text-ink/50">step 3 / 3</p>
                  <h1 className="mt-1 text-h1 font-black">Kitne ka scene?</h1>
                  <p className="mt-1 text-small text-ink/70">Range do, dost isi ke andar vote karenge.</p>
                </div>

                <DualRange
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={[draft.budgetMin, draft.budgetMax]}
                  onChange={([low, high]) => patch({ budgetMin: low, budgetMax: high })}
                  label="Budget per banda"
                />
                {show('budget') && <p className="text-micro font-semibold text-chili">{errors.budget}</p>}

                <Field
                  label="Voting deadline"
                  as="select"
                  value={draft.deadlineHours}
                  onChange={(e) => patch({ deadlineHours: Number(e.target.value) })}
                  hint="Deadline ke baad plan khud generate kar sakte ho"
                >
                  {DEADLINES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Field>

                <Field
                  label="Tumhari UPI ID (optional)"
                  placeholder="mansi@upi"
                  value={draft.hostUpi}
                  maxLength={60}
                  inputMode="email"
                  autoCapitalize="none"
                  onChange={(e) => patch({ hostUpi: e.target.value })}
                  hint="Kharcha settle karne ke liye. App paisa nahi chhuta — sirf UPI link khulta hai."
                />

                <div className="rounded-input border-2 border-dashed border-ink/40 bg-paper-dark p-3">
                  <p className="font-mono text-micro uppercase tracking-widest text-ink/50">summary</p>
                  <p className="mt-1 text-small font-semibold">
                    {draft.emoji} {draft.title || 'Bina naam ka plan'} · {draft.dates.filter((d) => d.value).length}{' '}
                    date options · {draft.places.filter((p) => p.trim()).length} jagah
                    {mode === 'trip' ? ` · ${draft.days} din` : ''}
                  </p>
                </div>

                <HandNote dir="down">link ab ban jayega</HandNote>
              </div>
            </TicketCard>
          )}
        </motion.div>
      </AnimatePresence>

      <BottomBar>
        {step < 2 ? (
          <Button type="button" tone="saffron" size="lg" block onClick={goNext}>
            Aage chalo →
          </Button>
        ) : (
          <Button type="button" tone="saffron" size="lg" block loading={saving} onClick={submit}>
            {saving ? 'Link ban raha hai…' : 'Plan banao aur link lo'}
          </Button>
        )}
      </BottomBar>

      <Sheet open={suggestOpen} onClose={() => setSuggestOpen(false)} title="AI se jagah suggest karwao">
        <div className="space-y-3 pb-4">
          <p className="text-small text-ink/75">
            AI Suggest Phase 4 mein on hoga (Gemini edge function ke saath). Tab tak jagah khud likh do — AI
            baad mein poora plan likhega.
          </p>
          <Button type="button" tone="peacock" block onClick={() => setSuggestOpen(false)}>
            Theek hai, khud likhta hoon
          </Button>
        </div>
      </Sheet>

      <p className="mt-6 text-center text-micro text-ink/50">
        Bana ke mann badal gaya?{' '}
        <Link to="/" className="font-bold underline">
          Ghar wapas
        </Link>
      </p>
    </PageTransition>
  )
}
