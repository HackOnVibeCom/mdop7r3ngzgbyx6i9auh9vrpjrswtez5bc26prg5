import { useId } from 'react'
import { cn } from '../lib/cn'

/**
 * Labelled input with inline validation text.
 * Always renders a real <label for>, so screen readers and taps both work.
 */
export default function Field({
  label,
  hint,
  error,
  as = 'input',
  className,
  inputClassName,
  children,
  id: providedId,
  ...rest
}) {
  const autoId = useId()
  const id = providedId || autoId
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const Tag = as

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="label-ink">
          {label}
        </label>
      )}
      {as === 'select' ? (
        <Tag
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('field appearance-none pr-8', error && 'border-chili', inputClassName)}
          {...rest}
        >
          {children}
        </Tag>
      ) : (
        <Tag
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('field', error && 'border-chili', inputClassName)}
          {...rest}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-micro font-semibold text-chili">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-micro text-ink/55">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
