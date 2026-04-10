import { useState, useEffect } from 'react'
import type { ScriptureEntry, SundarGutkaLength } from '../types'
import { fetchBani } from '../api/banidb'

type BaniRequestState = {
  key: string
  entries: ScriptureEntry[]
  availableLengths: SundarGutkaLength[]
  error: string | null
}

export function useBani(baniDbId: number | null, sgLength?: SundarGutkaLength | null) {
  const [state, setState] = useState<BaniRequestState | null>(null)
  const requestKey = baniDbId ? `${baniDbId}:${sgLength ?? 'default'}` : null
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!baniDbId || !requestKey || currentState) return

    let cancelled = false
    fetchBani(baniDbId, sgLength)
      .then(data => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: data.entries,
          availableLengths: data.availableLengths,
          error: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          key: requestKey,
          entries: [],
          availableLengths: [],
          error: String(error),
        })
      })

    return () => { cancelled = true }
  }, [baniDbId, currentState, requestKey, sgLength])

  return {
    entries: currentState?.entries ?? [],
    availableLengths: currentState?.availableLengths ?? [],
    loading: requestKey !== null && currentState === null,
    error: currentState?.error ?? null,
  }
}
