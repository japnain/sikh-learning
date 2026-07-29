import { useCallback, useEffect, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, ScriptureEntry, SundarGutkaLength } from '../types'
import { fetchBani } from '../api/banidb'
import { readBaniOfflineCache, writeBaniOfflineCache } from '../utils/baniOfflineCache'

type BaniRequestState = {
  key: string
  requestKey: string
  entries: ScriptureEntry[]
  availableLengths: SundarGutkaLength[]
  resolvedLength: SundarGutkaLength | null
  issue: AsyncIssue | null
  isCached: boolean
}

export function useBani(baniDbId: number | null, sgLength?: SundarGutkaLength | null) {
  const [state, setState] = useState<BaniRequestState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = baniDbId ? `${baniDbId}:${sgLength ?? 'default'}` : null
  const operationKey = requestKey ? `${requestKey}:${attempt}` : null
  const currentState = operationKey && state?.key === operationKey ? state : null
  const previousState = requestKey && state?.requestKey === requestKey ? state : null
  const displayState = currentState ?? previousState

  useEffect(() => {
    if (!baniDbId || !requestKey || !operationKey) return

    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      const cached = await readBaniOfflineCache(baniDbId, sgLength)
      if (cancelled) return

      if (cached) {
        setState({
          key: operationKey,
          requestKey,
          entries: cached.entries,
          availableLengths: cached.availableLengths,
          resolvedLength: cached.resolvedLength,
          issue: null,
          isCached: true,
        })
      }

      try {
        const data = await fetchBani(baniDbId, sgLength, controller.signal)
        if (cancelled) return
        setState({
          key: operationKey,
          requestKey,
          entries: data.entries,
          availableLengths: data.availableLengths,
          resolvedLength: data.resolvedLength,
          issue: null,
          isCached: false,
        })
        void writeBaniOfflineCache(baniDbId, sgLength, data)
      } catch (error) {
        if (cancelled) return
        setState({
          key: operationKey,
          requestKey,
          entries: cached?.entries ?? [],
          availableLengths: cached?.availableLengths ?? [],
          resolvedLength: cached?.resolvedLength ?? null,
          issue: resolveAsyncIssue(error),
          isCached: Boolean(cached),
        })
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [baniDbId, operationKey, requestKey, sgLength])

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
