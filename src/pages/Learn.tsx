import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GURMUKHI_LETTERS, GURMUKHI_VOWELS, type GurmukhiLetter } from '../data/gurmukhi'
import { GUIDED_JOURNEYS } from '../data/guidedJourneys'
import {
  COMPREHENSION_EXERCISES,
  DECODING_DRILLS,
  FOUNDATION_MODULES,
  GUIDED_READING_EXERCISES,
  PHONICS_DRILLS,
} from '../data/learningCurriculum'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useVocabStore } from '../store/vocab'
import {
  LEARNING_GOAL_LABELS,
  LEARNING_LEVEL_LABELS,
  ONBOARDING_AUDIENCE_LABELS,
} from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'

type Track = 'foundations' | 'phonics' | 'decoding' | 'guided' | 'comprehension'

const TRACK_LABELS: Record<Track, string> = {
  foundations: 'Foundations',
  phonics: 'Phonics',
  decoding: 'Decoding',
  guided: 'Guided Gurbani',
  comprehension: 'Comprehension',
}

const SYMBOL_LOOKUP = new Map<string, GurmukhiLetter>(
  [...GURMUKHI_LETTERS, ...GURMUKHI_VOWELS].map(letter => [letter.gurmukhi, letter])
)

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

function getRecommendedTrack(level: string, goal: string): Track {
  if (level === 'beginner') return 'foundations'
  if (goal === 'understand') return 'comprehension'
  if (level === 'daily-reader') return 'guided'
  return 'decoding'
}

