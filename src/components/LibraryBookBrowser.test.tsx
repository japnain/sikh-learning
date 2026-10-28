import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { loadLibraryWorkCatalog } from '../data/libraryRepository'
import { useLocaleStore } from '../store/locale'
import type { LibraryWork, UiLocale } from '../types'
import LibraryBookBrowser from './LibraryBookBrowser'

vi.mock('../data/libraryRepository', () => ({ loadLibraryWorkCatalog: vi.fn() }))

const work: LibraryWork = {
  id: 'panth-prakash-english', title: 'Sri Gur Panth Prakash', shortTitle: 'Panth Prakash',
  description: 'An English reading edition with source notes.', language: 'en',
  totalPages: 300, totalChapters: 40, provenancePath: '/provenance.json',
}
const catalog = { works: [work], workById: { [work.id]: work } }

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{JSON.stringify({ path: location.pathname, state: location.state })}</div>
}
function renderCatalog() {
  return render(<MemoryRouter initialEntries={['/banis?collection=books']}><LibraryBookBrowser dataTestId="catalog" /><LocationSpy /></MemoryRouter>)
}

beforeEach(() => {
  vi.resetAllMocks()
  useLocaleStore.setState({ locale: 'en' })
  vi.mocked(loadLibraryWorkCatalog).mockResolvedValue(catalog)
})
afterEach(() => { vi.restoreAllMocks() })

test('recovers a failed catalog request in place and preserves its reader return destination', async () => {
  vi.mocked(loadLibraryWorkCatalog).mockRejectedValueOnce(new Error('Unavailable'))
  renderCatalog()
  expect(await screen.findByText('The book catalog could not be loaded.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(screen.getByRole('status')).toHaveTextContent('Opening the book catalog…')
  const open = await screen.findByRole('link', { name: 'Open Panth Prakash book reader' })
  expect(open).toHaveAttribute('id', 'read-book-panth-prakash-english')
  expect(loadLibraryWorkCatalog).toHaveBeenCalledTimes(2)
  expect(screen.getByTestId('panth-prakash-source-card').querySelector('.epub-book-cover')).toBeInTheDocument()
  fireEvent.click(open)
  expect(screen.getByTestId('location')).toHaveTextContent('"path":"/library/panth-prakash-english"')
  expect(screen.getByTestId('location')).toHaveTextContent('"libraryReaderOrigin":"/banis?collection=books"')
})

test('explains an offline failure and allows retry after reconnecting', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  vi.mocked(loadLibraryWorkCatalog).mockRejectedValueOnce(new Error('Offline'))
  renderCatalog()
  expect(await screen.findByText('You are offline. Connect to load the book catalog, then try again.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('link', { name: 'Open Panth Prakash book reader' })).toBeInTheDocument()
})

test.each([
  ['pa', 'ਕਿਤਾਬਾਂ ਦੀ ਸੂਚੀ ਖੁੱਲ੍ਹ ਰਹੀ ਹੈ…', 'ਪਾਠ ਸੰਸਕਰਨ', 'ਅੰਗਰੇਜ਼ੀ ਸੰਸਕਰਨ', 'ਕਿਤਾਬ ਖੋਲ੍ਹੋ'],
  ['hi', 'पुस्तकों की सूची खुल रही है…', 'पाठ संस्करण', 'अंग्रेज़ी संस्करण', 'पुस्तक खोलें'],
] as const)('localizes %s catalog controls while retaining source-language titles and descriptions', async (locale, loading, edition, language, open) => {
  useLocaleStore.setState({ locale })
  renderCatalog()
  expect(screen.getByRole('status')).toHaveTextContent(loading)
  expect(await screen.findByRole('heading', { name: work.title })).toHaveAttribute('lang', 'en')
  expect(screen.getByTestId('catalog')).toHaveTextContent(edition)
  expect(screen.getByTestId('catalog')).toHaveTextContent(language)
  expect(screen.getByRole('link', { name: `${work.shortTitle} ${open}` })).toBeInTheDocument()
  expect(screen.getByText(work.description)).toHaveAttribute('lang', 'en')
})

test.each([
  ['en', 'No curated books have been added yet.'],
  ['pa', 'ਹਾਲੇ ਕੋਈ ਚੁਣੀਆਂ ਕਿਤਾਬਾਂ ਨਹੀਂ ਜੋੜੀਆਂ ਗਈਆਂ।'],
  ['hi', 'अभी कोई चुनी हुई पुस्तक नहीं जोड़ी गई है।'],
] as const)('localizes the %s empty catalog', async (locale: UiLocale, message) => {
  useLocaleStore.setState({ locale })
  vi.mocked(loadLibraryWorkCatalog).mockResolvedValue({ works: [], workById: {} })
  renderCatalog()
  expect(await screen.findByText(message)).toBeInTheDocument()
})
