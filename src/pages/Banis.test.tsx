import { beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Banis from './Banis'
import * as banidbApi from '../api/banidb'
import { sanitizeRehatHtml } from '../utils/rehatHtml'
import Study from './Study'
import PanthPrakashLibraryHome from './library/PanthPrakashLibraryHome'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { ARDAAS_HUKAMNAMA_EDITORIAL_COPY } from '../content/readerEditorialCopy'

function renderBanis() {
  return render(<MemoryRouter><Banis /></MemoryRouter>)
}

function openReadCollection(name: 'Banis' | 'Sources' | 'Books') {
  fireEvent.click(screen.getByRole('tab', { name }))
}

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function HistoryControls() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(-1)}>Back in history</button>
}

const SEARCH_RESULT_FIXTURE: banidbApi.SearchResult = {
  shabadId: 910,
  verseId: 911,
  source: 'G',
  pageNo: 1,
  sourceName: 'Sri Guru Granth Sahib Ji',
  gurmukhi: 'ਸਤਿਨਾਮੁ',
  transliteration: 'sat naam',
  translation_en: 'The Name is truth.',
  raag: '',
  writer: '',
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: true,
    meaningLanguage: 'en',
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

test('renders page heading', () => {
  renderBanis()
  const page = screen.getByTestId('page-banis')

  expect(page).toHaveClass('page-shell', 'read-room-shell')
  expect(page).toHaveAttribute('data-ai-surface', 'read')
  expect(page.querySelector('.read-room-stack')).not.toBeNull()
  expect(page.querySelector('.read-room-hero')).not.toBeNull()
  expect(page.querySelector('.read-quick-find-card')).not.toBeNull()
  expect(page.querySelector('.read-directory-section')).not.toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: /^Read$/i })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Banis' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: 'Sources' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Books' })).toBeInTheDocument()
  expect(screen.getByRole('tabpanel', { name: 'Banis' })).toHaveAttribute('id', 'read-active-collection-panel')
  expect(screen.getByRole('button', { name: /refine/i })).toBeInTheDocument()
  expect(screen.getByText(/^Auto detect$/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /first letters/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /refine/i }))

  expect(screen.getByRole('button', { name: /first letters/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^SGGS$/i })).toBeInTheDocument()
})

test('uses a search-first default input with stable search attributes', () => {
  renderBanis()

  const searchInput = document.querySelector('#banis-search') as HTMLInputElement | null

  expect(searchInput).not.toBeNull()
  expect(searchInput?.getAttribute('name')).toBe('banis-search')
  expect(searchInput?.getAttribute('autocorrect')).toBe('off')
  expect(searchInput?.getAttribute('spellcheck')).toBe('false')
})

test('hydrates the read search from the url so home can hand off the same query', () => {
  render(
    <MemoryRouter initialEntries={['/banis?query=Japji%20Sahib&mode=auto-detect']}>
      <Routes>
        <Route path="/banis" element={<Banis />} />
      </Routes>
    </MemoryRouter>
  )

  const searchInput = document.querySelector('#banis-search') as HTMLInputElement | null
  expect(searchInput?.value).toBe('Japji Sahib')
})

test('persists collection tabs in the url and restores them through browser history', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><HistoryControls /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  const sourcesTab = screen.getByRole('tab', { name: 'Sources' })
  fireEvent.click(sourcesTab)

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('collection=sources')
    expect(sourcesTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Sources' })).toHaveAttribute('id', 'read-active-collection-panel')
  })

  fireEvent.keyDown(sourcesTab, { key: 'ArrowRight' })

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('collection=books')
    expect(screen.getByRole('tab', { name: 'Books' })).toHaveAttribute('aria-selected', 'true')
  })

  fireEvent.click(screen.getByRole('button', { name: /back in history/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('collection=sources')
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute('aria-selected', 'true')
  })
})

