import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import PrivateReaderChrome, { type PrivateReaderChromeProps } from './PrivateReaderChrome'

function defaults(): PrivateReaderChromeProps {
  return {
    title: 'The Quiet History', subtitle: 'An opening chapter', hidden: false,
    onToggle: vi.fn(), onReveal: vi.fn(), backHref: '/books/private/example', onBack: vi.fn(),
    bookmarked: false, onBookmark: vi.fn(), onContents: vi.fn(), onAppearance: vi.fn(), onSearch: vi.fn(),
    onBookmarks: vi.fn(), onAnnotations: vi.fn(), searchEnabled: true, saving: 'saved', onRetry: vi.fn(),
    locationUnit: 'page', page: 2, count: 12, chapterLabel: 'An opening chapter', bookProgress: .15,
    canPrevious: true, canNext: true, onPrevious: vi.fn(), onNext: vi.fn(), onSeek: vi.fn(),
    finished: false, onFinish: vi.fn(),
  }
}

function reader(props: PrivateReaderChromeProps) {
  return <MemoryRouter><main className="private-reader"><button type="button">Reading surface</button><PrivateReaderChrome {...props} /></main></MemoryRouter>
}

test('provides a concise heading, bookmarked state and accessible page navigation', () => {
  const props = defaults()
  render(reader(props))
  expect(screen.getByRole('heading', { name: props.title, level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Back to book details' })).toHaveAttribute('href', props.backHref)
  fireEvent.click(screen.getByRole('button', { name: 'Bookmark this position' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
  expect(props.onBookmark).toHaveBeenCalledOnce()
  expect(props.onNext).toHaveBeenCalledOnce()
  expect(props.onPrevious).toHaveBeenCalledOnce()
  expect(screen.getByRole('slider', { name: 'Reading position' })).toHaveAttribute('aria-valuetext', 'Page 2 of 12, An opening chapter')
})

test('uses section vocabulary for scrolling sections, including scrubber previews', () => {
  const props = { ...defaults(), locationUnit: 'section' as const, page: 1, count: 3 }
  render(reader(props))
  expect(screen.getByText('Section 1 of 3')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next section' }))
  fireEvent.click(screen.getByRole('button', { name: 'Previous section' }))
  expect(props.onNext).toHaveBeenCalledOnce()
  expect(props.onPrevious).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  const slider = screen.getByRole('slider', { name: 'Reading position' })
  expect(slider).toHaveAttribute('aria-valuetext', 'Section 1 of 3, An opening chapter')
  fireEvent.pointerDown(slider, { pointerId: 1 })
  fireEvent.change(slider, { target: { value: '3' } })
  expect(slider).toHaveAttribute('aria-valuetext', 'Section 3 of 3, An opening chapter')
  fireEvent.pointerUp(slider, { pointerId: 1 })
  expect(props.onSeek).toHaveBeenCalledExactlyOnceWith(3)
})

test('opens keyboard-accessible options and restores a persistent opener before switching tools', async () => {
  const props = defaults()
  const appearance = vi.fn(() => expect(screen.getByRole('button', { name: 'Reading options' })).toHaveFocus())
  render(reader({ ...props, onAppearance: appearance }))
  const opener = screen.getByRole('button', { name: 'Reading options' })
  opener.focus()
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog', { name: 'Reading options' })
  expect(within(dialog).getByRole('button', { name: 'Reading appearance' })).toHaveFocus()
  expect(within(dialog).getByRole('button', { name: 'Highlights & notes' })).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reading appearance' }))
  await waitFor(() => expect(appearance).toHaveBeenCalledOnce())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('omits unavailable tools and closes the options sheet with Escape', async () => {
  render(reader({ ...defaults(), searchEnabled: false, onAnnotations: undefined }))
  const opener = screen.getByRole('button', { name: 'Reading options' })
  opener.focus()
  fireEvent.click(opener)
  expect(screen.queryByRole('button', { name: 'Find in book' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Highlights & notes' })).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(opener).toHaveFocus()
})

test('previews a dragged page and seeks only once when the drag is committed', () => {
  const props = defaults()
  render(reader(props))
  const slider = screen.getByRole('slider', { name: 'Reading position' })
  fireEvent.pointerDown(slider, { pointerId: 1 })
  fireEvent.change(slider, { target: { value: '4' } })
  fireEvent.change(slider, { target: { value: '7' } })
  expect(props.onSeek).not.toHaveBeenCalled()
  expect(slider).toHaveAttribute('aria-valuetext', 'Page 7 of 12, An opening chapter')
  fireEvent.pointerUp(slider, { pointerId: 1 })
  fireEvent.blur(slider)
  expect(props.onSeek).toHaveBeenCalledExactlyOnceWith(7)
})

test('commits keyboard and assistive range changes immediately and cancels an interrupted drag', () => {
  const props = defaults()
  render(reader(props))
  const slider = screen.getByRole('slider', { name: 'Reading position' })
  fireEvent.change(slider, { target: { value: '3' } })
  expect(props.onSeek).toHaveBeenCalledExactlyOnceWith(3)
  fireEvent.pointerDown(slider, { pointerId: 1 })
  fireEvent.change(slider, { target: { value: '9' } })
  fireEvent.pointerCancel(slider)
  fireEvent.blur(slider)
  expect(props.onSeek).toHaveBeenCalledTimes(1)
})

test('keeps reading focus in the text when controls automatically hide', () => {
  const props = defaults()
  const view = render(reader(props))
  const surface = screen.getByRole('button', { name: 'Reading surface' })
  surface.focus()
  view.rerender(reader({ ...props, hidden: true }))
  expect(surface).toHaveFocus()
  expect(screen.getByRole('heading', { name: props.title, level: 1 })).toHaveClass('sr-only')
  expect(screen.queryByRole('button', { name: 'Reading options' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show reading controls' }))
  expect(props.onReveal).toHaveBeenCalledOnce()
})

test('moves focus to the reveal control when a focused toolbar is hidden', () => {
  const props = defaults()
  const view = render(reader(props))
  screen.getByRole('button', { name: 'Reading options' }).focus()
  view.rerender(reader({ ...props, hidden: true }))
  expect(screen.getByRole('button', { name: 'Show reading controls' })).toHaveFocus()
})

test('keeps completion explicit and saving failures recoverable with controls hidden', () => {
  const props = { ...defaults(), page: 12, canNext: false }
  const view = render(reader(props))
  fireEvent.click(screen.getByRole('button', { name: 'Mark finished' }))
  expect(props.onFinish).toHaveBeenCalledOnce()
  view.rerender(reader({ ...props, hidden: true, saving: 'error' }))
  fireEvent.click(screen.getByRole('button', { name: 'Place not saved · Retry' }))
  expect(props.onRetry).toHaveBeenCalledOnce()
})

test('handles one-page content and small positive progress without misleading zero percent', () => {
  render(reader({ ...defaults(), count: 1, page: 1, canPrevious: false, canNext: false, bookProgress: .002 }))
  expect(screen.getByRole('slider', { name: 'Reading position' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  expect(screen.getByText('<1%', { exact: false })).toBeInTheDocument()
})
