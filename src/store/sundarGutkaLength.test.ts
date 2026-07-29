import { beforeEach, expect, test } from 'vitest'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from './sundarGutkaLength'

type PersistedSundarGutkaStore = typeof useSundarGutkaLengthStore & {
  persist: {
    rehydrate: () => Promise<void>
  }
}

const persistedStore = useSundarGutkaLengthStore as PersistedSundarGutkaStore

beforeEach(() => {
  localStorage.clear()
  useSundarGutkaLengthStore.setState({
    lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS },
  })
})

test('migrates legacy normalized Sundar Gutka lengths onto the current ordered bands', async () => {
  localStorage.setItem('sikh-sundar-gutka-lengths', JSON.stringify({
    state: {
      lengths: {
        'chaupai-sahib': 'medium',
        'rehras-sahib': 'long',
        aarti: 'short',
        'kirtan-sohila': 'extralong',
      },
    },
    version: 1,
  }))

  await persistedStore.persist.rehydrate()

  expect(useSundarGutkaLengthStore.getState().lengths).toEqual({
    ...DEFAULT_SUNDAR_GUTKA_LENGTHS,
    'chaupai-sahib': 'short',
    'rehras-sahib': 'long',
    aarti: 'medium',
    'kirtan-sohila': 'extralong',
  })

  useSundarGutkaLengthStore.getState().setLength('chaupai-sahib', 'long')
  expect(useSundarGutkaLengthStore.getState().lengths['chaupai-sahib']).toBe('long')

  useSundarGutkaLengthStore.getState().reset()
  expect(useSundarGutkaLengthStore.getState().lengths).toEqual(DEFAULT_SUNDAR_GUTKA_LENGTHS)
})
