import fs from 'node:fs'
import path from 'node:path'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureLibraryRepositoryLoader } from '../../data/libraryRepository'
import { useProgressStore } from '../../store/progress'
import PanthPrakashLibraryHome from './PanthPrakashLibraryHome'

const PROJECT_ROOT = process.cwd()
const WORK_PATH = '/library/panth-prakash-english'

function renderLibraryHome() {
  return render(
    <MemoryRouter initialEntries={[WORK_PATH]}>
      <Routes>
        <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
      </Routes>
    </MemoryRouter>
  )
}

function installTrackingLibraryLoader(requestedPaths: string[]) {
  configureLibraryRepositoryLoader(async resourcePath => {
    requestedPaths.push(resourcePath)
    const normalizedPath = resourcePath.replace(/^\//, '')
    return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'public', normalizedPath), 'utf8'))
  })
}

describe('PanthPrakashLibraryHome', () => {
  beforeEach(() => {
    useProgressStore.setState({
      streak: 0,
      currentSession: null,
      studied: [],
      reviewQueue: [],
      lastStudied: null,
    })
  })

  test('presents one 169-episode work across two publications without source debug UI', async () => {
    renderLibraryHome()

    const home = await screen.findByTestId('panth-library-home')
    expect(screen.getByRole('heading', { name: /Sri Gur Panth Prakash/i })).toBeInTheDocument()
    expect(screen.getByTestId('panth-epub-coverage')).toHaveTextContent(/169 episodes/i)
    expect(screen.getByTestId('panth-epub-coverage')).toHaveTextContent(/2 volumes/i)
    expect(screen.getByTestId('panth-epub-coverage')).toHaveTextContent(/637 readable source pages/i)

    const volumeOneCard = screen.getByRole('heading', { name: 'Volume I' }).closest('article')
    const volumeTwoCard = screen.getByRole('heading', { name: 'Volume II' }).closest('article')
    expect(volumeOneCard).not.toBeNull()
    expect(volumeTwoCard).not.toBeNull()
    expect(within(volumeOneCard as HTMLElement).getByRole('link', { name: /open volume/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-001'
    )
    expect(within(volumeTwoCard as HTMLElement).getByRole('link', { name: /open volume/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-082'
    )

    expect(home).not.toHaveTextContent(/page_\d+\.html/i)
    expect(home).not.toHaveTextContent(/volume-[12]\.epub/i)
    expect(home).not.toHaveTextContent(/EPUB page/i)
    expect(screen.queryByLabelText(/jump to page/i)).not.toBeInTheDocument()
  })

  test('filters the stable episode catalog and links directly to episode IDs', async () => {
    const user = userEvent.setup()
    renderLibraryHome()

    await screen.findByTestId('panth-library-home')
    await user.type(screen.getByLabelText(/search chapters and episodes/i), 'Bunga S. Sham Singh')

    expect(screen.getByText(/Showing 1 of 1 sections/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Episode 169/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-169'
    )
  })

  test('loads the per-work full-text index only when a search is submitted', async () => {
    const user = userEvent.setup()
    const requestedPaths: string[] = []
    installTrackingLibraryLoader(requestedPaths)
    renderLibraryHome()

    await screen.findByTestId('panth-library-home')
    expect(requestedPaths).not.toContain('/data/library/works/panth-prakash-english/search-index.json')

    await user.type(screen.getByLabelText(/search within Panth Prakash/i), 'origin of the Khalsa')
    expect(requestedPaths).not.toContain('/data/library/works/panth-prakash-english/search-index.json')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    const results = await screen.findByTestId('panth-full-text-results')
    expect(requestedPaths).toContain('/data/library/works/panth-prakash-english/search-index.json')
    expect(requestedPaths).not.toContain('/data/library/search-index.json')
    const episodeOneResult = within(results)
      .getAllByRole('link')
      .find(link => link.getAttribute('href') === '/library/panth-prakash-english/chapters/episode-001')
    expect(episodeOneResult).toHaveAttribute('href', '/library/panth-prakash-english/chapters/episode-001')
  })

  test('ignores retired page sessions and resumes stable chapter locators', async () => {
    useProgressStore.setState({
      currentSession: {
        scriptureId: 'panth-prakash-english-565',
        resumePath: '/library/panth-prakash-english/page/565',
        updatedAt: '2026-04-19T12:00:00.000Z',
      },
    })

    const { rerender } = renderLibraryHome()
    await screen.findByTestId('panth-library-home')
    expect(screen.queryByRole('link', { name: /continue reading/i })).not.toBeInTheDocument()

    act(() => {
      useProgressStore.setState({
        currentSession: {
          scriptureId: 'panth-prakash-english-episode-001',
          resumePath: '/library/panth-prakash-english/chapters/episode-001',
          readerLocator: {
            revision: 'panth-prakash-english-v3-f9f801cc-243827eb',
            href: '/library/panth-prakash-english/chapters/episode-001',
            type: 'application/xhtml+xml',
            locations: {
              progression: 0.1,
              totalProgression: 0.01,
              position: 10,
              blockId: 'episode-001-p47-b003',
            },
          },
          updatedAt: '2026-04-19T12:00:00.000Z',
        },
      })
    })

    rerender(
      <MemoryRouter initialEntries={[WORK_PATH]}>
        <Routes>
          <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('link', { name: /continue reading/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003'
    )
  })
})
