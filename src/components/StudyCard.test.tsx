import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import StudyCard from './StudyCard'
import type { ScriptureEntry } from '../types'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'

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
      larivaar: 'ੴ-ਸਤਿ',
      transliteration: 'Ik Oankaar Sat',
      translation_en: 'One Creator Truth',
      translations_en: {
        bdb: 'One Creator Truth',
        ms: 'There is but one truth',
        ssk: 'One Creator Truth',
      },
      translation_hi: 'एक ओंकार सत्य',
      translations_hi: {
        ss: 'एक ओंकार सत्य',
        sts: 'एकंकार सत',
      },
      translation_pa: 'ਇੱਕ ਅਕਾਲ ਸੱਚ',
      translations_pa: {
        ss: 'ਇੱਕ ਅਕਾਲ ਸੱਚ',
        ft: 'ਇਕ ਅਕਾਲ ਸਤਿ',
      },
      visraam: {
        sttm: [{ p: 1, t: 'v' }],
        igurbani: [{ p: 2, t: 'v' }],
        sttm2: [{ p: 3, t: 'v' }],
      },
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

const orderedHeaderEntry: ScriptureEntry = {
  ...entry,
  id: 'ordered-headers',
  lines: [
    {
      ...entry.lines![0],
      verseId: 20,
      gurmukhi: 'ਸੋ ਦਰੁ ਰਾਗੁ ਆਸਾ ਮਹਲਾ ੧',
      isHeader: true,
      headerLevel: 2,
    },
    {
      ...entry.lines![0],
      verseId: 21,
      gurmukhi: 'ਪਹਿਲੀ ਪੰਕਤੀ',
      isHeader: false,
      headerLevel: undefined,
    },
    {
      ...entry.lines![0],
      verseId: 22,
      gurmukhi: 'ਆਸਾ ਮਹਲਾ ੧ ॥',
      isHeader: true,
      headerLevel: 2,
    },
    {
      ...entry.lines![0],
      verseId: 23,
      gurmukhi: 'ਦੂਜੀ ਪੰਕਤੀ',
      isHeader: false,
      headerLevel: undefined,
    },
  ],
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    fontSize: 22,
    englishSource: 'bdb',
    punjabiSource: 'ss',
    hindiSource: 'ss',
    visraamSource: 'sttm',
    larivaar: false,
    showVishraam: true,
  })
})

test('shows Gurmukhi text on front', () => {
  render(<StudyCard entry={entry} />)
  expect(screen.getByText(/ੴ/)).toBeInTheDocument()
})

test('keeps Gurbani as one selectable semantic line with one explicit keyboard word explorer', () => {
  useLanguageStore.setState({ showVishraam: false })
  render(<StudyCard entry={entry} />)

  const line = screen.getByTestId('study-gurbani-line')
  const inlineWords = line.querySelectorAll<HTMLElement>('[data-reader-word]')

  expect(line.tagName).toBe('P')
  expect(line).toHaveTextContent('ੴ ਸਤਿ')
  expect(inlineWords).toHaveLength(2)
  expect(inlineWords[0]?.tagName).toBe('SPAN')
  expect(inlineWords[0]).not.toHaveAttribute('role')
  expect(inlineWords[0]).not.toHaveAttribute('tabindex')
  expect(screen.queryByRole('button', { name: 'Open word details for ੴ' })).not.toBeInTheDocument()

  fireEvent.click(screen.getByLabelText(/open verse actions for line 1/i))
  fireEvent.click(screen.getByRole('button', { name: /explore words/i }))
  const explorer = screen.getByTestId('study-word-explorer')
  expect(within(explorer).getByRole('button', { name: 'Open word details for ੴ' })).toBeInTheDocument()
})

