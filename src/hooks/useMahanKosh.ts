import { useEffect, useMemo, useState } from 'react'
import type { MahanKoshEntry } from '../types'
import { fetchMahanKoshEntries } from '../api/mahankosh'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { normalizeLookupWord } from '../utils/wordLookup'

type MahanKoshRequestState = {
  key: string
  entries: MahanKoshEntry[]
  error: string | null
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
          error: null,
        })
      })
      .catch(() => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: [],
          error: 'Unable to load Mahankosh right now.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [cachedEntries, currentState, requestKey, setMahanKosh])

  return {
    entries: cachedEntries ?? currentState?.entries ?? [],
    loading: Boolean(requestKey) && !cachedEntries && currentState === null,
    error: currentState?.error ?? null,
    normalizedWord,
  }
}
