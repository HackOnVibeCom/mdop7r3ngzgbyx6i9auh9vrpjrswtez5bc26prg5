import { toPng } from 'html-to-image'

/** Absolute origin of the running app (works on localhost, Pages and Vercel). */
export function origin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function planUrl(code) {
  return `${origin()}/p/${String(code || '').toLowerCase()}`
}

/** Landing link that carries referral attribution for this plan. */
export function referralUrl(code) {
  return `${origin()}/?ref=${String(code || '').toLowerCase()}`
}

export function whatsappLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** The pre-filled group invite message. */
export function inviteText({ hostName, title, emoji = '🎒', code }) {
  return (
    `${hostName} created a plan: '${title}' ${emoji}\n` +
    `Vote on dates, places & budget in 10 seconds 👉 ${planUrl(code)}`
  )
}

/** Nudge message for friends who opened but did not vote. */
export function nudgeText({ name, title, code }) {
  return `Hey ${name}, your vote is needed for '${title}' 👀\nTakes 10 seconds: ${planUrl(code)}`
}

/**
 * UPI deep link. The app never touches money — this just opens the user's UPI app.
 * pa = payee VPA, pn = payee name, am = amount, tn = note
 */
export function upiLink({ pa, pn, am, tn }) {
  const params = new URLSearchParams()
  params.set('pa', pa || '')
  if (pn) params.set('pn', pn)
  if (am) params.set('am', Number(am).toFixed(2))
  params.set('cu', 'INR')
  if (tn) params.set('tn', tn)
  return `upi://pay?${params.toString()}`
}

function icsDate(date) {
  // All-day VEVENT dates are YYYYMMDD in local terms.
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function icsStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * All-day calendar event for the locked plan.
 * `startDate` is an ISO date string; `days` extends the event (DTEND is exclusive).
 */
export function makeIcs({ title, emoji = '🎒', startDate, days = 1, place = '', code, description = '' }) {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + Math.max(1, Number(days) || 1))

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChaloPlan//Hackathon//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${code}@chaloplan`,
    `DTSTAMP:${icsStamp()}`,
    `DTSTART;VALUE=DATE:${icsDate(start)}`,
    `DTEND;VALUE=DATE:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`${emoji} ${title}`)}`,
    place ? `LOCATION:${icsEscape(place)}` : null,
    `DESCRIPTION:${icsEscape(description || planUrl(code))}`,
    `URL:${planUrl(code)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function downloadIcs(ics, filename = 'chaloplan.ics') {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Render a DOM node to a PNG and hand it to the user.
 * Uses the Web Share API when available (so it lands straight in WhatsApp),
 * otherwise falls back to a download.
 */
export async function downloadCard(node, filename = 'chaloplan-card.png', { share = true } = {}) {
  if (!node) throw new Error('Card node missing')
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#F6EFE3',
    skipFonts: false,
  })

  if (share && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ChaloPlan' })
        return 'shared'
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
      /* fall through to download */
    }
  }

  triggerDownload(dataUrl, filename)
  return 'downloaded'
}

/** Copy helper with a clipboard fallback for older WebViews. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}
