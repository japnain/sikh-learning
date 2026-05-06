import { beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Banis from './Banis'
import { sanitizeRehatHtml } from '../utils/rehatHtml'
import Study from './Study'
import LibraryPageReader from './library/LibraryPageReader'
import PanthPrakashLibraryHome from './library/PanthPrakashLibraryHome'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'

function renderBanis() {
  return render(<MemoryRouter><Banis /></MemoryRouter>)
}

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

beforeEach(() => {
  localStorage.clear()
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
  expect(page.querySelector('.read-source-section')).not.toBeNull()
  expect(page.querySelector('.read-companion-section')).not.toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: /move directly into gurbani/i })).toBeInTheDocument()
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

test('renders the main content sections including Rehat', () => {
  renderBanis()
  expect(screen.getByRole('heading', { name: /Bani directories/i })).toBeInTheDocument()
  expect(screen.getByText(/Open named banis and daily prayers/i)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Source \/ page browser/i })).toBeInTheDocument()
  expect(screen.getByText(/Open by ang, page, or source edition/i)).toBeInTheDocument()
  expect(screen.getByText(/Companion readers/i)).toBeInTheDocument()
  expect(screen.getByText(/Sundar Gutka/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Dasam Granth/i).length).toBeGreaterThan(0)
  expect(screen.getByText('Rehat')).toBeInTheDocument()
  expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
})

test('uses Read-specific directory cards with open-state hooks', () => {
  renderBanis()

  const sundarGutkaCard = screen.getByRole('button', { name: /Sundar Gutka/i })
  expect(sundarGutkaCard).toHaveClass('read-directory-card')
  expect(sundarGutkaCard).toHaveAttribute('data-open', 'false')

  fireEvent.click(sundarGutkaCard)

  expect(sundarGutkaCard).toHaveAttribute('data-open', 'true')
})

test('keeps secondary Read source cards readable in dark mode', () => {
  renderBanis()

  const rehatCard = screen.getByTestId('banis-open-rehat')
  const amritKeertanCard = screen.getByTestId('banis-open-amrit-keertan')

  expect(rehatCard).toHaveClass('read-extra-source-card')
  expect(amritKeertanCard).toHaveClass('read-extra-source-card')
  expect(within(rehatCard).getByText(/Open the Rehat reader/i)).toHaveClass(
    'read-extra-source-card__body',
    'dark:text-dark-text/82'
  )
  expect(within(amritKeertanCard).getByText(/Open the Amrit Keertan directory/i)).toHaveClass(
    'read-extra-source-card__body',
    'dark:text-dark-text/82'
  )
})

test('keeps source browsing at the bottom of Read while featuring Panth Prakash as a dedicated browse page', () => {
  renderBanis()

  const sourceBrowser = screen.getByTestId('read-source-browser-shared')
  expect(sourceBrowser).toHaveAttribute('data-component', 'scripture-source-browser')
  expect(screen.queryByTestId('study-source-browser')).not.toBeInTheDocument()
  expect(screen.queryByTestId('library-source-browser-shared')).not.toBeInTheDocument()

  const panthCard = within(sourceBrowser).getByTestId('panth-prakash-source-card')
  expect(within(panthCard).getByRole('link', { name: /browse panth prakash episodes/i })).toHaveAttribute(
    'href',
    '/library/panth-prakash-english'
  )
  expect(panthCard).toHaveTextContent(/separate reading page/i)
  expect(panthCard).toHaveTextContent(/source scan mapping/i)
  expect(within(panthCard).queryByRole('link', { name: /^open panth prakash page 1$/i })).not.toBeInTheDocument()

  fireEvent.click(within(panthCard).getByRole('button', { name: /show quick page numbers/i }))
  expect(within(panthCard).getByRole('link', { name: /^open panth prakash page 1$/i })).toHaveAttribute(
    'href',
    '/library/panth-prakash-english/page/1'
  )
})

