import { render, screen, fireEvent } from '@testing-library/react'
import StudyCard from './StudyCard'
import type { ScriptureEntry } from '../types'
import { useLanguageStore } from '../store/language'

const entry: ScriptureEntry = {
  id: 'test-1', scripture: 'SGGS', ang: 1, shabadId: 1,
  gurmukhi: 'ੴ ਸਤਿ',
  transliteration: 'Ik Oankaar Sat',
  translation_en: 'One Creator Truth',
  translation_hi: 'एक ओंकार सत्य',
  translation_pa: 'ਇੱਕ ਅਕਾਲ ਸੱਚ',
  lines: [
    {
      verseId: 1,
      shabadId: 1,
      ang: 1,
      gurmukhi: 'ੴ ਸਤਿ',
      transliteration: 'Ik Oankaar Sat',
      translation_en: 'One Creator Truth',
      translations_en: {
        bdb: 'One Creator Truth',
        ms: 'There is but one truth',
        ssk: 'One Creator Truth',
      },
      translation_hi: 'एक ओंकार सत्य',
      translation_pa: 'ਇੱਕ ਅਕਾਲ ਸੱਚ',
    },
  ],
  words: [
    { gurmukhi: 'ੴ', transliteration: 'Ik Oankaar', meaning_en: 'One Creator', meaning_hi: 'एक ओंकार', meaning_pa: 'ਇੱਕ ਅਕਾਲ' },
    { gurmukhi: 'ਸਤਿ', transliteration: 'Sat', meaning_en: 'Truth', meaning_hi: 'सत्य', meaning_pa: 'ਸੱਚ' },
  ]
}

const introOnlyEntry: ScriptureEntry = {
  ...entry,
  id: 'ardaas-test',
  lines: [
    {
      verseId: 10,
      shabadId: 1,
      ang: 119,
      gurmukhi: 'ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥',
      transliteration: 'Vaheguroo Jee Kee Fateh',
      translation_en: 'and to Waheguru belongs Victory',
      translations_en: { bdb: 'and to Waheguru belongs Victory' },
      translation_hi: 'और विजय वाहेगुरु की है',
      translation_pa: 'ਅਤੇ ਫਤਹਿ ਵਾਹਿਗੁਰੂ ਦੀ ਹੈ',
      isHeader: true,
    },
    {
      verseId: 11,
      shabadId: 1,
      ang: 119,
      gurmukhi: 'ਪ੍ਰਿਥਮ ਭਗੌਤੀ ਸਿਮਰਿ ਕੈ',
      transliteration: 'Pritham Bhagautee Simar Kai',
      translation_en: 'In the beginning I remember Bhagauti',
      translations_en: { bdb: 'In the beginning I remember Bhagauti' },
      translation_hi: 'आरंभ में मैं भगौती को स्मरण करता हूँ',
      translation_pa: 'ਆਰੰਭ ਵਿੱਚ ਮੈਂ ਭਗੌਤੀ ਨੂੰ ਸਿਮਰਦਾ ਹਾਂ',
    },
  ],
}

beforeEach(() => {
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    fontSize: 22,
    englishSource: 'bdb',
  })
})

test('shows Gurmukhi text on front', () => {
  render(<StudyCard entry={entry} />)
  expect(screen.getByText(/ੴ/)).toBeInTheDocument()
})

test('shows translation inline without flipping', () => {
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('One Creator Truth')).toBeInTheDocument()
  expect(screen.queryByText('Ik Oankaar Sat')).not.toBeInTheDocument()
  expect(screen.getByText(/recitation coming soon/i)).toBeInTheDocument()
})

test('switches to selected English source', () => {
  useLanguageStore.setState({ englishSource: 'ms' })
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('There is but one truth')).toBeInTheDocument()
})

test('shows transliteration when enabled', () => {
  useLanguageStore.setState({ showTransliteration: true })
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('Ik Oankaar Sat')).toBeInTheDocument()
})

test('switches meaning language to Punjabi', () => {
  useLanguageStore.setState({ meaningLanguage: 'pa' })
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('ਇੱਕ ਅਕਾਲ ਸੱਚ')).toBeInTheDocument()
  expect(screen.queryByText('One Creator Truth')).not.toBeInTheDocument()
})

test('opens word popover on word tap and shows Mahankosh context', async () => {
  render(<StudyCard entry={entry} />)
  fireEvent.click(screen.getByRole('button', { name: 'ੴ' }))
  expect(screen.getByText('One Creator')).toBeInTheDocument()
  expect(await screen.findByText('Mahankosh')).toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਅਕਾਲ ਪੁਰਖ.')).toBeInTheDocument()
})

test('can hide non-header lines for devotional readers like Ardaas', () => {
  render(<StudyCard entry={introOnlyEntry} hideMainLines />)

  expect(screen.getByText('ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥')).toBeInTheDocument()
  expect(screen.queryByText('ਪ੍ਰਿਥਮ ਭਗੌਤੀ ਸਿਮਰਿ ਕੈ')).not.toBeInTheDocument()
  expect(screen.queryByText(/Tap any Gurbani word for meaning/i)).not.toBeInTheDocument()
})
