import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'
import type { AsyncIssue, AsyncStatus } from '../types'

const HUKAMNAMA_CACHE_KEY = 'naamras-hukamnama-cache-v1'

type CachedHukamnama = {
  data: HukamnamaResult
  cachedAt: string
}

type HukamnamaRequestState = {
  key: string
  requestKey: string
  data: HukamnamaResult | null
  issue: AsyncIssue | null
  isCached: boolean
  cachedAt: string | null
}

function localDateStamp(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function isHukamnamaResult(value: unknown): value is HukamnamaResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<HukamnamaResult>
  return typeof candidate.date === 'string'
    && typeof candidate.ang === 'number'
    && typeof candidate.source === 'string'
    && typeof candidate.shabadId === 'number'
    && Boolean(candidate.entry && typeof candidate.entry === 'object')
}

function readCachedHukamnama(): CachedHukamnama | null {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(HUKAMNAMA_CACHE_KEY) ?? 'null') as Partial<CachedHukamnama> | null
    if (!parsed || !isHukamnamaResult(parsed.data) || typeof parsed.cachedAt !== 'string') return null
    return { data: parsed.data, cachedAt: parsed.cachedAt }
  } catch {
    return null
  }
}

function writeCachedHukamnama(data: HukamnamaResult) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(HUKAMNAMA_CACHE_KEY, JSON.stringify({
      data,
      cachedAt: new Date().toISOString(),
    } satisfies CachedHukamnama))
  } catch {
    // A full or restricted storage area must not prevent the live reading from rendering.
  }
}

export function useHukamnama(date?: string | null, enabled: boolean = true) {
  const [state, setState] = useState<HukamnamaRequestState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = enabled ? (date ?? 'today') : null
  const operationKey = requestKey ? `${requestKey}:${attempt}` : null
  const requestedDate = date ?? localDateStamp()
  const currentState = operationKey && state?.key === operationKey ? state : null
  const previousState = requestKey && state?.requestKey === requestKey ? state : null
  const displayState = currentState ?? previousState

  useEffect(() => {
    if (!enabled || !requestKey || !operationKey) return

    let cancelled = false

    fetchHukamnama(date ?? undefined)
      .then(data => {
        if (cancelled) return
        writeCachedHukamnama(data)
        setState({
          key: operationKey,
          requestKey,
          data,
          issue: null,
          isCached: false,
          cachedAt: null,
        })
      })
      .catch(error => {
        if (cancelled) return
        const cachedCandidate = readCachedHukamnama()
        const cached = date && cachedCandidate?.data.date !== date
          ? null
          : cachedCandidate
        setState({
          key: operationKey,
          requestKey,
          data: cached?.data ?? null,
          issue: resolveAsyncIssue(error),
          isCached: Boolean(cached),
          cachedAt: cached?.cachedAt ?? null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [date, enabled, operationKey, requestKey])

  const retry = useCallback(() => {
    if (!enabled) return
    setAttempt(current => current + 1)
  }, [enabled])

  const issue = currentState?.issue ?? null
  const data = requestKey ? (displayState?.data ?? null) : null
  const loading = requestKey !== null && currentState === null
  const status: AsyncStatus = requestKey === null
    ? 'empty'
    : loading && !data
      ? 'loading'
      : issue
        ? 'degraded'
        : data
          ? 'ready'
          : 'empty'
  const isOlder = useMemo(() => Boolean(data && data.date !== requestedDate), [data, requestedDate])

  return {
    data,
    status,
    issue,
    loading,
    refreshing: loading && Boolean(data),
    error: issue?.code ?? null,
    isCached: displayState?.isCached ?? false,
    isOlder,
    cachedAt: displayState?.cachedAt ?? null,
    requestedDate,
    retry,
  }
}
