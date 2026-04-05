import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import More from './More'
import { useLanguageStore } from '../store/language'
import { useOnboardingStore } from '../store/onboarding'

beforeEach(() => {
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    fontSize: 22,
    englishSource: 'bdb',
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    learningLevel: 'beginner',
  })
})

test('renders English translation source controls', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  expect(screen.getByText(/^English translation$/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /BaniDB/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Manmohan Singh/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Sant Singh Khalsa/i })).toBeInTheDocument()
})

test('persists selected English source', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /Manmohan Singh/i }))
  expect(useLanguageStore.getState().englishSource).toBe('ms')
})

test('persists reader display defaults', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getAllByRole('button', { name: /Hindi/i })[0])
  fireEvent.click(screen.getByRole('button', { name: /Punjabi/i }))
  fireEvent.click(screen.getByLabelText(/toggle transliteration/i))

  const state = useLanguageStore.getState()
  expect(state.scriptMode).toBe('devanagari')
  expect(state.meaningLanguage).toBe('pa')
  expect(state.showTransliteration).toBe(true)
})

test('persists selected learning level', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /daily reader/i }))
  expect(useOnboardingStore.getState().learningLevel).toBe('daily-reader')
})
