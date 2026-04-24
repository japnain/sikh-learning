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
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      Promise.resolve().then(() => {
        if (!cancelled) setMatches([])
      })
      return
    }

    loadLearnSearchIndex()
      .then(searchIndex => {
        if (cancelled) return
        setMatches(getAppSearchMatches(trimmedQuery, searchSource, searchIndex))
      })
      .catch(() => {
        if (cancelled) return
        setMatches(getAppSearchMatches(trimmedQuery, searchSource, null))
      })

    return () => {
      cancelled = true
    }
  }, [query, searchSource])

  return matches
}
