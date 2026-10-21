import { useState, useEffect, useMemo } from 'react'
import type { Word } from '../types'
import { fetchShabadWords } from '../api/banidb'
import { useScriptureCacheStore } from '../store/scriptureCache'

type WordDataRequestState = {
  key: string
  wordDataMap: Record<number, Word[]>
  loading: boolean
}

const WORD_REQUEST_TIMEOUT_MS = 30_000

function fetchWordsWithinDeadline(id: number, parentSignal: AbortSignal): Promise<Word[] | null> {
  return new Promise(resolve => {
    const controller = new AbortController()
    let settled = false
    const settle = (words: Word[] | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      parentSignal.removeEventListener('abort', abort)
      resolve(words)
    }
    const abort = () => {
      settle(null)
      controller.abort()
    }

    const timer = setTimeout(abort, WORD_REQUEST_TIMEOUT_MS)
    if (parentSignal.aborted) {
      abort()
      return
    }

    parentSignal.addEventListener('abort', abort, { once: true })
    try {
      void fetchShabadWords(id, controller.signal)
        .then(words => settle(words), () => settle(null))
    } catch {
      settle(null)
    }
  })
}

export function useMultiShabadWordData(shabadIds: (number | null)[]) {
  const { getWords, setWords } = useScriptureCacheStore()
  const [state, setState] = useState<WordDataRequestState | null>(null)
  const validIds = useMemo(
    () => Array.from(new Set(shabadIds.filter((id): id is number => typeof id === 'number' && id > 0))),
    [shabadIds]
  )
  const requestKey = validIds.join(',')
  const cachedMap: Record<number, Word[]> = {}
  let hasUncachedWords = false
  for (const id of validIds) {
    const words = getWords(id)
    if (words) cachedMap[id] = words
    else hasUncachedWords = true
  }
  const currentState = requestKey && state?.key === requestKey ? state : null

  useEffect(() => {
    if (!requestKey) return

    const controller = new AbortController()
    const nextWordDataMap: Record<number, Word[]> = {}
    const idsToFetch: number[] = []
    for (const id of requestKey.split(',').map(Number)) {
      const words = getWords(id)
      if (words) nextWordDataMap[id] = words
      else idsToFetch.push(id)
    }
    let remaining = idsToFetch.length

    for (const id of idsToFetch) {
      void fetchWordsWithinDeadline(id, controller.signal).then(words => {
        if (controller.signal.aborted) return
        remaining -= 1
        if (words !== null) {
          nextWordDataMap[id] = words
          try {
            setWords(id, words)
          } catch {
            // This cache is optional; fetched words remain usable for this reading.
          }
        }
        setState({
          key: requestKey,
          wordDataMap: { ...nextWordDataMap },
          loading: remaining > 0,
        })
      })
    }

    return () => controller.abort()
  }, [getWords, requestKey, setWords])

  return {
    wordDataMap: requestKey
      ? {
          ...cachedMap,
          ...(currentState?.wordDataMap ?? {}),
        }
      : {},
    loading: hasUncachedWords && (currentState ? currentState.loading : true),
  }
}
