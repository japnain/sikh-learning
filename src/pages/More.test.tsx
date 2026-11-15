import { act, render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import More from './More'
import { UI_DISCLOSURE_STORAGE_KEY } from '../hooks/usePersistentDisclosure'
import { useLanguageStore } from '../store/language'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useMusicStore } from '../store/music'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useThemeStore } from '../store/theme'
import { getSavedReaderPresentation, resetReaderPresentationSessionPreference, setReaderPresentationPreference } from '../utils/readerPresentation'

beforeEach(() => {
  resetReaderPresentationSessionPreference()
  useCloudSyncStore.getState().reset()
  window.localStorage.removeItem('naamras-reader-presentation')
  window.localStorage.removeItem(UI_DISCLOSURE_STORAGE_KEY)
  useLanguageStore.setState({
    scriptMode: 'gurmukhi', showTransliteration: false, meaningLanguage: 'en', larivaar: false,
    showVishraam: true, lineSpacing: 'relaxed', textAlign: 'left', fontSize: 22,
    supportTextSize: 'standard', englishSource: 'bdb', punjabiSource: 'ss', hindiSource: 'ss', visraamSource: 'sttm',
  })
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.getState().setDark(false)
  useMusicStore.setState({ selectedSoundId: null, selectedPresetId: null, isPlaying: false, playbackError: null, volume: 0.6 })
  useNitemStore.setState({ selectedIds: [...DEFAULT_NITNEM_OPTION_IDS], completionTrackingEnabled: false })
})

afterEach(() => { vi.unstubAllEnvs() })

function renderMore() { return render(<MemoryRouter><More /></MemoryRouter>) }
function openPanel(panel: string) { fireEvent.click(screen.getByTestId(`more-open-${panel}`)) }
function readerSection(name: string) {
  fireEvent.click(within(screen.getByRole('group', { name: 'Reader settings sections' })).getByRole('button', { name, exact: true }))
}
function sources(label: string) {
  const heading = within(screen.getByTestId('more-translation-source')).getByText(new RegExp(`^${label}$`, 'i'))
  if (!(heading.nextElementSibling instanceof HTMLElement)) throw new Error('Missing source group')
  return within(heading.nextElementSibling)
}

test('the compact hub exposes current destinations without mounting long settings panels', () => {
  renderMore()
  for (const key of ['reader', 'appearance', 'sound', 'backup', 'about']) {
    expect(screen.getByTestId(`more-open-${key}`)).toHaveAttribute('aria-haspopup', 'dialog')
  }
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByTestId('more-cloud-sync')).not.toBeInTheDocument()
  expect(screen.queryByTestId('personal-data-panel')).not.toBeInTheDocument()
  expect(screen.queryByTestId('more-appearance')).not.toBeInTheDocument()
  expect(screen.queryByText(/^English translation$/)).not.toBeInTheDocument()
  expect(screen.queryByText(/reading profile|learning profile/i)).not.toBeInTheDocument()
  expect(screen.getByTestId('more-open-nitnem-customize')).toHaveAttribute('href', '/nitnem/customize')
})

test('legacy expanded disclosures do not bring back the long More page', () => {
  localStorage.setItem(UI_DISCLOSURE_STORAGE_KEY, JSON.stringify({ 'more-reader-defaults': true, 'more-cloud-sync': true, 'more-soundscapes': true }))
  renderMore()
  expect(screen.queryByTestId('more-reader-defaults')).not.toBeInTheDocument()
  expect(screen.queryByTestId('more-cloud-sync')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /heavy thunderstorm/i })).not.toBeInTheDocument()
})

test('reader settings start with layout and expose translation sources only when requested', () => {
  renderMore(); openPanel('reader')
  expect(screen.getByRole('slider', { name: 'Script size' })).toBeInTheDocument()
  expect(screen.queryByTestId('more-translation-source')).not.toBeInTheDocument()
  readerSection('Sources')
  expect(screen.queryByRole('slider', { name: 'Script size' })).not.toBeInTheDocument()
  expect(sources('English translation').getByRole('button', { name: /Standard/i })).toBeInTheDocument()
  expect(sources('English translation').getByRole('button', { name: /Sant Singh Khalsa/i })).toBeInTheDocument()
  fireEvent.click(sources('English translation').getByRole('button', { name: /Manmohan Singh/i }))
  expect(useLanguageStore.getState().englishSource).toBe('ms')
})

