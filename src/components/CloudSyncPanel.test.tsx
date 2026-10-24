import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CloudSyncPanel from './CloudSyncPanel'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'
import type { CloudUserSummary } from '../supabase/types'
import { deleteCloudAccount, sendMagicLink, signOutOfCloud, syncNow } from '../supabase/runtime'

vi.mock('../supabase/runtime', () => ({
  deleteCloudAccount: vi.fn(), sendMagicLink: vi.fn(), signInWithProvider: vi.fn(), signOutOfCloud: vi.fn(), syncNow: vi.fn(),
}))

const READY_USER: CloudUserSummary = { id: 'user-1', email: 'simran@example.com', name: 'Simran', providers: ['apple', 'email'] }
function renderPanel(overrides: Partial<ReturnType<typeof useCloudSyncStore.getState>> = {}) {
  useCloudSyncStore.setState({
    configured: true, status: 'ready', currentUser: READY_USER, availableProviders: ['apple', 'email'],
    lastSyncedAt: '2026-04-17T14:00:00.000Z', lastError: null, syncQueued: false, ...overrides,
  })
  const view = render(<CloudSyncPanel />)
  fireEvent.click(screen.getByRole('button', { expanded: false }))
  return view
}
function statusLabel() {
  return screen.getByTestId('more-cloud-sync').querySelector('[data-ai-anchor="cloud-sync-status"]')
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.removeItem('naamras-ui-disclosure')
  useLocaleStore.setState({ locale: 'en' })
  useCloudSyncStore.getState().reset()
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
})

describe('CloudSyncPanel reader-facing backup states', () => {
  test('explains device-only storage and portable recovery without unavailable account controls', () => {
    renderPanel({ configured: false, status: 'idle', currentUser: null, lastSyncedAt: null })
    expect(screen.getByRole('heading', { name: 'Your reading stays on this device.' })).toBeInTheDocument()
    expect(statusLabel()).toHaveTextContent('On this device')
    expect(screen.getByText(/Clearing app or site data removes them/)).toBeInTheDocument()
    expect(screen.getByText(/Keep a backup file to make your reading data recoverable/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign.in|sync now/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('more-cloud-sync')).not.toHaveTextContent(/Supabase|BaniDB|environment variables|proxy|merge replay|Not backed up yet|No changes waiting/i)
  })

  test('explains exactly what cloud covers and what still needs a full file backup', () => {
    renderPanel()
    expect(statusLabel()).toHaveTextContent('Connected')
    expect(screen.getByText('Simran')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Included in cloud backup' })).toBeInTheDocument()
    expect(screen.getByText(/current day’s completions/)).toBeInTheDocument()
    expect(screen.getByText(/Story saves and reading places, earlier Nitnem history/)).toBeInTheDocument()
    expect(screen.getByText(/Downloaded reading content is separate/)).toBeInTheDocument()
  })

  test('shows localized recovery text instead of raw infrastructure errors', () => {
    useLocaleStore.setState({ locale: 'hi' })
    renderPanel({ status: 'error', currentUser: null, lastError: 'Supabase HTTP 500 bootstrap failed' })
    expect(screen.getByTestId('more-cloud-sync')).toHaveAttribute('lang', 'hi')
    expect(screen.getByTestId('more-cloud-sync')).toHaveAttribute('data-ai-state', 'degraded')
    expect(screen.getByTestId('more-cloud-sync')).toHaveAttribute('data-ai-error', 'supabase-bootstrap')
    expect(statusLabel()).toHaveTextContent('ध्यान चाहिए')
    expect(screen.getByRole('alert')).toHaveTextContent('अभी साइन इन उपलब्ध नहीं है')
    expect(screen.queryByText(/Supabase HTTP/)).not.toBeInTheDocument()
  })

  test.each([
    ['pa', 'ਇਸ ਡਿਵਾਈਸ ਤੇ', 'ਤੁਹਾਡੀ ਪੜ੍ਹਾਈ ਇਸ ਡਿਵਾਈਸ ਤੇ ਰਹਿੰਦੀ ਹੈ।'],
    ['hi', 'इस डिवाइस पर', 'आपकी पढ़ाई इसी डिवाइस पर रहती है।'],
  ] as const)('localizes the entire device-only panel in %s', (locale, badge, heading) => {
    useLocaleStore.setState({ locale })
    renderPanel({ configured: false, currentUser: null, status: 'idle' })
    expect(statusLabel()).toHaveTextContent(badge)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByTestId('more-cloud-sync')).not.toHaveTextContent(/Cloud|Backup|reading|guest|Supabase|Scripture|Local only|Not backed/i)
  })

  test('labels email accessibly and treats a successfully sent link as information', async () => {
    vi.mocked(sendMagicLink).mockResolvedValue({ ok: true })
    renderPanel({ status: 'signed-out', currentUser: null, lastSyncedAt: null })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'simran@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Email a sign-in link' }).closest('form')!)
    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledWith('simran@example.com'))
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email for your sign-in link')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(statusLabel()).toHaveTextContent('Optional')
  })

  test('presents a failed email action as a retryable error', async () => {
    vi.mocked(sendMagicLink).mockRejectedValue(new Error('network error'))
    renderPanel({ status: 'signed-out', currentUser: null })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'simran@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Email a sign-in link' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in is unavailable right now')
    expect(screen.getByRole('button', { name: 'Email a sign-in link' })).toBeEnabled()
    expect(screen.queryByText('network error')).not.toBeInTheDocument()
  })

  test('keeps sign-out available while a sync is in flight', async () => {
    vi.mocked(signOutOfCloud).mockResolvedValue({ ok: true })
    renderPanel({ status: 'syncing' })
    expect(statusLabel()).toHaveTextContent('Syncing')
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(signOutOfCloud).toHaveBeenCalledTimes(1))
  })

  test('describes queued and offline changes without claiming completed backup', () => {
    renderPanel({ status: 'offline', syncQueued: true, lastSyncedAt: null })
    expect(statusLabel()).toHaveTextContent('Offline')
    expect(screen.getByText(/cloud backup will resume when you reconnect/)).toBeInTheDocument()
    expect(screen.getByText('No completed sync yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled()
    expect(syncNow).not.toHaveBeenCalled()
  })

  test('requires an explicit confirmation to delete a connected account', async () => {
    vi.mocked(deleteCloudAccount).mockResolvedValue({ ok: true })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Delete cloud account' }))
    const dialog = screen.getByTestId('cloud-delete-account-dialog')
    expect(dialog).toHaveTextContent('all synced NaamRas data will be permanently deleted')
    expect(dialog).toHaveTextContent('Reading data on this device stays available')
    expect(deleteCloudAccount).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('cloud-delete-account-confirm'))
    await waitFor(() => expect(screen.queryByTestId('cloud-delete-account-dialog')).not.toBeInTheDocument())
    expect(deleteCloudAccount).toHaveBeenCalledTimes(1)
  })

  test('keeps a failed account deletion retryable', async () => {
    vi.mocked(deleteCloudAccount).mockRejectedValue(new Error('offline'))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Delete cloud account' }))
    fireEvent.click(screen.getByTestId('cloud-delete-account-confirm'))
    await waitFor(() => expect(screen.getByTestId('cloud-delete-account-confirm')).toBeEnabled())
    expect(screen.getByTestId('cloud-delete-account-dialog')).toHaveTextContent('The account change could not be completed')
  })
})
