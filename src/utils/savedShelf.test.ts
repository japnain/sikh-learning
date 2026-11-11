import { describe, expect, it } from 'vitest'
import type { Bookmark } from '../store/bookmarks'
import { renderScriptText } from './readerDisplay'
import { matchesSavedSearch, savedPassageMatches, savedReviewPath, selectSavedMeaning } from './savedShelf'

const passage: Bookmark = { id: 'saved-1', type: 'verse', source: 'G', ang: 1, title: 'Opening verse', excerpt: 'ਸਤਿ ਨਾਮੁ', transliteration: 'sat naam', translation_en: 'True name', savedAt: '2026-01-01T00:00:00Z' }

describe('saved shelf retrieval', () => {
  it('finds romanization, visible references, full source names and displayed script', () => {
    for (const query of ['sat naam', 'SGGS · Ang 1', 'Sri Guru Granth Sahib Ji', 'true name', renderScriptText(passage.excerpt!, 'devanagari')]) {
      expect(savedPassageMatches(passage, query, 'devanagari'), query).toBe(true)
    }
    expect(savedPassageMatches(passage, 'Dasam', 'devanagari')).toBe(false)
    const book: Bookmark = { id: 'book', type: 'book', title: 'Panth Prakash', workId: 'panth-prakash-english', chapterId: 'episode-1', chapterLabel: 'Episode 1', savedAt: passage.savedAt }
    expect(savedPassageMatches(book, 'Book · Episode 1', 'gurmukhi')).toBe(true)
    expect(matchesSavedSearch(['A story about honest work'], ' work  STORY ')).toBe(true)
  })

  it('honors meanings off and reports the actual language of a fallback', () => {
    expect(selectSavedMeaning({ en: 'English', hi: 'हिन्दी' }, 'hi')).toEqual({ text: 'हिन्दी', lang: 'hi' })
    expect(selectSavedMeaning({ en: 'English' }, 'pa')).toEqual({ text: 'English', lang: 'en' })
    expect(selectSavedMeaning({ pa: 'ਪੰਜਾਬੀ' }, 'hi')).toEqual({ text: 'ਪੰਜਾਬੀ', lang: 'pa' })
    expect(selectSavedMeaning({ en: 'English' }, 'none')).toBeNull()
  })

  it('links a saved phrase to a filtered review destination', () => {
    const path = savedReviewPath({ word: 'ਸਤਿ ਨਾਮੁ', kind: 'phrase', transliteration: 'sat naam', meaning_en: 'True name', meaning_pa: '', meaning_hi: '', scripture: 'SGGS', sourceId: 'G', savedAt: passage.savedAt })
    const url = new URL(path, 'https://naamras.test')
    expect(url.pathname).toBe('/vocab')
    expect(url.searchParams.get('kind')).toBe('phrase')
    expect(url.searchParams.get('q')).toBe('ਸਤਿ ਨਾਮੁ')
  })
})
