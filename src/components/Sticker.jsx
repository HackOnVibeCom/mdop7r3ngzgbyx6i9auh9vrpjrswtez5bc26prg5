import { cn } from '../lib/cn'

const TONES = {
  saffron: 'bg-saffron text-ink',
  peacock: 'bg-peacock text-paper',
  rani: 'bg-rani text-paper',
  haldi: 'bg-haldi text-ink',
  night: 'bg-night text-paper',
  chili: 'bg-chili text-paper',
  paper: 'bg-paper-dark text-ink',
}

/** Vintage luggage sticker: bold, slightly rotated, 2px ink border. */
export default function Sticker({
  tone = 'haldi',
  rotate = -3,
  icon = null,
  className,
  children,
  ...rest
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[14px] border-2 border-ink px-2.5 py-1',
        'text-small font-bold uppercase tracking-wide',
        TONES[tone] || TONES.haldi,
        className
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}