test('layout and support choices persist while moving between reader sections', () => {
  renderMore(); openPanel('reader')
  fireEvent.click(screen.getByRole('button', { name: /^Hindi$/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Compact$/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Center$/ }))
  fireEvent.change(screen.getByRole('slider', { name: 'Script size' }), { target: { value: '23' } })
  readerSection('Reading support')
  fireEvent.click(within(screen.getByRole('group', { name: 'Meaning language' })).getByRole('button', { name: /Punjabi/ }))
  fireEvent.click(screen.getByRole('button', { name: /Transliteration Off/ }))
  fireEvent.click(screen.getByRole('button', { name: /Larivaar Off/ }))
  fireEvent.click(screen.getByRole('button', { name: /Vishraam On/ }))
  expect(useLanguageStore.getState()).toMatchObject({ scriptMode: 'devanagari', meaningLanguage: 'pa', showTransliteration: true, larivaar: true, showVishraam: false, lineSpacing: 'compact', textAlign: 'center', fontSize: 23 })
  readerSection('Layout')
  expect(screen.getByRole('slider', { name: 'Script size' })).toHaveValue('23')
  fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
  expect(screen.getByTestId('more-open-reader')).toHaveTextContent('23px')
})

test('the live preview follows layout, support size, meaning, and reading mode', () => {
  renderMore(); openPanel('reader')
  fireEvent.click(screen.getByRole('button', { name: /^Center$/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Compact$/ }))
  readerSection('Reading support')
  fireEvent.click(screen.getByRole('button', { name: 'Extra large', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: /Transliteration Off/ }))
  const preview = screen.getByTestId('more-reader-preview')
  expect(preview).toHaveAttribute('data-support-text-size', 'extra-large')
  expect(preview.querySelector('[lang="pa-Guru"]')).toHaveStyle({ fontSize: '22px', lineHeight: '1.6' })
  expect(preview.querySelector('[lang="pa-Guru"]')?.parentElement).toHaveStyle({ textAlign: 'center' })
  expect(preview.querySelector('[data-reader-support="transliteration"]')).toBeInTheDocument()
  expect(preview.querySelector('[data-reader-support="meaning"]')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Read', exact: true }))
  expect(preview.querySelector('[data-reader-support]')).not.toBeInTheDocument()
  expect(getSavedReaderPresentation()).toBe('read')
})

test('meaning choices and reading mode announce their selected state', () => {
  setReaderPresentationPreference('read')
  renderMore(); openPanel('reader'); readerSection('Reading support')
  expect(within(screen.getByRole('group', { name: 'Meaning language' })).getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Read', exact: true })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Study', exact: true }))
  expect(getSavedReaderPresentation()).toBe('study')
})

test('reports blocked preference storage while keeping the session reading choice', () => {
  renderMore(); openPanel('reader'); readerSection('Reading support')
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  fireEvent.click(screen.getByRole('button', { name: 'Read', exact: true }))
  expect(screen.getByText(/active for this session, but could not be saved/)).toBeInTheDocument()
  expect(getSavedReaderPresentation()).toBe('read')
  write.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Read', exact: true }))
  expect(screen.queryByText(/active for this session, but could not be saved/)).not.toBeInTheDocument()
})

test('theme changes update the document and the compact summary', () => {
  renderMore(); openPanel('appearance')
  fireEvent.click(screen.getByRole('button', { name: /^Dark$/ }))
  expect(document.documentElement).toHaveClass('dark')
  expect(useThemeStore.getState().mode).toBe('dark')
  fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
  expect(screen.getByTestId('more-open-appearance')).toHaveTextContent('Dark')
  openPanel('appearance')
  fireEvent.click(screen.getByRole('button', { name: /^System$/ }))
  expect(useThemeStore.getState().mode).toBe('system')
})

test('the shared artwork picker opens and returns to appearance settings', async () => {
  renderMore(); openPanel('appearance')
  fireEvent.click(screen.getByTestId('more-home-artwork'))
  expect(await screen.findByTestId('home-artwork-settings')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }))
  expect(screen.getByTestId('more-appearance-sheet')).toBeInTheDocument()
})

test.each([['pa', 'Punjabi', 'ਸੈਟਿੰਗਾਂ ਬੰਦ ਕਰੋ'], ['hi', 'Hindi', 'सेटिंग बंद करें']] as const)('localizes the hub and sheet when switching to %s', (locale, label, closeLabel) => {
  renderMore(); openPanel('appearance')
  fireEvent.click(screen.getByRole('button', { name: label, exact: true }))
  expect(useLocaleStore.getState().locale).toBe(locale)
  fireEvent.click(screen.getByRole('button', { name: closeLabel }))
  expect(screen.queryByText('Your NaamRas.')).not.toBeInTheDocument()
  expect(screen.getByTestId('more-open-reader')).toBeInTheDocument()
})

test('sound playback survives closing its sheet and can be paused from the hub', () => {
  renderMore(); openPanel('sound')
  fireEvent.click(screen.getByRole('button', { name: /heavy thunderstorm/i }))
  expect(useMusicStore.getState()).toMatchObject({ selectedSoundId: 'gentle-rain', isPlaying: true })
  fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
  expect(screen.queryByRole('button', { name: /heavy thunderstorm/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /pause soundscape/i }))
  expect(useMusicStore.getState()).toMatchObject({ selectedSoundId: 'gentle-rain', isPlaying: false })
  fireEvent.click(screen.getByRole('button', { name: /play soundscape/i }))
  expect(useMusicStore.getState().isPlaying).toBe(true)
})

