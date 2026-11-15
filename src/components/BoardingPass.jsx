import { QRCodeSVG } from 'qrcode.react'
import { ArrowRight } from 'lucide-react'
import TicketCard from './TicketCard'
import Sticker from './Sticker'
import { prettyDate, slotLabel } from '../lib/dates'
import { rupees } from '../lib/money'
import { planUrl } from '../lib/share'

const STATUS_TONES = {
  voting: 'peacock',
  locked: 'saffron',
  live: 'rani',
  done: 'night',
}

/**
 * The big boarding pass: from -> to, the date options, PNR code and a QR stub.
 * Shared element between the Share screen and the plan header via layoutId.
 */
export default function BoardingPass({ plan, dateOptions = [], placeOptions = [], showQr = true }) {
  if (!plan) return null
  const from = plan.from_city || 'Origin TBD'
  const toLabel =
    placeOptions.length === 1
      ? placeOptions[0].label
      : placeOptions.length > 1
        ? `${placeOptions.length} places`
        : 'To be decided'

  return (
    <TicketCard tone="ink" layoutId={`ticket-${plan.code}`}>
      {/* header strip */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink bg-haldi px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/60">
            ChaloPlan · boarding pass
          </p>
          <h2 className="truncate text-h2 font-black">
            {plan.emoji} {plan.title}
          </h2>
        </div>
        <Sticker tone={STATUS_TONES[plan.status] || 'peacock'} rotate={4} className="shrink-0">
          {plan.status}
        </Sticker>
      </div>

      {/* route */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="min-w-0">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">from</p>
          <p className="truncate text-h3 font-bold">{from}</p>
        </div>
        <ArrowRight size={22} strokeWidth={2.5} className="shrink-0 text-saffron" />
        <div className="min-w-0 text-right">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">to</p>
          <p className="truncate text-h3 font-bold">{toLabel}</p>
        </div>
      </div>

      {/* date options */}
      {dateOptions.length > 0 && (
        <div className="ticket-notch tear-line px-4 py-3">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">date options</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {dateOptions.map((option) => (
              <li
                key={option.id || option.value}
                className="rounded-[10px] border-2 border-ink bg-paper-dark px-2 py-1 font-mono text-micro font-bold"
              >
                {prettyDate(option.value)}
                {option.meta && option.meta.slot ? ` · ${slotLabel(option.meta.slot)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* stub: PNR + budget + QR */}
      <div className="tear-line flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-micro uppercase tracking-widest text-ink/50">pnr</p>
          <p className="font-mono text-h2 font-bold tracking-[0.18em]">{plan.code.toUpperCase()}</p>
          {(plan.budget_min || plan.budget_max) && (
            <p className="mt-1 font-mono text-micro text-ink/60">
              {rupees(plan.budget_min)} – {rupees(plan.budget_max)} per person
            </p>
          )}
          <p className="mt-1 text-micro text-ink/60">Host: {plan.host_name}</p>
        </div>
        {showQr && (
          <div className="shrink-0 rounded-[10px] border-2 border-ink bg-paper p-1.5">
            <QRCodeSVG
              value={planUrl(plan.code)}
              size={76}
              bgColor="#F6EFE3"
              fgColor="#1E1B2E"
              level="M"
              aria-label="Plan QR code"
            />
          </div>
        )}
      </div>
    </TicketCard>
  )
}
