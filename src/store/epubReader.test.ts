import { DEFAULT_EPUB_READER_PREFERENCES, useEpubReaderStore } from './epubReader'

beforeEach(() => {
  window.localStorage.clear()
  useEpubReaderStore.setState(DEFAULT_EPUB_READER_PREFERENCES)
})

test('keeps EPUB reading preferences in safe ranges', () => {
  const store = useEpubReaderStore.getState()

  store.setFontScale(3)
  store.setLineHeight('spacious')
  store.setMeasure('narrow')
  store.setPalette('sepia')

  expect(useEpubReaderStore.getState()).toEqual(expect.objectContaining({
    fontScale: 2,
    lineHeight: 'spacious',
    measure: 'narrow',
    palette: 'sepia',
  }))
})

test('supports double-size prose and rejects invalid text sizes', () => {
  const store = useEpubReaderStore.getState()
  store.setFontScale(2)
  expect(useEpubReaderStore.getState().fontScale).toBe(2)
  store.setFontScale(0)
  expect(useEpubReaderStore.getState().fontScale).toBe(0.85)
  store.setFontScale(Number.NaN)
  expect(useEpubReaderStore.getState().fontScale).toBe(1)
})

test('resets EPUB reading preferences', () => {
  useEpubReaderStore.setState({ fontScale: 1.2, palette: 'night' })
  useEpubReaderStore.getState().resetPreferences()

  expect(useEpubReaderStore.getState()).toEqual(expect.objectContaining(DEFAULT_EPUB_READER_PREFERENCES))
})
