import { useCallback } from 'react'
import { GURMUKHI_LETTERS, GURMUKHI_VOWELS } from '../data/gurmukhi'
import { PROGRAM_MODULES } from '../data/learningCurriculum'
import type { MilestoneId } from '../types'
import { useLearningStore } from '../store/learning'
import { useVocabStore } from '../store/vocab'

const ALL_SYMBOL_COUNT = new Set(
  [...GURMUKHI_LETTERS, ...GURMUKHI_VOWELS].map(letter => letter.gurmukhi)
).size

function getCompletedModuleCount() {
  const { completedLessons, programProgress } = useLearningStore.getState()
  const allCompleted = new Set(completedLessons)

  Object.values(programProgress).forEach(progress => {
    progress.completedModuleIds.forEach(moduleId => allCompleted.add(moduleId))
  })

  return allCompleted
}

function getNextMilestoneId(): MilestoneId | null {
  const learningState = useLearningStore.getState()
  const vocabState = useVocabStore.getState()
  const earnedIds = new Set(learningState.earnedMilestoneIds)
  const completedModules = getCompletedModuleCount()
  const vocabCount = vocabState.vocab.length

  const checks: Array<[MilestoneId, boolean]> = [
    ['first-symbol-mastered', learningState.masteredSymbols.length >= 1],
    ['five-symbols-mastered', learningState.masteredSymbols.length >= 5],
    ['all-symbols-mastered', learningState.masteredSymbols.length >= ALL_SYMBOL_COUNT],
    ['first-module-complete', completedModules.size >= 1],
    ['program-1-complete', PROGRAM_MODULES['start-reading'].every(module => completedModules.has(module.id))],
    ['program-2-complete', PROGRAM_MODULES['build-fluency'].every(module => completedModules.has(module.id))],
    ['program-3-complete', PROGRAM_MODULES['understand-gurbani'].every(module => completedModules.has(module.id))],
    ['first-journey-complete', Object.values(learningState.journeys).some(progress => Boolean(progress.completedAt))],
    ['first-word-saved', vocabCount >= 1],
    ['ten-vocab-words', vocabCount >= 10],
    ['streak-7-days', learningState.practiceStreak >= 7],
    ['streak-30-days', learningState.practiceStreak >= 30],
    ['first-grammar-note-seen', learningState.grammarNotesSeen.length >= 1],
    ['first-theme-path-started', Object.keys(learningState.themePathProgress).length >= 1],
    ['first-word-family-mastered', learningState.masteredWordFamilyIds.length >= 1],
  ]

  const nextMilestone = checks.find(([id, condition]) => condition && !earnedIds.has(id))
  return nextMilestone?.[0] ?? null
}

export default function useMilestoneCheck() {
  const earnMilestone = useLearningStore(state => state.earnMilestone)

  return useCallback(() => {
    const { pendingMilestoneId } = useLearningStore.getState()
    if (pendingMilestoneId) return null

    const nextMilestoneId = getNextMilestoneId()
    if (!nextMilestoneId) return null

    earnMilestone(nextMilestoneId)
    return nextMilestoneId
  }, [earnMilestone])
}
