import { beforeEach, expect, test, vi } from 'vitest'
import { shareHighlightHukamnamaAssetIds } from '../assets/share-highlights/manifest'
import { HOME_ARTWORK_COLLECTION_IDS, HOME_ARTWORK_STORAGE_KEY, getHomeArtworkId, normalizeHomeArtworkPreference, useHomeArtworkStore } from './homeArtwork'

beforeEach(() => {
  useHomeArtworkStore.setState({ mode: 'fixed', selectedId: 'eclipse', visitIndex: -1, pendingVisit: false, activeVisitToken: null, lastVisitToken: null })
  localStorage.clear()
})

test('defaults to Eclipse and exposes exactly the existing fourteen artwork IDs', () => {
  expect(getHomeArtworkId(useHomeArtworkStore.getState())).toBe('eclipse')
  expect(HOME_ARTWORK_COLLECTION_IDS).toEqual(shareHighlightHukamnamaAssetIds)
  expect(normalizeHomeArtworkPreference({ mode: 'invalid', selectedId: 'unknown' })).toEqual({ mode: 'fixed', selectedId: 'eclipse' })
})

test('daily rotation uses the local calendar and stays stable across a DST day', () => {
  const preference = { mode: 'daily' as const, selectedId: 'eclipse' }
  const morning = new Date(2026, 2, 8, 1)
  const evening = new Date(2026, 2, 8, 23)
  const tomorrow = new Date(2026, 2, 9, 1)
  const first = getHomeArtworkId(preference, morning)
  expect(getHomeArtworkId(preference, evening)).toBe(first)
  expect(getHomeArtworkId(preference, tomorrow)).toBe(HOME_ARTWORK_COLLECTION_IDS[(HOME_ARTWORK_COLLECTION_IDS.indexOf(first as typeof HOME_ARTWORK_COLLECTION_IDS[number]) + 1) % 14])
})

test('visit rotation changes once per new Home mount, including a Strict Mode effect replay', () => {
  useHomeArtworkStore.setState({ mode: 'visit' })
  const state = useHomeArtworkStore.getState()
  state.beginVisit('first')
  state.endVisit('first')
  state.beginVisit('first')
  expect(useHomeArtworkStore.getState().visitIndex).toBe(0)
  state.beginVisit('second')
  state.beginVisit('second')
  expect(useHomeArtworkStore.getState().visitIndex).toBe(1)
})

test('applying Each visit from More previews the same painting on the next Home visit', () => {
  useHomeArtworkStore.getState().applyPreferences({ mode: 'visit', selectedId: 'eclipse' })
  const before = getHomeArtworkId(useHomeArtworkStore.getState())
  useHomeArtworkStore.getState().beginVisit('home')
  expect(getHomeArtworkId(useHomeArtworkStore.getState())).toBe(before)
  expect(useHomeArtworkStore.getState().pendingVisit).toBe(false)
  useHomeArtworkStore.getState().endVisit('home')
  useHomeArtworkStore.getState().beginVisit('returned')
  expect(getHomeArtworkId(useHomeArtworkStore.getState())).not.toBe(before)
})

test('fixed artwork and rotation choice survive rehydration without persisting mount tokens', async () => {
  useHomeArtworkStore.getState().applyPreferences({ mode: 'fixed', selectedId: 'court-mural' })
  const stored = localStorage.getItem(HOME_ARTWORK_STORAGE_KEY)!
  expect(stored).not.toContain('VisitToken')
  expect(stored).not.toContain('applyRevision')
  expect(useHomeArtworkStore.getState().applyRevision).toBeGreaterThan(0)
  useHomeArtworkStore.setState({ selectedId: 'eclipse' })
  localStorage.setItem(HOME_ARTWORK_STORAGE_KEY, stored)
  await useHomeArtworkStore.persist.rehydrate()
  expect(getHomeArtworkId(useHomeArtworkStore.getState())).toBe('court-mural')
})

test('storage failure preserves a usable in-memory selection and reports it to the caller', () => {
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  expect(useHomeArtworkStore.getState().applyPreferences({ mode: 'fixed', selectedId: 'court-mural' })).toBe(false)
  expect(useHomeArtworkStore.getState().selectedId).toBe('court-mural')
  write.mockRestore()
})
