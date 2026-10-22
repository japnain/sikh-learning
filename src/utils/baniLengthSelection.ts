import { fetchBani, type BaniFetchResult } from '../api/banidb'
import type { ScriptureEntry, SundarGutkaLength } from '../types'
import { getExactReadingKey, type ReadingPlaces } from '../store/readingPlaces'
import { readBaniOfflineCache, writeBaniOfflineCache } from './baniOfflineCache'
import { isExactBaniReading } from './baniReadingValidation'

/** Validate before navigating: failed requests never replace the current scripture. */
export async function loadExactBaniReading(baniDbId: number, length: SundarGutkaLength, signal?: AbortSignal): Promise<BaniFetchResult> {
  signal?.throwIfAborted()
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  let rejectAbort: () => void = () => {}
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(new DOMException('The reading request was cancelled or timed out. Your reading is unchanged.', 'AbortError'))
    controller.signal.addEventListener('abort', rejectAbort, { once: true })
  })
  const deadline = setTimeout(abort, 30_000)
  try {
    signal?.throwIfAborted()
    const load = async () => {
      const cached = await readBaniOfflineCache(baniDbId, length).catch(() => null)
      controller.signal.throwIfAborted()
      if (isExactBaniReading(cached, baniDbId, length)) return cached!
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('This length is not available offline. Your current reading is unchanged.')
      const reading = await fetchBani(baniDbId, length, controller.signal)
      controller.signal.throwIfAborted()
      if (!isExactBaniReading(reading, baniDbId, length)) throw new Error('This length could not be verified. Your current reading is unchanged.')
      void writeBaniOfflineCache(baniDbId, length, reading).catch(() => {})
      controller.signal.throwIfAborted()
      return reading
    }
    return await Promise.race([load(), aborted])
  } finally {
    clearTimeout(deadline)
    signal?.removeEventListener('abort', abort)
    controller.signal.removeEventListener('abort', rejectAbort)
  }
}

export interface BaniLengthDestination {
  path: string
  destination: 'same-verse' | 'saved-place' | 'beginning'
}

/** Match canonical source + verse; scroll percentages do not identify scripture. */
export function getBaniLengthDestination(
  currentPath: string,
  reading: BaniFetchResult,
  places: ReadingPlaces,
  currentVerse?: { verseId: number; source?: string } | null,
): BaniLengthDestination {
  const params = new URLSearchParams(currentPath.split('?')[1] ?? '')
  if (reading.resolvedLength) params.set('sgLength', reading.resolvedLength)
  params.delete('resumeVerseId')
  params.delete('resumeSource')
  const targetPath = `/study?${params}`
  const candidates = (verseId: number, source?: string) => reading.entries.flatMap(entry =>
    (entry.lines ?? []).filter(line => line.verseId === verseId && (!source || entry.source === source)).map(line => ({ entry, line })))
  const apply = (entry: ScriptureEntry, verseId: number, destination: BaniLengthDestination['destination']): BaniLengthDestination => {
    params.set('ang', String(entry.ang))
    params.set('resumeVerseId', String(verseId))
    if (entry.source) params.set('resumeSource', entry.source)
    return { path: `/study?${params}`, destination }
  }
  if (currentVerse?.verseId) {
    const matches = candidates(currentVerse.verseId, currentVerse.source)
    if (matches.length === 1) return apply(matches[0].entry, currentVerse.verseId, 'same-verse')
  }
  const key = getExactReadingKey(targetPath)
  const saved = key ? places[key] : null
  if (saved?.resumeVerseId) {
    const savedSource = new URLSearchParams(saved.resumePath.split('?')[1]).get('resumeSource') ?? undefined
    const matches = candidates(saved.resumeVerseId, savedSource)
    if (matches.length === 1) return apply(matches[0].entry, saved.resumeVerseId, 'saved-place')
  }
  params.set('ang', String(reading.entries[0]?.ang ?? params.get('startAng') ?? 1))
  return { path: `/study?${params}`, destination: 'beginning' }
}