test('playback failures remain visible on the hub and retry clears them', () => {
  renderMore()
  act(() => { useMusicStore.setState({ selectedSoundId: 'gentle-rain', isPlaying: true }); useMusicStore.getState().reportPlaybackFailure() })
  expect(screen.getByRole('alert')).toHaveTextContent(/could not be played/i)
  fireEvent.click(screen.getByRole('button', { name: /play soundscape/i }))
  expect(useMusicStore.getState()).toMatchObject({ isPlaying: true, playbackError: null })
})

test('backup controls are available only inside the backup sheet', () => {
  renderMore(); openPanel('backup')
  expect(screen.getByTestId('personal-data-panel')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /download backup/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /restore from a file/i })).toBeInTheDocument()
  expect(screen.queryByTestId('more-cloud-sync')).not.toBeInTheDocument()
})

test('account controls reflect backend availability and reveal sync failures without filling the hub', () => {
  renderMore()
  expect(screen.queryByTestId('more-open-account')).not.toBeInTheDocument()
  act(() => useCloudSyncStore.setState({ configured: true, status: 'error', lastError: 'unavailable' }))
  expect(screen.getByTestId('more-open-account')).toHaveTextContent('Sync needs attention')
  expect(screen.queryByTestId('more-cloud-sync')).not.toBeInTheDocument()
  openPanel('account')
  expect(screen.getByTestId('more-cloud-sync')).toBeInTheDocument()
})

test('About includes current features and sources without an obsolete single-provider promise', () => {
  renderMore(); openPanel('about')
  expect(screen.getByTestId('more-about')).toHaveTextContent(/Sikh stories, and historical books/i)
  expect(screen.getByTestId('more-about')).toHaveTextContent(/sources and available translations/i)
  expect(screen.getByTestId('more-open-onboarding')).toBeInTheDocument()
  expect(screen.getByTestId('more-about')).not.toHaveTextContent(/retrieved from BaniDB/)
})

test('support and privacy are reachable without opening a settings panel', () => {
  renderMore()
  expect(screen.getByTestId('more-open-support')).toHaveAttribute('href', '/support')
  expect(screen.getByTestId('more-open-support')).not.toHaveAttribute('target')
  expect(screen.getByTestId('more-open-public-privacy')).toHaveAttribute('href', '/privacy')
})

test('configured HTTPS support and privacy links keep external-link behavior', () => {
  vi.stubEnv('VITE_SUPPORT_URL', 'https://naamras.example/support')
  vi.stubEnv('VITE_PRIVACY_URL', 'https://naamras.example/privacy')
  renderMore()
  expect(screen.getByTestId('more-open-support')).toHaveAttribute('href', 'https://naamras.example/support')
  expect(screen.getByTestId('more-open-support')).toHaveAttribute('target', '_blank')
  expect(screen.getByTestId('more-open-public-privacy')).toHaveAttribute('href', 'https://naamras.example/privacy')
})

test('Escape dismisses a sheet and returns keyboard focus to its opener', async () => {
  const user = userEvent.setup()
  renderMore()
  const opener = screen.getByTestId('more-open-reader')
  await user.click(opener)
  expect(screen.getByRole('button', { name: 'Close settings' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

function NitnemOriginProbe() {
  const location = useLocation()
  return <p data-testid="nitnem-origin">{location.state?.nitnemOrigin}</p>
}

test('Daily Banis keeps the More return destination', () => {
  render(<MemoryRouter initialEntries={['/more']}><Routes><Route path="/more" element={<More />} /><Route path="/nitnem/customize" element={<NitnemOriginProbe />} /></Routes></MemoryRouter>)
  fireEvent.click(screen.getByTestId('more-open-nitnem-customize'))
  expect(screen.getByTestId('nitnem-origin')).toHaveTextContent('/more')
})


test('reviewing setup closes About before opening onboarding', () => {
  useOnboardingStore.getState().closeOnboarding()
  renderMore(); openPanel('about')
  fireEvent.click(screen.getByTestId('more-open-onboarding'))
  expect(screen.queryByTestId('more-about-sheet')).not.toBeInTheDocument()
  expect(useOnboardingStore.getState().isOnboardingOpen).toBe(true)
  useOnboardingStore.getState().closeOnboarding()
})


test('the account summary reflects loading and queued changes', () => {
  useCloudSyncStore.setState({ configured: true, status: 'booting' })
  renderMore()
  expect(screen.getByTestId('more-open-account')).toHaveTextContent('Checking your account')
  act(() => useCloudSyncStore.setState({ status: 'ready', currentUser: { id: 'test', email: 'reader@example.com', name: null }, syncQueued: true }))
  expect(screen.getByTestId('more-open-account')).toHaveTextContent('Changes waiting to sync')
})
