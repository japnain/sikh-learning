import { useState, useEffect } from 'react'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'

export function useHukamnama(date?: string | null, enabled: boolean = true) {
  const [data, setData] = useState<HukamnamaResult | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    fetchHukamnama(date ?? undefined)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [date, enabled])

  return { data, loading, error }
}
