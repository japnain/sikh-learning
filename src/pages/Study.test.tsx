import { describe, it, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Study from './Study'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'
import { useMusicStore } from '../store/music'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useSavedFeedbackStore } from '../store/savedFeedback'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useVocabStore } from '../store/vocab'
import { ARDAAS_HUKAMNAMA_EDITORIAL_COPY } from '../content/readerEditorialCopy'
import { server } from '../test/msw-server'
import { MOCK_BANI_RESPONSE } from '../test/msw-handlers'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

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
    await waitFor(() => expect(screen.queryByLabelText(/add bookmark/i)).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText(/add bookmark/i))

    const bookmarkForm = await screen.findByTestId('study-bookmark-form')
    const bookmarkInput = within(bookmarkForm).getByLabelText('Bookmark note')

    expect(bookmarkForm).toBeVisible()
    expect(within(bookmarkForm).getByRole('button', { name: 'Save Bookmark' })).toBeInTheDocument()
    await waitFor(() => {
      expect(bookmarkInput).toHaveFocus()
      expect(scrollSpy).toHaveBeenCalled()
    })
  })

  test('clicking save bookmark adds to store', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByLabelText(/add bookmark/i)).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText(/add bookmark/i))
    const bookmarkForm = await screen.findByTestId('study-bookmark-form')
    fireEvent.click(within(bookmarkForm).getByRole('button', { name: 'Save Bookmark' }))
    expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
    expect(screen.getByText(/bookmark saved/i)).toBeInTheDocument()
  })

  test('favoriting the current passage shows explicit feedback', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.queryByLabelText(/add favorite/i)).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText(/add favorite/i))

    expect(screen.getByText(/added to favorites/i)).toBeInTheDocument()
  })

  test('share falls back to clipboard with visible feedback when native share fails', async () => {
    const share = vi.fn().mockRejectedValue(new Error('dismissed'))
    const writeText = vi.fn().mockResolvedValue(undefined)

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

    await waitFor(() => expect(screen.getByLabelText(/^share$/i)).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText(/^share$/i))

    await waitFor(() => {
      expect(share).toHaveBeenCalled()
      expect(writeText).toHaveBeenCalled()
      expect(screen.getByText(/copied to clipboard instead/i)).toBeInTheDocument()
    })
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
})

describe('Study renders all shabads on an ang', () => {
  it('keeps the on-this-ang outline collapsed by default until expanded', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /on this ang/i })).toBeInTheDocument()
    })

    const outlineButton = screen.getByRole('button', { name: /on this ang/i })
    expect(outlineButton).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('study-entry-outline-panel')).toBeNull()

    fireEvent.click(outlineButton)

    expect(outlineButton).toHaveAttribute('aria-expanded', 'true')
    const outlinePanel = document.getElementById('study-entry-outline-panel')
    expect(outlinePanel).not.toBeNull()
    expect(within(outlinePanel as HTMLElement).getByText(/Shabad 1 of 2/i)).toBeInTheDocument()
    expect(within(outlinePanel as HTMLElement).getByText(/Shabad 2 of 2/i)).toBeInTheDocument()
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

    fireEvent.click(within(screen.getAllByTestId('study-card')[0]!).getAllByRole('button', { name: 'Open word details for ੴ' })[0]!)

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
    expect(within(dialog).getByRole('button', { name: /save phrase/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^Copy$/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^Share$/i })).toBeInTheDocument()
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
      within(screen.getByRole('dialog', { name: /verse actions/i })).getByRole('button', { name: /save phrase/i })
    )

    expect(
      useVocabStore.getState().vocab.some(item => item.kind === 'phrase' && item.word.includes('ੴ'))
    ).toBe(true)
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

    fireEvent.click(screen.getByRole('button', { name: /show reader controls/i }))
    fireEvent.click(screen.getByRole('button', { name: /transliteration off/i }))

    expect(screen.getByText(/ikOankaar sat naam/i)).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: /show reader controls/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Punjabi$/i }))

    expect(screen.getByText(/ਅਕਾਲ ਪੁਰਖ ਇੱਕ ਹੈ/i)).toBeInTheDocument()
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

    expect(screen.getByTestId('study-reader-header')).toHaveTextContent('Vaar 40')
    expect(screen.getByRole('button', { name: /Vaar 39/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Vaar 40/i })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Ang 39/i })).not.toBeInTheDocument()
  })
})

