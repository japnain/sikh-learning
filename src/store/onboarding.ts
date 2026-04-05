import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LearningLevel } from '../types'

interface OnboardingState {
  hasCompletedOnboarding: boolean
  learningLevel: LearningLevel
  completeOnboarding: (learningLevel: LearningLevel) => void
  setLearningLevel: (learningLevel: LearningLevel) => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      learningLevel: 'beginner',
      completeOnboarding: (learningLevel) => set({
        hasCompletedOnboarding: true,
        learningLevel,
      }),
      setLearningLevel: (learningLevel) => set({ learningLevel }),
      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        learningLevel: 'beginner',
      }),
    }),
    { name: 'sikh-onboarding' }
  )
)