test('opens the Panth Prakash Read card into the dedicated browse page before entering page reader', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<Banis />} />
        <Route path="/library/:workId" element={<><PanthPrakashLibraryHome /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  const sourceBrowser = screen.getByTestId('read-source-browser-shared')
  fireEvent.click(within(sourceBrowser).getByRole('link', { name: /browse panth prakash episodes/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/library/panth-prakash-english')
  })
  await waitFor(() => {
    expect(screen.getByTestId('panth-library-home')).toBeInTheDocument()
  })

  expect(screen.getByRole('heading', { name: /Panth Prakash/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/search episodes/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument()
})

test('still allows optional quick Panth Prakash page numbers to open the reader with navigation breadcrumbs', async () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <Routes>
        <Route path="/banis" element={<Banis />} />
        <Route path="/library/:workId/page/:pageNumber" element={<><LibraryPageReader /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

  const sourceBrowser = screen.getByTestId('read-source-browser-shared')
  const panthCard = within(sourceBrowser).getByTestId('panth-prakash-source-card')
  fireEvent.click(within(panthCard).getByRole('button', { name: /show quick page numbers/i }))
  fireEvent.click(within(panthCard).getByRole('link', { name: /^open panth prakash page 1$/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toBe('/library/panth-prakash-english/page/1')
  })
  await waitFor(() => {
    expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
  })

  expect(screen.getByTestId('library-breadcrumb')).toHaveTextContent(/Read/i)
  expect(screen.getByRole('link', { name: /next page/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/2')
  expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument()
})

test('keeps the SGGS directory free of Sundar Gutka duplicate rows while preserving source-only content', () => {
  renderBanis()
  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i })[0])
  fireEvent.click(screen.getByText('Daily Prayers'))

  const sodarRow = screen.getByText('Sodar').closest('button') as HTMLButtonElement
  expect(sodarRow).toHaveClass('read-index-row')
  expect(screen.getByText('Sodar')).toHaveClass('read-index-row__title')
  expect(screen.queryByText('Japji Sahib')).not.toBeInTheDocument()
  expect(screen.queryByText('Rehras Sahib')).not.toBeInTheDocument()
  expect(screen.queryByText('Anand Sahib')).not.toBeInTheDocument()
  expect(screen.queryByText(/Adjustable length/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/BaniDB/i)).not.toBeInTheDocument()
  expect(screen.queryByText('Raag Sri')).not.toBeInTheDocument()
})

test('keeps the Dasam Granth directory free of Sundar Gutka duplicate rows while retaining distinct exact variants', () => {
  renderBanis()
  fireEvent.click(screen.getAllByText(/Dasam Granth/i)[0])
  fireEvent.click(screen.getByText('Daily Prayers'))

  expect(screen.getByText('Tav Prasad Savaiye · Dheenan Ki')).toBeInTheDocument()
  expect(screen.queryByText('Tav Prasad Savaiye · Sraavag Suddh')).not.toBeInTheDocument()
  expect(screen.queryByText('Jaap Sahib')).not.toBeInTheDocument()
  expect(screen.queryByText('Benati Chaupai Sahib')).not.toBeInTheDocument()
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

test('loads Sundar Gutka groups and items with bilingual labels without swallowing source catalog rows', async () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))
  expect(screen.getByText('ਜਪੁਜੀ ਸਾਹਿਬ')).toBeInTheDocument()
  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  expect(screen.getByText('Rehras Sahib')).toBeInTheDocument()
  expect(screen.queryByText(/STTM|BaniDB|Adjustable length/i)).not.toBeInTheDocument()

  fireEvent.click(screen.getByText('Other'))
  expect(screen.getByText('ਅਰਦਾਸ')).toBeInTheDocument()
  expect(screen.queryByText('Akal Ustat')).not.toBeInTheDocument()
  expect(screen.queryByText('Raag Gauri')).not.toBeInTheDocument()
  expect(screen.queryByText('Sri Bhagauti Astotr · Panth Prakash')).not.toBeInTheDocument()
})

test('shows the Ardaas + Hukamnama featured flow and keeps plain Ardaas in Other', async () => {
  renderBanis()

  const featuredFlow = screen.getByTestId('banis-featured-flow')
  expect(featuredFlow).toHaveClass('read-featured-flow-card')
  expect(screen.getByText('Ardaas + Hukamnama')).toBeInTheDocument()
  expect(
    screen.getByText(/Move from Ardaas into a random Hukamnama/i)
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

  fireEvent.click(screen.getByRole('button', { name: /Ardaas \+ Hukamnama/i }))

  await waitFor(() => {
    expect(screen.getByText('Take Hukamnama')).toBeInTheDocument()
    expect(screen.getByText(/After Ardaas, take a random Hukamnama/i)).toBeInTheDocument()
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

  const link = screen.getByTestId('banis-open-rehat')
  expect(link).toHaveAttribute('href', '/banis/rehat')
  expect(document.querySelector('#banis-rehat-panel')).toBeNull()

  fireEvent.click(link)

  expect(screen.getByTestId('location').textContent).toBe('/banis/rehat')
})

test('supports direct ang lookup mode', async () => {
  renderBanis()
  fireEvent.click(screen.getByRole('button', { name: /refine/i }))
  fireEvent.click(screen.getByRole('button', { name: /ang \/ page/i }))
  fireEvent.change(screen.getByPlaceholderText(/open an ang or page directly/i), { target: { value: '12' } })

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /open sggs ang 12/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open dg ang 12/i })).toBeInTheDocument()
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

test('surfaces learn topic destinations ahead of broader read search results', async () => {
  renderBanis()

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'stress' } })

  expect(await screen.findByText(/^In the app$/i)).toBeInTheDocument()
  const inAppResults = screen.getByTestId('banis-search-app-results')
  const [firstResult] = within(inAppResults).getAllByRole('button')
  expect(within(firstResult).getByText(/^When the mind is anxious$/i)).toBeInTheDocument()
  expect(within(firstResult).getByText(/^Learn$/i)).toBeInTheDocument()
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

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'stress' } })

  const inAppResults = await screen.findByTestId('banis-search-app-results')
  expect(inAppResults.querySelector('[data-search-highlight="true"]')).not.toBeNull()
})

test('keeps the nav-safe page shell while lower sections still open after other expansions', async () => {
  renderBanis()

  expect(screen.getByTestId('page-banis')).toHaveClass('page-shell')

  fireEvent.click(screen.getByText(/Sundar Gutka/i))
  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))
  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i })[0])
  fireEvent.click(screen.getByText('Raag Sections'))

  expect(screen.getByTestId('banis-open-amrit-keertan')).toHaveAttribute('href', '/banis/amrit-keertan')
})
