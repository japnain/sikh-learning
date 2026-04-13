import { useEffect, useMemo, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import type { AsyncIssue, AsyncStatus, MahanKoshEntry } from '../types'
import { fetchMahanKoshEntries } from '../api/mahankosh'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { normalizeLookupWord } from '../utils/wordLookup'

type MahanKoshRequestState = {
  key: string
  entries: MahanKoshEntry[]
  issue: AsyncIssue | null
}

export function useMahanKosh(word: string) {
  const normalizedWord = useMemo(() => normalizeLookupWord(word), [word])
  const { getMahanKosh, setMahanKosh } = useScriptureCacheStore()
  const cachedEntries = normalizedWord ? (getMahanKosh(normalizedWord) ?? null) : null
  const [state, setState] = useState<MahanKoshRequestState | null>(null)
  const requestKey = normalizedWord || null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!requestKey || cachedEntries || currentState) return

    let cancelled = false

    fetchMahanKoshEntries(requestKey)
      .then(result => {
        if (cancelled) return
        setMahanKosh(requestKey, result)
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
  }, [cachedEntries, currentState, requestKey, setMahanKosh])

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
