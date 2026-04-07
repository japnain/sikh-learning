import { beforeEach, expect, test } from 'vitest'
import { useOnboardingStore } from './onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboardingStore.setState({
    hasCompletedOnboarding: false,
    isOnboardingOpen: true,
    presentationMode: 'first-run',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
})

test('completes onboarding with selected learning level', () => {
  useOnboardingStore.getState().completeOnboarding('familiar')

  const state = useOnboardingStore.getState()
  expect(state.hasCompletedOnboarding).toBe(true)
  expect(state.isOnboardingOpen).toBe(false)
  expect(state.presentationMode).toBe('overlay')
  expect(state.learningLevel).toBe('familiar')
})

test('can reset onboarding', () => {
  useOnboardingStore.getState().completeOnboarding('daily-reader')
  useOnboardingStore.getState().resetOnboarding()

  const state = useOnboardingStore.getState()
  expect(state.hasCompletedOnboarding).toBe(false)
  expect(state.isOnboardingOpen).toBe(true)
  expect(state.presentationMode).toBe('first-run')
  expect(state.learningLevel).toBe('beginner')
})

test('can reopen onboarding without resetting the profile', () => {
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'daily-reader',
    audience: 'teen',
    learningGoal: 'understand',
  })

  useOnboardingStore.getState().openOnboarding()

  const state = useOnboardingStore.getState()
  expect(state.hasCompletedOnboarding).toBe(true)
  expect(state.isOnboardingOpen).toBe(true)
  expect(state.presentationMode).toBe('overlay')
  expect(state.learningLevel).toBe('daily-reader')
  expect(state.audience).toBe('teen')
  expect(state.learningGoal).toBe('understand')
})
