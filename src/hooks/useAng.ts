import { useState, useEffect } from 'react'
import type { ScriptureEntry } from '../types'
import { resolveAsyncIssue } from '../qa/async'
import { fetchAng } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { AsyncIssue, AsyncStatus } from '../types'

type BaniSource = 'G' | 'D' | 'B' | 'A'

type AngRequestState = {
  key: string
  entries: ScriptureEntry[]
  issue: AsyncIssue | null
}

type RefreshState = {
  key: string
  status: AsyncStatus
  issue: AsyncIssue | null
}

export function useAng(ang: number, source: BaniSource) {
  const { getAng, setAng } = useScriptureCacheStore()
  const cachedEntries = getAng(source, ang) ?? null
  const requestKey = `${source}:${ang}`
  const [state, setState] = useState<AngRequestState | null>(null)
  const [refreshState, setRefreshState] = useState<RefreshState | null>(null)
  const currentState = state?.key === requestKey ? state : null
  const currentRefreshState = refreshState?.key === requestKey ? refreshState : null

  useEffect(() => {
    if (cachedEntries || currentState) return

    let cancelled = false
    fetchAng(ang, source)
      .then(data => {
        if (cancelled) return
        setAng(source, ang, data)
        setState({
          key: requestKey,
          entries: data,
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

    return () => { cancelled = true }
  }, [ang, cachedEntries, currentState, requestKey, setAng, source])

  const refetch = () => {
    setRefreshState({
      key: requestKey,
      status: 'loading',
      issue: null,
    })

    fetchAng(ang, source)
      .then(data => {
        setAng(source, ang, data)
        setState({
          key: requestKey,
          entries: data,
          issue: null,
        })
        setRefreshState({
          key: requestKey,
          status: 'ready',
          issue: null,
        })
      })
      .catch(error => {
        setRefreshState({
          key: requestKey,
          status: 'degraded',
          issue: resolveAsyncIssue(error),
        })
      })
  }

  const issue = currentRefreshState?.issue ?? currentState?.issue ?? null
  const status = currentRefreshState?.status
    ?? (issue
      ? 'degraded'
      : cachedEntries
        ? 'ready'
        : currentState
          ? (currentState.entries.length === 0 ? 'empty' : 'ready')
          : 'loading')

  return {
    entries: cachedEntries ?? currentState?.entries ?? [],
    status,
    issue,
    loading: status === 'loading',
    error: issue?.code ?? null,
    refetch,
  }
}
