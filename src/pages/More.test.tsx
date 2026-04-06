import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import More from './More'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useMusicStore } from '../store/music'
import { useOnboardingStore } from '../store/onboarding'

beforeEach(() => {
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    larivaar: false,
    showVishraam: true,
    lineSpacing: 'relaxed',
    textAlign: 'left',
    fontSize: 22,
    englishSource: 'bdb',
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
  useLocaleStore.setState({ locale: 'en' })
  useMusicStore.setState({
    selectedSoundId: null,
    isPlaying: false,
    volume: 0.6,
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
  fireEvent.click(screen.getAllByRole('button', { name: /^Hindi$/i })[0])
  fireEvent.click(screen.getAllByRole('button', { name: /Punjabi/i })[0])
  fireEvent.click(screen.getByLabelText(/toggle transliteration/i))
  fireEvent.click(screen.getByRole('button', { name: /Larivaar Off/i }))
  fireEvent.click(screen.getByRole('button', { name: /Vishraam On/i }))
  fireEvent.click(screen.getByRole('button', { name: /^Compact$/i }))
  fireEvent.click(screen.getByRole('button', { name: /^Center$/i }))

  const state = useLanguageStore.getState()
  expect(state.scriptMode).toBe('devanagari')
  expect(state.meaningLanguage).toBe('pa')
  expect(state.showTransliteration).toBe(true)
  expect(state.larivaar).toBe(true)
  expect(state.showVishraam).toBe(false)
  expect(state.lineSpacing).toBe('compact')
  expect(state.textAlign).toBe('center')
})

test('persists selected learning level', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /daily reader/i }))
  expect(useOnboardingStore.getState().learningLevel).toBe('daily-reader')
})

test('persists locale, audience, and learning goal', () => {
  render(<MemoryRouter><More /></MemoryRouter>)

  fireEvent.click(screen.getAllByRole('button', { name: /^Punjabi$/i })[1])
  fireEvent.click(screen.getByRole('button', { name: /ਕਿਸ਼ੋਰ/i }))
  fireEvent.click(screen.getByRole('button', { name: /ਸਮਝਣਾ/i }))

  expect(useLocaleStore.getState().locale).toBe('pa')
  expect(useOnboardingStore.getState().audience).toBe('teen')
  expect(useOnboardingStore.getState().learningGoal).toBe('understand')
})

test('toggles ambient playback without clearing the selected sound', () => {
  render(<MemoryRouter><More /></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: /gentle rain/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(true)

  fireEvent.click(screen.getByRole('button', { name: /gentle rain/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(false)
})
