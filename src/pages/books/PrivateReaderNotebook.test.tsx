import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { PrivateBookAnnotation } from '../../data/privateLibrary'
import PrivateReaderNotebook from './PrivateReaderNotebook'

const timestamp = '2026-01-01T00:00:00.000Z'
const annotation: PrivateBookAnnotation = { id: 'synthetic-note', kind: 'text', index: 0, blockId: 'source-one', start: 0, end: 5, quote: 'Alpha', color: 'yellow', note: 'A thought', createdAt: timestamp, updatedAt: timestamp }
const originalClientRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects')
function setup(props: Partial<Parameters<typeof PrivateReaderNotebook>[0]> = {}) {
  const contentRef = createRef<HTMLDivElement>()
  const onChange = vi.fn().mockReturnValue(true)
  const onNavigate = vi.fn()
  const result = render(<><div ref={contentRef}><section data-source-id="source-one"><div data-source-text>Alpha &amp; beta 🪷.</div></section></div><PrivateReaderNotebook contentRef={contentRef} chapterIndex={0} annotations={[]} onChange={onChange} onNavigate={onNavigate} {...props} /></>)
  return { ...result, contentRef, onChange, onNavigate }
}
afterEach(() => {
  cleanup(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  if (originalClientRects) Object.defineProperty(Range.prototype, 'getClientRects', originalClientRects)
  else Reflect.deleteProperty(Range.prototype, 'getClientRects')
})

describe('private notebook interactions', () => {
  test('labels a new selected-passage note as Add note', async () => {
    const { contentRef } = setup()
    const text = contentRef.current!.querySelector('[data-source-text]')!.firstChild!
    const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 5)
    act(() => { window.getSelection()!.addRange(range); fireEvent(document, new Event('selectionchange')) })
    fireEvent.click(await screen.findByRole('button', { name: 'Add note' }))
    expect(screen.getByRole('dialog', { name: 'Add note' })).toBeVisible()
    expect(document.querySelector('.private-annotations-panel h2')).toHaveTextContent('Add note')
    expect(screen.queryByRole('heading', { name: 'Edit highlight' })).not.toBeInTheDocument()
  })

  test('offers four highlight colors for a real source selection and preserves exact quote text', async () => {
    const { contentRef, onChange } = setup()
    const text = contentRef.current!.querySelector('[data-source-text]')!.firstChild!
    const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 12)
    act(() => { window.getSelection()!.addRange(range); fireEvent(document, new Event('selectionchange')) })
    await screen.findByRole('toolbar', { name: 'Selected passage' })
    for (const color of ['yellow', 'green', 'blue', 'pink']) expect(screen.getByRole('button', { name: `Highlight ${color}` })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Highlight blue' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ kind: 'text', index: 0, blockId: 'source-one', start: 0, end: 12, quote: 'Alpha & beta', color: 'blue' })
    expect(contentRef.current!.textContent).toBe('Alpha & beta 🪷.')
    await waitFor(() => expect(screen.queryByRole('toolbar')).not.toBeInTheDocument())
  })

  test('keeps a rejected draft open and reuses creation IDs when the backend retry succeeds', async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    setup({ pageMode: true, chapterIndex: 6, pageLabel: 'Page 7', listOpen: true, onChange: save })
    fireEvent.click(screen.getByRole('button', { name: 'Add page note' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Your note' }), { target: { value: 'Keep this thought safe.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('textbox', { name: 'Your note' })).toHaveValue('Keep this thought safe.')
    expect(screen.getByRole('alert')).toHaveTextContent('Your draft is still here')
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save.mock.calls[1][0]).toEqual(save.mock.calls[0][0])
    expect(save.mock.calls[0][0][0]).toMatchObject({ kind: 'page', index: 6, note: 'Keep this thought safe.' })
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })

  test('requires a non-empty page note and explains scan limitations without text highlight controls', () => {
    const { onChange } = setup({ pageMode: true, listOpen: true })
    expect(screen.getByText(/Original pages support page notes and bookmarks/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add page note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Write a note before saving')
    expect(screen.queryByRole('button', { name: 'Highlight yellow' })).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('renders saved quotes and notes as inert text and navigates to the exact source offset', () => {
    const unsafe = '<img src=x onerror=alert(1)>'
    const mark = { ...annotation, quote: unsafe, end: unsafe.length, note: '<script>not code</script>' }
    const { onNavigate } = setup({ annotations: [mark], listOpen: true })
    expect(screen.getByText(unsafe)).toBeVisible()
    expect(document.querySelector('img,script')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: `Go to passage: ${unsafe}` }))
    expect(onNavigate).toHaveBeenCalledWith(0, 'source-one', 0)
  })

  test('edits colors and notes monotonically, then removes an annotation explicitly', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(timestamp))
    const { onChange } = setup({ annotations: [annotation], listOpen: true })
    fireEvent.click(screen.getByRole('button', { name: 'Edit note: Alpha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Highlight pink' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Your note' }), { target: { value: 'Reconsider this passage.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ id: annotation.id, color: 'pink', note: 'Reconsider this passage.', updatedAt: '2026-01-01T00:00:00.001Z' })
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Remove highlight: Alpha' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
    expect(onChange.mock.calls[1][0]).toEqual([])
  })

  test('retains draft and existing annotations when the complete reading-state budget is rejected', async () => {
    const save = vi.fn().mockReturnValue(false)
    setup({ annotations: [annotation], listOpen: true, onChange: save })
    fireEvent.click(screen.getByRole('button', { name: 'Edit note: Alpha' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Your note' }), { target: { value: 'A longer thought.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('Your existing notes are unchanged')
    expect(screen.getByRole('textbox', { name: 'Your note' })).toHaveValue('A longer thought.')
  })

  test('clears every CSS highlight registration on unmount without mutating source nodes', async () => {
    const highlights = new Map<string, unknown>()
    vi.stubGlobal('CSS', { highlights })
    vi.stubGlobal('Highlight', class { ranges: Range[]; constructor(...ranges: Range[]) { this.ranges = ranges } })
    const { container, contentRef, unmount } = setup({ annotations: [annotation] })
    const original = contentRef.current!.innerHTML
    await waitFor(() => expect(container.querySelector('[data-private-annotation-count]')).toHaveAttribute('data-private-annotation-count', '1'))
    expect(highlights.size).toBe(4)
    expect(contentRef.current!.innerHTML).toBe(original)
    unmount()
    expect(highlights.size).toBe(0)
  })

  test('opens an existing highlight on a short tap while letting swipes reach page navigation', async () => {
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [{ left: 20, top: 20, right: 100, bottom: 45, width: 80, height: 25 }] })
    const { container, contentRef } = setup({ annotations: [annotation] })
    await waitFor(() => expect(container.querySelector('[data-private-annotation-count]')).toHaveAttribute('data-private-annotation-count', '1'))
    const pointer = (type: string, x: number, time: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, { clientX: { value: x }, clientY: { value: 30 }, pointerId: { value: 1 }, button: { value: 0 }, timeStamp: { value: time } })
      fireEvent(contentRef.current!, event)
      return event
    }
    pointer('pointerdown', 90, 0)
    const swipe = pointer('pointerup', 40, 100)
    expect(swipe.defaultPrevented).toBe(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    pointer('pointerdown', 40, 200)
    const tap = pointer('pointerup', 42, 250)
    expect(tap.defaultPrevented).toBe(true)
    expect(screen.getByRole('dialog', { name: 'Edit highlight' })).toBeVisible()
  })

  test('repaints and clips fallback highlights after a page transform changes', async () => {
    let left = 10
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [{ left, top: 30, right: left + 100, bottom: 55, width: 100, height: 25 }] })
    const { container, contentRef } = setup({ annotations: [annotation] })
    vi.spyOn(contentRef.current!, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 20, right: 200, bottom: 300 } as DOMRect)
    await waitFor(() => expect(container.querySelector('[data-private-annotation-id]')).toHaveStyle({ left: '20px', width: '90px' }))
    left = 150
    act(() => { contentRef.current!.firstElementChild!.setAttribute('style', 'transform: translateX(-200px)') })
    await waitFor(() => expect(container.querySelector('[data-private-annotation-id]')).toHaveStyle({ left: '150px', width: '50px' }))
    expect(contentRef.current!.textContent).toBe('Alpha & beta 🪷.')
  })
})
