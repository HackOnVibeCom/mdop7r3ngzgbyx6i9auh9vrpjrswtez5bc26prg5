import { cn } from '../lib/cn'
import { colorForName, initialsForName } from '../lib/palette'

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-micro',
  md: 'h-10 w-10 text-small',
  lg: 'h-14 w-14 text-h3',
}

/** Initials in a circle; colour hashed from the name so it is stable everywhere. */
export default function Avatar({ name = '', size = 'md', className, title }) {
  const { bg, fg } = colorForName(name)
  return (
    <span
      title={title || name}
      aria-label={name || 'Friend'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-bold',
        SIZES[size] || SIZES.md,
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initialsForName(name)}
    </span>
  )
}

/** Overlapping row of avatars with a +N overflow chip. */
export function AvatarRow({ names = [], max = 5, size = 'sm' }) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <span className="flex items-center">
      {shown.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size={size} className={i ? '-ml-2' : ''} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            '-ml-2 inline-flex items-center justify-center rounded-full border-2 border-ink bg-paper-dark font-bold',
            SIZES[size] || SIZES.sm
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
