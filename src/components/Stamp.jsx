import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../lib/cn'

const TONES = {
  chili: 'text-chili border-chili',
  peacock: 'text-peacock border-peacock',
  rani: 'text-rani border-rani',
  night: 'text-night border-night',
  saffron: 'text-saffron border-saffron',
}

/**
 * Rubber stamp: LOCKED / VOTED / PAID / PAHUNCH GAYE.
 * Slams in (scale 3 -> 1) with a rough displaced edge, then settles at -8deg.
 */
export default function Stamp({
  children,
  tone = 'chili',
  rotate = -8,
  animate = true,
  className,
}) {
  const reduce = useReducedMotion()
  const shouldAnimate = animate && !reduce

  return (
    <motion.span
      role="img"
      aria-label={typeof children === 'string' ? children : undefined}
      initial={shouldAnimate ? { scale: 3, rotate: -20, opacity: 0 } : false}
      animate={{ scale: 1, rotate, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16, mass: 0.7 }}
      className={cn(
        'stamp-rough inline-flex items-center justify-center rounded-[10px] border-[3px] px-3 py-1',
        'font-display text-h3 font-black uppercase tracking-widest opacity-90',
        TONES[tone] || TONES.chili,
        className
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </motion.span>
  )
}
