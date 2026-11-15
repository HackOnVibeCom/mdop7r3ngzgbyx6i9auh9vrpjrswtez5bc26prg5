import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../lib/cn'

/** The 8 stages of a ChaloPlan journey, drawn as railway stations. */
export const JOURNEY_STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'invite', label: 'Invite' },
  { key: 'vote', label: 'Vote' },
  { key: 'results', label: 'Results' },
  { key: 'plan', label: 'AI Plan' },
  { key: 'locked', label: 'Locked' },
  { key: 'live', label: 'Live' },
  { key: 'memories', label: 'Memories' },
]

function TrainIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="12" rx="4" fill="#FF7A1A" stroke="#1E1B2E" strokeWidth="2" />
      <rect x="7.5" y="7" width="9" height="4" rx="1.5" fill="#F6EFE3" stroke="#1E1B2E" strokeWidth="1.5" />
      <circle cx="8" cy="18" r="2" fill="#1E1B2E" />
      <circle cx="16" cy="18" r="2" fill="#1E1B2E" />
    </svg>
  )
}

/**
 * Horizontal railway track. The little train slides to the active station
 * using a shared layout animation.
 */
export default function JourneyRail({ stages = JOURNEY_STAGES, current = 0, compact = false, className }) {
  const reduce = useReducedMotion()
  const index = Math.max(0, Math.min(current, stages.length - 1))

  return (
    <nav aria-label="Plan journey progress" className={cn('w-full', className)}>
      <ol className="relative flex items-start justify-between gap-1">
        {/* the track */}
        <span
          aria-hidden="true"
          className="absolute left-2 right-2 top-[11px] h-0 border-t-2 border-dashed border-ink/35"
        />
        {stages.map((stage, i) => {
          const isDone = i < index
          const isNow = i === index
          return (
            <li
              key={stage.key}
              aria-current={isNow ? 'step' : undefined}
              className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  'relative grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-ink',
                  isNow ? 'bg-saffron' : isDone ? 'bg-peacock' : 'bg-paper-dark'
                )}
              >
                {isNow && (
                  <motion.span
                    layout={!reduce}
                    layoutId="journey-train"
                    className="absolute -top-[26px] h-6 w-6"
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <TrainIcon className={cn('h-6 w-6', !reduce && 'animate-train-chug')} />
                  </motion.span>
                )}
                {isDone && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                    <path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="#F6EFE3" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              {!compact && (
                <span
                  className={cn(
                    'w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide',
                    isNow ? 'text-ink' : 'text-ink/50'
                  )}
                >
                  {stage.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
