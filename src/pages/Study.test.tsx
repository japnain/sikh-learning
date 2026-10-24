import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Study from './Study'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'
import { useMusicStore } from '../store/music'
import { useProgressStore } from '../store/progress'
import { getExactReadingKey, useReadingPlacesStore } from '../store/readingPlaces'
import { buildNitnemStudyPath, getNitnemOption } from '../store/nitnem'
import { getHomeNitnemResume } from '../utils/homeNitnemResume'
import { useReadingProgressStore } from '../store/readingProgress'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useVocabStore } from '../store/vocab'
import {
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  DAILY_HUKAMNAMA_EDITORIAL_COPY,
  PERSONAL_HUKAMNAMA_EDITORIAL_COPY,
  getReaderEditorialCopyForBani,
} from '../content/readerEditorialCopy'
import { server } from '../test/msw-server'
import { MOCK_BANI_RESPONSE, MOCK_HUKAMNAMA_RESPONSE, MOCK_REHRAS_BANI_RESPONSE } from '../test/msw-handlers'
import { mockDocumentScroll } from '../test/documentScroll'

vi.mock('../features/shareHighlight/ShareHighlightSheet', () => ({
  default: ({ content, onClose }: {
    content: {
      gurmukhi: string
      sourceLabel: string
      passageLines?: Array<{
        id: string | number
        gurmukhi: string
        meaning?: string
        isHeader?: boolean
      }>
      seriesLabel?: string
      dateLabel?: string
      sourcePath?: string
      sharePath?: string
      passageKind?: 'daily-hukamnama' | 'personal-hukamnama'
      provenance?: {
        ceremonyLocation?: string
        scripture?: string
        raag?: string
        writer?: string
        translationLabel?: string
        translationLanguage?: 'en' | 'pa' | 'hi'
        dateIso?: string
      }
    }
    onClose: () => void
  }) => (
    <div role="dialog" aria-label="Share highlight" data-testid="share-highlight-sheet-test-double">
      <button type="button" onClick={onClose}>Close share image</button>
      <p data-testid="share-flattened-gurmukhi">{content.gurmukhi}</p>
      <p>{content.sourceLabel}</p>
      {content.sourcePath ? <p data-testid="share-source-path">{content.sourcePath}</p> : null}
      {content.sharePath ? <p data-testid="share-short-path">{content.sharePath}</p> : null}
      {content.passageKind ? <p data-testid="share-passage-kind">{content.passageKind}</p> : null}
      {content.provenance ? (
        <pre data-testid="share-provenance">{JSON.stringify(content.provenance)}</pre>
      ) : null}
      {content.seriesLabel ? <p data-testid="share-series-label">{content.seriesLabel}</p> : null}
      {content.dateLabel ? <p data-testid="share-date-label">{content.dateLabel}</p> : null}
      {content.passageLines?.map(line => (
        <div key={line.id}>
          <p
            data-testid="share-passage-line"
            data-is-header={line.isHeader ? 'true' : 'false'}
          >
            {line.gurmukhi}
          </p>
          {line.meaning ? (
            <p data-testid="share-passage-meaning">{line.meaning}</p>
          ) : null}
        </div>
      ))}
    </div>
  ),
}))

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

async function openReaderTools() {
  const existing = screen.queryByRole('dialog', { name: 'Reading tools' })
  if (existing) return existing
  fireEvent.click(await screen.findByRole('button', { name: 'Reading tools' }))
  return screen.getByRole('dialog', { name: 'Reading tools' })
}

function expandReaderDetails(scope: HTMLElement, label: string) {
  const summary = within(scope).getByText(label, { exact: true }).closest('summary')
  expect(summary).not.toBeNull()
  fireEvent.click(summary!)
  expect(scope).toBeInTheDocument()
  expect(summary!.closest('details')).toHaveAttribute('open')
}

async function openReaderAbout() {
  const tools = await openReaderTools()
  expandReaderDetails(tools, 'About this reading')
  return tools
}

async function openReaderSettings(section?: 'Study layers' | 'Text options') {
  fireEvent.click(await within(screen.getByTestId('study-reader-topbar')).findByRole('button', { name: 'Reading appearance', exact: true }))
  const sheet = screen.getByRole('dialog', { name: 'Reading appearance', exact: true })
  if (section) expandReaderDetails(sheet, section)
  return sheet
}

let documentScroll: ReturnType<typeof mockDocumentScroll> | null = null

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(window.navigator, 'share', {
    configurable: true,
    value: undefined,
  })
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
  useSavedFeedbackStore.getState().clearSaved()
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useScriptureCacheStore.getState().clearAll()
  useVocabStore.setState({ vocab: [] })
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
  useReadingProgressStore.setState({ progress: {} })
  useMusicStore.setState({
    selectedSoundId: null,
    selectedPresetId: null,
    isPlaying: false,
    volume: 0.6,
  })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    larivaar: false,
    showVishraam: true,
    lineSpacing: 'relaxed',
    textAlign: 'left',
    fontSize: 22,
    englishSource: 'bdb',
    punjabiSource: 'ss',
    hindiSource: 'ss',
    visraamSource: 'sttm',
  })
  useSundarGutkaLengthStore.setState({
    lengths: {
      'chaupai-sahib': 'short',
      'rehras-sahib': 'short',
      aarti: 'short',
      'kirtan-sohila': 'short',
    },
  })
})

afterEach(() => {
  documentScroll?.restore()
  documentScroll = null
})

describe('Study bookmark button', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
  })

  test('bookmark button not rendered when not in API mode', () => {
    render(<MemoryRouter><Study /></MemoryRouter>)
    // In non-API mode (scripture picker), bookmark button should not appear
    expect(screen.queryByLabelText(/bookmark/i)).not.toBeInTheDocument()
  })

  test('bookmark button rendered in API mode after entries load', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await openReaderTools()
    await waitFor(() => expect(screen.queryByLabelText(/add bookmark/i)).toBeInTheDocument())
  })

  test('bookmark form appears on clicking unactive bookmark button', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
    window.innerWidth = 390

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await openReaderTools()
    await waitFor(() => expect(screen.queryByLabelText(/add bookmark/i)).toBeInTheDocument())
    const scrollCallsBeforeOpen = scrollSpy.mock.calls.length
    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add bookmark/i))

    const bookmarkForm = await screen.findByTestId('study-bookmark-form')
    const bookmarkInput = within(bookmarkForm).getByLabelText('Bookmark note')

    expect(bookmarkForm).toBeVisible()
    expect(within(bookmarkForm).getByRole('button', { name: 'Save Bookmark' })).toBeInTheDocument()
    await waitFor(() => {
      expect(bookmarkInput).toHaveFocus()
      expect(scrollSpy).toHaveBeenCalledTimes(scrollCallsBeforeOpen)
    })
  })

  test('clicking save bookmark adds to store', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await openReaderTools()
    await waitFor(() => expect(screen.queryByLabelText(/add bookmark/i)).toBeInTheDocument())
    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add bookmark/i))
    const bookmarkForm = await screen.findByTestId('study-bookmark-form')
    fireEvent.click(within(bookmarkForm).getByRole('button', { name: 'Save Bookmark' }))
    expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
    expect(screen.getByText(/bookmark saved/i)).toBeInTheDocument()

    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/remove bookmark/i))
    expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(false)
    expect(screen.getByText(/bookmark removed/i)).toBeInTheDocument()
  })

  test('favoriting the current passage shows explicit feedback', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await openReaderTools()
    await waitFor(() => expect(screen.queryByLabelText(/add favorite/i)).toBeInTheDocument())
    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add favorite/i))

    expect(screen.getByText(/added to favorites/i)).toBeInTheDocument()
    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/remove favorite/i))
    expect(useFavoritesStore.getState().favorites).toHaveLength(0)
    expect(screen.getByText(/removed from favorites/i)).toBeInTheDocument()
  })

  test('does not treat same-Ang legacy saves as the dated Hukamnama', async () => {
    useBookmarksStore.setState({ bookmarks: [{
      id: 'bookmark-legacy-ang-680',
      type: 'bani',
      title: 'Legacy Ang 680',
      source: 'G',
      ang: 680,
      savedAt: '2026-08-10T12:00:00.000Z',
    }] })
    useFavoritesStore.setState({ favorites: [{
      id: 'favorite-legacy-ang-680',
      title: 'Legacy Ang 680',
      source: 'G',
      ang: 680,
      type: 'ang',
      routeMode: 'canonical',
      savedAt: '2026-08-10T12:00:00.000Z',
    }] })

    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await openReaderTools()
    await screen.findByLabelText(/add bookmark/i)
    expect(screen.getByLabelText(/add favorite/i)).toBeInTheDocument()

    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add favorite/i))
    expect(useFavoritesStore.getState().favorites).toHaveLength(2)

    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add bookmark/i))
    const bookmarkForm = await screen.findByTestId('study-bookmark-form')
    fireEvent.click(within(bookmarkForm).getByRole('button', { name: 'Save Bookmark' }))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(2)
  })

  test('opens the visual share composer before invoking a native share target', async () => {
    const share = vi.fn()
    const writeText = vi.fn()

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: share,
    })
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await openReaderTools()
    await waitFor(() => expect(screen.getByLabelText(/^share$/i)).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText(/^share$/i))

    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    expect(composer).toHaveTextContent(/ੴ/)
    expect(composer).toHaveTextContent(/Ang 1/i)
    expect(within(composer).getByTestId('share-source-path')).toHaveTextContent(
      '/study?shabadId=1&verseId=1'
    )
    expect(share).not.toHaveBeenCalled()
    expect(writeText).not.toHaveBeenCalled()
  })

})

