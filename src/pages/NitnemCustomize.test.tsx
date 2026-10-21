import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useNitnemHistoryStore } from '../store/nitnemHistory'
import { useNitnemOfflineStatusStore } from '../store/nitnemOffline'
import NitnemCustomize from './NitnemCustomize'
import { useLocaleStore } from '../store/locale'
import { clearNitnemDraft, NITNEM_DRAFT_KEY } from '../utils/nitnemDraft'

const baniRequest = vi.hoisted(() => ({ loading: false, error: null as string | null, retry: vi.fn() }))
vi.mock('../hooks/useBani', () => ({ useBani: (id: number) => ({
  availableLengths: baniRequest.error ? [] : id === 9 || id === 22 ? ['short','medium','long'] : ['short','medium','long','extralong'], ...baniRequest,
}) }))

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}
function renderCustomize() {
  return render(<MemoryRouter initialEntries={['/nitnem/customize']}><Routes>
    <Route path="/nitnem/customize" element={<><NitnemCustomize /><LocationSpy /></>} />
    <Route path="/" element={<LocationSpy />} />
  </Routes></MemoryRouter>)
}
function editBani(name: string) {
  fireEvent.click(screen.getByLabelText(`Edit ${name}`))
}
beforeEach(() => {
  baniRequest.loading = false
  baniRequest.error = null
  baniRequest.retry.mockReset()
  localStorage.clear()
  clearNitnemDraft()
  useLocaleStore.setState({ locale: 'en' })
  document.documentElement.classList.remove('dark')
  useNitemStore.setState({ completedDate: '2026-10-17', completedIds: [], selectedIds: [...DEFAULT_NITNEM_OPTION_IDS], completionTrackingEnabled: true, weeklyDayGoal: 7 })
  useNitnemHistoryStore.setState({ events: [] })
  useSundarGutkaLengthStore.setState({ lengths: { 'chaupai-sahib': 'short', 'rehras-sahib': 'short', aarti: 'short', 'kirtan-sohila': 'short' } })
  useNitnemOfflineStatusStore.setState({ ready: 0, total: 7, status: 'checking', retryRevision: 0 })
})
afterEach(() => { vi.restoreAllMocks(); document.documentElement.classList.remove('dark') })

test('presents an editor with separate weekly goals and no daily completion controls', () => {
  renderCustomize()
  expect(screen.getByRole('heading', { level: 1, name: /daily nitnem/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  expect(screen.getByText('Choose your banis and reading order.')).toBeInTheDocument()
  expect(screen.getAllByText('7 selected')).toHaveLength(1)
  expect(screen.queryByText('Your practice')).not.toBeInTheDocument()
  expect(screen.getByTestId('nitnem-ritual-order')).toBeInTheDocument()
  expect(document.getElementById('nitnem-continuity')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('7')
})

test('keeps reorder, remove, add, and restore changes in a draft until Save', () => {
  useNitemStore.setState({ selectedIds: ['japji-sahib','rehras-sahib'], completedIds: ['japji-sahib'] })
  renderCustomize()
  editBani('Rehras Sahib')
  fireEvent.click(screen.getByRole('button', { name: 'Move Rehras Sahib up' }))
  expect(within(screen.getAllByTestId('nitnem-ritual-item')[0]).getByText('Rehras Sahib')).toBeInTheDocument()
  editBani('Japji Sahib')
  fireEvent.click(screen.getByRole('button', { name: 'Remove Japji Sahib from Daily Nitnem' }))
  expect(screen.getByRole('button', { name: 'Remove Rehras Sahib from Daily Nitnem' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /add a bani/i }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search available banis' }), { target: { value:'Salok' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Salok Mahalla 9' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close available banis' }))
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib','rehras-sahib'])
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(useNitemStore.getState().selectedIds).toEqual(['rehras-sahib','salok-mahalla-9'])
  expect(useNitemStore.getState().completedIds).toEqual(['japji-sahib'])
  expect(screen.getByTestId('location')).toHaveTextContent('/')
})

test('Cancel discards draft order, lengths, and goal', () => {
  renderCustomize()
  editBani('Rehras Sahib')
  fireEvent.click(screen.getByRole('button', { name: 'Move Rehras Sahib up' }))
  fireEvent.change(screen.getByLabelText('Rehras Sahib length'), { target: { value:'long' } })
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value:'4' } })
  fireEvent.click(screen.getByRole('switch', { name:'Daily completion' }))
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Discard', exact: true }))
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
  expect(useNitemStore.getState().weeklyDayGoal).toBe(7)
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(true)
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
})

test('saves only supported API length choices together with the weekly goal', () => {
  renderCustomize()
  editBani('Benati Chaupai Sahib')
  editBani('Rehras Sahib')
  const chaupai = screen.getByLabelText('Benati Chaupai Sahib length')
  expect(within(chaupai).queryByRole('option', { name:'Extra Long' })).not.toBeInTheDocument()
  fireEvent.change(chaupai, { target: { value:'medium' } })
  fireEvent.change(screen.getByLabelText('Rehras Sahib length'), { target: { value:'extralong' } })
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value:'3' } })
  fireEvent.click(screen.getByRole('switch', { name:'Daily completion' }))
  expect(useSundarGutkaLengthStore.getState().lengths['chaupai-sahib']).toBe('short')
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(useNitemStore.getState().weeklyDayGoal).toBe(3)
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(false)
  expect(useSundarGutkaLengthStore.getState().lengths).toMatchObject({ 'chaupai-sahib':'medium', 'rehras-sahib':'extralong' })
})