test('hydrates the Books collection directly from a refreshable url', () => {
  render(
    <MemoryRouter initialEntries={['/banis?collection=books']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  expect(screen.getByRole('tab', { name: 'Books' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel', { name: 'Books' })).toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('collection=books')
})

test('renders the main content sections including Rehat', () => {
  renderBanis()
  expect(screen.getByRole('heading', { name: /Bani directories/i })).toBeInTheDocument()
  expect(screen.getByText(/Daily prayers, complete scripture collections, Vaaran, and kirtan/i)).toBeInTheDocument()
  expect(screen.getByText(/Sundar Gutka/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Sri Dasam Granth Sahib Ji/i).length).toBeGreaterThan(0)
  expect(screen.getByRole('button', { name: /Bhai Gurdas Ji Vaaran/i })).toBeInTheDocument()
  expect(screen.getByTestId('banis-open-amrit-keertan')).toHaveAttribute('href', '/banis/amrit-keertan')

  openReadCollection('Sources')
  expect(screen.queryByTestId('banis-open-rehat')).not.toBeInTheDocument()
  expect(screen.queryByTestId('banis-open-amrit-keertan')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Scripture source browser/i })).toBeInTheDocument()
  expect(screen.getByText(/Open scripture by Ang or choose a Vaar directly/i)).toBeInTheDocument()

  openReadCollection('Books')
  expect(screen.getByText(/Companion reader/i)).toBeInTheDocument()
  expect(screen.getByText('Rehat')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Historical books/i })).toBeInTheDocument()
})

test('uses Read-specific directory cards with open-state hooks', () => {
  renderBanis()

  const sundarGutkaCard = screen.getByRole('button', { name: /Sundar Gutka/i })
  expect(sundarGutkaCard).toHaveClass('read-directory-card')
  expect(sundarGutkaCard).toHaveAttribute('data-open', 'false')

  fireEvent.click(sundarGutkaCard)

  expect(sundarGutkaCard).toHaveAttribute('data-open', 'true')
})

test('keeps catalog and secondary source cards readable in dark mode', () => {
  renderBanis()
  const amritKeertanCard = screen.getByTestId('banis-open-amrit-keertan')
  expect(amritKeertanCard).toHaveClass('read-directory-card')
  expect(within(amritKeertanCard).getByText(/complete section index/i)).toHaveClass(
    'dark:text-dark-text/76'
  )

  openReadCollection('Books')

  const rehatCard = screen.getByTestId('banis-open-rehat')

  expect(rehatCard).toHaveClass('read-extra-source-card')
  expect(within(rehatCard).getByText(/Conduct, practice/i)).toHaveClass(
    'read-extra-source-card__body',
    'dark:text-dark-text/82'
  )
})

test('opens Bhai Gurdas Ji as a complete 40-Vaar directory', () => {
  renderBanis()

  const directoryButton = screen.getByRole('button', { name: /Bhai Gurdas Ji Vaaran/i })
  fireEvent.click(directoryButton)

  const panel = document.querySelector('#banis-bhai-gurdas-vaaran-panel') as HTMLElement
  const vaarLinks = within(panel).getAllByRole('link')

  expect(directoryButton).toHaveAttribute('aria-expanded', 'true')
  expect(vaarLinks).toHaveLength(40)
  expect(within(panel).getByRole('link', { name: /Open Bhai Gurdas Ji Vaar 1$/i })).toHaveAttribute(
    'href',
    '/study?source=B&ang=1'
  )
  expect(within(panel).getByRole('link', { name: /Open Bhai Gurdas Ji Vaar 40$/i })).toHaveAttribute(
    'href',
    '/study?source=B&ang=40'
  )
  expect(within(panel).queryByRole('link', { name: /Open Bhai Gurdas Ji Vaar 41$/i })).not.toBeInTheDocument()
})

test('keeps scripture sources separate from EPUB books', () => {
  renderBanis()
  openReadCollection('Sources')

  const sourceBrowser = screen.getByTestId('read-source-browser-shared')
  expect(sourceBrowser).toHaveAttribute('data-component', 'scripture-source-browser')
  expect(screen.queryByTestId('study-source-browser')).not.toBeInTheDocument()
  expect(screen.queryByTestId('library-source-browser-shared')).not.toBeInTheDocument()
  expect(within(sourceBrowser).queryByTestId('panth-prakash-source-card')).not.toBeInTheDocument()

  fireEvent.click(within(sourceBrowser).getByRole('button', { name: /Bhai Gurdas Ji Vaaran/i }))
  expect(within(sourceBrowser).getByText('Vaar 1–40 of 40')).toBeInTheDocument()
  expect(within(sourceBrowser).getByRole('link', { name: /open Bhai Gurdas Ji Vaaran vaar 40/i })).toHaveAttribute(
    'href',
    '/study?source=B&ang=40'
  )

  openReadCollection('Books')
  expect(screen.queryByTestId('read-source-browser-shared')).not.toBeInTheDocument()
  const booksBrowser = screen.getByTestId('read-books-browser-shared')
  expect(within(booksBrowser).queryByRole('button', { name: /Bhai Gurdas Ji Vaaran/i })).not.toBeInTheDocument()

  const panthCard = within(booksBrowser).getByTestId('panth-prakash-source-card')
  const panthBrowseLink = within(panthCard).getByRole('link', { name: /open panth prakash book reader/i })
  expect(panthBrowseLink).toHaveAttribute(
    'href',
    '/library/panth-prakash-english'
  )
  expect(panthBrowseLink).toHaveClass('text-cream')
  expect(panthCard).toHaveTextContent(/EPUB-derived book reader/i)
  expect(panthCard).toHaveTextContent(/171 chapters/i)
  expect(within(panthCard).queryByRole('button', { name: /show quick page numbers/i })).not.toBeInTheDocument()
  expect(within(panthCard).queryByRole('link', { name: /^open panth prakash page 1$/i })).not.toBeInTheDocument()
})

test('opens the Panth Prakash Read card into the EPUB chapter overview', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<Banis />} />
        <Route path="/library/:workId" element={<><PanthPrakashLibraryHome /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  openReadCollection('Books')
  const booksBrowser = screen.getByTestId('read-books-browser-shared')
  fireEvent.click(within(booksBrowser).getByRole('link', { name: /open panth prakash book reader/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/library/panth-prakash-english')
  })
  await waitFor(() => {
    expect(screen.getByTestId('panth-library-home')).toBeInTheDocument()
  })

  expect(screen.getByRole('heading', { name: /Panth Prakash/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/search chapters/i)).toBeInTheDocument()
  expect(screen.queryByLabelText(/jump to page/i)).not.toBeInTheDocument()
})

test('keeps the SGGS source directory complete when a bani also appears in Sundar Gutka', () => {
  renderBanis()
  const directoryButton = screen.getByTestId('banis-directory-sggs')
  expect(screen.getByTestId('banis-directory-sggs-count')).toHaveTextContent('89 banis')

  fireEvent.click(directoryButton)
  fireEvent.click(screen.getByText('Daily Prayers'))

  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  expect(screen.getByText('Rehras Sahib')).toBeInTheDocument()
  expect(screen.getByText('Anand Sahib')).toBeInTheDocument()
  expect(screen.queryByText('Sodar')).not.toBeInTheDocument()
  expect(screen.queryByText(/Adjustable length/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/BaniDB/i)).not.toBeInTheDocument()
  expect(screen.queryByText('Raag Sri')).not.toBeInTheDocument()
})

test('presents Sri Dasam Granth Sahib Ji like SGGS and keeps its source directory complete', () => {
  renderBanis()

  const sggsButton = screen.getByTestId('banis-directory-sggs')
  const dasamButton = screen.getByTestId('banis-directory-dg')
  expect(within(sggsButton).getByText('Sri Guru Granth Sahib Ji')).toHaveClass('text-saffron')
  expect(within(dasamButton).getByText('Sri Dasam Granth Sahib Ji')).toHaveClass('text-saffron')
  expect(screen.getByTestId('banis-directory-dg-count')).toHaveTextContent('14 banis')

  fireEvent.click(dasamButton)
  fireEvent.click(screen.getByText('Daily Prayers'))

  expect(screen.getByText('Tav Prasad Savaiye · Dheenan Ki')).toBeInTheDocument()
  expect(screen.getByText('Tav Prasad Savaiye · Sraavag Suddh')).toBeInTheDocument()
  expect(screen.getByText('Jaap Sahib')).toBeInTheDocument()
  expect(screen.getByText('Benati Chaupai Sahib')).toBeInTheDocument()
})

test('shows both Sri Bhagauti Astotr exact variants in Dasam Granth supplemental banis', () => {
  renderBanis()
  fireEvent.click(screen.getAllByText(/Dasam Granth/i)[0])
  fireEvent.click(screen.getByText('Supplemental Banis'))

  expect(screen.getByText('Sri Bhagauti Astotr · Panth Prakash')).toBeInTheDocument()
  expect(screen.getByText('Sri Bhagauti Astotr · Hazur Sahib')).toBeInTheDocument()
})

test('shows the exhaustive exact SGGS categories including raag sections', () => {
  renderBanis()
  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i })[0])

  expect(screen.getByText('Raag Sections')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Raag Sections'))
  expect(screen.getByText('Raag Gauri')).toBeInTheDocument()
})

