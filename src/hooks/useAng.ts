import { useState, useEffect } from 'react'
import type { ScriptureEntry } from '../types'
import { fetchAng } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

type BaniSource = 'G' | 'D' | 'B' | 'A'

type AngRequestState = {
  key: string
  entries: ScriptureEntry[]
  error: string | null
}

type RefreshState = {
  key: string
  loading: boolean
  error: string | null
}

export function useAng(ang: number, source: BaniSource) {
  const { getAng, setAng } = useScriptureCacheStore()
  const cachedEntries = getAng(source, ang) ?? null
  const requestKey = `${source}:${ang}`
  const [state, setState] = useState<AngRequestState | null>(null)
  const [refreshState, setRefreshState] = useState<RefreshState | null>(null)
  const currentState = state?.key === requestKey ? state : null
  const currentRefreshState = refreshState?.key === requestKey ? refreshState : null

  useEffect(() => {
    if (cachedEntries || currentState) return

    let cancelled = false
    fetchAng(ang, source)
      .then(data => {
        if (cancelled) return
        setAng(source, ang, data)
        setState({
          key: requestKey,
          entries: data,
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

    return () => { cancelled = true }
  }, [ang, cachedEntries, currentState, requestKey, setAng, source])

  const refetch = () => {
    setRefreshState({
      key: requestKey,
      loading: true,
      error: null,
    })

    fetchAng(ang, source)
      .then(data => {
        setAng(source, ang, data)
        setState({
          key: requestKey,
          entries: data,
          error: null,
        })
        setRefreshState({
          key: requestKey,
          loading: false,
          error: null,
        })
      })
      .catch(error => {
        setRefreshState({
          key: requestKey,
          loading: false,
          error: String(error),
        })
      })
  }

  return {
    entries: cachedEntries ?? currentState?.entries ?? [],
    loading: currentRefreshState?.loading ?? (!cachedEntries && currentState === null),
    error: currentRefreshState?.error ?? currentState?.error ?? null,
    refetch,
  }
}
