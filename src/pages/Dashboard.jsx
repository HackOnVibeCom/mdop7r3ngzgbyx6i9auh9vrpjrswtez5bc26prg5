import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Vote, Sparkles, Plus } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Logo from '../components/Logo'
import Button from '../components/Button'
import { TicketSkeleton } from '../components/Skeleton'
import useLowPower from '../hooks/useLowPower'
import { getMyPlanCodes } from '../lib/device'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Three.js only ever loads on this route (and never on the vote page).
const Globe3D = lazy(() => import('../components/Globe3D'))

const STATUS_META = {
  voting: { label: 'Voting', dot: 'bg-haldi', Icon: Vote },
  deciding: { label: 'Deciding', dot: 'bg-haldi', Icon: Sparkles },
  decided: { label: 'Decided', dot: 'bg-peacock', Icon: Sparkles },
  locked: { label: 'Locked', dot: 'bg-rani', Icon: Lock },
  live: { label: 'Live', dot: 'bg-rani', Icon: Lock },
  done: { label: 'Done', dot: 'bg-rani', Icon: Lock },
}

// Deterministic lat/lon for plans with no saved coordinates, so pins spread out.
function fallbackCoords(code) {
  let h = 0
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) >>> 0
  const lat = ((h % 120) - 60) * 0.9 // -54..54
  const lon = (((h >>> 7) % 360) - 180) * 0.95
  return { lat, lon }
}

function markerFor(plan) {
  const hasGeo = Number.isFinite(plan.from_lat) && Number.isFinite(plan.from_lon)
  const { lat, lon } = hasGeo ? { lat: plan.from_lat, lon: plan.from_lon } : fallbackCoords(plan.code)
  return { code: plan.code, status: plan.status, title: plan.title, emoji: plan.emoji, lat, lon }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const lowPower = useLowPower()
  const [state, setState] = useState({ loading: true, error: '', plans: [], voters: 0 })

  const load = useCallback(async () => {
    const codes = getMyPlanCodes()
    if (!isSupabaseConfigured) {
      setState({ loading: false, error: 'Supabase keys not configured', plans: [], voters: 0 })
      return
    }
    if (codes.length === 0) {
      setState({ loading: false, error: '', plans: [], voters: 0 })
      return
    }
    try {
      const { data: plans, error } = await supabase
        .from('plans')
        .select('id, code, title, emoji, status, from_lat, from_lon, created_at')
        .in('code', codes)
        .order('created_at', { ascending: false })
      if (error) throw error

      let voters = 0
      if (plans?.length) {
        const { data: parts } = await supabase
          .from('participants')
          .select('device_id, plan_id')
          .in('plan_id', plans.map((p) => p.id))
        voters = new Set((parts || []).map((p) => p.device_id)).size
      }
      setState({ loading: false, error: '', plans: plans || [], voters })
    } catch (err) {
      setState({ loading: false, error: err.message || 'Failed to load your plans', plans: [], voters: 0 })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const { loading, error, plans, voters } = state
  const markers = useMemo(() => plans.map(markerFor), [plans])
  const lockedCount = plans.filter((p) => ['locked', 'live', 'done'].includes(p.status)).length

  const openPlan = (code) => navigate(`/p/${code}`)

  const header = (
    <header className="flex items-center justify-between px-4 pt-5">
      <Link to="/" className="inline-flex items-center gap-1 text-small font-bold text-paper">
        <ArrowLeft size={18} strokeWidth={2.5} /> Home
      </Link>
      <Logo size="sm" className="text-paper" />
    </header>
  )

  if (loading) {
    return (
      <PageTransition className="min-h-[100dvh] bg-night px-4 pb-16 pt-5 text-paper">
        {header}
        <div className="mt-6">
          <TicketSkeleton lines={6} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="min-h-[100dvh] bg-night pb-16 text-paper">
      {header}

      <div className="mt-5 px-4">
        <h1 className="text-h1 font-black text-haldi">My Plans 🌍</h1>
        <p className="mt-1 text-small text-paper/70">
          Every plan you’ve created or voted on, from this device. No login needed.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-6 rounded-card border-2 border-chili bg-night p-5 text-center">
          <p className="text-small text-paper/80">{error}</p>
          <Button type="button" tone="haldi" className="mt-3" onClick={() => { setState((s) => ({ ...s, loading: true })); load() }}>
            Try again
          </Button>
        </div>
      )}

      {!error && plans.length === 0 && (
        <div className="mx-4 mt-6 rounded-card border-2 border-paper/40 bg-night p-6 text-center">
          <p className="font-hand text-h2 text-haldi">Nothing here yet</p>
          <p className="mt-2 text-small text-paper/70">
            Plans you create or open will show up on this globe.
          </p>
          <Button as={Link} to="/new" tone="saffron" className="mt-4" block>
            <Plus size={16} strokeWidth={2.5} /> Create your first plan
          </Button>
        </div>
      )}

      {!error && plans.length > 0 && (
        <>
          {/* Side panel: real counts */}
          <div className="mt-6 grid grid-cols-3 gap-3 px-4">
            <div className="rounded-card border-2 border-paper/70 bg-night p-3 text-center">
              <p className="font-mono text-h2 font-bold text-haldi">{plans.length}</p>
              <p className="text-micro text-paper/60">plans</p>
            </div>
            <div className="rounded-card border-2 border-paper/70 bg-night p-3 text-center">
              <p className="font-mono text-h2 font-bold text-peacock">{voters}</p>
              <p className="text-micro text-paper/60">voters</p>
            </div>
            <div className="rounded-card border-2 border-paper/70 bg-night p-3 text-center">
              <p className="font-mono text-h2 font-bold text-rani">{lockedCount}</p>
              <p className="text-micro text-paper/60">locked</p>
            </div>
          </div>

          {/* Globe (lazy) or 2D fallback on low-end / reduced-motion / no-WebGL devices */}
          <div className="mt-6 px-4">
            {lowPower ? (
              <div className="rounded-card border-2 border-paper/40 bg-night p-4 text-center text-micro text-paper/60">
                Showing a lightweight list — 3D globe is off on this device.
              </div>
            ) : (
              <div className="h-[320px] w-full overflow-hidden rounded-card border-2 border-paper/40 bg-night">
                <Suspense
                  fallback={
                    <div className="grid h-full place-items-center">
                      <div className="h-40 w-40 animate-pulse rounded-full border-2 border-dashed border-paper/40" />
                    </div>
                  }
                >
                  <Globe3D markers={markers} onSelect={openPlan} />
                </Suspense>
              </div>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-micro text-paper/70">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-haldi" /> Voting</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-peacock" /> Decided</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rani" /> Locked</span>
            </div>
          </div>

          {/* Card grid — clickable just like the pins */}
          <div className="mt-6 grid grid-cols-1 gap-3 px-4 sm:grid-cols-2">
            {plans.map((plan) => {
              const meta = STATUS_META[plan.status] || STATUS_META.voting
              const Icon = meta.Icon
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => openPlan(plan.code)}
                  className="flex min-h-[44px] items-center gap-3 rounded-card border-2 border-paper/70 bg-night p-3 text-left transition hover:border-haldi"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border-2 border-paper/50 bg-night text-h3">
                    {plan.emoji || '🎒'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-bold text-paper">{plan.title}</span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-micro text-paper/60">
                      <i className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      {meta.label} · /{plan.code}
                    </span>
                  </span>
                  <Icon size={16} strokeWidth={2.5} className="shrink-0 text-paper/50" />
                </button>
              )
            })}
          </div>
        </>
      )}
    </PageTransition>
  )
}
