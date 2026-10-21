import { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { ScriptureEntry } from '../types'
import { resolveAsyncIssue } from '../qa/async'
import { fetchAng } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { AsyncIssue, AsyncStatus } from '../types'

type BaniSource = 'G' | 'D' | 'B' | 'A'
const ANG_REQUEST_TIMEOUT_MS = 30_000

type AngRequest = {
  controller: AbortController
  deadline: number
  settled: boolean
}

type AngRequestState = {
  key: string
  entries: ScriptureEntry[]
  issue: AsyncIssue | null
}

type RefreshState = {
  key: string
  route: object
  status: AsyncStatus
  issue: AsyncIssue | null
}

export function useAng(ang: number, source: BaniSource) {
  const { getAng, hasCompleteAng, setAng } = useScriptureCacheStore()
  const cachedEntries = hasCompleteAng(source, ang) ? getAng(source, ang) ?? null : null
  const requestKey = `${source}:${ang}`
  const route = useMemo(() => ({ key: requestKey }), [requestKey])
  const [state, setState] = useState<AngRequestState | null>(null)
  const [refreshState, setRefreshState] = useState<RefreshState | null>(null)
  const currentState = state?.key === requestKey ? state : null
  const currentRefreshState = refreshState?.route === route ? refreshState : null
  const activeRequest = useRef<AngRequest | null>(null)
  const activeRoute = useRef(route)

  const cancelRequest = useCallback(() => {
    const request = activeRequest.current
    if (!request) return
    request.settled = true
    window.clearTimeout(request.deadline)
    request.controller.abort()
    activeRequest.current = null
  }, [])

  useLayoutEffect(() => {
    activeRoute.current = route
    return cancelRequest
  }, [cancelRequest, route])

  const startRequest = useCallback((refresh: boolean) => {
    if (activeRoute.current !== route) return
    cancelRequest()
    const request: AngRequest = {
      controller: new AbortController(),
      deadline: 0,
      settled: false,
    }
    activeRequest.current = request
    const isCurrent = () => activeRequest.current === request
      && !request.settled && activeRoute.current === route
    const fail = (error: unknown) => {
      if (!isCurrent()) return
      request.settled = true
      window.clearTimeout(request.deadline)
      const issue = resolveAsyncIssue(error)
      const cache = useScriptureCacheStore.getState()
      const fallback = cache.hasCompleteAng(source, ang) ? cache.getAng(source, ang) ?? [] : []
      setState(previous => ({
        key: requestKey,
        entries: previous?.key === requestKey
          ? previous.entries
          : fallback,
        issue,
      }))
      if (refresh) setRefreshState({ key: requestKey, route, status: 'degraded', issue })
    }
    request.deadline = window.setTimeout(() => {
      request.controller.abort()
      fail(new Error('The reading request timed out. Please try again.'))
    }, ANG_REQUEST_TIMEOUT_MS)
    fetchAng(ang, source, request.controller.signal)
      .then(data => {
        if (!isCurrent()) return
        request.settled = true
        window.clearTimeout(request.deadline)
        setState({
          key: requestKey,
          entries: data,
          issue: null,
        })
        if (refresh) setRefreshState({ key: requestKey, route, status: data.length ? 'ready' : 'empty', issue: null })
        try {
          setAng(source, ang, data)
        } catch { /* Optional cache persistence cannot turn valid scripture into a source error. */ }
      })
      .catch(fail)
  }, [ang, cancelRequest, requestKey, route, setAng, source])

  useEffect(() => {
    if (cachedEntries || currentState) return
    startRequest(false)
  }, [cachedEntries, currentState, startRequest])

  const refetch = useCallback(() => {
    if (activeRoute.current !== route) return
    setRefreshState({ key: requestKey, route, status: 'loading', issue: null })
    startRequest(true)
  }, [requestKey, route, startRequest])

  const issue = currentRefreshState?.issue ?? currentState?.issue ?? null
  const status = currentRefreshState?.status
    ?? (issue
      ? 'degraded'
      : cachedEntries
        ? 'ready'
        : currentState
          ? (currentState.entries.length === 0 ? 'empty' : 'ready')
          : 'loading')
  const entries = currentState && (currentState.entries.length > 0 || !currentState.issue)
    ? currentState.entries
    : cachedEntries ?? currentState?.entries ?? []

  return {
    entries,
    status,
    issue,
    loading: status === 'loading',
    error: issue?.code ?? null,
    refetch,
  }
}
