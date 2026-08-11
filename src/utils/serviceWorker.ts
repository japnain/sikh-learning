import { normalizeBasePath, resolveAppPath } from './basePath'

export const SERVICE_WORKER_UPDATE_READY_EVENT = 'naamras:service-worker-update-ready'

let registrationStarted = false

function announceWaitingWorker(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return

  window.dispatchEvent(new CustomEvent(SERVICE_WORKER_UPDATE_READY_EVENT))
}

export function registerNaamRasServiceWorker() {
  if (!import.meta.env.PROD || registrationStarted || !('serviceWorker' in navigator)) return
  registrationStarted = true

  window.addEventListener('load', async () => {
    const basePath = normalizeBasePath(import.meta.env.BASE_URL)

    try {
      const registration = await navigator.serviceWorker.register(
        resolveAppPath('sw.js', basePath),
        { scope: basePath, updateViaCache: 'none' },
      )

      announceWaitingWorker(registration)

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing
        if (!installingWorker) return

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state !== 'installed' || !navigator.serviceWorker.controller) return
          announceWaitingWorker(registration)
        })
      })
    } catch (error) {
      if (import.meta.env.DEV) console.warn('NaamRas service worker registration failed:', error)
    }
  }, { once: true })
}