test('loads every Sundar Gutka BaniDB row into the official Nitnem, Popular, and Other groups', async () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  expect(screen.getByTestId('banis-directory-sundar-gutka-count')).toHaveTextContent('14 banis')
  expect(screen.getByTestId('sundar-gutka-nitnem-count')).toHaveTextContent('7')
  expect(screen.getByTestId('sundar-gutka-popular-count')).toHaveTextContent('4')
  expect(screen.getByTestId('sundar-gutka-other-count')).toHaveTextContent('3')

  fireEvent.click(screen.getByText('Nitnem'))
  expect(screen.getByText('ਜਪੁਜੀ ਸਾਹਿਬ')).toBeInTheDocument()
  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  expect(screen.getByText('Rehras Sahib')).toBeInTheDocument()
  expect(screen.queryByText(/STTM|BaniDB|Adjustable length/i)).not.toBeInTheDocument()

  fireEvent.click(screen.getByText('Other'))
  expect(screen.getByText('ਅਰਦਾਸ')).toBeInTheDocument()
  expect(screen.getByText('Ardaas')).toBeInTheDocument()
  expect(screen.getByText('Laavan')).toBeInTheDocument()
  expect(screen.getByText('Bavan Akhri')).toBeInTheDocument()
})

test('shows an explicit Sundar Gutka index error and retries in place', async () => {
  const indexSpy = vi.spyOn(banidbApi, 'fetchBanisIndex')
    .mockRejectedValueOnce(new Error('index unavailable'))
    .mockResolvedValueOnce([{ id: 24, gurmukhi: 'ਅਰਦਾਸ', transliteration: 'Ardaas' }])

  renderBanis()
  fireEvent.click(screen.getByRole('button', { name: /Sundar Gutka/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/index is unavailable right now/i)
  expect(screen.getByTestId('banis-directory-sundar-gutka-count')).toHaveTextContent('Unavailable')

  fireEvent.click(screen.getByRole('button', { name: /^Retry$/i }))

  await waitFor(() => {
    expect(indexSpy).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('banis-directory-sundar-gutka-count')).toHaveTextContent('1 bani')
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('opens a complete-index bani through its reviewed exact source route', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByText(/Sundar Gutka/i))
  await waitFor(() => expect(screen.getByText('Other')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Other'))
  fireEvent.click(screen.getByText('Bavan Akhri'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain(
      '/study?source=G&ang=250&startAng=250&endAng=262&bani=Bavan+Akhri&baniDbId=33&exactBani=1'
    )
  })
})

test('shows the Ardaas + Hukamnama featured flow and keeps plain Ardaas in Other', async () => {
  renderBanis()

  const featuredFlow = screen.getByTestId('banis-featured-flow')
  expect(featuredFlow).toHaveClass('read-featured-flow-card')
  expect(screen.getByText('Ardaas + Hukamnama')).toBeInTheDocument()
  expect(within(featuredFlow).getByText(/Begin devotional flow/i)).toHaveClass(
    'read-featured-flow-card__cta',
    'text-cream'
  )
  expect(
    screen.getByText(ARDAAS_HUKAMNAMA_EDITORIAL_COPY.dek)
  ).toBeInTheDocument()

  fireEvent.click(screen.getByText(/Sundar Gutka/i))
  await waitFor(() => expect(screen.getByText('Other')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Other'))

  expect(screen.getByText('ਅਰਦਾਸ')).toBeInTheDocument()
})

test('featured Ardaas + Hukamnama card opens the devotional Study flow', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<Banis />} />
        <Route path="/study" element={<Study />} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole('link', { name: /Ardaas \+ Hukamnama/i }))

  await waitFor(() => {
    expect(screen.getByText('Take Hukamnama')).toBeInTheDocument()
    expect(screen.getAllByText(ARDAAS_HUKAMNAMA_EDITORIAL_COPY.practiceNote!).length).toBeGreaterThan(0)
  })
})

test('opens Sundar Gutka Rehras Sahib through the canonical exact bani route', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))

  await waitFor(() => expect(screen.getByText('ਰਹਰਾਸਿ ਸਾਹਿਬ')).toBeInTheDocument())
  fireEvent.click(screen.getByText('ਰਹਰਾਸਿ ਸਾਹਿਬ'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=short')
  })
})

test('shows single clean Nitnem entries for adjustable Sundar Gutka banis', async () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))

  expect(screen.getByText('ਰਹਰਾਸਿ ਸਾਹਿਬ')).toBeInTheDocument()
  expect(screen.getByText('ਬੇਨਤੀ ਚੌਪਈ ਸਾਹਿਬ')).toBeInTheDocument()
  expect(screen.getByText('Benati Chaupai Sahib')).toBeInTheDocument()
  expect(screen.queryByText(/Focused|Puraatan/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/Length ·|Adjustable/i)).not.toBeInTheDocument()
})

