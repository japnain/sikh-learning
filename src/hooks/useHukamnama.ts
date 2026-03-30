import { useState, useEffect } from 'react'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'

export function useHukamnama() {
  const [data, setData] = useState<HukamnamaResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHukamnama()
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
