import { useCallback, useEffect, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, ScriptureEntry } from '../types'
import { fetchShabad } from '../api/banidb'

const SHABAD_REQUEST_TIMEOUT_MS = 30_000

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
    let settled = false
    const controller = new AbortController()
    const fail = (error: unknown) => {
      if (cancelled || settled) return
      settled = true
      window.clearTimeout(deadline)
      setState(previous => ({
        key: operationKey,
        requestKey,
        entries: previous?.requestKey === requestKey ? previous.entries : [],
        issue: resolveAsyncIssue(error),
      }))
    }
    const deadline = window.setTimeout(() => {
      controller.abort()
      fail(new Error('The reading request timed out. Please try again.'))
    }, SHABAD_REQUEST_TIMEOUT_MS)

    fetchShabad(shabadId, controller.signal)
      .then(data => {
        if (cancelled || settled) return
        settled = true
        window.clearTimeout(deadline)
        setState({
          key: operationKey,
          requestKey,
          entries: data ? [data] : [],
          issue: null,
        })
      })
      .catch(fail)

    return () => {
      cancelled = true
      window.clearTimeout(deadline)
      controller.abort()
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