test('opens Bavan Akhri through an exact BaniDB route from the SGGS source-only list', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i })[0])
  fireEvent.click(screen.getByText('Long Compositions'))
  fireEvent.click(screen.getByText('Bavan Akhri'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=250&startAng=250&endAng=262&bani=Bavan+Akhri&baniDbId=33&exactBani=1')
  })
})

test('opens the Dheenan Ki Savaiye variant through its exact BaniDB route', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByText(/Dasam Granth/i)[0])
  fireEvent.click(screen.getByText('Daily Prayers'))
  fireEvent.click(screen.getByText('Tav Prasad Savaiye · Dheenan Ki'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=D&ang=11&startAng=11&endAng=37&bani=Tav+Prasad+Savaiye+%28Dheenan+Ki%29&baniDbId=7&exactBani=1&baniId=tav-prasad-savaiye')
  })
})

test('opens Raag Gauri through an exact BaniDB route from the exhaustive SGGS list', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i })[0])
  fireEvent.click(screen.getByText('Raag Sections'))
  fireEvent.click(screen.getByText('Raag Gauri'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=323&startAng=323&endAng=346&bani=Raag+Gauri&baniDbId=56&exactBani=1')
  })
})

test('links Amrit Keertan to its directory page instead of opening a dropdown panel', () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/banis/amrit-keertan" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  const link = screen.getByTestId('banis-open-amrit-keertan')
  expect(link).toHaveAttribute('href', '/banis/amrit-keertan')
  expect(screen.queryByText('Loading Amrit Keertan…')).not.toBeInTheDocument()
  expect(document.querySelector('#banis-amrit-keertan-panel')).toBeNull()

  fireEvent.click(link)

  expect(screen.getByTestId('location').textContent).toBe('/banis/amrit-keertan')
})

