import { useEffect, useState } from "react"
import { loadLearnDetail } from "../data/learnRepository"
import type {
  Collection,
  DailyGuidance,
  LearnContentKind,
  ShabadDeepDive,
  TopicGuide,
} from "../types"

type LearnDetail = DailyGuidance | ShabadDeepDive | TopicGuide | Collection
type LearnDetailByKind = {
  "daily-guidance": DailyGuidance
  "shabad-deep-dive": ShabadDeepDive
  "topic-guide": TopicGuide
  collection: Collection
}

type LearnDetailState<T extends LearnDetail> = {
  item: T | null
  loading: boolean
  error: Error | null
}

export default function useLearnDetail<K extends LearnContentKind>(
  kind: K,
  id: string | null | undefined
) {
  const [state, setState] = useState<LearnDetailState<LearnDetailByKind[K]>>({
    item: null,
    loading: Boolean(id),
    error: null,
  })

  useEffect(() => {
    if (!id) {
      setState({
        item: null,
        loading: false,
        error: null,
      })
      return
    }

    let cancelled = false

    setState(current => ({
      item: current.item,
      loading: true,
      error: null,
    }))

    loadLearnDetail(kind, id)
      .then(item => {
        if (cancelled) return
        setState({
          item: item as LearnDetailByKind[K] | null,
          loading: false,
          error: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        setState({
          item: null,
          loading: false,
          error: error instanceof Error ? error : new Error("Failed to load the Learn item."),
        })
      })

    return () => {
      cancelled = true
    }
  }, [id, kind])

  return state
}
