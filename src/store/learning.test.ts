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
    skills: {},
    lessonProgress: {},
    assessmentHistory: [],
    journeys: {},
    activeJourneyId: null,
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

test('tracks guided journey progress', () => {
  useLearningStore.getState().startJourney('journey-japji-opening')
  useLearningStore.getState().completeJourneyStep('journey-japji-opening', 'japji-foundation', 4)

  const state = useLearningStore.getState()
  expect(state.activeJourneyId).toBe('journey-japji-opening')
  expect(state.journeys['journey-japji-opening']?.completedStepIds).toContain('japji-foundation')
})
