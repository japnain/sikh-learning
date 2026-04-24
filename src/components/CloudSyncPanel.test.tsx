import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

function getPanelAnchor(anchor: string) {
  const panel = screen.getByTestId('more-cloud-sync')
  const element = panel.querySelector(`[data-ai-anchor="${anchor}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Cloud sync anchor "${anchor}" was not rendered.`)
  }
  return element
}

function getTopStatus() {
  return getPanelAnchor('cloud-sync-status')
}

function getProviderCard(providerId: 'google' | 'apple' | 'github') {
  const card = getPanelAnchor(`cloud-provider-${providerId}`)
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

  const view = render(<CloudSyncPanel />)
  fireEvent.click(screen.getByRole('button', { name: /keep naamras with you across devices/i }))
  return view
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
  test('surfaces guest bootstrap failures as a degraded bootstrap state while preserving the notice text', () => {
    renderPanel({
      status: 'error',
      currentUser: null,
      lastError: 'Bootstrap failed',
    }, 2)

    expect(screen.getByTestId('more-cloud-sync')).toHaveAttribute('data-ai-state', 'degraded')
    expect(screen.getByTestId('more-cloud-sync')).toHaveAttribute('data-ai-error', 'insforge-bootstrap')
    expect(getTopStatus()).toHaveTextContent('Needs attention')
    expect(screen.getByText('Bootstrap failed')).toBeInTheDocument()
    expect(getPanelAnchor('cloud-sync-pending')).toHaveTextContent('2')

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
