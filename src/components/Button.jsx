import { forwardRef } from 'react'
import { cn } from '../lib/cn'

const TONES = {
  saffron: 'bg-saffron text-ink',
  peacock: 'bg-peacock text-paper',
  rani: 'bg-rani text-paper',
  haldi: 'bg-haldi text-ink',
  night: 'bg-night text-paper',
  chili: 'bg-chili text-paper',
  paper: 'bg-paper text-ink',
  ghost: 'bg-transparent text-ink',
}

const SIZES = {
  sm: 'px-3 py-2 text-small min-h-[44px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-5 py-4 text-h3 min-h-[56px]',
}

/**
 * Chunky riso button: hard offset shadow, presses down into the paper on tap.
 * Renders as <button> by default, or any element via `as`.
 */
const Button = forwardRef(function Button(
  {
    as: Tag = 'button',
    tone = 'saffron',
    size = 'md',
    block = false,
    loading = false,
    disabled = false,
    className,
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading
  return (
    <Tag
      ref={ref}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center gap-2 rounded-btn border-2 border-ink font-bold',
        'shadow-riso-sm transition-[transform,box-shadow] duration-100 ease-out',
        'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-x-0 disabled:active:translate-y-0',
        TONES[tone] || TONES.saffron,
        SIZES[size] || SIZES.md,
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </Tag>
  )
})

export default Button
