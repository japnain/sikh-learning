import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReaderDock from './ReaderDock'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { renderScriptText } from '../utils/readerDisplay'
import type { ReaderWordContext } from '../hooks/useReaderInteraction'

const context: ReaderWordContext = {
  word: { gurmukhi: 'ਸਤਿ', transliteration: 'sat', meaning_en: 'True', meaning_pa: 'ਸੱਚਾ', meaning_hi: 'सत्य' },
  line: { verseId: 12, shabadId: 1, ang: 1, gurmukhi: 'ਸਤਿ ਨਾਮੁ', transliteration: '', translation_en: '', translation_hi: '', translation_pa: '', translations_en: {} },
  entry: { id: 'G-1', source: 'G', scripture: 'Sri Guru Granth Sahib Ji', ang: 1, gurmukhi: 'ਸਤਿ ਨਾਮੁ', transliteration: '', translation_en: '', translation_hi: '', translation_pa: '', words: [] },
}

function renderDock(word = context.word) {
  return render(<ReaderDock visible title="Japji Sahib" location="Ang 1" presentation="study" word={{ ...context, word }}
    onBack={vi.fn()} onSections={vi.fn()} onAppearance={vi.fn()} onMore={vi.fn()} onMode={vi.fn()} onHide={vi.fn()} onExplore={vi.fn()} />)
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({ scriptMode: 'gurmukhi', meaningLanguage: 'en' })
})

test.each([
  ['pa', 'ਸੱਚਾ', 'pa-Guru'],
  ['hi', 'सत्य', 'hi'],
] as const)('keeps the selected %s word meaning when English is absent', (meaningLanguage, text, lang) => {
  useLanguageStore.setState({ meaningLanguage })
  renderDock({ ...context.word, meaning_en: '' })
  expect(screen.getByTestId('reader-word-meaning')).toHaveTextContent(text)
  expect(screen.getByTestId('reader-word-meaning')).toHaveAttribute('lang', lang)
  expect(screen.queryByText('English fallback')).not.toBeInTheDocument()
})

test('renders Punjabi word meaning in the reader script', () => {
  useLanguageStore.setState({ meaningLanguage: 'pa', scriptMode: 'devanagari' })
  renderDock()
  expect(screen.getByTestId('reader-word-meaning')).toHaveTextContent(renderScriptText(context.word.meaning_pa, 'devanagari'))
  expect(screen.getByTestId('reader-word-meaning')).toHaveAttribute('lang', 'hi')
  expect(screen.getByTestId('reader-word-meaning')).toHaveClass('font-devanagari')
})

test('explicitly identifies English fallback without tagging it as the UI language', () => {
  useLocaleStore.setState({ locale: 'pa' })
  useLanguageStore.setState({ meaningLanguage: 'hi' })
  renderDock({ ...context.word, meaning_hi: '' })
  expect(screen.getByText('ਉਪਲਬਧ ਅੰਗਰੇਜ਼ੀ ਅਰਥ')).toHaveAttribute('lang', 'pa-Guru')
  expect(screen.getByTestId('reader-word-meaning')).toHaveTextContent('True')
  expect(screen.getByTestId('reader-word-meaning')).toHaveAttribute('lang', 'en')
})

test.each([
  ['pa', 'pa-Guru', 'ਇਸ ਸ਼ਬਦ ਦੇ ਹਿੰਦੀ ਅਧਿਐਨ ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।'],
  ['hi', 'hi', 'इस शब्द का हिंदी अध्ययन अर्थ उपलब्ध नहीं है।'],
] as const)('tags the localized %s missing-language status as its actual language', (locale, lang, status) => {
  useLocaleStore.setState({ locale })
  useLanguageStore.setState({ meaningLanguage: 'hi' })
  renderDock({ ...context.word, meaning_en: '', meaning_hi: '' })
  expect(screen.getByTestId('reader-word-meaning')).toHaveTextContent(status)
  expect(screen.getByTestId('reader-word-meaning')).toHaveAttribute('lang', lang)
})

test('uses English for details when reading meanings are hidden', () => {
  useLanguageStore.setState({ meaningLanguage: 'none' })
  renderDock()
  expect(screen.getByTestId('reader-word-meaning')).toHaveTextContent('True')
  expect(screen.getByTestId('reader-word-meaning')).toHaveAttribute('lang', 'en')
  expect(screen.queryByText('English fallback')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Return to previous screen' })).toHaveAttribute('data-reader-back', 'true')
})
