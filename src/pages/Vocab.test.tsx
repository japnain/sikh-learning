import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useVocabStore } from '../store/vocab'
import Vocab from './Vocab'

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    meaningLanguage: 'en',
  })
  useVocabStore.setState({
    vocab: [{
      kind: 'phrase',
      word: 'ੴ ਸਤਿ ਨਾਮੁ',
      transliteration: 'ik oankaar sat naam',
      meaning_en: 'One Creator, Truth is the Name',
      meaning_hi: 'एक ओंकार सतिनाम',
      meaning_pa: 'ਇੱਕ ਅਕਾਲ ਪੁਰਖ, ਸੱਚਾ ਨਾਮ',
      scripture: 'SGGS',
      sourceId: 'G',
      savedAt: '2026-04-05T00:00:00.000Z',
      review: {
        dueAt: '2026-04-05T00:00:00.000Z',
        intervalDays: 0,
        reviewCount: 0,
      },
    }],
  })
})

test('reviews a due phrase as a phrase from the review UI', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Vocab />
    </MemoryRouter>
  )

  await user.click(screen.getByRole('button', { name: 'Review' }))
  expect(screen.getByTestId('vocab-review-card')).toHaveTextContent('Phrase Review')
  expect(screen.getByRole('button', { name: 'Easy' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
  await user.click(screen.getByRole('button', { name: 'Easy' }))

  const phrase = useVocabStore.getState().vocab[0]
  expect(phrase.kind).toBe('phrase')
  expect(phrase.review).toEqual(expect.objectContaining({
    intervalDays: 4,
    reviewCount: 1,
  }))
})


afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

test('Again keeps the failed card in the session immediately and rotates without skipping due cards', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-24T05:00:01.000Z'))
  const base = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: ['first', 'second', 'third'].map(word => ({ ...base, word })) })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }))
  const rate = (word: string, rating: string) => {
    expect(screen.getByTestId('vocab-review-card')).toHaveTextContent(word)
    fireEvent.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
    fireEvent.click(screen.getByRole('button', { name: rating, exact: true }))
  }
  vi.setSystemTime(new Date('2026-10-24T05:00:03.000Z'))
  rate('first', 'Again')
  rate('second', 'Good')
  rate('third', 'Easy')
  rate('first', 'Again')
  expect(screen.getByTestId('vocab-review-card')).toHaveTextContent('first')
  expect(screen.queryByText('No review cards are due yet.')).not.toBeInTheDocument()
  rate('first', 'Good')
  expect(screen.getByText('No review cards are due yet.')).toBeInTheDocument()
})

test('legacy entries without definitions stay visible but never become blank review cards', () => {
  const base = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: [{ ...base, meaning_en: '', meaning_pa: '', meaning_hi: '', context: {scripture:'SGGS', sourceId:'G', shabadId:1, verseId:12, line:'ੴ ਸਤਿ ਨਾਮੁ'} }] })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(screen.getByText('No meaning saved yet. Open the original verse to choose a definition.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Read in context' })).toHaveAttribute('href', '/study?shabadId=1&verseId=12')
  fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }))
  expect(screen.queryByTestId('vocab-review-card')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards', exact: true }))
  expect(screen.queryByTestId('vocab-review-card')).not.toBeInTheDocument()
})