test('carries a selected Gurmukhi phrase into the share action', async () => {
  useLanguageStore.setState({ showVishraam: false })
  const onShareLine = vi.fn()
  render(<StudyCard entry={entry} onShareLine={onShareLine} />)

  const words = screen.getByTestId('study-gurbani-line').querySelectorAll<HTMLElement>('[data-reader-word]')
  const range = document.createRange()
  range.setStart(words[0]!.firstChild!, 0)
  range.setEnd(words[1]!.firstChild!, words[1]!.textContent!.length)
  const selection = window.getSelection()!
  act(() => {
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })

  const actionTrigger = screen.getByLabelText(/open verse actions for line 1/i)
  fireEvent.click(actionTrigger)
  expect(await screen.findByText('Selected for sharing')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Share selection' }))

  await waitFor(() => {
    expect(onShareLine).toHaveBeenCalledWith(entry.lines![0], entry, 'ੴ ਸਤਿ', actionTrigger)
  })
})

test('shows translation inline without flipping', () => {
  render(<StudyCard entry={entry} showAudioPlayer />)
  expect(screen.getByText('One Creator Truth')).toBeInTheDocument()
  expect(screen.queryByText('Ik Oankaar Sat')).not.toBeInTheDocument()
  expect(screen.queryByText(/recitation coming soon/i)).not.toBeInTheDocument()
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
  useLanguageStore.setState({ meaningLanguage: 'pa', punjabiSource: 'ft' })
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('ਇਕ ਅਕਾਲ ਸਤਿ')).toBeInTheDocument()
  expect(screen.queryByText('One Creator Truth')).not.toBeInTheDocument()
})

test('switches meaning language to Hindi with the selected source', () => {
  useLanguageStore.setState({ meaningLanguage: 'hi', hindiSource: 'sts' })
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('एकंकार सत')).toBeInTheDocument()
  expect(screen.queryByText('One Creator Truth')).not.toBeInTheDocument()
})

test('uses the provided larivaar text when larivaar is enabled', () => {
  useLanguageStore.setState({ larivaar: true })
  render(<StudyCard entry={entry} />)
  expect(screen.getByText('ੴ-ਸਤਿ')).toBeInTheDocument()
  expect(document.querySelector('[data-reader-word]')).not.toBeInTheDocument()
})

test('opens word popover on word tap and shows Mahankosh context', async () => {
  render(<StudyCard entry={entry} />)
  const firstWord = screen.getByTestId('study-gurbani-line').querySelector<HTMLElement>('[data-reader-word]')
  expect(firstWord).not.toBeNull()
  fireEvent.click(firstWord!)
  expect(screen.getByText('One Creator')).toBeInTheDocument()
  expect(await screen.findByText('Mahankosh')).toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਅਕਾਲ ਪੁਰਖ.')).toBeInTheDocument()
  expect(await screen.findByText('BaniDB Kosh')).toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toBeInTheDocument()
})

test('opens source layers from the verse actions sheet', async () => {
  render(<StudyCard entry={entry} />)
  expect(screen.queryByRole('button', { name: /show source layers/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByLabelText(/open verse actions for line 1/i))
  expect(screen.getByRole('dialog', { name: /verse actions/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /show source layers/i }))

  expect(await screen.findByText('Faridkot')).toBeInTheDocument()
  expect(screen.getByText('STS')).toBeInTheDocument()
  expect(screen.getByText('iGurbani · 1')).toBeInTheDocument()
  expect(screen.getAllByText('Selected').length).toBeGreaterThan(0)
})

test('keeps devotional reader body lines after the structural opening', () => {
  render(<StudyCard entry={introOnlyEntry} />)

  expect(screen.getByText('ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥')).toBeInTheDocument()
  const inlineWords = screen.getAllByTestId('study-gurbani-line')
    .flatMap(line => Array.from(line.querySelectorAll<HTMLElement>('[data-reader-word]')))
    .map(word => word.textContent)
  expect(inlineWords).toContain('ਪ੍ਰਿਥਮ')
  expect(inlineWords).toContain('ਕੈ')
})

test('keeps later BaniDB headers in their source sequence instead of hoisting them', () => {
  render(<StudyCard entry={orderedHeaderEntry} />)

  expect(within(screen.getByTestId('study-header-block')).getByText('ਸੋ ਦਰੁ ਰਾਗੁ ਆਸਾ ਮਹਲਾ ੧')).toBeInTheDocument()

  const orderedLines = screen.getAllByTestId('study-line')
  expect(orderedLines.map(line => line.dataset.verseId)).toEqual(['21', '22', '23'])
  expect(orderedLines.map(line => line.dataset.lineKind)).toEqual(['verse', 'header', 'verse'])
  expect(orderedLines[1]).toHaveAttribute('data-header-level', '2')
})
