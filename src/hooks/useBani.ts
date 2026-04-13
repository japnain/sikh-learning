import { useState, useEffect } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, ScriptureEntry, SundarGutkaLength } from '../types'
import { fetchBani } from '../api/banidb'

type BaniRequestState = {
  key: string
  entries: ScriptureEntry[]
  availableLengths: SundarGutkaLength[]
  resolvedLength: SundarGutkaLength | null
  issue: AsyncIssue | null
}

export function useBani(baniDbId: number | null, sgLength?: SundarGutkaLength | null) {
  const [state, setState] = useState<BaniRequestState | null>(null)
  const requestKey = baniDbId ? `${baniDbId}:${sgLength ?? 'default'}` : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!baniDbId || !requestKey || currentState) return

    let cancelled = false
    fetchBani(baniDbId, sgLength)
      .then(data => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: data.entries,
          availableLengths: data.availableLengths,
          resolvedLength: data.resolvedLength,
          issue: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: [],
          availableLengths: [],
          resolvedLength: null,
          issue: resolveAsyncIssue(error),
        })
      })

    return () => { cancelled = true }
  }, [baniDbId, currentState, requestKey, sgLength])

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
    availableLengths: currentState?.availableLengths ?? [],
    resolvedLength: currentState?.resolvedLength ?? null,
    status,
    issue,
    loading: status === 'loading',
    error: issue?.code ?? null,
  }
}
