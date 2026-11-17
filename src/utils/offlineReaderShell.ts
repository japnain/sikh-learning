import { Capacitor } from '@capacitor/core'

const SHELL_CHECK_TIMEOUT_MS = 30_000
const SHELL_CHECK_MESSAGE = 'NAAMRAS_CHECK_OFFLINE_READER'

export class OfflineReaderShellError extends Error {
  constructor() {
    super('Naamras is still preparing offline reading. Reconnect, close other Naamras tabs, reopen the app, and try again.')
    this.name = 'OfflineReaderShellError'
  }
}

/** A saved reading is useful after reopening only when its matching reader is installed. */
export async function ensureOfflineReaderShell(signal?: AbortSignal): Promise<void> {
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

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let channel: MessageChannel | undefined
    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      signal?.removeEventListener('abort', cancel)
      channel?.port1.close()
      channel?.port2.close()
      if (error) reject(error)
      else resolve()
    }
    const cancel = () => finish(signal?.reason ?? new DOMException('Download cancelled.', 'AbortError'))
    const deadline = setTimeout(() => finish(new OfflineReaderShellError()), SHELL_CHECK_TIMEOUT_MS)
    signal?.addEventListener('abort', cancel, { once: true })

    void navigator.serviceWorker.ready.then(registration => {
      if (settled) return
      if (!registration.active) return finish(new OfflineReaderShellError())
      channel = new MessageChannel()
      channel.port1.onmessage = event => {
        const ready = event.data?.type === SHELL_CHECK_MESSAGE && event.data?.ready === true
        finish(ready ? undefined : new OfflineReaderShellError())
      }
      channel.port1.onmessageerror = () => finish(new OfflineReaderShellError())
      // Query the active worker: a waiting update cannot yet reopen this app offline.
      registration.active.postMessage({ type: SHELL_CHECK_MESSAGE, assets }, [channel.port2])
    }).catch(() => finish(new OfflineReaderShellError()))
  })
}
