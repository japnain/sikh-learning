import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'
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
  await user.click(screen.getByRole('button', { name: 'Easy' }))

  const phrase = useVocabStore.getState().vocab[0]
  expect(phrase.kind).toBe('phrase')
  expect(phrase.review).toEqual(expect.objectContaining({
    intervalDays: 4,
    reviewCount: 1,
  }))
})
