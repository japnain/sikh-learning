import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { useBookmarksStore } from '../store/bookmarks'
import { useCloudSyncStore } from '../store/cloudSync'
import { useFavoritesStore } from '../store/favorites'
import { useSupabaseBootstrap } from './useSupabaseBootstrap'

const bootstrapMocks = vi.hoisted(() => ({
  cloudEnabled: false,
  bootstrapCloudSync: vi.fn(),
}))

vi.mock('../supabase/config', () => ({
  getNaamrasSupabaseConfig: () => ({
    enabled: bootstrapMocks.cloudEnabled,
  }),
}))

vi.mock('../supabase/runtime', () => ({
  bootstrapCloudSync: bootstrapMocks.bootstrapCloudSync,
}))

beforeEach(() => {
  localStorage.clear()
  bootstrapMocks.cloudEnabled = false
  bootstrapMocks.bootstrapCloudSync.mockReset()
  bootstrapMocks.bootstrapCloudSync.mockResolvedValue(undefined)
  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useCloudSyncStore.getState().reset()
})

test('hydrates validated local bookmarks and favorites without loading cloud sync in a local-only build', async () => {
  localStorage.setItem('sikh-bookmarks', JSON.stringify([{
    id: 'bookmark-local',
    type: 'verse',
    title: 'Local verse',
    source: 'G',
    ang: 1,
    verseId: 101,
    savedAt: '2026-07-29T12:00:00.000Z',
  }]))
  localStorage.setItem('sikh-favorites', JSON.stringify({ state: { favorites: [{
    id: 'favorite-local',
    type: 'shabad',
    title: 'Local favorite',
    source: 'G',
    ang: 1,
    shabadId: 10,
    savedAt: '2026-07-29T12:00:00.000Z',
  }] } }))

  renderHook(() => useSupabaseBootstrap())

  await waitFor(() => {
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
    expect(useFavoritesStore.getState().favorites).toEqual([
      expect.objectContaining({ id: 'favorite-local', routeMode: 'shabad' }),
    ])
  })
  expect(bootstrapMocks.bootstrapCloudSync).not.toHaveBeenCalled()
})

test('loads the cloud runtime only when cloud sync is configured', async () => {
  bootstrapMocks.cloudEnabled = true

  renderHook(() => useSupabaseBootstrap())

  await waitFor(() => {
    expect(bootstrapMocks.bootstrapCloudSync).toHaveBeenCalledOnce()
  })
})

test('surfaces a recoverable local-first state when the lazy cloud runtime fails', async () => {
  bootstrapMocks.cloudEnabled = true
  bootstrapMocks.bootstrapCloudSync.mockRejectedValueOnce(new Error('chunk unavailable'))

  renderHook(() => useSupabaseBootstrap())

  await waitFor(() => {
    expect(useCloudSyncStore.getState()).toMatchObject({
      configured: true,
      status: 'error',
      lastError: expect.stringMatching(/keep reading on this device/i),
    })
  })
})
