import { beforeEach, expect, test } from 'vitest'
import { useLearningStore } from './learning'

beforeEach(() => {
  localStorage.clear()
  useLearningStore.setState({
    masteredSymbols: [],
    completedLessons: [],
    practiceStreak: 0,
    lastPracticedOn: undefined,
    totalPracticeSessions: 0,
  })
})

test('tracks mastered symbols and completed lessons', () => {
  useLearningStore.getState().toggleMasteredSymbol('ੳ')
  useLearningStore.getState().completeLesson('letters')

  const state = useLearningStore.getState()
  expect(state.masteredSymbols).toContain('ੳ')
  expect(state.completedLessons).toContain('letters')
})

test('records practice sessions', () => {
  useLearningStore.getState().recordPracticeSession()
  const state = useLearningStore.getState()

  expect(state.practiceStreak).toBe(1)
  expect(state.totalPracticeSessions).toBe(1)
  expect(state.lastPracticedOn).toBeTruthy()
})
