import { useState, useEffect } from 'react'
import type { ScriptureEntry, SundarGutkaLength } from '../types'
import { fetchBani } from '../api/banidb'

export function useBani(baniDbId: number | null, sgLength?: SundarGutkaLength | null) {
  const [entries, setEntries] = useState<ScriptureEntry[]>([])
  const [availableLengths, setAvailableLengths] = useState<SundarGutkaLength[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!baniDbId) return
    setEntries([])
    setAvailableLengths([])
    setLoading(true)
    setError(null)
    let cancelled = false
    fetchBani(baniDbId, sgLength)
      .then(data => {
        if (!cancelled) {
          setEntries(data.entries)
          setAvailableLengths(data.availableLengths)
        }
      })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [baniDbId, sgLength])

  return { entries, availableLengths, loading, error }
}
