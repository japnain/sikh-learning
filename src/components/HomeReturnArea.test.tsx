import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'
import { useLanguageStore } from '../store/language'
import { getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import HomeReturnArea, { type HomePracticeSummary, type HomeSavedPreviewItem } from './HomeReturnArea'

beforeEach(() => useLanguageStore.setState({ scriptMode: 'gurmukhi' }))

const practice: HomePracticeSummary = {
  tracking: true,
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-10-${12 + index}`, completed: index === 0 || index === 3,
    isToday: index === 5, isFuture: index > 5,
  })),
  completedDays: 2, weeklyGoal: 5, currentStreak: 0, bestStreak: 4,
}

const passage: HomeSavedPreviewItem = {
  id: 'verse-1', kind: 'passage', label: 'Bookmarks', title: 'Japji Sahib',
  detail: 'Sri Guru Granth Sahib Ji · Ang 1', path: '/study?shabadId=1&verseId=12',
  excerpt: 'ਹੁਕਮੀ ਹੋਵਨਿ ਆਕਾਰ ਹੁਕਮੁ ਨ ਕਹਿਆ ਜਾਈ ॥', isScripture: true,
  meaning: 'By His Command, bodies are created; His Command cannot be described.', meaningLanguage: 'en',
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="return-destination">{location.pathname}{location.search}|{JSON.stringify(location.state)}</div>
}

function open(items: HomeSavedPreviewItem[] = [], summary = practice, locale: 'en' | 'pa' | 'hi' = 'en', notice?: string) {
  return render(<MemoryRouter><HomeReturnArea locale={locale} savedItems={items} practice={summary} lastSavedNotice={notice} /><LocationProbe /></MemoryRouter>)
}

test('weekly practice uses all seven real dates, the actual count and goal, without inventing a streak', () => {
  open()
  const week = screen.getByTestId('home-week')
  expect(week.querySelectorAll('time')).toHaveLength(7)
  expect(week.querySelectorAll('.is-complete')).toHaveLength(2)
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveTextContent('2 / 5 days')
  expect(within(week).getByRole('link', { name: 'Weekly goal' })).toHaveAttribute('href', '/nitnem/customize#nitnem-continuity')
  expect(within(week).getByLabelText('Saturday, October 17')).toHaveAttribute('aria-current', 'date')
  expect(within(week).getByLabelText('Monday, October 12: Practice recorded')).toHaveAttribute('datetime', '2026-10-12')
  expect(within(week).queryByText(/day streak/)).not.toBeInTheDocument()
})

test('today and continuity reflect confirmed practice and suppress a duplicate best count', () => {
  open([], {
    ...practice, completedDays: 3, currentStreak: 2, bestStreak: 2,
    days: practice.days.map(day => day.isToday ? { ...day, completed: true } : day),
  })
  const week = screen.getByTestId('home-week')
  expect(within(week).getByText('2 day streak')).toBeInTheDocument()
  expect(within(week).getByText('Today’s practice is recorded.')).toBeInTheDocument()
  expect(within(week).queryByText('Best: 2')).not.toBeInTheDocument()
  expect(within(week).getByLabelText('Saturday, October 17: Practice recorded')).toHaveAttribute('aria-current', 'date')
})

test('a real saved passage keeps exact scripture, selected-language meaning, source and reader origin', () => {
  open([{ ...passage, meaning: 'ਹੁਕਮ ਅਨੁਸਾਰ ਸਰੀਰ ਬਣਦੇ ਹਨ।', meaningLanguage: 'pa' }])
  const saved = screen.getByTestId('home-saved-preview-passage')
  expect(within(saved).getByText(passage.excerpt!)).toHaveAttribute('lang', 'pa-Guru')
  expect(within(saved).getByText('ਹੁਕਮ ਅਨੁਸਾਰ ਸਰੀਰ ਬਣਦੇ ਹਨ।')).toHaveAttribute('lang', 'pa-Guru')
  expect(within(saved).getByText('Japji Sahib')).toBeInTheDocument()
  expect(within(saved).getByText(passage.detail)).toBeInTheDocument()
  fireEvent.click(saved)
  expect(screen.getByTestId('return-destination')).toHaveTextContent('/study?shabadId=1&verseId=12|{"readerOrigin":"/"}')
})

test('a canonical passage is primary even when a word is supplied first; the word retains its actual meaning', () => {
  const word: HomeSavedPreviewItem = { id: 'word-1', kind: 'vocab', label: 'Review bank', title: 'ਹੁਕਮੁ', detail: 'Command', path: '/vocab' }
  open([word, passage])
  const list = screen.getByTestId('home-saved-preview-list')
  expect(list.firstElementChild).toHaveAttribute('data-testid', 'home-saved-preview-passage')
  const vocabulary = screen.getByTestId('home-saved-preview-vocab')
  expect(within(vocabulary).getByText('ਹੁਕਮੁ')).toHaveAttribute('lang', 'pa-Guru')
  expect(within(vocabulary).getByText('Command')).toBeInTheDocument()
  expect(vocabulary).toHaveAttribute('href', '/vocab')
})

test('a saved book uses its real title and detail without fabricated scripture or meaning', () => {
  const book: HomeSavedPreviewItem = { id: 'book-1', kind: 'passage', label: 'Bookmarks', title: 'A chapter from the collection', detail: 'Saved book · Chapter 2', path: '/library/work-1/chapters/2', isScripture: false }
  open([book], { ...practice, tracking: false })
  expect(screen.queryByTestId('home-week')).not.toBeInTheDocument()
  const saved = screen.getByTestId('home-saved-preview-passage')
  expect(within(saved).getByText(book.title)).not.toHaveAttribute('lang', 'pa-Guru')
  expect(within(saved).getByText(book.detail)).toBeInTheDocument()
  expect(saved.querySelector('.home-return-reading__meaning')).toBeNull()
  fireEvent.click(saved)
  expect(screen.getByTestId('return-destination')).toHaveTextContent('/library/work-1/chapters/2|{"libraryReaderOrigin":"/"}')
})

test('empty saved content is one quiet exploration line and does not render an empty saved heading', () => {
  open([], { ...practice, tracking: false }, 'en', 'Passage saved.')
  expect(screen.queryByTestId('home-week')).not.toBeInTheDocument()
  expect(screen.getByTestId('home-saved-empty')).toHaveTextContent('Find a passage to return to.')
  expect(screen.getByRole('link', { name: 'Explore Gurbani' })).toHaveAttribute('href', '/banis')
  expect(screen.queryByRole('heading', { name: 'Saved for later' })).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Passage saved.')
  expect(screen.queryByTestId('home-saved-preview-list')).not.toBeInTheDocument()
})

test('meaning language stays independent from the interface language', () => {
  open([{ ...passage, meaning: 'The real saved English meaning.', meaningLanguage: 'en' }], { ...practice, tracking: false }, 'hi')
  expect(screen.getByText('The real saved English meaning.')).toHaveAttribute('lang', 'en')
  expect(screen.getByRole('link', { name: 'सहेजी चीज़ें खोलें' })).toHaveAttribute('href', '/saved')
})

test('canonical saved text follows the reader script preference without tagging an English fallback title as scripture', () => {
  useLanguageStore.setState({ scriptMode: 'devanagari' })
  const first = open([passage])
  expect(screen.getByText(renderScriptText(passage.excerpt!, 'devanagari'))).toHaveAttribute('lang', getScriptTextLang('devanagari'))
  first.unmount()
  open([{ ...passage, excerpt: undefined, meaning: undefined }])
  expect(screen.getByText('Japji Sahib')).not.toHaveAttribute('lang', 'pa-Guru')
})
