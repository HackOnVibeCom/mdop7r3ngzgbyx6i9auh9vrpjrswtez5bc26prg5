import { Link } from 'react-router-dom'
import Logo from './Logo'
import { track } from '../lib/events'

/**
 * Every page carries the loop: "Plan your own".
 * `refCode` is the current plan's code, so new hosts are attributed to it.
 */
export default function ViralFooter({ refCode = '', planId = null }) {
  const to = refCode ? `/?ref=${refCode}` : '/'
  return (
    <footer className="mt-10 border-t-2 border-ink bg-night px-4 py-8 text-paper">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
        <Logo className="text-paper" />
        <Link
          to={to}
          onClick={() => track('cta_click', planId)}
          className="rounded-btn border-2 border-paper bg-saffron px-4 py-3 font-bold text-ink shadow-[4px_4px_0_#F6EFE3]"
        >
          Apna plan banao →
        </Link>
        <p className="font-hand text-h3 text-haldi">Made with chai in Ghaziabad</p>
        <p className="text-micro text-paper/60">
          Plan banao, group bulao, ho jao gaayab. · HackOnVibe 2026 · 0xalgos
        </p>
      </div>
    </footer>
  )
}
