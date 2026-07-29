import { useEffect } from 'react'
import { fetchBani } from '../api/banidb'
import { getNitnemOption, useNitemStore } from '../store/nitnem'
import { resolveStudyRouteSgLength } from '../utils/baniRouteResolver'
import { readBaniOfflineCache, writeBaniOfflineCache } from '../utils/baniOfflineCache'

/**
 * Silently caches the exact reader payload for the user's selected Nitnem banis.
 * Work is deferred and sequential so startup and metered connections stay responsive.
 */
export function useNitemOfflineCache() {
  const selectedIds = useNitemStore(state => state.selectedIds)

  useEffect(() => {
    if (typeof window === 'undefined' || navigator.onLine === false) return

    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean }
    }).connection
    if (connection?.saveData) return

    let cancelled = false
    let fallbackTimeout: number | null = null
    let idleCallback: number | null = null
    const controller = new AbortController()

    const cacheSelectedReadings = async () => {
      const seen = new Set<string>()

      for (const selectedId of selectedIds) {
        if (cancelled) return
        const option = getNitnemOption(selectedId)
        if (!option?.baniDbId) continue
        const sgLength = resolveStudyRouteSgLength({
          baniId: option.baseBaniId,
          baniDbId: option.baniDbId,
        })
        const cacheKey = `${option.baniDbId}:${sgLength ?? 'default'}`
        if (seen.has(cacheKey)) continue
        seen.add(cacheKey)

        try {
          const cached = await readBaniOfflineCache(option.baniDbId, sgLength)
          if (cached || cancelled) continue
          const data = await fetchBani(option.baniDbId, sgLength, controller.signal)
          if (!cancelled) {
            await writeBaniOfflineCache(option.baniDbId, sgLength, data)
          }
        } catch {
          // Offline preparation is best-effort and must never block the app shell.
        }
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      idleCallback = window.requestIdleCallback(() => {
        void cacheSelectedReadings()
      }, { timeout: 1500 })
    } else {
      fallbackTimeout = window.setTimeout(() => {
        void cacheSelectedReadings()
      }, 700)
    }

    return () => {
      cancelled = true
      controller.abort()
      if (idleCallback !== null) window.cancelIdleCallback(idleCallback)
      if (fallbackTimeout !== null) window.clearTimeout(fallbackTimeout)
    }
  }, [selectedIds])
}
