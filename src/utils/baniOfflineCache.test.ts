import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaniFetchResult } from '../api/banidb'
import { readBaniOfflineCache, writeBaniOfflineCache } from './baniOfflineCache'

function buildResult(id: number): BaniFetchResult {
  return {
    entries: [{
      id: `G-1-${id}`,
      scripture: 'SGGS',
      source: 'G',
      ang: 1,
      gurmukhi: `ਪਾਠ ${id}`,
      transliteration: `reading ${id}`,
      translation_en: `Reading ${id}`,
      translation_hi: '',
      translation_pa: '',
      words: [],
    }],
    availableLengths: [],
    resolvedLength: null,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('caches', undefined)
})

describe('baniOfflineCache local fallback', () => {
  it('round-trips exact reader data and bounds fallback storage', async () => {
    for (let baniDbId = 1; baniDbId <= 9; baniDbId += 1) {
      await writeBaniOfflineCache(baniDbId, null, buildResult(baniDbId))
    }

    expect(await readBaniOfflineCache(1, null)).toBeNull()
    expect(await readBaniOfflineCache(9, null)).toEqual(buildResult(9))
  })
})
