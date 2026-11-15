import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { prettyDate } from '../lib/dates'
import { rupees } from '../lib/money'
import { planUrl, referralUrl } from '../lib/share'

/**
 * 9:16 WhatsApp-status card, rendered to PNG by html-to-image.
 * Fixed pixel sizes (not responsive units) so the export is predictable.
 * Everything is inline-styled or plain Tailwind colours — no CSS the
 * serializer cannot resolve.
 */
const StatusCard = forwardRef(function StatusCard({ plan, dateOptions = [], placeOptions = [] }, ref) {
  if (!plan) return null

  return (
    <div
      ref={ref}
      style={{ width: 360, height: 640 }}
      className="relative flex flex-col overflow-hidden border-2 border-ink bg-paper"
    >
      {/* top: title block */}
      <div className="border-b-2 border-ink bg-haldi px-5 pb-4 pt-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/60">chalo · plan</p>
        <p className="mt-2 font-display text-[34px] font-black leading-[1.05] text-ink">
          {plan.emoji} {plan.title}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-ink/70">
          {plan.host_name} ne plan kiya hai
        </p>
      </div>

      {/* middle: the ask */}
      <div className="flex flex-1 flex-col justify-between px-5 py-5">
        <div>
          <p className="font-display text-[26px] font-black leading-tight">
            Vote daal do, <span className="text-saffron">10 second</span> lagenge.
          </p>

          {placeOptions.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">jagah options</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {placeOptions.slice(0, 4).map((option) => (
                  <span
                    key={option.id || option.label}
                    className="rounded-[10px] border-2 border-ink bg-peacock px-2 py-1 text-[12px] font-bold text-paper"
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dateOptions.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">date options</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dateOptions.slice(0, 4).map((option) => (
                  <span
                    key={option.id || option.value}
                    className="rounded-[10px] border-2 border-ink bg-paper-dark px-2 py-1 font-mono text-[12px] font-bold"
                  >
                    {prettyDate(option.value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(plan.budget_min || plan.budget_max) && (
            <p className="mt-3 font-mono text-[13px] font-bold text-ink/70">
              Budget: {rupees(plan.budget_min)} – {rupees(plan.budget_max)} per banda
            </p>
          )}
        </div>

        {/* link + QR */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">link</p>
            <p className="break-all font-mono text-[13px] font-bold">{planUrl(plan.code)}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">pnr</p>
            <p className="font-mono text-[22px] font-bold tracking-[0.16em]">{plan.code.toUpperCase()}</p>
          </div>
          <div className="shrink-0 border-2 border-ink bg-paper p-1.5">
            <QRCodeSVG value={planUrl(plan.code)} size={84} bgColor="#F6EFE3" fgColor="#1E1B2E" level="M" />
          </div>
        </div>
      </div>

      {/* footer: the loop */}
      <div className="border-t-2 border-ink bg-night px-5 py-3">
        <p className="text-[12px] font-bold text-paper">
          Apna plan banao → <span className="text-haldi">{referralUrl(plan.code)}</span>
        </p>
      </div>
    </div>
  )
})

export default StatusCard
