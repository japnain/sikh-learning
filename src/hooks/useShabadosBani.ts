import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { BaniFetchResult } from '../api/banidb'
import { fetchShabadosBani, isShabadosBaniReading } from '../api/shabados'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus } from '../types'
import { readDownloadedBani } from '../utils/baniDownloads'

const REQUEST_TIMEOUT_MS = 30_000

interface ReadingState {
  id: string
  attempt: number
  reading: BaniFetchResult | null
  loading: boolean
  issue: AsyncIssue | null
  isCached: boolean
}

/** The existing reader receives the same contract from either scripture provider. */
export function useShabadosBani(id: string | null, onBeforeReplace?: () => void) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ReadingState | null>(null)
  const currentState = id && state?.id === id ? state : null
  const stateRef = useRef(currentState)
  const beforeReplace = useRef(onBeforeReplace)
  useLayoutEffect(() => { stateRef.current = currentState }, [currentState])
  useLayoutEffect(() => { beforeReplace.current = onBeforeReplace }, [onBeforeReplace])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    let stopped = false
    let settled = false
    let cached: BaniFetchResult | null = null
    const finish = (reading: BaniFetchResult | null, issue: AsyncIssue | null, isCached: boolean) => {
      if (stopped || settled) return
      settled = true
      window.clearTimeout(deadline)
      if (reading && stateRef.current?.reading && reading !== stateRef.current.reading) beforeReplace.current?.()
      setState({ id, attempt, reading, issue, loading: false, isCached })
    }
    const retainedState = () => stateRef.current?.id === id && stateRef.current.reading ? stateRef.current : null
    const fail = (error: unknown) => {
      const retained = retainedState()
      finish(retained?.reading ?? cached, resolveAsyncIssue(error), retained?.isCached ?? Boolean(cached))
    }
    const deadline = window.setTimeout(() => {
      controller.abort()
      fail(new Error('The reading request timed out. Please try again.'))
    }, REQUEST_TIMEOUT_MS)
    setState(previous => ({ id, attempt, reading: previous?.id === id ? previous.reading : null, loading: true, issue: null, isCached: previous?.id === id && previous.isCached }))

    const load = async () => {
      try {
        const saved = await readDownloadedBani(`shabados:${id}`, null, value => isShabadosBaniReading(value, id)).catch(() => null)
        if (stopped || settled) return
        cached = isShabadosBaniReading(saved, id) ? saved : null
        if (cached) setState(previous => previous?.id === id && previous.reading
          ? { ...previous, attempt, loading: true, issue: null }
          : { id, attempt, reading: cached, loading: true, issue: null, isCached: true })
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const retained = retainedState()
          if (retained || cached) finish(retained?.reading ?? cached, null, retained?.isCached ?? true)
          else fail(new Error('This bani has not been downloaded for offline reading.'))
          return
        }
        const reading = await fetchShabadosBani(id, controller.signal)
        if (stopped || settled) return
        if (!isShabadosBaniReading(reading, id)) throw new Error('The requested reading could not be verified.')
        finish(reading, null, false)
      } catch (error) { fail(error) }
    }
    void load()
    return () => { stopped = true; controller.abort(); window.clearTimeout(deadline) }
  }, [id, attempt])

  const loading = Boolean(id && (!currentState || currentState.attempt !== attempt || currentState.loading))
  const reading = currentState?.reading
  const issue = currentState?.attempt === attempt ? currentState.issue : null
  const entries = reading?.entries ?? []
  const status: AsyncStatus = !id ? 'empty' : loading && entries.length === 0 ? 'loading' : issue ? 'degraded' : entries.length ? 'ready' : 'empty'
  const retry = useCallback(() => { if (id) setAttempt(value => value + 1) }, [id])
  return {
    entries, availableLengths: reading?.availableLengths ?? [], resolvedLength: reading?.resolvedLength ?? null,
    loading, refreshing: loading && entries.length > 0, issue, error: issue?.code ?? null,
    status, isCached: currentState?.isCached ?? false, retry,
  }
}