test('links Rehat to its route-driven reader instead of opening a dropdown panel', () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/banis/rehat" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )

  openReadCollection('Books')
  const link = screen.getByTestId('banis-open-rehat')
  expect(link).toHaveAttribute('href', '/banis/rehat')
  expect(document.querySelector('#banis-rehat-panel')).toBeNull()

  fireEvent.click(link)

  expect(screen.getByTestId('location').textContent).toBe('/banis/rehat')
})

test('supports direct ang lookup mode', async () => {
  renderBanis()
  fireEvent.click(screen.getByRole('button', { name: /refine/i }))
  fireEvent.click(screen.getByRole('button', { name: /ang \/ vaar \/ page/i }))
  fireEvent.change(screen.getByRole('searchbox', { name: /search gurbani, meanings, or direct routes/i }), { target: { value: '12' } })

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /open sggs ang 12/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open dg ang 12/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open bgv vaar 12/i })).toBeInTheDocument()
  })
})

test('front-loads canonical bani routes for short romanized queries like jap', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<><Banis /><LocationSpy /></>} />
        <Route path="/study" element={<><Study /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jap' } })

  expect(await screen.findByText(/^In the app$/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Japji Sahib/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Jaap Sahib/i })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Japji Sahib/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=1&startAng=1&endAng=8&bani=Japji+Sahib')
  })
})

