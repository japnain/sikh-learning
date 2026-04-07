import { useEffect, useMemo, useState } from 'react'
import type {
  EnglishSource,
  LearningGoal,
  LearningLevel,
  MeaningLanguage,
  OnboardingAudience,
  OnboardingPresentationMode,
  ScriptMode,
  UiLocale,
} from '../types'
import { renderScriptText } from '../utils/readerDisplay'
import {
  getEnglishSourceLabels,
  getLearningGoalLabels,
  getLearningLevelLabels,
  getMeaningLanguageLabels,
  getOnboardingAudienceLabels,
  getScriptModeLabels,
} from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'

type OnboardingStep = 'setup' | 'preview'
type ReadingPresetId = 'quiet' | 'guided' | 'deep'

interface Props {
  presentation: OnboardingPresentationMode
  locale: UiLocale
  scriptMode: ScriptMode
  setScriptMode: (mode: ScriptMode) => void
  showTransliteration: boolean
  setShowTransliteration: (value: boolean) => void
  meaningLanguage: MeaningLanguage
  setMeaningLanguage: (value: MeaningLanguage) => void
  englishSource: EnglishSource
  setEnglishSource: (value: EnglishSource) => void
  learningLevel: LearningLevel
  setLearningLevel: (value: LearningLevel) => void
  audience: OnboardingAudience
  setAudience: (value: OnboardingAudience) => void
  learningGoal: LearningGoal
  setLearningGoal: (value: LearningGoal) => void
  onComplete: () => void | Promise<void>
  onDismiss?: () => void
  isCompleting?: boolean
}

const TOTAL_STEPS = 2

const SAMPLE_LINE = {
  gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
  transliteration: 'ik oankaar sat naam kartaa purakh',
  meaning: {
    en: 'One Universal Creator. Truth is the Name. Creative Being.',
    pa: 'ਇੱਕ ਓਅੰਕਾਰ। ਸਤਿ ਨਾਮੁ। ਕਰਤਾ ਪੁਰਖੁ।',
    hi: 'एक ओंकार। सत्य नाम। करता पुरुष।',
  },
}

const STEP_INDEX: Record<OnboardingStep, number> = {
  setup: 1,
  preview: 2,
}

const GOAL_TO_RECOMMENDED_PRESET: Record<LearningGoal, ReadingPresetId> = {
  read: 'quiet',
  understand: 'guided',
  habit: 'guided',
}

function getPreferredMeaningLanguage(locale: UiLocale): Exclude<MeaningLanguage, 'none'> {
  if (locale === 'pa') return 'pa'
  if (locale === 'hi') return 'hi'
  return 'en'
}

function inferPreset(meaningLanguage: MeaningLanguage, showTransliteration: boolean): ReadingPresetId {
  if (meaningLanguage === 'none') return 'quiet'
  return showTransliteration ? 'guided' : 'deep'
}

function applyPreset(
  preset: ReadingPresetId,
  locale: UiLocale,
  setMeaningLanguage: (value: MeaningLanguage) => void,
  setShowTransliteration: (value: boolean) => void
) {
  const preferredMeaning = getPreferredMeaningLanguage(locale)

  if (preset === 'quiet') {
    setMeaningLanguage('none')
    setShowTransliteration(false)
    return
  }

  setMeaningLanguage(preferredMeaning)
  setShowTransliteration(preset === 'guided')
}

function getMeaningPreview(locale: UiLocale, meaningLanguage: MeaningLanguage, englishSource: EnglishSource) {
  if (meaningLanguage === 'none') return ''
  if (meaningLanguage === 'en') {
    if (englishSource === 'ms') return 'The One Reality is true by Name, the Creative Being.'
    if (englishSource === 'ssk') return 'There is One Universal Creator God. Truth is the Name. Creative Being.'
    return SAMPLE_LINE.meaning.en
  }
  if (meaningLanguage === 'hi') return SAMPLE_LINE.meaning.hi
  if (locale === 'pa') return SAMPLE_LINE.meaning.pa
  return SAMPLE_LINE.meaning.pa
}

function getPrimaryActionLabel(
  learningGoal: LearningGoal,
  copy: ReturnType<typeof getUiCopy>['onboarding']
) {
  if (learningGoal === 'understand') return copy.openWithMeaning
  if (learningGoal === 'habit') return copy.startToday
  return copy.openReader
}

