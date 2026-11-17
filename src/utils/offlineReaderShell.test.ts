import { Capacitor } from '@capacitor/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ensureOfflineReaderShell, OfflineReaderShellError } from './offlineReaderShell'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }))

class TestPort {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onmessageerror: (() => void) | null = null
  peer?: TestPort
  close = vi.fn()
  postMessage(data: unknown) { this.peer?.onmessage?.({ data }) }
}
class TestChannel {
  port1 = new TestPort()
  port2 = new TestPort()
  constructor() { this.port1.peer = this.port2; this.port2.peer = this.port1 }
}

const postMessage = vi.fn()
beforeEach(() => {
  vi.stubEnv('PROD', true)
  vi.stubGlobal('MessageChannel', TestChannel)
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ active: { postMessage } }) } })
  document.head.innerHTML = '<script type="module" src="/assets/app-new.js"></script><link rel="stylesheet" href="/assets/app-new.css">'
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
  postMessage.mockReset().mockImplementation((_message, ports: TestPort[]) => {
    ports[0].postMessage({ type: 'NAAMRAS_CHECK_OFFLINE_READER', ready: true })
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); document.head.innerHTML = '' })

test('requires the active worker to verify the current page assets before allowing a download', async () => {
  await ensureOfflineReaderShell()
  expect(postMessage).toHaveBeenCalledWith({ type: 'NAAMRAS_CHECK_OFFLINE_READER', assets: ['/assets/app-new.js', '/assets/app-new.css'] }, expect.any(Array))
  const port = postMessage.mock.calls[0][1][0] as TestPort
  expect(port.close).toHaveBeenCalled()
  expect(port.peer?.close).toHaveBeenCalled()
})

test('does not approve an old or incomplete active reader', async () => {
  postMessage.mockImplementation((_message, ports: TestPort[]) => ports[0].postMessage({ type: 'NAAMRAS_CHECK_OFFLINE_READER', ready: false }))
  await expect(ensureOfflineReaderShell()).rejects.toBeInstanceOf(OfflineReaderShellError)
})

test.each(['no worker', 'legacy worker'])('bounds waiting for %s and gives recovery guidance', async mode => {
  vi.useFakeTimers()
  if (mode === 'no worker') vi.stubGlobal('navigator', { serviceWorker: { ready: new Promise(() => {}) } })
  else postMessage.mockImplementation(() => {})
  const result = expect(ensureOfflineReaderShell()).rejects.toThrow('close other Naamras tabs')
  await vi.advanceTimersByTimeAsync(30_000)
  await result
})

test('cancellation interrupts shell installation without waiting for the timeout', async () => {
  vi.stubGlobal('navigator', { serviceWorker: { ready: new Promise(() => {}) } })
  const controller = new AbortController()
  const result = expect(ensureOfflineReaderShell(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  await result
  expect(postMessage).not.toHaveBeenCalled()
})

test('unsupported production web browsers cannot claim offline readiness', async () => {
  vi.stubGlobal('navigator', {})
  await expect(ensureOfflineReaderShell()).rejects.toBeInstanceOf(OfflineReaderShellError)
})

test('bundled native apps and development do not require a web service worker', async () => {
  vi.stubGlobal('navigator', {})
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
  await ensureOfflineReaderShell()
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
  vi.stubEnv('PROD', false)
  await ensureOfflineReaderShell()
})
