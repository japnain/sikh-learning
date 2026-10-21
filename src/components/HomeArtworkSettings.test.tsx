import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import HomeArtworkSettings from './HomeArtworkSettings'
import { useHomeArtworkStore } from '../store/homeArtwork'
import { useLocaleStore } from '../store/locale'
import { preloadHomeArtwork } from '../utils/homeArtwork'

vi.mock('../utils/homeArtwork', async (importOriginal) => ({
  ...await importOriginal<typeof import('../utils/homeArtwork')>(),
  preloadHomeArtwork: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useHomeArtworkStore.setState({ mode: 'fixed', selectedId: 'eclipse', visitIndex: -1, pendingVisit: false, activeVisitToken: null, lastVisitToken: null })
  vi.mocked(preloadHomeArtwork).mockReset().mockResolvedValue(undefined)
})

test('shows fourteen gallery originals, Eclipse separately, and a visible Apply footer', () => {
  render(<HomeArtworkSettings open onClose={() => {}} />)
  expect(within(screen.getByTestId('home-artwork-gallery')).getAllByRole('button')).toHaveLength(14)
  expect(screen.getByRole('button', { name: /^Keep Eclipse landscape$/i })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: /Apply to Home/i }).closest('footer')).toBeInTheDocument()
})

test('Cancel discards an artwork draft; Apply commits only after the image loads', async () => {
  const onClose = vi.fn()
  const first = render(<HomeArtworkSettings open onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: /^Keep Court mural$/ }))
  expect(useHomeArtworkStore.getState().selectedId).toBe('eclipse')
  fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }))
  expect(useHomeArtworkStore.getState().selectedId).toBe('eclipse')
  first.unmount()
  onClose.mockClear()
  render(<HomeArtworkSettings open onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: /^Keep Court mural$/ }))
  fireEvent.click(screen.getByRole('button', { name: /Apply to Home/i }))
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(useHomeArtworkStore.getState()).toMatchObject({ mode: 'fixed', selectedId: 'court-mural' })
})

test('an unavailable selection does not replace the current Home artwork', async () => {
  vi.mocked(preloadHomeArtwork).mockRejectedValue(new Error('Unavailable'))
  const onClose = vi.fn()
  render(<HomeArtworkSettings open onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: /^Keep Court mural$/ }))
  fireEvent.click(screen.getByRole('button', { name: /Apply to Home/i }))
  await screen.findByText(/This artwork could not be loaded/i)
  expect(useHomeArtworkStore.getState().selectedId).toBe('eclipse')
  expect(onClose).not.toHaveBeenCalled()
})

test('canceling while the image loads prevents a late preference change', async () => {
  let resolveLoad: () => void = () => {}
  vi.mocked(preloadHomeArtwork).mockImplementation(() => new Promise(resolve => { resolveLoad = resolve }))
  render(<HomeArtworkSettings open onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /^Keep Court mural$/ }))
  fireEvent.click(screen.getByRole('button', { name: /Apply to Home/i }))
  fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }))
  await act(async () => { resolveLoad() })
  expect(useHomeArtworkStore.getState().selectedId).toBe('eclipse')
})

test('makes collection rotation distinct from keeping an individual painting', () => {
  render(<HomeArtworkSettings open onClose={() => {}} />)
  fireEvent.click(document.querySelector('.home-artwork-rhythm > summary')!)
  fireEvent.click(screen.getByRole('radio', { name: 'Daily change' }))
  expect(screen.getByRole('radio', { name: 'Daily change' })).toBeChecked()
  expect(screen.getByRole('button', { name: /^Keep Eclipse landscape$/ })).toHaveAttribute('aria-pressed', 'false')
  expect(document.querySelector('.home-artwork-footer')).toHaveTextContent(/^Daily change · /)
  fireEvent.click(screen.getByRole('button', { name: /^Keep Court mural$/ }))
  expect(screen.getByRole('radio', { name: 'Keep one' })).toBeChecked()
  expect(document.querySelector('.home-artwork-footer')).toHaveTextContent('Selected · Court mural')
  expect(useHomeArtworkStore.getState().selectedId).toBe('eclipse')
})

test('offers a fresh preview retry without changing the saved artwork', () => {
  render(<HomeArtworkSettings open onClose={() => {}} />)
  const preview = screen.getByRole('img')
  fireEvent.error(preview)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry artwork' }))
  const retriedPreview = screen.getByRole('img')
  expect(retriedPreview).not.toBe(preview)
  fireEvent.load(retriedPreview)
  expect(screen.queryByText('Loading artwork…')).not.toBeInTheDocument()
  expect(useHomeArtworkStore.getState().selectedId).toBe('eclipse')
})
