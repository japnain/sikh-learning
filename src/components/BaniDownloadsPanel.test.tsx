import { useBaniDownloadQueue } from '../store/baniDownloadQueue'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import BaniDownloadsPanel, { type BaniDownloadItem } from './BaniDownloadsPanel'
import { useLocaleStore } from '../store/locale'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { fetchPublishedScriptureReadingKeys, fetchPublishedScriptureSizes } from '../api/scriptureCatalogue'
import { SHABADOS_BANIS } from '../data/shabadosBanis'
import { OfflineReaderShellError } from '../utils/offlineReaderShell'
import {
  downloadBani,
  listBaniDownloads,
  removeBaniDownload,
  type BaniDownloadInfo,
  type BaniDownloadSource,
} from '../utils/baniDownloads'

vi.mock('../utils/baniDownloads', () => ({
  BANI_DOWNLOADS_CHANGED_EVENT: 'naamras:bani-downloads-changed',
  downloadBani: vi.fn(), listBaniDownloads: vi.fn(), removeBaniDownload: vi.fn(),
}))
vi.mock('../api/scriptureCatalogue', () => ({ fetchPublishedScriptureReadingKeys: vi.fn(), fetchPublishedScriptureSizes: vi.fn() }))

const openRehras = vi.fn()
const sources: BaniDownloadSource[] = [
  { key: 'banidb:21', title: 'Rehras Sahib', provider: 'banidb', load: vi.fn(), validate: () => true },
  { key: 'shabados:ALHN', title: 'Alahnia', provider: 'shabados', load: vi.fn(), validate: () => true },
]
const items: BaniDownloadItem[] = sources.map(source => ({ key: source.key, title: source.title, createSource: () => source, onOpen: source.key === 'banidb:21' ? openRehras : vi.fn() }))
let saved: BaniDownloadInfo[]

function info(source: BaniDownloadSource): BaniDownloadInfo {
  return { key: source.key, title: source.title, provider: source.provider, downloadedAt: '2026-11-12T00:00:00Z', availableLengths: source.key === 'banidb:21' ? ['short', 'medium', 'long', 'extralong'] : [], byteSize: 2048 }
}

function openPanel() {
  render(<BaniDownloadsPanel items={items} />)
  fireEvent.click(screen.getByText('Offline banis'))
}

beforeEach(() => {
  vi.clearAllMocks()
  useBaniDownloadQueue.setState({ progress: null, message: null, error: null, retryKeys: [], completed: [] })
  vi.mocked(fetchPublishedScriptureSizes).mockResolvedValue({})
  useLocaleStore.setState({ locale: 'en' })
  useReadingPlacesStore.setState({ places: {} })
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  saved = []
  vi.mocked(fetchPublishedScriptureReadingKeys).mockResolvedValue(items.map(item => item.key))
  vi.mocked(listBaniDownloads).mockImplementation(async () => [...saved])
  vi.mocked(downloadBani).mockImplementation(async source => {
    const result = info(source)
    saved = [...saved.filter(item => item.key !== result.key), result]
    return result
  })
  vi.mocked(removeBaniDownload).mockImplementation(async key => {
    saved = saved.filter(item => item.key !== key)
    return true
  })
})

test('downloads a complete reading pack without changing the saved length or reading place', async () => {
  const lengths = { ...useSundarGutkaLengthStore.getState().lengths, 'rehras-sahib': 'extralong' as const }
  useSundarGutkaLengthStore.setState({ lengths })
  useReadingPlacesStore.getState().remember({
    scriptureId: 'G:8', resumeVerseId: 735, updatedAt: '2026-11-12T00:00:00Z',
    resumePath: '/study?exactBani=1&source=G&baniId=rehras-sahib&baniDbId=21&startAng=8&endAng=12&sgLength=extralong&resumeVerseId=735',
  })
  const places = structuredClone(useReadingPlacesStore.getState().places)
  expect(Object.keys(places)).toHaveLength(1)
  openPanel()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download bani' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Download bani' }))
  await screen.findByText('4 lengths saved · 2 KB')
  expect(downloadBani).toHaveBeenCalledWith(sources[0], expect.objectContaining({ signal: expect.any(AbortSignal), onProgress: expect.any(Function) }))
  expect(useSundarGutkaLengthStore.getState().lengths).toEqual(lengths)
  expect(useReadingPlacesStore.getState().places).toEqual(places)
  expect(screen.getByText('1 downloaded · 2 available to download')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Read: Rehras Sahib' }))
  expect(openRehras).toHaveBeenCalledOnce()
})

