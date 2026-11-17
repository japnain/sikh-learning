import { beforeEach, expect, test, vi } from 'vitest'
import { buildVocabReturnPath, readVocabView, rememberVocabView, type VocabViewState } from './vocabView'
import { resetPersonalStorageOwnerForTests, selectPersonalStorageOwner } from './ownerStorage'

beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); resetPersonalStorageOwnerForTests() })

test('retains a review queue only in the account that created it', () => {
  const view: VocabViewState = { mode: 'review', query: '', kind: 'all', sort: 'newest', cardIndex: 0, revealed: false, reviewQueue: ['account-a-only'] }
  selectPersonalStorageOwner('review-account-a')
  rememberVocabView(view)
  selectPersonalStorageOwner('review-account-b')
  expect(readVocabView('?mode=review').reviewQueue).toBeNull()
  selectPersonalStorageOwner('review-account-a')
  expect(readVocabView('?mode=review').reviewQueue).toEqual(view.reviewQueue)
  resetPersonalStorageOwnerForTests()
})

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
