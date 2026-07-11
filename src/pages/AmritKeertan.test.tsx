import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AmritKeertan from './AmritKeertan'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderAmritKeertan(path = '/banis/amrit-keertan') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/banis/amrit-keertan" element={<AmritKeertan />} />
          <Route path="/banis/amrit-keertan/:headerId" element={<AmritKeertan />} />
          <Route path="/study" element={<LocationSpy />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>
  )
}

test('renders Amrit Keertan sections and filters section search', async () => {
  renderAmritKeertan()

  expect(screen.getByTestId('page-amrit-keertan')).toBeInTheDocument()
  expect(screen.getByText('113 sections')).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Search Amrit Keertan sections' })).toBeInTheDocument()
  expect(await screen.findByText('ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥')).toBeInTheDocument()
  expect(screen.getByText('ਢਾਢੀ ਦਰਿ ਪ੍ਰਭ ਮੰਗਣਾ ॥')).toBeInTheDocument()

  fireEvent.change(screen.getByTestId('amrit-keertan-search'), { target: { value: 'ਢਾਢੀ' } })

  expect(screen.queryByText('ਦੁਇ ਕਰ ਜੋੜਿ ਕਰਉ ਅਰਦਾਸਿ ॥')).not.toBeInTheDocument()
  expect(screen.getByText('ਢਾਢੀ ਦਰਿ ਪ੍ਰਭ ਮੰਗਣਾ ॥')).toBeInTheDocument()
})

test('renders section breadcrumbs, true metadata, English, search, and study navigation', async () => {
  renderAmritKeertan('/banis/amrit-keertan/1')

  expect(await screen.findByTestId('amrit-keertan-chapter')).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Search this Amrit Keertan section' })).toBeInTheDocument()
  expect(within(screen.getByTestId('amrit-keertan-breadcrumbs')).getByText('Read')).toBeInTheDocument()
  expect(within(screen.getByTestId('amrit-keertan-breadcrumbs')).getByText('Amrit Keertan')).toBeInTheDocument()
  expect(await screen.findByText('ਡੰਡਉਤਿ ਬੰਦਨ ਅਨਿਕ ਬਾਰ ਸਰਬ ਕਲਾ ਸਮਰਥ ॥')).toBeInTheDocument()

  expect(screen.getByText('Section 1 of 113')).toBeInTheDocument()
  expect(screen.getAllByText('Book order').length).toBeGreaterThan(0)
  expect(screen.getAllByText('AK Page 65').length).toBeGreaterThan(0)
  expect(screen.getByText(/ordered by the Amrit Keertan book index/i)).toBeInTheDocument()
  expect(screen.getByText('AK Page 65 · Item 1 of 2')).toBeInTheDocument()
  expect(screen.getByText('I bow and offer countless salutations to the All-powerful One.')).toBeInTheDocument()
  expect(screen.getByText(/SGGS Ang 256/)).toBeInTheDocument()
  expect(screen.queryByText('Shabad 816')).not.toBeInTheDocument()

  const firstRow = screen.getAllByTestId('amrit-keertan-shabad-row')[0]
  fireEvent.click(within(firstRow).getByRole('button', { name: /show source details/i }))

  expect(screen.getByText('SGGS Ang 256')).toBeInTheDocument()
  expect(screen.getByText('Line 4')).toBeInTheDocument()
  expect(screen.getByText('Raag Gauree')).toBeInTheDocument()
  expect(screen.getByText('Guru Arjan Dev Ji')).toBeInTheDocument()
  expect(screen.getByText('Shabad 816')).toBeInTheDocument()
  expect(within(screen.getByTestId('amrit-keertan-page-nav')).getByRole('link', { name: /next section/i })).toHaveAttribute('href', '/banis/amrit-keertan/2')

  fireEvent.click(within(screen.getByTestId('amrit-keertan-order-controls')).getByRole('button', { name: /writer/i }))

  const sortedRows = screen.getAllByTestId('amrit-keertan-shabad-row')
  expect(within(sortedRows[0]).getByText('ਪ੍ਰਭ ਪਾਸਿ ਜਨ ਕੀ ਅਰਦਾਸਿ ਤੂ ਸਚਾ ਸਾਂਈ ॥')).toBeInTheDocument()

  fireEvent.change(screen.getByTestId('amrit-keertan-search'), { target: { value: 'True Master' } })

  expect(screen.queryByText('ਡੰਡਉਤਿ ਬੰਦਨ ਅਨਿਕ ਬਾਰ ਸਰਬ ਕਲਾ ਸਮਰਥ ॥')).not.toBeInTheDocument()
  expect(screen.getByText('ਪ੍ਰਭ ਪਾਸਿ ਜਨ ਕੀ ਅਰਦਾਸਿ ਤੂ ਸਚਾ ਸਾਂਈ ॥')).toBeInTheDocument()
  expect(screen.getByText('The servant offers this prayer to God: You are the True Master.')).toBeInTheDocument()
  expect(screen.getByText(/SGGS Ang 517/)).toBeInTheDocument()
  expect(screen.getByText(/Guru Amar Daas Ji/)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /open ak page 65 item 2 in study/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/study?shabadId=817&from=amrit-keertan&akHeaderId=1&akSection=1&akItem=2&akPage=65')
  })
})