test('auto search queries both English meanings and romanized text for Roman-letter terms', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  renderBanis()

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'death' } })

  await waitFor(() => {
    const searchTypes = fetchSpy.mock.calls.flatMap(([, init]) => {
      if (!init || typeof init.body !== 'string') return []

      const body = JSON.parse(init.body) as {
        path?: string
        query?: { searchtype?: string }
      }

      return body.path === '/v2/search/death' && body.query?.searchtype
        ? [body.query.searchtype]
        : []
    })

    expect(searchTypes).toEqual(expect.arrayContaining(['3', '4']))
  })
  await waitFor(() => {
    expect(screen.getByTestId('banis-search-gurbani-results')).toHaveTextContent('Death is not called bad')
  })

  fetchSpy.mockRestore()
})

test('auto search keeps Latin and Gurmukhi search modes for mixed-script queries', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  renderBanis()

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'death ਵਾਹਿਗੁਰੂ' } })

  await waitFor(() => {
    const searchTypes = fetchSpy.mock.calls.flatMap(([, init]) => {
      if (!init || typeof init.body !== 'string') return []

      const body = JSON.parse(init.body) as {
        path?: string
        query?: { searchtype?: string }
      }

      return body.path?.startsWith('/v2/search/') && body.query?.searchtype
        ? [body.query.searchtype]
        : []
    })

    expect(searchTypes).toEqual(expect.arrayContaining(['0', '1', '2', '3', '4', '8']))
  })

  fetchSpy.mockRestore()
})

test('keeps fulfilled search results when another search source fails', async () => {
  vi.spyOn(banidbApi, 'fetchSearch').mockImplementation(async (_query, searchType) => {
    if (searchType === 3) return [SEARCH_RESULT_FIXTURE]
    throw new Error('one search source unavailable')
  })

  renderBanis()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'partialprobe' } })

  expect(await screen.findByText(/Some sources could not be searched/i, { selector: '.read-search-partial' })).toBeInTheDocument()
  expect(screen.getByText('ਸਤਿਨਾਮੁ')).toBeInTheDocument()
  expect(screen.getByText('The Name is truth.')).toBeInTheDocument()
  expect(screen.getByTestId('banis-quick-find')).toHaveAttribute('data-ai-state', 'degraded')
})

