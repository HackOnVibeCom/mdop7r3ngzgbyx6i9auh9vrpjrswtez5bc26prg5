import { useId } from 'react'
import { rupees } from '../lib/money'

/**
 * Two stacked range inputs for a budget band.
 * Both thumbs stay reachable: the lower one is on top in the left half of the
 * track and vice versa, which is the standard trick for overlapping sliders.
 */
export default function DualRange({
  min = 0,
  max = 10000,
  step = 100,
  value = [0, 0],
  onChange,
  label = 'Budget per person',
}) {
  const id = useId()
  const [low, high] = value
  const span = Math.max(1, max - min)
  const leftPct = ((low - min) / span) * 100
  const rightPct = ((high - min) / span) * 100

  function setLow(next) {
    const clamped = Math.min(Number(next), high - step)
    onChange([Math.max(min, clamped), high])
  }

  function setHigh(next) {
    const clamped = Math.max(Number(next), low + step)
    onChange([low, Math.min(max, clamped)])
  }

  return (
    <div className="w-full">
      <div className="flex items-end justify-between">
        <span className="label-ink mb-0">{label}</span>
        <span className="font-mono text-base font-bold">
          {rupees(low)} – {rupees(high)}
        </span>
      </div>

      <div className="relative mt-4 h-12">
        {/* track */}
        <div className="absolute left-0 right-0 top-4 h-2 rounded-full border-2 border-ink bg-paper-dark" />
        {/* selected band */}
        <div
          className="absolute top-4 h-2 border-y-2 border-ink bg-saffron"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          id={`${id}-low`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => setLow(e.target.value)}
          aria-label={`${label} — kam se kam`}
          className="dual-range absolute inset-x-0 top-0 h-12 w-full"
        />
        <input
          id={`${id}-high`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => setHigh(e.target.value)}
          aria-label={`${label} — zyada se zyada`}
          className="dual-range absolute inset-x-0 top-0 h-12 w-full"
        />
      </div>

      <div className="flex justify-between font-mono text-micro text-ink/50">
        <span>{rupees(min)}</span>
        <span>{rupees(max)}</span>
      </div>
    </div>
  )
}
