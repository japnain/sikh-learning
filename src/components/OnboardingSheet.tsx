import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { getEditorialCopy } from '../content/editorialCopy'
import { signInWithProvider } from '../insforge/runtime'
import { useCloudSyncStore } from '../store/cloudSync'
import NaamRasLogoMark from './NaamRasLogoMark'
import { IconHeart, IconLeaf, IconLibrary, IconStar, IconUsers } from './icons'

type OnboardingStep = 'setup' | 'preview'
type ReadingPresetId = 'quiet' | 'guided' | 'deep'
type OnboardingProvider = 'google' | 'github' | 'apple'
type OnboardingIntentId = 'habit' | 'peace' | 'grow' | 'understand' | 'explore'
type IntentIcon = (props: { className?: string; size?: number }) => ReactNode

interface OnboardingIntentChoice {
  id: OnboardingIntentId
  title: string
  body: string
  goal: LearningGoal
  preset: ReadingPresetId
  learningLevel: LearningLevel
  audience: OnboardingAudience
  icon: IntentIcon
  tone: 'gold' | 'terracotta' | 'sage' | 'mauve' | 'slate'
  legacyLabel?: string
}

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

const ONBOARDING_PROVIDER_ORDER: OnboardingProvider[] = ['google', 'github', 'apple']

const ONBOARDING_PROVIDER_LABELS: Record<OnboardingProvider, keyof ReturnType<typeof getUiCopy>['onboarding']> = {
  google: 'authGoogle',
  github: 'authGithub',
  apple: 'authApple',
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
  meaningLanguage: MeaningLanguage,
  copy: ReturnType<typeof getUiCopy>['onboarding']
) {
  if (learningGoal === 'understand') return meaningLanguage === 'none' ? copy.openReader : copy.openWithMeaning
  if (learningGoal === 'habit') return copy.startToday
  return copy.openReader
}

