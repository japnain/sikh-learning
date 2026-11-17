import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const STORAGE_KEY = 'sikh-epub-reader-preferences'
const appearanceKeys = ['fontFamily', 'fontScale', 'lineHeight', 'measure', 'pageTurn', 'palette', 'paragraphSpacing', 'readingMode']

async function loadStore(persisted?: { version: number; state: Record<string, unknown> }) {
  vi.resetModules()
  localStorage.clear()
  if (persisted) localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  return import('./epubReader')
}

describe('persistent book appearance', () => {
  beforeEach(() => { vi.restoreAllMocks() })
  afterEach(() => { localStorage.clear() })

  test.each(['paper', 'night'] as const)('migrates an existing version-one %s preference without changing its reading appearance', async palette => {
    const oldAppearance = { fontScale: 1.45, lineHeight: 'spacious', measure: 'narrow', palette }
    const { useEpubReaderStore } = await loadStore({ version: 1, state: oldAppearance })
    expect(useEpubReaderStore.getState()).toMatchObject({ ...oldAppearance, fontFamily: 'literary', paragraphSpacing: 'comfortable' })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.version).toBe(2)
    expect(stored.state).toEqual({ ...oldAppearance, fontFamily: 'literary', paragraphSpacing: 'comfortable', readingMode: 'paged', pageTurn: 'curl' })
    expect(typeof useEpubReaderStore.getState().setFontFamily).toBe('function')
    expect(typeof useEpubReaderStore.getState().setParagraphSpacing).toBe('function')
  })

  test('keeps existing version-two appearance and defaults its missing paragraph spacing', async () => {
    const oldAppearance = { fontScale: 1.3, lineHeight: 'compact', measure: 'wide', palette: 'sepia', fontFamily: 'classic' }
    const { useEpubReaderStore } = await loadStore({ version: 2, state: oldAppearance })
    expect(useEpubReaderStore.getState()).toMatchObject({ ...oldAppearance, paragraphSpacing: 'comfortable' })
  })

  test('does not downgrade an unsupported future envelope during hydration', async () => {
    const future = { version: 3, state: { fontScale: 1.3, fontFamily: 'classic', futureSetting: true } }
    const { useEpubReaderStore, DEFAULT_EPUB_READER_PREFERENCES } = await loadStore(future)
    expect(useEpubReaderStore.getState()).toMatchObject(DEFAULT_EPUB_READER_PREFERENCES)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(future)
  })

  test('normalizes malformed current-version settings and ignores unexpected stored fields', async () => {
    const { useEpubReaderStore, DEFAULT_EPUB_READER_PREFERENCES } = await loadStore({
      version: 2,
      state: { fontScale: 'not a number', lineHeight: 'enormous', measure: 'full', palette: 'custom', fontFamily: 'remote-url', paragraphSpacing: 'negative', readingMode: 'remote', pageTurn: 'javascript:', bookId: 'synthetic-book', excerpt: 'Synthetic content must not hydrate.', bookmarks: ['a'] },
    })
    const state = useEpubReaderStore.getState()
    expect(state).toMatchObject(DEFAULT_EPUB_READER_PREFERENCES)
    expect(state).not.toHaveProperty('bookId')
    expect(state).not.toHaveProperty('excerpt')
    expect(state).not.toHaveProperty('bookmarks')
    state.setFontFamily('classic')
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(Object.keys(stored.state).sort()).toEqual(appearanceKeys)
    expect(stored.state).toEqual({ ...DEFAULT_EPUB_READER_PREFERENCES, fontFamily: 'classic' })
  })

  test.each([null, '1.3', '', true])('defaults a malformed persisted size of %s without coercion', async fontScale => {
    const { useEpubReaderStore, DEFAULT_EPUB_READER_PREFERENCES } = await loadStore({
      version: 2,
      state: { fontScale, fontFamily: 'classic' },
    })
    expect(useEpubReaderStore.getState().fontScale).toBe(DEFAULT_EPUB_READER_PREFERENCES.fontScale)
    expect(useEpubReaderStore.getState().fontFamily).toBe('classic')
  })

  test.each([['literary'], ['classic'], ['sans']] as const)('persists and rehydrates the %s font', async fontFamily => {
    const { useEpubReaderStore } = await loadStore()
    useEpubReaderStore.getState().setFontFamily(fontFamily)
    useEpubReaderStore.getState().setFontScale(1.3)
    const persisted = localStorage.getItem(STORAGE_KEY)!
    const reloaded = await loadStore(JSON.parse(persisted))
    expect(reloaded.useEpubReaderStore.getState()).toMatchObject({ fontFamily, fontScale: 1.3 })
    expect(Object.keys(JSON.parse(persisted).state).sort()).toEqual(appearanceKeys)
  })

  test.each(['app', 'paper', 'sepia', 'night'] as const)('persists and rehydrates the %s palette', async palette => {
    const { useEpubReaderStore } = await loadStore()
    useEpubReaderStore.getState().setPalette(palette)
    const reloaded = await loadStore(JSON.parse(localStorage.getItem(STORAGE_KEY)!))
    expect(reloaded.useEpubReaderStore.getState().palette).toBe(palette)
  })

  test.each(['compact', 'comfortable'] as const)('persists and rehydrates %s paragraph spacing', async paragraphSpacing => {
    const { useEpubReaderStore } = await loadStore()
    useEpubReaderStore.getState().setParagraphSpacing(paragraphSpacing)
    const persisted = localStorage.getItem(STORAGE_KEY)!
    const reloaded = await loadStore(JSON.parse(persisted))
    expect(reloaded.useEpubReaderStore.getState().paragraphSpacing).toBe(paragraphSpacing)
    expect(Object.keys(JSON.parse(persisted).state).sort()).toEqual(appearanceKeys)
  })

  test('follows the app theme by default while an explicit palette survives theme changes', async () => {
    const { useEpubReaderStore, useResolvedEpubPalette } = await loadStore()
    const { useThemeStore } = await import('./theme')
    useThemeStore.getState().setMode('dark')
    const palette = renderHook(useResolvedEpubPalette)
    expect(palette.result.current).toBe('night')
    act(() => useThemeStore.getState().setMode('light'))
    expect(palette.result.current).toBe('paper')
    act(() => useEpubReaderStore.getState().setPalette('sepia'))
    act(() => useThemeStore.getState().setMode('dark'))
    expect(palette.result.current).toBe('sepia')
    palette.unmount()
    useThemeStore.getState().setMode('light')
  })

  test('reset restores every appearance setting and does not persist account or reading data', async () => {
    const { useEpubReaderStore, DEFAULT_EPUB_READER_PREFERENCES } = await loadStore()
    const preferences = useEpubReaderStore.getState()
    preferences.setFontFamily('sans')
    preferences.setFontScale(1.8)
    preferences.setLineHeight('spacious')
    preferences.setMeasure('wide')
    preferences.setPalette('night')
    preferences.setParagraphSpacing('compact')
    preferences.setReadingMode('scroll')
    preferences.setPageTurn('fade')
    expect(useEpubReaderStore.getState()).toMatchObject({ fontFamily: 'sans', fontScale: 1.8, lineHeight: 'spacious', measure: 'wide', palette: 'night', paragraphSpacing: 'compact' })
    preferences.resetPreferences()
    expect(useEpubReaderStore.getState()).toMatchObject(DEFAULT_EPUB_READER_PREFERENCES)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(Object.keys(stored.state).sort()).toEqual(appearanceKeys)
    expect(stored).toEqual({ state: DEFAULT_EPUB_READER_PREFERENCES, version: 2 })
    expect(localStorage.length).toBe(1)
  })

  test('bounds persisted size and rejects unsupported font and paragraph spacing supplied at runtime', async () => {
    const { useEpubReaderStore } = await loadStore({ version: 2, state: { fontScale: 99, fontFamily: 'classic' } })
    expect(useEpubReaderStore.getState().fontScale).toBe(2)
    useEpubReaderStore.getState().setFontScale(-20)
    expect(useEpubReaderStore.getState().fontScale).toBe(0.85)
    useEpubReaderStore.getState().setFontScale(Number.NaN)
    expect(useEpubReaderStore.getState().fontScale).toBe(1)
    useEpubReaderStore.getState().setFontFamily('invalid' as 'literary')
    expect(useEpubReaderStore.getState().fontFamily).toBe('literary')
    useEpubReaderStore.getState().setParagraphSpacing('invalid' as 'compact')
    expect(useEpubReaderStore.getState().paragraphSpacing).toBe('comfortable')
    useEpubReaderStore.getState().setReadingMode('invalid' as 'paged')
    useEpubReaderStore.getState().setPageTurn('invalid' as 'curl')
    expect(useEpubReaderStore.getState()).toMatchObject({ readingMode: 'paged', pageTurn: 'curl' })
  })

  test.each(['paged', 'scroll'] as const)('persists %s reading mode without book data', async readingMode => {
    const { useEpubReaderStore } = await loadStore()
    useEpubReaderStore.getState().setReadingMode(readingMode)
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    const reloaded = await loadStore(persisted)
    expect(reloaded.useEpubReaderStore.getState().readingMode).toBe(readingMode)
    expect(Object.keys(persisted.state).sort()).toEqual(appearanceKeys)
  })

  test.each(['curl', 'fade'] as const)('persists the %s page turn style', async pageTurn => {
    const { useEpubReaderStore } = await loadStore()
    useEpubReaderStore.getState().setPageTurn(pageTurn)
    const reloaded = await loadStore(JSON.parse(localStorage.getItem(STORAGE_KEY)!))
    expect(reloaded.useEpubReaderStore.getState().pageTurn).toBe(pageTurn)
  })
})
