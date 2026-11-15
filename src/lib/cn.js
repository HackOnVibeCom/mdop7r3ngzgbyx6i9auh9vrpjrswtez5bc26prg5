import clsx from 'clsx'

/** Tiny class-name helper. Keeps JSX readable without a Tailwind merge dependency. */
export function cn(...parts) {
  return clsx(parts)
}