function getRouteSummary(
  learningGoal: LearningGoal,
  copy: ReturnType<typeof getUiCopy>['onboarding']
) {
  if (learningGoal === 'understand') return copy.routeUnderstand
  if (learningGoal === 'habit') return copy.routeHabit
  return copy.routeRead
}

function getGoalBody(
  learningGoal: LearningGoal,
  copy: ReturnType<typeof getUiCopy>['onboarding']
) {
  if (learningGoal === 'understand') return copy.goalUnderstandBody
  if (learningGoal === 'habit') return copy.goalHabitBody
  return copy.goalReadBody
}

function SelectionCard({
  eyebrow,
  title,
  body,
  selected,
  onClick,
  badge,
}: {
  eyebrow?: string
  title: string
  body: string
  selected?: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative w-full overflow-hidden rounded-[22px] border px-4 py-3 text-left transition-[transform,border-color,background-color,color] duration-300 ${
        selected
          ? 'border-gold/55 bg-gradient-to-br from-saffron/90 via-saffron-light/85 to-gold/80 text-white shadow-gold-strong'
          : 'border-sand/15 bg-parchment-low/95 text-ink hover:-translate-y-0.5 hover:border-gold/30 hover:bg-white dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text dark:hover:border-gold/25 dark:hover:bg-dark-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className={`mb-1 text-[11px] uppercase tracking-[0.18em] ${
              selected ? 'text-white/80' : 'text-gold dark:text-gold-light'
            }`}>
              {eyebrow}
            </p>
          )}
          <p className="font-display text-xl leading-tight">{title}</p>
        </div>
        {badge && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            selected
              ? 'bg-white/20 text-white'
              : 'bg-gold/10 text-gold dark:bg-gold/15 dark:text-gold-light'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className={`mt-2 text-sm leading-5 ${
        selected ? 'text-white/85' : 'text-ink/65 dark:text-dark-text/70'
      }`}>
        {body}
      </p>
    </button>
  )
}

function GoalChoice({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition-[border-color,background-color,color] duration-200 ${
        selected
          ? 'border-gold/50 bg-gradient-to-r from-saffron to-saffron-light text-white'
          : 'border-sand/15 bg-parchment-low text-ink/75 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/75'
      }`}
    >
      {label}
    </button>
  )
}

