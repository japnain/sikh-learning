import { render, screen, fireEvent } from '@testing-library/react'
import StudyCard from './StudyCard'
import type { ScriptureEntry } from '../types'

const entry: ScriptureEntry = {
  id: 'test-1', scripture: 'SGGS', ang: 1,
  gurmukhi: 'ੴ ਸਤਿ',
  transliteration: 'Ik Oankaar Sat',
  translation_en: 'One Creator Truth',
  translation_pa: 'ਇੱਕ ਅਕਾਲ ਸੱਚ',
  words: [
    { gurmukhi: 'ੴ', transliteration: 'Ik Oankaar', meaning_en: 'One Creator', meaning_pa: 'ਇੱਕ ਅਕਾਲ' },
    { gurmukhi: 'ਸਤਿ', transliteration: 'Sat', meaning_en: 'Truth', meaning_pa: 'ਸੱਚ' },
  ]
}

test('shows Gurmukhi text on front', () => {
  render(<StudyCard entry={entry} onSwipeRight={() => {}} onSwipeLeft={() => {}} />)
  expect(screen.getByText(/ੴ/)).toBeInTheDocument()
})

test('flips to show translation on tap', () => {
  render(<StudyCard entry={entry} onSwipeRight={() => {}} onSwipeLeft={() => {}} />)
  fireEvent.click(screen.getByTestId('study-card'))
  expect(screen.getByText('One Creator Truth')).toBeInTheDocument()
})
