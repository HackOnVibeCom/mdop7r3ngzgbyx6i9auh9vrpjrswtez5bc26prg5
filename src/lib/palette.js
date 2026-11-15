export const AVATAR_COLORS = [
  { bg: '#FF7A1A', fg: '#1E1B2E' },
  { bg: '#0F8B8D', fg: '#F6EFE3' },
  { bg: '#E8336D', fg: '#F6EFE3' },
  { bg: '#F4C430', fg: '#1E1B2E' },
  { bg: '#14213D', fg: '#F6EFE3' },
  { bg: '#D7263D', fg: '#F6EFE3' },
]

/** Deterministic colour from a name, so a friend keeps the same avatar everywhere. */
export function colorForName(name = '') {
  let hash = 0
  const text = String(name).trim().toLowerCase() || '?'
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initialsForName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
