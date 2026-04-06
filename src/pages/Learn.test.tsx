import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Learn from './Learn'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
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

test('renders the Learn 2.0 track system', () => {
  render(<MemoryRouter><Learn /></MemoryRouter>)

  expect(screen.getByText(/today's next step/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /start foundations/i })).toBeInTheDocument()
  expect(screen.getByText(/Learn 2.0/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Foundations$/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Phonics/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Guided Gurbani/i })).toBeInTheDocument()
})

test('records phonics practice attempts', () => {
  render(<MemoryRouter><Learn /></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: /Phonics/i }))
  fireEvent.click(screen.getByRole('button', { name: /Reveal/i }))
  fireEvent.click(screen.getByRole('button', { name: /^Clear$/i }))

  expect(useLearningStore.getState().assessmentHistory[0]?.lessonId).toBe('phonics-sassa-haha')
})

test('starts a guided journey from Learn', () => {
  render(<MemoryRouter><Learn /></MemoryRouter>)

  fireEvent.click(screen.getAllByRole('button', { name: /start journey/i })[0])
  expect(useLearningStore.getState().activeJourneyId).toBeTruthy()
})
