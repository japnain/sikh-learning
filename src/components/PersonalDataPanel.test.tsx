import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import PersonalDataPanel from './PersonalDataPanel'
import { useLocaleStore } from '../store/locale'

const mock = vi.hoisted(() => ({ parse: vi.fn(), restore: vi.fn(), create: vi.fn() }))
vi.mock('../utils/personalDataBackup', () => ({
  PERSONAL_BACKUP_MAX_BYTES: 16 * 1024 * 1024,
  parsePersonalDataBackup: mock.parse,
  createPersonalDataBackup: mock.create,
  restorePersonalDataBackup: mock.restore,
  summarizePersonalDataBackup: () => ({ bookmarks: 2, favorites: 1, words: 3, stories: 4, readingPlaces: 5, nitnemEvents: 6 }),
}))
const backup = { format: 'naamras-personal-data', version: 1, createdAt: '2026-10-20T10:00:00.000Z', data: {} }
function upload() {
  const file = new File(['backup'], 'naamras-backup.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => 'backup' })
  fireEvent.change(screen.getByLabelText('Restore from a file'), { target: { files: [file] } })
}
beforeEach(() => {
  vi.clearAllMocks()
  useLocaleStore.getState().setLocale('en')
  mock.parse.mockReturnValue(backup)
  mock.restore.mockResolvedValue(backup)
  mock.create.mockReturnValue(backup)
})

describe('personal backup controls', () => {
  it('shows an import preview and does not change data before explicit restore', async () => {
    render(<PersonalDataPanel />)
    upload()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('radio', { name: /Merge with this device/ })).toBeChecked()
    expect(within(dialog).getByText('Nitnem records')).toBeInTheDocument()
    expect(mock.restore).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.restore).not.toHaveBeenCalled()
  })

  it('restores only the chosen replace mode and reports completion', async () => {
    render(<PersonalDataPanel />)
    upload()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: /Replace this device/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore backup' }))
    await waitFor(() => expect(mock.restore).toHaveBeenCalledWith(backup, 'replace'))
    expect(await screen.findByText('Your backup has been restored.')).toBeInTheDocument()
  })

  it('rejects invalid files without opening a destructive flow', async () => {
    mock.parse.mockImplementation(() => { throw new Error('bad format') })
    render(<PersonalDataPanel />)
    upload()
    expect(await screen.findByText(/Nothing was changed/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mock.restore).not.toHaveBeenCalled()
  })

  it('leaves a failed restore preview available for retry', async () => {
    mock.restore.mockRejectedValue(new Error('restore-failed'))
    render(<PersonalDataPanel />)
    upload()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore backup' }))
    expect(await within(dialog).findByText(/Your previous data was kept/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Restore backup' })).toBeEnabled()
  })

  it.each(['pa', 'hi'] as const)('localizes the recovery controls in %s', locale => {
    useLocaleStore.getState().setLocale(locale)
    render(<PersonalDataPanel />)
    expect(screen.queryByText('Download backup')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByTestId('personal-data-panel')).toHaveTextContent(locale === 'pa' ? 'ਬੈਕਅੱਪ ਡਾਊਨਲੋਡ ਕਰੋ' : 'बैकअप डाउनलोड करें')
  })
})
