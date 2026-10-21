import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchKoshEntries } from '../api/banidb'
import { resolveAsyncIssue } from '../qa/async'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { AsyncIssue, AsyncStatus, BanidbKoshDefinition } from '../types'
import { normalizeLookupWord } from '../utils/wordLookup'

type BanidbKoshRequestState = {
  key: string
  requestKey: string
  entries: BanidbKoshDefinition[]
  issue: AsyncIssue | null
}

export function useBanidbKosh(word: string) {
  const normalizedWord = useMemo(() => normalizeLookupWord(word), [word])
  const { getBanidbKosh, setBanidbKosh } = useScriptureCacheStore()
  const cachedEntries = normalizedWord ? (getBanidbKosh(normalizedWord) ?? null) : null
  const [state, setState] = useState<BanidbKoshRequestState | null>(null)
  const [retryState, setRetryState] = useState({ word: '', revision: 0 })
  const requestKey = normalizedWord || null
  const revision = retryState.word === requestKey ? retryState.revision : 0
  const operationKey = requestKey ? `${requestKey}:${revision}` : null
  const currentState = operationKey && state?.key === operationKey ? state : null
  const previousState = requestKey && state?.requestKey === requestKey ? state : null

  useEffect(() => {
    if (!requestKey || !operationKey || (revision === 0 && cachedEntries) || currentState) return

    let cancelled = false

    fetchKoshEntries(requestKey)
      .then(result => {
        if (cancelled) return
        setState({
          key: operationKey,
          requestKey,
          entries: result,
          issue: null,
        })
        try { setBanidbKosh(requestKey, result) } catch { /* Keep the successful lookup available in memory if storage is full. */ }
      })
      .catch(error => {
        if (cancelled) return
        setState(previous => ({
          key: operationKey,
          requestKey,
          entries: cachedEntries ?? (previous?.requestKey === requestKey ? previous.entries : []),
          issue: resolveAsyncIssue(error),
        }))
      })

    return () => {
      cancelled = true
    }
  }, [cachedEntries, currentState, operationKey, requestKey, revision, setBanidbKosh])

  const issue = currentState?.issue ?? null
  const entries = cachedEntries ?? previousState?.entries ?? []
  const loading = Boolean(requestKey && !currentState && !(revision === 0 && cachedEntries))
  const status: AsyncStatus = !requestKey
    ? 'empty'
    : issue
      ? 'degraded'
      : loading && entries.length === 0
        ? 'loading'
        : entries.length > 0 ? 'ready' : 'empty'

  const retry = useCallback(() => {
    if (!requestKey) return
    setRetryState(previous => ({ word: requestKey, revision: previous.word === requestKey ? previous.revision + 1 : 1 }))
  }, [requestKey])

  return {
    entries,
    status,
    issue,
    loading,
    refreshing: loading && entries.length > 0,
    error: issue?.code ?? null,
    normalizedWord,
    retry,
  }
}
