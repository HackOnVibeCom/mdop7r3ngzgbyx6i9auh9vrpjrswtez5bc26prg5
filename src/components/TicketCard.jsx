import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { cn } from '../lib/cn'

const SHADOWS = {
  rani: 'shadow-riso',
  peacock: 'shadow-riso-peacock',
  ink: 'shadow-riso-ink',
  haldi: 'shadow-riso-haldi',
  saffron: 'shadow-riso-saffron',
  none: '',
}

const MAX_TILT = 8

/**
 * The app's workhorse surface: a printed ticket on paper.
 * Tilts up to 8 degrees toward the pointer with a travelling shine highlight.
 * Tilt is skipped entirely when the user prefers reduced motion.
 */
export default function TicketCard({
  children,
  tone = 'rani',
  tilt = true,
  notch = false,
  as: Tag = 'div',
  className,
  innerClassName,
  layoutId,
  ...rest
}) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const px = useMotionValue(0)
  const py = useMotionValue(0)

  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), {
    stiffness: 180,
    damping: 18,
  })
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), {
    stiffness: 180,
    damping: 18,
  })
  const shineX = useTransform(px, [-0.5, 0.5], ['-30%', '130%'])
  const shineOpacity = useSpring(0, { stiffness: 150, damping: 20 })

  const active = tilt && !reduce

  function handleMove(event) {
    if (!active || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const point = event.touches ? event.touches[0] : event
    px.set((point.clientX - rect.left) / rect.width - 0.5)
    py.set((point.clientY - rect.top) / rect.height - 0.5)
    shineOpacity.set(1)
  }

  function handleLeave() {
    px.set(0)
    py.set(0)
    shineOpacity.set(0)
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={cn('relative', active && '[perspective:1200px]', className)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchMove={handleMove}
      onTouchEnd={handleLeave}
    >
      <motion.div
        ref={ref}
        style={active ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className="h-full"
      >
        <Tag
          className={cn(
            'relative h-full overflow-hidden rounded-card border-2 border-ink bg-paper',
            SHADOWS[tone] ?? SHADOWS.rani,
            notch && 'ticket-notch',
            innerClassName
          )}
          {...rest}
        >
          {children}
          {active && (
            <motion.span
              aria-hidden="true"
              className="tilt-shine pointer-events-none absolute inset-y-0 w-1/2"
              style={{ left: shineX, opacity: shineOpacity }}
            />
          )}
        </Tag>
      </motion.div>
    </motion.div>
  )
}

/** Dashed tear-off stub used inside boarding-pass style tickets. */
export function TicketStub({ children, className }) {
  return <div className={cn('tear-line px-4 py-3', className)}>{children}</div>
}
