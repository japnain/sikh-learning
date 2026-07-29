import { useCallback, useEffect, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, ScriptureEntry } from '../types'
import { fetchShabad } from '../api/banidb'

type ShabadRequestState = {
  key: string
  requestKey: string
  entries: ScriptureEntry[]
  issue: AsyncIssue | null
}

export function useShabad(shabadId: number | null) {
  const [state, setState] = useState<ShabadRequestState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = shabadId ? String(shabadId) : null
  const operationKey = requestKey ? `${requestKey}:${attempt}` : null
  const currentState = operationKey && state?.key === operationKey ? state : null
  const previousState = requestKey && state?.requestKey === requestKey ? state : null
  const displayState = currentState ?? previousState

  useEffect(() => {
    if (!shabadId || !requestKey || !operationKey) return

    let cancelled = false

    fetchShabad(shabadId)
      .then(data => {
        if (cancelled) return
        setState({
          key: operationKey,
          requestKey,
          entries: data ? [data] : [],
          issue: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: operationKey,
          requestKey,
          entries: [],
          issue: resolveAsyncIssue(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [operationKey, requestKey, shabadId])

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
    if (!shabadId) return
    setAttempt(current => current + 1)
  }, [shabadId])

  return {
    entries,
    status,
    issue,
    loading,
    error: issue?.code ?? null,
    retry,
  }
}
