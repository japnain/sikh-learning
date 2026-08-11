import { describe, expect, test } from 'vitest'
import { buildReaderOriginNavigationState } from './libraryReaderNavigation'

describe('reader origin navigation state', () => {
  test('uses the state key expected by each reader while preserving the exact origin', () => {
    const origin = '/banis?query=khalsa&mode=english&collection=books'

    expect(buildReaderOriginNavigationState('/study?shabadId=12', origin)).toEqual({
      readerOrigin: origin,
    })
    expect(buildReaderOriginNavigationState('/library/panth-prakash-english/chapters/episode-001', origin)).toEqual({
      libraryReaderOrigin: origin,
    })
  })

  test('does not attach reader state to unrelated destinations', () => {
    expect(buildReaderOriginNavigationState('/banis/amrit-keertan', '/banis?query=amrit')).toBeUndefined()
  })
})
