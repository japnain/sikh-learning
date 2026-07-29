import { beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.resetModules()
})

test('persists one stable device id when storage is available', async () => {
  const { getNaamrasDeviceId } = await import('./device')

  const first = getNaamrasDeviceId()

  expect(first).toMatch(/^device-/)
  expect(getNaamrasDeviceId()).toBe(first)
  expect(localStorage.getItem('naamras-device-id')).toBe(first)
})

test('keeps a stable in-memory device id when storage is restricted', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage is restricted', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage is restricted', 'SecurityError')
  })
  const { getNaamrasDeviceId } = await import('./device')

  const first = getNaamrasDeviceId()

  expect(first).toMatch(/^device-/)
  expect(getNaamrasDeviceId()).toBe(first)
})
