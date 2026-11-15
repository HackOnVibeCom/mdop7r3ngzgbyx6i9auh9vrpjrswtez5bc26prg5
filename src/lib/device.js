const DEVICE_KEY = 'chaloplan.device_id'
const NAME_KEY = 'chaloplan.name'
const REF_KEY = 'chaloplan.ref'

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode / blocked storage: ignore */
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older WebViews.
  return 'd-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Stable per-browser id. Created on first visit, reused forever after. */
export function getDeviceId() {
  let id = safeGet(DEVICE_KEY)
  if (!id) {
    id = randomId()
    safeSet(DEVICE_KEY, id)
  }
  return id
}

export function getName() {
  return safeGet(NAME_KEY) || ''
}

export function setName(name) {
  safeSet(NAME_KEY, String(name || '').trim())
}

/** Referral code of the plan that brought this device to ChaloPlan. */
export function getRef() {
  return safeGet(REF_KEY) || ''
}

export function setRef(code) {
  if (code) safeSet(REF_KEY, String(code).toLowerCase())
}
