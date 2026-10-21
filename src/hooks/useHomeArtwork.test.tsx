import { StrictMode, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import { useHomeArtworkStore } from '../store/homeArtwork'
import { useHomeArtwork } from './useHomeArtwork'

beforeEach(() => {
  useHomeArtworkStore.setState({ mode: 'visit', selectedId: 'eclipse', visitIndex: -1, pendingVisit: false, activeVisitToken: null, lastVisitToken: null, applyRevision: 0 })
})

test('Strict Mode and rerendering do not advance Each visit', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
  const first = renderHook(() => useHomeArtwork(), { wrapper })
  expect(useHomeArtworkStore.getState().visitIndex).toBe(0)
  first.rerender()
  expect(useHomeArtworkStore.getState().visitIndex).toBe(0)
  first.unmount()
  const second = renderHook(() => useHomeArtwork(), { wrapper })
  expect(useHomeArtworkStore.getState().visitIndex).toBe(1)
  second.unmount()
})

test('explicitly applying the same artwork retries a failed Home image without advancing rotation', async () => {
  useHomeArtworkStore.setState({ mode: 'fixed', selectedId: 'court-mural' })
  const view = renderHook(() => useHomeArtwork())
  await waitFor(() => expect(view.result.current.asset.id).toBe('court-mural'))
  expect(view.result.current.imageStyle).toMatchObject({ objectFit: 'contain', objectPosition: '50% 50%' })
  const firstImageKey = view.result.current.imageKey
  act(() => view.result.current.onImageError())
  expect(view.result.current.asset.id).toBe('eclipse')
  expect(view.result.current.imageStyle).toMatchObject({ objectFit: 'contain', objectPosition: '50% 50%' })
  const index = useHomeArtworkStore.getState().visitIndex
  act(() => { useHomeArtworkStore.getState().applyPreferences({ mode: 'fixed', selectedId: 'court-mural' }) })
  await waitFor(() => expect(view.result.current.asset.id).toBe('court-mural'))
  expect(view.result.current.imageKey).not.toBe(firstImageKey)
  expect(view.result.current.imageStyle).toMatchObject({ objectFit: 'contain', objectPosition: '50% 50%' })
  expect(useHomeArtworkStore.getState().visitIndex).toBe(index)
})
