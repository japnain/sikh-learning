import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { getPrivateBookshelfState, rememberPrivateBookshelfState, type PrivateBookSummary } from '../../data/privateLibrary'
import { useLocaleStore } from '../../store/locale'
import PrivateBookshelf from './PrivateBookshelf'

vi.mock('../../data/privateLibrary', () => ({ getPrivateBookshelfState: vi.fn(() => null), rememberPrivateBookshelfState: vi.fn() }))

const books = [
  { id: 'quiet-history', title: 'The Quiet History', authors: ['Mira Singh'], category: 'History', language: 'en', description: 'A historical account.', formats: ['epub'], editionVersion: '1', renderer: 'chapters', contents: [] },
  { id: 'first-reflections', title: 'First Reflections', authors: ['A. Scholar'], category: 'Reflection', language: 'en', description: 'A book of reflections.', formats: ['pdf'], editionVersion: '1', renderer: 'pdf', contents: [] },
  { id: 'old-letters', title: 'Old Letters', authors: ['Mira Singh'], contributors: ['Editor Example'], category: 'History', language: 'en', description: 'Collected letters.', formats: ['epub'], editionVersion: '1', renderer: 'chapters', contents: [] },
] satisfies PrivateBookSummary[]

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</div>
}

function renderShelf(props: Partial<React.ComponentProps<typeof PrivateBookshelf>> = {}, state?: unknown) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/banis', search: '?collection=books', state }]}><PrivateBookshelf books={books} {...props} /><LocationSpy /></MemoryRouter>)
}

beforeEach(() => { vi.clearAllMocks(); vi.mocked(getPrivateBookshelfState).mockReturnValue(null); useLocaleStore.setState({ locale: 'en' }) })

test('groups each book once and combines author search with category filtering', () => {
  renderShelf()
  expect(screen.getAllByRole('link')).toHaveLength(3)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search your books' }), { target: { value: 'mira' } })
  expect(screen.getAllByRole('link')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Reflection', exact: true }))
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('0 of 3 books')
  expect(screen.getByText('No books match these filters.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getAllByRole('link')).toHaveLength(3)
  expect(screen.getByRole('searchbox')).toHaveValue('')
})

test('sorts actual book results by title and reading recency', () => {
  renderShelf({ progress: { 'quiet-history': { fraction: .2, updatedAt: '2026-01-02T12:00:00Z' }, 'old-letters': { fraction: .9, updatedAt: '2026-01-01T12:00:00Z' } } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort books' }), { target: { value: 'title' } })
  let list = screen.getByRole('list')
  expect(within(list).getAllByRole('link').map(link => link.textContent)).toEqual([
    expect.stringContaining('First Reflections'), expect.stringContaining('Old Letters'), expect.stringContaining('The Quiet History'),
  ])
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'recent' } })
  list = screen.getByRole('list')
  expect(within(list).getAllByRole('link')[0]).toHaveAccessibleName('Open The Quiet History')
})

test('restores browsing controls from session memory without putting private filters in navigation history', () => {
  vi.mocked(getPrivateBookshelfState).mockReturnValue({ query: 'letters', category: 'History', sort: 'title' })
  renderShelf()
  expect(screen.getByRole('searchbox')).toHaveValue('letters')
  expect(screen.getByRole('button', { name: 'History', exact: true })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('link', { name: 'Open Old Letters' }))
  expect(screen.getByTestId('location')).toHaveTextContent('"pathname":"/books/private/old-letters"')
  expect(screen.getByTestId('location')).not.toHaveTextContent('"query"')
  expect(screen.getByTestId('location')).not.toHaveTextContent('"category"')
  expect(screen.getByTestId('location')).toHaveTextContent('"privateBookshelfOrigin":"/banis?collection=books"')
  expect(rememberPrivateBookshelfState).toHaveBeenCalledWith({ query: 'letters', category: 'History', sort: 'title' })
})

test('uses only session-fetched blob covers and falls back when a cover fails', () => {
  const view = renderShelf({ coverUrls: { 'quiet-history': 'blob:http://localhost/cover-1', 'old-letters': 'https://example.invalid/private-cover.jpg' } })
  const image = view.container.querySelector('img')!
  expect(image).toHaveAttribute('src', 'blob:http://localhost/cover-1')
  expect(view.container.querySelectorAll('img')).toHaveLength(1)
  fireEvent.error(image)
  expect(view.container.querySelector('img')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Open The Quiet History' })).toBeInTheDocument()
  expect(view.container).not.toHaveTextContent('ੴ')
})

test('hides stale titles and cover requests while loading or recovering from an error', () => {
  const retry = vi.fn()
  const view = renderShelf({ loading: true, coverUrls: { 'quiet-history': 'blob:http://localhost/cover-1' } })
  expect(screen.getByRole('status')).toHaveTextContent('Opening your bookshelf')
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(view.container.querySelector('img')).not.toBeInTheDocument()
  view.rerender(<MemoryRouter><PrivateBookshelf books={books} error="Sensitive server message" onRetry={retry} /></MemoryRouter>)
  expect(screen.queryByText('Sensitive server message')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(retry).toHaveBeenCalledOnce()
})

test('offers the latest unfinished book and caps displayed progress using explicit completion', () => {
  renderShelf({ progress: { 'quiet-history': { fraction: .35, updatedAt: '2026-01-02T12:00:00Z' }, 'old-letters': { fraction: 4, completed: true, updatedAt: '2026-01-03T12:00:00Z' } } })
  const resume = screen.getByRole('link', { name: /Continue reading/ })
  expect(resume).toHaveAttribute('href', '/books/private/quiet-history')
  expect(screen.getByRole('progressbar', { name: 'Reading progress for Old Letters' })).toHaveAttribute('value', '1')
  expect(screen.getByText('Finished')).toBeInTheDocument()
})

test('keeps the final page resumable until the reader explicitly marks the book finished', () => {
  renderShelf({ progress: { 'quiet-history': { fraction: 1, updatedAt: '2026-01-02T12:00:00Z' } } })
  expect(screen.getByRole('link', { name: /Continue reading/ })).toHaveAttribute('href', '/books/private/quiet-history')
  expect(screen.queryByText('Finished')).not.toBeInTheDocument()
})

test('searches contributors and ignores old filter data in browser history', () => {
  renderShelf({}, { privateBookshelf: { query: 'old private query', category: 'History', sort: 'title' } })
  expect(screen.getByRole('searchbox')).toHaveValue('')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'editor example' } })
  expect(screen.getByRole('link')).toHaveAccessibleName('Open Old Letters')
  expect(rememberPrivateBookshelfState).toHaveBeenLastCalledWith({ query: 'editor example', category: '', sort: 'collection' })
})

test('displays empty and localized states without showing unavailable category controls', () => {
  useLocaleStore.setState({ locale: 'pa' })
  renderShelf({ books: [] })
  expect(screen.getByRole('heading', { name: 'ਤੁਹਾਡੀਆਂ ਕਿਤਾਬਾਂ' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('ਤੁਹਾਡਾ ਸੰਗ੍ਰਹਿ ਪਹਿਲੀ ਕਿਤਾਬ ਲਈ ਤਿਆਰ ਹੈ।')
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
})
