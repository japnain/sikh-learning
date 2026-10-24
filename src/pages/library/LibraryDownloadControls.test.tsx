import fs from 'node:fs'
import path from 'node:path'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import type { LibraryWork } from '../../types'
import * as repository from '../../data/libraryRepository'
import LibraryDownloadControls from './LibraryDownloadControls'

vi.mock('../../data/libraryRepository', async importOriginal => ({
  ...await importOriginal<typeof import('../../data/libraryRepository')>(),
  downloadLibraryWork: vi.fn(),
  getLibraryDownloadStatus: vi.fn(),
  removeDownloadedLibraryWork: vi.fn(),
}))
const work = (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/library/works.json'), 'utf8')) as LibraryWork[])[0]
const ready = { workId: work.id, revision: work.revision!, downloaded: 81, total: 169, volumes: [{ volume: 1, downloaded: 81, total: 81 }, { volume: 2, downloaded: 0, total: 88 }] }

beforeEach(() => {
  vi.mocked(repository.getLibraryDownloadStatus).mockReset().mockResolvedValue(null)
  vi.mocked(repository.downloadLibraryWork).mockReset()
  vi.mocked(repository.removeDownloadedLibraryWork).mockReset().mockResolvedValue(undefined)
})

test('reports readiness only after durable verification, then supports removal without touching bookmarks', async () => {
  const user = userEvent.setup()
  let finish: (() => void) | undefined
  vi.mocked(repository.downloadLibraryWork).mockImplementation(async (_id, options) => {
    options?.onProgress?.(1, 81)
    await new Promise<void>(resolve => { finish = resolve })
  })
  render(<LibraryDownloadControls work={work} />)
  await user.click(screen.getByRole('button', { name: 'Download volume 1' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  expect(screen.queryByText('Ready offline')).toBeNull()
  vi.mocked(repository.getLibraryDownloadStatus).mockResolvedValue(ready)
  await act(async () => finish?.())
  expect(await screen.findByText('Ready offline')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Volume 1 is ready to read offline.')
  await user.click(screen.getByRole('button', { name: 'Remove download' }))
  await waitFor(() => expect(repository.removeDownloadedLibraryWork).toHaveBeenCalledWith(work.id))
  expect(screen.getByRole('status')).toHaveTextContent('Your bookmarks and reading place are kept.')
})

test('a storage failure is actionable and never announces a successful download', async () => {
  const user = userEvent.setup()
  vi.mocked(repository.downloadLibraryWork).mockRejectedValue(new Error('Free some device storage and try again.'))
  render(<LibraryDownloadControls work={work} />)
  await user.click(screen.getByRole('button', { name: 'Download complete book' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/device storage/i)
  expect(screen.queryByText('Ready offline')).toBeNull()
  expect(screen.getByRole('button', { name: 'Download complete book' })).toBeEnabled()
})

test('cancel interrupts the active download and retains the previous verified volume', async () => {
  const user = userEvent.setup()
  vi.mocked(repository.getLibraryDownloadStatus).mockResolvedValue(ready)
  vi.mocked(repository.downloadLibraryWork).mockImplementation((_id, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')))
  }))
  render(<LibraryDownloadControls work={work} />)
  await screen.findByText('Ready offline')
  await user.click(screen.getByRole('button', { name: 'Download complete book' }))
  await user.click(screen.getByRole('button', { name: 'Cancel download' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Download cancelled.'))
  expect(screen.getByText('Ready offline')).toBeInTheDocument()
})
