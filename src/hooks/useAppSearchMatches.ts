import { useEffect, useState } from "react"
import { loadLearnSearchIndex } from "../data/learnRepository"
import {
  getAppSearchMatches,
  type AppSearchMatch,
  type SearchSource,
} from "../utils/appSearch"

export default function useAppSearchMatches(query: string, searchSource: SearchSource = "all") {
  const [matches, setMatches] = useState<AppSearchMatch[]>([])

  useEffect(() => {
    let cancelled = false

    if (query.trim().length < 2) {
      setMatches([])
      return
    }

    loadLearnSearchIndex()
      .then(searchIndex => {
        if (cancelled) return
        setMatches(getAppSearchMatches(query, searchSource, searchIndex))
      })
      .catch(() => {
        if (cancelled) return
        setMatches(getAppSearchMatches(query, searchSource, null))
      })

    return () => {
      cancelled = true
    }
  }, [query, searchSource])

  return matches
}
