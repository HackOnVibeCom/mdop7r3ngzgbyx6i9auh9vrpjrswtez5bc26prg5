import { cn } from '../lib/cn'

/**
 * Sticky mobile action bar. Sits on paper, keeps clear of the iOS home bar.
 * Renders a spacer so page content is never hidden behind it.
 */
export default function BottomBar({ children, className }) {
  return (
    <>
      <div aria-hidden="true" className="h-24" />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 backdrop-blur',
          'px-4 pt-3 pb-safe',
          className
        )}
      >
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </>
  )
}
