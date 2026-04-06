import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Banis from './Banis'

function renderBanis() {
  return render(<MemoryRouter><Banis /></MemoryRouter>)
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
  expect(screen.getByText(/Sri Guru Granth Sahib Ji/i)).toBeInTheDocument()
  expect(screen.getByText(/Dasam Granth/i)).toBeInTheDocument()
  expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
})

test('shows SGGS index items after expanding SGGS section', () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sri Guru Granth Sahib Ji/i))
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
