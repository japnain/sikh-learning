import { useEffect, useState } from "react"
import { resolveAsyncIssue } from "../qa/async"
import { loadLearnCatalog } from "../data/learnRepository"
import type { AsyncIssue, AsyncStatus, LearnCatalog } from "../types"

type LearnCatalogState = {
  catalog: LearnCatalog | null
  status: AsyncStatus
  issue: AsyncIssue | null
}

const INITIAL_STATE: LearnCatalogState = {
  catalog: null,
  status: 'loading',
  issue: null,
}

export default function useLearnCatalog() {
  const [state, setState] = useState<LearnCatalogState>(INITIAL_STATE)

  useEffect(() => {
    let cancelled = false

    loadLearnCatalog()
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
