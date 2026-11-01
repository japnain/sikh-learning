import { renderHook } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import { useContinueReadings } from './useContinueReadings'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useProgressStore } from '../store/progress'
import { useStoryStore } from '../store/stories'
import { useLocaleStore } from '../store/locale'

beforeEach(() => {
  useReadingPlacesStore.setState({ places: {} })
  useProgressStore.setState({ currentSession: null })
  useStoryStore.setState({ positions: {}, saved: {} })
  useLocaleStore.setState({ locale: 'en' })
})

test('includes a durable Rehat paragraph in Continue with its own reading identity', () => {
  const path = '/banis/rehat/1/chapters/11'
  useReadingPlacesStore.getState().remember({ scriptureId: 'rehat-1-11', resumePath: path, updatedAt: '2026-10-31T10:00:00Z',
    readerLocator: { href: path, type: 'text/html', revision: 'r1', title: 'Sikh Rehat Maryada · Daily Discipline',
      locations: { position: 4, progression: .4, totalProgression: .4, blockId: 'rehat-r1-seva-1' } } })
  const { result } = renderHook(useContinueReadings)
  expect(result.current).toEqual([{ id: 'rehat:1', title: 'Sikh Rehat Maryada · Daily Discipline', detail: 'Saved passage',
    path: `${path}#rehat-r1-seva-1`, updatedAt: '2026-10-31T10:00:00Z', kind: 'rehat' }])
})
