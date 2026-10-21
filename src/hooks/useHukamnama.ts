import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveAsyncIssue } from '../qa/async'
import { fetchHukamnama, type HukamnamaResult } from '../api/banidb'
import type { AsyncIssue, AsyncStatus } from '../types'

const HUKAMNAMA_CACHE_KEY = 'naamras-hukamnama-cache-v1'
const REQUEST_TIMEOUT_MS = 15_000

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isDateStamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && localDateStamp(parsed) === value
}

function isStringMap(value: unknown): boolean {
  return value === undefined || (isRecord(value) && Object.values(value).every(text => typeof text === 'string'))
}

function hasSafePauseMarkers(value: unknown): boolean {
  return value === undefined || (isRecord(value) && Object.values(value).every(markers => Array.isArray(markers)
    && markers.every(marker => isRecord(marker) && typeof marker.p === 'number' && Number.isInteger(marker.p)
      && marker.p >= 0 && typeof marker.t === 'string')))
}

function hasRenderableText(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && ['gurmukhi', 'transliteration', 'translation_en', 'translation_hi', 'translation_pa']
      .every(key => typeof value[key] === 'string')
    && (value.larivaar === undefined || typeof value.larivaar === 'string')
    && ['translations_en', 'translations_hi', 'translations_pa'].every(key => isStringMap(value[key]))
}

function isHukamnamaResult(value: unknown): value is HukamnamaResult {
  if (!isRecord(value) || !isDateStamp(value.date) || !isPositiveNumber(value.ang)
    || typeof value.source !== 'string' || !['G', 'D', 'B', 'A'].includes(value.source)
    || typeof value.shabadId !== 'number' || !Number.isInteger(value.shabadId) || value.shabadId < 0
    || !hasRenderableText(value.entry)) return false
  const entry = value.entry
  return typeof entry.id === 'string' && entry.id.trim().length > 0
    && typeof entry.scripture === 'string' && entry.scripture.trim().length > 0
    && entry.ang === value.ang && (entry.gurmukhi as string).trim().length > 0
    && (entry.source === undefined || entry.source === value.source)
    && (entry.hukamnamaDate === undefined || entry.hukamnamaDate === value.date)
    && ['sourceName', 'raag', 'writer'].every(key => entry[key] === undefined || typeof entry[key] === 'string')
    && Array.isArray(entry.words) && entry.words.every(word => isRecord(word)
      && ['gurmukhi', 'transliteration', 'meaning_en', 'meaning_hi', 'meaning_pa'].every(key => typeof word[key] === 'string'))
    && (entry.lines === undefined || (Array.isArray(entry.lines) && entry.lines.every(line => hasRenderableText(line)
      && isPositiveNumber(line.ang)
      && typeof line.verseId === 'number' && Number.isInteger(line.verseId) && line.verseId >= 0
      && typeof line.shabadId === 'number' && Number.isInteger(line.shabadId) && line.shabadId >= 0
      && hasSafePauseMarkers(line.visraam)
      && (line.isHeader === undefined || typeof line.isHeader === 'boolean'))))
}

function readCachedHukamnama(): CachedHukamnama | null {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(HUKAMNAMA_CACHE_KEY) ?? 'null') as Partial<CachedHukamnama> | null
    if (!parsed || !isHukamnamaResult(parsed.data) || typeof parsed.cachedAt !== 'string'
      || !Number.isFinite(Date.parse(parsed.cachedAt))) return null
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
  const requestedDate = date ?? localDateStamp()
  const requestKey = enabled ? (date ?? `today:${requestedDate}`) : null
  const operationKey = requestKey ? `${requestKey}:${attempt}` : null
  const cached = useMemo(() => {
    if (!requestKey) return null
    const candidate = readCachedHukamnama()
    return date && candidate?.data.date !== date ? null : candidate
  }, [date, requestKey])
  const currentState = operationKey && state?.key === operationKey ? state : null
  const previousState = requestKey && state?.requestKey === requestKey ? state : null
  const displayState = currentState ?? previousState

  useEffect(() => {
    if (!enabled || !requestKey || !operationKey) return

    let cancelled = false
    let settled = false
    const controller = new AbortController()
    const fail = (error: unknown) => {
      if (cancelled || settled) return
      settled = true
      window.clearTimeout(deadline)
      const candidate = readCachedHukamnama()
      const fallback = date && candidate?.data.date !== date ? null : candidate
      setState({
        key: operationKey,
        requestKey,
        data: fallback?.data ?? null,
        issue: resolveAsyncIssue(error),
        isCached: Boolean(fallback),
        cachedAt: fallback?.cachedAt ?? null,
      })
    }
    const deadline = window.setTimeout(() => {
      fail(new Error('The Hukamnama request timed out.'))
      controller.abort()
    }, REQUEST_TIMEOUT_MS)

    fetchHukamnama(date ?? undefined, { signal: controller.signal })
      .then(data => {
        if (cancelled || settled) return
        settled = true
        window.clearTimeout(deadline)
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
      .catch(fail)

    return () => {
      cancelled = true
      window.clearTimeout(deadline)
      controller.abort()
    }
  }, [date, enabled, operationKey, requestKey])

  const retry = useCallback(() => {
    if (!enabled) return
    setAttempt(current => current + 1)
  }, [enabled])

  const issue = currentState?.issue ?? null
  const data = requestKey ? (displayState ? displayState.data : cached?.data ?? null) : null
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
    isCached: displayState?.isCached ?? Boolean(cached),
    isOlder,
    cachedAt: displayState ? displayState.cachedAt : cached?.cachedAt ?? null,
    requestedDate,
    retry,
  }
}
