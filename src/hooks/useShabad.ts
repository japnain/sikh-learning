import { useEffect, useState } from 'react'
import type { ScriptureEntry } from '../types'
import { fetchShabadVerses } from '../api/banidb'

export function useShabad(shabadId: number | null) {
  const [entries, setEntries] = useState<ScriptureEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shabadId) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setEntries([])

    fetchShabadVerses(shabadId)
      .then(data => {
        if (!cancelled) setEntries(data)
      })
      .catch(e => {
        if (!cancelled) setError(String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shabadId])

  return { entries, loading, error }
}