test('download all skips complete packs and includes additional readings', async () => {
  saved = [info(sources[0])]
  openPanel()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download all available' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Download all available' }))
  await screen.findByText('2 downloaded · 2 available to download')
  expect(downloadBani).toHaveBeenCalledTimes(1)
  expect(downloadBani).toHaveBeenCalledWith(sources[1], expect.anything())
  expect(screen.getByRole('button', { name: 'Available banis downloaded' })).toBeDisabled()
})

test('bulk downloads do not reread the entire saved catalogue after each completed bani', async () => {
  const originalDownload = vi.mocked(downloadBani).getMockImplementation()!
  vi.mocked(downloadBani).mockImplementation(async (source, options) => {
    const result = await originalDownload(source, options)
    window.dispatchEvent(new Event('naamras:bani-downloads-changed'))
    return result
  })
  openPanel()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download all available' })).toBeEnabled())
  expect(listBaniDownloads).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Download all available' }))
  await screen.findByText('2 downloaded · 2 available to download')
  await waitFor(() => expect(listBaniDownloads).toHaveBeenCalledTimes(2))
  expect(downloadBani).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: 'Read: Rehras Sahib' })).toBeEnabled()
})

test('retains completed downloads after failure and retries only the unfinished queue', async () => {
  const defaultDownload = vi.mocked(downloadBani).getMockImplementation()!
  vi.mocked(downloadBani).mockImplementationOnce(defaultDownload).mockRejectedValueOnce(new Error('Network unavailable')).mockImplementation(defaultDownload)
  openPanel()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download all available' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Download all available' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('button', { name: 'Read: Rehras Sahib' })).toBeEnabled()
  expect(screen.getByText('Downloads need attention · open to retry')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry download' }))
  await screen.findByText('2 downloaded · 2 available to download')
  expect(vi.mocked(downloadBani).mock.calls.map(call => call[0].key)).toEqual(['banidb:21', 'shabados:ALHN', 'shabados:ALHN'])
})

test('cancels an in-progress pack without claiming offline readiness', async () => {
  vi.mocked(downloadBani).mockImplementation((_source, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true })
  }))
  openPanel()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download bani' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Download bani' }))
  await screen.findByRole('button', { name: 'Cancel download' })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel download' }))
  await screen.findByText('Download cancelled. Completed downloads are still available.')
  expect(screen.getByText('0 downloaded · 2 available to download')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Read: Rehras Sahib' })).not.toBeInTheDocument()
})

test('keeps downloaded readings accessible offline and removes only their downloaded copy', async () => {
  saved = [info(sources[0])]
  openPanel()
  await screen.findByRole('button', { name: 'Read: Rehras Sahib' })
  await act(async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    window.dispatchEvent(new Event('offline'))
  })
  expect(screen.getByRole('button', { name: 'Update download' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Download all available' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Read: Rehras Sahib' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Remove download: Rehras Sahib' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Read: Rehras Sahib' })).not.toBeInTheDocument())
  expect(removeBaniDownload).toHaveBeenCalledWith('banidb:21')
  expect(screen.getByText('Offline banis').closest('summary')).toHaveFocus()
  expect(screen.getByText('Removing a download keeps your bookmarks and reading progress.')).toBeInTheDocument()
})