describe('Study source browsing', () => {
  test('does not render source browsing inside reader routes', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await screen.findByTestId('study-entry-list')

    expect(screen.queryByTestId('study-source-browser-shell')).not.toBeInTheDocument()
    expect(screen.queryByTestId('study-source-browser')).not.toBeInTheDocument()
  })

  test('keeps regular Ang navigation available as a compact persistent control', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo')

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes>
          <Route
            path="/study"
            element={(
              <main id="main-content" tabIndex={-1}>
                <Study />
                <LocationSpy />
              </main>
            )}
          />
        </Routes>
      </MemoryRouter>
    )

    const navigation = await screen.findByTestId('study-ang-navigation')
    expect(navigation).toHaveClass('study-reader-ang-navigation')
    expect(within(navigation).getByRole('button', { name: /Ang 1/i })).toBeDisabled()
    const nextAngButton = within(navigation).getByRole('button', { name: /Ang 2/i })
    expect(nextAngButton).toBeEnabled()

    fireEvent.click(nextAngButton)

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/study?source=G&ang=2')
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
      expect(document.getElementById('main-content')).toHaveFocus()
    })
  })
})

describe('Study reader title hierarchy', () => {
  it('keeps a named bani as the single page heading in the reader topbar from loading through ready', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji%20Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    expect(within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
      level: 1,
      name: 'Japji Sahib',
    })).toBeInTheDocument()

    await screen.findAllByTestId('study-card')

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Japji Sahib')
    expect(screen.getByTestId('study-reader-topbar')).toContainElement(headings[0]!)
  })

  it('keeps a direct Ang route stable instead of replacing it with the first shabad line', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    expect(within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
      level: 1,
      name: 'Ang 1',
    })).toBeInTheDocument()

    await screen.findAllByTestId('study-card')

    const topbar = screen.getByTestId('study-reader-topbar')
    expect(within(topbar).getByRole('heading', { level: 1 })).toHaveTextContent('Ang 1')
    expect(within(topbar).queryByRole('heading', { level: 1, name: /ੴ ਸਤਿ ਨਾਮੁ/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('uses the loaded exact-shabad line as a correctly identified Gurmukhi heading', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await screen.findAllByTestId('study-card')

    const heading = within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
      level: 1,
      name: 'ੴ ਸਤਿ ਨਾਮੁ',
    })
    expect(heading).toHaveAttribute('lang', 'pa-Guru')
    expect(heading).toHaveClass('script-text-safe', 'font-gurmukhi')
    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([heading])
  })

  it('keeps Personal Hukamnama stable after its exact shabad loads', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&flow=ardaas-hukamnama&randomHukamnamaAng=1&resumeVerseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await screen.findAllByTestId('study-card')

    const heading = within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
      level: 1,
      name: 'Personal Hukamnama',
    })
    expect(heading).toHaveClass('font-display')
    expect(heading).not.toHaveAttribute('lang')
    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([heading])
  })

  it.each([
    {
      baniDbId: 7,
      path: '/study?source=D&ang=11&startAng=11&endAng=37&baniDbId=7&exactBani=1&baniId=tav-prasad-savaiye',
      title: 'Tav Prasad Savaiye (Dheenan Ki)',
    },
    {
      baniDbId: 26,
      path: '/study?source=D&ang=1428&startAng=1428&endAng=1428&baniDbId=26&exactBani=1&baniId=sri-bhagauti-astotr',
      title: 'Sri Bhagauti Astotr (Hazur Sahib)',
    },
  ])('resolves BaniDB $baniDbId to its exact variant title', async ({ path, title }) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await screen.findAllByTestId('study-card')

    const heading = within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
      level: 1,
      name: title,
    })
    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([heading])
  })

  it('keeps an empty-state message subordinate to the opened reading title', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=9999&startAng=9999&endAng=9999&bani=Empty%20Reading']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const stateHeading = await screen.findByRole('heading', {
      level: 2,
      name: 'This passage isn’t available.',
    })
    const pageHeadings = screen.getAllByRole('heading', { level: 1 })

    expect(pageHeadings).toHaveLength(1)
    expect(pageHeadings[0]).toHaveTextContent('Empty Reading')
    expect(screen.getByTestId('study-reader-topbar')).toContainElement(pageHeadings[0]!)
    expect(stateHeading).toBeInTheDocument()
  })
})

