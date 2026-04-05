import { beforeEach, expect, test } from 'vitest'
import { useOnboardingStore } from './onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboardingStore.setState({
    hasCompletedOnboarding: false,
    learningLevel: 'beginner',
  })
})

test('completes onboarding with selected learning level', () => {
  useOnboardingStore.getState().completeOnboarding('familiar')

  const state = useOnboardingStore.getState()
  expect(state.hasCompletedOnboarding).toBe(true)
  expect(state.learningLevel).toBe('familiar')
})

test('can reset onboarding', () => {
  useOnboardingStore.getState().completeOnboarding('daily-reader')
  useOnboardingStore.getState().resetOnboarding()

  const state = useOnboardingStore.getState()
  expect(state.hasCompletedOnboarding).toBe(false)
  expect(state.learningLevel).toBe('beginner')
})
