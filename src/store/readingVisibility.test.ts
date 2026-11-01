import { beforeEach, expect, test } from 'vitest'
import { useReadingVisibilityStore } from './readingVisibility'

beforeEach(() => {
  localStorage.clear()
  useReadingVisibilityStore.setState({ hidden: {} })
})

test('persists hidden revisions and can restore an individual place or all places', async () => {
  const state = useReadingVisibilityStore.getState()
  state.hide('story:first', '2026-10-31T12:00:00Z')
  state.hide('source:G', '2026-10-30T12:00:00Z')
  const persisted = localStorage.getItem('naamras-reading-visibility')!
  useReadingVisibilityStore.setState({ hidden: {} })
  localStorage.setItem('naamras-reading-visibility', persisted)
  await useReadingVisibilityStore.persist.rehydrate()
  expect(Object.keys(useReadingVisibilityStore.getState().hidden)).toHaveLength(2)
  state.restore('story:first')
  expect(useReadingVisibilityStore.getState().hidden).toEqual({ 'source:G': '2026-10-30T12:00:00Z' })
  state.restoreAll()
  expect(useReadingVisibilityStore.getState().hidden).toEqual({})
})

test('ignores invalid persisted entries', async () => {
  localStorage.setItem('naamras-reading-visibility', JSON.stringify({ version: 1, state: { hidden: { good: '2026-10-31T12:00:00Z', invalid: 'x', broken: {} } } }))
  await useReadingVisibilityStore.persist.rehydrate()
  expect(useReadingVisibilityStore.getState().hidden).toEqual({ good: '2026-10-31T12:00:00Z' })
})