describe('Study renders all shabads on an ang', () => {
  it('opens the complete source navigator without showing a duplicate end-of-bani outline', async () => {
    render(<MemoryRouter initialEntries={['/study?source=G&ang=1']}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
    await screen.findByTestId('study-entry-list')
    expect(screen.queryByTestId('study-entry-outline')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Contents', exact: true })[0]!)
    const navigator = screen.getByRole('dialog', { name: 'Contents' })
    expect(within(navigator).getAllByRole('listitem')).toHaveLength(2)
    expect(within(navigator).getAllByText(/Ang 1/)).toHaveLength(2)
  })

  it('renders multiple study cards for all shabads on a page', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    // Mock data has 2 shabads (shabadId 1 and 2), so we should see 2 study cards
    await waitFor(() => {
      const cards = screen.getAllByTestId('study-card')
      expect(cards.length).toBe(2)
    })
  })

  it('shows content from all shabads, not just the first', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    // Shabad 1 text (from mock): ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ + ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ
    // Shabad 2 text (from mock): ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ
    await waitFor(() => {
      expect(screen.getByText('ੴ')).toBeInTheDocument()
      expect(screen.getByText('ਸੋਚੈ')).toBeInTheDocument()
    })
  })

  it('renders separate verse blocks inside the reader', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const lines = screen.getAllByTestId('study-line')
      expect(lines.length).toBeGreaterThan(2)
    })
  })

  it('keeps the study route stable when opening a word popover', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes>
          <Route path="/study" element={<><Study /><LocationSpy /></>} />
          <Route path="/" element={<LocationSpy />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(0)
    })

    const firstInlineWord = screen.getAllByTestId('study-card')[0]!.querySelector<HTMLElement>('[data-reader-word]')
    expect(firstInlineWord).not.toBeNull()
    fireEvent.click(firstInlineWord!)

    expect(screen.getByTestId('location').textContent).toBe('/study?source=G&ang=1')
  })

  it('keeps verse actions hidden until the overflow menu is opened', async () => {
    window.innerWidth = 390

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /open verse actions/i }).length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('dialog', { name: /verse actions/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Save Phrase$/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /open verse actions/i })[0])

    const dialog = screen.getByRole('dialog', { name: /verse actions/i })
    const actionSheet = screen.getByTestId('study-verse-actions-sheet')

    expect(actionSheet).toBeVisible()
    expect(within(dialog).getByRole('button', { name: /save verse/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^Copy$/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^Share verse$/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^Bookmark$/i })).toBeInTheDocument()
  })

  it('can save a full verse as a phrase for review', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /open verse actions/i }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: /open verse actions/i })[0])
    fireEvent.click(
      within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: /save verse/i })
    )

    expect(
      useVocabStore.getState().vocab.some(item => item.kind === 'phrase' && item.word.includes('ੴ'))
    ).toBe(true)
  })

  it('keeps a failed verse save session-only and retries the same phrase without changing its review or context', async () => {
    const mounted = render(<MemoryRouter initialEntries={['/study?source=G&ang=1']}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
    await screen.findAllByRole('button', { name: /open verse actions/i })
    const openActions = () => fireEvent.click(screen.getAllByRole('button', { name: /open verse actions/i })[0])
    openActions()
    const originalWrite = localStorage.setItem.bind(localStorage)
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'sikh-vocab') throw new Error('Storage full')
      originalWrite(key, value)
    })
    try {
      fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: 'Save verse', exact: true }))
      expect(screen.getByRole('status')).toHaveTextContent('Saved for this session, but device storage is unavailable.')
      expect(screen.getByRole('status')).not.toHaveTextContent('Verse saved to review.')
      const retained = useVocabStore.getState().vocab.find(item => item.kind === 'phrase')!
      expect(retained).toBeDefined()
      const originalContext = structuredClone(retained.context)
      const originalReview = structuredClone(retained.review)
      mounted.unmount()
      render(<MemoryRouter initialEntries={['/study?source=G&ang=1']}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
      await screen.findAllByRole('button', { name: /open verse actions/i })
      openActions()
      const dialog = screen.getByRole('dialog', { name: /verse actions/i })
      expect(within(dialog).queryByRole('button', { name: 'Verse saved', exact: true })).not.toBeInTheDocument()
      const retry = within(dialog).getByRole('button', { name: 'Save verse', exact: true })
      write.mockRestore()
      fireEvent.click(retry)
      expect(screen.getByRole('status')).toHaveTextContent('Verse saved to review.')
      const phrases = useVocabStore.getState().vocab.filter(item => item.kind === 'phrase')
      expect(phrases).toHaveLength(1)
      expect(phrases[0]).toMatchObject({ word: retained.word, context: originalContext, review: originalReview })
      const persisted = JSON.parse(localStorage.getItem('sikh-vocab')!).state.vocab.filter((item: { kind?: string }) => item.kind === 'phrase')
      expect(persisted).toHaveLength(1)
      expect(persisted[0]).toMatchObject({ word: retained.word, context: originalContext, review: originalReview })
      openActions()
      expect(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: 'Verse saved', exact: true })).toBeInTheDocument()
    } finally {
      write.mockRestore()
    }
  })

  it('keeps unattributed Sundar Gutka phrases neutral and shares their exact bani route', async () => {
    server.use(http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
      const body = await request.json() as { path?: string }
      if (body.path !== '/v2/banis/21') return
      return HttpResponse.json({
        baniInfo: { baniID: 21, source: { sourceId: null } },
        verses: MOCK_REHRAS_BANI_RESPONSE.verses.map(item => ({
          ...item,
          verse: Object.fromEntries(Object.entries(item.verse).filter(([key]) => key !== 'source' && key !== 'shabadId')),
        })),
      })
    }))
    const option = getNitnemOption('rehras-sahib')!
    render(
      <MemoryRouter initialEntries={[buildNitnemStudyPath(option)]}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    expect((await screen.findAllByText('Sundar Gutka')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: /open verse actions/i })[0])
    fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: /save verse/i }))
    const phrase = useVocabStore.getState().vocab.find(item => item.kind === 'phrase')!
    expect(phrase).toMatchObject({ scripture: 'Sundar Gutka', sourceId: '', context: { scripture: 'Sundar Gutka', sourceId: '' } })
    expect(phrase.context).not.toHaveProperty('shabadId')
    expect(phrase.context).not.toHaveProperty('verseId')

    fireEvent.click(screen.getAllByRole('button', { name: /open verse actions/i })[0])
    fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: 'Share verse' }))
    const sharePath = await screen.findByTestId('share-source-path')
    expect(getExactReadingKey(sharePath.textContent)).toBe(getExactReadingKey(buildNitnemStudyPath(option)))
    expect(sharePath.textContent).toContain('resumeVerseId=')
    expect(sharePath.textContent).not.toContain('shabadId=')
  })

  it('uses the selected English translation source', async () => {
    useLanguageStore.setState({ englishSource: 'ms' })
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/There is but One God/i)).toBeInTheDocument()
    })
  })

  it('shows transliteration after toggling it on', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(0)
    })

    await openReaderSettings('Study layers')
    fireEvent.click(screen.getByRole('button', { name: /transliteration off/i }))

    expect(within(screen.getByTestId('study-entry-list')).getByText(/ikOankaar sat naam/i)).toBeInTheDocument()
  })

  it('switches meanings inside the reader controls', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('One Universal Creator God. The Name Is Truth.')).toBeInTheDocument()
    })

    await openReaderSettings('Text options')
    fireEvent.click(screen.getByRole('button', { name: /^Punjabi$/i }))

    expect(within(screen.getByTestId('study-entry-list')).getByText(/ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ/i)).toBeInTheDocument()
    expect(screen.queryByText('One Universal Creator God. The Name Is Truth.')).not.toBeInTheDocument()
  })

  it('does not show a bani start marker on the first ang of a named bani route', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1&startAng=1&bani=Japji%20Sahib&endAng=8']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('Japji Sahib starts here')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ang 0/i })).not.toBeInTheDocument()
  })

  it('does not show a bani start marker after the first ang either', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=2&startAng=1&bani=Japji%20Sahib&endAng=8']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText('Japji Sahib starts here')).not.toBeInTheDocument()
  })

  it('labels Bhai Gurdas navigation as Vaars and stops at Vaar 40', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=B&ang=40']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(0)
    })

    expect(within(screen.getByTestId('study-reader-topbar')).getByText('Vaar 40')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vaar 39/i })).toBeEnabled()
    expect(within(screen.getByTestId('study-ang-navigation')).getByRole('button', { name: /Vaar 40/i })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Ang 39/i })).not.toBeInTheDocument()
  })
})

