import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, ScriptureEntry, SundarGutkaLength } from '../types'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { readBaniOfflineCache, writeBaniOfflineCache } from '../utils/baniOfflineCache'
import { isExactBaniReading } from '../utils/baniReadingValidation'

const BANI_REQUEST_TIMEOUT_MS = 30_000

type BaniRequestState = {
  key: string
  requestKey: string
  entries: ScriptureEntry[]
  availableLengths: SundarGutkaLength[]
  resolvedLength: SundarGutkaLength | null
  issue: AsyncIssue | null
  isCached: boolean
}

export function useBani(
  baniDbId: number | null,
  sgLength?: SundarGutkaLength | null,
  onBeforeReplace?: () => void,
  preparedReading?: BaniFetchResult | null,
) {
  const [state, setState] = useState<BaniRequestState | null>(null)
  const renderedState = useRef<BaniRequestState | null>(null)
  const beforeReplace = useRef(onBeforeReplace)
  useLayoutEffect(() => { renderedState.current = state }, [state])
  useLayoutEffect(() => { beforeReplace.current = onBeforeReplace }, [onBeforeReplace])
  const [attempt, setAttempt] = useState(0)
  const requestKey = baniDbId ? `${baniDbId}:${sgLength ?? 'default'}` : null
  const operationKey = requestKey ? `${requestKey}:${attempt}` : null
  const currentState = operationKey && state?.key === operationKey ? state : null
  const previousState = requestKey && state?.requestKey === requestKey ? state : null
  const prepared = isExactBaniReading(preparedReading, baniDbId ?? 0, sgLength) ? preparedReading : null
  const displayState = currentState ?? previousState ?? (prepared ? { ...prepared, isCached: false } : null)

  useEffect(() => {
    if (!baniDbId || !requestKey || !operationKey) return

    let cancelled = false
    let settled = false
    let cached: BaniFetchResult | null = null
    const controller = new AbortController()
    const fail = (error: unknown) => {
      if (cancelled || settled) return
      settled = true
      window.clearTimeout(deadline)
      setState(previous => ({
        key: operationKey,
        requestKey,
        entries: previous?.requestKey === requestKey ? previous.entries : cached?.entries ?? [],
        availableLengths: previous?.requestKey === requestKey ? previous.availableLengths : cached?.availableLengths ?? [],
        resolvedLength: previous?.requestKey === requestKey ? previous.resolvedLength : cached?.resolvedLength ?? null,
        issue: resolveAsyncIssue(error),
        isCached: previous?.requestKey === requestKey ? previous.isCached : Boolean(cached) && !prepared,
      }))
    }
    const deadline = window.setTimeout(() => {
      controller.abort()
      fail(new Error('The reading request timed out. Please try again.'))
    }, BANI_REQUEST_TIMEOUT_MS)

    const load = async () => {
      const candidate = prepared ?? await readBaniOfflineCache(baniDbId, sgLength).catch(() => null)
      if (cancelled || settled) return
      const cachedReading = prepared ?? (isExactBaniReading(candidate, baniDbId, sgLength) ? candidate : null)
      cached = cachedReading

      if (cachedReading) {
        setState(previous => previous?.requestKey === requestKey && previous.entries.length > 0 ? {
          ...previous,
          key: operationKey,
          issue: null,
        } : {
          key: operationKey,
          requestKey,
          entries: cachedReading.entries,
          availableLengths: cachedReading.availableLengths,
          resolvedLength: cachedReading.resolvedLength,
          issue: null,
          isCached: !prepared,
        })
      }

      try {
        const data = await fetchBani(baniDbId, sgLength, controller.signal)
        if (cancelled || settled) return
        if (!isExactBaniReading(data, baniDbId, sgLength)) {
          throw new Error('The requested bani or length is unavailable. Please try again.')
        }
        const previous = renderedState.current
        if (previous?.requestKey === requestKey && previous.entries.length > 0 && previous.entries !== data.entries) {
          beforeReplace.current?.()
        }
        settled = true
        window.clearTimeout(deadline)
        setState({
          key: operationKey,
          requestKey,
          entries: data.entries,
          availableLengths: data.availableLengths,
          resolvedLength: data.resolvedLength,
          issue: null,
          isCached: false,
        })
        void writeBaniOfflineCache(baniDbId, sgLength, data).catch(() => {
          // A cache write failure must not turn successfully loaded scripture into a reading error.
        })
      } catch (error) {
        fail(error)
      }
    }

    void load()

    return () => {
      cancelled = true
      window.clearTimeout(deadline)
      controller.abort()
    }
  }, [baniDbId, operationKey, prepared, requestKey, sgLength])

  const issue = currentState?.issue ?? null
  const entries = displayState?.entries ?? []
  const loading = requestKey !== null && currentState === null
  const status: AsyncStatus = requestKey === null
    ? 'empty'
    : loading && entries.length === 0
      ? 'loading'
      : issue
      ? 'degraded'
      : entries.length > 0
        ? 'ready'
        : 'empty'

  const retry = useCallback(() => {
    if (!baniDbId) return
    setAttempt(current => current + 1)
  }, [baniDbId])

  return {
    entries,
    availableLengths: displayState?.availableLengths ?? [],
    resolvedLength: displayState?.resolvedLength ?? null,
    status,
    issue,
    loading,
    refreshing: loading && entries.length > 0,
    error: issue?.code ?? null,
    isCached: displayState?.isCached ?? false,
    retry,
  }
}
