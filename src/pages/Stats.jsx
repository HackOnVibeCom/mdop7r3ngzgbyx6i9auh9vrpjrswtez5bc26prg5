import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Logo from '../components/Logo'
import { TicketSkeleton } from '../components/Skeleton'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function Stats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase.rpc('get_stats')
      if (error) throw error
      setStats(data)
    } catch (err) {
      console.error('Stats load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <PageTransition className="min-h-[100dvh] bg-night px-4 pb-16 pt-5 text-paper">
        <TicketSkeleton lines={6} />
      </PageTransition>
    )
  }

  const kFactor = stats ? stats.k_factor : 0
  const ctaRate = stats ? stats.cta_click_rate : 0

  return (
    <PageTransition className="min-h-[100dvh] bg-night px-4 pb-16 pt-5 text-paper">
      <header className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-small font-bold text-paper">
          <ArrowLeft size={18} strokeWidth={2.5} /> Back
        </Link>
        <Logo size="sm" className="text-paper" />
      </header>

      <div className="mt-6">
        <h1 className="text-h1 font-black text-haldi">Growth Metrics 📊</h1>
        <p className="mt-1 text-small text-paper/70">
          ChaloPlan viral loop performance & real-time analytics.
        </p>
      </div>

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-card border-2 border-paper/70 bg-night p-4">
              <p className="font-mono text-h1 font-bold text-haldi">{stats.total_plans}</p>
              <p className="mt-1 text-small font-bold">Plans</p>
              <p className="text-micro text-paper/60">total created</p>
            </div>

            <div className="rounded-card border-2 border-paper/70 bg-night p-4">
              <p className="font-mono text-h1 font-bold text-peacock">{stats.unique_voters}</p>
              <p className="mt-1 text-small font-bold">Voters</p>
              <p className="text-micro text-paper/60">unique participants</p>
            </div>

            <div className="rounded-card border-2 border-paper/70 bg-night p-4">
              <p className="font-mono text-h1 font-bold text-rani">{stats.referred_plans}</p>
              <p className="mt-1 text-small font-bold">Referred Plans</p>
              <p className="text-micro text-paper/60">via referrals</p>
            </div>

            <div className="rounded-card border-2 border-paper/70 bg-night p-4">
              <p className="font-mono text-h1 font-bold text-saffron">
                {stats.avg_voters_per_plan.toFixed(1)}
              </p>
              <p className="mt-1 text-small font-bold">Avg Voters</p>
              <p className="text-micro text-paper/60">per plan</p>
            </div>
          </div>

          {/* K-factor highlight */}
          <div className="mt-4 rounded-card border-2 border-haldi bg-night p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small font-bold text-paper/70">K-Factor (Viral Coefficient)</p>
                <p className="mt-1 font-mono text-h1 font-black text-haldi">
                  {kFactor.toFixed(3)}
                </p>
              </div>
              <TrendingUp size={40} className="text-haldi/50" strokeWidth={2} />
            </div>
            <p className="mt-2 text-micro text-paper/60">
              {kFactor >= 0.15
                ? '🔥 Strong virality! Each plan brings new hosts'
                : kFactor >= 0.05
                  ? '📈 Growing steadily'
                  : '🌱 Early stage product growth'}
            </p>
          </div>

          {/* Additional metrics */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-input border-2 border-paper/40 bg-night px-3 py-2">
              <span className="text-small">Plan views</span>
              <span className="font-mono font-bold text-haldi">{stats.plan_views}</span>
            </div>

            <div className="flex items-center justify-between rounded-input border-2 border-paper/40 bg-night px-3 py-2">
              <span className="text-small">CTA clicks</span>
              <span className="font-mono font-bold text-peacock">{stats.cta_clicks}</span>
            </div>

            <div className="flex items-center justify-between rounded-input border-2 border-paper/40 bg-night px-3 py-2">
              <span className="text-small">CTA click rate</span>
              <span className="font-mono font-bold text-rani">{(ctaRate * 100).toFixed(1)}%</span>
            </div>

            <div className="flex items-center justify-between rounded-input border-2 border-paper/40 bg-night px-3 py-2">
              <span className="text-small">Avg time to lock</span>
              <span className="font-mono font-bold text-saffron">
                {stats.avg_minutes_to_lock.toFixed(0)} min
              </span>
            </div>
          </div>

          {/* Daily chart */}
          {stats.plans_per_day && stats.plans_per_day.length > 0 && (
            <div className="mt-6">
              <h3 className="text-h3 font-bold">Plans Per Day (Last 30 days)</h3>
              <div className="mt-3 flex h-32 items-end gap-1">
                {stats.plans_per_day.slice(-14).map((day, i) => {
                  const maxCount = Math.max(...stats.plans_per_day.map((d) => d.count))
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-sm bg-haldi"
                        style={{ height: `${height}%` }}
                        title={`${day.count} plans`}
                      />
                      <p className="text-[9px] text-paper/50">
                        {new Date(day.day).getDate()}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!stats && !loading && (
        <div className="mt-6 rounded-card border-2 border-paper/40 bg-night p-5 text-center">
          <p className="text-small text-paper/70">No data yet. Create your first plan!</p>
        </div>
      )}
    </PageTransition>
  )
}
