import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import CloudSyncPanel from '../components/CloudSyncPanel'
import DisclosureSection from '../components/DisclosureSection'
import SoundscapeControls from '../components/SoundscapeControls'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, compareNitnemOptions, NITNEM_ROUTE_OPTIONS, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import {
  getEnglishSourceLabels,
  getHindiSourceLabels,
  getLearningGoalLabels,
  getLearningLevelLabels,
  getLineSpacingLabels,
  getMeaningLanguageLabels,
  getOnboardingAudienceLabels,
  getPunjabiSourceLabels,
  getScriptModeLabels,
  getTextAlignmentLabels,
  getUiLocaleLabels,
  getVisraamSourceLabels,
} from '../utils/translations'
import { renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight } from '../components/icons'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'

function SettingsBlock({
  title,
  description,
  children,
  headingId,
  testId,
}: {
  title: string
  description?: string
  children: ReactNode
  headingId?: string
  testId?: string
}) {
  return (
    <div
      className="section-shell px-4 py-4"
      aria-labelledby={headingId}
      data-testid={testId}
    >
      <p id={headingId} className="eyebrow">{title}</p>
      {description ? (
        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-1 mb-3">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export default function More() {
  const navigate = useNavigate()
  const {
    scriptMode,
    setScriptMode,
    showTransliteration,
    setShowTransliteration,
    meaningLanguage,
    setMeaningLanguage,
    fontSize,
    setFontSize,
    englishSource,
    setEnglishSource,
    punjabiSource,
    setPunjabiSource,
    hindiSource,
    setHindiSource,
    visraamSource,
    setVisraamSource,
    larivaar,
    setLarivaar,
    showVishraam,
    setShowVishraam,
    lineSpacing,
    setLineSpacing,
    textAlign,
    setTextAlign,
  } = useLanguageStore()
  const locale = useLocaleStore(s => s.locale)
  const setLocale = useLocaleStore(s => s.setLocale)
  const {
    learningLevel,
    setLearningLevel,
    audience,
    setAudience,
    learningGoal,
    setLearningGoal,
  } = useOnboardingStore()
  const {
    selectedIds,
    completionTrackingEnabled,
    setCompletionTrackingEnabled,
    markComplete,
    unmarkComplete,
    isComplete,
    toggleSelected,
    resetSelections,
    resetIfNewDay,
  } = useNitemStore()
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const [confirmingNitnemReset, setConfirmingNitnemReset] = useState(false)
  const nitnemResetConfirmRef = useRef<number | null>(null)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const commonCopy = copy.common
  const moreCopy = copy.more
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)
  const learningGoalLabels = getLearningGoalLabels(locale)
  const learningLevelLabels = getLearningLevelLabels(locale)
  const lineSpacingLabels = getLineSpacingLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const onboardingAudienceLabels = getOnboardingAudienceLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const textAlignmentLabels = getTextAlignmentLabels(locale)
  const uiLocaleLabels = getUiLocaleLabels(locale)
  const selectedNitnemOptions = useMemo(() => {
    return selectedIds
      .map(optionId => NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null)
      .filter((option): option is NitnemRouteOption => option !== null)
      .sort(compareNitnemOptions)
  }, [selectedIds])
  const availableNitnemOptions = useMemo(() => {
    return [...NITNEM_ROUTE_OPTIONS].sort(compareNitnemOptions)
  }, [])
  const nitnemDone = selectedNitnemOptions.filter(option => isComplete(option.id)).length
  const nitnemTotal = selectedNitnemOptions.length
  const nitnemProgressPct = nitnemTotal > 0 ? (nitnemDone / nitnemTotal) * 100 : 0
  const getNitnemOptionDetail = (option: NitnemRouteOption) => (
    option.supportsLengthAdjustment && isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
      ? getSundarGutkaLengthDetail(sundarGutkaLengths[option.baseBaniId])
      : option.detail
  )

  useEffect(() => {
    resetIfNewDay()
  }, [resetIfNewDay])

  useEffect(() => {
    return () => {
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
      }
    }
  }, [])

  const handleNitnemReset = () => {
    if (confirmingNitnemReset) {
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
        nitnemResetConfirmRef.current = null
      }
      setConfirmingNitnemReset(false)
      resetSelections()
      return
    }

    setConfirmingNitnemReset(true)
    if (nitnemResetConfirmRef.current !== null) {
      window.clearTimeout(nitnemResetConfirmRef.current)
    }
    nitnemResetConfirmRef.current = window.setTimeout(() => {
      nitnemResetConfirmRef.current = null
      setConfirmingNitnemReset(false)
    }, 3000)
  }

  return (
    <div className="page-shell animate-fade-in" data-testid="page-more" data-page="more" data-ai-surface="more" data-ai-state="ready">
      <div className="mb-5">
        <p className="eyebrow">{moreCopy.eyebrow}</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">
          {editorial?.more.title ?? moreCopy.title}
        </h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          {editorial?.more.body ?? moreCopy.body}
        </p>
      </div>

      <section
        className="hero-surface p-5 mb-5"
        aria-labelledby="more-promise-title"
        data-testid="more-promise"
      >
        <p className="eyebrow">{moreCopy.productPromise}</p>
        <p id="more-promise-title" className="font-display text-3xl leading-none text-ink dark:text-dark-text mt-2">
          {editorial?.brand.promise ?? copy.home.promise}
        </p>
        <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-3 max-w-[34ch]">
          {editorial?.more.promiseBody ?? moreCopy.promiseBody}
        </p>
      </section>

      <div className="mb-5">
        <SoundscapeControls
          context="study"
          variant="full"
          storageKey="more-soundscapes"
          defaultExpanded={false}
        />
      </div>

      <CloudSyncPanel />

      <DisclosureSection
        storageKey="more-daily-nitnem"
        eyebrow="Daily Ritual"
        title="Daily Nitnem"
        summary="Choose which banis appear on Home and keep completion tracking tucked away from the main ritual card."
        defaultOpen={false}
        className="section-shell-quiet p-4 mb-5 scroll-mt-24"
        bodyClassName="mt-4 space-y-4"
        badge={completionTrackingEnabled ? `${nitnemDone}/${nitnemTotal} complete` : 'Home stays clean'}
        sectionId="daily-nitnem"
        testId="more-daily-nitnem"
      >
        <SettingsBlock
          title="Completion Tracking"
          description="This stays in More so Home can stay focused on starting the bani."
          headingId="more-nitnem-completion-title"
          testId="more-nitnem-completion"
        >
          <button
            type="button"
            onClick={() => setCompletionTrackingEnabled(!completionTrackingEnabled)}
            aria-pressed={completionTrackingEnabled}
            className={`w-full rounded-lg border px-4 py-3 text-left transition-colors duration-300 ${
              completionTrackingEnabled
                ? 'border-gold/24 bg-gold/10 text-ink dark:border-gold/24 dark:bg-gold/12 dark:text-dark-text'
                : 'border-sand/15 bg-parchment-card/72 text-ink/72 dark:border-dark-text/10 dark:bg-dark-card/72 dark:text-dark-text/72'
            }`}
            data-testid="more-nitnem-completion-toggle"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-sans text-sm font-semibold">
                Completion tracking {completionTrackingEnabled ? commonCopy.on : commonCopy.off}
              </span>
              <span className="rounded-full border border-current/15 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.16em]">
                {completionTrackingEnabled ? 'Visible here' : 'Optional'}
              </span>
            </span>
          </button>

          {completionTrackingEnabled ? (
            <div className="mt-4 space-y-3" data-testid="more-nitnem-completion-panel">
              <div>
                <div className="h-px overflow-hidden bg-sand/18 dark:bg-dark-text/12">
                  <div
                    className="h-full bg-[linear-gradient(90deg,rgba(158,111,41,0.9),rgba(232,196,104,0.7))]"
                    style={{ width: `${nitnemProgressPct}%` }}
                  />
                </div>
                <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.16em] text-ink/50 dark:text-dark-text/55">
                  {nitnemDone} / {nitnemTotal} daily banis complete
                </p>
              </div>

              <div className="grid gap-2">
                {selectedNitnemOptions.map(option => {
                  const done = isComplete(option.id)

                  return (
                    <div
                      key={`complete-${option.id}`}
                      className="rounded-lg border border-sand/12 bg-parchment-card/70 px-3 py-3 dark:border-dark-text/10 dark:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed text-ink dark:text-dark-text">
                            {option.gurmukhiTitle}
                          </p>
                          <p className="mt-1 font-sans text-xs font-semibold text-ink/70 dark:text-dark-text/75">
                            {option.romanizedTitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => done ? unmarkComplete(option.id) : markComplete(option.id)}
                          className={`shrink-0 rounded-full border px-3 py-2 font-sans text-[11px] font-semibold transition-colors duration-300 ${
                            done
                              ? 'border-gold/24 bg-gold/10 text-gold dark:text-gold-light'
                              : 'border-sand/16 bg-parchment-low text-ink/62 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text/68'
                          }`}
                        >
                          {done ? 'Complete' : 'Mark complete'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </SettingsBlock>

        <SettingsBlock
          title="Shown on Home"
          description="Length choices for supported banis stay inside the reader."
          headingId="more-nitnem-selection-title"
          testId="more-nitnem-selection"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-sans text-xs text-ink/55 dark:text-dark-text/60">
              Home uses the next matching bani from this order.
            </p>
            <button
              type="button"
              onClick={handleNitnemReset}
              className="font-sans text-xs text-gold underline underline-offset-2 dark:text-gold-light"
              data-testid="more-nitnem-reset"
            >
              {confirmingNitnemReset ? 'Tap again to reset' : 'Reset'}
            </button>
          </div>

          <div className="space-y-4">
            {(['Morning', 'Evening', 'Night', 'Additional'] as const).map(group => (
              <div key={`manage-${group}`}>
                <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/50 dark:text-dark-text/50">
                  {group}
                </p>
                <div className="space-y-2">
                  {availableNitnemOptions
                    .filter(option => option.group === group)
                    .map(option => {
                      const selected = selectedIds.includes(option.id)

                      return (
                        <button
                          key={`manage-${option.id}`}
                          type="button"
                          onClick={() => toggleSelected(option.id)}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition-colors duration-300 ${
                            selected
                              ? 'border-gold/24 bg-[linear-gradient(180deg,rgba(250,241,222,0.9),rgba(246,235,214,0.82))] text-ink dark:border-gold/26 dark:bg-[linear-gradient(180deg,rgba(54,41,63,0.96),rgba(38,29,47,0.92))] dark:text-dark-text'
                              : 'border-sand/15 bg-parchment-card/72 text-ink dark:border-dark-text/10 dark:bg-dark-card/72 dark:text-dark-text'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed">
                                {option.gurmukhiTitle}
                              </p>
                              <p className={`mt-1 font-sans text-xs font-semibold ${selected ? 'text-ink/75 dark:text-dark-text/75' : 'text-ink/70 dark:text-dark-text/75'}`}>
                                {option.romanizedTitle}
                              </p>
                              <p className={`mt-1 font-sans text-xs ${selected ? 'text-ink/60 dark:text-dark-text/60' : 'text-ink/55 dark:text-dark-text/55'}`}>
                                {getNitnemOptionDetail(option)}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] ${
                              selected
                                ? 'bg-ink/6 text-ink dark:bg-white/10 dark:text-dark-text'
                                : 'bg-gold/10 text-gold dark:text-gold-light'
                            }`}>
                              {selected ? 'Shown' : 'Hidden'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>

          {selectedNitnemOptions[0] ? (
            <button
              type="button"
              onClick={() => navigate(buildNitnemStudyPath(selectedNitnemOptions[0]))}
              className="mt-4 w-full rounded-lg bg-ink px-4 py-3 font-sans text-sm font-semibold text-parchment transition-colors duration-300 dark:bg-parchment dark:text-dark-bg"
            >
              Open first selected bani
            </button>
          ) : null}
        </SettingsBlock>
      </DisclosureSection>

      <DisclosureSection
        storageKey="more-reader-defaults"
        title={moreCopy.readerDefaults}
        summary={`${moreCopy.scriptLayoutDescription} ${moreCopy.readingSupportDescription}`}
        defaultOpen={false}
        className="section-shell-quiet p-4 mb-5"
        bodyClassName="mt-4 space-y-3"
        sectionId="more-reader-defaults"
        testId="more-reader-defaults"
      >
        <SettingsBlock
          title={moreCopy.scriptLayoutTitle}
          description={moreCopy.scriptLayoutDescription}
          headingId="more-script-layout-title"
          testId="more-script-layout"
        >
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">{moreCopy.readingScript}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['gurmukhi', 'devanagari'] as const).map(mode => {
              const selected = scriptMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setScriptMode(mode)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[44px] transition-all duration-300 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {scriptModeLabels[mode]}
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <div className="flex justify-between mb-1">
            <p className="font-sans text-sm text-ink dark:text-dark-text">{moreCopy.scriptSize}</p>
            <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="34"
              step="2"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-full h-1 accent-gold"
            />
            <div className="flex justify-between mt-2">
              <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">{commonCopy.small}</span>
              <span
                lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-gold dark:text-gold-light`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {renderScriptText('ੴ', scriptMode)}
              </span>
              <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">{commonCopy.large}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(lineSpacingLabels).map(([key, label]) => {
              const selected = lineSpacing === key
              return (
                <button
                  key={key}
                  onClick={() => setLineSpacing(key as typeof lineSpacing)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            {Object.entries(textAlignmentLabels).map(([key, label]) => {
              const selected = textAlign === key
              return (
                <button
                  key={key}
                  onClick={() => setTextAlign(key as typeof textAlign)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-2 py-3 font-sans text-xs font-medium min-h-[48px] ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </SettingsBlock>

        <SettingsBlock
          title={moreCopy.readingSupportTitle}
          description={moreCopy.readingSupportDescription}
          headingId="more-reading-support-title"
          testId="more-reading-support"
        >
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowTransliteration(!showTransliteration)}
            aria-label="Toggle transliteration"
            aria-pressed={showTransliteration}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showTransliteration
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}
          </button>
          <button
            onClick={() => setLarivaar(!larivaar)}
            aria-pressed={larivaar}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              larivaar
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.larivaar} {larivaar ? commonCopy.on : commonCopy.off}
          </button>
          <button
            onClick={() => setShowVishraam(!showVishraam)}
            aria-pressed={showVishraam}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showVishraam
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.vishraam} {showVishraam ? commonCopy.on : commonCopy.off}
          </button>
        </div>

        <div className="mt-4">
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">{moreCopy.meaningLanguage}</p>
          <div className="grid grid-cols-4 gap-2">
            {(['none', 'en', 'pa', 'hi'] as const).map(option => {
              const selected = meaningLanguage === option
              return (
                <button
                  key={option}
                  onClick={() => setMeaningLanguage(option)}
                  className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {meaningLanguageLabels[option]}
                </button>
              )
            })}
          </div>
        </div>
        </SettingsBlock>

        <SettingsBlock
          title={moreCopy.translationSourceTitle}
          description={moreCopy.translationSourceDescription}
          headingId="more-translation-source-title"
          testId="more-translation-source"
        >
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">{moreCopy.englishTranslation}</p>
          <div className="grid gap-2">
            {Object.entries(englishSourceLabels).map(([key, label]) => {
              const selected = englishSource === key
              return (
                <button
                  key={key}
                  onClick={() => setEnglishSource(key as typeof englishSource)}
                  aria-pressed={selected}
                  className={`w-full flex items-center justify-between rounded-2xl px-3 py-3 border min-h-[48px] ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  <span className="font-sans text-sm font-medium">{label}</span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.18em] opacity-70">
                    {selected ? commonCopy.selected : commonCopy.tapToUse}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mt-4 mb-2">{moreCopy.punjabiTranslation}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(punjabiSourceLabels).map(([key, label]) => {
              const selected = punjabiSource === key
              return (
                <button
                  key={key}
                  onClick={() => setPunjabiSource(key as typeof punjabiSource)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mt-4 mb-2">{moreCopy.hindiTranslation}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(hindiSourceLabels).map(([key, label]) => {
              const selected = hindiSource === key
              return (
                <button
                  key={key}
                  onClick={() => setHindiSource(key as typeof hindiSource)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <p className="font-sans text-sm text-ink dark:text-dark-text mt-4 mb-2">{moreCopy.visraamSource}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(visraamSourceLabels).map(([key, label]) => {
              const selected = visraamSource === key
              return (
                <button
                  key={key}
                  onClick={() => setVisraamSource(key as typeof visraamSource)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </SettingsBlock>
      </DisclosureSection>

      <DisclosureSection
        storageKey="more-profile-language"
        title={moreCopy.profileLanguage}
        summary={`${moreCopy.appLanguageDescription} ${moreCopy.learningProfileDescription}`}
        defaultOpen={false}
        className="section-shell p-4 mb-5"
        bodyClassName="mt-4 space-y-3"
        sectionId="more-profile-language"
        testId="more-profile-language"
      >
        <SettingsBlock
          title={moreCopy.appLanguageTitle}
          description={moreCopy.appLanguageDescription}
          headingId="more-app-language-title"
          testId="more-app-language"
        >
        <div className="grid grid-cols-3 gap-2">
          {(['en', 'pa', 'hi'] as const).map(option => {
            const selected = locale === option
            return (
              <button
                key={option}
                onClick={() => setLocale(option)}
                aria-pressed={selected}
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {uiLocaleLabels[option]}
              </button>
              )
            })}
          </div>
        </SettingsBlock>

        <SettingsBlock
          title={moreCopy.learningProfileTitle}
          description={moreCopy.learningProfileDescription}
          headingId="more-learning-profile-title"
          testId="more-learning-profile"
        >
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['beginner', 'familiar', 'daily-reader'] as const).map(level => {
            const selected = learningLevel === level
            return (
              <button
                key={level}
                onClick={() => setLearningLevel(level)}
                aria-pressed={selected}
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {learningLevelLabels[level]}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['child', 'teen', 'adult'] as const).map(option => {
            const selected = audience === option
            return (
              <button
                key={option}
                onClick={() => setAudience(option)}
                aria-pressed={selected}
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {onboardingAudienceLabels[option]}
              </button>
            )
          })}
        </div>
        <div className="grid gap-2 mb-3">
          {(['read', 'understand', 'habit'] as const).map(goal => {
            const selected = learningGoal === goal
            return (
              <button
                key={goal}
                onClick={() => setLearningGoal(goal)}
                aria-pressed={selected}
                className={`rounded-2xl px-3 py-3 border min-h-[48px] text-left font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {learningGoalLabels[goal]}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => navigate('/', { state: { reopenOnboarding: true } })}
          className="font-sans text-xs text-saffron dark:text-saffron-light underline underline-offset-2"
        >
          {moreCopy.reopenOnHome}
        </button>
        </SettingsBlock>
      </DisclosureSection>

      <section className="section-shell-quiet p-4 mb-5" aria-labelledby="more-grow-title" data-testid="more-grow">
        <p id="more-grow-title" className="eyebrow mb-3">{moreCopy.grow}</p>
        <button
          onClick={() => navigate('/learn')}
          className="w-full flex items-center justify-between section-shell px-4 py-4 min-h-[52px]"
          data-testid="more-open-learn"
        >
          <div className="text-left">
            <p className="font-sans text-sm font-medium text-ink dark:text-dark-text">{moreCopy.openLearn}</p>
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">
              {editorial?.more.growDescription ?? moreCopy.growDescription}
            </p>
          </div>
          <IconArrowRight size={16} className="text-gold dark:text-gold-light" />
        </button>
      </section>

      <section className="section-shell p-4" aria-labelledby="more-about-title" data-testid="more-about">
        <p id="more-about-title" className="eyebrow mb-3">{moreCopy.about}</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          {editorial?.more.aboutBody ?? moreCopy.aboutBody}
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">
          {moreCopy.aboutSource}
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">
          {moreCopy.aboutTrust}
        </p>
      </section>
    </div>
  )
}
