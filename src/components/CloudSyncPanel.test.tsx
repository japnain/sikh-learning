import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CloudSyncPanel from './CloudSyncPanel'
import { useActivityEventsStore } from '../store/activityEvents'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'
import type { CloudUserSummary } from '../insforge/types'

vi.mock('../insforge/runtime', () => ({
  signInWithProvider: vi.fn(),
  signOutOfCloud: vi.fn(),
  syncNow: vi.fn(),
}))

const READY_USER: CloudUserSummary = {
  id: 'user-1',
  email: 'simran@example.com',
  name: 'Simran',
  providers: ['google', 'apple'],
}

function getTopStatus() {
  const panel = screen.getByTestId('more-cloud-sync')
  const status = panel.querySelector('[data-ai-anchor="cloud-sync-status"]')
  if (!(status instanceof HTMLElement)) {
    throw new Error('Cloud sync top status badge was not rendered.')
  }
  return status
}

function getProviderCard(providerId: 'google' | 'apple' | 'github') {
  const panel = screen.getByTestId('more-cloud-sync')
  const card = panel.querySelector(`[data-ai-anchor="cloud-provider-${providerId}"]`)
  if (!(card instanceof HTMLElement)) {
    throw new Error(`Cloud sync provider card "${providerId}" was not rendered.`)
  }
  return card
}

function renderPanel(
  overrides: Partial<ReturnType<typeof useCloudSyncStore.getState>> = {},
  pendingEvents = 0
) {
  useCloudSyncStore.getState().reset()
  useCloudSyncStore.setState({
    configured: true,
    status: 'ready',
    currentUser: READY_USER,
    availableProviders: ['google', 'apple'],
    lastSyncedAt: '2026-04-17T14:00:00.000Z',
    lastError: null,
    syncQueued: false,
    ...overrides,
  })
  useActivityEventsStore.setState({
    pendingEvents: Array.from({ length: pendingEvents }, (_, index) => ({
      id: `event-${index + 1}`,
      userId: null,
      deviceId: 'device-1',
      eventType: 'saved-item.favorite.added',
      occurredAt: '2026-04-17T14:00:00.000Z',
      clientUpdatedAt: '2026-04-17T14:00:00.000Z',
      deletedAt: null,
      payload: {},
    })),
  })

  return render(<CloudSyncPanel />)
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useCloudSyncStore.getState().reset()
  useActivityEventsStore.setState({ pendingEvents: [] })
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
  })
})

describe('CloudSyncPanel truth model', () => {
  test('shows supported providers with a degraded runtime badge after bootstrap failure', () => {
    renderPanel({
      status: 'error',
      currentUser: null,
      lastError: 'Bootstrap failed',
    }, 2)

    expect(getTopStatus()).toHaveTextContent('Needs attention')
    expect(screen.getByText('Bootstrap failed')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    const googleCard = getProviderCard('google')
    expect(within(googleCard).getByText('Supported')).toBeInTheDocument()
    expect(within(googleCard).getByText('Needs attention')).toBeInTheDocument()
  })

  test('keeps configured signed-out providers aligned with the backup-optional badge', () => {
    renderPanel({
      status: 'signed-out',
      currentUser: null,
      lastSyncedAt: null,
    })

    expect(getTopStatus()).toHaveTextContent('Backup optional')

    const googleCard = getProviderCard('google')
    expect(within(googleCard).getByText('Supported')).toBeInTheDocument()
    expect(within(googleCard).getByText('Backup optional')).toBeInTheDocument()
  })

  test('shows ready provider rows from the same runtime truth as the top badge', () => {
    renderPanel()

    expect(getTopStatus()).toHaveTextContent('Cloud connected')
    expect(screen.getByText('Simran')).toBeInTheDocument()

    const googleCard = getProviderCard('google')
    expect(within(googleCard).getByText('Supported')).toBeInTheDocument()
    expect(within(googleCard).getByText('Cloud connected')).toBeInTheDocument()
  })

  test('shows syncing consistently across the top badge and provider rows', () => {
    renderPanel({
      status: 'syncing',
    })

    expect(getTopStatus()).toHaveTextContent('Syncing now')

    const googleCard = getProviderCard('google')
    expect(within(googleCard).getByText('Supported')).toBeInTheDocument()
    expect(within(googleCard).getByText('Syncing now')).toBeInTheDocument()
  })

  test('shows offline consistently across the top badge, notice, and provider rows', () => {
    renderPanel({
      status: 'offline',
    })

    expect(getTopStatus()).toHaveTextContent('Offline')
    expect(screen.getByText('You are offline. Local changes are still safe on this device.')).toBeInTheDocument()

    const googleCard = getProviderCard('google')
    expect(within(googleCard).getByText('Supported')).toBeInTheDocument()
    expect(within(googleCard).getByText('Offline')).toBeInTheDocument()
  })

  test('shows queued consistently across the top badge, notice, and provider rows', () => {
    renderPanel({
      syncQueued: true,
    }, 3)

    expect(getTopStatus()).toHaveTextContent('Sync queued')
    expect(screen.getByText('Changes are queued and will sync on the next successful connection.')).toBeInTheDocument()

    const googleCard = getProviderCard('google')
    expect(within(googleCard).getByText('Supported')).toBeInTheDocument()
    expect(within(googleCard).getByText('Sync queued')).toBeInTheDocument()
  })
})
