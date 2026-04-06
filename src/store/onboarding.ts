import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LearningGoal, LearningLevel, OnboardingAudience } from '../types'

interface OnboardingState {
  hasCompletedOnboarding: boolean
  isOnboardingOpen: boolean
  learningLevel: LearningLevel
  audience: OnboardingAudience
  learningGoal: LearningGoal
  completeOnboarding: (learningLevel: LearningLevel) => void
  setLearningLevel: (learningLevel: LearningLevel) => void
  setAudience: (audience: OnboardingAudience) => void
  setLearningGoal: (goal: LearningGoal) => void
  openOnboarding: () => void
  closeOnboarding: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isOnboardingOpen: true,
      learningLevel: 'beginner',
      audience: 'adult',
      learningGoal: 'read',
      completeOnboarding: (learningLevel) => set({
        hasCompletedOnboarding: true,
        isOnboardingOpen: false,
        learningLevel,
      }),
      setLearningLevel: (learningLevel) => set({ learningLevel }),
      setAudience: (audience) => set({ audience }),
      setLearningGoal: (learningGoal) => set({ learningGoal }),
      openOnboarding: () => set({ isOnboardingOpen: true }),
      closeOnboarding: () => set({ isOnboardingOpen: false }),
      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        isOnboardingOpen: true,
        learningLevel: 'beginner',
        audience: 'adult',
        learningGoal: 'read',
      }),
    }),
    { name: 'sikh-onboarding' }
  )
)
