import { cn } from '../lib/cn'

/** Wordmark: chalo·plan, with the dot as a tiny luggage sticker. */
export default function Logo({ className, size = 'md' }) {
  const text = size === 'lg' ? 'text-h1' : size === 'sm' ? 'text-base' : 'text-h2'
  return (
    <span className={cn('inline-flex items-baseline gap-1 font-display font-black lowercase', text, className)}>
      <span>chalo</span>
      <span
        aria-hidden="true"
        className="mb-1 inline-block h-2.5 w-2.5 rotate-[12deg] rounded-[3px] border-2 border-ink bg-saffron"
      />
      <span>plan</span>
    </span>
  )
}
