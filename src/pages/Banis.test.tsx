import { beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Banis from './Banis'
import { sanitizeRehatHtml } from '../utils/rehatHtml'
import Study from './Study'
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
  expect(screen.getByTestId('page-banis')).toHaveClass('page-shell')
  expect(screen.getByRole('heading', { level: 1, name: /move directly into gurbani/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /refine/i })).toBeInTheDocument()
  expect(screen.getByText(/^Auto$/i)).toBeInTheDocument()
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
  expect(screen.getByText(/Sundar Gutka/i)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Dasam Granth/i).length).toBeGreaterThan(0)
  expect(screen.getByText('Rehat')).toBeInTheDocument()
  expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
})

test('keeps source browsing at the bottom of Read', () => {
  renderBanis()

  const sourceBrowser = screen.getByTestId('read-source-browser-shared')
  expect(sourceBrowser).toHaveAttribute('data-component', 'scripture-source-browser')
  expect(screen.queryByTestId('study-source-browser')).not.toBeInTheDocument()
  expect(screen.queryByTestId('library-source-browser-shared')).not.toBeInTheDocument()

  fireEvent.click(within(sourceBrowser).getByRole('button', { name: 'Panth Prakash (English)' }))
  expect(within(sourceBrowser).getByRole('link', { name: '1' })).toHaveAttribute(
    'href',
    '/library/panth-prakash-english/page/1'
  )
})

test('shows exact SGGS bani items after expanding SGGS section', () => {
  renderBanis()
  fireEvent.click(screen.getAllByRole('button', { name: /Sri Guru Granth Sahib Ji/i })[0])
  fireEvent.click(screen.getByText('Daily Prayers'))

  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  expect(screen.getByText('Rehras Sahib')).toBeInTheDocument()
  expect(screen.queryByText(/Adjustable length/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/BaniDB/i)).not.toBeInTheDocument()
  expect(screen.queryByText('Raag Sri')).not.toBeInTheDocument()
})

test('shows exact-variant rows in the Dasam Granth section when BaniDB supports them', () => {
  renderBanis()
  fireEvent.click(screen.getAllByText(/Dasam Granth/i)[0])
  fireEvent.click(screen.getByText('Daily Prayers'))

  expect(screen.getByText('Tav Prasad Savaiye · Sraavag Suddh')).toBeInTheDocument()
  expect(screen.getByText('Tav Prasad Savaiye · Dheenan Ki')).toBeInTheDocument()
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

test('loads Sundar Gutka groups and items with bilingual labels', async () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sundar Gutka/i))

  await waitFor(() => expect(screen.getByText('Nitnem')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Nitnem'))
  expect(screen.getByText('ਜਪੁਜੀ ਸਾਹਿਬ')).toBeInTheDocument()
  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  expect(screen.getByText('Rehras Sahib')).toBeInTheDocument()
  expect(screen.queryByText(/STTM|BaniDB|Adjustable length/i)).not.toBeInTheDocument()
})

test('shows the Ardaas + Hukamnama featured flow and keeps plain Ardaas in Other', async () => {
  renderBanis()

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

test('opens Asa Di Var through an exact BaniDB route from the SGGS list', async () => {
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
  fireEvent.click(screen.getByText('Asa Di Var'))

  await waitFor(() => {
    expect(screen.getByTestId('location').textContent).toContain('/study?source=G&ang=462&startAng=462&endAng=475&bani=Asa+Di+Var&baniDbId=90&exactBani=1')
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

test('loads Rehat lists, chapters, and chapter content inside Read', async () => {
  renderBanis()
  fireEvent.click(screen.getByText('Rehat'))

  await waitFor(() => expect(screen.getByText('Sikh Rehat Maryada')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Sikh Rehat Maryada'))

  await waitFor(() => expect(screen.getByText('Daily Discipline')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Daily Discipline'))

  await waitFor(() => {
    expect(screen.getByText('Amritvela, nitnem, seva, and simran remain central.')).toBeInTheDocument()
  })
})

test('filters Rehat chapter names before opening a chapter', async () => {
  renderBanis()
  fireEvent.click(screen.getByText('Rehat'))

  await waitFor(() => expect(screen.getByText('Sikh Rehat Maryada')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Sikh Rehat Maryada'))

  await waitFor(() => expect(screen.getByPlaceholderText(/search chapters/i)).toBeInTheDocument())
  fireEvent.change(screen.getByPlaceholderText(/search chapters/i), { target: { value: 'Shared' } })

  expect(screen.getByText('Shared Conduct')).toBeInTheDocument()
  expect(screen.queryByText('Daily Discipline')).not.toBeInTheDocument()
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
