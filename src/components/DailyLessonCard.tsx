import { useMemo, useRef, useState } from 'react'
import type { DailyLesson, DailyLessonStep } from '../types'
import { useLearningStore } from '../store/learning'
import { useVocabStore } from '../store/vocab'
import { toLocalDayStamp } from '../utils/learnDates'
import useMilestoneCheck from '../hooks/useMilestoneCheck'
import { useLanguageStore } from '../store/language'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'

interface Props {
  lesson: DailyLesson
  currentStep: DailyLessonStep | null
  timeEstimate: number
  isComplete: boolean
  onCompleteStep: (stepId: string) => void
  onOpenModule: (moduleId: string) => void
  onOpenStudy: (source: 'G' | 'D', ang: number, baniTitle?: string) => void
}

export default function DailyLessonCard({
  lesson,
  currentStep,
  timeEstimate,
  isComplete,
  onCompleteStep,
  onOpenModule,
  onOpenStudy,
}: Props) {
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const reviewWord = useVocabStore(state => state.reviewWord)
  const recordPracticeSession = useLearningStore(state => state.recordPracticeSession)
  const lastPracticedOn = useLearningStore(state => state.lastPracticedOn)
  const checkMilestones = useMilestoneCheck()
  const [reviewedWords, setReviewedWords] = useState<string[]>([])
  const pulseTimeoutRef = useRef<number | null>(null)
  const today = toLocalDayStamp(new Date())
  const pulseClass = isComplete ? 'animate-[pulse_1.8s_ease-in-out_1]' : ''

  const remainingSteps = useMemo(
    () => lesson.steps.filter(step => !lesson.completedStepIds.includes(step.id)),
    [lesson.completedStepIds, lesson.steps]
  )

  const finalizeStep = (stepId: string) => {
    const isLastOpenStep = remainingSteps.length === 1 && remainingSteps[0]?.id === stepId
    onCompleteStep(stepId)

    if (isLastOpenStep && lastPracticedOn !== today) {
      recordPracticeSession()
    }

    if (isLastOpenStep) {
      setReviewedWords([])
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current)
      }
      pulseTimeoutRef.current = window.setTimeout(() => {
        pulseTimeoutRef.current = null
      }, 1800)
    }

    checkMilestones()
  }

  const renderCurrentStep = () => {
    if (!currentStep) {
      return (
        <div className={`section-shell-quiet mt-4 px-4 py-4 ${pulseClass}`}>
          <p className="eyebrow">Completed</p>
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
            You finished today’s lesson.
          </p>
          <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
            Come back tomorrow for a fresh sequence built from your current progress.
          </p>
        </div>
      )
    }

    if (currentStep.kind === 'vocab-review' && currentStep.vocabWords) {
      return (
        <div className="section-shell-quiet mt-4 px-4 py-4">
          <p className="eyebrow">Vocab Review</p>
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
            {currentStep.title}
          </p>
          <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
            {currentStep.body}
          </p>
          <div className="mt-4 space-y-2">
            {currentStep.vocabWords.map(word => {
              const isReviewed = reviewedWords.includes(word)
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => {
                    if (isReviewed) return
                    reviewWord(word, 'good')
                    const nextReviewedWords = [...reviewedWords, word]
                    setReviewedWords(nextReviewedWords)
                    if (nextReviewedWords.length >= currentStep.vocabWords!.length) {
                      finalizeStep(currentStep.id)
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left font-sans text-sm ${
                    isReviewed
                      ? 'border-saffron/30 bg-saffron/10 text-saffron dark:text-saffron-light'
                      : 'border-sand/15 bg-white/70 text-ink dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text'
                  }`}
                >
                  <span>{word}</span>
                  <span className="text-xs uppercase tracking-[0.18em]">
                    {isReviewed ? 'Done' : 'Review'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (currentStep.kind === 'quick-connect') {
      return (
        <div className="section-shell-quiet mt-4 px-4 py-4">
          <p className="eyebrow">Quick Connect</p>
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
            {currentStep.title}
          </p>
          <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
            {currentStep.body}
          </p>
          {currentStep.gurmukhi ? (
            <p
              lang={getScriptTextLang(scriptMode)}
              className={`mt-4 ${getScriptTextFontClass(scriptMode)} text-2xl leading-relaxed text-ink dark:text-dark-text`}
            >
              {renderScriptText(currentStep.gurmukhi, scriptMode)}
            </p>
          ) : null}
          {currentStep.transliteration ? (
            <p className="mt-2 font-sans text-sm italic text-ink/55 dark:text-dark-text/55">
              {currentStep.transliteration}
            </p>
          ) : null}
          {currentStep.meaning ? (
            <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">
              {currentStep.meaning}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {currentStep.source && currentStep.ang ? (
              <button
                type="button"
                onClick={() => onOpenStudy(currentStep.source!, currentStep.ang!, currentStep.baniTitle)}
                className="rounded-2xl section-shell px-4 py-3 font-sans text-sm text-ink dark:text-dark-text"
              >
                Open in Study
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => finalizeStep(currentStep.id)}
              className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 font-sans text-sm font-semibold text-white"
            >
              Mark complete
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="section-shell-quiet mt-4 px-4 py-4">
        <p className="eyebrow">
          {currentStep.kind === 'grammar-note'
            ? 'Grammar Note'
            : currentStep.kind === 'word-family'
              ? 'Word Family'
              : 'Module'}
        </p>
        <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
          {currentStep.title}
        </p>
        <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
          {currentStep.body}
        </p>
        <p className="mt-3 font-sans text-xs text-ink/45 dark:text-dark-text/45">
          This step completes when you finish the linked module.
        </p>
        {currentStep.moduleId ? (
          <button
            type="button"
            onClick={() => onOpenModule(currentStep.moduleId!)}
            className="mt-4 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 font-sans text-sm font-semibold text-white"
          >
            Open module
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <section className={`hero-surface p-5 ${pulseClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Today&apos;s Lesson</p>
          <p className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
            {timeEstimate} min
          </p>
          <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
            {lesson.completedStepIds.length} of {lesson.steps.length} steps done
          </p>
        </div>
        <div className="flex gap-1.5">
          {lesson.steps.map(step => {
            const isDone = lesson.completedStepIds.includes(step.id)
            const isCurrent = step.id === currentStep?.id
            return (
              <span
                key={step.id}
                className={`h-2.5 w-2.5 rounded-full ${
                  isDone
                    ? 'bg-saffron'
                    : isCurrent
                      ? 'bg-gold dark:bg-gold-light'
                      : 'bg-sand/25 dark:bg-dark-text/15'
                }`}
              />
            )
          })}
        </div>
      </div>
      {renderCurrentStep()}
    </section>
  )
}
