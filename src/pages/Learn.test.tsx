import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Learn from './Learn'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useVocabStore } from '../store/vocab'
import type { LearnProgramId, LearnProgramProgress, LearnPlacementResult } from '../types'

function createProgramProgress(): Record<LearnProgramId, LearnProgramProgress> {
  return {
    'start-reading': { currentModuleId: null, completedModuleIds: [] },
    'build-fluency': { currentModuleId: null, completedModuleIds: [] },
    'understand-gurbani': { currentModuleId: null, completedModuleIds: [] },
    'deep-study': { currentModuleId: null, completedModuleIds: [] },
  }
}

function createPlacementResult(
  overrides: Partial<LearnPlacementResult> = {}
): LearnPlacementResult {
  return {
    confidence: 'steady',
    readingScore: 0.58,
    meaningScore: 0.62,
    programId: 'start-reading',
    supportDensity: 'guided',
    placedAt: '2026-04-06T12:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
  useVocabStore.setState({ vocab: [] })
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
    activeProgramId: 'start-reading',
    programProgress: createProgramProgress(),
    queuedReviewModuleIds: [],
    placementResult: null,
    lastLearnActivity: null,
  })
})

test('renders the placement-first Learn structure', () => {
  render(<MemoryRouter><Learn /></MemoryRouter>)

  expect(screen.getByText(/Placement/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Set my default path/i })).toBeInTheDocument()
  expect(screen.getByText(/^Continue$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Programs$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Applied Practice$/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Program 1 Start Reading/i })).toBeInTheDocument()
})

test('placement can route an immersed reader into deep study', () => {
  render(<MemoryRouter><Learn /></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: /Already immersed/i }))
  fireEvent.click(screen.getByRole('button', { name: /I can read lines with reasonable flow/i }))
  fireEvent.click(screen.getByRole('button', { name: /I want translation contrast, themes, and longer reflections/i }))
  fireEvent.click(screen.getByRole('button', { name: /Set my default path/i }))

  const state = useLearningStore.getState()
  expect(state.placementResult?.programId).toBe('deep-study')
  expect(state.activeProgramId).toBe('deep-study')
  expect(state.programProgress['deep-study'].currentModuleId).toBe('deep-opening-contrast')
})

test('prioritizes due review over net-new content in today card', () => {
  useLearningStore.setState({
    placementResult: createPlacementResult(),
    activeProgramId: 'start-reading',
    programProgress: {
      ...createProgramProgress(),
      'start-reading': { currentModuleId: 'start-core-letters', completedModuleIds: [] },
    },
  })
  useVocabStore.setState({
    vocab: [
      {
        kind: 'phrase',
        word: 'ੴ ਸਤਿ ਨਾਮੁ',
        transliteration: 'ik oankaar sat naam',
        meaning_en: 'One Universal Creator, Truth is the Name.',
        meaning_hi: 'एक ओंकार, सत्य नाम।',
        meaning_pa: 'ਇੱਕ ਓਅੰਕਾਰ, ਸਤਿ ਨਾਮੁ।',
        scripture: 'Japji Sahib',
        sourceId: 'G',
        savedAt: '2026-04-01T12:00:00.000Z',
      },
    ],
  })

  render(<MemoryRouter><Learn /></MemoryRouter>)

  expect(screen.getByText(/1 review item due/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Open review bank/i })).toBeInTheDocument()
})

test('starts an applied practice journey for the active program', () => {
  useLearningStore.setState({
    placementResult: createPlacementResult(),
    activeProgramId: 'start-reading',
    programProgress: {
      ...createProgramProgress(),
      'start-reading': { currentModuleId: 'start-core-letters', completedModuleIds: [] },
    },
  })

  render(<MemoryRouter><Learn /></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: /Start practice/i }))

  expect(useLearningStore.getState().activeJourneyId).toBe('journey-japji-opening')
})
