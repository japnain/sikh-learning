import { useEffect, useState } from 'react'
import type { ScriptureEntry } from '../types'
import { fetchShabad } from '../api/banidb'

type ShabadRequestState = {
  key: string
  entries: ScriptureEntry[]
  error: string | null
}

export function useShabad(shabadId: number | null) {
  const [state, setState] = useState<ShabadRequestState | null>(null)
  const requestKey = shabadId ? String(shabadId) : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!shabadId || !requestKey || currentState) return

    let cancelled = false

    fetchShabad(shabadId)
      .then(data => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: data ? [data] : [],
          error: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: [],
          error: String(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [currentState, requestKey, shabadId])

  return {
    entries: currentState?.entries ?? [],
    loading: requestKey !== null && currentState === null,
    error: currentState?.error ?? null,
  }
}
