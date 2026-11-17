import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Study from './Study'
import * as baniApi from '../api/banidb'
import { fetchShabadosBani } from '../api/shabados'
import { readDownloadedBani } from '../utils/baniDownloads'
import { shabadosReadingFixture } from '../test/shabadosFixture'
import { mockDocumentScroll } from '../test/documentScroll'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useProgressStore } from '../store/progress'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { buildSavedStudyPath } from '../utils/savedStudyPath'

vi.mock('../api/shabados', async importOriginal => ({
  ...await importOriginal<typeof import('../api/shabados')>(), fetchShabadosBani: vi.fn(),
}))
vi.mock('../utils/baniDownloads', () => ({ readDownloadedBani: vi.fn() }))

const reading = shabadosReadingFixture()
const firstVerse = reading.entries[0].lines![1]
let documentScroll: ReturnType<typeof mockDocumentScroll> | null = null

beforeEach(() => {
  localStorage.clear()
  vi.mocked(readDownloadedBani).mockReset().mockResolvedValue(reading)
  vi.mocked(fetchShabadosBani).mockReset().mockResolvedValue(reading)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.setState({ currentSession: null })
  useScriptureCacheStore.getState().clearAll()
  useLanguageStore.setState({ scriptMode: 'gurmukhi', showTransliteration: false, meaningLanguage: 'en', englishSource: 'bdb', fontSize: 22 })
  useLocaleStore.setState({ locale: 'en' })
  useSundarGutkaLengthStore.setState({ lengths: { 'rehras-sahib': 'long', 'chaupai-sahib': 'short', aarti: 'short', 'kirtan-sohila': 'short' } })
})
afterEach(() => { documentScroll?.restore(); documentScroll = null; vi.restoreAllMocks() })

function openReading(extra = '') {
  return render(<MemoryRouter initialEntries={[`/study?shabadosBani=ALHN&source=G&bani=Alahnia${extra}`]}>
    <Routes><Route path="/study" element={<Study />} /></Routes>
  </MemoryRouter>)
}

