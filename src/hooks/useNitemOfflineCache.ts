import { useEffect, useState } from 'react'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { getNitnemOption, useNitemStore } from '../store/nitnem'
import { useNitnemOfflineStatusStore } from '../store/nitnemOffline'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { resolveStudyRouteSgLength } from '../utils/baniRouteResolver'
import { readBaniOfflineCache, setProtectedBaniOfflineReadings, writeBaniOfflineCache, type BaniOfflineReading } from '../utils/baniOfflineCache'

const PREPARATION_TIMEOUT_MS = 30_000

function isReady(data: BaniFetchResult | null, reading: BaniOfflineReading) {
  return Boolean(data?.entries.length && (!reading.sgLength || data.resolvedLength === reading.sgLength))
}

function fetchForPreparation(reading: BaniOfflineReading, effectSignal: AbortSignal): Promise<BaniFetchResult> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    let settled = false
    const finish = (complete: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(deadline)
      effectSignal.removeEventListener('abort', cancel)
      complete()
    }
    const cancel = () => {
      controller.abort()
      finish(() => reject(new DOMException('Offline preparation cancelled.', 'AbortError')))
    }
    const deadline = window.setTimeout(() => {
      controller.abort()
      finish(() => reject(new Error('Offline preparation timed out.')))
    }, PREPARATION_TIMEOUT_MS)
    effectSignal.addEventListener('abort', cancel, { once: true })
    if (effectSignal.aborted) { cancel(); return }
    fetchBani(reading.baniDbId, reading.sgLength, controller.signal)
      .then(data => finish(() => resolve(data)), error => finish(() => reject(error)))
  })
}

/** Verify saved exact readings; defer sequential downloads so reading and startup stay responsive. */
export function useNitemOfflineCache() {
  const selectedIds = useNitemStore(state => state.selectedIds)
  const lengths = useSundarGutkaLengthStore(state => state.lengths)
  const retryRevision = useNitnemOfflineStatusStore(state => state.retryRevision)
  const [connectionRevision, setConnectionRevision] = useState(0)

  useEffect(() => {
    const changed = () => setConnectionRevision(value => value + 1)
    window.addEventListener('online', changed)
    window.addEventListener('offline', changed)
    return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed) }
  }, [])

  useEffect(() => {
    const readings: BaniOfflineReading[] = []
    const seen = new Set<string>()
    for (const id of selectedIds) {
      const option = getNitnemOption(id)
      if (!option?.baniDbId) continue
      const sgLength = resolveStudyRouteSgLength({ baniId: option.baseBaniId, baniDbId: option.baniDbId })
      const key = `${option.baniDbId}:${sgLength ?? 'default'}`
      if (!seen.has(key)) { seen.add(key); readings.push({ baniDbId: option.baniDbId, sgLength }) }
    }
    setProtectedBaniOfflineReadings(readings)
    const signature = [...seen].sort().join('|')
    useNitnemOfflineStatusStore.setState({ ready: 0, total: readings.length, signature, status: 'checking' })
    let cancelled = false
    let timeoutId: number | null = null
    let idleId: number | null = null
    const controller = new AbortController()
    const publish = (ready: number, status: ReturnType<typeof useNitnemOfflineStatusStore.getState>['status']) => {
      if (!cancelled) useNitnemOfflineStatusStore.setState({ ready, total: readings.length, signature, status })
    }

    const verifyAndPrepare = async () => {
      const missing: BaniOfflineReading[] = []
      let ready = 0
      for (const reading of readings) {
        const cached = await readBaniOfflineCache(reading.baniDbId, reading.sgLength).catch(() => null)
        if (cancelled) return
        if (isReady(cached, reading)) ready += 1
        else missing.push(reading)
      }
      if (!missing.length) { publish(ready, 'ready'); return }
      if (navigator.onLine === false) { publish(ready, 'offline'); return }
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      if (connection?.saveData && retryRevision === 0) { publish(ready, 'paused'); return }
      publish(ready, 'preparing')

      const prepare = async () => {
        for (const reading of missing) {
          if (cancelled) return
          try {
            // A visible reader may have filled the cache since the initial check.
            let cached = await readBaniOfflineCache(reading.baniDbId, reading.sgLength)
            if (!isReady(cached, reading)) {
              const data = await fetchForPreparation(reading, controller.signal)
              if (cancelled) return
              if (!isReady(data, reading)) continue
              await writeBaniOfflineCache(reading.baniDbId, reading.sgLength, data)
              cached = await readBaniOfflineCache(reading.baniDbId, reading.sgLength)
            }
            if (cancelled) return
            // Only read-back verification establishes durable offline readiness.
            if (isReady(cached, reading)) { ready += 1; publish(ready, 'preparing') }
          } catch { /* Retain verified readings and expose retry without blocking Save. */ }
        }
        publish(ready, ready === readings.length ? 'ready' : navigator.onLine === false ? 'offline' : ready > 0 ? 'partial' : 'error')
      }
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => { void prepare() }, { timeout: 1500 })
      } else timeoutId = window.setTimeout(() => { void prepare() }, 700)
    }
    void verifyAndPrepare()

    return () => {
      cancelled = true
      controller.abort()
      if (idleId !== null) window.cancelIdleCallback(idleId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [selectedIds, lengths, retryRevision, connectionRevision])
}
