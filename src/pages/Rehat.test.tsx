import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useScriptureCacheStore } from '../store/scriptureCache'
import Rehat from './Rehat'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderRehat(path = '/banis/rehat') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/banis/rehat" element={<><Rehat /><LocationSpy /></>} />
        <Route path="/banis/rehat/:rehatId" element={<><Rehat /><LocationSpy /></>} />
        <Route path="/banis/rehat/:rehatId/chapters/:chapterId" element={<><Rehat /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useScriptureCacheStore.getState().clearAll()
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

test('renders the Rehat list with breadcrumbs and list search', async () => {
  renderRehat()

  expect(screen.getByTestId('page-rehat')).toBeInTheDocument()
  expect(screen.getByText(/loading rehats/i)).toBeInTheDocument()
  expect(within(screen.getByTestId('rehat-breadcrumbs')).getByText('Read')).toBeInTheDocument()
  expect(await screen.findByText('Sikh Rehat Maryada')).toBeInTheDocument()
  expect(screen.getByText('Tankhah Nama')).toBeInTheDocument()
  expect(screen.getByText(/1936 draft approvals/i)).toBeInTheDocument()

  fireEvent.change(screen.getByTestId('rehat-search'), { target: { value: 'Tankhah' } })

  expect(screen.getByText('Tankhah Nama')).toBeInTheDocument()
  expect(screen.queryByText('Sikh Rehat Maryada')).not.toBeInTheDocument()
})

test('supports direct Rehat detail URLs with source-backed context and chapter filtering', async () => {
  renderRehat('/banis/rehat/1')

  expect(await screen.findByText('Daily Discipline')).toBeInTheDocument()
  expect(within(screen.getByTestId('rehat-breadcrumbs')).getByText('Read')).toBeInTheDocument()
  expect(within(screen.getByTestId('rehat-breadcrumbs')).getByText('Rehat')).toBeInTheDocument()
  expect(within(screen.getByTestId('rehat-breadcrumbs')).getByText('Sikh Rehat Maryada')).toBeInTheDocument()
  expect(screen.getByText(/1 August 1936/)).toBeInTheDocument()
  expect(screen.getByText(/3 February 1945/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /SGPC English PDF/i })).toHaveAttribute(
    'href',
    'https://sandiegogurdwara.org/SikhRehat_SGPC_English.pdf'
  )

  fireEvent.change(screen.getByTestId('rehat-chapter-search'), { target: { value: 'Shared' } })

  expect(screen.getByText('Shared Conduct')).toBeInTheDocument()
  expect(screen.queryByText('Daily Discipline')).not.toBeInTheDocument()
})

test('supports direct Rehat chapter URLs, chapter text search, and sanitized rendering', async () => {
  const cache = useScriptureCacheStore.getState()
  cache.setRehats([{ rehatId: 1, rehatName: 'Sikh Rehat Maryada', alphabet: 'S' }])
  cache.setRehatChapters(1, [{ chapterId: 11, chapterName: 'Daily Discipline', alphabet: 'D' }])
  cache.setRehatChapter(1, {
    rehatId: 1,
    chapterId: 11,
    chapterName: 'Daily Discipline',
    chapterContent: '<p>Keep <strong>seva</strong><script>alert(1)</script><a href="javascript:alert(1)" onclick="bad()">unsafe</a></p>',
    alphabet: 'D',
  })

  renderRehat('/banis/rehat/1/chapters/11')

  expect(screen.getByTestId('rehat-chapter-page')).toBeInTheDocument()
  expect(within(screen.getByTestId('rehat-breadcrumbs')).getByText('Daily Discipline')).toBeInTheDocument()

  const content = screen.getByTestId('rehat-chapter-content')
  expect(content).toHaveTextContent(/Keep\s+seva/i)
  expect(content.innerHTML).not.toContain('<script')
  expect(content.innerHTML).not.toContain('alert(1)')
  expect(content.innerHTML).not.toContain('javascript:')
  expect(content.innerHTML).not.toContain('onclick')

  fireEvent.change(screen.getByTestId('rehat-chapter-text-search'), { target: { value: 'missing' } })

  expect(screen.getByText(/No matching text found/i)).toBeInTheDocument()
})

test('renders invalid route errors and dark mode', () => {
  document.documentElement.classList.add('dark')

  renderRehat('/banis/rehat/not-a-number')

  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(screen.getByTestId('page-rehat')).toHaveAttribute('data-ai-state', 'degraded')
  expect(screen.getByTestId('rehat-error-state')).toHaveTextContent(/not valid/i)
})
