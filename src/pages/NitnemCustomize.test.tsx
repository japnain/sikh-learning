import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { DEFAULT_NITNEM_OPTION_IDS, useNitemStore } from '../store/nitnem'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import NitnemCustomize from './NitnemCustomize'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderCustomize(path = '/nitnem/customize') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/nitnem/customize" element={<><NitnemCustomize /><LocationSpy /></>} />
        <Route path="/study" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
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

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

test('renders Daily Nitnem customize breadcrumbs and controls', () => {
  renderCustomize()

  expect(screen.getByTestId('page-nitnem-customize')).toBeInTheDocument()
  expect(within(screen.getByTestId('nitnem-customize-breadcrumbs')).getByText('Home')).toBeInTheDocument()
  expect(within(screen.getByTestId('nitnem-customize-breadcrumbs')).getByText('Daily Nitnem')).toBeInTheDocument()
  expect(within(screen.getByTestId('nitnem-customize-breadcrumbs')).getByText('Customize')).toBeInTheDocument()
  expect(screen.getByTestId('nitnem-ritual-order')).toBeInTheDocument()
  expect(screen.getByTestId('nitnem-selection')).toBeInTheDocument()
  expect(screen.getByTestId('nitnem-completion')).toBeInTheDocument()
})

test('reorders, removes, adds, and resets selected Nitnem banis', () => {
  useNitemStore.setState({
    selectedIds: ['japji-sahib', 'rehras-sahib'],
    completionTrackingEnabled: false,
    completedIds: [],
    completedDate: '2026-04-11',
  })

  renderCustomize()

  fireEvent.click(screen.getByRole('button', { name: /move rehras sahib up/i }))
  expect(useNitemStore.getState().selectedIds).toEqual(['rehras-sahib', 'japji-sahib'])

  fireEvent.click(screen.getByRole('button', { name: /remove japji sahib from daily nitnem/i }))
  expect(useNitemStore.getState().selectedIds).toEqual(['rehras-sahib'])
  expect(screen.getByRole('button', { name: /remove rehras sahib from daily nitnem/i })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: /add salok mahalla 9/i }))
  expect(useNitemStore.getState().selectedIds).toEqual(['rehras-sahib', 'salok-mahalla-9'])

  fireEvent.click(screen.getByTestId('nitnem-reset'))
  expect(screen.getByRole('button', { name: /tap again to reset/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /tap again to reset/i }))
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

test('supports optional completion tracking and begins the selected bani', () => {
  renderCustomize()

  expect(screen.getByTestId('nitnem-completion-toggle')).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByTestId('nitnem-completion-toggle'))

  expect(useNitemStore.getState().completionTrackingEnabled).toBe(true)
  expect(screen.getByTestId('nitnem-completion-panel')).toHaveTextContent('0 / 7 daily banis complete')
  fireEvent.click(screen.getAllByRole('button', { name: /mark complete/i })[0])
  expect(useNitemStore.getState().completedIds).toEqual(['japji-sahib'])

  const ritualOrder = screen.getByTestId('nitnem-ritual-order')
  fireEvent.click(within(ritualOrder).getAllByRole('button', { name: /^begin$/i })[0])
  expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji+Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib')
})

test('renders the customize page in dark mode', () => {
  document.documentElement.classList.add('dark')

  renderCustomize()

  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(screen.getByTestId('page-nitnem-customize')).toBeInTheDocument()
  expect(screen.getByTestId('nitnem-customize-panel')).toBeInTheDocument()
})
