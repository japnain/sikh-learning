import { useEffect, useState } from "react"
import { loadLearnCatalog } from "../data/learnRepository"
import type { LearnCatalog } from "../types"

type LearnCatalogState = {
  catalog: LearnCatalog | null
  loading: boolean
  error: Error | null
}

const INITIAL_STATE: LearnCatalogState = {
  catalog: null,
  loading: true,
  error: null,
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
          loading: false,
          error: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          catalog: null,
          loading: false,
          error: error instanceof Error ? error : new Error("Failed to load the Learn catalog."),
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
