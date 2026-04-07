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
    streakCalendar: {},
    longestStreak: 0,
    earnedMilestoneIds: [],
    pendingMilestoneId: null,
    dailyLesson: null,
    skills: {},
    lessonProgress: {},
    assessmentHistory: [],
    journeys: {},
    activeJourneyId: null,
    activeProgramId: 'start-reading',
    programProgress: {
      'start-reading': { currentModuleId: null, completedModuleIds: [] },
      'build-fluency': { currentModuleId: null, completedModuleIds: [] },
      'understand-gurbani': { currentModuleId: null, completedModuleIds: [] },
      'deep-study': { currentModuleId: null, completedModuleIds: [] },
    },
    queuedReviewModuleIds: [],
    placementResult: null,
    lastLearnActivity: null,
    grammarNotesSeen: [],
    masteredWordFamilyIds: [],
    themePathProgress: {},
    completedThemePathIds: [],
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

test('records streak calendar history and longest streak', () => {
  const store = useLearningStore.getState()

  store.recordStreakDay('2026-04-01')
  store.recordStreakDay('2026-04-02')
  store.recordStreakDay('2026-04-04')

  const state = useLearningStore.getState()
  expect(state.streakCalendar['2026-04-01']).toBe(true)
  expect(state.streakCalendar['2026-04-02']).toBe(true)
  expect(state.streakCalendar['2026-04-04']).toBe(true)
  expect(state.practiceStreak).toBe(1)
  expect(state.longestStreak).toBe(2)
})

test('earns milestones only once and clears pending state', () => {
  useLearningStore.getState().earnMilestone('first-module-complete')
  useLearningStore.getState().earnMilestone('first-module-complete')

  expect(useLearningStore.getState().earnedMilestoneIds).toEqual(['first-module-complete'])
  expect(useLearningStore.getState().pendingMilestoneId).toBe('first-module-complete')

  useLearningStore.getState().clearPendingMilestone()
  expect(useLearningStore.getState().pendingMilestoneId).toBe(null)
})

test('tracks daily lesson completion against the lesson date', () => {
  useLearningStore.getState().setDailyLesson({
    date: '2026-04-07',
    steps: [
      { id: 'module:one', kind: 'module', title: 'One', estimatedSeconds: 120, moduleId: 'start-core-letters' },
      { id: 'module:two', kind: 'module', title: 'Two', estimatedSeconds: 120, moduleId: 'start-matras' },
    ],
    completedStepIds: [],
    generatedAt: '2026-04-07T00:00:00',
    totalEstimatedSeconds: 240,
  })

  useLearningStore.getState().completeDailyLessonStep('module:one', '2026-04-07')
  useLearningStore.getState().completeDailyLessonStep('module:two', '2026-04-06')

  expect(useLearningStore.getState().dailyLesson?.completedStepIds).toEqual(['module:one'])
})

test('migrates older persisted state into version 3 defaults', async () => {
  localStorage.setItem('sikh-learning-state', JSON.stringify({
    state: {
      masteredSymbols: ['ੳ'],
      completedLessons: ['start-core-letters'],
      practiceStreak: 1,
      lastPracticedOn: '2026-04-07',
      totalPracticeSessions: 3,
      skills: {},
      lessonProgress: {},
      assessmentHistory: [],
      journeys: {},
      activeJourneyId: null,
      activeProgramId: 'start-reading',
      programProgress: {
        'start-reading': { currentModuleId: 'start-matras', completedModuleIds: ['start-core-letters'] },
        'build-fluency': { currentModuleId: null, completedModuleIds: [] },
        'understand-gurbani': { currentModuleId: null, completedModuleIds: [] },
        'deep-study': { currentModuleId: null, completedModuleIds: [] },
      },
      queuedReviewModuleIds: [],
      placementResult: null,
      lastLearnActivity: null,
    },
    version: 2,
  }))

  await useLearningStore.persist.rehydrate()

  const state = useLearningStore.getState()
  expect(state.streakCalendar['2026-04-07']).toBe(true)
  expect(state.longestStreak).toBe(1)
  expect(state.earnedMilestoneIds).toEqual([])
  expect(state.pendingMilestoneId).toBe(null)
  expect(state.dailyLesson).toBe(null)
  expect(state.grammarNotesSeen).toEqual([])
  expect(state.themePathProgress).toEqual({})
})

test('tracks guided journey progress', () => {
  useLearningStore.getState().startJourney('journey-japji-opening')
  useLearningStore.getState().completeJourneyStep('journey-japji-opening', 'japji-foundation', 4)

  const state = useLearningStore.getState()
  expect(state.activeJourneyId).toBe('journey-japji-opening')
  expect(state.journeys['journey-japji-opening']?.completedStepIds).toContain('japji-foundation')
})

test('completes modules and queues related review work', () => {
  useLearningStore.setState({
    activeProgramId: 'start-reading',
    programProgress: {
      'start-reading': { currentModuleId: 'start-core-letters', completedModuleIds: [] },
      'build-fluency': { currentModuleId: null, completedModuleIds: [] },
      'understand-gurbani': { currentModuleId: null, completedModuleIds: [] },
      'deep-study': { currentModuleId: null, completedModuleIds: [] },
    },
    queuedReviewModuleIds: [],
  })

  useLearningStore.getState().completeModule('start-reading', 'start-core-letters', ['start-matras'])

  const state = useLearningStore.getState()
  expect(state.programProgress['start-reading'].completedModuleIds).toContain('start-core-letters')
  expect(state.programProgress['start-reading'].currentModuleId).toBe(null)
  expect(state.queuedReviewModuleIds).toContain('start-matras')
})
