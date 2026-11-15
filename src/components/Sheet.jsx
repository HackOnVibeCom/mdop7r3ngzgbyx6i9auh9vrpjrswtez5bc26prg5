import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

const HEADER_TONES = {
  haldi: 'bg-haldi text-ink',
  peacock: 'bg-peacock text-paper',
  saffron: 'bg-saffron text-ink',
  night: 'bg-night text-paper',
}

/**
 * Bottom sheet on paper. Closes on Escape, backdrop tap and the X button.
 * Focus moves into the sheet when it opens so keyboard users land inside.
 */
export default function Sheet({ open, onClose, title, tone = 'haldi', children }) {
  const reduce = useReducedMotion()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => panelRef.current?.focus(), 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      clearTimeout(timer)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Band karo"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/45"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative z-10 max-h-[88dvh] w-full max-w-md overflow-hidden rounded-t-card border-2 border-ink bg-paper outline-none"
          >
            <div
              className={cn(
                'flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-3',
                HEADER_TONES[tone] || HEADER_TONES.haldi
              )}
            >
              <h2 className="text-h3 font-black">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Band karo"
                className="grid h-9 w-9 place-items-center rounded-[10px] border-2 border-ink bg-paper text-ink"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="max-h-[72dvh] overflow-y-auto px-4 pb-safe pt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
