import { useState, useEffect } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'
import type { AsyncIssue, AsyncStatus } from '../types'

type HukamnamaRequestState = {
  key: string
  data: HukamnamaResult | null
  issue: AsyncIssue | null
}

export function useHukamnama(date?: string | null, enabled: boolean = true) {
  const [state, setState] = useState<HukamnamaRequestState | null>(null)
  const requestKey = enabled ? (date ?? 'today') : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!enabled || !requestKey || currentState) return

    let cancelled = false
    fetchHukamnama(date ?? undefined)
      .then(data => {
        if (cancelled) return
        setState({
          key: requestKey,
          data,
          issue: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: requestKey,
          data: null,
          issue: resolveAsyncIssue(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [currentState, date, enabled, requestKey])

  const issue = currentState?.issue ?? null
  const status: AsyncStatus = requestKey === null
    ? 'empty'
    : issue
      ? 'degraded'
      : currentState?.data
        ? 'ready'
        : 'loading'

  return {
    data: currentState?.data ?? null,
    status,
    issue,
    loading: status === 'loading',
    error: issue?.code ?? null,
  }
}
