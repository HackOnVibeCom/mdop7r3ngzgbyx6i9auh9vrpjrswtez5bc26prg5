import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../lib/cn'

const ToastContext = createContext(null)

const TONES = {
  ok: 'bg-peacock text-paper',
  error: 'bg-chili text-paper',
  info: 'bg-haldi text-ink',
}

let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, { tone = 'info', duration = 3600, action = null } = {}) => {
      seq += 1
      const id = seq
      setToasts((list) => [...list, { id, message, tone, action }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      toast,
      dismiss,
      ok: (m, o) => toast(m, { ...o, tone: 'ok' }),
      success: (m, o) => toast(m, { ...o, tone: 'ok' }),
      error: (m, o) => toast(m, { ...o, tone: 'error' }),
    }),
    [toast, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-center justify-between gap-3',
                'rounded-btn border-2 border-ink px-4 py-3 text-small font-semibold shadow-riso-sm',
                TONES[t.tone] || TONES.info
              )}
            >
              <span>{t.message}</span>
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick?.()
                    dismiss(t.id)
                  }}
                  className="shrink-0 rounded-[10px] border-2 border-current px-2 py-1 text-micro font-bold uppercase"
                >
                  {t.action.label}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 px-1 text-base leading-none opacity-80"
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Keeps components usable in isolation (e.g. a future storybook) without crashing.
    return { toast: () => {}, dismiss: () => {}, ok: () => {}, success: () => {}, error: () => {} }
  }
  return ctx
}
