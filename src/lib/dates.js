export const TIME_SLOTS = [
  { value: '', label: 'Koi bhi time' },
  { value: 'morning', label: 'Subah' },
  { value: 'afternoon', label: 'Dopahar' },
  { value: 'evening', label: 'Shaam' },
  { value: 'night', label: 'Raat' },
]

export function slotLabel(slot) {
  const found = TIME_SLOTS.find((s) => s.value === slot)
  return found && found.value ? found.label : ''
}

/** YYYY-MM-DD for an <input type="date"> value, in local time. */
export function toInputDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function todayInput() {
  return toInputDate(new Date())
}

export function addDays(iso, count) {
  const d = new Date(iso)
  d.setDate(d.getDate() + count)
  return toInputDate(d)
}

/** "Sat, 22 Nov" */
export function prettyDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "22 Nov" — compact form for tickets. */
export function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function weekdayShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { weekday: 'short' })
}

/** ISO timestamp N hours from now — used for the voting deadline. */
export function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

/** "22 ghante baaki" / "Deadline nikal gayi" */
export function deadlineLabel(iso) {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Deadline nikal gayi'
  const hours = Math.floor(diff / 3600000)
  if (hours >= 24) {
    const days = Math.round(hours / 24)
    return `${days} din baaki`
  }
  if (hours >= 1) return `${hours} ghante baaki`
  return `${Math.max(1, Math.round(diff / 60000))} minute baaki`
}
