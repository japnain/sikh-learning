import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DailyLessonCard from '../components/DailyLessonCard'
import MilestoneCelebration from '../components/MilestoneCelebration'
import SoundscapeControls from '../components/SoundscapeControls'
import StreakCalendar from '../components/StreakCalendar'
import ThemePathCard from '../components/ThemePathCard'
import { GURMUKHI_LETTERS, GURMUKHI_VOWELS, type GurmukhiLetter } from '../data/gurmukhi'
import { GRAMMAR_NOTE_BY_ID } from '../data/grammarNotes'
import { GUIDED_JOURNEYS } from '../data/guidedJourneys'
import {
  getDefaultProgramForLevel,
  getLearningSkillKind,
  LEARN_MODULE_BY_ID,
  LEARN_PROGRAMS,
  PROGRAM_MODULES,
} from '../data/learningCurriculum'
import { MILESTONE_BY_ID } from '../data/milestones'
import { THEME_PATHS } from '../data/themePaths'
import { WORD_FAMILY_BY_ID } from '../data/wordFamilies'
import useDailyLesson from '../hooks/useDailyLesson'
import useMilestoneCheck from '../hooks/useMilestoneCheck'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useVocabStore } from '../store/vocab'
import type {
  GuidedJourney,
  LearnModule,
  LearnProgram,
  LearnProgramId,
  PlacementConfidence,
  SupportDensity,
} from '../types'
import {
  getLearningGoalLabels,
  getLearningLevelLabels,
  getOnboardingAudienceLabels,
} from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'
import { useCurrentTime } from '../hooks/useCurrentTime'

const SYMBOL_LOOKUP = new Map<string, GurmukhiLetter>(
  [...GURMUKHI_LETTERS, ...GURMUKHI_VOWELS].map(letter => [letter.gurmukhi, letter])
)

const SUPPORT_LABELS: Record<SupportDensity, string> = {
  full: 'Full support',
  guided: 'Guided',
  light: 'Light support',
  minimal: 'Minimal support',
}

const CONFIDENCE_OPTIONS: Array<{
  id: PlacementConfidence
  title: string
  detail: string
}> = [
  {
    id: 'gentle',
    title: 'Gentle start',
    detail: 'I still need a lot of support and want the path to stay simple.',
  },
  {
    id: 'steady',
    title: 'Steady reader',
    detail: 'I can read some forms already but need pacing and comprehension structure.',
  },
  {
    id: 'immersed',
    title: 'Already immersed',
    detail: 'I want less scaffolding and more meaning depth from the outset.',
  },
]

const READING_CHECK_OPTIONS = [
  {
    id: 'reading-new',
    title: 'I still sound out most letters one by one.',
    score: 0.2,
  },
  {
    id: 'reading-joining',
    title: 'I can join short phrases, but I lose rhythm quickly.',
    score: 0.58,
  },
  {
    id: 'reading-flow',
    title: 'I can read lines with reasonable flow and only occasional support.',
    score: 0.9,
  },
]

const MEANING_CHECK_OPTIONS = [
  {
    id: 'meaning-literal',
    title: 'I mostly need help with what basic phrases mean.',
    score: 0.25,
  },
  {
    id: 'meaning-patterns',
    title: 'I follow recurring words and phrases, but not larger ideas yet.',
    score: 0.62,
  },
  {
    id: 'meaning-compare',
    title: 'I want translation contrast, themes, and longer reflections.',
    score: 0.92,
  },
]

const LEGACY_LESSON_TO_MODULE: Record<string, string> = {
  'foundations-core-letters': 'start-core-letters',
  'phonics-sassa-haha': 'start-sassa-haha',
  'phonics-tatta-pair': 'understand-clusters',
  'decode-vaheguru': 'build-kartaa-decode',
}

function SymbolCard({
  symbol,
  mastered,
  onToggle,
}: {
  symbol: string
  mastered: boolean
  onToggle: () => void
}) {
  const detail = SYMBOL_LOOKUP.get(symbol)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-2xl border px-3 py-3 text-left transition-colors duration-300 ${
        mastered
          ? 'bg-saffron/10 border-saffron/30'
          : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10'
      }`}
    >
      <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-none text-ink dark:text-dark-text">
        {symbol}
      </p>
      {detail ? (
        <>
          <p className="mt-2 font-sans text-xs font-semibold text-ink dark:text-dark-text">{detail.name}</p>
          <p className="mt-1 font-sans text-[11px] text-ink/50 dark:text-dark-text/50">{detail.pronunciation}</p>
        </>
      ) : null}
    </button>
  )
}

function ProgramCard({
  program,
  active,
  currentIndex,
  totalCount,
  onClick,
}: {
  program: LearnProgram
  active: boolean
  currentIndex: number
  totalCount: number
  onClick: () => void
}) {
  const pct = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[26px] border px-4 py-4 text-left transition-colors duration-300 ${
        active
          ? 'bg-gradient-to-br from-saffron to-saffron-light text-white border-saffron shadow-gold'
          : 'section-shell-quiet border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-sans text-[11px] uppercase tracking-[0.18em] ${active ? 'text-white/75' : 'text-gold dark:text-gold-light'}`}>
            {program.eyebrow}
          </p>
          <p className="mt-2 font-sans text-base font-semibold">{program.name}</p>
          <p className={`mt-2 font-sans text-xs leading-5 ${active ? 'text-white/85' : 'text-ink/60 dark:text-dark-text/60'}`}>
            {program.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-3xl">{pct}%</p>
          <p className={`font-sans text-[10px] uppercase tracking-[0.18em] ${active ? 'text-white/70' : 'text-ink/45 dark:text-dark-text/45'}`}>
            Progress
          </p>
        </div>
      </div>
      <p className={`mt-3 font-sans text-[11px] ${active ? 'text-white/80' : 'text-ink/50 dark:text-dark-text/50'}`}>
        {currentIndex}/{totalCount} modules completed
      </p>
    </button>
  )
}

