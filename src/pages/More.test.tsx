import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import More from './More'
import { UI_DISCLOSURE_STORAGE_KEY } from '../hooks/usePersistentDisclosure'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useMusicStore } from '../store/music'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'

beforeEach(() => {
  window.localStorage.removeItem(UI_DISCLOSURE_STORAGE_KEY)
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
    punjabiSource: 'ss',
    hindiSource: 'ss',
    visraamSource: 'sttm',
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    presentationMode: 'overlay',
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
  useNitemStore.setState({
    completedDate: '2026-04-11',
    completedIds: [],
    selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
    completionTrackingEnabled: false,
  })
  useSundarGutkaLengthStore.setState({
    lengths: {
      'chaupai-sahib': 'short',
      'rehras-sahib': 'short',
      aarti: 'short',
      'kirtan-sohila': 'short',
    },
  })
})

function openMoreSection(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function getTranslationSourceGroup(label: string) {
  const translationSourceSection = screen.getByTestId('more-translation-source')
  const heading = within(translationSourceSection).getByText(new RegExp(`^${label}$`, 'i'))
  const group = heading.nextElementSibling
  if (!(group instanceof HTMLElement)) {
    throw new Error(`Missing translation source group for ${label}`)
  }
  return within(group)
}

test('renders English translation source controls', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  openMoreSection(/Reader Defaults/i)
  const englishSources = getTranslationSourceGroup('English translation')
  expect(screen.getByText(/^English translation$/i)).toBeInTheDocument()
  expect(englishSources.getByRole('button', { name: /Standard/i })).toBeInTheDocument()
  expect(englishSources.getByRole('button', { name: /Manmohan Singh/i })).toBeInTheDocument()
  expect(englishSources.getByRole('button', { name: /Sant Singh Khalsa/i })).toBeInTheDocument()
})

test('persists selected English source', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  openMoreSection(/Reader Defaults/i)
  fireEvent.click(getTranslationSourceGroup('English translation').getByRole('button', { name: /Manmohan Singh/i }))
  expect(useLanguageStore.getState().englishSource).toBe('ms')
})

test('persists reader display defaults', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  openMoreSection(/Reader Defaults/i)
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
  openMoreSection(/Profile & App Language/i)
  fireEvent.click(screen.getByRole('button', { name: /daily reader/i }))
  expect(useOnboardingStore.getState().learningLevel).toBe('daily-reader')
})

test('persists locale, audience, and learning goal', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  openMoreSection(/Profile & App Language/i)

  fireEvent.click(screen.getByRole('button', { name: /^Punjabi$/i }))
  fireEvent.click(screen.getByRole('button', { name: /ਕਿਸ਼ੋਰ/i }))
  fireEvent.click(screen.getByRole('button', { name: /ਸਮਝਣਾ/i }))

  expect(useLocaleStore.getState().locale).toBe('pa')
  expect(useOnboardingStore.getState().audience).toBe('teen')
  expect(useOnboardingStore.getState().learningGoal).toBe('understand')
})

test('toggles ambient playback without clearing the selected sound', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /expand soundscapes/i }))

  fireEvent.click(screen.getByRole('button', { name: /heavy thunderstorm/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(true)

  fireEvent.click(screen.getByRole('button', { name: /heavy thunderstorm/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(false)
})

test('pause button stops playback without clearing the selected sound', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /expand soundscapes/i }))

  fireEvent.click(screen.getByRole('button', { name: /heavy thunderstorm/i }))
  expect(useMusicStore.getState().isPlaying).toBe(true)

  fireEvent.click(screen.getByRole('button', { name: /pause soundscape/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(false)
})

test('heavy More sections start collapsed while Grow and About stay visible', () => {
  render(<MemoryRouter><More /></MemoryRouter>)

  expect(screen.getByRole('button', { name: /expand soundscapes/i })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: /keep naamras with you across devices/i })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByTestId('more-open-nitnem-customize')).toHaveAttribute('href', '/nitnem/customize')
  expect(screen.getByRole('button', { name: /reader defaults/i })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: /profile & app language/i })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByTestId('more-nitnem-completion')).not.toBeInTheDocument()
  expect(screen.queryByText(/^English translation$/i)).not.toBeInTheDocument()
  expect(screen.getByText(/Open Learn/i)).toBeInTheDocument()
  expect(screen.getByTestId('more-about')).toBeInTheDocument()
})

test('Daily Nitnem management links to the dedicated customize page', () => {
  render(<MemoryRouter><More /></MemoryRouter>)

  expect(screen.getByTestId('more-daily-nitnem-link')).toHaveTextContent(/daily nitnem/i)
  expect(screen.getByTestId('more-open-nitnem-customize')).toHaveAttribute('href', '/nitnem/customize')
  expect(screen.queryByTestId('more-nitnem-ritual-order')).not.toBeInTheDocument()
})

test('full soundscape library collapses without clearing playback state', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /expand soundscapes/i }))

  fireEvent.click(screen.getByRole('button', { name: /heavy thunderstorm/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(true)

  fireEvent.click(screen.getByRole('button', { name: /collapse soundscapes/i }))
  expect(screen.queryByRole('button', { name: /heavy thunderstorm/i })).not.toBeInTheDocument()
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(true)

  fireEvent.click(screen.getByRole('button', { name: /pause soundscape/i }))
  expect(useMusicStore.getState().selectedSoundId).toBe('gentle-rain')
  expect(useMusicStore.getState().isPlaying).toBe(false)

  fireEvent.click(screen.getByRole('button', { name: /expand soundscapes/i }))
  expect(screen.getByRole('button', { name: /heavy thunderstorm/i })).toBeInTheDocument()
})

test('shared disclosure controls use the icon-surface affordance', () => {
  render(<MemoryRouter><More /></MemoryRouter>)

  expect(screen.getByRole('button', { name: /expand soundscapes/i })).toHaveClass('icon-surface')
})

test('More disclosure state persists across remounts', () => {
  window.localStorage.setItem(UI_DISCLOSURE_STORAGE_KEY, JSON.stringify({
    "more-reader-defaults": true,
  }))

  render(<MemoryRouter><More /></MemoryRouter>)

  expect(screen.getByRole('button', { name: /Reader Defaults/i })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText(/^English translation$/i)).toBeInTheDocument()
})
