import { beforeEach, expect, test, vi } from 'vitest'
import { buildVocabReturnPath, readVocabView, rememberVocabView, type VocabViewState } from './vocabView'

beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })

test('retains the review queue only for the matching vocabulary return path', () => {
  const view: VocabViewState = { mode: 'review', query: 'ਸਤਿ ਨਾਮੁ', kind: 'phrase', sort: 'oldest', cardIndex: 0,
    revealed: true, reviewQueue: ['second', 'third', 'first'] }
  const path = buildVocabReturnPath(view)
  rememberVocabView(view)
  expect(readVocabView(path.slice('/vocab'.length))).toEqual(view)
  expect(readVocabView('?mode=review').reviewQueue).toBeNull()
})

test('invalid query and transient storage cannot create an unsafe destination or invalid card state', () => {
  sessionStorage.setItem('naamras-vocab-return-view', '{broken')
  const view = readVocabView('?mode=unknown&kind=anything&sort=wrong&card=-3&returnTo=https://evil.example')
  expect(buildVocabReturnPath(view)).toBe('/vocab')
  expect(view.reviewQueue).toBeNull()
  expect(view.cardIndex).toBe(0)
  vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
  expect(() => rememberVocabView({ ...view, mode: 'flashcard', cardIndex: 2, revealed: true })).not.toThrow()
})
