import { useState, useEffect } from 'react'
import type { Word } from '../types'
import { fetchShabadWords } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

export function useWordData(shabadId: number | null) {
  const { getWords, setWords } = useScriptureCacheStore()
  const [words, setWordsState] = useState<Word[] | null>(
    shabadId !== null ? (getWords(shabadId) ?? null) : null
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (shabadId === null) { setWordsState(null); return }
    const cached = getWords(shabadId)
    if (cached) { setWordsState(cached); return }
    let cancelled = false
    setLoading(true)
    fetchShabadWords(shabadId)
      .then(data => {
        if (cancelled) return
        setWords(shabadId, data)
        setWordsState(data)
      })
      .catch(() => { if (!cancelled) setWordsState([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [shabadId])

  return { words, loading }
}
