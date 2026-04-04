import { useState, useEffect } from 'react'
import type { ScriptureEntry } from '../types'
import { fetchAng } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A'

export function useAng(ang: number, source: BaniSource) {
  const { getAng, setAng } = useScriptureCacheStore()
  const cached = getAng(source, ang)
  const [entries, setEntries] = useState<ScriptureEntry[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) { setEntries(cached); setLoading(false); return }
    setEntries([])
    setLoading(true)
    setError(null)
    let cancelled = false
    fetchAng(ang, source)
      .then(data => {
        if (cancelled) return
        setAng(source, ang, data)
        setEntries(data)
      })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [ang, source])

  const refetch = () => {
    setLoading(true)
    setError(null)
    fetchAng(ang, source)
      .then(data => { setAng(source, ang, data); setEntries(data) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  return { entries, loading, error, refetch }
}