test('reviews an attributed Punjabi dictionary answer with source context and preserves other senses', () => {
  const base = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: [{ ...base, meaning_en: '', meaning_hi: '', meaning_pa: 'ਇੱਕ ਕਰਤਾ ਪੁਰਖ', definitionSource: {name:'BaniDB Kosh',entryId:'42'},
    context: {scripture:'SGGS',sourceId:'G',shabadId:1,verseId:12,line:'ਮੂਲ ਪੰਕਤੀ'},
    senses: [{meaning_en:'Another meaning',meaning_hi:'',meaning_pa:'', context:{scripture:'SGGS',sourceId:'G',shabadId:2,verseId:24,line:'ਹੋਰ ਪੰਕਤੀ'}, definitionSource:{name:'Mahankosh',entryId:'7'}}],
  }] })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  expect(screen.getByText('ਮੂਲ ਪੰਕਤੀ')).toBeInTheDocument()
  expect(screen.getByText('Another meaning')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Read in context', hidden:true }).map(link => link.getAttribute('href'))).toEqual(['/study?shabadId=1&verseId=12','/study?shabadId=2&verseId=24'])
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
  expect(screen.getByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toHaveAttribute('lang', 'pa-Guru')
  expect(screen.getByText('BaniDB Kosh · 42')).toBeInTheDocument()
  expect(screen.getByText('Available answer in Punjabi')).toBeInTheDocument()
})

test('removing the last phrase offers Undo in the empty view and restores all senses and review progress', () => {
  const original = { ...useVocabStore.getState().vocab[0],
    context: { scripture: 'SGGS', sourceId: 'G', ang: 1, verseId: 12, shabadId: 1 },
    senses: [{ meaning_en: 'A second meaning', meaning_hi: '', meaning_pa: '', definitionSource: { name: 'Dictionary' } }],
    review: { dueAt: '2026-12-01T00:00:00.000Z', intervalDays: 30, reviewCount: 8 },
  }
  useVocabStore.setState({ vocab: [original] })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: `Remove phrase: ${original.word}` }))
  expect(screen.getByTestId('vocab-empty-state')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(screen.getByTestId('vocab-saved-list')).toHaveTextContent('A second meaning')
  expect(useVocabStore.getState().vocab).toEqual([original])
})