test('restores the default seven as a draft without changing persisted selections', () => {
  useNitemStore.setState({ selectedIds: ['sukhmani-sahib'] })
  renderCustomize()
  fireEvent.click(screen.getByTestId('nitnem-reset'))
  expect(screen.getAllByTestId('nitnem-ritual-item')).toHaveLength(7)
  expect(useNitemStore.getState().selectedIds).toEqual(['sukhmani-sahib'])
})

test('uses the same semantic editor in dark mode', () => {
  document.documentElement.classList.add('dark')
  renderCustomize()
  expect(screen.getByTestId('page-nitnem-customize')).toHaveClass('nitnem-customize-page')
  expect(screen.getByRole('button', { name:'Save routine' })).toBeEnabled()
})

test('shows verified saved readiness separately from unsaved reading choices', () => {
  useNitnemOfflineStatusStore.setState({ ready: 7, total: 7, status: 'ready' })
  renderCustomize()
  expect(screen.getByText('7 of 7 saved readings ready offline.')).toBeInTheDocument()
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  editBani('Rehras Sahib')
  fireEvent.change(screen.getByLabelText('Rehras Sahib length'), { target: { value: 'long' } })
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  expect(screen.getByText('Your new choices prepare after you save.')).toBeInTheDocument()
  expect(screen.getByText('7 of 7 saved readings ready offline.')).toBeInTheDocument()
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
})

test.each(['partial', 'offline', 'error', 'paused'] as const)('offers preparation retry for %s without saving the draft', status => {
  useNitnemOfflineStatusStore.setState({ status, ready: 2, total: 7 })
  renderCustomize()
  editBani('Rehras Sahib')
  fireEvent.click(screen.getByRole('button', { name: 'Move Rehras Sahib up' }))
  fireEvent.click(screen.getByRole('button', { name: status === 'paused' ? 'Prepare now' : 'Try again' }))
  expect(useNitnemOfflineStatusStore.getState().retryRevision).toBe(1)
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

test('the add sheet has a separate Done action and keeps additions in the draft', () => {
  renderCustomize()
  fireEvent.click(screen.getByRole('button', { name: /add a bani/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Add Salok Mahalla 9' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getAllByTestId('nitnem-ritual-item')).toHaveLength(8)
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

test('keeps the saved exact length available when length discovery fails and offers a retry', () => {
  baniRequest.error = 'network'
  renderCustomize()
  editBani('Rehras Sahib')
  expect(screen.getByLabelText('Rehras Sahib length')).toHaveValue('short')
  expect(within(screen.getByLabelText('Rehras Sahib length')).getAllByRole('option')).toHaveLength(1)
  fireEvent.click(within(screen.getByLabelText('Rehras Sahib length').closest('details')!).getByRole('button', { name: 'Try other lengths again' }))
  expect(baniRequest.retry).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  expect(screen.getByTestId('location')).toHaveTextContent('/')
})

test('keeps the editor open and reports a device storage failure', () => {
  renderCustomize()
  const storageWrite = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Unavailable') })
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(screen.getByRole('alert')).toHaveTextContent('could not be fully saved on this device')
  expect(screen.getByText('Not saved on this device')).toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/nitnem/customize')
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toBeInTheDocument()
  storageWrite.mockRestore()
})

test.each(['Back', 'Cancel'])('clean %s leaves immediately without a discard sheet', name => {
  renderCustomize()
  fireEvent.click(screen.getByRole('button', { name, exact: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
})

test.each(['Back', 'Cancel'])('dirty %s can keep editing with focus restored, or discard the draft', async name => {
  renderCustomize()
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '3' } })
  const exit = screen.getByRole('button', { name, exact: true })
  exit.focus()
  fireEvent.click(exit)
  const dialog = screen.getByRole('dialog', { name: 'Discard changes?' })
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus())
  expect(useNitemStore.getState().weeklyDayGoal).toBe(7)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
  await waitFor(() => expect(exit).toHaveFocus())
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('3')
  expect(screen.getByTestId('location')).toHaveTextContent('/nitnem/customize')
  fireEvent.click(exit)
  fireEvent.click(screen.getByRole('button', { name: 'Discard', exact: true }))
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  expect(useNitemStore.getState().weeklyDayGoal).toBe(7)
})

test('reload protection is present only while the draft differs and clears when changes are reverted', () => {
  renderCustomize()
  const dispatchUnload = () => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  }
  expect(dispatchUnload()).toBe(false)
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '4' } })
  expect(dispatchUnload()).toBe(true)
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '7' } })
  expect(dispatchUnload()).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
})