describe('Shabad OS in the existing reader', () => {
  it('opens downloaded headings and lines in order with the existing reader controls and no BaniDB calls', async () => {
    const fetchAng = vi.spyOn(baniApi, 'fetchAng')
    const fetchBani = vi.spyOn(baniApi, 'fetchBani')
    const fetchShabad = vi.spyOn(baniApi, 'fetchShabad')
    const fetchWords = vi.spyOn(baniApi, 'fetchShabadWords')
    openReading('&ang=578')
    await screen.findByRole('heading', { name: 'Alahnia' })
    const lines = await screen.findAllByTestId('study-line')
    expect(lines.map(line => Number(line.dataset.verseId))).toEqual(reading.entries[0].lines!.map(line => line.verseId))
    expect(lines[0]).toHaveTextContent('ਸਲੋਕੁ ॥')
    expect(lines[2]).toHaveTextContent('ਸਚੁ ਨਾਮੁ ਅਧਾਰੁ ਮੇਰਾ ॥')
    const header = screen.getByTestId('study-reader-topbar')
    fireEvent.click(within(header).getByRole('radio', { name: 'Read', exact: true }))
    expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'read')
    fireEvent.click(within(header).getByRole('radio', { name: 'Study', exact: true }))
    expect(screen.getByTestId('page-study')).toHaveAttribute('data-reader-presentation', 'study')
    expect(within(header).getByRole('button', { name: 'Reading appearance', exact: true })).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Reading tools' })).toBeInTheDocument()
    expect(fetchShabadosBani).not.toHaveBeenCalled()
    expect(fetchAng).not.toHaveBeenCalled()
    expect(fetchBani).not.toHaveBeenCalled()
    expect(fetchShabad).not.toHaveBeenCalled()
    expect(fetchWords).not.toHaveBeenCalled()
    expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('long')
    fireEvent.click(screen.getByRole('button', { name: 'Contents' }))
    const find = await screen.findByRole('searchbox', { name: 'Find within this bani' })
    fireEvent.change(find, { target: { value: 'ਆਧਾਰੋ' } })
    expect(await screen.findByText('1 matching line')).toBeInTheDocument()
    const result = screen.getByRole('button', { name: /^ਸਚੁ ਨਾਮੁ ਮੇਰਾ ਆਧਾਰੋ/ })
    fireEvent.click(result)
    expect(screen.queryByRole('searchbox', { name: 'Find within this bani' })).not.toBeInTheDocument()
  })

  it('saves and reopens a verse within its Shabad OS reading without a BaniDB shabad identity', async () => {
    openReading()
    await screen.findAllByTestId('study-line')
    fireEvent.click(screen.getAllByRole('button', { name: /Open verse actions/ })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark', exact: true }))
    const bookmark = useBookmarksStore.getState().bookmarks[0]
    expect(bookmark).toMatchObject({ type: 'verse', verseId: firstVerse.verseId, source: 'G', ang: 578 })
    expect(bookmark).toHaveProperty('shabadId', undefined)
    const path = buildSavedStudyPath(bookmark)
    const params = new URLSearchParams(path.split('?')[1])
    expect(params.get('shabadosBani')).toBe('ALHN')
    expect(params.get('resumeVerseId')).toBe(String(firstVerse.verseId))
    expect(params.has('baniDbId')).toBe(false)
    expect(params.has('shabadId')).toBe(false)
    fireEvent.click(screen.getAllByRole('button', { name: /Open verse actions/ })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark', exact: true }))
    expect(useBookmarksStore.getState().bookmarks).toEqual([])
  })

  it('restores a saved local line and persists its provider-scoped reading place', async () => {
    documentScroll = mockDocumentScroll({ top: 0, viewportHeight: 800, scrollHeight: 2400 })
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
    openReading(`&ang=578&resumeSource=G&resumeVerseId=${firstVerse.verseId}`)
    const lines = await screen.findAllByTestId('study-line')
    const target = lines.find(line => line.dataset.verseId === String(firstVerse.verseId))!
    await waitFor(() => expect(scrollIntoView.mock.instances).toContain(target))
    await waitFor(() => expect(useReadingPlacesStore.getState().places['shabados:ALHN']?.resumeVerseId).toBe(firstVerse.verseId))
    const saved = useReadingPlacesStore.getState().places['shabados:ALHN']
    expect(saved.scriptureId).toBe('shabados-ALHN')
    expect(saved.resumePath).toContain('shabadosBani=ALHN')
    expect(saved.resumePath).not.toContain('baniDbId')
    for (const [index, line] of lines.entries()) {
      const top = 200 + (index - 2) * 1000
      vi.spyOn(line, 'getBoundingClientRect').mockReturnValue({ x: 0, y: top, top, right: 390, bottom: top + 60,
        left: 0, width: 390, height: 60, toJSON: () => ({}) })
    }
    fireEvent(document, new Event('scrollend'))
    await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(reading.entries[0].lines![2].verseId))
    expect(useScriptureCacheStore.getState().getEntryById(reading.entries[0].id)?.readerReturnPath)
      .toContain('shabadosBani=ALHN')
    await act(async () => { await Promise.resolve() })
  })

  it('persists an exact Shabad OS verse favorite and reopens it within the same reading', async () => {
    openReading(`&ang=578&verseId=${firstVerse.verseId}&resumeVerseId=${firstVerse.verseId}`)
    await screen.findAllByTestId('study-line')
    fireEvent.click(within(screen.getByTestId('study-reader-topbar')).getByRole('button', { name: 'Reading tools' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add favorite', exact: true }))
    const favorite = useFavoritesStore.getState().favorites[0]
    expect(favorite).toMatchObject({ routeMode: 'verse', verseId: firstVerse.verseId })
    expect(favorite.shabadId).toBeUndefined()
    await act(async () => {
      useFavoritesStore.setState({ favorites: [] })
      useFavoritesStore.getState().hydrateCachedFavorites()
    })
    expect(useFavoritesStore.getState().favorites).toEqual([favorite])
    const params = new URLSearchParams(buildSavedStudyPath(favorite).split('?')[1])
    expect(params.get('shabadosBani')).toBe('ALHN')
    expect(params.get('verseId')).toBe(String(firstVerse.verseId))
    expect(params.has('shabadId')).toBe(false)
  })
})