test('searches saved transliteration and alternate meanings, filters words and phrases, and sorts by saved date', () => {
  const phrase = useVocabStore.getState().vocab[0]
  const oldWord = { ...phrase, kind: 'word' as const, word: 'first word', transliteration: 'pahila', savedAt: '2026-01-01T00:00:00.000Z',
    senses: [{ meaning_en: 'Hidden alternate definition', meaning_hi: '', meaning_pa: '' }] }
  useVocabStore.setState({ vocab: [oldWord, phrase] })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  const search = screen.getByRole('searchbox', { name: 'Search words and phrases' })
  fireEvent.change(search, { target: { value: 'pahila' } })
  expect(screen.getByTestId('vocab-saved-list')).toHaveTextContent('first word')
  expect(screen.queryByRole('button', { name: `Remove phrase: ${phrase.word}` })).not.toBeInTheDocument()
  fireEvent.change(search, { target: { value: 'hidden alternate' } })
  expect(screen.getByRole('button', { name: 'Remove word: first word' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Phrases', exact: true }))
  expect(screen.getByText('No saved words or phrases match these filters.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getAllByRole('button', { name: /^Remove (word|phrase):/ }).map(button => button.getAttribute('aria-label')))
    .toEqual([`Remove phrase: ${phrase.word}`, 'Remove word: first word'])
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort saved items' }), { target: { value: 'oldest' } })
  expect(screen.getAllByRole('button', { name: /^Remove (word|phrase):/ })[0]).toHaveAccessibleName('Remove word: first word')
})

test('opens the exact words or phrases filter supplied by Saved', () => {
  const phrase = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: [phrase, { ...phrase, kind: 'word', word: 'something else' }] })
  render(<MemoryRouter initialEntries={[`/vocab?kind=phrase&q=${encodeURIComponent(phrase.word)}`]}><Vocab /></MemoryRouter>)
  expect(screen.getByRole('searchbox')).toHaveValue(phrase.word)
  expect(screen.getByRole('button', { name: 'Phrases', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('button', { name: /^Remove (word|phrase):/ })).toHaveLength(1)
})

function ContextReader() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><p>Source reader</p><button onClick={() => navigate(location.state?.readerOrigin ?? '/missing-origin')}>Return to review</button></>
}

function renderReaderRoundtrip(initialEntry = '/vocab') {
  render(<MemoryRouter initialEntries={[initialEntry]}><Routes>
    <Route path="/vocab" element={<Vocab />} />
    <Route path="/study" element={<ContextReader />} />
    <Route path="/missing-origin" element={<p>Missing reader origin</p>} />
  </Routes></MemoryRouter>)
}

test('Read in context returns to the same revealed flashcard with its query, filter, and sort', () => {
  const base = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: ['first phrase', 'second phrase'].map(word => ({ ...base, word,
    context: { scripture: 'SGGS', sourceId: 'G', shabadId: 1, verseId: 12 } })) })
  renderReaderRoundtrip('/vocab?kind=phrase&q=phrase&sort=oldest')
  fireEvent.click(screen.getByRole('button', { name: 'Flashcards', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: /Next/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
  expect(screen.getByTestId('vocab-review-card')).toHaveTextContent('second phrase')
  fireEvent.click(screen.getByRole('link', { name: 'Read in context' }))
  fireEvent.click(screen.getByRole('button', { name: 'Return to review' }))
  expect(screen.getByTestId('vocab-review-card')).toHaveTextContent('second phrase')
  expect(screen.getByRole('button', { name: 'Hide meaning' })).toBeInTheDocument()
  expect(screen.getByRole('searchbox')).toHaveValue('phrase')
  expect(screen.getByRole('combobox')).toHaveValue('oldest')
  expect(screen.getByRole('button', { name: 'Phrases', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('Read in context preserves an ongoing review queue after Again rotates a card', () => {
  const base = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: ['first', 'second', 'third'].map(word => ({ ...base, word,
    context: { scripture: 'SGGS', sourceId: 'G', shabadId: 1, verseId: 12 } })) })
  renderReaderRoundtrip()
  fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
  fireEvent.click(screen.getByRole('button', { name: 'Again', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
  fireEvent.click(screen.getByRole('link', { name: 'Read in context' }))
  fireEvent.click(screen.getByRole('button', { name: 'Return to review' }))
  expect(screen.getByTestId('vocab-review-card')).toHaveTextContent('second')
  fireEvent.click(screen.getByRole('button', { name: 'Good', exact: true }))
  expect(screen.getByTestId('vocab-review-card')).toHaveTextContent('third')
})

test('failed review advances the session and offers retry without applying the rating twice', () => {
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Tap to reveal meaning' }))
  const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Full') })
  fireEvent.click(screen.getByRole('button', { name: 'Good', exact: true }))
  expect(screen.getByRole('alert')).toHaveTextContent('could not be saved on this device')
  expect(screen.getByText('No review cards are due yet.')).toBeInTheDocument()
  storage.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(useVocabStore.getState().vocab[0].review?.reviewCount).toBe(1)
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab[0].review.reviewCount).toBe(1)
})

test('localizes the card counter and the source location unit', () => {
  useLocaleStore.setState({ locale: 'hi' })
  useVocabStore.setState({ vocab: [{ ...useVocabStore.getState().vocab[0], context: { scripture: 'SGGS', sourceId: 'G', ang: 1 } }] })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'फ्लैशकार्ड', exact: true }))
  expect(screen.getByText('1 में से 1')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'अर्थ देखने के लिए टैप करें' }))
  expect(screen.getByText('SGGS · अंग 1')).toBeInTheDocument()
})

test('a successful later mutation does not hide another pending storage failure', () => {
  const base = useVocabStore.getState().vocab[0]
  useVocabStore.setState({ vocab: [base, { ...base, word: 'second phrase' }] })
  render(<MemoryRouter><Vocab /></MemoryRouter>)
  const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Full') })
  fireEvent.click(screen.getByRole('button', { name: `Remove phrase: ${base.word}` }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  storage.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: 'Remove phrase: second phrase' }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab).toEqual([])
})
