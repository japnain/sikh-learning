import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import BaniLengthSheet, { type BaniLengthSheetProps } from './BaniLengthSheet'
import { useBani } from '../hooks/useBani'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import type { ScriptureEntry, ScriptureLine } from '../types'
import type { BaniFetchResult } from '../api/banidb'
import { loadExactBaniReading } from '../utils/baniLengthSelection'

vi.mock('../hooks/useBani', () => ({ useBani: vi.fn() }))
vi.mock('../utils/baniLengthSelection', () => ({ loadExactBaniReading: vi.fn() }))

const retry = vi.fn()
const baseResult: ReturnType<typeof useBani> = {
  entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short',
  status: 'ready', issue: null, loading: false, refreshing: false, error: null, isCached: false, retry,
}
const defaults: BaniLengthSheetProps = {
  open: true, onClose: vi.fn(), baniId: 'rehras-sahib', currentLength: 'short', usualLength: 'long',
  availableLengths: ['short', 'long'], onSelect: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({ scriptMode: 'gurmukhi' })
  vi.mocked(useBani).mockReturnValue(baseResult)
  vi.mocked(loadExactBaniReading).mockReset()
})

test('closed sheets do not discover lengths or mount a dialog', () => {
  render(<BaniLengthSheet {...defaults} open={false} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(useBani).not.toHaveBeenCalled()
})

test('offers only verified distinct choices and distinguishes current from usual', () => {
  render(<BaniLengthSheet {...defaults} availableLengths={['long', 'short', 'long']} />)
  const dialog = screen.getByRole('dialog', { name: 'Bani length' })
  const radios = within(dialog).getAllByRole('radio')
  expect(radios.map(input => input.getAttribute('value'))).toEqual(['short', 'long'])
  expect(within(dialog).getByRole('radio', { name: 'Short Current' })).toBeChecked()
  expect(within(dialog).getByRole('radio', { name: 'Long Usual' })).not.toBeChecked()
  expect(vi.mocked(useBani).mock.calls.every(([id]) => id === null)).toBe(true)
})

test('keeps selection reversible and applies an active-reading override only on the explicit action', async () => {
  const onSelect = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(<BaniLengthSheet {...defaults} onSelect={onSelect} onClose={onClose} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  expect(onSelect).not.toHaveBeenCalled()
  expect(screen.getByRole('checkbox', { name: 'Use for my Nitnem' })).not.toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledExactlyOnceWith('long', false))
  expect(onClose).not.toHaveBeenCalled()
})

test('can remember the current length as usual without requiring a different active length', async () => {
  const onSelect = vi.fn().mockResolvedValue(undefined)
  render(<BaniLengthSheet {...defaults} onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Use for my Nitnem' }))
  fireEvent.click(screen.getByRole('button', { name: 'Read short' }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledExactlyOnceWith('short', true))
})

test('a rejected transition keeps the sheet open and supports retry without committing another choice', async () => {
  const onSelect = vi.fn().mockRejectedValueOnce(new Error('Long is not saved on this device.')).mockResolvedValueOnce(undefined)
  render(<BaniLengthSheet {...defaults} onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  fireEvent.click(screen.getByRole('button', { name: 'Read long' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Long is not saved on this device.')
  expect(screen.getByRole('dialog', { name: 'Bani length' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(defaults.onClose).not.toHaveBeenCalled()
})

test('prevents duplicate submissions while a target reading is being prepared', async () => {
  let finish!: () => void
  const onSelect = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  render(<BaniLengthSheet {...defaults} onSelect={onSelect} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  fireEvent.click(screen.getByRole('button', { name: 'Read long' }))
  const preparing = screen.getByRole('button', { name: 'Preparing reading…' })
  fireEvent.click(preparing)
  expect(preparing).toBeDisabled()
  expect(screen.getByRole('checkbox')).toBeDisabled()
  expect(onSelect).toHaveBeenCalledOnce()
  await act(async () => { finish() })
  expect(screen.getByRole('button', { name: 'Read long' })).toBeEnabled()
})

test('dismissal and reopening discard selection and remember scope without applying', () => {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  const view = render(<BaniLengthSheet {...defaults} onSelect={onSelect} onClose={onClose} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Close bani length' }))
  expect(onClose).toHaveBeenCalledOnce()
  expect(onSelect).not.toHaveBeenCalled()
  view.rerender(<BaniLengthSheet {...defaults} open={false} onSelect={onSelect} />)
  view.rerender(<BaniLengthSheet {...defaults} onSelect={onSelect} />)
  expect(screen.getByRole('radio', { name: 'Short Current' })).toBeChecked()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
})

test('uses the current exact reading to discover options and does not guess choices when discovery fails', () => {
  vi.mocked(useBani).mockReturnValue({ ...baseResult, availableLengths: [], error: 'network', status: 'degraded' })
  render(<BaniLengthSheet {...defaults} availableLengths={undefined} />)
  expect(useBani).toHaveBeenCalledWith(21, 'short')
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Read short' })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Your current reading is unchanged.')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(retry).toHaveBeenCalledOnce()
})

test('honors external preparation and failure state', () => {
  render(<BaniLengthSheet {...defaults} pending error="The selected text is unavailable." />)
  expect(screen.getByRole('button', { name: 'Preparing reading…' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('The selected text is unavailable.')
})

test('loads a boundary preview only on demand for the selected exact length and preserves source punctuation', async () => {
  const body = (gurmukhi: string, isHeader = false) => ({ gurmukhi, isHeader } as ScriptureLine)
  const entry = { id: 'bani-21-1', gurmukhi: '', lines: [body('ਸਿਰਲੇਖ', true), body('ਆਰੰਭ ॥੧॥'), body('ਅੰਤ ॥੨॥')] } as ScriptureEntry
  vi.mocked(useBani).mockImplementation((id, length) => id === 21 && length === 'long'
    ? { ...baseResult, entries: [entry], resolvedLength: 'long', isCached: true }
    : baseResult)
  render(<BaniLengthSheet {...defaults} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  expect(vi.mocked(useBani).mock.calls.every(([id]) => id === null)).toBe(true)
  const summary = screen.getByText('See opening and ending text')
  fireEvent.click(summary)
  expect(await screen.findByTestId('bani-length-preview')).toHaveTextContent('ਆਰੰਭ ॥੧॥')
  expect(screen.getByTestId('bani-length-preview')).toHaveTextContent('ਅੰਤ ॥੨॥')
  expect(screen.getByTestId('bani-length-preview')).not.toHaveTextContent('ਸਿਰਲੇਖ')
  expect(screen.getByTestId('bani-length-preview')).toHaveTextContent('Showing saved source text.')
  expect(useBani).toHaveBeenCalledWith(21, 'long')
  expect(defaults.onSelect).not.toHaveBeenCalled()
})

test.each([
  ['pa', 'ਬਾਣੀ ਦੀ ਲੰਬਾਈ', 'ਮੇਰੇ ਨਿਤਨੇਮ ਲਈ ਵਰਤੋ'],
  ['hi', 'बानी की लंबाई', 'मेरे नितनेम के लिए उपयोग करें'],
] as const)('localizes chooser labels and scope in %s', (locale, title, remember) => {
  render(<BaniLengthSheet {...defaults} locale={locale} />)
  expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: remember })).not.toBeChecked()
})

test('shows a verified destination before enabling Read and reuses the same payload on apply', async () => {
  const short: BaniFetchResult = { entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short' }
  const long: BaniFetchResult = { ...short, resolvedLength: 'long' }
  let resolveLong!: (reading: BaniFetchResult) => void
  vi.mocked(loadExactBaniReading).mockImplementation((_id, length) => length === 'short' ? Promise.resolve(short) : new Promise(resolve => { resolveLong = resolve }))
  const describeDestination = vi.fn((reading: BaniFetchResult) => reading.resolvedLength === 'long' ? 'Start this length from its beginning.' : 'Continue at the same verse in this length.')
  const onSelect = vi.fn()
  const view = render(<BaniLengthSheet {...defaults} describeDestination={describeDestination} onSelect={onSelect} />)
  await waitFor(() => expect(screen.getByTestId('bani-length-destination')).toHaveTextContent('Continue at the same verse'))
  view.rerender(<BaniLengthSheet {...defaults} describeDestination={reading => describeDestination(reading)} onSelect={onSelect} />)
  expect(loadExactBaniReading).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  expect(screen.getByRole('button', { name: 'Read long' })).toBeDisabled()
  expect(screen.getByTestId('bani-length-destination')).toHaveTextContent('Checking where this reading will open')
  expect(onSelect).not.toHaveBeenCalled()
  await act(async () => { resolveLong(long) })
  expect(screen.getByTestId('bani-length-destination')).toHaveTextContent('Start this length from its beginning.')
  fireEvent.click(screen.getByRole('button', { name: 'Read long' }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledExactlyOnceWith('long', false, long))
  expect(loadExactBaniReading).toHaveBeenCalledTimes(2)
})

test('an unavailable destination stays unapplied and can be retried before Read', async () => {
  const reading: BaniFetchResult = { entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short' }
  vi.mocked(loadExactBaniReading).mockRejectedValueOnce(new Error('This length is not available offline.')).mockResolvedValueOnce(reading)
  const onSelect = vi.fn()
  render(<BaniLengthSheet {...defaults} onSelect={onSelect} describeDestination={() => 'Open this length at its saved place.'} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('not available offline')
  expect(screen.getByRole('button', { name: 'Read short' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Read short' })).toBeEnabled())
  expect(screen.getByTestId('bani-length-destination')).toHaveTextContent('Open this length at its saved place.')
  expect(onSelect).not.toHaveBeenCalled()
})

test('a late destination cannot replace a newer selection and dismissal aborts preflight', async () => {
  const short: BaniFetchResult = { entries: [], availableLengths: ['short', 'long'], resolvedLength: 'short' }
  const long: BaniFetchResult = { ...short, resolvedLength: 'long' }
  let resolveShort!: (reading: BaniFetchResult) => void
  const requests: AbortSignal[] = []
  vi.mocked(loadExactBaniReading).mockImplementation((_id, length, signal) => {
    requests.push(signal!)
    return length === 'short' ? new Promise(resolve => { resolveShort = resolve }) : Promise.resolve(long)
  })
  const view = render(<BaniLengthSheet {...defaults} describeDestination={reading => reading.resolvedLength === 'long' ? 'Long destination' : 'Stale short destination'} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Long Usual' }))
  await waitFor(() => expect(screen.getByTestId('bani-length-destination')).toHaveTextContent('Long destination'))
  expect(requests[0].aborted).toBe(true)
  await act(async () => { resolveShort(short) })
  expect(screen.getByTestId('bani-length-destination')).not.toHaveTextContent('Stale short')
  view.unmount()
  expect(requests[1].aborted).toBe(true)
})
