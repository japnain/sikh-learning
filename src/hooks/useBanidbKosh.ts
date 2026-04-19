import { useEffect, useMemo, useState } from 'react'
import { fetchKoshEntries } from '../api/banidb'
import { resolveAsyncIssue } from '../qa/async'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { AsyncIssue, AsyncStatus, BanidbKoshDefinition } from '../types'
import { normalizeLookupWord } from '../utils/wordLookup'

type BanidbKoshRequestState = {
  key: string
  entries: BanidbKoshDefinition[]
  issue: AsyncIssue | null
}

export function useBanidbKosh(word: string) {
  const normalizedWord = useMemo(() => normalizeLookupWord(word), [word])
  const { getBanidbKosh, setBanidbKosh } = useScriptureCacheStore()
  const cachedEntries = normalizedWord ? (getBanidbKosh(normalizedWord) ?? null) : null
  const [state, setState] = useState<BanidbKoshRequestState | null>(null)
  const requestKey = normalizedWord || null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!requestKey || cachedEntries || currentState) return

    let cancelled = false

    fetchKoshEntries(requestKey)
      .then(result => {
        if (cancelled) return
        setBanidbKosh(requestKey, result)
        setState({
          key: requestKey,
          entries: result,
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
  }, [cachedEntries, currentState, requestKey, setBanidbKosh])

  const issue = currentState?.issue ?? null
  const status: AsyncStatus = !requestKey
    ? 'empty'
    : issue
      ? 'degraded'
      : cachedEntries
        ? (cachedEntries.length === 0 ? 'empty' : 'ready')
        : currentState
          ? (currentState.entries.length === 0 ? 'empty' : 'ready')
          : 'loading'

  return {
    entries: cachedEntries ?? currentState?.entries ?? [],
    status,
    issue,
    loading: status === 'loading',
    error: issue?.code ?? null,
    normalizedWord,
  }
}