export default function Learn() {
  const navigate = useNavigate()
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const { learningLevel, audience, learningGoal } = useOnboardingStore()
  const vocab = useVocabStore(s => s.vocab)
  const {
    masteredSymbols,
    completedLessons,
    practiceStreak,
    totalPracticeSessions,
    skills,
    lessonProgress,
    journeys,
    activeJourneyId,
    toggleMasteredSymbol,
    recordLessonAttempt,
    getWeakSkillIds,
    startJourney,
    setActiveJourney,
    completeJourneyStep,
  } = useLearningStore()

  const recommendedTrack = useMemo(
    () => getRecommendedTrack(learningLevel, learningGoal),
    [learningGoal, learningLevel]
  )
  const [track, setTrack] = useState<Track>(() => getRecommendedTrack(learningLevel, learningGoal))
  const [foundationIdx, setFoundationIdx] = useState(0)
  const [phonicsIdx, setPhonicsIdx] = useState(0)
  const [decodingIdx, setDecodingIdx] = useState(0)
  const [guidedIdx, setGuidedIdx] = useState(0)
  const [showPhonicsAnswer, setShowPhonicsAnswer] = useState(false)
  const [showDecodingAnswer, setShowDecodingAnswer] = useState(false)
  const [showGuidedSupport, setShowGuidedSupport] = useState(learningLevel !== 'daily-reader')
  const [selectedComprehension, setSelectedComprehension] = useState<string | null>(null)

  const weakSkillIds = useMemo(() => getWeakSkillIds().slice(0, 4), [getWeakSkillIds, skills])
  const dueReview = vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= Date.now())
  const savedPhrases = vocab.filter(entry => (entry.kind ?? 'word') === 'phrase').length
  const foundation = FOUNDATION_MODULES[foundationIdx % FOUNDATION_MODULES.length]
  const phonics = PHONICS_DRILLS[phonicsIdx % PHONICS_DRILLS.length]
  const decoding = DECODING_DRILLS[decodingIdx % DECODING_DRILLS.length]
  const guided = GUIDED_READING_EXERCISES[guidedIdx % GUIDED_READING_EXERCISES.length]
  const comprehension = COMPREHENSION_EXERCISES[guidedIdx % COMPREHENSION_EXERCISES.length]
  const foundationIndexById = useMemo(
    () => Object.fromEntries(FOUNDATION_MODULES.map((module, index) => [module.id, index])),
    []
  )
  const phonicsIndexById = useMemo(
    () => Object.fromEntries(PHONICS_DRILLS.map((drill, index) => [drill.id, index])),
    []
  )
  const decodingIndexById = useMemo(
    () => Object.fromEntries(DECODING_DRILLS.map((drill, index) => [drill.id, index])),
    []
  )
  const guidedIndexById = useMemo(
    () => Object.fromEntries(GUIDED_READING_EXERCISES.map((exercise, index) => [exercise.id, index])),
    []
  )

  const skillValues = Object.values(skills)
  const masteryPct = skillValues.length > 0
    ? Math.round((skillValues.reduce((sum, skill) => sum + skill.mastery, 0) / skillValues.length) * 100)
    : Math.round((masteredSymbols.length / (GURMUKHI_LETTERS.length + GURMUKHI_VOWELS.length)) * 100)

  const foundationSkillIds = foundation.symbolGroups.flat().map(symbol => `symbol:${symbol}`)
  const activeGuidedSupport = showGuidedSupport || learningLevel === 'beginner'
  const comprehensionCorrect = selectedComprehension === comprehension.answer
  const activeJourney = useMemo(() => {
    if (activeJourneyId) {
      return GUIDED_JOURNEYS.find(journey => journey.id === activeJourneyId) ?? null
    }
    return GUIDED_JOURNEYS.find(journey => {
      const progress = journeys[journey.id]
      return progress && !progress.completedAt
    }) ?? null
  }, [activeJourneyId, journeys])
  const activeJourneyProgress = activeJourney ? journeys[activeJourney.id] : null
  const activeJourneyStep = activeJourney?.steps.find(step => !activeJourneyProgress?.completedStepIds.includes(step.id)) ?? null
  const completedJourneyCount = useMemo(
    () => GUIDED_JOURNEYS.filter(journey => journeys[journey.id]?.completedAt).length,
    [journeys]
  )

  const handleJourneyAction = (journeyId: string, stepId: string, totalSteps: number) => {
    completeJourneyStep(journeyId, stepId, totalSteps)
  }

  const openJourneyStep = (journeyId: string, stepId?: string) => {
    const journey = GUIDED_JOURNEYS.find(item => item.id === journeyId)
    const progress = journeys[journeyId]
    if (!journey) return

    startJourney(journeyId)
    const step = stepId
      ? journey.steps.find(item => item.id === stepId)
      : journey.steps.find(item => !progress?.completedStepIds.includes(item.id)) ?? journey.steps[0]
    if (!step) return

    if (step.type === 'learn' && step.track) {
      setTrack(step.track)
      if (step.lessonId && step.track === 'foundations' && foundationIndexById[step.lessonId] !== undefined) {
        setFoundationIdx(foundationIndexById[step.lessonId])
      }
      if (step.lessonId && step.track === 'phonics' && phonicsIndexById[step.lessonId] !== undefined) {
        setPhonicsIdx(phonicsIndexById[step.lessonId])
      }
      if (step.lessonId && step.track === 'decoding' && decodingIndexById[step.lessonId] !== undefined) {
        setDecodingIdx(decodingIndexById[step.lessonId])
      }
    }

    if (step.type === 'guided') {
      setTrack('guided')
      if (step.guidedExerciseId && guidedIndexById[step.guidedExerciseId] !== undefined) {
        setGuidedIdx(guidedIndexById[step.guidedExerciseId])
        setSelectedComprehension(null)
      }
    }

    if (step.type === 'study' && step.source && step.ang) {
      navigate(`/study?source=${step.source}&ang=${step.ang}&bani=${encodeURIComponent(step.baniTitle ?? journey.title)}`)
    }

    if (step.type === 'review') {
      navigate('/vocab')
    }
  }

  const nextLearnStep = (() => {
    if (activeJourney && activeJourneyStep) {
      return {
        title: activeJourneyStep.title,
        body: activeJourneyStep.detail,
        actionLabel: 'Continue active journey',
        action: () => openJourneyStep(activeJourney.id, activeJourneyStep.id),
        context: `${activeJourney.title} · ${activeJourneyProgress?.completedStepIds.length ?? 0}/${activeJourney.steps.length} done`,
      }
    }

    if (dueReview.length > 0 || savedPhrases > 0) {
      return {
        title: 'Review saved words and phrases first.',
        body: `${dueReview.length} due review item${dueReview.length === 1 ? '' : 's'} and ${savedPhrases} saved phrase${savedPhrases === 1 ? '' : 's'} can reinforce comprehension before new lessons.`,
        actionLabel: 'Open review bank',
        action: () => navigate('/vocab'),
        context: 'Review',
      }
    }

    if (recommendedTrack === 'foundations') {
      return {
        title: foundation.title,
        body: foundation.summary,
        actionLabel: 'Start foundations',
        action: () => setTrack('foundations'),
        context: TRACK_LABELS.foundations,
      }
    }

    if (recommendedTrack === 'guided') {
      return {
        title: guided.title,
        body: `${guided.scripture} · Ang ${guided.ang}`,
        actionLabel: 'Open guided Gurbani',
        action: () => setTrack('guided'),
        context: TRACK_LABELS.guided,
      }
    }

    if (recommendedTrack === 'comprehension') {
      return {
        title: 'Meaning check',
        body: comprehension.question,
        actionLabel: 'Open comprehension',
        action: () => setTrack('comprehension'),
        context: TRACK_LABELS.comprehension,
      }
    }

    return {
      title: decoding.title,
      body: 'Join sounds into real Gurbani words before pushing into faster reading.',
      actionLabel: 'Open decoding',
      action: () => setTrack('decoding'),
      context: TRACK_LABELS.decoding,
    }
  })()

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

      <section className="section-shell p-4 mb-4">
        <p className="eyebrow">Today&apos;s next step</p>
        <p className="font-sans text-lg font-semibold text-ink dark:text-dark-text mt-2">
          {nextLearnStep.title}
        </p>
        <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">
          {nextLearnStep.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-gold/10 border border-gold/15 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
            {nextLearnStep.context}
          </span>
          <button
            onClick={nextLearnStep.action}
            className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
          >
            {nextLearnStep.actionLabel}
          </button>
        </div>
      </section>

      <section className="section-shell-quiet p-4 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Learn 2.0</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
              {LEARNING_LEVEL_LABELS[learningLevel]} · {LEARNING_GOAL_LABELS[learningGoal]}
            </p>
            <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-2 max-w-[30ch]">
              {ONBOARDING_AUDIENCE_LABELS[audience]} mode keeps the path focused on reading ability, not just isolated symbol recall.
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-ink dark:text-dark-text">{masteryPct}%</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">Mastery</p>
          </div>
        </div>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${masteryPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{completedLessons.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Lessons</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{practiceStreak}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Streak</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{totalPracticeSessions}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Sessions</p>
          </div>
        </div>
        <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-4">
          {completedJourneyCount} guided journe{completedJourneyCount === 1 ? 'y' : 'ys'} completed.
        </p>
      </section>

      <section className="section-shell p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Weak Skills</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
              {weakSkillIds.length > 0 ? 'These should keep resurfacing until they are stable.' : 'No weak skills are currently flagged.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/vocab')}
            className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
          >
            {dueReview.length} due · {savedPhrases} phrases
          </button>
        </div>
        {weakSkillIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {weakSkillIds.map(skillId => (
              <span key={skillId} className="rounded-full bg-gold/10 border border-gold/15 px-3 py-1.5 font-sans text-[11px] text-gold dark:text-gold-light">
                {skillId.replace(/^[^:]+:/, '')}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="section-shell-quiet p-4 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Guided Journeys</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
              Use short bani-specific paths to turn isolated practice into repeatable reading progress.
            </p>
          </div>
          {activeJourney ? (
            <button
              onClick={() => setActiveJourney(null)}
              className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
            >
              Clear active
            </button>
          ) : null}
        </div>

        <div className="space-y-3 mt-4">
          {GUIDED_JOURNEYS.map(journey => {
            const progress = journeys[journey.id]
            const completedCount = progress?.completedStepIds.length ?? 0
            const pct = Math.round((completedCount / journey.steps.length) * 100)
            const isActiveJourney = activeJourney?.id === journey.id

            return (
              <div key={journey.id} className={`section-shell px-4 py-4 ${isActiveJourney ? 'border-saffron/30' : ''}`}>
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
                    onClick={() => openJourneyStep(journey.id)}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
                  >
                    {progress ? 'Continue' : 'Start Journey'}
                  </button>
                  <button
                    onClick={() => setActiveJourney(journey.id)}
                    className="rounded-2xl section-shell-quiet px-3 py-3 font-sans text-xs min-h-[44px]"
                  >
                    Make Active
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {activeJourney && activeJourneyProgress && (
        <section className="section-shell p-4 mb-5">
          <p className="eyebrow">Active Journey</p>
          <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{activeJourney.title}</p>
          <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-2">
            {activeJourneyStep
              ? `Next step: ${activeJourneyStep.title}`
              : 'All steps are complete. Start another journey or revisit this one for reinforcement.'}
          </p>
          <div className="space-y-2 mt-4">
            {activeJourney.steps.map(step => {
              const isDone = activeJourneyProgress.completedStepIds.includes(step.id)
              return (
                <div key={step.id} className="section-shell-quiet px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                        {step.title}
                      </p>
                      <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-1">
                        {step.detail}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJourneyAction(activeJourney.id, step.id, activeJourney.steps.length)}
                      className={`rounded-full px-3 py-1.5 font-sans text-[11px] border ${
                        isDone
                          ? 'bg-saffron text-white border-saffron'
                          : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink/60 dark:text-dark-text/60'
                      }`}
                    >
                      {isDone ? 'Done' : 'Mark done'}
                    </button>
                  </div>
                  {!isDone && (
                    <button
                    onClick={() => openJourneyStep(activeJourney.id, step.id)}
                    className="mt-3 font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
                  >
                    Open this step
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2 mb-5">
        {(Object.keys(TRACK_LABELS) as Track[]).map(option => (
          <button
            key={option}
            onClick={() => {
              setTrack(option)
              setSelectedComprehension(null)
            }}
            className={`rounded-2xl px-3 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 ${
              track === option ? 'bg-saffron text-white' : 'section-shell text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {TRACK_LABELS[option]}
          </button>
        ))}
      </div>

      {track === 'foundations' && (
        <div className="space-y-3 animate-slide-up">
          <div className="section-shell p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Foundations</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{foundation.title}</p>
                <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">{foundation.summary}</p>
              </div>
              <button
                onClick={() => setFoundationIdx(index => (index + 1) % FOUNDATION_MODULES.length)}
                className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
              >
                Next module
              </button>
            </div>
            <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-3">{foundation.focus}</p>
          </div>

          {foundation.symbolGroups.map((group, index) => (
            <div key={`${foundation.id}-${index}`} className="section-shell-quiet p-4">
              <p className="eyebrow mb-3">Lesson {index + 1}</p>
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
            onClick={() => recordLessonAttempt(foundation.id, 0.85, foundationSkillIds, 'symbol')}
            className="w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
          >
            Mark this module practiced
          </button>
        </div>
      )}

      {track === 'phonics' && (
        <div className="animate-slide-up">
          <div className="section-shell p-5">
            <p className="eyebrow">Phonics + Ucharan</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{phonics.title}</p>
            <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70 mt-3">{phonics.prompt}</p>

            {showPhonicsAnswer && (
              <div className="section-shell-quiet p-4 mt-4">
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{phonics.answer}</p>
                <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">Contrast: {phonics.contrast}</p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-3">{phonics.explanation}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => setShowPhonicsAnswer(show => !show)}
                className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
              >
                {showPhonicsAnswer ? 'Hide' : 'Reveal'}
              </button>
              <button
                onClick={() => {
                  recordLessonAttempt(phonics.id, 0.35, phonics.skillIds, 'sound')
                  setPhonicsIdx(index => index + 1)
                  setShowPhonicsAnswer(false)
                }}
                className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
              >
                Review
              </button>
              <button
                onClick={() => {
                  recordLessonAttempt(phonics.id, 1, phonics.skillIds, 'sound')
                  setPhonicsIdx(index => index + 1)
                  setShowPhonicsAnswer(false)
                }}
                className="bg-gradient-to-r from-saffron to-saffron-light text-white rounded-2xl py-3 font-sans text-xs font-semibold min-h-[44px]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {track === 'decoding' && (
        <div className="animate-slide-up">
          <div className="section-shell p-5">
            <p className="eyebrow">Decoding</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{decoding.title}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {decoding.parts.map((part, index) => (
                <span key={`${part}-${index}`} className="rounded-full bg-parchment-low dark:bg-dark-surface px-3 py-2 font-gurmukhi text-lg text-ink dark:text-dark-text">
                  {part}
                </span>
              ))}
            </div>

            {showDecodingAnswer && (
              <div className="section-shell-quiet p-4 mt-4">
                <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text">{decoding.combined}</p>
                <p className="mt-2 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">{decoding.transliteration}</p>
                <p className="mt-2 font-sans text-sm text-ink/70 dark:text-dark-text/70">{decoding.meaning}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => setShowDecodingAnswer(show => !show)}
                className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
              >
                {showDecodingAnswer ? 'Hide' : 'Combine'}
              </button>
              <button
                onClick={() => {
                  recordLessonAttempt(decoding.id, 0.35, decoding.skillIds, 'pattern')
                  setDecodingIdx(index => index + 1)
                  setShowDecodingAnswer(false)
                }}
                className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
              >
                Review
              </button>
              <button
                onClick={() => {
                  recordLessonAttempt(decoding.id, 1, decoding.skillIds, 'pattern')
                  setDecodingIdx(index => index + 1)
                  setShowDecodingAnswer(false)
                }}
                className="bg-gradient-to-r from-saffron to-saffron-light text-white rounded-2xl py-3 font-sans text-xs font-semibold min-h-[44px]"
              >
                Decoded
              </button>
            </div>
          </div>
        </div>
      )}

      {track === 'guided' && (
        <div className="space-y-3 animate-slide-up">
          <div className="section-shell p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Guided Gurbani</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">{guided.title}</p>
                <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-2">
                  {guided.scripture} · Ang {guided.ang}
                </p>
              </div>
              <button
                onClick={() => setShowGuidedSupport(show => !show)}
                className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
              >
                {activeGuidedSupport ? 'Reduce support' : 'Show support'}
              </button>
            </div>
            <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text mt-4">
              {guided.gurmukhi}
            </p>
            {activeGuidedSupport ? (
              <>
                <p className="mt-3 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">{guided.transliteration}</p>
                <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">{guided.meaning}</p>
              </>
            ) : (
              <p className="mt-3 font-sans text-sm text-ink/65 dark:text-dark-text/65">{guided.supportHint}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {guided.keywords.map(keyword => (
                <span key={keyword} className="rounded-full bg-gold/10 border border-gold/15 px-3 py-1.5 font-gurmukhi text-sm text-gold dark:text-gold-light">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => navigate(`/study?source=${guided.source}&ang=${guided.ang}&bani=${encodeURIComponent(guided.title)}`)}
                className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
              >
                Open Reader
              </button>
              <button
                onClick={() => {
                  recordLessonAttempt(guided.id, 0.4, guided.skillIds, 'guided-reading')
                  setGuidedIdx(index => index + 1)
                  setSelectedComprehension(null)
                }}
                className="section-shell-quiet py-3 font-sans text-xs min-h-[44px]"
              >
                Review
              </button>
              <button
                onClick={() => {
                  recordLessonAttempt(guided.id, 1, guided.skillIds, 'guided-reading')
                  setGuidedIdx(index => index + 1)
                  setSelectedComprehension(null)
                }}
                className="bg-gradient-to-r from-saffron to-saffron-light text-white rounded-2xl py-3 font-sans text-xs font-semibold min-h-[44px]"
              >
                I Read It
              </button>
            </div>
          </div>
        </div>
      )}

      {track === 'comprehension' && (
        <div className="space-y-3 animate-slide-up">
          <div className="section-shell p-5">
            <p className="eyebrow">Comprehension</p>
            <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-relaxed text-ink dark:text-dark-text mt-3">
              {guided.gurmukhi}
            </p>
            <p className="mt-3 font-sans text-sm text-ink dark:text-dark-text">{comprehension.question}</p>
            <div className="grid gap-2 mt-4">
              {comprehension.options.map(option => {
                const selected = selectedComprehension === option
                const correct = selected && comprehensionCorrect
                const incorrect = selected && !comprehensionCorrect
                return (
                  <button
                    key={option}
                    onClick={() => {
                      if (selectedComprehension) return
                      setSelectedComprehension(option)
                      recordLessonAttempt(
                        comprehension.id,
                        option === comprehension.answer ? 1 : 0.3,
                        comprehension.skillIds,
                        'comprehension'
                      )
                    }}
                    className={`rounded-2xl px-3 py-3 border text-left font-sans text-sm min-h-[48px] ${
                      correct
                        ? 'bg-saffron text-white border-saffron'
                        : incorrect
                          ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-200'
                          : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
            {selectedComprehension && (
              <div className="section-shell-quiet p-4 mt-4">
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  {comprehensionCorrect ? 'Correct' : `Correct answer: ${comprehension.answer}`}
                </p>
                <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">{comprehension.explanation}</p>
              </div>
            )}
            <button
              onClick={() => {
                setGuidedIdx(index => index + 1)
                setSelectedComprehension(null)
              }}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-white font-sans text-sm font-semibold min-h-[48px]"
            >
              Next question
            </button>
          </div>

          <div className="section-shell p-4">
            <p className="eyebrow">Bridge Back Into Reading</p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">
              Use the full reader after each question so comprehension stays tied to real Gurbani, not isolated quiz answers.
            </p>
            <button
              onClick={() => navigate(`/study?source=${guided.source}&ang=${guided.ang}&bani=${encodeURIComponent(guided.title)}`)}
              className="mt-3 font-sans text-sm text-gold dark:text-gold-light underline underline-offset-2"
            >
              Open this line in Study
            </button>
          </div>
        </div>
      )}

      {track !== 'comprehension' && (
        <section className="section-shell p-4 mt-5">
          <p className="eyebrow">Assessment History</p>
          <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">
            Best score on this track: {lessonProgress[
              track === 'guided' ? guided.id :
              track === 'phonics' ? phonics.id :
              track === 'decoding' ? decoding.id :
              foundation.id
            ]?.bestScore
              ? `${Math.round((lessonProgress[
                track === 'guided' ? guided.id :
                track === 'phonics' ? phonics.id :
                track === 'decoding' ? decoding.id :
                foundation.id
              ]?.bestScore ?? 0) * 100)}%`
              : 'No score yet'}
          </p>
        </section>
      )}
    </div>
  )
}
