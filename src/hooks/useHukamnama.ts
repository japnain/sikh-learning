import { useState, useEffect } from 'react'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'

type HukamnamaRequestState = {
  key: string
  data: HukamnamaResult | null
  error: string | null
}

export function useHukamnama(date?: string | null, enabled: boolean = true) {
  const [state, setState] = useState<HukamnamaRequestState | null>(null)
  const requestKey = enabled ? (date ?? 'today') : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!enabled || !requestKey || currentState) return

    let cancelled = false
    fetchHukamnama(date ?? undefined)
      .then(data => {
        if (cancelled) return
        setState({
          key: requestKey,
          data,
          error: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: requestKey,
          data: null,
          error: String(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [currentState, date, enabled, requestKey])

  return {
    data: currentState?.data ?? null,
    loading: requestKey !== null && currentState === null,
    error: currentState?.error ?? null,
  }
}
