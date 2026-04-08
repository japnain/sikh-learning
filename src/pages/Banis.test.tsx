import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Banis from './Banis'
import Study from './Study'

function renderBanis() {
  return render(<MemoryRouter><Banis /></MemoryRouter>)
}

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

test('renders page heading', () => {
  renderBanis()
  expect(screen.getByText('Banis')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /first letters/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^SGGS$/i })).toBeInTheDocument()
})

test('renders the four main content sections', () => {
  renderBanis()
  expect(screen.getByText(/Sundar Gutka/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i }).length).toBeGreaterThan(0)
  expect(screen.getByText(/Dasam Granth/i)).toBeInTheDocument()
  expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
})

test('shows SGGS index items after expanding SGGS section', () => {
  renderBanis()
  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i }).at(-1)!)
  expect(screen.getByText('Raag Sri')).toBeInTheDocument()
  expect(screen.getByText('Asa Ki Vaar')).toBeInTheDocument()
})

test('loads Sundar Gutka groups and items', async () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))
  expect(screen.getByText('ਜਪੁਜੀ ਸਾਹਿਬ')).toBeInTheDocument()
})

test('shows the Ardaas + Hukamnama featured flow and keeps plain Ardaas in Other', async () => {
  renderBanis()

  expect(screen.getByText('Ardaas + Hukamnama')).toBeInTheDocument()
  expect(
    screen.getByText('Do Ardaas, then take a random Hukamnama from Sri Guru Granth Sahib Ji.')
  ).toBeInTheDocument()

  fireEvent.click(screen.getByText(/Sundar Gutka/i))
  await waitFor(() => expect(screen.getByText('Other')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Other'))

  expect(screen.getByText('ਅਰਦਾਸ')).toBeInTheDocument()
})

test('featured Ardaas + Hukamnama card opens the devotional Study flow', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<Banis />} />
        <Route path="/study" element={<Study />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('button', { name: /Ardaas \+ Hukamnama/i }))

  await waitFor(() => {
    expect(screen.getByText('Take Hukamnama')).toBeInTheDocument()
    expect(screen.getByText(/After Ardaas, take a random Hukamnama/i)).toBeInTheDocument()
  })
})

test('opens Sundar Gutka Rehras Sahib through the canonical SGGS range route', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))

  await waitFor(() => expect(screen.getByText('ਰਹਰਾਸਿ ਸਾਹਿਬ')).toBeInTheDocument())
  fireEvent.click(screen.getByText('ਰਹਰਾਸਿ ਸਾਹਿਬ'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21')
  })
})

test('opens Asa Ki Vaar through a bounded BaniDB route from the SGGS list', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i }).at(-1)!)
  fireEvent.click(screen.getByText('Asa Ki Vaar'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=462&startAng=462&endAng=475&bani=Asa+Ki+Vaar&baniDbId=90')
  })
})

test('loads Amrit Keertan into a focused chapter view', async () => {
  renderBanis()
  fireEvent.click(screen.getByText('Amrit Keertan'))

  await waitFor(() => expect(screen.getByText('ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥')).toBeInTheDocument())
  fireEvent.click(screen.getByText('ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥'))

  await waitFor(() => expect(screen.getByRole('button', { name: /back to chapters/i })).toBeInTheDocument())
  expect(screen.getByText(/Start from first shabad/i)).toBeInTheDocument()
  expect(screen.getByText('ਡੰਡਉਤਿ ਬੰਦਨ ਅਨਿਕ ਬਾਰ ਸਰਬ ਕਲਾ ਸਮਰਥ ॥')).toBeInTheDocument()
  expect(screen.getAllByText('Sri Guru Granth Sahib Ji').length).toBeGreaterThan(0)
  expect(screen.getByText('Raag Gauree')).toBeInTheDocument()
  expect(screen.getByText('Ang 65')).toBeInTheDocument()
})

test('supports searching within an Amrit Keertan chapter', async () => {
  renderBanis()
  fireEvent.click(screen.getByText('Amrit Keertan'))

  await waitFor(() => expect(screen.getByText('ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥')).toBeInTheDocument())
  fireEvent.click(screen.getByText('ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥'))

  await waitFor(() => expect(screen.getByPlaceholderText(/search within this chapter/i)).toBeInTheDocument())
  fireEvent.change(screen.getByPlaceholderText(/search within this chapter/i), { target: { value: 'ਡੰਡਉਤਿ' } })

  expect(screen.getByText('ਡੰਡਉਤਿ ਬੰਦਨ ਅਨਿਕ ਬਾਰ ਸਰਬ ਕਲਾ ਸਮਰਥ ॥')).toBeInTheDocument()
  expect(screen.queryByText('ਪ੍ਰਭ ਪਾਸਿ ਜਨ ਕੀ ਅਰਦਾਸਿ ਤੂ ਸਚਾ ਸਾਂਈ ॥')).not.toBeInTheDocument()
})

test('supports direct ang lookup mode', async () => {
  renderBanis()
  fireEvent.click(screen.getByRole('button', { name: /ang \/ page/i }))
  fireEvent.change(screen.getByPlaceholderText(/open an ang or page directly/i), { target: { value: '12' } })

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /open sggs ang 12/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open dg ang 12/i })).toBeInTheDocument()
  })
})
