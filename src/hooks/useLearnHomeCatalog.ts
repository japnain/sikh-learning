import { useEffect, useState } from "react"
import { loadLearnHomeCatalog } from "../data/learnRepository"
import { resolveAsyncIssue } from "../qa/async"
import type { AsyncIssue, AsyncStatus, LearnHomeCatalog } from "../types"

type LearnHomeCatalogState = {
  catalog: LearnHomeCatalog | null
  status: AsyncStatus
  issue: AsyncIssue | null
}

const INITIAL_STATE: LearnHomeCatalogState = {
  catalog: null,
  status: 'loading',
  issue: null,
}

export default function useLearnHomeCatalog() {
  const [state, setState] = useState<LearnHomeCatalogState>(INITIAL_STATE)

  useEffect(() => {
    let cancelled = false

    loadLearnHomeCatalog()
      .then(catalog => {
        if (cancelled) return
        setState({
          catalog,
          status: 'ready',
          issue: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          catalog: null,
          status: 'degraded',
          issue: resolveAsyncIssue(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    ...state,
    loading: state.status === 'loading',
    error: state.issue?.code ?? null,
  }
}
