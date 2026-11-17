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

const CHECK = 'NAAMRAS_CHECK_OFFLINE_READER'
const PREPARE = 'NAAMRAS_PREPARE_OFFLINE_READER'
const ACTIVATE = 'NAAMRAS_ACTIVATE_OFFLINE_READER'
function makeWorker(state: ServiceWorkerState = 'activated') {
  return Object.assign(new EventTarget(), { state, postMessage: vi.fn((message: { type: string }, ports: TestPort[]) => {
    ports[0].postMessage({ type: message.type, ready: true, matches: true })
  }) })
}
type TestWorker = ReturnType<typeof makeWorker>
function makeRegistration(active: TestWorker) {
  return Object.assign(new EventTarget(), { active: active as TestWorker | null, waiting: null as TestWorker | null,
    installing: null as TestWorker | null, update: vi.fn(async () => {}) })
}
let active: TestWorker
let registration: ReturnType<typeof makeRegistration>
let container: EventTarget & { ready: Promise<ReturnType<typeof makeRegistration>>; controller: TestWorker | null }
let postMessage: TestWorker['postMessage']
beforeEach(() => {
  vi.stubEnv('PROD', true)
  vi.stubGlobal('MessageChannel', TestChannel)
  active = makeWorker()
  postMessage = active.postMessage
  registration = makeRegistration(active)
  container = Object.assign(new EventTarget(), { ready: Promise.resolve(registration), controller: active as TestWorker | null })
  vi.stubGlobal('navigator', { serviceWorker: container })
  document.head.innerHTML = '<script type="module" src="/assets/app-new.js"></script><link rel="stylesheet" href="/assets/app-new.css">'
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
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
  registration.waiting = makeWorker('installed')
  await expect(ensureOfflineReaderShell()).rejects.toBeInstanceOf(OfflineReaderShellError)
  expect(registration.update).not.toHaveBeenCalled()
  expect(registration.waiting.postMessage).not.toHaveBeenCalled()
})

