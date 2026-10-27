import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import WordPopover from './WordPopover'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useVocabStore } from '../store/vocab'
import type { MahanKoshEntry, Word } from '../types'
import * as mahanApi from '../api/mahankosh'
import * as baniApi from '../api/banidb'
import { renderScriptText } from '../utils/readerDisplay'

const word: Word = {
  gurmukhi: 'ੴ',
  transliteration: 'Ik Oankaar',
  meaning_en: 'One Creator',
  meaning_hi: 'एक ओंकार',
  meaning_pa: 'ਇੱਕ ਅਕਾਲ',
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useScriptureCacheStore.getState().clearAll()
  useVocabStore.setState({ vocab: [] })
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    meaningLanguage: 'en',
    showTransliteration: false,
    englishSource: 'bdb',
    punjabiSource: 'ss',
    hindiSource: 'ss',
    visraamSource: 'sttm',
    larivaar: false,
    showVishraam: true,
    lineSpacing: 'relaxed',
    textAlign: 'left',
    fontSize: 22,
  })
})

test('renders Mahankosh and BaniDB Kosh together and preserves save-word behavior', async () => {
  render(
    <WordPopover
      word={word}
      onClose={() => {}}
      scripture="SGGS"
      sourceId="G"
      ang={1}
      shabadId={1}
      verseId={1}
      line="ੴ ਸਤਿ ਨਾਮੁ"
    />
  )

  expect(await screen.findByText('Mahankosh')).toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਅਕਾਲ ਪੁਰਖ.')).toBeInTheDocument()
  expect(await screen.findByText('एक अकाल पुरुष।')).toHaveAttribute('lang', 'hi')
  expect(screen.getByText('इक ओंकार')).toHaveAttribute('lang', 'hi')
  expect(screen.getByText('ik oankar')).toHaveAttribute('lang', 'pa-Latn')
  expect(await screen.findByText('BaniDB Kosh')).toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /save word/i }))

  expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()
  expect(useVocabStore.getState().vocab).toHaveLength(1)
  expect(useVocabStore.getState().vocab[0]?.context?.verseId).toBe(1)
})

test('is an accessible modal and closes with Escape', () => {
  const onClose = vi.fn()

  render(<WordPopover word={word} onClose={onClose} />)

  expect(screen.getByRole('dialog', { name: /word details for/i })).toHaveStyle({ position: 'fixed' })
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(screen.getByTestId('study-word-details-sheet')).toHaveClass('study-reader-word-sheet')
  expect(screen.getByTestId('study-word-details-sheet')).not.toHaveClass('ornate-top')
})

test('retries Mahankosh locally while keeping BaniDB definitions and the reader dialog available', async () => {
  const recoveredEntry: MahanKoshEntry = {
    id: 10, word: 'ੴ', searchKey: 'ੴ', transliteration: '', roman: '', hindi: '',
    description: 'Recovered Mahankosh definition', description_hi: '', exactMatch: true,
    sourceUrl: 'https://example.com/word',
  }
  const lookup = vi.spyOn(mahanApi, 'fetchMahanKoshEntries')
    .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([recoveredEntry])
  const onClose = vi.fn()
  render(<WordPopover word={word} onClose={onClose} />)

  const retry = await screen.findByRole('button', { name: 'Try Mahankosh again' })
  expect(await screen.findByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toBeInTheDocument()
  expect(screen.getAllByText('One Creator')[0]).toBeInTheDocument()
  fireEvent.click(retry)

  expect(await screen.findByText('Recovered Mahankosh definition')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Try Mahankosh again' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: /word details for/i })).toBeInTheDocument()
  expect(screen.getByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toBeInTheDocument()
  expect(lookup).toHaveBeenCalledTimes(2)
  expect(onClose).not.toHaveBeenCalled()
})

test('retries BaniDB Kosh independently without claiming Mahankosh is available when it also failed', async () => {
  vi.spyOn(mahanApi, 'fetchMahanKoshEntries').mockRejectedValue(new Error('offline'))
  const lookup = vi.spyOn(baniApi, 'fetchKoshEntries').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{
    id: 10, word: 'ੴ', wordUni: 'ੴ', definition: 'Recovered Kosh definition', definitionUni: 'ਮੁੜ ਮਿਲਿਆ ਹਵਾਲਾ',
  }])
  render(<WordPopover word={word} onClose={() => {}} />)

  const retry = await screen.findByRole('button', { name: 'Try BaniDB Kosh again' })
  expect(await screen.findByRole('button', { name: 'Try Mahankosh again' })).toBeInTheDocument()
  expect(screen.queryByText(/Mahankosh stays available/i)).not.toBeInTheDocument()
  fireEvent.click(retry)

  expect(await screen.findByText('ਮੁੜ ਮਿਲਿਆ ਹਵਾਲਾ')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try Mahankosh again' })).toBeInTheDocument()
  expect(lookup).toHaveBeenCalledTimes(2)
})

test('distinguishes a missing dictionary entry from an unsuccessful lookup', async () => {
  vi.spyOn(mahanApi, 'fetchMahanKoshEntries').mockResolvedValue([])
  vi.spyOn(baniApi, 'fetchKoshEntries').mockResolvedValue([])
  render(<WordPopover word={word} onClose={() => {}} />)

  await waitFor(() => expect(screen.getAllByText('No dictionary entry found for this form.')).toHaveLength(2))
  expect(screen.queryByRole('button', { name: /try .* again/i })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /save word/i })).toBeInTheDocument()
})

