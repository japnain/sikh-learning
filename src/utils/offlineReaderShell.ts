import { Capacitor } from '@capacitor/core'

const SHELL_CHECK_TIMEOUT_MS = 30_000
const SHELL_RECOVERY_TIMEOUT_MS = 60_000
const WORKER_PROBE_TIMEOUT_MS = 3_000
const ACTIVE_RETRY_TIMEOUT_MS = 10_000
const CHECK = 'NAAMRAS_CHECK_OFFLINE_READER'
const PREPARE = 'NAAMRAS_PREPARE_OFFLINE_READER'
const ACTIVATE = 'NAAMRAS_ACTIVATE_OFFLINE_READER'
type ShellReply = { ready: boolean; matches?: boolean }

export class OfflineReaderShellError extends Error {
  constructor() {
    super('Naamras could not finish preparing offline reading. Keep the app open, check your connection and available storage, then try again.')
    this.name = 'OfflineReaderShellError'
  }
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason)
    signal.addEventListener('abort', cancel, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel))
  })
}

function askWorker(worker: ServiceWorker, type: string, assets: string[], signal: AbortSignal, timeout?: number): Promise<ShellReply | null> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    let settled = false
    const finish = (reply: ShellReply | null, error?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      signal.removeEventListener('abort', cancel)
      channel.port1.close()
      channel.port2.close()
      if (error) reject(error)
      else resolve(reply)
    }
    const cancel = () => finish(null, signal.reason)
    const deadline = timeout === undefined ? undefined : setTimeout(() => finish(null), timeout)
    signal.addEventListener('abort', cancel, { once: true })
    channel.port1.onmessage = event => finish(event.data?.type === type
      ? { ready: event.data.ready === true, matches: event.data.matches === true }
      : null)
    channel.port1.onmessageerror = () => finish(null)
    try { worker.postMessage({ type, assets }, [channel.port2]) }
    catch { finish(null) }
  })
}

function waitForWorkerChange(registration: ServiceWorkerRegistration, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const workers = [registration.active, registration.waiting, registration.installing].filter((worker): worker is ServiceWorker => Boolean(worker))
    const finish = () => { cleanup(); resolve() }
    const cancel = () => { cleanup(); reject(signal.reason) }
    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      registration.removeEventListener('updatefound', finish)
      navigator.serviceWorker.removeEventListener('controllerchange', finish)
      workers.forEach(worker => worker.removeEventListener('statechange', finish))
    }
    // Also resample to cover a change between inspection and subscription.
    const timer = setTimeout(finish, 250)
    signal.addEventListener('abort', cancel, { once: true })
    registration.addEventListener('updatefound', finish)
    navigator.serviceWorker.addEventListener('controllerchange', finish)
    workers.forEach(worker => worker.addEventListener('statechange', finish))
  })
}

async function prepareWorker(worker: ServiceWorker, assets: string[], signal: AbortSignal, checked?: ShellReply | null, probeTimeout = WORKER_PROBE_TIMEOUT_MS) {
  const reply = checked === undefined ? await askWorker(worker, CHECK, assets, signal, probeTimeout) : checked
  if (!reply?.ready && !reply?.matches) return false
  return (await askWorker(worker, PREPARE, assets, signal))?.ready === true
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration, worker: ServiceWorker, signal: AbortSignal) {
  signal.throwIfAborted()
  // Activation alone is not enough: claim() must also reach this page.
  while (registration.active !== worker || worker.state !== 'activated' || navigator.serviceWorker.controller !== worker) {
    await waitForWorkerChange(registration, signal)
  }
}

async function recoverShell(registration: ServiceWorkerRegistration, assets: string[], signal: AbortSignal) {
  const initial = registration.active
  const checked = initial ? await askWorker(initial, CHECK, assets, signal, WORKER_PROBE_TIMEOUT_MS) : null
  if (initial && (checked?.ready || await prepareWorker(initial, assets, signal, checked)) && registration.active === initial) {
    await waitForActiveWorker(registration, initial, signal)
    return
  }

  // Old workers may not implement this protocol. Discover a matching update
  // without spending the entire recovery timeout waiting for that old worker.
  void registration.update().catch(() => {})
  // A short probe timeout can also mean a busy current worker. Try a waiting
  // update first, then give that same active worker one longer response window.
  const attempted = new Set(initial && checked !== null ? [initial] : [])
  while (true) {
    signal.throwIfAborted()
    for (const worker of [registration.waiting, registration.active]) {
      if (!worker || attempted.has(worker) || !['installed', 'activated'].includes(worker.state)) continue
      attempted.add(worker)
      if (!await prepareWorker(worker, assets, signal, undefined, worker === initial ? ACTIVE_RETRY_TIMEOUT_MS : WORKER_PROBE_TIMEOUT_MS)) continue
      if (registration.active !== worker) {
        if (!(await askWorker(worker, ACTIVATE, assets, signal))?.ready) continue
      }
      await waitForActiveWorker(registration, worker, signal)
      if ((await askWorker(worker, CHECK, assets, signal))?.ready) return
    }
    await waitForWorkerChange(registration, signal)
  }
}

/** Only an explicit download may repair or activate the matching installed reader. */
export async function ensureOfflineReaderShell(signal?: AbortSignal, options: { recover?: boolean } = {}): Promise<void> {
  signal?.throwIfAborted()
  // Capacitor ships the reader and its fonts inside the installed application.
  if (!import.meta.env.PROD || Capacitor.isNativePlatform()) return
  if (!('serviceWorker' in navigator) || typeof MessageChannel === 'undefined') throw new OfflineReaderShellError()

  const assets = [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
    'script[type="module"][src], link[rel="stylesheet"][href]',
  )].map(element => new URL(element instanceof HTMLScriptElement ? element.src : element.href))
    .filter(url => url.origin === window.location.origin)
    .map(url => url.pathname)
  if (!assets.length) throw new OfflineReaderShellError()

  const controller = new AbortController()
  const cancel = () => controller.abort(signal?.reason)
  const deadline = setTimeout(() => controller.abort(new OfflineReaderShellError()), options.recover ? SHELL_RECOVERY_TIMEOUT_MS : SHELL_CHECK_TIMEOUT_MS)
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    const registration = await abortable(navigator.serviceWorker.ready, controller.signal)
    if (options.recover) await recoverShell(registration, assets, controller.signal)
    else if (!registration.active || !(await askWorker(registration.active, CHECK, assets, controller.signal))?.ready) throw new OfflineReaderShellError()
    controller.signal.throwIfAborted()
  } finally {
    clearTimeout(deadline)
    signal?.removeEventListener('abort', cancel)
  }
}