test.each(['no worker', 'legacy worker'])('bounds waiting for %s and gives recovery guidance', async mode => {
  vi.useFakeTimers()
  if (mode === 'no worker') vi.stubGlobal('navigator', { serviceWorker: { ready: new Promise(() => {}) } })
  else postMessage.mockImplementation(() => {})
  const result = expect(ensureOfflineReaderShell()).rejects.toThrow('check your connection')
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

function installWaiting(worker: TestWorker) {
  registration.waiting = worker
  worker.postMessage.mockImplementation((message, ports) => {
    ports[0].postMessage({ type: message.type, matches: true, ready: true })
    if (message.type === ACTIVATE) {
      registration.active = worker
      registration.waiting = null
      worker.state = 'activated'
      container.controller = worker
      worker.dispatchEvent(new Event('statechange'))
      container.dispatchEvent(new Event('controllerchange'))
    }
  })
}

test('explicit downloads prepare and activate a matching waiting reader without reloading', async () => {
  postMessage.mockImplementation((message, ports) => ports[0].postMessage({ type: message.type, matches: false, ready: false }))
  const waiting = makeWorker('installed')
  installWaiting(waiting)
  await ensureOfflineReaderShell(undefined, { recover: true })
  expect(waiting.postMessage.mock.calls.map(([message]) => message.type)).toEqual([CHECK, PREPARE, ACTIVATE, CHECK])
  expect(registration.active).toBe(waiting)
  expect(container.controller).toBe(waiting)
})

test('legacy workers cannot consume the recovery budget and readiness waits for claim', async () => {
  vi.useFakeTimers()
  postMessage.mockImplementation(() => {})
  const waiting = makeWorker('installed')
  registration.waiting = waiting
  waiting.postMessage.mockImplementation((message, ports) => {
    ports[0].postMessage({ type: message.type, matches: true, ready: true })
    if (message.type === ACTIVATE) {
      registration.active = waiting
      registration.waiting = null
      waiting.state = 'activated'
      waiting.dispatchEvent(new Event('statechange'))
    }
  })
  const finished = vi.fn()
  const result = ensureOfflineReaderShell(undefined, { recover: true }).then(finished)
  await vi.advanceTimersByTimeAsync(3_000)
  expect(waiting.postMessage.mock.calls.map(([message]) => message.type)).toContain(ACTIVATE)
  expect(finished).not.toHaveBeenCalled()
  container.controller = waiting
  container.dispatchEvent(new Event('controllerchange'))
  await result
  expect(finished).toHaveBeenCalledOnce()
  expect(postMessage).toHaveBeenCalledTimes(1)
})

test('a busy current worker gets one longer retry after the short probe expires', async () => {
  vi.useFakeTimers()
  postMessage.mockImplementation((message, ports) => {
    if (message.type === CHECK) setTimeout(() => ports[0].postMessage({ type: message.type, matches: true, ready: true }), 4_000)
    else ports[0].postMessage({ type: message.type, matches: true, ready: true })
  })
  const finished = vi.fn()
  const result = ensureOfflineReaderShell(undefined, { recover: true }).then(finished)
  await vi.advanceTimersByTimeAsync(3_000)
  expect(finished).not.toHaveBeenCalled()
  expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([CHECK, CHECK])
  await vi.advanceTimersByTimeAsync(8_000)
  await result
  expect(finished).toHaveBeenCalledOnce()
  expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([CHECK, CHECK, PREPARE, CHECK])
  expect(registration.active).toBe(active)
})

test('an already waiting matching worker wins before the longer active-worker retry', async () => {
  vi.useFakeTimers()
  postMessage.mockImplementation(() => {})
  const waiting = makeWorker('installed')
  installWaiting(waiting)
  const finished = vi.fn()
  const result = ensureOfflineReaderShell(undefined, { recover: true }).then(finished)
  await vi.advanceTimersByTimeAsync(3_000)
  await result
  expect(finished).toHaveBeenCalledOnce()
  expect(postMessage).toHaveBeenCalledTimes(1)
  expect(waiting.postMessage.mock.calls.map(([message]) => message.type)).toEqual([CHECK, PREPARE, ACTIVATE, CHECK])
})

test('an update discovered during the request can finish installing before recovery', async () => {
  vi.useFakeTimers()
  postMessage.mockImplementation((message, ports) => ports[0].postMessage({ type: message.type, matches: false, ready: false }))
  const installing = makeWorker('installing')
  registration.update.mockImplementation(async () => {
    registration.installing = installing
    registration.dispatchEvent(new Event('updatefound'))
    setTimeout(() => {
      installing.state = 'installed'
      registration.installing = null
      installWaiting(installing)
      installing.dispatchEvent(new Event('statechange'))
    }, 100)
  })
  const result = ensureOfflineReaderShell(undefined, { recover: true })
  await vi.advanceTimersByTimeAsync(250)
  await result
  expect(registration.update).toHaveBeenCalledOnce()
  expect(container.controller).toBe(installing)
})

test('explicit downloads repair an incomplete matching active shell', async () => {
  postMessage.mockImplementation((message, ports) => ports[0].postMessage({ type: message.type, matches: true, ready: message.type === PREPARE }))
  await ensureOfflineReaderShell(undefined, { recover: true })
  expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([CHECK, PREPARE])
  expect(registration.update).not.toHaveBeenCalled()
})

test('another deployment cannot be activated or accepted as the current reader', async () => {
  vi.useFakeTimers()
  const mismatch = (message: { type: string }, ports: TestPort[]) => ports[0].postMessage({ type: message.type, matches: false, ready: false })
  postMessage.mockImplementation(mismatch)
  const waiting = makeWorker('installed')
  waiting.postMessage.mockImplementation(mismatch)
  registration.waiting = waiting
  const result = expect(ensureOfflineReaderShell(undefined, { recover: true })).rejects.toBeInstanceOf(OfflineReaderShellError)
  await vi.advanceTimersByTimeAsync(60_000)
  await result
  expect(waiting.postMessage.mock.calls.map(([message]) => message.type)).toEqual([CHECK])
})

test.each(['update', 'prepare', 'activation'])('cancelling during %s stops recovery promptly', async stage => {
  vi.useFakeTimers()
  const controller = new AbortController()
  postMessage.mockImplementation((message, ports) => ports[0].postMessage({ type: message.type, matches: stage === 'prepare', ready: false }))
  if (stage === 'prepare') postMessage.mockImplementation((message, ports) => {
    if (message.type === CHECK) ports[0].postMessage({ type: message.type, matches: true, ready: false })
  })
  if (stage === 'activation') {
    const waiting = makeWorker('installed')
    registration.waiting = waiting
    waiting.postMessage.mockImplementation((message, ports) => ports[0].postMessage({ type: message.type, matches: true, ready: true }))
  }
  const result = expect(ensureOfflineReaderShell(controller.signal, { recover: true })).rejects.toMatchObject({ name: 'AbortError' })
  await vi.advanceTimersByTimeAsync(1)
  controller.abort()
  await result
  expect(vi.getTimerCount()).toBe(0)
})

test('a synchronous postMessage failure is bounded and can recover through a waiting worker', async () => {
  postMessage.mockImplementation(() => { throw new DOMException('Worker terminated', 'InvalidStateError') })
  await expect(ensureOfflineReaderShell()).rejects.toBeInstanceOf(OfflineReaderShellError)
  const waiting = makeWorker('installed')
  installWaiting(waiting)
  await ensureOfflineReaderShell(undefined, { recover: true })
  expect(container.controller).toBe(waiting)
})
