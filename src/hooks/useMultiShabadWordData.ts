import { useState, useEffect, useRef } from 'react'
import type { Word } from '../types'
import { fetchShabadWords } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

export function useMultiShabadWordData(shabadIds: (number | null)[]) {
  const { getWords, setWords } = useScriptureCacheStore()
  const [wordDataMap, setWordDataMap] = useState<Record<number, Word[]>>({})
  const [loading, setLoading] = useState(false)
  const prevKeyRef = useRef('')

  useEffect(() => {
    const validIds = shabadIds.filter((id): id is number => id !== null)
    const key = validIds.join(',')
    if (key === prevKeyRef.current) return
    prevKeyRef.current = key

    if (validIds.length === 0) {
      setWordDataMap({})
      return
    }

    // Immediately populate from cache
    const result: Record<number, Word[]> = {}
    const toFetch: number[] = []
    for (const id of validIds) {
      const cached = getWords(id)
      if (cached) {
        result[id] = cached
      } else {
        toFetch.push(id)
      }
    }

    if (toFetch.length === 0) {
      setWordDataMap(result)
      return
    }

    let cancelled = false
    setLoading(true)
    setWordDataMap(result)

    Promise.all(
      toFetch.map(id =>
        fetchShabadWords(id)
          .then(words => ({ id, words }))
          .catch(() => ({ id, words: [] as Word[] }))
      )
    ).then(results => {
      if (cancelled) return
      const updated = { ...result }
      for (const { id, words } of results) {
        setWords(id, words)
        updated[id] = words
      }
      setWordDataMap(updated)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [shabadIds.filter((id): id is number => id !== null).join(',')])

  return { wordDataMap, loading }
}
