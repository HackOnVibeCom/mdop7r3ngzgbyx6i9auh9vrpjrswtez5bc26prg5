import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import TicketCard from '../components/TicketCard'
import Button from '../components/Button'
import Logo from '../components/Logo'

/** A lost paper train. */
export default function NotFound() {
  return (
    <PageTransition className="px-4 pb-16 pt-5">
      <Logo size="sm" />
      <div className="mt-8">
        <TicketCard tone="haldi" notch>
          <div className="p-5 text-center">
            <svg viewBox="0 0 160 90" className="mx-auto h-24 w-40" role="img" aria-label="Lost paper train">
              <path d="M4 74h152" stroke="#1E1B2E" strokeWidth="3" strokeDasharray="10 8" />
              <g transform="rotate(-12 70 50)">
                <rect x="44" y="34" width="54" height="30" rx="8" fill="#FF7A1A" stroke="#1E1B2E" strokeWidth="3" />
                <rect x="52" y="41" width="16" height="12" rx="3" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="2" />
                <rect x="74" y="41" width="16" height="12" rx="3" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="2" />
                <circle cx="58" cy="67" r="5" fill="#1E1B2E" />
                <circle cx="86" cy="67" r="5" fill="#1E1B2E" />
              </g>
              <text x="120" y="30" fontFamily="Caveat, cursive" fontSize="20" fill="#E8336D">
                404?
              </text>
            </svg>
            <h1 className="mt-3 text-h1 font-black">This station doesn't exist.</h1>
            <p className="mt-2 text-small text-ink/70">
              The link might be wrong, or the plan was removed. Create a new plan in seconds.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button as={Link} to="/new" tone="saffron" size="lg" block>
                Create New Plan
              </Button>
              <Button as={Link} to="/" tone="paper" block>
                Back to Home
              </Button>
            </div>
          </div>
        </TicketCard>
      </div>
    </PageTransition>
  )
}
