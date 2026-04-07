import { useCallback, useMemo } from 'react'
import { PROGRAM_MODULES } from '../data/learningCurriculum'
import type {
  DailyLesson,
  DailyLessonStep,
  LearnModule,
  LearnProgramId,
  VocabEntry,
} from '../types'
import { useLearningStore } from '../store/learning'
import { useVocabStore } from '../store/vocab'
import { toLocalDayStamp } from '../utils/learnDates'

const PROGRAM_ORDER: LearnProgramId[] = [
  'start-reading',
  'build-fluency',
  'understand-gurbani',
  'deep-study',
]

function getProgramRank(programId: LearnProgramId): number {
  return PROGRAM_ORDER.indexOf(programId)
}

function getAllCompletedIds(state: Pick<DailyLessonSourceState, 'completedLessons' | 'programProgress'>) {
  const completedIds = new Set(state.completedLessons)

  Object.values(state.programProgress ?? {}).forEach(progress => {
    progress.completedModuleIds.forEach(moduleId => completedIds.add(moduleId))
  })

  return completedIds
}

type DailyLessonSourceState = {
  completedLessons: string[]
  activeProgramId: LearnProgramId
  programProgress: Record<LearnProgramId, { completedModuleIds: string[] }>
}

function getNextUnlockedModules(
  programId: LearnProgramId,
  completedIds: Set<string>,
  predicate?: (module: LearnModule) => boolean
) {
  return PROGRAM_MODULES[programId].filter(module => {
    if (completedIds.has(module.id)) return false
    if (!module.prerequisiteIds.every(prerequisite => completedIds.has(prerequisite))) return false
    return predicate ? predicate(module) : true
  })
}

function getNextRelevantModules(completedIds: Set<string>, predicate?: (module: LearnModule) => boolean) {
  return PROGRAM_ORDER.flatMap(programId => getNextUnlockedModules(programId, completedIds, predicate))
}

function getQuickConnectModule(activeProgramId: LearnProgramId, completedIds: Set<string>): LearnModule | null {
  const inProgram = getNextUnlockedModules(
    activeProgramId,
    completedIds,
    module => Boolean(module.scriptText && module.transliteration && module.meaning)
  )

  if (inProgram.length > 0) return inProgram[0] ?? null

  return getNextRelevantModules(
    completedIds,
    module => Boolean(module.scriptText && module.transliteration && module.meaning)
  )[0] ?? null
}

function createVocabReviewStep(today: string, vocab: VocabEntry[]): DailyLessonStep | null {
  const dueWords = vocab
    .filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= Date.now())
    .slice(0, 5)

  if (dueWords.length === 0) return null

  return {
    id: `vocab-review:${today}`,
    kind: 'vocab-review',
    title: 'Review due vocabulary',
    body: 'Clear the words that are already due before adding more new material.',
    estimatedSeconds: Math.min(240, Math.max(120, dueWords.length * 45)),
    vocabWords: dueWords.map(entry => entry.word),
  }
}