test('does not report success when reading the saved-download list fails', async () => {
  vi.mocked(listBaniDownloads).mockRejectedValueOnce(new Error('Storage unavailable'))
  openPanel()
  const alert = await screen.findByRole('alert')
  expect(within(alert).getByText('Saved downloads could not be checked. Try again.')).toBeInTheDocument()
  expect(screen.queryByText('No banis downloaded on this device yet.')).not.toBeInTheDocument()
  fireEvent.click(within(alert).getByRole('button', { name: 'Retry download' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
})

test('refreshes readiness when saved device storage changes', async () => {
  saved = [info(sources[0])]
  openPanel()
  await screen.findByText('1 downloaded · 2 available to download')
  await act(async () => {
    saved = []
    window.dispatchEvent(new Event('naamras:bani-downloads-changed'))
  })
  await screen.findByText('0 downloaded · 2 available to download')
  expect(screen.queryByRole('button', { name: 'Read: Rehras Sahib' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download bani' })).toBeEnabled()
})

test('offers every published additional reading and excludes unpublished existing readings', async () => {
  saved = [info(sources[0])]
  const additionalItems: BaniDownloadItem[] = SHABADOS_BANIS.map(bani => ({ key: `shabados:${bani.id}`, title: bani.name, createSource: () => ({ ...sources[1], key: `shabados:${bani.id}`, title: bani.name }) }))
  vi.mocked(fetchPublishedScriptureReadingKeys).mockResolvedValue(additionalItems.map(item => item.key))
  render(<BaniDownloadsPanel items={[items[0], ...additionalItems]} />)
  fireEvent.click(screen.getByText('Offline banis'))
  await screen.findByText(`1 downloaded · ${additionalItems.length} available to download`)
  expect(screen.getAllByRole('option')).toHaveLength(additionalItems.length)
  expect(screen.queryByRole('option', { name: 'Rehras Sahib' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Read: Rehras Sahib' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Remove download: Rehras Sahib' })).toBeEnabled()
  for (const item of additionalItems) expect(screen.getByRole('option', { name: item.title })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Download all available' }))
  await screen.findByRole('button', { name: 'Available banis downloaded' })
  expect(vi.mocked(downloadBani).mock.calls.map(call => call[0].key)).toEqual(additionalItems.map(item => item.key))
})

test('waits for current published availability before enabling any new download', async () => {
  let resolveCatalogue!: (keys: string[]) => void
  vi.mocked(fetchPublishedScriptureReadingKeys).mockImplementationOnce(() => new Promise(resolve => { resolveCatalogue = resolve }))
  render(<BaniDownloadsPanel items={items} />)
  expect(fetchPublishedScriptureReadingKeys).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Offline banis'))
  await screen.findByText('Checking available downloads…')
  expect(screen.getByRole('button', { name: 'Download bani' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Download all available' })).toBeDisabled()
  expect(screen.queryAllByRole('option')).toHaveLength(0)
  await act(async () => { resolveCatalogue(['shabados:ALHN']) })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download bani' })).toBeEnabled())
  expect(screen.getAllByRole('option')).toHaveLength(1)
  expect(screen.getByRole('option', { name: 'Alahnia' })).toBeInTheDocument()
})

test('keeps saved readings accessible after availability fails and retries metadata independently', async () => {
  saved = [info(sources[0])]
  vi.mocked(fetchPublishedScriptureReadingKeys).mockRejectedValueOnce(new Error('Network unavailable'))
  openPanel()
  await screen.findByText('Available downloads could not be checked. Your saved readings are still available below.')
  expect(screen.queryAllByRole('option')).toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Download bani' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Read: Rehras Sahib' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Remove download: Rehras Sahib' })).toBeEnabled()
  expect(screen.getByText('1 downloaded')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Check available downloads again' }))
  await screen.findByText('1 downloaded · 2 available to download')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(downloadBani).not.toHaveBeenCalled()
})

test('offers retry when the published catalogue stalls instead of checking forever', async () => {
  vi.mocked(fetchPublishedScriptureReadingKeys).mockImplementationOnce(signal => new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
  }))
  openPanel()
  await screen.findByText('Checking available downloads…')
  vi.useFakeTimers()
  try {
    // Reopening requests a fresh catalogue with a deadline under the test clock.
    fireEvent.click(screen.getByText('Offline banis'))
    vi.mocked(fetchPublishedScriptureReadingKeys).mockImplementationOnce(signal => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
    fireEvent.click(screen.getByText('Offline banis'))
    await act(async () => { await vi.advanceTimersByTimeAsync(30_001) })
    expect(screen.getByText('Available downloads could not be checked. Your saved readings are still available below.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check available downloads again' })).toBeEnabled()
    expect(screen.queryByText('Checking available downloads…')).not.toBeInTheDocument()
  } finally { vi.useRealTimers() }
})

test('retains saved readings on a first visit while offline without requesting metadata', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  saved = [info(sources[0])]
  openPanel()
  await screen.findByRole('button', { name: 'Read: Rehras Sahib' })
  expect(fetchPublishedScriptureReadingKeys).not.toHaveBeenCalled()
  expect(screen.getByText('1 downloaded')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download all available' })).toBeDisabled()
})

test('explains how to finish preparing the offline reader when its app shell is not ready', async () => {
  vi.mocked(downloadBani).mockRejectedValueOnce(new OfflineReaderShellError())
  openPanel()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download bani' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Download bani' }))
  await screen.findByText('Naamras is still preparing offline reading. Reconnect, close other Naamras tabs, reopen the app, and try again.')
  expect(screen.getByRole('button', { name: 'Retry download' })).toBeEnabled()
  expect(screen.queryByText('Download complete. These readings are ready offline.')).not.toBeInTheDocument()
})


test('keeps a download running across navigation and shows its result on return', async () => {
  let finish!: (value: BaniDownloadInfo) => void
  vi.mocked(downloadBani).mockImplementationOnce((_source, options) => new Promise(resolve => {
    finish = resolve
    expect(options?.signal?.aborted).toBe(false)
  }))
  const first = render(<BaniDownloadsPanel items={items} initiallyOpen />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download bani' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Download bani' }))
  await screen.findByRole('button', { name: 'Cancel download' })
  const signal = vi.mocked(downloadBani).mock.calls[0][1]?.signal
  first.unmount()
  expect(signal?.aborted).toBe(false)
  const second = render(<BaniDownloadsPanel items={items} initiallyOpen />)
  expect(screen.getByRole('button', { name: 'Cancel download' })).toBeInTheDocument()
  await act(async () => { saved = [info(sources[0])]; finish(saved[0]) })
  await screen.findByRole('button', { name: 'Read: Rehras Sahib' })
  expect(screen.getByText('Download complete. These readings are ready offline.')).toBeInTheDocument()
  second.unmount()
})

test('shows estimated text sizes before downloading and retains availability if estimates fail', async () => {
  vi.mocked(fetchPublishedScriptureSizes).mockResolvedValue({ 'banidb:21': 2048, 'shabados:ALHN': 1024 })
  openPanel()
  await screen.findByText('Estimated text size: 2 KB')
  expect(screen.getByText(/Download all available · Estimated text size: 3 KB/)).toBeInTheDocument()
  expect(downloadBani).not.toHaveBeenCalled()
})

test('bounds the saved preview and lets readers search all downloaded items', async () => {
  saved = Array.from({ length: 10 }, (_, i) => ({ ...info(sources[0]), key: `banidb:${i + 1}`, title: `Reading ${i + 1}` }))
  openPanel()
  await screen.findByText('10 downloaded · 2 available to download')
  expect(screen.getAllByRole('button', { name: /^Remove download:/ })).toHaveLength(6)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Reading 9' } })
  expect(screen.getAllByRole('button', { name: /^Remove download:/ })).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Remove download: Reading 9' })).toBeInTheDocument()
})