test('localizes dictionary recovery controls for Punjabi interface readers', async () => {
  useLocaleStore.setState({ locale: 'pa' })
  vi.spyOn(mahanApi, 'fetchMahanKoshEntries').mockRejectedValue(new Error('offline'))
  render(<WordPopover word={word} onClose={() => {}} />)
  expect(await screen.findByRole('button', { name: 'Mahankosh ਮੁੜ ਅਜ਼ਮਾਓ' })).toBeInTheDocument()
})

test.each([
  ['pa', 'ਇੱਕ ਅਕਾਲ', 'pa-Guru'],
  ['hi', 'एक ओंकार', 'hi'],
] as const)('uses the selected %s meaning even when English is absent', (meaningLanguage, meaning, lang) => {
  useLanguageStore.setState({ meaningLanguage })
  render(<WordPopover word={{ ...word, meaning_en: '' }} onClose={() => {}} />)

  expect(screen.getByTestId('word-primary-meaning')).toHaveTextContent(meaning)
  expect(screen.getByTestId('word-primary-meaning')).toHaveAttribute('lang', lang)
  expect(screen.queryByTestId('word-meaning-status')).not.toBeInTheDocument()
  expect(screen.queryByText('English fallback')).not.toBeInTheDocument()
})

test('renders the selected Punjabi meaning in the chosen Devanagari script', () => {
  useLanguageStore.setState({ meaningLanguage: 'pa', scriptMode: 'devanagari' })
  render(<WordPopover word={word} onClose={() => {}} />)

  expect(screen.getByTestId('word-primary-meaning')).toHaveTextContent(renderScriptText(word.meaning_pa, 'devanagari'))
  expect(screen.getByTestId('word-primary-meaning')).toHaveAttribute('lang', 'hi')
  expect(screen.getByTestId('word-primary-meaning')).toHaveClass('font-devanagari')
  expect(screen.queryByText('One Creator')).not.toBeInTheDocument()
})

test('labels English fallback and keeps its actual language under a Punjabi interface', () => {
  useLocaleStore.setState({ locale: 'pa' })
  useLanguageStore.setState({ meaningLanguage: 'hi' })
  render(<WordPopover word={{ ...word, meaning_hi: '' }} onClose={() => {}} />)

  expect(screen.getByText('ਉਪਲਬਧ ਅੰਗਰੇਜ਼ੀ ਅਰਥ')).toBeInTheDocument()
  expect(screen.getByTestId('word-primary-meaning')).toHaveTextContent('One Creator')
  expect(screen.getByTestId('word-primary-meaning')).toHaveAttribute('lang', 'en')
  expect(screen.getByRole('button', { name: 'ਸ਼ਬਦ ਸੁਰੱਖਿਅਤ ਕਰੋ' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ਸ਼ਬਦ ਦੇ ਵੇਰਵੇ ਬੰਦ ਕਰੋ' })).toBeInTheDocument()
})

test('describes only the unavailable study language while retaining independent dictionaries', async () => {
  useLocaleStore.setState({ locale: 'hi' })
  useLanguageStore.setState({ meaningLanguage: 'pa' })
  render(<WordPopover word={{ ...word, meaning_en: '', meaning_pa: '' }} onClose={() => {}} />)

  const status = screen.getByTestId('word-meaning-status')
  expect(status).toHaveTextContent('इस शब्द का पंजाबी अध्ययन अर्थ उपलब्ध नहीं है।')
  expect(status.closest('[lang]')).toHaveAttribute('lang', 'hi')
  expect(screen.queryByTestId('word-primary-meaning')).not.toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਅਕਾਲ ਪੁਰਖ.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'शब्द सहेजें' })).toBeInTheDocument()
})

test('uses the existing English detail convention when reading meanings are hidden', () => {
  useLocaleStore.setState({ locale: 'hi' })
  useLanguageStore.setState({ meaningLanguage: 'none' })
  render(<WordPopover word={word} onClose={() => {}} />)

  expect(screen.getByTestId('word-primary-meaning')).toHaveTextContent('One Creator')
  expect(screen.getByTestId('word-primary-meaning')).toHaveAttribute('lang', 'en')
  expect(screen.queryByText('उपलब्ध अंग्रेज़ी अर्थ')).not.toBeInTheDocument()
})

