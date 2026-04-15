import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SAVED_FEEDBACK_TTL_MS, buildVocabFeedbackId, useSavedFeedbackStore } from './savedFeedback'

beforeEach(() => {
  vi.useFakeTimers()
  useSavedFeedbackStore.getState().clearSaved()
})

afterEach(() => {
  vi.useRealTimers()
})

test('records the latest saved item and clears it after the feedback ttl', () => {
  useSavedFeedbackStore.getState().recordSaved({
    kind: 'learn',
    targetId: 'topic-anxiety',
    surfacedAt: '2026-04-11T11:00:00.000Z',
  })

  expect(useSavedFeedbackStore.getState().lastSaved).toEqual({
    kind: 'learn',
    targetId: 'topic-anxiety',
    surfacedAt: '2026-04-11T11:00:00.000Z',
  })

  vi.advanceTimersByTime(SAVED_FEEDBACK_TTL_MS - 1)
  expect(useSavedFeedbackStore.getState().lastSaved?.targetId).toBe('topic-anxiety')

  vi.advanceTimersByTime(1)
  expect(useSavedFeedbackStore.getState().lastSaved).toBeNull()
})

test('builds stable review-bank feedback ids for vocab items', () => {
  expect(buildVocabFeedbackId({ word: 'ਸਬਰ' })).toBe('word:ਸਬਰ')
  expect(buildVocabFeedbackId({ word: 'ਸਤਿ ਨਾਮੁ', kind: 'phrase' })).toBe('phrase:ਸਤਿ ਨਾਮੁ')
})
