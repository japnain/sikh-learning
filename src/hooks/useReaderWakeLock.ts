import { useCallback, useEffect, useState } from 'react'

export const READER_WAKE_LOCK_PREFERENCE_KEY = 'naamras-reader-keep-awake'

function readPreference(): boolean {
  try { return localStorage.getItem(READER_WAKE_LOCK_PREFERENCE_KEY) === 'true' } catch { return false }
}

/** A reading-only preference; browser/OS policy can still release or deny the lock. */
export function useReaderWakeLock(readingActive = true) {
  const [enabled, setPreference] = useState(readPreference)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<'unavailable' | null>(null)
  const supported = typeof navigator !== 'undefined' && typeof navigator.wakeLock?.request === 'function'

  const setEnabled = useCallback((next: boolean) => {
    setPreference(next)
    try { localStorage.setItem(READER_WAKE_LOCK_PREFERENCE_KEY, String(next)) } catch {
      // Session use remains available when preference storage is blocked.
    }
  }, [])

  useEffect(() => {
    let disposed = false
    let generation = 0
    let pending = false
    let held: WakeLockSentinel | null = null
    let pageActive = true

    const release = () => {
      generation += 1
      pending = false
      const previous = held
      held = null
      if (!disposed) setActive(false)
      if (previous && !previous.released) void previous.release().catch(() => {})
    }

    const acquire = async () => {
      if (disposed || !enabled || !supported || !readingActive || !pageActive
        || document.visibilityState !== 'visible' || held || pending) return
      const requestGeneration = ++generation
      pending = true
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (disposed || requestGeneration !== generation || !pageActive || document.visibilityState !== 'visible') {
          if (!sentinel.released) void sentinel.release().catch(() => {})
          return
        }
        pending = false
        held = sentinel.released ? null : sentinel
        setActive(Boolean(held))
        setError(null)
        sentinel.addEventListener('release', () => {
          if (disposed || held !== sentinel) return
          held = null
          setActive(false)
          // Respect an OS release; retry on the next visible/pageshow transition.
        }, { once: true })
      } catch {
        if (disposed || requestGeneration !== generation) return
        pending = false
        setActive(false)
        setError('unavailable')
      }
    }

    const visibilityChanged = () => {
      if (document.visibilityState === 'visible') void acquire()
      else release()
    }
    const pageHidden = () => { pageActive = false; release() }
    const pageShown = () => { pageActive = true; void acquire() }
    setActive(false)
    setError(null)
    void acquire()
    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener('pagehide', pageHidden)
    window.addEventListener('pageshow', pageShown)

    return () => {
      disposed = true
      release()
      document.removeEventListener('visibilitychange', visibilityChanged)
      window.removeEventListener('pagehide', pageHidden)
      window.removeEventListener('pageshow', pageShown)
    }
  }, [enabled, supported, readingActive])

  return { enabled, setEnabled, supported, active: active && enabled && readingActive, error }
}