test('does not confirm Saved when word storage fails and offers a durable retry', () => {
  const view = render(<WordPopover word={word} onClose={() => {}} />)
  const storage = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  const errors: unknown[] = []
  const captureUnexpectedError = (event: ErrorEvent) => { errors.push(event.error); event.preventDefault() }
  window.addEventListener('error', captureUnexpectedError)
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Save Word' }))
    expect(screen.queryByRole('button', { name: 'Saved', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i)
    expect(screen.getByRole('button', { name: 'Save Word', exact: true })).toBeInTheDocument()
    view.unmount()
    render(<WordPopover word={word} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Saved', exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('This word could not be saved.')
    storage.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Save Word', exact: true }))
    expect(screen.getByRole('button', { name: 'Saved', exact: true })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(useVocabStore.getState().vocab).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('sikh-vocab') ?? '{}').state.vocab).toHaveLength(1)
    expect(errors).toEqual([])
  } finally {
    window.removeEventListener('error', captureUnexpectedError)
    storage.mockRestore()
  }
})

test('saving a word remains available when the same text was saved only as a verse', () => {
  useVocabStore.getState().addWord({ ...word, word: word.gurmukhi, kind: 'phrase', scripture: 'SGGS', sourceId: 'G', savedAt: new Date().toISOString() })
  render(<WordPopover word={word} onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save Word' }))
  expect(screen.getByRole('button', { name: 'Saved', exact: true })).toBeInTheDocument()
  expect(useVocabStore.getState().vocab.map(entry => entry.kind)).toEqual(['phrase', 'word'])
})


test('requires a chosen answer and saves its dictionary definition with attribution', async () => {
  render(<WordPopover word={{...word,meaning_en:'',meaning_hi:'',meaning_pa:''}} onClose={() => {}} scripture="SGGS" sourceId="G" ang={1} shabadId={1} verseId={12} line="ੴ ਸਤਿ ਨਾਮੁ" />)
  expect(screen.getByRole('button',{name:/save word/i})).toBeDisabled()
  expect(await screen.findByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:/Use this definition · BaniDB Kosh/}))
  fireEvent.click(screen.getByRole('button',{name:/save word/i}))
  expect(useVocabStore.getState().vocab[0]).toMatchObject({meaning_en:'',meaning_pa:'ਇੱਕ ਕਰਤਾ ਪੁਰਖ',definitionSource:{name:'BaniDB Kosh'},context:{shabadId:1,verseId:12,line:'ੴ ਸਤਿ ਨਾਮੁ'}})
  expect(screen.getByRole('button',{name:/saved/i})).toBeDisabled()
})

test('can save another selected definition and original verse for an already saved word', async () => {
  const view = render(<WordPopover word={word} onClose={() => {}} scripture="SGGS" sourceId="G" verseId={12} />)
  fireEvent.click(screen.getByRole('button',{name:/save word/i}))
  view.rerender(<WordPopover word={word} onClose={() => {}} scripture="SGGS" sourceId="G" verseId={24} />)
  expect(await screen.findByText('ਇੱਕ ਅਕਾਲ ਪੁਰਖ.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:/Use this definition · Mahankosh/}))
  fireEvent.click(screen.getByRole('button',{name:/save word/i}))
  const saved = useVocabStore.getState().vocab[0]
  expect(saved.meaning_en).toBe('One Creator')
  expect(saved.context?.verseId).toBe(12)
  expect(saved.senses).toEqual([expect.objectContaining({meaning_pa:'ਇੱਕ ਅਕਾਲ ਪੁਰਖ.',definitionSource:expect.objectContaining({name:'Mahankosh'}),context:expect.objectContaining({verseId:24})})])
})


test('keeps legacy-only Kosh text in a disclosure and excludes it from review answers', async () => {
  vi.spyOn(mahanApi, 'fetchMahanKoshEntries').mockResolvedValue([])
  vi.spyOn(baniApi, 'fetchKoshEntries').mockResolvedValue([{
    id: 90, word: 'legacy-word', wordUni: '', definition: 'legacy-encoded-definition', definitionUni: '',
  }])
  render(<WordPopover word={{ ...word, meaning_en: '', meaning_hi: '', meaning_pa: '' }} onClose={() => {}} />)
  const legacy = await screen.findByText('legacy-encoded-definition')
  expect(legacy.closest('details')).not.toHaveAttribute('open')
  expect(screen.queryByRole('button', { name: /Use this definition · BaniDB Kosh/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /save word/i })).toBeDisabled()
})
