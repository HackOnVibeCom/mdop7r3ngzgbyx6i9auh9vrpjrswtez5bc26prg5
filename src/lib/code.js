// No ambiguous characters (no i, l, o, 0, 1) so codes survive being read out loud.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function makeCode(length = 6) {
  let out = ''
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
    for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length]
    return out
  }
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}

export function isValidCode(code) {
  if (typeof code !== 'string' || code.length !== 6) return false
  return code.split('').every((char) => ALPHABET.includes(char))
}
