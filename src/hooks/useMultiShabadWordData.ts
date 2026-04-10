import { useState, useEffect, useMemo } from 'react'
import type { Word } from '../types'
import { fetchShabadWords } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

type WordDataRequestState = {
  key: string
  wordDataMap: Record<number, Word[]>
}

export function useMultiShabadWordData(shabadIds: (number | null)[]) {
  const { getWords, setWords } = useScriptureCacheStore()
  const [state, setState] = useState<WordDataRequestState | null>(null)
  const validIds = useMemo(
    () => Array.from(new Set(shabadIds.filter((id): id is number => typeof id === 'number' && id > 0))),
    [shabadIds]
  )
  const requestKey = validIds.join(',')
  const { cachedMap, idsToFetch } = useMemo(() => {
    const nextCachedMap: Record<number, Word[]> = {}
    const nextIdsToFetch: number[] = []

    validIds.forEach(id => {
      const cached = getWords(id)
      if (cached) {
        nextCachedMap[id] = cached
      } else {
        nextIdsToFetch.push(id)
      }
    })

    return {
      cachedMap: nextCachedMap,
      idsToFetch: nextIdsToFetch,
    }
  }, [getWords, validIds])
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!requestKey || idsToFetch.length === 0 || currentState) return

    let cancelled = false
    Promise.all(
      idsToFetch.map(id =>
        fetchShabadWords(id)
          .then(words => ({ id, words }))
          .catch(() => ({ id, words: [] as Word[] }))
      )
    ).then(results => {
      if (cancelled) return

      const nextWordDataMap = { ...cachedMap }
      for (const { id, words } of results) {
        setWords(id, words)
        nextWordDataMap[id] = words
      }

      setState({
        key: requestKey,
        wordDataMap: nextWordDataMap,
      })
    })

    return () => { cancelled = true }
  }, [cachedMap, currentState, idsToFetch, requestKey, setWords])

  return {
    wordDataMap: requestKey
      ? {
          ...cachedMap,
          ...(currentState?.wordDataMap ?? {}),
        }
      : {},
    loading: requestKey.length > 0 && idsToFetch.length > 0 && currentState === null,
  }
}
