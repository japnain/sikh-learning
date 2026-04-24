import { useEffect, useState } from "react"
import { resolveAsyncIssue } from "../qa/async"
import { loadLearnDetail } from "../data/learnRepository"
import type {
  AsyncIssue,
  AsyncStatus,
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
  status: AsyncStatus
  issue: AsyncIssue | null
}

export default function useLearnDetail<K extends LearnContentKind>(
  kind: K,
  id: string | null | undefined
) {
  const [state, setState] = useState<LearnDetailState<LearnDetailByKind[K]>>({
    item: null,
    status: id ? 'loading' : 'empty',
    issue: null,
  })

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return

      if (!id) {
        setState({
          item: null,
          status: 'empty',
          issue: null,
        })
        return
      }

      setState(current => ({
        item: current.item,
        status: 'loading',
        issue: null,
      }))

      loadLearnDetail(kind, id)
        .then(item => {
          if (cancelled) return
          setState({
            item: item as LearnDetailByKind[K] | null,
            status: item ? 'ready' : 'empty',
            issue: null,
          })
        })
        .catch(error => {
          if (cancelled) return
          setState({
            item: null,
            status: 'degraded',
            issue: resolveAsyncIssue(error),
          })
        })
    })

    return () => {
      cancelled = true
    }
  }, [id, kind])

  return {
    ...state,
    loading: state.status === 'loading',
    error: state.issue?.code ?? null,
  }
}
