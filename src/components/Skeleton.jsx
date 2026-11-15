import { cn } from '../lib/cn'

/** Shimmering paper block. Never show a blank screen; show paper. */
export default function Skeleton({ className, ...rest }) {
  return <div aria-hidden="true" className={cn('shimmer rounded-input', className)} {...rest} />
}

/** Ticket-shaped loading placeholder. */
export function TicketSkeleton({ lines = 3, className }) {
  return (
    <div
      className={cn('rounded-card border-2 border-ink/30 bg-paper p-4', className)}
      role="status"
      aria-label="Loading..."
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="tear-line mt-4 space-y-2 pt-4">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}
