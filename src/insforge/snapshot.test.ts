import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CloudLearningProgressScope, CloudLocalSnapshot } from './types'

function getLearningRecord(snapshot: CloudLocalSnapshot, scope: CloudLearningProgressScope) {
  const record = snapshot.learningProgress.find(item => item.scope === scope)
  if (!record) {
    throw new Error(`Missing learning progress record for ${scope}`)
  }
  return record
}

async function loadSnapshotModules() {
  vi.resetModules()
  const snapshotModule = await import('./snapshot')
  const { useThemeStore } = await import('../store/theme')
  const { useLearningStore } = await import('../store/learning')

  return {
    exportLocalSnapshot: snapshotModule.exportLocalSnapshot,
    useThemeStore,
    useLearningStore,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('exportLocalSnapshot', () => {
  it('preserves profile and learning timestamps when nothing changed', async () => {
    const { exportLocalSnapshot } = await loadSnapshotModules()

    vi.setSystemTime(new Date('2026-01-01T08:00:00.000Z'))
    const firstSnapshot = exportLocalSnapshot()

    vi.setSystemTime(new Date('2026-01-02T09:00:00.000Z'))
    const secondSnapshot = exportLocalSnapshot()

    expect(secondSnapshot.profile.clientUpdatedAt).toBe(firstSnapshot.profile.clientUpdatedAt)
    expect(getLearningRecord(secondSnapshot, 'learning-state').clientUpdatedAt)
      .toBe(getLearningRecord(firstSnapshot, 'learning-state').clientUpdatedAt)
  })

  it('updates only the timestamps for records whose payload changed', async () => {
    const { exportLocalSnapshot, useLearningStore } = await loadSnapshotModules()

    vi.setSystemTime(new Date('2026-01-01T08:00:00.000Z'))
    const firstSnapshot = exportLocalSnapshot()

    vi.setSystemTime(new Date('2026-01-03T10:00:00.000Z'))
    useLearningStore.setState(state => ({
      totalPracticeSessions: state.totalPracticeSessions + 1,
    }))
    const secondSnapshot = exportLocalSnapshot()

    expect(secondSnapshot.profile.clientUpdatedAt).toBe(firstSnapshot.profile.clientUpdatedAt)
    expect(getLearningRecord(secondSnapshot, 'learning-state').clientUpdatedAt)
      .not.toBe(getLearningRecord(firstSnapshot, 'learning-state').clientUpdatedAt)
  })

  it('advances the profile timestamp when profile preferences change', async () => {
    const { exportLocalSnapshot, useThemeStore } = await loadSnapshotModules()

    vi.setSystemTime(new Date('2026-01-01T08:00:00.000Z'))
    const firstSnapshot = exportLocalSnapshot()

    vi.setSystemTime(new Date('2026-01-04T12:30:00.000Z'))
    useThemeStore.setState({ dark: !useThemeStore.getState().dark })
    const secondSnapshot = exportLocalSnapshot()

    expect(secondSnapshot.profile.clientUpdatedAt).not.toBe(firstSnapshot.profile.clientUpdatedAt)
    expect(getLearningRecord(secondSnapshot, 'learning-state').clientUpdatedAt)
      .toBe(getLearningRecord(firstSnapshot, 'learning-state').clientUpdatedAt)
  })
})