describe('Study soundscapes and tracking', () => {
  it('keeps soundscapes in reading tools, collapsed by default, with playback controls', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Reading tools' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /expand soundscapes/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /Settle/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /play soundscape/i }))
    expect(useMusicStore.getState().selectedSoundId).toBe('mountain-stream')
    expect(useMusicStore.getState().isPlaying).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /expand soundscapes/i }))
    expect(screen.getByRole('button', { name: /Settle/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pause soundscape/i }))
    expect(useMusicStore.getState().selectedSoundId).toBe('mountain-stream')
    expect(useMusicStore.getState().isPlaying).toBe(false)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close', exact: true }))
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))) })
  })

  it('updates reading progress only after scrolling settles and avoids layout width writes', async () => {
    documentScroll = mockDocumentScroll({
      top: 600,
      viewportHeight: 800,
      scrollHeight: 2400,
    })
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const reading = await screen.findByTestId('study-entry-list')
    Object.defineProperty(reading, 'scrollHeight', { configurable: true, value: 2000 })
    vi.spyOn(reading, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: -400,
      top: -400,
      right: 390,
      bottom: 400,
      left: 0,
      width: 390,
      height: 800,
      toJSON: () => ({}),
    })

    fireEvent(window, new Event('resize'))

    const progress = screen.getByRole('progressbar', { name: 'Reading position' })
    const progressBar = progress.firstElementChild as HTMLElement
    await waitFor(() => expect(progress).toHaveAttribute('aria-valuenow', '38'))

    const settledTransform = progressBar.style.transform
    expect(settledTransform).toMatch(/^scaleX\(0\.37/)
    expect(progressBar.style.width).toBe('')

    documentScroll.setTop(700)
    for (let index = 0; index < 12; index += 1) {
      fireEvent.scroll(window)
    }

    expect(progress).toHaveAttribute('aria-valuenow', '38')
    expect(progressBar.style.transform).toBe(settledTransform)

    fireEvent(document, new Event('scrollend'))
    await waitFor(() => expect(progress).toHaveAttribute('aria-valuenow', '45'))
  })

  it('persists the visible verse on scroll end without work during active scrolling', async () => {
    const originalUpdateSession = useProgressStore.getState().updateSession
    const updateSessionSpy = vi.fn(originalUpdateSession)
    useProgressStore.setState({ updateSession: updateSessionSpy })

    try {
      documentScroll = mockDocumentScroll({
        top: 700,
        viewportHeight: 800,
        scrollHeight: 2400,
      })
      render(
        <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
          <Routes><Route path="/study" element={<Study />} /></Routes>
        </MemoryRouter>
      )

      const lines = await screen.findAllByTestId('study-line')
      await waitFor(() => {
        expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(1)
      })

      lines.forEach((line, index) => {
        vi.spyOn(line, 'getBoundingClientRect').mockReturnValue({
          x: 0,
          y: index === 1 ? 200 : -100,
          top: index === 1 ? 200 : -100,
          right: 390,
          bottom: index === 1 ? 260 : -40,
          left: 0,
          width: 390,
          height: 60,
          toJSON: () => ({}),
        })
      })
      updateSessionSpy.mockClear()

      for (let index = 0; index < 12; index += 1) {
        fireEvent.scroll(window)
      }

      expect(updateSessionSpy).not.toHaveBeenCalled()

      fireEvent(document, new Event('scrollend'))
      expect(updateSessionSpy).not.toHaveBeenCalled()
      await waitFor(() => expect(updateSessionSpy).toHaveBeenCalledTimes(1))
      expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2)
      expect(useProgressStore.getState().studied).toEqual([
        expect.objectContaining({ id: expect.any(String) }),
      ])
      expect(
        useScriptureCacheStore.getState().getEntryById(useProgressStore.getState().studied[0]!.id)
      ).toBeDefined()
    } finally {
      act(() => useProgressStore.setState({ updateSession: originalUpdateSession }))
    }
  })

  it('does not retain entrance-transform layers on long reader cards', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const cards = await screen.findAllByTestId('study-card')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach(card => expect(card).not.toHaveClass('animate-scale-in'))
    expect(screen.getByTestId('page-study')).not.toHaveClass('animate-fade-in')
  })

  it('credits streak once per day for standard Study reading routes', async () => {
    const firstRender = render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-card')).toHaveLength(2)
    })

    expect(useProgressStore.getState().streak).toBe(1)
    expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
      scriptureId: 'G-1',
      resumePath: '/study?source=G&ang=1',
      resumeVerseId: 1,
    }))

    firstRender.unmount()

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-card')).toHaveLength(2)
    })

    expect(useProgressStore.getState().streak).toBe(1)
  })

  it('excludes the Ardaas + Hukamnama flow from streaks, session resume, and reading progress', async () => {
    const session = {
      scriptureId: 'G-256',
      resumePath: '/study?source=G&ang=256',
      updatedAt: '2026-04-11T09:00:00.000Z',
    }
    useProgressStore.setState({ streak: 2, currentSession: session, studied: [], reviewQueue: [], lastStudied: null })

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <MemoryRouter initialEntries={['/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    try {
      await waitFor(() => {
        expect(screen.getByText('Take Hukamnama')).toBeInTheDocument()
      })

      const ardaasLines = screen.getAllByTestId('study-line')
      expect(ardaasLines.some(line => line.textContent?.includes('ਪ੍ਰਿਥਮ ਭਗੌਤੀ ਸਿਮਰਿ ਕੈ'))).toBe(true)
      expect(ardaasLines.find(line => line.dataset.verseId === '3737')).toHaveTextContent('ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥')
      expect(screen.queryByRole('button', { name: /Ang 118/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Ang 120/i })).not.toBeInTheDocument()
      expect(useProgressStore.getState().streak).toBe(2)
      expect(useProgressStore.getState().currentSession).toEqual(session)
      expect(useReadingProgressStore.getState().progress).toEqual({})

      fireEvent.click(screen.getByRole('button', { name: /take hukamnama/i }))

      await waitFor(() => {
        expect(screen.getByText('Hukamnama after Ardaas')).toBeInTheDocument()
      })

      expect(screen.getByText(/Selected from Sri Guru Granth Sahib Ji · Ang 1/i)).toBeInTheDocument()
      expect(screen.getByText(ARDAAS_HUKAMNAMA_EDITORIAL_COPY.practiceNote!)).toBeInTheDocument()
      expect(within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
        level: 1,
        name: 'Personal Hukamnama',
      })).toBeInTheDocument()
      expect(screen.queryByText(/Harmandir Sahib/i)).not.toBeInTheDocument()
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(1)
      expect(screen.queryByText('Hukamnama begins here')).not.toBeInTheDocument()
      expect(screen.queryByText(/Hukamnama · 2026-04-05/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Go to source shabad/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Exact Search Result')).not.toBeInTheDocument()
      expect(screen.queryByTestId('study-ang-navigation')).not.toBeInTheDocument()
      await openReaderAbout()
      expect(screen.getByText(PERSONAL_HUKAMNAMA_EDITORIAL_COPY.sourceLine)).toBeInTheDocument()
      expect(screen.getByText(PERSONAL_HUKAMNAMA_EDITORIAL_COPY.dek)).toBeInTheDocument()
      expect(useProgressStore.getState().streak).toBe(2)
      expect(useProgressStore.getState().currentSession).toEqual(session)
      expect(useReadingProgressStore.getState().progress).toEqual({})
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('stores the canonical ang route as the resume path for direct shabad views', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-card')).toHaveLength(1)
    })

    expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
      scriptureId: 'G-1',
      resumePath: '/study?source=G&ang=1',
    }))
  })
})

