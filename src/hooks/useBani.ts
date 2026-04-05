import { useState, useEffect } from 'react'
import type { ScriptureEntry } from '../types'
import { fetchBani } from '../api/banidb'

export function useBani(baniDbId: number | null) {
  const [entries, setEntries] = useState<ScriptureEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!baniDbId) return
    setEntries([])
    setLoading(true)
    setError(null)
    let cancelled = false
    fetchBani(baniDbId)
      .then(data => { if (!cancelled) setEntries(data) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [baniDbId])

  return { entries, loading, error }
}
