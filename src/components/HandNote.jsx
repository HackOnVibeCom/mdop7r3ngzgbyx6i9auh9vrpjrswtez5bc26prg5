import { cn } from '../lib/cn'

const DIRS = {
  left: 'M44 6C28 8 12 14 4 24M4 24l9-3M4 24l3 9',
  right: 'M4 6c16 2 32 8 40 18M44 24l-9-3M44 24l-3 9',
  down: 'M8 2c6 14 14 22 28 28M36 30l-9-2M36 30l-2-9',
}

/** Caveat-font aside with a hand-drawn arrow. Purely decorative. */
export default function HandNote({ children, dir = 'down', className }) {
  return (
    <p className={cn('flex items-center gap-1.5 font-hand text-h3 text-rani', className)}>
      <span>{children}</span>
      <svg aria-hidden="true" viewBox="0 0 48 36" className="h-6 w-8 shrink-0">
        <path d={DIRS[dir] || DIRS.down} fill="none" stroke="#E8336D" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </p>
  )
}
