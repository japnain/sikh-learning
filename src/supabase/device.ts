const DEVICE_ID_STORAGE_KEY = 'naamras-device-id'
let volatileDeviceId: string | null = null

function createRandomId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createNaamrasObjectId(prefix: string) {
  return createRandomId(prefix)
}

export function getNaamrasDeviceId() {
  if (typeof window === 'undefined') {
    return 'device-server'
  }

  if (volatileDeviceId) return volatileDeviceId

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)
    if (existing) return existing

    const next = createRandomId('device')
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next)
    return next
  } catch {
    volatileDeviceId = createRandomId('device')
    return volatileDeviceId
  }
}
