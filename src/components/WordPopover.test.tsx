import { beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import WordPopover from './WordPopover'
import { useLanguageStore } from '../store/language'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useVocabStore } from '../store/vocab'
import type { Word } from '../types'

const word: Word = {
  gurmukhi: 'ੴ',
  transliteration: 'Ik Oankaar',
  meaning_en: 'One Creator',
  meaning_hi: 'एक ओंकार',
  meaning_pa: 'ਇੱਕ ਅਕਾਲ',
}

beforeEach(() => {
  localStorage.clear()
  useScriptureCacheStore.getState().clearAll()
  useVocabStore.setState({ vocab: [] })
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
  expect(await screen.findByText('BaniDB Kosh')).toBeInTheDocument()
  expect(await screen.findByText('ਇੱਕ ਕਰਤਾ ਪੁਰਖ')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /save word/i }))

  expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()
  expect(useVocabStore.getState().vocab).toHaveLength(1)
  expect(useVocabStore.getState().vocab[0]?.context?.verseId).toBe(1)
})