describe('Study soundscapes and tracking', () => {
  it('keeps compact soundscapes collapsed by default while retaining playback controls', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

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

      expect(screen.queryByText('ਪ੍ਰਿਥਮ ਭਗੌਤੀ ਸਿਮਰਿ ਕੈ')).not.toBeInTheDocument()
      expect(screen.queryByText(/Tap any Gurbani word for meaning/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/SGGS · Ang 119/i)).not.toBeInTheDocument()
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
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(1)
      expect(screen.queryByText('Hukamnama begins here')).not.toBeInTheDocument()
      expect(screen.queryByText(/Hukamnama · 2026-04-05/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Go to source shabad/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Exact Search Result')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Ang /i })).not.toBeInTheDocument()
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

    const context = await screen.findByTestId('study-amrit-keertan-context')

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

    await waitFor(() => {
      expect(screen.getByLabelText(/add favorite/i)).toBeInTheDocument()
    })

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

  it('offers the same shabad navigation at the end of paginated scripture content', async () => {
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

    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})

    render(
      <MemoryRouter initialEntries={['/study?baniDbId=99&bani=Test%20Reading']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const topNavigator = await screen.findByTestId('study-entry-paginator')
    const bottomNavigator = await screen.findByTestId('study-entry-paginator-bottom')
    const previousButton = within(bottomNavigator).getByRole('button', { name: /Previous part:/i })
    const nextButton = within(bottomNavigator).getByRole('button', { name: /Next part:/i })

    expect(screen.getAllByTestId('study-card')).toHaveLength(1)
    expect(within(bottomNavigator).getByText('Part 1 of 5')).toBeInTheDocument()
    expect(within(bottomNavigator).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(previousButton).toBeDisabled()
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(within(topNavigator).getByText('Part 2 of 5')).toBeInTheDocument()
      expect(within(bottomNavigator).getByText('Part 2 of 5')).toBeInTheDocument()
      expect(within(bottomNavigator).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    })

    expect(within(bottomNavigator).getByRole('button', { name: /Previous part: ਪਹਿਲਾ ਸ਼ਬਦ/i })).toBeEnabled()
    expect(within(bottomNavigator).getByRole('button', { name: /Next part: ਤੀਜਾ ਸ਼ਬਦ/i })).toBeEnabled()
  })
})

describe('Study hukamnama mode', () => {
  it('renders one editorial Daily Hukamnama hero with date, source metadata, and source shabad action', async () => {
    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Daily Hukamnama Sri Harmandir Sahib, Amritsar/i)).toHaveLength(1)
      expect(screen.getByText(/April 5, 2026/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Raag Dhanaasree/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Go to source shabad/i)).toBeInTheDocument()
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(1)
    })

    expect(screen.queryByText(/Hukamnama · 2026-04-05/i)).not.toBeInTheDocument()
  })

  it('uses bani-specific editorial copy for Japji Sahib instead of generic reader product copy', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji%20Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Japji Sahib' })).toBeInTheDocument()
      expect(screen.getByText(/opens Sri Guru Granth Sahib Ji on Ang 1/i)).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByTestId('study-reader-context')).getByRole('button'))
    expect(screen.getAllByText(/Guru Nanak Sahib Ji/i).length).toBeGreaterThan(1)

    expect(screen.queryByText(/Comfortable reading first/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/controls stay close/i)).not.toBeInTheDocument()
  })

  it('groups expanded reader controls under stable editorial settings sections', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji%20Sahib&baniDbId=2&exactBani=1&baniId=japji-sahib']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    const controls = await screen.findByTestId('study-reader-controls')
    expect(within(controls).getByText(/Reader settings/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^Gurmukhi$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^English$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/Translit Off/i)).toBeInTheDocument()

    fireEvent.click(within(controls).getByRole('button', { name: /show reader controls/i }))

    expect(within(controls).getByText(/^Script$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^Reading layers$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^Meaning$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^Punjabi teeka\/source$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^Hindi source$/i)).toBeInTheDocument()
    expect(within(controls).getByText(/^Layout$/i)).toBeInTheDocument()
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
})

describe('Study adjustable STTM lengths', () => {
  it('updates the URL, store, and visible start when switching Rehras length', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /show reader controls/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Long$/i }))

    await waitFor(() => {
      expect(screen.getByText('ਹਰਿ ਜੁਗੁ ਜੁਗੁ ਭਗਤ ਉਪਾਇਆ ਪੈਜ ਰਖਦਾ ਆਇਆ ਰਾਮ ਰਾਜੇ ॥')).toBeInTheDocument()
      expect(screen.getByTestId('location').textContent).toContain('sgLength=long')
      expect(useSundarGutkaLengthStore.getState().lengths['rehras-sahib']).toBe('long')
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
      expect(screen.getAllByText(/Long ·/i).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /show reader controls/i }))

    expect(screen.getByText(/^Length$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Short$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Medium$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Long$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Extra Long$/i })).not.toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: /show reader controls/i }))

    expect(screen.getByRole('button', { name: /^Short$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Medium$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Long$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Extra Long$/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Short$/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('sgLength=short')
      expect(screen.getByText('ਸਭ ਮਹਿ ਜੋਤਿ ਜੋਤਿ ਹੈ ਸੋਇ ॥')).toBeInTheDocument()
    })
  })
})