function buildDailyLesson(
  learningState: DailyLessonSourceState,
  vocab: VocabEntry[],
  today: string
): DailyLesson {
  const completedIds = getAllCompletedIds(learningState)
  const activeProgramId = learningState.activeProgramId ?? 'start-reading'
  const steps: DailyLessonStep[] = []

  const vocabStep = createVocabReviewStep(today, vocab)
  if (vocabStep) {
    steps.push(vocabStep)
  }

  const nextCoreModules = getNextUnlockedModules(
    activeProgramId,
    completedIds,
    module => module.type !== 'grammar' && module.type !== 'word-family'
  ).slice(0, 2)

  if (nextCoreModules.length === 0) {
    const fallbackModule = getNextRelevantModules(
      completedIds,
      module => module.type !== 'grammar' && module.type !== 'word-family'
    )[0]

    if (fallbackModule) {
      nextCoreModules.push(fallbackModule)
    }
  }

  nextCoreModules.forEach((module, index) => {
    steps.push({
      id: `module:${module.id}:${today}`,
      kind: 'module',
      title: index === 0 ? `Continue ${module.title}` : `Keep going with ${module.title}`,
      body: module.summary,
      estimatedSeconds: Math.min(210, Math.max(120, module.estimatedMinutes * 60)),
      moduleId: module.id,
    })
  })

  const quickConnectModule = getQuickConnectModule(activeProgramId, completedIds)
  if (quickConnectModule?.scriptText && quickConnectModule.transliteration && quickConnectModule.meaning) {
    steps.push({
      id: `quick-connect:${quickConnectModule.id}:${today}`,
      kind: 'quick-connect',
      title: `Quick connect: ${quickConnectModule.title}`,
      body: 'Touch one real Gurbani line before you leave Learn today.',
      estimatedSeconds: 90,
      moduleId: quickConnectModule.id,
      source: quickConnectModule.source,
      ang: quickConnectModule.ang,
      baniTitle: quickConnectModule.scriptureAnchor,
      gurmukhi: quickConnectModule.scriptText,
      transliteration: quickConnectModule.transliteration,
      meaning: quickConnectModule.meaning,
    })
  }

  const depthUnlocked = getProgramRank(activeProgramId) >= getProgramRank('understand-gurbani')
    || PROGRAM_MODULES['understand-gurbani'].some(module => completedIds.has(module.id))
    || PROGRAM_MODULES['deep-study'].some(module => completedIds.has(module.id))

  if (depthUnlocked) {
    const grammarModule = getNextRelevantModules(
      completedIds,
      module => module.type === 'grammar'
    )[0]

    if (grammarModule?.grammarNoteId) {
      steps.push({
        id: `grammar-note:${grammarModule.grammarNoteId}:${today}`,
        kind: 'grammar-note',
        title: grammarModule.title,
        body: grammarModule.grammarPattern ?? grammarModule.summary,
        estimatedSeconds: 120,
        moduleId: grammarModule.id,
        grammarNoteId: grammarModule.grammarNoteId,
      })
    }

    const wordFamilyModule = getNextRelevantModules(
      completedIds,
      module => module.type === 'word-family'
    )[0]

    if (wordFamilyModule?.wordFamilyId) {
      steps.push({
        id: `word-family:${wordFamilyModule.wordFamilyId}:${today}`,
        kind: 'word-family',
        title: wordFamilyModule.title,
        body: wordFamilyModule.summary,
        estimatedSeconds: 120,
        moduleId: wordFamilyModule.id,
        wordFamilyId: wordFamilyModule.wordFamilyId,
      })
    }
  }

  const cappedSteps = steps.slice(0, 5)
  let totalEstimatedSeconds = cappedSteps.reduce((total, step) => total + step.estimatedSeconds, 0)

  if (totalEstimatedSeconds < 300) {
    const extraModule = getNextRelevantModules(
      completedIds,
      module => !cappedSteps.some(step => step.moduleId === module.id)
    )[0]

    if (extraModule) {
      cappedSteps.push({
        id: `module:${extraModule.id}:${today}:extra`,
        kind: 'module',
        title: `Stretch into ${extraModule.title}`,
        body: extraModule.summary,
        estimatedSeconds: 120,
        moduleId: extraModule.id,
      })
      totalEstimatedSeconds += 120
    }
  }

  totalEstimatedSeconds = Math.min(540, cappedSteps.reduce((total, step) => total + step.estimatedSeconds, 0))

  return {
    date: today,
    steps: cappedSteps,
    completedStepIds: [],
    generatedAt: `${today}T00:00:00`,
    totalEstimatedSeconds,
  }
}

export default function useDailyLesson() {
  const activeProgramId = useLearningStore(state => state.activeProgramId)
  const completedLessons = useLearningStore(state => state.completedLessons)
  const dailyLesson = useLearningStore(state => state.dailyLesson)
  const programProgress = useLearningStore(state => state.programProgress)
  const setDailyLesson = useLearningStore(state => state.setDailyLesson)
  const completeDailyLessonStep = useLearningStore(state => state.completeDailyLessonStep)
  const vocab = useVocabStore(state => state.vocab)
  const today = toLocalDayStamp(new Date())

  const generatedLesson = useMemo(
    () => buildDailyLesson(
      {
        completedLessons,
        activeProgramId,
        programProgress,
      },
      vocab,
      today
    ),
    [activeProgramId, completedLessons, programProgress, today, vocab]
  )

  const lesson = dailyLesson?.date === today ? dailyLesson : generatedLesson
  const currentStep = lesson.steps.find(step => !lesson.completedStepIds.includes(step.id)) ?? null
  const isComplete = lesson.steps.length > 0 && lesson.completedStepIds.length >= lesson.steps.length
  const timeEstimate = Math.max(1, Math.round(lesson.totalEstimatedSeconds / 60))
  const needsPersist = dailyLesson?.date !== today

  const persistLesson = useCallback(() => {
    if (!needsPersist) return
    setDailyLesson(generatedLesson)
  }, [generatedLesson, needsPersist, setDailyLesson])

  const completeStep = useCallback((stepId: string) => {
    completeDailyLessonStep(stepId, lesson.date)
  }, [completeDailyLessonStep, lesson.date])

  return {
    lesson,
    currentStep,
    completeStep,
    isComplete,
    timeEstimate,
    needsPersist,
    persistLesson,
  }
}
