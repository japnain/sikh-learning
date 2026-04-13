import { useEffect, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, ScriptureEntry } from '../types'
import { fetchShabad } from '../api/banidb'

type ShabadRequestState = {
  key: string
  entries: ScriptureEntry[]
  issue: AsyncIssue | null
}

export function useShabad(shabadId: number | null) {
  const [state, setState] = useState<ShabadRequestState | null>(null)
  const requestKey = shabadId ? String(shabadId) : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!shabadId || !requestKey || currentState) return

    let cancelled = false

    fetchShabad(shabadId)
      .then(data => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: data ? [data] : [],
          issue: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: [],
          issue: resolveAsyncIssue(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [currentState, requestKey, shabadId])

  const issue = currentState?.issue ?? null
  const status: AsyncStatus = requestKey === null
    ? 'empty'
    : issue
      ? 'degraded'
      : currentState
        ? (currentState.entries.length === 0 ? 'empty' : 'ready')
        : 'loading'

  return {
    entries: currentState?.entries ?? [],
    status,
    issue,
    loading: status === 'loading',
    error: issue?.code ?? null,
  }
}