describe('Study exact shabad mode', () => {
  it('renders a direct shabad open as one reader card with multiple verse blocks', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByText('Exact Search Result')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('study-card')).toHaveLength(1)
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(1)
      expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe('SGGS')
    })
  })

  it('shows Amrit Keertan source context when opened from the directory', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=817&from=amrit-keertan&akHeaderId=1&akSection=1&akItem=2&akPage=65']}>
        <Routes>
          <Route path="/study" element={<Study />} />
          <Route path="/banis/amrit-keertan/:headerId" element={<LocationSpy />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByTestId('study-entry-list')
    const tools = await openReaderAbout()
    const context = within(tools).getByTestId('study-amrit-keertan-context')

    expect(within(context).getByText('From Amrit Keertan')).toBeInTheDocument()
    expect(within(context).getByText('Section 1 · AK Page 65 · Item 2')).toBeInTheDocument()
    expect(within(context).getByText(/opened from the Amrit Keertan book order/i)).toBeInTheDocument()

    fireEvent.click(within(context).getByRole('button', { name: /back to section/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/banis/amrit-keertan/1')
    })
  })

  it('renders a focused exact search result view', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&verseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Exact Search Result')).toBeInTheDocument()
      expect(screen.getByText(/SGGS · Ang 1 · Verse 100/i)).toBeInTheDocument()
      const cards = screen.getAllByTestId('study-card')
      expect(cards.length).toBe(1)
      expect(screen.getByText('ੴ')).toBeInTheDocument()
      expect(screen.getByText(/open full shabad/i)).toBeInTheDocument()
    })
  })

  it('keeps the session resume canonical after exact search opens', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&verseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Exact Search Result')).toBeInTheDocument()
      expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
        scriptureId: 'G-1',
        resumePath: '/study?source=G&ang=1',
        resumeVerseId: 100,
      }))
    })
  })

  it('keeps the session resume canonical after saving an exact result to favorites', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&verseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await openReaderTools()
    await waitFor(() => {
      expect(screen.getByLabelText(/add favorite/i)).toBeInTheDocument()
    })

    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add favorite/i))

    await waitFor(() => {
      expect(useFavoritesStore.getState().favorites).toEqual([
        expect.objectContaining({
          source: 'G',
          ang: 1,
          shabadId: 50,
          verseId: 100,
          routeMode: 'verse',
        }),
      ])
      expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
        scriptureId: 'G-1',
        resumePath: '/study?source=G&ang=1',
        resumeVerseId: 100,
      }))
    })
  })

  it('keeps the complete exact Bani context on a saved favorite', async () => {
    const route = '/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji%20Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib'
    render(
      <MemoryRouter initialEntries={[route]}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await openReaderTools()
    await screen.findByLabelText(/add favorite/i)
    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/add favorite/i))

    const favorite = useFavoritesStore.getState().favorites[0]
    expect(favorite.returnPath).toContain('baniDbId=2')
    expect(favorite.returnPath).toContain('baniId=japji-sahib')
    expect(favorite.returnPath).toContain('exactBani=1')
    expect(favorite.excerpt).toBeTruthy()
    expect(favorite.translation_en).toBeTruthy()
  })

  it('recognizes a migrated legacy shabad favorite instead of adding it again', async () => {
    localStorage.setItem('sikh-favorites', JSON.stringify({ state: { favorites: [{
      id: 'favorite-legacy-shabad',
      title: 'Legacy exact shabad',
      source: 'G',
      ang: 1,
      shabadId: 50,
      type: 'shabad',
      savedAt: '2026-08-10T12:00:00.000Z',
    }] } }))
    useFavoritesStore.getState().hydrateCachedFavorites()

    render(
      <MemoryRouter initialEntries={['/study?shabadId=50']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await openReaderTools()
    await screen.findByLabelText(/remove favorite/i)
    await openReaderTools()
    fireEvent.click(screen.getByLabelText(/remove favorite/i))
    expect(useFavoritesStore.getState().favorites).toHaveLength(0)
  })

  it('renders a saved excerpt visibly when the exact live shabad is offline', async () => {
    useBookmarksStore.setState({ bookmarks: [{
      id: 'bookmark-offline-excerpt',
      type: 'verse',
      title: 'Saved exact verse',
      source: 'G',
      ang: 1,
      shabadId: 50,
      verseId: 100,
      excerpt: 'ਸੰਭਾਲਿਆ ਆਫ਼ਲਾਈਨ ਪਾਠ',
      transliteration: 'sambhaaliaa offline paath',
      translation_en: 'A passage kept on this device.',
      returnPath: '/study?shabadId=50&verseId=100',
      savedAt: '2026-08-10T12:00:00.000Z',
    }] })
    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }
        if (body.path === '/v2/shabads/50') {
          return HttpResponse.json({ error: 'offline' }, { status: 503 })
        }
      })
    )

    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&verseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const savedBanner = await screen.findByTestId('study-reader-saved-copy')
    expect(savedBanner).toHaveTextContent(/passage already saved on this device/i)
    expect(screen.getByTestId('study-entry-list')).toHaveTextContent('ਸੰਭਾਲਿਆ ਆਫ਼ਲਾਈਨ ਪਾਠ')
    expect(screen.queryByText(/This reading couldn’t be loaded/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('page-study')).toHaveAttribute('data-ai-state', 'degraded')
  })

  it('does not surface an unrelated legacy shabad excerpt for an offline Personal Hukamnama', async () => {
    useBookmarksStore.setState({ bookmarks: [{
      id: 'bookmark-legacy-shabad',
      type: 'shabad',
      title: 'Legacy exact shabad',
      source: 'G',
      ang: 1,
      shabadId: 50,
      excerpt: 'ਇਹ ਨਿੱਜੀ ਹੁਕਮਨਾਮਾ ਨਹੀਂ ਹੈ',
      savedAt: '2026-08-10T12:00:00.000Z',
    }] })
    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }
        if (body.path === '/v2/shabads/50') {
          return HttpResponse.json({ error: 'offline' }, { status: 503 })
        }
      })
    )

    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&flow=ardaas-hukamnama&randomHukamnamaAng=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/This reading couldn’t be loaded/i)).toBeInTheDocument()
    expect(screen.queryByTestId('study-reader-saved-copy')).not.toBeInTheDocument()
    expect(screen.queryByText('ਇਹ ਨਿੱਜੀ ਹੁਕਮਨਾਮਾ ਨਹੀਂ ਹੈ')).not.toBeInTheDocument()
  })

  it('keeps canonical offline actions on the saved route without fabricating verse IDs', async () => {
    useBookmarksStore.setState({ bookmarks: [{
      id: 'bookmark-offline-canonical',
      type: 'bani',
      title: 'Saved Ang 1',
      source: 'G',
      ang: 1,
      excerpt: 'ਸੰਭਾਲਿਆ ਕੈਨੋਨਿਕਲ ਪਾਠ',
      transliteration: 'sambhaaliaa canonical paath',
      translation_en: 'A canonical passage kept on this device.',
      returnPath: '/study?source=G&ang=1',
      savedAt: '2026-08-10T12:00:00.000Z',
    }] })
    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', () => (
        HttpResponse.json({ error: 'offline' }, { status: 503 })
      ))
    )

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await screen.findByTestId('study-reader-saved-copy')
    const offlineLine = screen.getByTestId('study-line')
    expect(offlineLine).toHaveAttribute('data-verse-id', '0')

    fireEvent.click(screen.getByRole('button', { name: /open verse actions/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: /save verse/i }))
    const savedPhrase = useVocabStore.getState().vocab.find(item => item.word === 'ਸੰਭਾਲਿਆ ਕੈਨੋਨਿਕਲ ਪਾਠ')
    expect(savedPhrase?.context).not.toHaveProperty('shabadId')
    expect(savedPhrase?.context).not.toHaveProperty('verseId')

    fireEvent.click(screen.getByRole('button', { name: /open verse actions/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: 'Share verse' }))
    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    expect(within(composer).getByTestId('share-source-path')).toHaveTextContent('/study?source=G&ang=1')
    expect(within(composer).getByTestId('share-source-path')).not.toHaveTextContent('shabadId=1')
    fireEvent.click(within(composer).getByRole('button', { name: /close share image/i }))

    fireEvent.click(screen.getByRole('button', { name: /open verse actions/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: /remove bookmark/i }))
    expect(useBookmarksStore.getState().bookmarks).toEqual([])
  })

  it('scrolls to a resume verse without breaking exact search mode', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})

    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&verseId=100&resumeVerseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Exact Search Result')).toBeInTheDocument()
      expect(scrollSpy).toHaveBeenCalled()
    })
  })

  it('keeps long scripture content continuous when jumping between its ordered sections', async () => {
    const shabadTitles = [
      'ਪਹਿਲਾ ਸ਼ਬਦ',
      'ਦੂਜਾ ਸ਼ਬਦ',
      'ਤੀਜਾ ਸ਼ਬਦ',
      'ਚੌਥਾ ਸ਼ਬਦ',
      'ਪੰਜਵਾਂ ਸ਼ਬਦ',
    ]
    const baseVerse = MOCK_BANI_RESPONSE.verses[0]
    const verses = shabadTitles.map((title, index) => ({
      ...baseVerse,
      verseId: 8000 + index,
      shabadId: 9000 + index,
      pageNo: 100 + index,
      verse: { unicode: title },
      larivaar: { unicode: title.replaceAll(' ', '') },
    }))

    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }

        if (body.path === '/v2/banis/99') {
          return HttpResponse.json({ verses })
        }
        if (body.path?.startsWith('/v2/shabads/')) {
          return HttpResponse.json({ verses: [] })
        }

        return HttpResponse.json({ error: 'Unexpected BaniDB test path.' }, { status: 404 })
      })
    )

    const jumpedTo: string[] = []
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) { jumpedTo.push(this.dataset.verseId ?? this.id) })

    render(
      <MemoryRouter initialEntries={['/study?baniDbId=99&bani=Test%20Reading']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getAllByTestId('study-card')).toHaveLength(5))
    expect(screen.queryByTestId('study-entry-paginator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('study-entry-paginator-bottom')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Contents' })[0]!)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Contents' })).getByRole('button', { name: /ਪੰਜਵਾਂ ਸ਼ਬਦ/ }))
    await waitFor(() => expect(jumpedTo).toContain('8004'))
    expect(document.getElementById('study-entry-5')).toHaveFocus()
    expect(screen.getAllByTestId('study-card')).toHaveLength(5)
    expect(screen.getAllByTestId('study-line').map(line => Number(line.dataset.verseId))).toEqual(verses.map(verse => verse.verseId))
  })
})