test('offers useful examples and a clear action when search has no matches', async () => {
  vi.spyOn(banidbApi, 'fetchSearch').mockResolvedValue([])

  renderBanis()
  const searchInput = screen.getByRole('searchbox')
  fireEvent.change(searchInput, { target: { value: 'zzzz-no-match' } })

  expect(await screen.findByRole('heading', { name: /No matches yet/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Japji Sahib' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ਵਾਹਿਗੁਰੂ' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Clear search/i }))

  expect(searchInput).toHaveValue('')
  await waitFor(() => expect(searchInput).toHaveFocus())
})

test('localizes Read controls and honors transliteration and meaning preferences', async () => {
  useLocaleStore.setState({ locale: 'pa' })
  useLanguageStore.setState({ showTransliteration: false, meaningLanguage: 'none' })
  vi.spyOn(banidbApi, 'fetchSearch').mockResolvedValue([SEARCH_RESULT_FIXTURE])

  renderBanis()

  expect(screen.getByRole('heading', { level: 1, name: 'ਪੜ੍ਹੋ' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'ਬਾਣੀਆਂ' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: 'ਸਰੋਤ' })).toBeInTheDocument()
  expect(screen.getByText('ਆਪਣੇ ਆਪ ਪਛਾਣ')).toBeInTheDocument()

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'preferenceprobe' } })
  expect(await screen.findByText('ਸਤਿਨਾਮੁ')).toBeInTheDocument()
  expect(screen.queryByText('sat naam')).not.toBeInTheDocument()
  expect(screen.queryByText('The Name is truth.')).not.toBeInTheDocument()

  act(() => {
    useLanguageStore.setState({ showTransliteration: true, meaningLanguage: 'en' })
  })

  expect(screen.getByText('sat naam')).toBeInTheDocument()
  expect(screen.getByText('The Name is truth.')).toBeInTheDocument()
})

test('shows a provenance-honest visible fallback when Read artwork fails', () => {
  renderBanis()

  fireEvent.error(screen.getByRole('img', { name: /gold-domed shrine beside a sarovar/i }))

  const fallback = screen.getByTestId('read-artwork-fallback')
  expect(fallback).toHaveAttribute(
    'aria-label',
    'Painted view of a gold-domed shrine beside a sarovar and surrounding buildings.'
  )
  expect(within(fallback).getByText('Artwork unavailable')).toBeInTheDocument()
})

test('sanitizes Rehat chapter HTML before rendering it through innerHTML', () => {
  const sanitized = sanitizeRehatHtml('<p>Keep <strong>seva</strong><script>alert(1)</script><a href="javascript:alert(1)" onclick="bad()">unsafe</a><a href="https://example.com" onclick="bad()">safe</a></p>')

  expect(sanitized).toContain('<strong>seva</strong>')
  expect(sanitized).not.toContain('<script')
  expect(sanitized).not.toContain('javascript:')
  expect(sanitized).not.toContain('onclick')
  expect(sanitized).toContain('<a>unsafe</a>')
  expect(sanitized).toContain('<a href="https://example.com" rel="noreferrer">safe</a>')
})

test('highlights matching terms inside read search results', async () => {
  renderBanis()

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jap' } })

  const inAppResults = await screen.findByTestId('banis-search-app-results')
  expect(inAppResults.querySelector('[data-search-highlight="true"]')).not.toBeNull()
})

test('keeps the nav-safe page shell while lower sections still open after other expansions', async () => {
  renderBanis()

  expect(screen.getByTestId('page-banis')).toHaveClass('page-shell')

  fireEvent.click(screen.getByText(/Sundar Gutka/i))
  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))
  fireEvent.click(screen.getByTestId('banis-directory-sggs'))
  fireEvent.click(screen.getByText('Raag Sections'))

  expect(screen.getByTestId('banis-open-amrit-keertan')).toHaveAttribute('href', '/banis/amrit-keertan')
  openReadCollection('Books')
  expect(screen.getByTestId('banis-open-rehat')).toHaveAttribute('href', '/banis/rehat')
})