function MiniChoice({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border px-3 py-2 text-xs font-medium transition-[border-color,background-color,color] duration-200 ${
        selected
          ? 'border-gold/50 bg-gradient-to-r from-saffron to-saffron-light text-white'
          : 'border-sand/15 bg-parchment-low text-ink/75 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/75'
      }`}
    >
      {label}
    </button>
  )
}

function StepIndicator({
  currentStep,
  locale,
}: {
  currentStep: OnboardingStep
  locale: UiLocale
}) {
  const copy = getUiCopy(locale)
  const stepNumber = STEP_INDEX[currentStep]

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-sans text-xs uppercase tracking-[0.16em] text-ink/45 dark:text-dark-text/45">
        {copy.onboarding.step} {stepNumber} {copy.common.of} {TOTAL_STEPS}
      </p>
      <div className="flex items-center gap-2">
        {(['setup', 'preview'] as const).map(step => {
          const isActive = step === currentStep
          const isComplete = STEP_INDEX[step] < stepNumber

          return (
            <span
              key={step}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                isActive
                  ? 'w-10 bg-gradient-to-r from-saffron to-saffron-light'
                  : isComplete
                    ? 'w-4 bg-gold/70'
                    : 'w-4 bg-sand/30 dark:bg-dark-text/15'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function OnboardingSheet({
  presentation,
  locale,
  scriptMode,
  setScriptMode,
  showTransliteration,
  setShowTransliteration,
  meaningLanguage,
  setMeaningLanguage,
  englishSource,
  setEnglishSource,
  learningLevel,
  setLearningLevel,
  audience,
  setAudience,
  learningGoal,
  setLearningGoal,
  onComplete,
  onDismiss,
  isCompleting = false,
}: Props) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('setup')
  const [showFineTune, setShowFineTune] = useState(false)

  const copy = getUiCopy(locale)
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const learningGoalLabels = getLearningGoalLabels(locale)
  const learningLevelLabels = getLearningLevelLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const onboardingAudienceLabels = getOnboardingAudienceLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)

  const selectedPreset = inferPreset(meaningLanguage, showTransliteration)
  const recommendedPreset = GOAL_TO_RECOMMENDED_PRESET[learningGoal]
  const goalBody = useMemo(
    () => getGoalBody(learningGoal, copy.onboarding),
    [copy.onboarding, learningGoal]
  )
  const previewScript = useMemo(
    () => renderScriptText(SAMPLE_LINE.gurmukhi, scriptMode),
    [scriptMode]
  )
  const previewMeaning = useMemo(
    () => getMeaningPreview(locale, meaningLanguage, englishSource),
    [englishSource, locale, meaningLanguage]
  )
  const routeSummary = useMemo(
    () => getRouteSummary(learningGoal, copy.onboarding),
    [copy.onboarding, learningGoal]
  )

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyOverscroll = document.body.style.overscrollBehavior
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehavior = previousBodyOverscroll
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  useEffect(() => {
    if (presentation !== 'first-run') return

    applyPreset(
      GOAL_TO_RECOMMENDED_PRESET[learningGoal],
      locale,
      setMeaningLanguage,
      setShowTransliteration
    )
  }, [learningGoal, locale, presentation, setMeaningLanguage, setShowTransliteration])

  function handleGoalSelection(goal: LearningGoal) {
    setLearningGoal(goal)
    applyPreset(
      GOAL_TO_RECOMMENDED_PRESET[goal],
      locale,
      setMeaningLanguage,
      setShowTransliteration
    )
  }

  function handlePresetSelection(preset: ReadingPresetId) {
    applyPreset(preset, locale, setMeaningLanguage, setShowTransliteration)
  }

  function renderSetupStep() {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-3xl leading-tight text-ink dark:text-dark-text">
            {copy.onboarding.intentTitle}
          </h3>
          <p className="mt-2 text-sm leading-5 text-ink/65 dark:text-dark-text/65">
            {copy.onboarding.intentBody}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['read', 'understand', 'habit'] as const).map(goal => (
            <GoalChoice
              key={goal}
              label={learningGoalLabels[goal]}
              selected={learningGoal === goal}
              onClick={() => handleGoalSelection(goal)}
            />
          ))}
        </div>

        <div className="rounded-[22px] border border-sand/15 bg-parchment-low/90 p-4 dark:border-dark-text/10 dark:bg-dark-surface">
          <p className="eyebrow">{learningGoalLabels[learningGoal]}</p>
          <p className="mt-2 text-sm leading-5 text-ink/70 dark:text-dark-text/70">
            {goalBody}
          </p>
        </div>

        <div>
          <h3 className="font-display text-3xl leading-tight text-ink dark:text-dark-text">
            {copy.onboarding.styleTitle}
          </h3>
          <p className="mt-2 text-sm leading-5 text-ink/65 dark:text-dark-text/65">
            {copy.onboarding.styleBody}
          </p>
        </div>

        <div className="space-y-3">
          <SelectionCard
            title={copy.onboarding.styleQuiet}
            body={copy.onboarding.styleQuietBody}
            selected={selectedPreset === 'quiet'}
            onClick={() => handlePresetSelection('quiet')}
            badge={recommendedPreset === 'quiet' ? copy.onboarding.recommended : undefined}
          />
          <SelectionCard
            title={copy.onboarding.styleGuided}
            body={copy.onboarding.styleGuidedBody}
            selected={selectedPreset === 'guided'}
            onClick={() => handlePresetSelection('guided')}
            badge={recommendedPreset === 'guided' ? copy.onboarding.recommended : undefined}
          />
          <SelectionCard
            title={copy.onboarding.styleDeep}
            body={copy.onboarding.styleDeepBody}
            selected={selectedPreset === 'deep'}
            onClick={() => handlePresetSelection('deep')}
          />
        </div>
      </div>
    )
  }

  function renderPreviewStep() {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-3xl leading-tight text-ink dark:text-dark-text">
            {copy.onboarding.previewTitle}
          </h3>
          <p className="mt-2 text-sm leading-5 text-ink/65 dark:text-dark-text/65">
            {copy.onboarding.previewBody}
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-sand/15 bg-[radial-gradient(circle_at_top_right,_rgba(240,171,48,0.18),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,235,220,0.92))] p-4 shadow-gold-strong dark:border-dark-text/10 dark:bg-[radial-gradient(circle_at_top_right,_rgba(240,171,48,0.18),_transparent_35%),linear-gradient(180deg,rgba(32,29,24,0.96),rgba(26,24,20,0.98))]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                {copy.onboarding.previewEyebrow}
              </p>
              <p className="mt-1 font-display text-2xl text-ink dark:text-dark-text">
                {getPrimaryActionLabel(learningGoal, copy.onboarding)}
              </p>
            </div>
            <span className="rounded-full border border-gold/25 bg-white/65 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold dark:border-gold/20 dark:bg-white/5 dark:text-gold-light">
              {copy.onboarding.ready}
            </span>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/70 bg-white/75 p-4 dark:border-white/5 dark:bg-black/20">
            <p
              className={`text-[1.65rem] leading-relaxed text-ink dark:text-dark-text ${scriptMode === 'gurmukhi' ? 'font-gurmukhi' : 'font-sans'}`}
              lang={scriptMode === 'gurmukhi' ? 'pa-Guru' : 'hi'}
            >
              {previewScript}
            </p>
            {showTransliteration && (
              <p className="mt-3 text-sm italic text-ink/60 dark:text-dark-text/60">
                {SAMPLE_LINE.transliteration}
              </p>
            )}
            {previewMeaning ? (
              <p className={`mt-3 text-sm leading-6 text-ink/70 dark:text-dark-text/70 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                {previewMeaning}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink/55 dark:text-dark-text/55">
                {copy.onboarding.textFirstBody}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-sand/15 bg-white/70 px-3 py-1.5 text-xs text-ink/70 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/70">
              {scriptModeLabels[scriptMode]}
            </span>
            <span className="rounded-full border border-sand/15 bg-white/70 px-3 py-1.5 text-xs text-ink/70 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/70">
              {meaningLanguageLabels[meaningLanguage]}
            </span>
            <span className="rounded-full border border-sand/15 bg-white/70 px-3 py-1.5 text-xs text-ink/70 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/70">
              {copy.onboarding.transliteration} {showTransliteration ? copy.common.on : copy.common.off}
            </span>
            <span className="rounded-full border border-sand/15 bg-white/70 px-3 py-1.5 text-xs text-ink/70 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/70">
              {learningLevelLabels[learningLevel]}
            </span>
          </div>
        </div>

        <div className="rounded-[24px] border border-sand/15 bg-parchment-low/90 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-surface">
          <button
            type="button"
            onClick={() => setShowFineTune(value => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="font-display text-xl text-ink dark:text-dark-text">
                {showFineTune ? copy.onboarding.hideTuning : copy.onboarding.tuneReader}
              </p>
              <p className="mt-1 text-sm leading-5 text-ink/60 dark:text-dark-text/60">
                {copy.onboarding.fineTune}
              </p>
            </div>
            <span className="rounded-full border border-gold/20 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold dark:text-gold-light">
              {showFineTune ? copy.common.hide : copy.common.show}
            </span>
          </button>

          {showFineTune && (
            <div className="mt-4 space-y-4 border-t border-sand/10 pt-4 dark:border-dark-text/10">
              <div>
                <p className="mb-2 text-sm text-ink dark:text-dark-text">{copy.onboarding.readingScript}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['gurmukhi', 'devanagari'] as const).map(mode => (
                    <MiniChoice
                      key={mode}
                      label={scriptModeLabels[mode]}
                      selected={scriptMode === mode}
                      onClick={() => setScriptMode(mode)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-ink dark:text-dark-text">{copy.onboarding.meaning}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['none', 'en', 'pa', 'hi'] as const).map(option => (
                    <MiniChoice
                      key={option}
                      label={meaningLanguageLabels[option]}
                      selected={meaningLanguage === option}
                      onClick={() => setMeaningLanguage(option)}
                    />
                  ))}
                </div>
              </div>

              {meaningLanguage === 'en' && (
                <div>
                  <p className="mb-2 text-sm text-ink dark:text-dark-text">{copy.onboarding.englishSource}</p>
                  <div className="grid gap-2">
                    {Object.entries(englishSourceLabels).map(([key, label]) => (
                      <MiniChoice
                        key={key}
                        label={label}
                        selected={englishSource === key}
                        onClick={() => setEnglishSource(key as EnglishSource)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-ink dark:text-dark-text">{copy.onboarding.transliteration}</p>
                  <p className="mt-1 text-xs text-ink/55 dark:text-dark-text/55">
                    {showTransliteration ? copy.common.on : copy.common.off}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTransliteration(!showTransliteration)}
                  aria-label="Toggle onboarding transliteration"
                  className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${
                    showTransliteration ? 'bg-gold' : 'bg-sand/30 dark:bg-dark-text/20'
                  }`}
                >
                  <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    showTransliteration ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm text-ink dark:text-dark-text">{copy.onboarding.learningLevel}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'familiar', 'daily-reader'] as const).map(level => (
                    <MiniChoice
                      key={level}
                      label={learningLevelLabels[level]}
                      selected={learningLevel === level}
                      onClick={() => setLearningLevel(level)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-ink dark:text-dark-text">{copy.onboarding.audience}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['child', 'teen', 'adult'] as const).map(option => (
                    <MiniChoice
                      key={option}
                      label={onboardingAudienceLabels[option]}
                      selected={audience === option}
                      onClick={() => setAudience(option)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const chrome = (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-sand/15 bg-parchment-card shadow-gold-strong dark:border-gold/10 dark:bg-dark-card">
      <div className="pointer-events-none absolute -right-8 top-0 h-48 w-48 rounded-full bg-saffron/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative shrink-0 border-b border-sand/10 bg-[linear-gradient(180deg,rgba(255,249,239,0.92),rgba(244,235,220,0.8))] px-5 pb-4 pt-5 dark:border-dark-text/10 dark:bg-[linear-gradient(180deg,rgba(37,33,28,0.96),rgba(30,27,23,0.88))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
              {copy.onboarding.eyebrow}
            </p>
            <h2 className="font-display text-[2.05rem] leading-none text-ink dark:text-dark-text">
              {copy.onboarding.title}
            </h2>
          </div>
          {presentation === 'overlay' && onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-sand/15 px-3 py-1.5 text-sm text-ink/70 transition-colors duration-200 hover:border-gold/25 hover:text-ink dark:border-dark-text/10 dark:text-dark-text/70 dark:hover:text-dark-text"
            >
              {copy.common.close}
            </button>
          ) : null}
        </div>
        <p className="mt-3 max-w-[28rem] text-sm leading-5 text-ink/65 dark:text-dark-text/65">
          {copy.onboarding.body}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
        <div className="space-y-4">
          <StepIndicator currentStep={currentStep} locale={locale} />

          {currentStep === 'preview' && (
            <button
              type="button"
              onClick={() => setCurrentStep('setup')}
              className="rounded-full border border-sand/15 px-3 py-1.5 text-sm text-ink/70 transition-colors duration-200 hover:border-gold/25 hover:text-ink dark:border-dark-text/10 dark:text-dark-text/70 dark:hover:text-dark-text"
            >
              {copy.common.back}
            </button>
          )}

          {currentStep === 'setup' ? renderSetupStep() : renderPreviewStep()}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-sand/10 bg-parchment-card px-5 pb-5 pt-4 dark:border-dark-text/10 dark:bg-dark-card">
        {currentStep === 'setup' ? (
          <button
            type="button"
            onClick={() => setCurrentStep('preview')}
            className="w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-sm font-semibold text-white shadow-gold-strong"
          >
            {copy.common.continueLabel}
          </button>
        ) : (
          <>
            <p className="mb-3 text-sm leading-5 text-ink/65 dark:text-dark-text/65">
              {routeSummary}
            </p>
            <button
              type="button"
              onClick={() => void onComplete()}
              disabled={isCompleting}
              className="w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light py-3 text-sm font-semibold text-white shadow-gold-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {getPrimaryActionLabel(learningGoal, copy.onboarding)}
            </button>
          </>
        )}
      </div>
    </div>
  )

  if (presentation === 'overlay') {
    return (
      <div
        className="fixed inset-0 z-[110] overflow-hidden bg-ink/55 backdrop-blur-sm dark:bg-black/80"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-4"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 1rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          }}
        >
          {chrome}
        </div>
      </div>
    )
  }

  return (
    <main className="app-shell app-shell--first-run bg-parchment transition-colors duration-300 dark:bg-dark-bg">
      <div
        className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        }}
      >
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <p className="font-display text-4xl leading-none text-ink dark:text-dark-text">Nitnem</p>
            <p className="mt-2 text-sm text-ink/55 dark:text-dark-text/55">{copy.home.promise}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 pb-4">
          {chrome}
        </div>
      </div>
    </main>
  )
}