describe('Study hukamnama mode', () => {
  it('keeps a cached Hukamnama readable during an outage and retries the live source in place', async () => {
    const cachedHukamnama = {
      date: '2026-04-05',
      ang: 688,
      source: 'G',
      shabadId: 2591,
      entry: {
        id: 'hukamnama-2026-04-05',
        scripture: 'SGGS',
        source: 'G',
        sourceName: 'Sri Guru Granth Sahib Ji',
        ang: 688,
        shabadId: 2591,
        raag: 'Raag Dhanaasree',
        gurmukhi: 'ਮੇਰਾ ਪ੍ਰਭੁ ਰਾਂਗਿ ਘਣਉ ਅਤਿ ਰੂੜਉ ॥',
        transliteration: 'meraa prabh raang ghanau at rooRau',
        translation_en: 'My God is imbued with the deepest love.',
        translation_hi: '',
        translation_pa: '',
        words: [],
        lines: [{
          verseId: 29343,
          shabadId: 2591,
          ang: 688,
          gurmukhi: 'ਮੇਰਾ ਪ੍ਰਭੁ ਰਾਂਗਿ ਘਣਉ ਅਤਿ ਰੂੜਉ ॥',
          transliteration: 'meraa prabh raang ghanau at rooRau',
          translation_en: 'My God is imbued with the deepest love.',
          translations_en: { bdb: 'My God is imbued with the deepest love.' },
          translation_hi: '',
          translation_pa: '',
        }],
      },
    }
    localStorage.setItem('naamras-hukamnama-cache-v1', JSON.stringify({
      data: cachedHukamnama,
      cachedAt: '2026-04-05T08:00:00.000Z',
    }))

    let liveAvailable = false
    let hukamnamaRequests = 0
    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }
        if (!body.path?.startsWith('/v2/hukamnamas/')) return
        hukamnamaRequests += 1
        return liveAvailable
          ? HttpResponse.json(MOCK_HUKAMNAMA_RESPONSE)
          : HttpResponse.json({ error: 'offline' }, { status: 503 })
      })
    )

    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('study-reader-saved-copy')).toHaveTextContent(
      'Showing the passage already saved on this device'
    )
    expect(screen.getByTestId('study-entry-list')).toHaveTextContent('ਮੇਰਾ ਪ੍ਰਭੁ ਰਾਂਗਿ ਘਣਉ ਅਤਿ ਰੂੜਉ')
    expect(screen.getByTestId('page-study')).toHaveAttribute('data-ai-state', 'degraded')

    liveAvailable = true
    fireEvent.click(screen.getByRole('button', { name: 'Try live copy' }))

    await waitFor(() => expect(hukamnamaRequests).toBe(2))
    await waitFor(() => expect(screen.queryByTestId('study-reader-saved-copy')).not.toBeInTheDocument())
    expect(screen.getByTestId('page-study')).toHaveAttribute('data-ai-state', 'ready')
  })

  it('renders one editorial Daily Hukamnama hero with date, source metadata, and source shabad action', async () => {
    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(within(screen.getByTestId('study-reader-topbar')).getByRole('heading', {
        level: 1,
        name: DAILY_HUKAMNAMA_EDITORIAL_COPY.title,
      })).toBeInTheDocument()
    })
    await openReaderAbout()
    await waitFor(() => {
      expect(within(screen.getByTestId('study-reader-header')).getByText(
        DAILY_HUKAMNAMA_EDITORIAL_COPY.sourceLine
      )).toBeInTheDocument()
      expect(within(screen.getByTestId('study-reader-header')).getByText(
        DAILY_HUKAMNAMA_EDITORIAL_COPY.dek
      )).toBeInTheDocument()
      expect(screen.getByText(/April 5, 2026/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Raag Dhanaasree/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Go to source shabad/i)).toBeInTheDocument()
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(1)
    })

    expect(screen.queryByText(/Hukamnama · 2026-04-05/i)).not.toBeInTheDocument()
  })

  it.each([
    {
      name: 'English',
      language: 'en' as const,
      sourceState: { englishSource: 'bdb' as const },
      expectedMeanings: [
        'People try to deceive others, but the Inner-knower knows everything.',
        'Looking around, this way and that, the greedy people come and go. ||Pause||',
      ],
      expectedCredit: 'English · Standard',
    },
    {
      name: 'Punjabi',
      language: 'pa' as const,
      sourceState: { punjabiSource: 'ss' as const },
      expectedMeanings: [
        'ਮਨੁੱਖ ਧੋਖਾ ਦੇਂਦਾ ਹੈ ਪਰ ਪ੍ਰਭੂ ਸਭ ਜਾਣਦਾ ਹੈ।',
        'ਲੋਭੀ ਮਨੁੱਖ ਇੱਧਰ ਉੱਧਰ ਵੇਖਦਾ ਫਿਰਦਾ ਹੈ। ਰਹਾਉ।',
      ],
      expectedCredit: 'Punjabi · Steek',
    },
    {
      name: 'Hindi',
      language: 'hi' as const,
      sourceState: { hindiSource: 'ss' as const },
      expectedMeanings: [
        'मनुष्य धोखा देता है पर प्रभु सब जानता है।',
        'लोभी मनुष्य इधर उधर देखता फिरता है। रहाउ।',
      ],
      expectedCredit: 'Hindi · Steek',
    },
  ])('shares complete $name meanings with matching provenance', async ({
    language,
    sourceState,
    expectedMeanings,
    expectedCredit,
  }) => {
    useLanguageStore.setState({ meaningLanguage: language, ...sourceState })

    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const tools = await openReaderTools()
    const shareButton = within(tools).getByRole('button', { name: /^Share$/i })
    await waitFor(() => expect(shareButton).toBeEnabled())
    fireEvent.click(shareButton)

    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    expect(
      within(composer).getAllByTestId('share-passage-meaning').map(line => line.textContent)
    ).toEqual(expectedMeanings)
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent(expectedCredit)
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent(
      `"translationLanguage":"${language}"`
    )
  })

  it("defaults Hukamnama share support to English when the reader's meaning is off", async () => {
    useLanguageStore.setState({ meaningLanguage: 'none', englishSource: 'ms' })
    const firstShabad = MOCK_HUKAMNAMA_RESPONSE.shabads[0]
    const firstVerse = firstShabad.verses[0]
    const headerText = 'ਸਲੋਕ ॥'
    const response = {
      ...MOCK_HUKAMNAMA_RESPONSE,
      shabads: [{
        ...firstShabad,
        verses: [
          {
            ...firstVerse,
            verseId: 29343,
            verse: { unicode: headerText },
            transliteration: { english: 'salok ||' },
            translation: { en: { bdb: '', ms: '', ssk: '' } },
            isHeader: true,
            headerLevel: 1,
          },
          ...firstShabad.verses,
        ],
      }],
    }

    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }
        if (body.path?.startsWith('/v2/hukamnamas/')) return HttpResponse.json(response)
        if (body.path === '/v2/shabads/2591') return HttpResponse.json({ verses: [] })
        return HttpResponse.json({ error: 'Unexpected BaniDB test path.' }, { status: 404 })
      })
    )

    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const tools = await openReaderTools()
    const shareButton = within(tools).getByRole('button', { name: /^Share$/i })
    await waitFor(() => expect(shareButton).toBeEnabled())
    shareButton.focus()
    fireEvent.click(shareButton)

    const expectedLines = [
      headerText,
      'ਜਤਨ ਕਰੈ ਮਾਨੁਖ ਡਹਕਾਵੈ ਓਹੁ ਅੰਤਰਜਾਮੀ ਜਾਨੈ ॥',
      'ਉਤ ਤਾਕੈ ਉਤ ਤੇ ਉਤ ਪੇਖੈ ਆਵੈ ਲੋਭੀ ਫੇਰਿ ॥ ਰਹਾਉ ॥',
    ]
    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    const sharedLines = within(composer).getAllByTestId('share-passage-line')

    expect(sharedLines.map(line => line.textContent)).toEqual(expectedLines)
    expect(sharedLines[0]).toHaveAttribute('data-is-header', 'true')
    expect(sharedLines[1]).toHaveAttribute('data-is-header', 'false')
    expect(
      within(composer).getAllByTestId('share-passage-meaning').map(line => line.textContent)
    ).toEqual([
      'The man makes efforts to deceive others, but the Lord knows everything.',
      'The greedy man looks all around and returns again. Pause.',
    ])
    expect(within(composer).getByTestId('share-flattened-gurmukhi').textContent).toBe(expectedLines.join('\n'))
    expect(within(composer).getByTestId('share-series-label')).toHaveTextContent('Daily Hukamnama')
    expect(within(composer).getByTestId('share-passage-kind')).toHaveTextContent('daily-hukamnama')
    expect(within(composer).getByTestId('share-date-label')).toHaveTextContent('April 5, 2026')
    expect(within(composer).getByTestId('share-source-path')).toHaveTextContent(
      '/study?hukamnamaDate=2026-04-05'
    )
    expect(within(composer).getByText(/Sri Guru Granth Sahib Ji · Ang/i)).toBeInTheDocument()
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent(
      'Sri Harmandir Sahib, Amritsar'
    )
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent(
      'English · Manmohan Singh'
    )
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent(
      '"translationLanguage":"en"'
    )
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent('2026-04-05')

    fireEvent.click(within(composer).getByRole('button', { name: 'Close share image' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reading tools' })).toHaveFocus())
  })

  it('preserves inferred structure and the full Ang range in Hukamnama share content', async () => {
    const firstShabad = MOCK_HUKAMNAMA_RESPONSE.shabads[0]
    const [firstVerse, secondVerse] = firstShabad.verses
    const structuralHeading = 'ਸਲੋਕ ਮਃ ੩ ॥'
    const response = {
      ...MOCK_HUKAMNAMA_RESPONSE,
      shabads: [{
        ...firstShabad,
        verses: [
          {
            ...firstVerse,
            verseId: 29343,
            verse: { unicode: structuralHeading },
            transliteration: { english: 'salok mahalaa teejaa ||' },
            translation: { en: { bdb: 'Shalok, Third Mehla:', ms: '', ssk: '' } },
            pageNo: 680,
          },
          firstVerse,
          { ...secondVerse, pageNo: 681 },
        ],
      }],
    }

    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }
        if (body.path?.startsWith('/v2/hukamnamas/')) return HttpResponse.json(response)
        if (body.path === '/v2/shabads/2591') return HttpResponse.json({ verses: [] })
        return HttpResponse.json({ error: 'Unexpected BaniDB test path.' }, { status: 404 })
      })
    )

    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const tools = await openReaderTools()
    const shareButton = within(tools).getByRole('button', { name: /^Share$/i })
    await waitFor(() => expect(shareButton).toBeEnabled())
    fireEvent.click(shareButton)

    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    const sharedLines = within(composer).getAllByTestId('share-passage-line')

    expect(sharedLines[0]).toHaveTextContent(structuralHeading)
    expect(sharedLines[0]).toHaveAttribute('data-is-header', 'true')
    expect(sharedLines[1]).toHaveAttribute('data-is-header', 'false')
    expect(sharedLines[2]).toHaveTextContent('ਰਹਾਉ')
    expect(sharedLines[2]).toHaveAttribute('data-is-header', 'false')
    expect(within(composer).getByText('Sri Guru Granth Sahib Ji · Ang 680–681')).toBeInTheDocument()
  })

  it('falls back per line within the selected meaning language and credits every provider used', async () => {
    useLanguageStore.setState({ meaningLanguage: 'pa', punjabiSource: 'ft' })
    const firstShabad = MOCK_HUKAMNAMA_RESPONSE.shabads[0]
    const [firstVerse, secondVerse] = firstShabad.verses
    const response = {
      ...MOCK_HUKAMNAMA_RESPONSE,
      shabads: [{
        ...firstShabad,
        verses: [
          {
            ...firstVerse,
            translation: {
              ...firstVerse.translation,
              pu: {
                ss: { unicode: 'ਪਹਿਲੀ ਲਾਈਨ ਦਾ ਸਟੀਕ ਅਰਥ।' },
                ft: { unicode: 'ਪਹਿਲੀ ਲਾਈਨ ਦਾ ਫਰੀਦਕੋਟ ਅਰਥ।' },
              },
            },
          },
          {
            ...secondVerse,
            translation: {
              ...secondVerse.translation,
              pu: {
                ss: { unicode: 'ਦੂਜੀ ਲਾਈਨ ਦਾ ਸਟੀਕ ਅਰਥ।' },
                ft: { unicode: '' },
              },
            },
          },
        ],
      }],
    }

    server.use(
      http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
        const body = await request.json() as { path?: string }
        if (body.path?.startsWith('/v2/hukamnamas/')) return HttpResponse.json(response)
        if (body.path === '/v2/shabads/2591') return HttpResponse.json({ verses: [] })
        return HttpResponse.json({ error: 'Unexpected BaniDB test path.' }, { status: 404 })
      })
    )

    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const tools = await openReaderTools()
    const shareButton = within(tools).getByRole('button', { name: /^Share$/i })
    await waitFor(() => expect(shareButton).toBeEnabled())
    fireEvent.click(shareButton)

    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    expect(
      within(composer).getAllByTestId('share-passage-meaning').map(line => line.textContent)
    ).toEqual([
      'ਪਹਿਲੀ ਲਾਈਨ ਦਾ ਫਰੀਦਕੋਟ ਅਰਥ।',
      'ਦੂਜੀ ਲਾਈਨ ਦਾ ਸਟੀਕ ਅਰਥ।',
    ])
    expect(within(composer).getByTestId('share-provenance')).toHaveTextContent(
      'Punjabi · Faridkot / Steek'
    )
  })

  it('passes the complete ordered Personal Hukamnama shabad to top Share', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&flow=ardaas-hukamnama&randomHukamnamaAng=1&resumeVerseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const tools = await openReaderTools()
    await waitFor(() => expect(within(tools).getByRole('button', { name: /^Share$/i })).toBeEnabled())
    fireEvent.click(within(tools).getByRole('button', { name: /^Share$/i }))

    const expectedLines = ['ੴ ਸਤਿ ਨਾਮੁ', 'ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ']
    const composer = await screen.findByTestId('share-highlight-sheet-test-double')
    const sharedLines = within(composer).getAllByTestId('share-passage-line')

    expect(sharedLines.map(line => line.textContent)).toEqual(expectedLines)
    expect(within(composer).getByTestId('share-flattened-gurmukhi').textContent).toBe(expectedLines.join('\n'))
    expect(within(composer).getByTestId('share-series-label')).toHaveTextContent('Personal Hukamnama')
    expect(within(composer).queryByTestId('share-date-label')).not.toBeInTheDocument()
    expect(within(composer).getByTestId('share-source-path')).toHaveTextContent(
      '/study?shabadId=50&flow=ardaas-hukamnama&randomHukamnamaAng=1&resumeVerseId=100'
    )
    expect(within(composer).getByTestId('share-short-path')).toHaveTextContent('/p/50/1/100')
    expect(within(composer).getByTestId('share-passage-kind')).toHaveTextContent('personal-hukamnama')
  })

  it('uses bani-specific editorial copy for Japji Sahib instead of generic reader product copy', async () => {
    const japjiCopy = getReaderEditorialCopyForBani('japji-sahib')!

    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji%20Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Japji Sahib' })).toBeInTheDocument()
      expect(within(screen.getByTestId('study-reader-topbar')).getByText('Japji Sahib')).toBeInTheDocument()
    })

    expect(within(screen.getByTestId('study-reader-topbar')).queryByText(/^Gurbani$/i)).not.toBeInTheDocument()

    await openReaderAbout()
    expect(screen.getByText(japjiCopy.dek)).toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId('study-reader-context')).getByRole('button'))
    expect(screen.getByText(japjiCopy.historicalNote!)).toBeInTheDocument()
    expect(screen.getByText(japjiCopy.practiceNote!)).toBeInTheDocument()

    expect(screen.queryByText(/Comfortable reading first/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/controls stay close/i)).not.toBeInTheDocument()
  })

  it('puts live type controls first and discloses specialist reading preferences', async () => {
    render(<MemoryRouter initialEntries={['/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji%20Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib']}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
    await screen.findByTestId('study-entry-list')
    const sheet = await openReaderSettings()
    const font = within(sheet).getByRole('slider', { name: 'Gurbani text size' })
    expect(font).toHaveValue('22')
    const preview = within(sheet).getByRole('region', { name: 'Text preview' })
    expect(preview).toHaveTextContent('ੴ')
    fireEvent.change(font, { target: { value: '28' } })
    expect(useLanguageStore.getState().fontSize).toBe(28)
    expect(preview.querySelector('p')).toHaveStyle({ fontSize: '28px' })
    expect(within(sheet).getByRole('group', { name: 'Spacing' })).toBeInTheDocument()
    expect(within(sheet).getByRole('group', { name: 'Alignment' })).toBeInTheDocument()
    expect(within(sheet).getByText('Text options', { exact: true }).closest('details')).not.toHaveAttribute('open')
    expect(within(sheet).getByText('Study layers', { exact: true }).closest('details')).not.toHaveAttribute('open')
    expect(within(sheet).queryByRole('button', { name: 'Text only' })).not.toBeInTheDocument()
    expandReaderDetails(sheet, 'Text options')
    expect(within(sheet).getByRole('button', { name: 'Devanagari' })).toBeInTheDocument()
    expandReaderDetails(sheet, 'Study layers')
    const english = within(sheet).getByRole('group', { name: 'English translation source' })
    fireEvent.click(within(english).getByRole('button', { name: /Manmohan Singh/ }))
    expect(useLanguageStore.getState().englishSource).toBe('ms')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Punjabi', exact: true }))
    expect(within(sheet).queryByRole('group', { name: 'English translation source' })).not.toBeInTheDocument()
    expect(within(sheet).getByRole('group', { name: 'Punjabi teeka/source' })).toBeInTheDocument()
  })

  it('renders short Rehras without the legacy extra intro block or Ang 0', async () => {
    render(
      <MemoryRouter initialEntries={['/study?baniDbId=21&bani=Rehras%20Sahib']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rehras Sahib' })).toBeInTheDocument()
      expect(screen.getAllByText('ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥').length).toBeGreaterThan(0)
      expect(screen.queryByText(/Ang 0/i)).not.toBeInTheDocument()
    })

    expect(screen.queryByText('Intro')).not.toBeInTheDocument()
    expect(screen.queryByText('Rehras Sahib starts here')).not.toBeInTheDocument()
    expect(screen.queryByText('ਧੰਨੁ ਸੁ ਕਾਗਦੁ ਕਲਮ ਧੰਨੁ ਧਨ ਭਾਂਡਾ ਧਨੁ ਮਸੁ ॥')).not.toBeInTheDocument()
  })

  it('keeps full composite bani sections when opening an exact BaniDB route', async () => {
    render(
      <MemoryRouter initialEntries={['/study?baniDbId=21&source=G&ang=8&startAng=8&endAng=12&bani=Rehras%20Sahib&exactBani=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-card')).toHaveLength(3)
    })
  })

  it('keeps the composite Rehras identity when the visible verse belongs to Dasam Granth', async () => {
    useReadingPlacesStore.setState({ places: {} })
    documentScroll = mockDocumentScroll({ top: 700, viewportHeight: 800, scrollHeight: 2400 })
    const option = getNitnemOption('rehras-sahib')!
    const canonicalPath = buildNitnemStudyPath(option)
    render(<MemoryRouter initialEntries={[canonicalPath]}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
    const lines = await screen.findAllByTestId('study-line')
    await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(2632))
    for (const line of lines) {
      const top = line.dataset.verseId === '4001' ? 200 : -100
      vi.spyOn(line, 'getBoundingClientRect').mockReturnValue({ x: 0, y: top, top, right: 390, bottom: top + 60, left: 0, width: 390, height: 60, toJSON: () => ({}) })
    }
    fireEvent(document, new Event('scrollend'))
    await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(4001))

    const session = useProgressStore.getState().currentSession!
    expect(session.scriptureId).toBe('D-1386')
    const homeContinue = getHomeNitnemResume(option, session, useReadingPlacesStore.getState().places)!
    expect(new URLSearchParams(homeContinue.split('?')[1]).get('resumeVerseId')).toBe('4001')
    expect(getExactReadingKey(session.resumePath)).toBe(getExactReadingKey(canonicalPath))

    const saved = localStorage.getItem('naamras-reading-places')!
    useReadingPlacesStore.setState({ places: {} })
    localStorage.setItem('naamras-reading-places', saved)
    await useReadingPlacesStore.persist.rehydrate()
    expect(getHomeNitnemResume(option, null, useReadingPlacesStore.getState().places)).toContain('resumeVerseId=4001')
  })

  it('retains the same composite Rehras place after cold entry into its Dasam section', async () => {
    useReadingPlacesStore.setState({ places: {} })
    documentScroll = mockDocumentScroll({ top: 700, viewportHeight: 800, scrollHeight: 2400 })
    const option = getNitnemOption('rehras-sahib')!
    const canonicalPath = buildNitnemStudyPath(option)
    const params = new URLSearchParams(canonicalPath.split('?')[1])
    params.set('ang', '1386')
    params.set('resumeVerseId', '4001')
    const directDasamResume = `/study?${params}`
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid !== 'study-line') return originalRect.call(this)
      const top = this.dataset.verseId === '4001' ? 200 : -100
      return { x: 0, y: top, top, right: 390, bottom: top + 60, left: 0, width: 390, height: 60, toJSON: () => ({}) }
    })
    try {
      render(<MemoryRouter initialEntries={[directDasamResume]}><Routes><Route path="/study" element={<Study />} /></Routes></MemoryRouter>)
      await screen.findAllByTestId('study-line')
      await waitFor(() => expect(useProgressStore.getState().currentSession?.resumeVerseId).toBe(4001))
      expect(useProgressStore.getState().currentSession?.scriptureId).toBe('D-1386')
      expect(getExactReadingKey(useProgressStore.getState().currentSession!.resumePath)).toBe(getExactReadingKey(canonicalPath))
    } finally { measure.mockRestore() }
  })
})

