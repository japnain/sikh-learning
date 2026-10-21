import { useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { useAppScrollRestoration } from './useAppScrollRestoration'
import { restoreAppScrollTopWhenReady, scrollAppHashIntoView } from '../utils/appScroll'

vi.mock('../utils/appScroll', () => ({
  getAppScrollTop: () => 42,
  restoreAppScrollTopWhenReady: vi.fn(() => vi.fn()),
  scrollAppHashIntoView: vi.fn(() => vi.fn()),
}))

function Harness({ ownsPosition = false }: { ownsPosition?: boolean }) {
  const ref = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  useAppScrollRestoration({
    mainContentRef: ref,
    routeHandlesOwnPosition: ownsPosition || location.pathname === '/study',
  })
  return <main ref={ref}><button onClick={() => navigate('/study?resumeVerseId=121')}>Resume scripture</button></main>
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

test('yields a saved pixel position to a semantic scripture resume', () => {
  sessionStorage.setItem('naamras-app-scroll-positions-v1', JSON.stringify([
    { id: 'reader:/study?resumeVerseId=121', top: 50000 },
  ]))
  render(<MemoryRouter initialEntries={[{ pathname: '/study', search: '?resumeVerseId=121', key: 'reader' }]}><Harness ownsPosition /></MemoryRouter>)
  expect(restoreAppScrollTopWhenReady).not.toHaveBeenCalled()
  expect(scrollAppHashIntoView).not.toHaveBeenCalled()
})

test('still restores the saved position of an ordinary page', () => {
  sessionStorage.setItem('naamras-app-scroll-positions-v1', JSON.stringify([
    { id: 'saved:/saved', top: 900 },
  ]))
  render(<MemoryRouter initialEntries={[{ pathname: '/saved', key: 'saved' }]}><Harness /></MemoryRouter>)
  expect(restoreAppScrollTopWhenReady).toHaveBeenCalledWith(900)
})

test('cancels an earlier deferred restore when entering a reader-owned resume', () => {
  const cancel = vi.fn()
  vi.mocked(restoreAppScrollTopWhenReady).mockReturnValueOnce(cancel)
  render(<MemoryRouter initialEntries={['/more']}><Harness /></MemoryRouter>)
  expect(restoreAppScrollTopWhenReady).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Resume scripture' }))
  expect(cancel).toHaveBeenCalledOnce()
  expect(restoreAppScrollTopWhenReady).toHaveBeenCalledOnce()
})

test('keeps normal hash navigation available', () => {
  render(<MemoryRouter initialEntries={['/more#appearance']}><Harness /></MemoryRouter>)
  expect(scrollAppHashIntoView).toHaveBeenCalledWith('#appearance')
})