test('a length storage failure restores the committed routine and a later Save persists the full draft', () => {
  const committedIds = [...DEFAULT_NITNEM_OPTION_IDS]
  const committedCompletedIds = ['japji-sahib']
  useNitemStore.setState({ completedIds: committedCompletedIds })
  useSundarGutkaLengthStore.getState().setLength('aarti', 'medium')
  renderCustomize()
  editBani('Rehras Sahib')
  fireEvent.click(screen.getByRole('button', { name: 'Move Rehras Sahib up' }))
  fireEvent.change(screen.getByLabelText('Rehras Sahib length'), { target: { value: 'long' } })
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('switch', { name: 'Daily completion' }))
  const write = localStorage.setItem.bind(localStorage)
  const storageWrite = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'sikh-sundar-gutka-lengths') throw new Error('Quota exceeded')
    write(key, value)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(screen.getByRole('alert')).toHaveTextContent('could not be fully saved')
  expect(useNitemStore.getState()).toMatchObject({ selectedIds: committedIds, weeklyDayGoal: 7, completionTrackingEnabled: true, completedIds: committedCompletedIds })
  expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
  expect(JSON.parse(localStorage.getItem('sikh-sundar-gutka-lengths')!).state.lengths['rehras-sahib']).toBe('short')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.getByLabelText('Rehras Sahib length')).toHaveValue('long')
  storageWrite.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  expect(JSON.parse(localStorage.getItem('sikh-sundar-gutka-lengths')!).state.lengths).toEqual({
    'chaupai-sahib': 'short', 'rehras-sahib': 'long', aarti: 'medium', 'kirtan-sohila': 'short',
  })
  expect(useNitemStore.getState().selectedIds.indexOf('rehras-sahib')).toBe(committedIds.indexOf('rehras-sahib') - 1)
  expect(useNitemStore.getState()).toMatchObject({ weeklyDayGoal: 3, completionTrackingEnabled: false, completedIds: committedCompletedIds })
})

function HistoryActions() {
  const navigate = useNavigate()
  return <><button onClick={() => navigate(-1)}>Browser Back</button><button onClick={() => navigate('/nitnem/customize')}>Open editor</button></>
}

function renderHistoryEditor() {
  return render(<MemoryRouter initialEntries={['/', '/nitnem/customize']} initialIndex={1}>
    <HistoryActions />
    <Routes><Route path="/nitnem/customize" element={<NitnemCustomize />} /><Route path="/" element={<LocationSpy />} /></Routes>
  </MemoryRouter>)
}

