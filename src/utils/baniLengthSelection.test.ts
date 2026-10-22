import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import type { ScriptureEntry, SundarGutkaLength } from '../types'
import { getExactReadingKey, type ReadingPlaces } from '../store/readingPlaces'
import { readBaniOfflineCache, writeBaniOfflineCache } from './baniOfflineCache'
import { getBaniLengthDestination, loadExactBaniReading } from './baniLengthSelection'

vi.mock('../api/banidb', () => ({ fetchBani: vi.fn() }))
vi.mock('./baniOfflineCache', () => ({ readBaniOfflineCache: vi.fn(), writeBaniOfflineCache: vi.fn() }))

function entry(verseId: number, source: 'G' | 'D' = 'G', ang = 8): ScriptureEntry {
  return {
    id: `bani-21-${source}-${verseId}`, source, scripture: source === 'G' ? 'SGGS' : 'DG', ang,
    gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ', transliteration: 'ik oankaar sat naam',
    translation_en: '', translation_pa: '', translation_hi: '', words: [],
    lines: [{ verseId, shabadId: 1, ang, gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ', transliteration: '', translation_en: '', translations_en: {}, translation_pa: '', translation_hi: '' }],
  }
}

function reading(length: SundarGutkaLength = 'long', entries = [entry(386), entry(400, 'G', 9)]): BaniFetchResult {
  return { entries, availableLengths: ['short', 'medium', 'long', 'extralong'], resolvedLength: length }
}

const currentPath = '/study?source=G&ang=10&startAng=8&endAng=12&baniId=rehras-sahib&baniDbId=21&exactBani=1&sgLength=short&resumeVerseId=999'
function savedPlaces(verseId: number, length: SundarGutkaLength = 'long'): ReadingPlaces {
  const params = new URLSearchParams(currentPath.split('?')[1])
  params.set('sgLength', length)
  const path = `/study?${params}`
  return { [getExactReadingKey(path)!]: { scriptureId: 'bani-21', resumePath: path, resumeVerseId: verseId, updatedAt: '2026-10-22T12:00:00Z' } }
}

beforeEach(() => {
  vi.mocked(fetchBani).mockReset()
  vi.mocked(readBaniOfflineCache).mockReset().mockResolvedValue(null)
  vi.mocked(writeBaniOfflineCache).mockReset().mockResolvedValue(undefined)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('loadExactBaniReading', () => {
  it('uses a verified exact cached length without a network request, including offline', async () => {
    const exact = reading()
    vi.mocked(readBaniOfflineCache).mockResolvedValue(exact)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(await loadExactBaniReading(21, 'long')).toBe(exact)
    expect(fetchBani).not.toHaveBeenCalled()
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('discards a mismatched cache and prepares only the exact network reading', async () => {
    const exact = reading()
    vi.mocked(readBaniOfflineCache).mockResolvedValue(reading('short'))
    vi.mocked(fetchBani).mockResolvedValue(exact)
    expect(await loadExactBaniReading(21, 'long')).toBe(exact)
    expect(fetchBani).toHaveBeenCalledWith(21, 'long', expect.any(AbortSignal))
    expect(writeBaniOfflineCache).toHaveBeenCalledWith(21, 'long', exact)
  })

  it.each([
    ['another length', reading('short')],
    ['another bani', reading('long', [{ ...entry(386), id: 'bani-9-G-386' }])],
    ['empty scripture', reading('long', [])],
  ])('rejects %s returned by the network without caching it', async (_label, invalid) => {
    vi.mocked(fetchBani).mockResolvedValue(invalid)
    await expect(loadExactBaniReading(21, 'long')).rejects.toThrow(/could not be verified/i)
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('fails an uncached offline selection without issuing a network request', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(loadExactBaniReading(21, 'long')).rejects.toThrow(/not available offline/i)
    expect(fetchBani).not.toHaveBeenCalled()
  })

  it('returns verified scripture even when persistence fails', async () => {
    const exact = reading()
    vi.mocked(readBaniOfflineCache).mockRejectedValue(new Error('Storage unavailable'))
    vi.mocked(fetchBani).mockResolvedValue(exact)
    vi.mocked(writeBaniOfflineCache).mockRejectedValue(new Error('Storage full'))
    expect(await loadExactBaniReading(21, 'long')).toBe(exact)
  })

  it('returns verified scripture without waiting for an optional stalled cache write', async () => {
    const exact = reading()
    vi.mocked(fetchBani).mockResolvedValue(exact)
    vi.mocked(writeBaniOfflineCache).mockImplementation(() => new Promise(() => {}))
    expect(await loadExactBaniReading(21, 'long')).toBe(exact)
    expect(writeBaniOfflineCache).toHaveBeenCalledWith(21, 'long', exact)
  })

  it('honors an already aborted selection before fetching or saving a cache hit', async () => {
    vi.mocked(readBaniOfflineCache).mockResolvedValue(reading())
    const controller = new AbortController()
    controller.abort()
    await expect(loadExactBaniReading(21, 'long', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchBani).not.toHaveBeenCalled()
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('cancels while device storage is stalled without fetching or accepting a late cache result', async () => {
    let finish!: (value: BaniFetchResult) => void
    vi.mocked(readBaniOfflineCache).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const controller = new AbortController()
    const outcome = loadExactBaniReading(21, 'long', controller.signal)
    const failure = expect(outcome).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await failure
    finish(reading())
    await Promise.resolve()
    expect(fetchBani).not.toHaveBeenCalled()
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('bounds a stalled device storage read by the request deadline', async () => {
    vi.useFakeTimers()
    vi.mocked(readBaniOfflineCache).mockImplementation(() => new Promise(() => {}))
    const failure = expect(loadExactBaniReading(21, 'long')).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(30_000)
    await failure
    expect(fetchBani).not.toHaveBeenCalled()
  })

  it('aborts the transport and rejects a late result after external cancellation', async () => {
    const controller = new AbortController()
    let finish!: (value: BaniFetchResult) => void
    let transportSignal: AbortSignal | undefined
    vi.mocked(fetchBani).mockImplementation((_id, _length, signal) => {
      transportSignal = signal
      return new Promise(resolve => { finish = resolve })
    })
    const prepared = loadExactBaniReading(21, 'long', controller.signal)
    const failure = expect(prepared).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve(); await Promise.resolve()
    controller.abort()
    expect(transportSignal?.aborted).toBe(true)
    finish(reading())
    await failure
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })

  it('settles at the deadline even if the transport ignores abort, then discards its late scripture', async () => {
    vi.useFakeTimers()
    let finish!: (value: BaniFetchResult) => void
    let transportSignal: AbortSignal | undefined
    vi.mocked(fetchBani).mockImplementation((_id, _length, signal) => {
      transportSignal = signal
      return new Promise(resolve => { finish = resolve })
    })
    const outcome = loadExactBaniReading(21, 'long').then(
      value => ({ status: 'resolved', value }),
      error => ({ status: 'rejected', error }),
    )
    await Promise.resolve(); await Promise.resolve()
    await vi.advanceTimersByTimeAsync(30_000)
    const atDeadline = await Promise.race([outcome, Promise.resolve({ status: 'pending' })])
    expect(transportSignal?.aborted).toBe(true)
    finish(reading())
    await outcome
    expect(atDeadline.status).toBe('rejected')
    expect(writeBaniOfflineCache).not.toHaveBeenCalled()
  })
})

describe('getBaniLengthDestination', () => {
  it('preserves the exact source plus verse before considering the saved target place', () => {
    const target = reading('long', [entry(386, 'D', 1386), entry(386, 'G', 8), entry(400, 'G', 9)])
    const destination = getBaniLengthDestination(currentPath, target, savedPlaces(400), { source: 'G', verseId: 386 })
    const params = new URLSearchParams(destination.path.split('?')[1])
    expect(destination.destination).toBe('same-verse')
    expect(params.get('resumeVerseId')).toBe('386')
    expect(params.get('ang')).toBe('8')
    expect(params.get('sgLength')).toBe('long')
    expect(params.get('baniDbId')).toBe('21')
  })

  it('uses the target length saved place when the current verse is absent', () => {
    const destination = getBaniLengthDestination(currentPath, reading(), savedPlaces(400), { source: 'G', verseId: 999 })
    expect(destination.destination).toBe('saved-place')
    expect(new URLSearchParams(destination.path.split('?')[1]).get('resumeVerseId')).toBe('400')
  })

  it('rejects an ambiguous source-free verse match and falls back to an unambiguous target place', () => {
    const target = reading('long', [entry(386, 'D', 1386), entry(386, 'G', 8), entry(400, 'G', 9)])
    const destination = getBaniLengthDestination(currentPath, target, savedPlaces(400), { verseId: 386 })
    expect(destination.destination).toBe('saved-place')
    expect(new URLSearchParams(destination.path.split('?')[1]).get('resumeVerseId')).toBe('400')
  })

  it('starts deliberately at the beginning when target saved verse is absent or ambiguous', () => {
    const target = reading('long', [entry(386, 'G', 8), entry(386, 'D', 1386)])
    for (const places of [savedPlaces(386), savedPlaces(999), savedPlaces(386, 'short'), {}]) {
      const destination = getBaniLengthDestination(currentPath, target, places, { source: 'G', verseId: 999 })
      const params = new URLSearchParams(destination.path.split('?')[1])
      expect(destination.destination).toBe('beginning')
      expect(params.has('resumeVerseId')).toBe(false)
      expect(params.get('ang')).toBe('8')
      expect(params.get('sgLength')).toBe('long')
    }
  })
})
