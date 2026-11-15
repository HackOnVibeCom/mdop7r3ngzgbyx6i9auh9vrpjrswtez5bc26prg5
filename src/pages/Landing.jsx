import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Clapperboard, Cake, PartyPopper, UtensilsCrossed, Backpack } from 'lucide-react'
import Button from '../components/Button'
import TicketCard from '../components/TicketCard'
import Sticker from '../components/Sticker'
import JourneyRail from '../components/JourneyRail'
import HandNote from '../components/HandNote'
import HeroPostcardStatic from '../components/HeroPostcardStatic'
import ViralFooter from '../components/ViralFooter'
import PageTransition from '../components/PageTransition'
import Logo from '../components/Logo'
import { setRef } from '../lib/device'
import { track } from '../lib/events'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const STEPS = [
  { n: '01', title: 'Banao', text: 'Plan type, 2-4 date options, jagah, budget. 30 second.' },
  { n: '02', title: 'Bhejo', text: 'Ek link WhatsApp group mein daal do. Bas.' },
  { n: '03', title: 'Vote', text: 'Dost bina signup 10 second mein vote karte hain.' },
  { n: '04', title: 'Chalo', text: 'AI poora plan likhta hai. Kharcha bhi settle.' },
]

const KINDS = [
  { label: 'Trip', tone: 'peacock', rotate: -4, Icon: Backpack },
  { label: 'Movie', tone: 'rani', rotate: 3, Icon: Clapperboard },
  { label: 'Birthday', tone: 'haldi', rotate: -2, Icon: Cake },
  { label: 'Party', tone: 'saffron', rotate: 4, Icon: PartyPopper },
  { label: 'Dinner', tone: 'night', rotate: -3, Icon: UtensilsCrossed },
]

function RollingNumber({ value, className }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setShown(value)
      return undefined
    }
    let frame
    const start = performance.now()
    const duration = 900
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(value * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reduce])

  return <span className={className}>{shown.toLocaleString('en-IN')}</span>
}

export default function Landing() {
  const [params] = useSearchParams()
  const [counts, setCounts] = useState({ plans: 0, friends: 0, done: 0 })

  // Referral attribution: remember who sent this device here.
  useEffect(() => {
    const ref = params.get('ref')
    if (ref) setRef(ref)
  }, [params])

  // Live counter strip. Stays at zero if the DB is not reachable yet.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let alive = true
    const load = async () => {
      try {
        const [plans, friends, done] = await Promise.all([
          supabase.from('plans').select('id', { count: 'exact', head: true }),
          supabase.from('participants').select('id', { count: 'exact', head: true }),
          supabase.from('plans').select('id', { count: 'exact', head: true }).eq('status', 'done'),
        ])
        if (!alive) return
        setCounts({
          plans: plans.count || 0,
          friends: friends.count || 0,
          done: done.count || 0,
        })
      } catch {
        /* counters are decoration; silence is fine */
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  return (
    <PageTransition>
      <header className="flex items-center justify-between px-4 pt-5">
        <Logo />
        <Link
          to="/stats"
          className="rounded-[10px] border-2 border-ink bg-paper-dark px-2.5 py-1 text-micro font-bold uppercase"
        >
          Stats
        </Link>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="px-4 pt-4">
        <TicketCard tone="peacock">
          <div className="h-[46vh] max-h-[320px] min-h-[220px] w-full border-b-2 border-ink bg-paper">
            <HeroPostcardStatic />
          </div>
          <div className="p-4">
            <h1 className="text-balance text-display font-black">
              Plan banao, group bulao, <span className="text-saffron">ho jao gaayab.</span>
            </h1>
            <p className="mt-2 text-base text-ink/75">Ek link. Zero signup. Poora plan.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                as={Link}
                to="/new"
                size="lg"
                tone="saffron"
                block
                onClick={() => track('cta_click', null)}
              >
                Chalo! Plan banao
              </Button>
              <Button as="a" href="#kaise" size="md" tone="paper" block>
                Dekho kaise kaam karta hai
              </Button>
            </div>
            <HandNote dir="left" className="mt-3">
              yahan tap karo
            </HandNote>
          </div>
        </TicketCard>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="kaise" className="scroll-mt-4 px-4 pt-10">
        <h2 className="text-h1 font-black">Kaise kaam karta hai?</h2>
        <p className="mt-1 text-small text-ink/70">Chaar station. Ek hi link.</p>
        <div className="mt-4 rounded-card border-2 border-ink bg-paper-dark p-3">
          <JourneyRail
            stages={[
              { key: 'banao', label: 'Banao' },
              { key: 'bhejo', label: 'Bhejo' },
              { key: 'vote', label: 'Vote' },
              { key: 'chalo', label: 'Chalo' },
            ]}
            current={0}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <TicketCard tone={i % 2 ? 'peacock' : 'rani'} notch>
                <div className="flex items-start gap-3 p-4">
                  <span className="font-mono text-h2 text-ink/35">{step.n}</span>
                  <div>
                    <h3 className="text-h3 font-black">{step.title}</h3>
                    <p className="mt-1 text-small text-ink/75">{step.text}</p>
                  </div>
                </div>
              </TicketCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- Live counters ---------- */}
      <section className="mt-10 border-y-2 border-ink bg-night px-4 py-7 text-paper">
        <div className="mx-auto flex w-full max-w-md items-stretch justify-between gap-2 text-center font-mono">
          {[
            { label: 'plans', value: counts.plans },
            { label: 'dost', value: counts.friends },
            { label: 'trips done', value: counts.done },
          ].map((item) => (
            <div key={item.label} className="flex-1">
              <RollingNumber value={item.value} className="block text-h1 font-bold text-haldi" />
              <span className="text-micro uppercase tracking-widest text-paper/70">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Plan kinds ---------- */}
      <section className="px-4 pt-10">
        <h2 className="text-h1 font-black">Kis cheez ke liye?</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {KINDS.map(({ label, tone, rotate, Icon }) => (
            <Sticker key={label} tone={tone} rotate={rotate} icon={<Icon size={16} strokeWidth={2.5} />}>
              {label}
            </Sticker>
          ))}
        </div>
        <p className="mt-4 font-hand text-h3 text-peacock">
          …aur jo bhi group plan karne mein fail hota hai.
        </p>
      </section>

      <ViralFooter />
    </PageTransition>
  )
}
