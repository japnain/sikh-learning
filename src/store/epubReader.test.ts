import { DEFAULT_EPUB_READER_PREFERENCES, useEpubReaderStore } from './epubReader'

beforeEach(() => {
  window.localStorage.clear()
  useEpubReaderStore.setState(DEFAULT_EPUB_READER_PREFERENCES)
})

test('keeps EPUB reading preferences in safe ranges', () => {
  const store = useEpubReaderStore.getState()

  store.setFontScale(2)
  store.setLineHeight('spacious')
  store.setMeasure('narrow')
  store.setPalette('sepia')

  expect(useEpubReaderStore.getState()).toEqual(expect.objectContaining({
    fontScale: 1.3,
    lineHeight: 'spacious',
    measure: 'narrow',
    palette: 'sepia',
  }))
})

test('resets EPUB reading preferences', () => {
  useEpubReaderStore.setState({ fontScale: 1.2, palette: 'night' })
  useEpubReaderStore.getState().resetPreferences()

  expect(useEpubReaderStore.getState()).toEqual(expect.objectContaining(DEFAULT_EPUB_READER_PREFERENCES))
})
