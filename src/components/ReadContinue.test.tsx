import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReadContinue from './ReadContinue'
import { buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useStoryStore } from '../store/stories'

vi.mock('../data/libraryRepository', () => ({
  loadLibraryWorkCatalog: async () => ({ works: [], workById: { 'test-book': { id: 'test-book', shortTitle: 'A Sikh history', revision: 'r1' } } }),
  loadLibraryChapterIndex: async () => [{ id: 'chapter-one', title: 'The first chapter' }],
}))
vi.mock('../data/storyRepository', () => ({
  loadStoryCatalog: async () => ({ stories: [{ id: 'a-shared-meal', title: 'A shared meal', revision: 1 }] }),
}))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useProgressStore.setState({ currentSession: null })
  useReadingPlacesStore.setState({ places: {} })
  useStoryStore.setState({ positions: {}, saved: {} })
})

test('new readers get a specific beginning that opens the exact Japji bani', () => {
  render(<MemoryRouter initialEntries={['/banis?collection=all']}><ReadContinue /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Begin here' })).toBeInTheDocument()
  const path = screen.getByRole('link', { name: 'Read Japji Sahib' }).getAttribute('href')!
  expect(path).toContain('baniId=japji-sahib')
  expect(path).toContain('exactBani=1')
  expect(path).not.toContain('nitnemPractice')
})

test('shows the three newest genuine book, source, and story places across collections', async () => {
  useProgressStore.getState().updateSession({ scriptureId: 'G-1', resumePath: '/study?source=G&ang=1&startAng=1&endAng=8&baniId=japji-sahib&baniDbId=2&exactBani=1', resumeVerseId: 10, updatedAt: '2026-10-27T08:00:00Z' })
  useProgressStore.getState().updateSession({ scriptureId: 'test-book-chapter-one', resumePath: '/library/test-book/chapters/chapter-one', updatedAt: '2026-10-27T10:00:00Z',
    readerLocator: { revision: 'r1', href: '/library/test-book/chapters/chapter-one', type: 'text/html', locations: { progression: .3, totalProgression: .1, position: 5, blockId: 'paragraph-5' } } })
  useProgressStore.getState().updateSession({ scriptureId: 'G-45', resumePath: '/study?source=G&ang=45', resumeVerseId: 1850, updatedAt: '2026-10-27T09:00:00Z' })
  useStoryStore.setState({ positions: { 'a-shared-meal': { paragraphId: 'paragraph-2', progress: .3, revision: 1, updatedAt: '2026-10-27T11:00:00Z' } } })
  render(<MemoryRouter><ReadContinue /></MemoryRouter>)
  expect(await screen.findByRole('link', { name: /A Sikh history/ })).toHaveAttribute('href', '/library/test-book/chapters/chapter-one#paragraph-5')
  expect(await screen.findByRole('link', { name: /A shared meal/ })).toHaveAttribute('href', '/stories/a-shared-meal')
  const links = within(screen.getByTestId('read-continue')).getAllByRole('link')
  expect(links).toHaveLength(3)
  expect(links[0]).toHaveTextContent('A shared meal')
  expect(links[2]).toHaveAttribute('href', '/study?source=G&ang=45&resumeVerseId=1850')
  expect(screen.queryByRole('link', { name: /Japji Sahib/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'All reading places' }))
  expect(screen.getByRole('link', { name: /Japji Sahib/ })).toHaveAttribute('href', expect.stringContaining('resumeVerseId=10'))
  expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true')
  expect(sessionStorage.getItem('naamras-read-continue-expanded')).toBe('1')
})

test('uses Punjabi controls and does not suggest a completed story', async () => {
  useLocaleStore.setState({ locale: 'pa' })
  useStoryStore.setState({ positions: { 'a-shared-meal': { paragraphId: 'paragraph-9', progress: 1, revision: 1, updatedAt: '2026-10-27T11:00:00Z', finishedAt: '2026-10-27T11:00:00Z' } } })
  render(<MemoryRouter><ReadContinue /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'ਜਪੁਜੀ ਸਾਹਿਬ ਪੜ੍ਹੋ' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /A shared meal/ })).not.toBeInTheDocument()
})

 test('keeps the exact Dheenan Ki variant visible without substituting its sibling bani', () => {
  const path = buildNitnemStudyPath(getNitnemOption('tav-prasad-savaiye-dheenan-ki')!)
  useProgressStore.getState().updateSession({ scriptureId: 'D-11', resumePath: path, resumeVerseId: 75000, updatedAt: '2026-10-27T12:00:00Z' })
  render(<MemoryRouter><ReadContinue /></MemoryRouter>)
  const link = screen.getByRole('link', { name: /Tav Prasad Savaiye \(Dheenan Ki\)/ })
  expect(link).toHaveAttribute('href', `${path}&resumeVerseId=75000`)
  expect(link.id).toContain('read-continue-D:tav-prasad-savaiye:7:')
})

test('offers the book overview until its edition has been validated', () => {
  useProgressStore.getState().updateSession({ scriptureId: 'test-book-chapter-one', resumePath: '/library/test-book/chapters/chapter-one', updatedAt: '2026-10-27T10:00:00Z',
    readerLocator: { revision: 'stale-edition', href: '/library/test-book/chapters/chapter-one', type: 'text/html', title: 'Saved chapter', locations: { progression: .3, totalProgression: .1, position: 5, blockId: 'paragraph-5' } } })
  render(<MemoryRouter><ReadContinue /></MemoryRouter>)
  expect(screen.getByRole('link', { name: /Saved chapter/ })).toHaveAttribute('href', '/library/test-book')
  expect(screen.queryByRole('heading', { name: 'Begin here' })).not.toBeInTheDocument()
})