describe('Study adjustable STTM lengths', () => {
  it('switches the active Rehras text explicitly and changes its usual length only when requested', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras%20Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=short']}>
        <Routes>
          <Route path="/study" element={<><Study /><LocationSpy /></>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥').length).toBeGreaterThan(0)
      expect(screen.getByTestId('location').textContent).toContain('sgLength=short')
    })

    expect(screen.queryByText('Rehras Sahib starts here')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Change bani length: Short' }))
    const lengths = await screen.findByRole('dialog', { name: 'Bani length' })
    fireEvent.click(within(lengths).getByRole('radio', { name: /^Long(?: |$)/ }))
    expect(screen.getByTestId('location').textContent).toContain('sgLength=short')
    expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
    expect(within(lengths).getByRole('checkbox', { name: 'Use for my Nitnem' })).not.toBeChecked()
    await waitFor(() => expect(within(lengths).getByRole('button', { name: 'Read long' })).toBeEnabled())
    expect(within(lengths).getByTestId('bani-length-destination')).not.toHaveTextContent('Checking where')
    fireEvent.click(within(lengths).getByRole('button', { name: 'Read long' }))

    await waitFor(() => {
      expect(screen.getByText('ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥')).toBeInTheDocument()
      expect(screen.getByTestId('location').textContent).toContain('sgLength=long')
      expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('short')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Change bani length: Long' }))
    const remembered = await screen.findByRole('dialog', { name: 'Bani length' })
    expect(within(remembered).getByRole('radio', { name: 'Long Current' })).toBeChecked()
    fireEvent.click(within(remembered).getByRole('checkbox', { name: 'Use for my Nitnem' }))
    await waitFor(() => expect(within(remembered).getByRole('button', { name: 'Read long' })).toBeEnabled())
    fireEvent.click(within(remembered).getByRole('button', { name: 'Read long' }))
    await waitFor(() => {
      expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('long')
      expect(screen.getByTestId('location').textContent).toContain('sgLength=long')
      expect(screen.queryByRole('dialog', { name: 'Bani length' })).not.toBeInTheDocument()
    })
  })

  it('normalizes legacy focused Rehras links onto the canonical long route', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras%20Sahib%20(Focused)&baniDbId=21&exactBani=1&baniId=rehras-sahib']}>
        <Routes>
          <Route path="/study" element={<><Study /><LocationSpy /></>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? ''
      expect(location).toContain('bani=Rehras+Sahib')
      expect(location).toContain('sgLength=long')
      expect(screen.getByText('ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥')).toBeInTheDocument()
    })
  })

  it('keeps the extra-long Rehras opening lines inline without a separate intro block', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras%20Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=extralong']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('ਧੰਨੁ ਸੁ ਕਾਗਦੁ ਕਲਮ ਧੰਨੁ ਧਨ ਭਾਂਡਾ ਧਨੁ ਮਸੁ ॥').length).toBeGreaterThan(0)
      expect(screen.getByText('ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥')).toBeInTheDocument()
    })

    expect(screen.queryByText('Intro')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('study-header-block')).toHaveLength(1)
  })

  it('collapses Benati Chaupai Sahib to three ordered bands and keeps Long as the longest option', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=D&ang=1386&startAng=1386&endAng=1388&bani=Benati%20Chaupai%20Sahib&baniDbId=9&exactBani=1&baniId=chaupai-sahib&sgLength=long']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Change bani length: Long' }))
    const lengths = await screen.findByRole('dialog', { name: 'Bani length' })
    expect(within(lengths).getAllByRole('radio').map(input => input.getAttribute('value'))).toEqual(['short', 'medium', 'long'])
    expect(within(lengths).getByRole('radio', { name: /^Short(?: |$)/ })).toBeInTheDocument()
    expect(within(lengths).getByRole('radio', { name: /^Medium(?: |$)/ })).toBeInTheDocument()
    expect(within(lengths).getByRole('radio', { name: /^Long(?: |$)/ })).toBeChecked()
    expect(within(lengths).queryByRole('radio', { name: /^Extra long/i })).not.toBeInTheDocument()
  })

  it('normalizes Aarti onto three real bands so Short is shortest and legacy extra-long lands on Long', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=663&startAng=663&endAng=663&bani=Aarti&baniDbId=22&exactBani=1&baniId=aarti&sgLength=extralong']}>
        <Routes>
          <Route path="/study" element={<><Study /><LocationSpy /></>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('sgLength=long')
      expect(screen.getAllByText('ਆਰਤੀ-ਆਰਤਾ').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Change bani length: Long' }))
    const lengths = await screen.findByRole('dialog', { name: 'Bani length' })
    expect(within(lengths).getAllByRole('radio').map(input => input.getAttribute('value'))).toEqual(['short', 'medium', 'long'])
    expect(within(lengths).getByRole('radio', { name: /^Short(?: |$)/ })).toBeInTheDocument()
    expect(within(lengths).getByRole('radio', { name: /^Medium(?: |$)/ })).toBeInTheDocument()
    expect(within(lengths).getByRole('radio', { name: /^Long(?: |$)/ })).toBeChecked()
    expect(within(lengths).queryByRole('radio', { name: /^Extra long/i })).not.toBeInTheDocument()

    fireEvent.click(within(lengths).getByRole('radio', { name: /^Short(?: |$)/ }))
    expect(screen.getByTestId('location').textContent).toContain('sgLength=long')
    await waitFor(() => expect(within(lengths).getByRole('button', { name: 'Read short' })).toBeEnabled())
    fireEvent.click(within(lengths).getByRole('button', { name: 'Read short' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('sgLength=short')
      expect(screen.getByText('ਸਭ ਮਹਿ ਜੋਤਿ ਜੋਤਿ ਹੈ ਸੋਇ ॥')).toBeInTheDocument()
    })
  })
})
