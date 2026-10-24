import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useVocabStore } from '../store/vocab'
import Vocab from './Vocab'

beforeEach(() => {
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


afterEach(() => { cleanup(); vi.useRealTimers() })

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
