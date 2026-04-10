import { useState, useEffect } from 'react'
import type { Word } from '../types'
import { fetchShabadWords } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

type WordRequestState = {
  key: string
  words: Word[]
}

export function useWordData(shabadId: number | null) {
  const { getWords, setWords } = useScriptureCacheStore()
  const cachedWords = shabadId !== null ? (getWords(shabadId) ?? null) : null
  const [state, setState] = useState<WordRequestState | null>(null)
  const requestKey = shabadId !== null ? String(shabadId) : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (shabadId === null || !requestKey || cachedWords || currentState) return

    let cancelled = false
    fetchShabadWords(shabadId)
      .then(data => {
        if (cancelled) return
        setWords(shabadId, data)
        setState({
          key: requestKey,
          words: data,
        })
      })
      .catch(() => {
        if (cancelled) return
        setState({
          key: requestKey,
          words: [],
        })
      })

    return () => { cancelled = true }
  }, [cachedWords, currentState, requestKey, setWords, shabadId])

  return {
    words: shabadId === null ? null : (cachedWords ?? currentState?.words ?? null),
    loading: requestKey !== null && !cachedWords && currentState === null,
  }
}
