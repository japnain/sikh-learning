import { describe, expect, test } from 'vitest'
import { validPrivateReadingState } from '../../supabase/functions/private-library/annotations'
import type { PrivateBookMetadata } from '../../supabase/functions/private-library/contract'

const time = '2026-11-17T12:00:00.000Z'
const text = { id: 'note-1', kind: 'text', index: 0, blockId: 'chapter-0001-b00001', start: 2, end: 7, quote: 'hello', color: 'yellow', createdAt: time, updatedAt: time }
const page = { id: 'note-2', kind: 'page', index: 0, note: 'A page note', createdAt: time, updatedAt: time }
const chapterBook: PrivateBookMetadata = { id: 'book', title: 'Book', authors: [], description: '', category: '', language: 'en', formats: ['epub'], renderer: 'chapters', editionVersion: 'v1', contents: [{ id: 'chapter-0001', title: 'First' }] }

describe('bounded private reading and annotation schema', () => {
  test('retains the known optional legacy locator and bookmark shape', () => {
    expect(validPrivateReadingState({})).toBe(true)
    expect(validPrivateReadingState({ index: 0, offset: 10.5, progress: .4, completed: false, blockId: 'chapter-0001-b00001', blockOffset: .5,
      bookmarks: [{ id: 'bookmark', index: 0, offset: 20.5, label: 'My place', createdAt: time }], updatedAt: time }, chapterBook)).toBe(true)
    expect(validPrivateReadingState({ charOffset: 1_000_000, annotations: [text, page] }, chapterBook)).toBe(true)
  })

  test('rejects unknown root, annotation, bookmark and deletion fields instead of persisting them', () => {
    for (const state of [
      { sourceUrl: 'https://external.invalid/file' }, { ownerId: 'another-user' },
      { annotations: [{ ...text, html: '<script>unsafe()</script>' }] },
      { bookmarks: [{ id: 'bookmark', index: 0, offset: 0, label: '', createdAt: time, data: {} }] },
      { annotationDeletes: [{ id: 'deleted', updatedAt: time, bookId: 'other-book' }] },
      JSON.parse('{"__proto__":{"admin":true}}'),
    ]) expect(validPrivateReadingState(state)).toBe(false)
  })

  test('checks exact UTF-16 quote ranges, safe positions, colors and chronology', () => {
    expect(validPrivateReadingState({ annotations: [{ ...text, start: 0, end: 2, quote: '😀' }] })).toBe(true)
    for (const patch of [{ start: -1 }, { start: .1 }, { end: 1_000_001 }, { end: 2 }, { quote: 'shorter' },
      { quote: ' '.repeat(5) }, { color: 'url(https://bad.invalid)' }, { blockId: '../file' },
      { updatedAt: '2026-02-30T00:00:00.000Z' }, { updatedAt: '2026-11-16T12:00:00.000Z' },
      { start: Number.MAX_SAFE_INTEGER + 1 }, { note: 'a'.repeat(2001) }]) {
      expect(validPrivateReadingState({ annotations: [{ ...text, ...patch }] }), JSON.stringify(patch)).toBe(false)
    }
    expect(validPrivateReadingState({ annotations: [{ ...text, start: 0, end: 1001, quote: 'a'.repeat(1001) }] })).toBe(false)
    for (const value of [-1, .5, Infinity, NaN, 1_000_001, '1']) {
      expect(validPrivateReadingState({ charOffset: value })).toBe(false)
      expect(validPrivateReadingState({ bookmarks: [{ id: 'mark', index: 0, offset: 0, label: '', createdAt: time, charOffset: value }] })).toBe(false)
    }
  })

  test('allows empty text notes while requiring nonblank page notes', () => {
    expect(validPrivateReadingState({ annotations: [{ ...text, note: '' }] })).toBe(true)
    expect(validPrivateReadingState({ annotations: [{ ...page, note: ' '.repeat(5) }] })).toBe(false)
    expect(validPrivateReadingState({ annotations: [{ ...page, color: 'yellow' }] })).toBe(false)
    expect(validPrivateReadingState({ annotations: [{ ...page, kind: 'unknown' }] })).toBe(false)
  })

  test('bounds counts, rejects duplicate IDs and distinguishes merge input from explicit deletes', () => {
    const notes = Array.from({ length: 128 }, (_, index) => ({ ...page, id: `note-${index}` }))
    expect(validPrivateReadingState({ annotations: notes })).toBe(true)
    expect(validPrivateReadingState({ annotations: [...notes, { ...page, id: 'one-too-many' }] })).toBe(false)
    expect(validPrivateReadingState({ annotations: [text, text] })).toBe(false)
    expect(validPrivateReadingState({ annotations: [], annotationDeletes: [{ id: text.id, updatedAt: time }] })).toBe(true)
    expect(validPrivateReadingState({ annotations: [text], annotationDeletes: [{ id: text.id, updatedAt: time }] })).toBe(false)
    expect(validPrivateReadingState({ annotationDeletes: [{ id: text.id, updatedAt: time }, { id: text.id, updatedAt: time }] })).toBe(false)
    expect(validPrivateReadingState({ annotationDeletes: notes.map(({ id, updatedAt }) => ({ id, updatedAt })).concat({ id: 'extra', updatedAt: time }) })).toBe(false)
  })

  test('bounds current-book section/page indices without invalidating old-edition reads', () => {
    expect(validPrivateReadingState({ annotations: [{ ...text, index: 1 }] }, chapterBook)).toBe(false)
    expect(validPrivateReadingState({ annotations: [{ ...text, index: 1 }] })).toBe(true)
    const pdf: PrivateBookMetadata = { ...chapterBook, renderer: 'pdf', formats: ['pdf'], pageCount: 5, contents: [] }
    expect(validPrivateReadingState({ annotations: [text] }, pdf)).toBe(false)
    expect(validPrivateReadingState({ annotations: [{ ...page, index: 4 }] }, pdf)).toBe(true)
    expect(validPrivateReadingState({ index: 5 }, pdf)).toBe(false)
    expect(validPrivateReadingState({ annotations: [{ ...page, index: 10_000 }] })).toBe(false)
  })
})