function JourneyCard({
  journey,
  active,
  completedCount,
  onOpen,
  onActivate,
}: {
  journey: GuidedJourney
  active: boolean
  completedCount: number
  onOpen: () => void
  onActivate: () => void
}) {
  const pct = Math.round((completedCount / journey.steps.length) * 100)

  return (
    <div className={`section-shell px-4 py-4 ${active ? 'border-saffron/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{journey.title}</p>
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-1">{journey.subtitle}</p>
          <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-2">{journey.description}</p>
        </div>
        <div className="text-right">
          <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{pct}%</p>
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">Progress</p>
        </div>
      </div>
      <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-3">
        <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
        >
          {completedCount > 0 ? 'Continue practice' : 'Start practice'}
        </button>
        <button
          type="button"
          onClick={onActivate}
          className="rounded-2xl section-shell-quiet px-3 py-3 font-sans text-xs min-h-[44px]"
        >
          {active ? 'Active' : 'Make active'}
        </button>
      </div>
    </div>
  )
}

function getPlacementProgram(confidence: PlacementConfidence, readingScore: number, meaningScore: number): LearnProgramId {
  if (confidence === 'gentle' || readingScore <= 0.35) return 'start-reading'
  if (readingScore < 0.75) return 'build-fluency'
  if (meaningScore < 0.8) return 'understand-gurbani'
  return 'deep-study'
}

function getPlacementSupport(programId: LearnProgramId, confidence: PlacementConfidence): SupportDensity {
  if (programId === 'start-reading') return 'full'
  if (programId === 'build-fluency') return confidence === 'gentle' ? 'guided' : 'light'
  if (programId === 'understand-gurbani') return confidence === 'immersed' ? 'light' : 'guided'
  return confidence === 'immersed' ? 'minimal' : 'light'
}

function isProgramId(value: string | null): value is LearnProgramId {
  return Boolean(value && LEARN_PROGRAMS.some(program => program.id === value))
}

function getJourneyStepModuleId(journey: GuidedJourney, stepId: string, lessonId?: string | null): string | null {
  if (lessonId) {
    return LEGACY_LESSON_TO_MODULE[lessonId] ?? lessonId
  }

  if (stepId === 'japji-guided') return 'start-japji-guided'
  if (stepId === 'rehras-guided') return 'build-rehras-guided'
  if (stepId === 'jaap-guided') return 'understand-jaap-guided'
  if (journey.id === 'journey-japji-opening') return 'start-japji-guided'
  if (journey.id === 'journey-rehras-entry') return 'build-rehras-guided'
  if (journey.id === 'journey-jaap-rhythm') return 'understand-jaap-guided'
  return null
}

function getNextUnlockedModule(programId: LearnProgramId, completedIds: Set<string>): LearnModule | null {
  const modules = PROGRAM_MODULES[programId]
  return modules.find(module =>
    !completedIds.has(module.id) && module.prerequisiteIds.every(prerequisite => completedIds.has(prerequisite))
  ) ?? modules.find(module => !completedIds.has(module.id)) ?? modules[modules.length - 1] ?? null
}

export default function Learn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dailyLessonRef = useRef<HTMLElement | null>(null)
  const locale = useLocaleStore(state => state.locale)
  const now = useCurrentTime()
  const copy = getUiCopy(locale)
  const learningGoalLabels = getLearningGoalLabels(locale)
  const learningLevelLabels = getLearningLevelLabels(locale)
  const onboardingAudienceLabels = getOnboardingAudienceLabels(locale)
  const { learningLevel, audience, learningGoal } = useOnboardingStore()
  const vocab = useVocabStore(state => state.vocab)
  const addWord = useVocabStore(state => state.addWord)
  const {
    masteredSymbols,
    completedLessons,
    practiceStreak,
    streakCalendar,
    longestStreak,
    totalPracticeSessions,
    lessonProgress,
    journeys,
    activeJourneyId,
    activeProgramId,
    programProgress,
    queuedReviewModuleIds,
    placementResult,
    lastLearnActivity,
    pendingMilestoneId,
    grammarNotesSeen,
    masteredWordFamilyIds,
    toggleMasteredSymbol,
    recordLessonAttempt,
    getWeakSkillIds,
    startJourney,
    setActiveJourney,
    completeJourneyStep,
    setActiveProgram,
    setProgramModule,
    completeModule,
    clearQueuedReview,
    setPlacementResult,
    recordLearnActivity,
    clearPendingMilestone,
    markGrammarNoteSeen,
    completeWordFamily,
    themePathProgress,
    completedThemePathIds,
    completeThemePathModule,
  } = useLearningStore()
  const checkMilestones = useMilestoneCheck()
  const {
    lesson: dailyLesson,
    currentStep: currentDailyStep,
    completeStep: completeDailyLessonStep,
    isComplete: isDailyLessonComplete,
    timeEstimate: dailyLessonMinutes,
    needsPersist: dailyLessonNeedsPersist,
    persistLesson,
  } = useDailyLesson()

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [revealDecode, setRevealDecode] = useState(false)
  const [guidedSupport, setGuidedSupport] = useState(true)
  const [selectedOptionModuleId, setSelectedOptionModuleId] = useState<string | null>(null)
  const [revealDecodeModuleId, setRevealDecodeModuleId] = useState<string | null>(null)
  const [guidedSupportModuleId, setGuidedSupportModuleId] = useState<string | null>(null)
  const [placementConfidence, setPlacementConfidence] = useState<PlacementConfidence>('steady')
  const [readingCheckId, setReadingCheckId] = useState<string>('reading-joining')
  const [meaningCheckId, setMeaningCheckId] = useState<string>('meaning-patterns')
  const [pathsOpen, setPathsOpen] = useState(false)

  const allCompletedIds = useMemo(() => {
    const nextIds = new Set(completedLessons)
    Object.values(programProgress).forEach(progress => {
      progress.completedModuleIds.forEach(moduleId => nextIds.add(moduleId))
    })
    return nextIds
  }, [completedLessons, programProgress])

  const weakSkillIds = useMemo(() => getWeakSkillIds().slice(0, 4), [getWeakSkillIds])
  const dueReview = useMemo(
    () => vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= now),
    [now, vocab]
  )
  const savedPhrases = useMemo(
    () => vocab.filter(entry => (entry.kind ?? 'word') === 'phrase').length,
    [vocab]
  )
  const savedWordKeys = useMemo(
    () => new Set(vocab.filter(entry => (entry.kind ?? 'word') === 'word').map(entry => entry.word)),
    [vocab]
  )
  const hasExistingProgramProgress = useMemo(
    () => Object.values(programProgress).some(progress => progress.currentModuleId || progress.completedModuleIds.length > 0),
    [programProgress]
  )
  const hasCompletedProgramProgress = useMemo(
    () => Object.values(programProgress).some(progress => progress.completedModuleIds.length > 0),
    [programProgress]
  )
  const onboardingProgram = useMemo(
    () => getDefaultProgramForLevel(learningLevel),
    [learningLevel]
  )

  useEffect(() => {
    if (!placementResult && !lastLearnActivity && !hasExistingProgramProgress && activeProgramId !== onboardingProgram) {
      setActiveProgram(onboardingProgram)
    }
  }, [activeProgramId, hasExistingProgramProgress, lastLearnActivity, onboardingProgram, placementResult, setActiveProgram])

  useEffect(() => {
    const requestedProgram = searchParams.get('program')
    const requestedModule = searchParams.get('module')
    if (isProgramId(requestedProgram)) {
      setActiveProgram(requestedProgram)
      if (requestedModule && LEARN_MODULE_BY_ID[requestedModule]) {
        setProgramModule(requestedProgram, requestedModule)
      }
    }
  }, [searchParams, setActiveProgram, setProgramModule])

  const activeProgramProgress = programProgress[activeProgramId]
  const requestedModuleId = searchParams.get('module')
  const nextUnlockedModule = getNextUnlockedModule(activeProgramId, allCompletedIds)
  const activeModule = useMemo(() => {
    const requestedModule = requestedModuleId ? LEARN_MODULE_BY_ID[requestedModuleId] : null
    if (requestedModule && requestedModule.programId === activeProgramId) return requestedModule

    const currentModuleId = activeProgramProgress.currentModuleId
    const currentModule = currentModuleId ? LEARN_MODULE_BY_ID[currentModuleId] : null
    if (currentModule && currentModule.programId === activeProgramId) return currentModule

    return nextUnlockedModule
  }, [activeProgramId, activeProgramProgress.currentModuleId, nextUnlockedModule, requestedModuleId])
  const defaultGuidedSupport = activeModule?.supportDensity !== 'minimal'
  const effectiveSelectedOptionId = selectedOptionModuleId === activeModule?.id ? selectedOptionId : null
  const effectiveRevealDecode = revealDecodeModuleId === activeModule?.id ? revealDecode : false
  const effectiveGuidedSupport = guidedSupportModuleId === activeModule?.id ? guidedSupport : defaultGuidedSupport

  useEffect(() => {
    if (!activeModule) return
    setProgramModule(activeProgramId, activeModule.id)
  }, [activeModule, activeProgramId, setProgramModule])

  const selectedQueuedReview = useMemo(
    () => queuedReviewModuleIds.map(moduleId => LEARN_MODULE_BY_ID[moduleId]).find(Boolean) ?? null,
    [queuedReviewModuleIds]
  )
  const continueModule = (() => {
    if (lastLearnActivity?.moduleId && LEARN_MODULE_BY_ID[lastLearnActivity.moduleId]) {
      return LEARN_MODULE_BY_ID[lastLearnActivity.moduleId]
    }
    return activeModule
  })()
  const hasEstablishedLearnState = Boolean(
    placementResult
    || lastLearnActivity
    || totalPracticeSessions > 0
    || hasCompletedProgramProgress
  )
  const showLearnDashboard = hasEstablishedLearnState
  const showContinueCard = Boolean(continueModule && hasEstablishedLearnState)
  const activeJourney = useMemo(() => {
    if (activeJourneyId) {
      return GUIDED_JOURNEYS.find(journey => journey.id === activeJourneyId) ?? null
    }
    return GUIDED_JOURNEYS.find(journey => journeys[journey.id] && !journeys[journey.id]?.completedAt) ?? null
  }, [activeJourneyId, journeys])
  const activeJourneyProgress = activeJourney ? journeys[activeJourney.id] : null
  const activeJourneyStep = activeJourney?.steps.find(step => !activeJourneyProgress?.completedStepIds.includes(step.id)) ?? null

  useEffect(() => {
    if (dailyLessonNeedsPersist) {
      persistLesson()
    }
  }, [dailyLessonNeedsPersist, persistLesson])

  useEffect(() => {
    if (searchParams.get('view') !== 'daily') return

    window.requestAnimationFrame(() => {
      dailyLessonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [searchParams])

  useEffect(() => {
    checkMilestones()
  }, [
    checkMilestones,
    completedLessons.length,
    grammarNotesSeen.length,
    masteredSymbols.length,
    masteredWordFamilyIds.length,
    pendingMilestoneId,
    practiceStreak,
    themePathProgress,
    vocab.length,
    journeys,
  ])

  useEffect(() => {
    if (activeModule?.type === 'grammar' && activeModule.grammarNoteId) {
      markGrammarNoteSeen(activeModule.grammarNoteId)
    }
  }, [activeModule?.grammarNoteId, activeModule?.type, markGrammarNoteSeen])

  const recordModuleView = (module: LearnModule, context: 'learn' | 'study' | 'review' = 'learn') => {
    recordLearnActivity({
      programId: module.programId,
      moduleId: module.id,
      context,
      visitedAt: new Date().toISOString(),
    })
  }

  const jumpToModule = (module: LearnModule) => {
    setActiveProgram(module.programId)
    setProgramModule(module.programId, module.id)
    recordModuleView(module)
  }

  const openModuleFromDaily = (moduleId: string) => {
    const module = LEARN_MODULE_BY_ID[moduleId]
    if (!module) return
    jumpToModule(module)
  }

  const openStudyFromDailyLesson = (source: 'G' | 'D', ang: number, baniTitle?: string) => {
    const params = new URLSearchParams({
      source,
      ang: String(ang),
    })

    if (baniTitle) {
      params.set('bani', baniTitle)
    }

    navigate(`/study?${params.toString()}`)
  }

  const openStudyFromModule = (module: LearnModule) => {
    if (!module.source || !module.ang) return
    recordModuleView(module, 'study')
    const params = new URLSearchParams({
      source: module.source,
      ang: String(module.ang),
      learnProgram: module.programId,
      learnModule: module.id,
    })
    const baniTitle = module.scriptureAnchor?.split('·')[0]?.trim()
    if (baniTitle) params.set('bani', baniTitle)
    navigate(`/study?${params.toString()}`)
  }

  const finishModule = (module: LearnModule, score: number) => {
    recordLessonAttempt(module.id, score, module.skillIds, getLearningSkillKind(module))
    if (module.type === 'word-family' && module.wordFamilyId) {
      completeWordFamily(module.wordFamilyId)
    }
    completeModule(
      module.programId,
      module.id,
      module.relatedReviewIds.length > 0 ? module.relatedReviewIds : [module.id]
    )
    THEME_PATHS.forEach(path => {
      if (themePathProgress[path.id] && path.moduleIds.includes(module.id)) {
        completeThemePathModule(path.id, module.id)
      }
    })
    if (activeJourney && activeJourneyStep) {
      const journeyModuleId = getJourneyStepModuleId(activeJourney, activeJourneyStep.id, activeJourneyStep.lessonId)
      if (
        (activeJourneyStep.type === 'learn' || activeJourneyStep.type === 'guided')
        && journeyModuleId === module.id
      ) {
        completeJourneyStep(activeJourney.id, activeJourneyStep.id, activeJourney.steps.length)
      }
    }
    checkMilestones()
  }

  const openQueuedReview = () => {
    if (!selectedQueuedReview) return
    clearQueuedReview(selectedQueuedReview.id)
    jumpToModule(selectedQueuedReview)
  }

  const openJourneyStep = (journey: GuidedJourney) => {
    startJourney(journey.id)
    const nextStep = journey.steps.find(step => !journeys[journey.id]?.completedStepIds.includes(step.id)) ?? journey.steps[0]
    if (!nextStep) return

    if (nextStep.type === 'study' && nextStep.source && nextStep.ang) {
      completeJourneyStep(journey.id, nextStep.id, journey.steps.length)
      navigate(`/study?source=${nextStep.source}&ang=${nextStep.ang}&bani=${encodeURIComponent(nextStep.baniTitle ?? journey.title)}`)
      return
    }

    if (nextStep.type === 'review') {
      completeJourneyStep(journey.id, nextStep.id, journey.steps.length)
      navigate('/vocab')
      return
    }

    if (nextStep.type === 'guided' && nextStep.guidedExerciseId) {
      const moduleId = getJourneyStepModuleId(journey, nextStep.id, nextStep.lessonId)
      const module = moduleId ? LEARN_MODULE_BY_ID[moduleId] : null
      if (module) {
        jumpToModule(module)
      }
      return
    }

    if (nextStep.type === 'learn') {
      const moduleId = nextStep.lessonId
        ? (LEGACY_LESSON_TO_MODULE[nextStep.lessonId] ?? nextStep.lessonId)
        : null
      const module = moduleId ? LEARN_MODULE_BY_ID[moduleId] : nextUnlockedModule
      if (module) {
        jumpToModule(module)
      }
    }
  }

  const readingScore = READING_CHECK_OPTIONS.find(option => option.id === readingCheckId)?.score ?? 0.58
  const meaningScore = MEANING_CHECK_OPTIONS.find(option => option.id === meaningCheckId)?.score ?? 0.62

  const submitPlacement = () => {
    const programId = getPlacementProgram(placementConfidence, readingScore, meaningScore)
    const supportDensity = getPlacementSupport(programId, placementConfidence)
    const result = {
      confidence: placementConfidence,
      readingScore,
      meaningScore,
      programId,
      supportDensity,
      placedAt: new Date().toISOString(),
    }
    setPlacementResult(result)
    setActiveProgram(programId)
    const firstModule = getNextUnlockedModule(programId, allCompletedIds)
    if (firstModule) {
      setProgramModule(programId, firstModule.id)
      recordModuleView(firstModule)
    }
  }

  const openThemePath = (pathId: string) => {
    const path = THEME_PATHS.find(item => item.id === pathId)
    if (!path) return

    if (!themePathProgress[pathId]) {
      useLearningStore.getState().startThemePath(pathId)
    }

    const nextModuleId = path.moduleIds.find(moduleId => !themePathProgress[pathId]?.completedModuleIds.includes(moduleId))
      ?? path.moduleIds[0]
    const nextModule = nextModuleId ? LEARN_MODULE_BY_ID[nextModuleId] : null

    if (nextModule) {
      jumpToModule(nextModule)
      checkMilestones()
    }
  }

  const todayCard = (() => {
    if (!hasEstablishedLearnState) {
      return {
        title: 'Set your default path',
        body: 'Start with placement once, then the rest of Learn can stay tighter and more personal.',
        actionLabel: 'Open placement',
        action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        context: 'Placement',
      }
    }

    if (dueReview.length > 0) {
      return {
        title: `${dueReview.length} review item${dueReview.length === 1 ? '' : 's'} due`,
        body: 'Use saved words and phrases before taking on more new material.',
        actionLabel: 'Open review bank',
        action: () => navigate('/vocab'),
        context: 'Review',
      }
    }

    if (selectedQueuedReview) {
      return {
        title: `Queued review: ${selectedQueuedReview.title}`,
        body: selectedQueuedReview.summary,
        actionLabel: 'Do queued review',
        action: openQueuedReview,
        context: 'Review loop',
      }
    }

    if (activeJourney && activeJourneyStep) {
      return {
        title: activeJourney.title,
        body: activeJourneyStep.title,
        actionLabel: 'Continue applied practice',
        action: () => openJourneyStep(activeJourney),
        context: 'Applied practice',
      }
    }

    if (activeModule) {
      return {
        title: activeModule.title,
        body: activeModule.summary,
        actionLabel: 'Open active module',
        action: () => jumpToModule(activeModule),
        context: LEARN_PROGRAMS.find(program => program.id === activeModule.programId)?.name ?? 'Learn',
      }
    }

    return {
      title: 'No module selected yet',
      body: 'Choose a program to start rebuilding momentum.',
      actionLabel: 'Choose a program',
      action: () => setActiveProgram(onboardingProgram),
      context: 'Learn',
    }
  })()
  const programJourneys = GUIDED_JOURNEYS.filter(journey => journey.programId === activeProgramId)

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-5">
        <button onClick={() => navigate(-1)} className="font-sans text-sm text-gold dark:text-gold-light min-h-[44px]">
          &#8592; Back
        </button>
        <p className="eyebrow mt-3">Grow</p>
        <h1 className="font-display text-4xl leading-none text-ink dark:text-dark-text mt-2">Learn your way into Gurbani.</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          {copy.home.promise}
        </p>
      </div>

      {!placementResult && (
        <section className="hero-surface p-5 mb-5">
          <p className="eyebrow">Placement</p>
          <p className="font-display text-3xl leading-none text-ink dark:text-dark-text mt-2">
            Start in the right lane, not the hardest one.
          </p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-3">
            This does not lock you in. It only decides your default program and how much support should stay visible.
          </p>

          <div className="mt-4 grid gap-2">
            {CONFIDENCE_OPTIONS.map(option => {
              const selected = placementConfidence === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPlacementConfidence(option.id)}
                  className={`rounded-2xl border px-4 py-3 text-left ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  <p className="font-sans text-sm font-semibold">{option.title}</p>
                  <p className={`mt-1 font-sans text-xs ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                    {option.detail}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="mt-5 section-shell-quiet p-4">
            <p className="eyebrow">Reading Check</p>
            <div className="grid gap-2 mt-3">
              {READING_CHECK_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setReadingCheckId(option.id)}
                  className={`rounded-2xl px-3 py-3 text-left font-sans text-sm ${
                    readingCheckId === option.id
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {option.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 section-shell-quiet p-4">
            <p className="eyebrow">Meaning Check</p>
            <div className="grid gap-2 mt-3">
              {MEANING_CHECK_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMeaningCheckId(option.id)}
                  className={`rounded-2xl px-3 py-3 text-left font-sans text-sm ${
                    meaningCheckId === option.id
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {option.title}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={submitPlacement}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
          >
            Set my default path
          </button>
        </section>
      )}

      {showLearnDashboard && (
        <section ref={dailyLessonRef} className="mb-5">
          <DailyLessonCard
            key={`${currentDailyStep?.id ?? 'complete'}:${dailyLesson.completedStepIds.length}`}
            lesson={dailyLesson}
            currentStep={currentDailyStep}
            timeEstimate={dailyLessonMinutes}
            isComplete={isDailyLessonComplete}
            onCompleteStep={completeDailyLessonStep}
            onOpenModule={openModuleFromDaily}
            onOpenStudy={openStudyFromDailyLesson}
          />
        </section>
      )}

      {showContinueCard && (
        <section className="section-shell p-4 mb-4">
          <p className="eyebrow">Continue</p>
          <p className="font-sans text-lg font-semibold text-ink dark:text-dark-text mt-2">
            {continueModule?.title ?? 'Choose a program to continue'}
          </p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">
            {continueModule?.summary ?? 'Pick the next lane that matches your current reading and meaning depth.'}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-gold/10 border border-gold/15 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
              {placementResult ? SUPPORT_LABELS[placementResult.supportDensity] : learningLevelLabels[learningLevel]}
            </span>
            <button
              type="button"
              onClick={() => continueModule && jumpToModule(continueModule)}
              className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
            >
              Continue Learn
            </button>
          </div>
        </section>
      )}

      {showLearnDashboard && (
        <div className="mb-5">
          <SoundscapeControls context="learn" variant="compact" />
        </div>
      )}

      {showLearnDashboard && (
        <section className="section-shell-quiet p-4 mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Today</p>
              <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                {todayCard.title}
              </p>
              <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-2 max-w-[30ch]">
                {todayCard.body}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl text-ink dark:text-dark-text">{allCompletedIds.size}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">Done</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="section-shell-quiet px-3 py-3">
              <p className="font-sans text-2xl text-ink dark:text-dark-text">{practiceStreak}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Streak</p>
            </div>
            <div className="section-shell-quiet px-3 py-3">
              <p className="font-sans text-2xl text-ink dark:text-dark-text">{totalPracticeSessions}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Sessions</p>
            </div>
            <div className="section-shell-quiet px-3 py-3">
              <p className="font-sans text-2xl text-ink dark:text-dark-text">{dueReview.length}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Due</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="chip-pill">{todayCard.context}</span>
            <button
              type="button"
              onClick={todayCard.action}
              className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 text-white font-sans text-sm font-semibold min-h-[44px]"
            >
              {todayCard.actionLabel}
            </button>
          </div>
          <div className="mt-4">
            <StreakCalendar
              streakCalendar={streakCalendar}
              practiceStreak={practiceStreak}
              longestStreak={longestStreak}
            />
          </div>
        </section>
      )}

      <section className="section-shell p-4 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Programs</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
              {learningLevelLabels[learningLevel]} · {learningGoalLabels[learningGoal]} · {onboardingAudienceLabels[audience]}
            </p>
          </div>
          {placementResult && (
            <button
              type="button"
              onClick={() => setPlacementResult(null)}
              className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
            >
              Retake placement
            </button>
          )}
        </div>

        <div className="space-y-3 mt-4">
          {LEARN_PROGRAMS.map(program => {
            return (
              <ProgramCard
                key={program.id}
                program={program}
                active={activeProgramId === program.id}
                currentIndex={PROGRAM_MODULES[program.id].filter(module => allCompletedIds.has(module.id)).length}
                totalCount={PROGRAM_MODULES[program.id].length}
                onClick={() => {
                  setActiveProgram(program.id)
                  const nextModule = getNextUnlockedModule(program.id, allCompletedIds)
                  if (nextModule) {
                    setProgramModule(program.id, nextModule.id)
                  }
                }}
              />
            )
          })}
        </div>

        <div className="section-shell-quiet p-4 mt-4">
          {showLearnDashboard ? (
            <>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                {LEARN_PROGRAMS.find(program => program.id === activeProgramId)?.outcome}
              </p>
              <p className="mt-2 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                Support density: {placementResult ? SUPPORT_LABELS[placementResult.supportDensity] : SUPPORT_LABELS[LEARN_PROGRAMS.find(program => program.id === activeProgramId)?.defaultSupportDensity ?? 'guided']}
              </p>
              <p className="mt-2 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                {savedPhrases} saved phrase{savedPhrases === 1 ? '' : 's'} currently available to reinforce understanding.
              </p>
            </>
          ) : (
            <>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                Pick a lane once, then Learn will open with a tighter daily lesson, streak view, and active module.
              </p>
              <p className="mt-2 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                Until placement is set, this page stays focused on getting you into the right program instead of showing the full dashboard stack.
              </p>
            </>
          )}
        </div>
      </section>

      {showLearnDashboard && activeModule && (
        <section className="section-shell p-5 mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Active Module</p>
              <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{activeModule.title}</p>
              <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">{activeModule.summary}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                {LEARN_PROGRAMS.find(program => program.id === activeModule.programId)?.name}
              </p>
              <p className="mt-2 font-sans text-[11px] text-ink/45 dark:text-dark-text/45">
                {activeModule.estimatedMinutes} min
              </p>
            </div>
          </div>

          {activeModule.scriptureAnchor && (
            <p className="mt-4 font-sans text-xs text-ink/45 dark:text-dark-text/45">
              {activeModule.scriptureAnchor}
            </p>
          )}

          {activeModule.type === 'symbol' && activeModule.symbolGroups && (
            <div className="space-y-3 mt-4">
              {activeModule.focus && (
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{activeModule.focus}</p>
              )}
              {activeModule.symbolGroups.map((group, index) => (
                <div key={`${activeModule.id}-${index}`} className="section-shell-quiet p-4">
                  <p className="eyebrow mb-3">Set {index + 1}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.map(symbol => (
                      <SymbolCard
                        key={symbol}
                        symbol={symbol}
                        mastered={masteredSymbols.includes(symbol)}
                        onToggle={() => toggleMasteredSymbol(symbol)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => finishModule(activeModule, 0.85)}
                className="w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
              >
                Mark this module practiced
              </button>
            </div>
          )}

          {activeModule.type === 'sound' && (
            <div className="mt-4">
              {activeModule.prompt && (
                <p className="font-sans text-sm text-ink/75 dark:text-dark-text/75">{activeModule.prompt}</p>
              )}
              <div className="grid gap-2 mt-4">
                {activeModule.options?.map(option => {
                  const selected = effectiveSelectedOptionId === option.id
                  const correct = selected && option.id === activeModule.answerId
                  const incorrect = selected && option.id !== activeModule.answerId
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (effectiveSelectedOptionId) return
                        setSelectedOptionModuleId(activeModule.id)
                        setSelectedOptionId(option.id)
                        recordLessonAttempt(
                          activeModule.id,
                          option.id === activeModule.answerId ? 1 : 0.35,
                          activeModule.skillIds,
                          getLearningSkillKind(activeModule)
                        )
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left font-sans text-sm ${
                        correct
                          ? 'bg-saffron text-white border-saffron'
                          : incorrect
                            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-200'
                            : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                      }`}
                    >
                      {option.label}
                      {option.detail ? (
                        <span className={`block mt-1 text-xs ${correct || incorrect ? 'text-current/80' : 'text-ink/50 dark:text-dark-text/50'}`}>
                          {option.detail}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              {effectiveSelectedOptionId && activeModule.explanation && (
                <div className="section-shell-quiet p-4 mt-4">
                  <p className="font-sans text-sm text-ink dark:text-dark-text">{activeModule.explanation}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => finishModule(activeModule, effectiveSelectedOptionId === activeModule.answerId ? 1 : 0.55)}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
              >
                Continue
              </button>
            </div>
          )}

          {activeModule.type === 'decode' && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {activeModule.parts?.map((part, index) => (
                  <span
                    key={`${part}-${index}`}
                    className="rounded-full bg-parchment-low dark:bg-dark-surface px-3 py-2 font-gurmukhi text-lg text-ink dark:text-dark-text"
                  >
                    {part}
                  </span>
                ))}
              </div>
              {effectiveRevealDecode && (
                <div className="section-shell-quiet p-4 mt-4">
                  <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                    {activeModule.combined}
                  </p>
                  {activeModule.transliteration && (
                    <p className="mt-2 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">
                      {activeModule.transliteration}
                    </p>
                  )}
                  {activeModule.meaning && (
                    <p className="mt-2 font-sans text-sm text-ink/70 dark:text-dark-text/70">{activeModule.meaning}</p>
                  )}
                  {activeModule.note && (
                    <p className="mt-2 font-sans text-xs text-ink/50 dark:text-dark-text/50">{activeModule.note}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setRevealDecodeModuleId(activeModule.id)
                    setRevealDecode(show => {
                      if (revealDecodeModuleId !== activeModule.id) return true
                      return !show
                    })
                  }}
                  className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                >
                  {effectiveRevealDecode ? 'Hide' : 'Combine'}
                </button>
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 0.35)}
                  className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                >
                  Review
                </button>
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 1)}
                  className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                >
                  Decoded
                </button>
              </div>
            </div>
          )}

          {activeModule.type === 'guided' && (
            <div className="mt-4">
              {activeModule.scriptText && (
                <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                  {activeModule.scriptText}
                </p>
              )}
              {effectiveGuidedSupport ? (
                <>
                  {activeModule.transliteration && (
                    <p className="mt-3 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">
                      {activeModule.transliteration}
                    </p>
                  )}
                  {activeModule.meaning && (
                    <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">{activeModule.meaning}</p>
                  )}
                </>
              ) : (
                <p className="mt-3 font-sans text-sm text-ink/65 dark:text-dark-text/65">{activeModule.supportHint}</p>
              )}
              {activeModule.keywords && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {activeModule.keywords.map(keyword => (
                    <span key={keyword} className="rounded-full bg-gold/10 border border-gold/15 px-3 py-1.5 font-gurmukhi text-sm text-gold dark:text-gold-light">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setGuidedSupportModuleId(activeModule.id)
                    setGuidedSupport(show => {
                      if (guidedSupportModuleId !== activeModule.id) return !defaultGuidedSupport
                      return !show
                    })
                  }}
                  className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                >
                  {effectiveGuidedSupport ? 'Reduce' : 'Support'}
                </button>
                <button
                  type="button"
                  onClick={() => openStudyFromModule(activeModule)}
                  className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                >
                  Reader
                </button>
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 0.4)}
                  className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                >
                  Review
                </button>
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 1)}
                  className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                >
                  I read it
                </button>
              </div>
            </div>
          )}

          {(activeModule.type === 'meaning' || activeModule.type === 'review') && (
            <div className="mt-4">
              {activeModule.scriptText && (
                <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                  {activeModule.scriptText}
                </p>
              )}
              {activeModule.prompt && (
                <p className="mt-3 font-sans text-sm text-ink dark:text-dark-text">{activeModule.prompt}</p>
              )}
              <div className="grid gap-2 mt-4">
                {activeModule.options?.map(option => {
                  const selected = effectiveSelectedOptionId === option.id
                  const correct = selected && option.id === activeModule.answerId
                  const incorrect = selected && option.id !== activeModule.answerId
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (effectiveSelectedOptionId) return
                        setSelectedOptionModuleId(activeModule.id)
                        setSelectedOptionId(option.id)
                        recordLessonAttempt(
                          activeModule.id,
                          option.id === activeModule.answerId ? 1 : 0.3,
                          activeModule.skillIds,
                          getLearningSkillKind(activeModule)
                        )
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left font-sans text-sm min-h-[48px] ${
                        correct
                          ? 'bg-saffron text-white border-saffron'
                          : incorrect
                            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-200'
                            : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              {effectiveSelectedOptionId && activeModule.explanation && (
                <div className="section-shell-quiet p-4 mt-4">
                  <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    {effectiveSelectedOptionId === activeModule.answerId ? 'Aligned' : 'Recenter'}
                  </p>
                  <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">{activeModule.explanation}</p>
                  {activeModule.note && (
                    <p className="mt-2 font-sans text-xs text-ink/50 dark:text-dark-text/50">{activeModule.note}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {activeModule.source && activeModule.ang ? (
                  <button
                    type="button"
                    onClick={() => openStudyFromModule(activeModule)}
                    className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                  >
                    Open Study
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/vocab')}
                    className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                  >
                    Open Saved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, effectiveSelectedOptionId === activeModule.answerId ? 1 : 0.55)}
                  className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {activeModule.type === 'compare' && (
            <div className="mt-4">
              {activeModule.scriptText && (
                <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                  {activeModule.scriptText}
                </p>
              )}
              <div className="space-y-3 mt-4">
                {activeModule.compareRows?.map(row => (
                  <div key={row.label} className="section-shell-quiet p-4">
                    <p className="eyebrow">{row.label}</p>
                    <p className="mt-2 font-sans text-sm text-ink dark:text-dark-text">{row.text}</p>
                  </div>
                ))}
              </div>
              {activeModule.note && (
                <p className="mt-4 font-sans text-xs text-ink/50 dark:text-dark-text/50">{activeModule.note}</p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {activeModule.source && activeModule.ang ? (
                  <button
                    type="button"
                    onClick={() => openStudyFromModule(activeModule)}
                    className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                  >
                    Open Study
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/vocab')}
                    className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                  >
                    Open Saved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 0.9)}
                  className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                >
                  Mark compared
                </button>
              </div>
            </div>
          )}

          {activeModule.type === 'grammar' && (
            <div className="mt-4">
              <div className="section-shell-quiet p-4">
                <p className="eyebrow">Pattern</p>
                <p className="mt-2 font-sans text-sm text-ink dark:text-dark-text">
                  {activeModule.grammarPattern}
                </p>
                {activeModule.grammarNoteId && GRAMMAR_NOTE_BY_ID[activeModule.grammarNoteId] ? (
                  <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">
                    {GRAMMAR_NOTE_BY_ID[activeModule.grammarNoteId].explanation}
                  </p>
                ) : null}
              </div>
              <div className="space-y-3 mt-4">
                {activeModule.grammarExamples?.map(example => (
                  <div key={`${activeModule.id}-${example.gurmukhi}`} className="section-shell-quiet p-4">
                    <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                      {example.gurmukhi}
                    </p>
                    <p className="mt-2 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">
                      {example.transliteration}
                    </p>
                    <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">
                      {example.meaning}
                    </p>
                    {example.highlight ? (
                      <p className="mt-2 font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        Watch: {example.highlight}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {activeModule.source && activeModule.ang ? (
                  <button
                    type="button"
                    onClick={() => openStudyFromModule(activeModule)}
                    className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                  >
                    Open Study
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/vocab')}
                    className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                  >
                    Open Saved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 0.92)}
                  className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                >
                  Mark learned
                </button>
              </div>
            </div>
          )}

          {activeModule.type === 'word-family' && (
            <div className="mt-4">
              <div className="section-shell-quiet p-4">
                <p className="eyebrow">Root</p>
                <p lang="pa-Guru" className="mt-2 font-gurmukhi text-3xl leading-none text-ink dark:text-dark-text">
                  {activeModule.wordFamilyRoot ?? WORD_FAMILY_BY_ID[activeModule.wordFamilyId ?? '']?.root}
                </p>
                <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">
                  {WORD_FAMILY_BY_ID[activeModule.wordFamilyId ?? '']?.rootMeaning ?? activeModule.summary}
                </p>
              </div>
              <div className="space-y-3 mt-4">
                {activeModule.wordFamilyMembers?.map(member => {
                  const isSaved = savedWordKeys.has(member.gurmukhi)

                  return (
                    <div key={`${activeModule.id}-${member.gurmukhi}`} className="section-shell-quiet p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">
                            {member.gurmukhi}
                          </p>
                          <p className="mt-2 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">
                            {member.transliteration}
                          </p>
                          <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">
                            {member.meaning}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isSaved}
                          onClick={() => {
                            if (isSaved) return
                            addWord({
                              kind: 'word',
                              word: member.gurmukhi,
                              transliteration: member.transliteration,
                              meaning_en: member.meaning,
                              meaning_hi: '',
                              meaning_pa: '',
                              scripture: activeModule.title,
                              sourceId: activeModule.source ?? 'G',
                              savedAt: new Date().toISOString(),
                              context: {
                                scripture: activeModule.title,
                                sourceId: activeModule.source ?? 'G',
                                ang: activeModule.ang,
                              },
                            })
                            checkMilestones()
                          }}
                          className={`rounded-full px-3 py-2 font-sans text-xs font-semibold ${
                            isSaved
                              ? 'bg-gold/15 text-gold dark:text-gold-light'
                              : 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                          }`}
                        >
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/vocab')}
                  className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
                >
                  Open Vocab
                </button>
                <button
                  type="button"
                  onClick={() => finishModule(activeModule, 0.94)}
                  className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                >
                  Mark family learned
                </button>
              </div>
            </div>
          )}

          <div className="section-shell-quiet p-4 mt-5">
            <p className="eyebrow">Assessment</p>
            <p className="mt-2 font-sans text-sm text-ink/70 dark:text-dark-text/70">
              Best score: {lessonProgress[activeModule.id]?.bestScore
                ? `${Math.round((lessonProgress[activeModule.id]?.bestScore ?? 0) * 100)}%`
                : 'No score yet'}
            </p>
            {weakSkillIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {weakSkillIds.map(skillId => (
                  <span key={skillId} className="rounded-full bg-gold/10 border border-gold/15 px-3 py-1.5 font-sans text-[11px] text-gold dark:text-gold-light">
                    {skillId.replace(/^[^:]+:/, '')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {showLearnDashboard && (
        <section className="section-shell-quiet p-4 mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Applied Practice</p>
              <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
                Use short bani-specific paths to turn modules into repeatable reading progress.
              </p>
            </div>
            {activeJourney ? (
              <button
                type="button"
                onClick={() => setActiveJourney(null)}
                className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
              >
                Clear active
              </button>
            ) : null}
          </div>

          <div className="space-y-3 mt-4">
            {programJourneys.length > 0 ? (
              programJourneys.map(journey => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  active={activeJourney?.id === journey.id}
                  completedCount={journeys[journey.id]?.completedStepIds.length ?? 0}
                  onOpen={() => openJourneyStep(journey)}
                  onActivate={() => setActiveJourney(journey.id)}
                />
              ))
            ) : (
              <div className="section-shell px-4 py-4">
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  Applied practice is still being curated for this path.
                </p>
                <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-2">
                  Keep moving through the active module and Today stack for now. Practice journeys will appear here as they are added.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {showLearnDashboard && (
        <section className="section-shell-quiet p-4 mb-5">
          <button
            type="button"
            onClick={() => setPathsOpen(open => !open)}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <p className="eyebrow">Paths</p>
              <p className="mt-1 font-sans text-sm text-ink dark:text-dark-text">
                Follow curated vocabulary and grammar paths instead of choosing every next step yourself.
              </p>
            </div>
            <span className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
              {pathsOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {pathsOpen ? (
            <div className="space-y-3 mt-4">
              {THEME_PATHS.map(path => {
                const progress = themePathProgress[path.id]
                return (
                  <ThemePathCard
                    key={path.id}
                    path={path}
                    completedCount={progress?.completedModuleIds.length ?? 0}
                    isStarted={Boolean(progress)}
                    isComplete={completedThemePathIds.includes(path.id)}
                    onStart={() => openThemePath(path.id)}
                    onOpen={() => openThemePath(path.id)}
                  />
                )
              })}
            </div>
          ) : null}
        </section>
      )}

      {pendingMilestoneId && MILESTONE_BY_ID[pendingMilestoneId] ? (
        <MilestoneCelebration
          milestone={MILESTONE_BY_ID[pendingMilestoneId]}
          onDismiss={clearPendingMilestone}
        />
      ) : null}
    </div>
  )
}
