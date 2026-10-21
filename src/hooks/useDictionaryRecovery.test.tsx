import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchKoshEntries } from '../api/banidb'
import { fetchMahanKoshEntries } from '../api/mahankosh'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { BanidbKoshDefinition, MahanKoshEntry } from '../types'
import { useBanidbKosh } from './useBanidbKosh'
import { useMahanKosh } from './useMahanKosh'

vi.mock('../api/banidb', () => ({ fetchKoshEntries: vi.fn() }))
vi.mock('../api/mahankosh', () => ({ fetchMahanKoshEntries: vi.fn() }))

const koshEntry: BanidbKoshDefinition = {
  id: 1, word: 'ਸਤਿ', wordUni: 'ਸਤਿ', definition: 'Truth', definitionUni: 'ਸੱਚ',
}
const mahanEntry: MahanKoshEntry = {
  id: 1, word: 'ਸਤਿ', searchKey: 'ਸਤਿ', transliteration: 'sat', roman: 'sat', hindi: '',
  description: 'ਸੱਚ', description_hi: '', exactMatch: true, sourceUrl: 'https://example.com/word',
}

beforeEach(() => {
  localStorage.clear()
  useScriptureCacheStore.getState().clearAll()
  vi.mocked(fetchKoshEntries).mockReset()
  vi.mocked(fetchMahanKoshEntries).mockReset()
})

describe.each([
  {
    name: 'BaniDB Kosh', useLookup: useBanidbKosh, fetch: vi.mocked(fetchKoshEntries), entry: koshEntry,
    setCache: (entries: Array<BanidbKoshDefinition | MahanKoshEntry>) => useScriptureCacheStore.getState().setBanidbKosh('ਸਤਿ', entries as BanidbKoshDefinition[]),
    getCache: (word: string) => useScriptureCacheStore.getState().getBanidbKosh(word),
    setter: 'setBanidbKosh' as const,
  },
  {
    name: 'Mahankosh', useLookup: useMahanKosh, fetch: vi.mocked(fetchMahanKoshEntries), entry: mahanEntry,
    setCache: (entries: Array<BanidbKoshDefinition | MahanKoshEntry>) => useScriptureCacheStore.getState().setMahanKosh('ਸਤਿ', entries as MahanKoshEntry[]),
    getCache: (word: string) => useScriptureCacheStore.getState().getMahanKosh(word),
    setter: 'setMahanKosh' as const,
  },
])('$name recovery', ({ useLookup, fetch, entry, setCache, getCache, setter }) => {
  it('retries a failed lookup in place and clears its issue after success', async () => {
    fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([entry] as never)
    const { result } = renderHook(() => useLookup('ਸਤਿ'))
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.error).toBe('offline')

    act(() => result.current.retry())
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.entries).toEqual([entry])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('keeps cached definitions visible throughout a failed explicit refresh', async () => {
    const entries = [entry]
    setCache(entries)
    fetch.mockRejectedValueOnce(new Error('network unavailable'))
    const { result } = renderHook(() => useLookup('ਸਤਿ'))
    expect(result.current.status).toBe('ready')
    expect(fetch).not.toHaveBeenCalled()

    act(() => result.current.retry())
    expect(result.current.entries).toBe(entries)
    expect(result.current.loading).toBe(true)
    expect(result.current.refreshing).toBe(true)
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toBe(entries)
    expect(result.current.loading).toBe(false)
  })

  it('treats a successful empty result as missing, without a false failure or automatic retries', async () => {
    fetch.mockResolvedValue([])
    const { result } = renderHook(() => useLookup('ਸਤਿ'))
    await waitFor(() => expect(result.current.status).toBe('empty'))
    expect(result.current.error).toBeNull()
    expect(result.current.entries).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not let an obsolete word response overwrite the newly selected word', async () => {
    let resolveOld!: (entries: never) => void
    fetch.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce([{ ...entry, word: 'ਨਾਮੁ' }] as never)
    const { result, rerender } = renderHook(({ word }) => useLookup(word), { initialProps: { word: 'ਸਤਿ' } })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    rerender({ word: 'ਨਾਮੁ' })
    expect(result.current.entries).toEqual([])
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(async () => resolveOld([entry] as never))

    expect(result.current.normalizedWord).toBe('ਨਾਮੁ')
    expect(result.current.entries[0]?.word).toBe('ਨਾਮੁ')
    expect(getCache('ਸਤਿ')).toBeUndefined()
  })

  it('keeps a successful lookup usable if saving the cache fails, including after another failed retry', async () => {
    const cacheSetter = vi.spyOn(useScriptureCacheStore.getState(), setter).mockImplementation(() => { throw new Error('Storage full') })
    fetch.mockResolvedValueOnce([entry] as never).mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useLookup('ਸਤਿ'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.entries).toEqual([entry])
    expect(result.current.error).toBeNull()
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.entries).toEqual([entry])
    cacheSetter.mockRestore()
  })

  it('does not fetch or retry an empty lookup', () => {
    const { result } = renderHook(() => useLookup('  '))
    act(() => result.current.retry())
    expect(result.current.status).toBe('empty')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ignores a response that arrives after the word sheet unmounts', async () => {
    let resolveLookup!: (entries: never) => void
    fetch.mockImplementationOnce(() => new Promise(resolve => { resolveLookup = resolve }))
    const { unmount } = renderHook(() => useLookup('ਸਤਿ'))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    unmount()
    await act(async () => resolveLookup([entry] as never))
    expect(getCache('ਸਤਿ')).toBeUndefined()
  })
})