function getRouteSummary(
  learningGoal: LearningGoal,
  meaningLanguage: MeaningLanguage,
  copy: ReturnType<typeof getUiCopy>['onboarding']
) {
  if (learningGoal === 'understand') return meaningLanguage === 'none' ? copy.routeRead : copy.routeUnderstand
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

function getPresetTitle(preset: ReadingPresetId, copy: ReturnType<typeof getUiCopy>['onboarding']) {
  if (preset === 'quiet') return copy.styleQuiet
  if (preset === 'guided') return copy.styleGuided
  return copy.styleDeep
}

function getDefaultIntentId(learningGoal: LearningGoal, presentation: OnboardingPresentationMode): OnboardingIntentId {
  if (learningGoal === 'understand') return 'understand'
  if (learningGoal === 'habit') return 'habit'
  return presentation === 'first-run' ? 'habit' : 'peace'
}

function getIntentToneClasses(tone: OnboardingIntentChoice['tone'], selected: boolean) {
  const tones = {
    gold: selected
      ? 'border-gold/42 bg-gold/14 text-gold-dark dark:border-gold/38 dark:bg-gold/16 dark:text-gold-light'
      : 'border-gold/18 bg-gold/10 text-gold-dark dark:border-gold/24 dark:bg-gold/12 dark:text-gold-light',
    terracotta: selected
      ? 'border-[#c97a5d]/42 bg-[#c97a5d]/14 text-[#9d4e35] dark:border-[#df987f]/38 dark:bg-[#c97a5d]/18 dark:text-[#f0b39d]'
      : 'border-[#c97a5d]/16 bg-[#c97a5d]/10 text-[#a9573d] dark:border-[#df987f]/22 dark:bg-[#c97a5d]/12 dark:text-[#efb29d]',
    sage: selected
      ? 'border-[#7a8f6d]/42 bg-[#7a8f6d]/16 text-[#4d704f] dark:border-[#a8c29a]/38 dark:bg-[#7a8f6d]/20 dark:text-[#bfd4b4]'
      : 'border-[#7a8f6d]/18 bg-[#7a8f6d]/10 text-[#557456] dark:border-[#a8c29a]/22 dark:bg-[#7a8f6d]/12 dark:text-[#bfd4b4]',
    mauve: selected
      ? 'border-[#8e7ab5]/42 bg-[#8e7ab5]/16 text-[#66518f] dark:border-[#b3a1dd]/38 dark:bg-[#8e7ab5]/20 dark:text-[#c8b9ee]'
      : 'border-[#8e7ab5]/18 bg-[#8e7ab5]/10 text-[#6d5795] dark:border-[#b3a1dd]/22 dark:bg-[#8e7ab5]/12 dark:text-[#c8b9ee]',
    slate: selected
      ? 'border-[#6c7b8a]/42 bg-[#6c7b8a]/14 text-[#465765] dark:border-[#9aa8b5]/35 dark:bg-[#6c7b8a]/18 dark:text-[#c3ccd5]'
      : 'border-[#6c7b8a]/16 bg-[#6c7b8a]/9 text-[#536473] dark:border-[#9aa8b5]/22 dark:bg-[#6c7b8a]/12 dark:text-[#c3ccd5]',
  }

  return tones[tone]
}

function IntentChoice({
  choice,
  selected,
  onClick,
  presetLabel,
  selectedLabel,
}: {
  choice: OnboardingIntentChoice
  selected: boolean
  onClick: () => void
  presetLabel: string
  selectedLabel: string
}) {
  const Icon = choice.icon

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-[transform,border-color,background-color,color,box-shadow] duration-200 ${
        selected
          ? 'border-gold/46 bg-[linear-gradient(180deg,rgba(255,250,241,0.98),rgba(247,237,219,0.94))] text-ink shadow-[0_12px_26px_rgba(122,84,32,0.12),inset_0_0_0_1px_rgba(155,99,40,0.14)] dark:border-gold/38 dark:bg-[linear-gradient(180deg,rgba(46,35,55,0.98),rgba(28,22,38,0.94))] dark:text-dark-text'
          : 'border-sand/20 bg-white/64 text-ink/82 hover:border-gold/30 hover:bg-white/82 dark:border-dark-text/10 dark:bg-white/[0.045] dark:text-dark-text/76 dark:hover:border-gold/22'
      }`}
      data-testid={`onboarding-intent-${choice.id}`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${getIntentToneClasses(choice.tone, selected)}`}>
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm font-semibold leading-tight text-ink dark:text-dark-text">
          {choice.title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-ink/60 dark:text-dark-text/65">
          {choice.body}
        </span>
        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${
          selected
            ? 'bg-gold/16 text-gold-dark dark:bg-gold/16 dark:text-gold-light'
            : 'bg-gold/8 text-gold dark:bg-gold/12 dark:text-gold-light'
        }`}>
          {selected ? `${selectedLabel} · ${presetLabel}` : presetLabel}
        </span>
        {choice.legacyLabel ? <span className="sr-only">{choice.legacyLabel}</span> : null}
      </span>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
        selected
          ? 'border-gold bg-gold text-white dark:border-gold-light dark:bg-gold-light dark:text-dark-bg'
          : 'border-sand/35 bg-white/40 text-transparent dark:border-dark-text/25 dark:bg-white/5'
      }`}>
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
      </span>
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
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-[border-color,background-color,color] duration-200 ${
        selected
          ? 'border-gold/50 bg-gold/14 text-gold-dark dark:bg-gold/14 dark:text-gold-light'
          : 'border-sand/18 bg-parchment-low text-ink/75 dark:border-dark-text/10 dark:bg-white/[0.04] dark:text-dark-text/75'
      }`}
    >
      {label}
    </button>
  )
}

function ProviderChoice({
  label,
  onClick,
  disabled,
  dataAiAction,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  dataAiAction?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ai-action={dataAiAction}
      className="rounded-lg border border-sand/18 bg-white/72 px-4 py-3 text-sm font-medium text-ink transition-[border-color,background-color] duration-200 hover:border-gold/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-text/10 dark:bg-white/[0.04] dark:text-dark-text dark:hover:border-gold/25 dark:hover:bg-white/10"
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
  const [showBackup, setShowBackup] = useState(false)

  const copy = getUiCopy(locale)
  const {
    configured,
    status: cloudStatus,
    currentUser,
    availableProviders,
    lastError,
  } = useCloudSyncStore()
  const editorial = getEditorialCopy(locale)
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const learningGoalLabels = getLearningGoalLabels(locale)
  const learningLevelLabels = getLearningLevelLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const onboardingAudienceLabels = getOnboardingAudienceLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const intentChoices = useMemo<OnboardingIntentChoice[]>(() => [
    {
      id: 'habit',
      title: 'Build a daily reading habit',
      body: 'Stay consistent with scripture',
      goal: 'habit',
      preset: 'guided',
      learningLevel: 'beginner',
      audience: 'adult',
      icon: IconLibrary,
      tone: 'gold',
      legacyLabel: learningGoalLabels.habit,
    },
    {
      id: 'peace',
      title: 'Find peace and clarity',
      body: 'Calm my mind, center my heart',
      goal: 'read',
      preset: 'quiet',
      learningLevel: 'beginner',
      audience: 'adult',
      icon: IconHeart,
      tone: 'terracotta',
      legacyLabel: learningGoalLabels.read,
    },
    {
      id: 'grow',
      title: 'Grow spiritually',
      body: 'Deepen my connection',
      goal: 'habit',
      preset: 'deep',
      learningLevel: 'daily-reader',
      audience: 'adult',
      icon: IconLeaf,
      tone: 'sage',
    },
    {
      id: 'understand',
      title: 'Understand scripture',
      body: 'Learn with meaning and context',
      goal: 'understand',
      preset: 'guided',
      learningLevel: 'familiar',
      audience: 'adult',
      icon: IconUsers,
      tone: 'mauve',
      legacyLabel: learningGoalLabels.understand,
    },
    {
      id: 'explore',
      title: 'Just exploring',
      body: 'I am not sure yet',
      goal: 'read',
      preset: 'guided',
      learningLevel: 'beginner',
      audience: 'adult',
      icon: IconStar,
      tone: 'slate',
    },
  ], [learningGoalLabels.habit, learningGoalLabels.read, learningGoalLabels.understand])
  const [selectedIntentId, setSelectedIntentId] = useState<OnboardingIntentId>(() => getDefaultIntentId(learningGoal, presentation))
  const selectedIntent = intentChoices.find(choice => choice.id === selectedIntentId) ?? intentChoices[0]
  const initialIntentAppliedRef = useRef(false)

  const selectedPreset = inferPreset(meaningLanguage, showTransliteration)
  const selectedPresetTitle = useMemo(() => {
    if (selectedPreset === 'quiet') return copy.onboarding.styleQuiet
    if (selectedPreset === 'guided') return copy.onboarding.styleGuided
    return copy.onboarding.styleDeep
  }, [copy.onboarding.styleDeep, copy.onboarding.styleGuided, copy.onboarding.styleQuiet, selectedPreset])
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
    () => getRouteSummary(learningGoal, meaningLanguage, copy.onboarding),
    [copy.onboarding, learningGoal, meaningLanguage]
  )
  const supportedProviders = useMemo(
    () => ONBOARDING_PROVIDER_ORDER.filter(provider => availableProviders.includes(provider)),
    [availableProviders]
  )
  const isCloudBusy = cloudStatus === 'booting' || cloudStatus === 'authenticating' || cloudStatus === 'syncing'
  const isProviderLoading = configured && !currentUser && supportedProviders.length === 0 && isCloudBusy
  const connectedLabel = currentUser?.email ?? currentUser?.name ?? null
  const hasSignedInCloudIssue = Boolean(currentUser && lastError)
  const onboardingAuthState = isCloudBusy
    ? 'loading'
    : hasSignedInCloudIssue
      ? 'degraded'
      : currentUser
        ? 'ready'
        : 'empty'
  const onboardingErrorCode = hasSignedInCloudIssue ? 'cloud-sync' : null

  useEffect(() => {
    if (presentation !== 'overlay') return

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
  }, [presentation])

  useEffect(() => {
    if (presentation !== 'first-run' || initialIntentAppliedRef.current) return

    initialIntentAppliedRef.current = true
    setLearningGoal(selectedIntent.goal)
    setLearningLevel(selectedIntent.learningLevel)
    setAudience(selectedIntent.audience)
    applyPreset(
      selectedIntent.preset,
      locale,
      setMeaningLanguage,
      setShowTransliteration
    )
  }, [
    locale,
    presentation,
    selectedIntent.audience,
    selectedIntent.goal,
    selectedIntent.learningLevel,
    selectedIntent.preset,
    setAudience,
    setLearningGoal,
    setLearningLevel,
    setMeaningLanguage,
    setShowTransliteration,
  ])

  function handleIntentSelection(choice: OnboardingIntentChoice) {
    setSelectedIntentId(choice.id)
    setLearningGoal(choice.goal)
    setLearningLevel(choice.learningLevel)
    setAudience(choice.audience)
    applyPreset(
      choice.preset,
      locale,
      setMeaningLanguage,
      setShowTransliteration
    )
  }

  async function handleProviderSignIn(provider: OnboardingProvider) {
    if (isCompleting || isCloudBusy) return

    await onComplete()
    await signInWithProvider(provider)
  }

  function renderAuthSection(className = '') {
    return (
      <div
        className={`space-y-3 ${className}`}
        data-ai-surface="onboarding-auth"
        data-ai-state={onboardingAuthState}
        data-ai-error={onboardingErrorCode ?? undefined}
      >
        <div className="max-w-[28rem] space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/65">
            {currentUser ? copy.onboarding.authConnected : copy.onboarding.authTitle}
          </p>
          <p className="text-sm leading-6 text-ink/65 dark:text-dark-text/70">
            {currentUser
              ? copy.onboarding.authConnectedBody
              : isProviderLoading
                ? copy.onboarding.authChecking
                : copy.onboarding.authBody}
          </p>
        </div>

        {connectedLabel && (
          <p className="rounded-full border border-white/70 bg-white/72 px-3 py-1.5 text-xs text-ink/70 dark:border-white/5 dark:bg-black/15 dark:text-dark-text/70">
            {connectedLabel}
          </p>
        )}

        {lastError && !currentUser && (
          <p className="rounded-[18px] border border-sand/15 bg-white/72 px-3 py-2 text-xs leading-5 text-ink/70 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/70">
            {lastError}
          </p>
        )}

        {!currentUser && (
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={isCompleting || isCloudBusy}
            className="w-full rounded-[20px] border border-sand/15 bg-white/78 px-4 py-3 text-sm font-medium text-ink transition-colors duration-200 hover:border-gold/25 hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/5 dark:bg-white/[0.05] dark:text-dark-text dark:hover:text-gold-light"
          >
            {copy.onboarding.authGuest}
          </button>
        )}

        {!currentUser && supportedProviders.length > 0 && (
          <div className={`grid gap-2 ${supportedProviders.length === 1 ? 'grid-cols-1' : supportedProviders.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {supportedProviders.map(provider => (
              <ProviderChoice
                key={provider}
                label={copy.onboarding[ONBOARDING_PROVIDER_LABELS[provider]]}
                disabled={isCompleting || isCloudBusy}
                onClick={() => void handleProviderSignIn(provider)}
                dataAiAction={`onboarding-sign-in-${provider}`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderSetupStep() {
    return (
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="text-center">
            <NaamRasLogoMark
              size={54}
              seal
              className="mx-auto drop-shadow-[0_10px_22px_rgba(122,84,32,0.14)]"
              testId="onboarding-brand-mark"
            />
            <h3 className="mt-3 font-display text-[2rem] leading-none text-ink dark:text-dark-text">
              Welcome to NaamRas
            </h3>
            <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-ink/65 dark:text-dark-text/70">
              Begin your journey with a simple intention.
            </p>
          </div>

          <section
            className="sr-only"
            data-testid="onboarding-session-brief"
          >
            {[
              [copy.onboarding.setupDirectionLabel, selectedIntent.title],
              [copy.onboarding.stylePanelEyebrow, selectedPresetTitle],
              [copy.onboarding.previewEyebrow, routeSummary],
            ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-sand/12 bg-parchment-low/70 px-2.5 py-2 dark:border-dark-text/10 dark:bg-white/[0.04]">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-gold dark:text-gold-light">
                  {label}
                </p>
                <p className="mt-1 line-clamp-2 font-sans text-[11px] leading-4 text-ink/70 dark:text-dark-text/75">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <div>
            <p className="mb-3 font-display text-[1.35rem] leading-none text-ink dark:text-dark-text">
              I&apos;m here to...
            </p>
            <div className="grid gap-2">
              {intentChoices.map(choice => (
                <IntentChoice
                  key={choice.id}
                  choice={choice}
                  selected={selectedIntentId === choice.id}
                  onClick={() => handleIntentSelection(choice)}
                  selectedLabel={copy.common.selected}
                  presetLabel={getPresetTitle(choice.preset, copy.onboarding)}
                />
              ))}
            </div>
          </div>

          <div
            className="sr-only"
            data-testid="onboarding-setup-helper"
            data-ai-surface="onboarding-setup-helper"
          >
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-saffron to-gold shadow-[0_0_18px_rgba(224,154,70,0.45)]" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                  Curated setup · {getPresetTitle(selectedIntent.preset, copy.onboarding)}
                </p>
                <p className="mt-1 text-sm leading-6 text-ink/70 dark:text-dark-text/70">
                  {goalBody}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    learningGoalLabels[selectedIntent.goal],
                    learningLevelLabels[selectedIntent.learningLevel],
                    onboardingAudienceLabels[selectedIntent.audience],
                  ].map(label => (
                    <span
                      key={label}
                      className="rounded-full border border-sand/15 bg-white/58 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/55 dark:border-dark-text/10 dark:bg-white/[0.05] dark:text-dark-text/62"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="sr-only">
            {(['read', 'understand', 'habit'] as const).map(goal => (
              <span key={goal}>
                {goal === selectedIntent.goal ? learningGoalLabels[goal] : null}
              </span>
            ))}
          </div>
        </div>

        <section className="sr-only" aria-label={copy.onboarding.stylePanelEyebrow} data-testid="onboarding-style-panel">
          <p>{copy.onboarding.styleTitle}</p>
          <p>{copy.onboarding.styleBody}</p>
          <p>{copy.onboarding.recommended}</p>
          <p>{selectedPresetTitle}</p>
        </section>
      </div>
    )
  }

  function renderPreviewStep() {
    const previewSupportSummary = showTransliteration
      ? `${copy.onboarding.transliteration} ${copy.common.on}`
      : previewMeaning
        ? meaningLanguageLabels[meaningLanguage]
        : copy.onboarding.textFirstLabel
    const previewSummaryLine = [selectedPresetTitle, scriptModeLabels[scriptMode], previewSupportSummary].join(' · ')
    const primaryActionLabel = getPrimaryActionLabel(learningGoal, meaningLanguage, copy.onboarding)

    return (
      <div className="space-y-4">
        <div className={presentation === 'first-run' ? 'sr-only' : 'max-w-[27rem]'}>
          <h3 className="font-display text-[1.8rem] leading-tight text-ink dark:text-dark-text">
            {copy.onboarding.previewTitle}
          </h3>
          <p className="mt-2 text-sm leading-5 text-ink/60 dark:text-dark-text/65">
            {copy.onboarding.previewBody}
          </p>
        </div>

        <div
          className="overflow-hidden rounded-xl border border-gold/18 bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(244,235,220,0.9))] p-4 shadow-[0_12px_28px_rgba(122,84,32,0.10)] dark:border-gold/14 dark:bg-[linear-gradient(180deg,rgba(35,28,45,0.96),rgba(25,20,34,0.96))]"
          data-testid="onboarding-preview-hero"
          data-ai-surface="onboarding-preview-hero"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                {copy.onboarding.previewEyebrow}
              </p>
              <p className="mt-2 font-display text-[1.8rem] leading-none text-ink dark:text-dark-text">
                {primaryActionLabel}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ink/50 dark:text-dark-text/55">
                {previewSummaryLine}
              </p>
            </div>
            <span className="rounded-full border border-gold/18 bg-white/65 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold dark:border-gold/20 dark:bg-white/5 dark:text-gold-light">
              {copy.onboarding.ready}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-sand/12 bg-white/72 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] dark:border-dark-text/10 dark:bg-black/18">
            <p
              className={`text-[1.72rem] leading-relaxed text-ink dark:text-dark-text ${scriptMode === 'gurmukhi' ? 'font-gurmukhi' : 'font-sans'}`}
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
              <p className={`mt-4 text-sm leading-6 text-ink/70 dark:text-dark-text/70 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                {previewMeaning}
              </p>
            ) : (
              <p className="mt-4 text-sm leading-6 text-ink/55 dark:text-dark-text/55">
                {copy.onboarding.textFirstBody}
              </p>
            )}
          </div>

        </div>
      </div>
    )
  }

  const isOverlayPresentation = presentation === 'overlay'
  const titleId = 'onboarding-title'
  const descriptionId = 'onboarding-description'
  const fineTunePanelId = 'onboarding-fine-tune-panel'

  const chrome = (
    <div
      className={`relative flex flex-col ${
        isOverlayPresentation
          ? 'h-full min-h-0 overflow-hidden rounded-xl border border-sand/15 bg-parchment-card shadow-gold-strong dark:border-gold/10 dark:bg-dark-card'
          : 'min-h-0 flex-1 overflow-visible'
      }`}
      data-testid={isOverlayPresentation ? 'onboarding-dialog' : 'onboarding-first-run-panel'}
      data-ai-surface={isOverlayPresentation ? 'onboarding-overlay-panel' : 'onboarding-first-run-panel'}
      data-ai-state="ready"
    >
      <div className={`relative shrink-0 ${
        !isOverlayPresentation
          ? 'sr-only'
          : isOverlayPresentation
          ? 'border-b border-sand/10 bg-[linear-gradient(180deg,rgba(255,249,239,0.92),rgba(244,235,220,0.8))] px-5 pb-4 pt-5 dark:border-dark-text/10 dark:bg-[linear-gradient(180deg,rgba(35,28,45,0.96),rgba(25,20,34,0.88))]'
          : 'px-1 pb-3 pt-1'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
              {copy.onboarding.eyebrow}
            </p>
            <h2 id={titleId} className="font-display text-[1.55rem] leading-tight text-ink dark:text-dark-text">
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
        <p id={descriptionId} className="mt-2 max-w-[28rem] text-xs leading-5 text-ink/65 dark:text-dark-text/65">
          {editorial?.onboarding.brandBody ?? copy.onboarding.body}
        </p>
      </div>

      <div className={`relative ${
        isOverlayPresentation
          ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4'
          : currentStep === 'preview'
            ? 'px-1 pb-80'
            : 'px-1 pb-28'
      }`}>
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

      <div className={`shrink-0 ${
        isOverlayPresentation
          ? 'relative border-t border-sand/10 bg-parchment-card px-5 pb-5 pt-4 dark:border-dark-text/10 dark:bg-dark-card'
          : currentStep === 'preview'
            ? 'fixed inset-x-4 bottom-[calc(var(--safe-area-bottom)+1rem)] z-[80] mx-auto max-w-md px-0'
            : 'fixed inset-x-4 bottom-[calc(var(--safe-area-bottom)+1rem)] z-[80] mx-auto max-w-md px-0'
      }`}>
        {currentStep === 'setup' ? (
          <div
            className={isOverlayPresentation
              ? 'space-y-0'
              : 'rounded-xl border border-sand/18 bg-parchment-card px-4 py-4 shadow-[0_-10px_24px_rgba(122,84,32,0.10)] dark:border-white/5 dark:bg-dark-card'}
            data-testid="onboarding-setup-action-bar"
            data-ai-surface="onboarding-setup-action-bar"
          >
            {!isOverlayPresentation && (
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink/55 dark:text-dark-text/55">
                {copy.common.selected} · {selectedPresetTitle}
              </p>
            )}
            <button
              type="button"
              onClick={() => setCurrentStep('preview')}
              className="w-full rounded-lg bg-gradient-to-r from-saffron to-saffron-light py-3 text-sm font-semibold text-white shadow-gold-strong"
              data-testid="onboarding-setup-primary-action"
            >
              {copy.common.continueLabel}
            </button>
          </div>
        ) : (
          <div
            className={`${
              isOverlayPresentation
                ? 'border-t border-sand/10 bg-parchment-card px-5 pb-5 pt-4 dark:border-dark-text/10 dark:bg-dark-card'
                : 'rounded-xl border border-sand/18 bg-parchment-card px-4 py-4 shadow-[0_-10px_24px_rgba(122,84,32,0.10)] dark:border-white/5 dark:bg-dark-card'
            }`}
            data-testid="onboarding-preview-action-bar"
            data-ai-surface="onboarding-preview-action-bar"
          >
            <div className="space-y-3">
              <div className="max-w-[28rem] space-y-1">
                <p className="text-[11px] tracking-[0.12em] text-ink/40 dark:text-dark-text/40">
                  {copy.onboarding.previewSupportTitle}
                </p>
                <p className="text-sm leading-6 text-ink/70 dark:text-dark-text/70">
                  {routeSummary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void onComplete()}
                disabled={isCompleting || (!currentUser && isCloudBusy)}
                data-testid="onboarding-preview-primary-action"
                data-ai-action="complete-onboarding"
                className="w-full rounded-lg bg-gradient-to-r from-saffron to-saffron-light py-4 text-sm font-semibold text-white shadow-gold-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {getPrimaryActionLabel(learningGoal, meaningLanguage, copy.onboarding)}
              </button>

              <div className="rounded-lg border border-sand/18 bg-white/60 px-3 py-3 dark:border-dark-text/10 dark:bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setShowBackup(value => !value)}
                  aria-expanded={showBackup}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  data-testid="onboarding-backup-toggle"
                >
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.16em] text-gold dark:text-gold-light">
                      {copy.onboarding.authTitle}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ink/60 dark:text-dark-text/60">
                      {copy.onboarding.authBody}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-sand/20 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-ink/50 dark:border-dark-text/14 dark:text-dark-text/55">
                    {showBackup ? copy.common.hide : copy.common.show}
                  </span>
                </button>

                {showBackup ? renderAuthSection('mt-3 border-t border-sand/12 pt-3 dark:border-dark-text/10') : null}
              </div>

              <div className="space-y-2" data-testid="onboarding-preview-tune-row">
                <button
                  type="button"
                  onClick={() => setShowFineTune(value => !value)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-ink/55 transition-colors duration-200 hover:text-ink/70 dark:text-dark-text/60 dark:hover:text-dark-text/85"
                  aria-expanded={showFineTune}
                  aria-controls={fineTunePanelId}
                >
                  <span>{showFineTune ? copy.onboarding.hideTuning : copy.onboarding.tuneReader}</span>
                  <span className="rounded-full border border-sand/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-ink/45 dark:border-dark-text/14 dark:text-dark-text/50">
                    {showFineTune ? copy.common.hide : copy.common.show}
                  </span>
                </button>
                <p className="max-w-[28rem] text-xs leading-5 text-ink/55 dark:text-dark-text/60">
                  {copy.onboarding.fineTune}
                </p>
              </div>
            </div>

            {showFineTune && (
              <div
                id={fineTunePanelId}
                className="mt-4 space-y-4 rounded-lg border border-sand/15 bg-white/72 p-4 shadow-[0_10px_22px_rgba(122,84,32,0.08)] dark:border-dark-text/10 dark:bg-white/[0.04]"
              >
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
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-testid="onboarding-overlay"
        data-page="onboarding-overlay"
        data-ai-surface="onboarding-overlay"
        data-ai-state="ready"
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
    <main
      className="app-shell app-shell--first-run bg-parchment transition-colors duration-300 dark:bg-dark-bg overflow-y-auto"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-testid="onboarding-first-run"
      data-page="onboarding"
      data-ai-surface="onboarding"
      data-ai-state="ready"
    >
      <div
        className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        }}
      >
        <header className="sr-only">
          <div className="min-w-0">
            <p className="font-display text-[1.8rem] leading-none text-ink dark:text-dark-text">{editorial?.brand.name ?? 'NaamRas'}</p>
            <p className="mt-1 max-w-[22rem] text-xs leading-4 text-ink/60 dark:text-dark-text/60">{editorial?.brand.promise ?? copy.home.promise}</p>
          </div>
          <span className="shrink-0 rounded-full border border-sand/18 bg-white/62 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark dark:border-dark-text/10 dark:bg-white/[0.05] dark:text-gold-light">
            {copy.onboarding.ready}
          </span>
        </header>
        <div className="pb-4">
          {chrome}
        </div>
      </div>
    </main>
  )
}
