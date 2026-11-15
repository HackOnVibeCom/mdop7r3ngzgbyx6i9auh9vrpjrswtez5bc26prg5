/** "₹1,200" — Indian grouping, no decimals. */
export function rupees(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** "₹1,200 approx" — every AI/estimated price must say so. */
export function approx(amount) {
  return `${rupees(amount)} approx`
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** Median, ignoring null/undefined. Used for the budget vote. */
export function median(values = []) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (!nums.length) return null
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2)
}