test('browser Back preserves an unsaved draft on return without committing it or intercepting navigation', () => {
  renderHistoryEditor()
  editBani('Rehras Sahib')
  fireEvent.click(screen.getByRole('button', { name: 'Move Rehras Sahib up' }))
  fireEvent.change(screen.getByLabelText('Rehras Sahib length'), { target: { value: 'long' } })
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('switch', { name: 'Daily completion' }))
  fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }))
  expect(screen.queryByTestId('nitnem-customize-panel')).not.toBeInTheDocument()
  expect(useNitemStore.getState().weeklyDayGoal).toBe(7)
  // Normal completion does not change the committed routine signature.
  useNitemStore.setState({ completedIds: ['japji-sahib'], completedDate: '2026-10-18' })
  fireEvent.click(screen.getByRole('button', { name: 'Open editor' }))
  expect(screen.getByText(/Your unsaved draft is restored/)).toBeVisible()
  expect(within(screen.getAllByTestId('nitnem-ritual-item')[4]).getByText('Rehras Sahib')).toBeInTheDocument()
  editBani('Rehras Sahib')
  expect(screen.getByLabelText('Rehras Sahib length')).toHaveValue('long')
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('3')
  expect(screen.getByRole('switch', { name: 'Daily completion' })).not.toBeChecked()
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

test('explicit Discard clears recovery and Save clears it only after a successful commit', () => {
  const view = renderHistoryEditor()
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '3' } })
  expect(sessionStorage.getItem(NITNEM_DRAFT_KEY)).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Discard', exact: true }))
  expect(sessionStorage.getItem(NITNEM_DRAFT_KEY)).toBeNull()
  view.unmount()
  renderHistoryEditor()
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('7')
  expect(screen.queryByText(/Your unsaved draft is restored/)).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '4' } })
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(sessionStorage.getItem(NITNEM_DRAFT_KEY)).not.toBeNull()
  write.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open editor' }))
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('4')
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))
  expect(sessionStorage.getItem(NITNEM_DRAFT_KEY)).toBeNull()
  expect(useNitemStore.getState().weeklyDayGoal).toBe(4)
})

test('rejects a recovered draft after the committed routine changes elsewhere', () => {
  renderHistoryEditor()
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }))
  useNitemStore.setState({ selectedIds: ['rehras-sahib', 'kirtan-sohila'] })
  fireEvent.click(screen.getByRole('button', { name: 'Open editor' }))
  expect(screen.getAllByTestId('nitnem-ritual-item')).toHaveLength(2)
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('7')
  expect(screen.queryByText(/Your unsaved draft is restored/)).not.toBeInTheDocument()
})

test('keeps the final bani and recovers a dirty single-bani draft after browser Back', () => {
  useNitemStore.setState({ selectedIds: ['japji-sahib'] })
  renderHistoryEditor()
  editBani('Japji Sahib')
  expect(screen.getByRole('button', { name: 'Remove Japji Sahib from Daily Nitnem' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Your weekly goal'), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open editor' }))
  expect(screen.getAllByTestId('nitnem-ritual-item')).toHaveLength(1)
  expect(screen.getByLabelText('Your weekly goal')).toHaveValue('4')
  expect(screen.getByText(/Your unsaved draft is restored/)).toBeVisible()
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib'])
})

test.each([
  ['pa', 'pa-Guru', 'ਆਪਣੀਆਂ ਬਾਣੀਆਂ ਅਤੇ ਪੜ੍ਹਨ ਦਾ ਕ੍ਰਮ ਚੁਣੋ।', 'ਨਿਤਨੇਮ ਸੰਭਾਲੋ', 'ਬਾਣੀ ਜੋੜੋ', 'ਉਪਲਬਧ ਬਾਣੀਆਂ ਖੋਜੋ'],
  ['hi', 'hi', 'अपनी बानियाँ और पढ़ने का क्रम चुनें।', 'नितनेम सहेजें', 'बानी जोड़ें', 'उपलब्ध बानियाँ खोजें'],
] as const)('uses the %s editor language for controls, sheets and announcements', (locale, lang, subtitle, save, add, search) => {
  useLocaleStore.setState({ locale })
  renderCustomize()
  expect(screen.getByTestId('page-nitnem-customize')).toHaveAttribute('lang', lang)
  expect(screen.getByText(subtitle)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: save })).toBeInTheDocument()
  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: new RegExp(add) }))
  expect(screen.getByRole('dialog', { name: add })).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: search })).toBeInTheDocument()
})
