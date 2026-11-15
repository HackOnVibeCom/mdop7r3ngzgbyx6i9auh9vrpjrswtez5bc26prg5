import { motion, useReducedMotion } from 'framer-motion'

/** Slide-up + fade wrapper used by every route. */
export default function PageTransition({ children, className }) {
  const reduce = useReducedMotion()
  return (
    <motion.main
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.22, 0.9, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.main>
  )
}
