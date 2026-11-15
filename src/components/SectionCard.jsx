import { cn } from '../lib/cn'

// Header accent per tone — matches the boarding-pass palette.
const HEADER = {
  rani: 'bg-rani text-paper',
  peacock: 'bg-peacock text-paper',
  haldi: 'bg-haldi text-ink',
  saffron: 'bg-saffron text-paper',
  ink: 'bg-ink text-paper',
  paper: 'bg-paper-dark text-ink',
}

/**
 * Generic titled card used across the plan page (live results, final plan,
 * locked, tasks, expenses). A colored header strip + a paper body for children.
 */
export default function SectionCard({ title, subtitle, tone = 'rani', children, className }) {
  return (
    <div className={cn('overflow-hidden rounded-card border-2 border-ink bg-paper shadow-riso-ink', className)}>
      <div className={cn('border-b-2 border-ink px-4 py-3', HEADER[tone] || HEADER.rani)}>
        {title && <h3 className="text-h3 font-black leading-tight">{title}</h3>}
        {subtitle && <p className="mt-0.5 text-small font-semibold opacity-80">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
