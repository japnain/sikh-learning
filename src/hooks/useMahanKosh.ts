import { useEffect, useMemo, useState } from 'react'
import type { MahanKoshEntry } from '../types'
import { fetchMahanKoshEntries } from '../api/mahankosh'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { normalizeLookupWord } from '../utils/wordLookup'

export function useMahanKosh(word: string) {
  const normalizedWord = useMemo(() => normalizeLookupWord(word), [word])
  const { getMahanKosh, setMahanKosh } = useScriptureCacheStore()
  const [entries, setEntries] = useState<MahanKoshEntry[]>(() => normalizedWord ? (getMahanKosh(normalizedWord) ?? []) : [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!normalizedWord) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    const cached = getMahanKosh(normalizedWord)
    if (cached) {
      setEntries(cached)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMahanKoshEntries(normalizedWord)
      .then(result => {
        if (cancelled) return
        setEntries(result)
        setMahanKosh(normalizedWord, result)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setEntries([])
        setError('Unable to load Mahankosh right now.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [getMahanKosh, normalizedWord, setMahanKosh])

  return {
    entries,
    loading,
    error,
    normalizedWord,
  }
}
