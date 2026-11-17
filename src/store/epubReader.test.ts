import { act, renderHook } from '@testing-library/react'
import { useThemeStore } from './theme'
import { DEFAULT_EPUB_READER_PREFERENCES, useEpubReaderStore, useResolvedEpubPalette } from './epubReader'

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


test('follows app appearance by default while explicit palettes survive theme changes', () => {
  useThemeStore.getState().setMode('dark')
  const palette = renderHook(useResolvedEpubPalette)
  expect(palette.result.current).toBe('night')
  act(() => useThemeStore.getState().setMode('light'))
  expect(palette.result.current).toBe('paper')
  act(() => useEpubReaderStore.getState().setPalette('sepia'))
  act(() => useThemeStore.getState().setMode('dark'))
  expect(palette.result.current).toBe('sepia')
  expect(useEpubReaderStore.getState().palette).toBe('sepia')
})

test('restores an existing explicit version-one palette without migrating it to Follow app', async () => {
  localStorage.setItem('sikh-epub-reader-preferences', JSON.stringify({ state: { ...DEFAULT_EPUB_READER_PREFERENCES, palette: 'paper', fontScale: 1.4 }, version: 1 }))
  await useEpubReaderStore.persist.rehydrate()
  expect(useEpubReaderStore.getState()).toMatchObject({ palette: 'paper', fontScale: 1.4 })
})
