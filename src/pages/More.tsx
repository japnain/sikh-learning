import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import SoundscapeControls from '../components/SoundscapeControls'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import {
  getEnglishSourceLabels,
  getLearningGoalLabels,
  getLearningLevelLabels,
  getLineSpacingLabels,
  getMeaningLanguageLabels,
  getOnboardingAudienceLabels,
  getScriptModeLabels,
  getTextAlignmentLabels,
  getUiLocaleLabels,
} from '../utils/translations'
import { renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight } from '../components/icons'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'

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
      className="section-shell bg-white/55 dark:bg-dark-card/60 px-4 py-4"
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
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const commonCopy = copy.common
  const moreCopy = copy.more
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const learningGoalLabels = getLearningGoalLabels(locale)
  const learningLevelLabels = getLearningLevelLabels(locale)
  const lineSpacingLabels = getLineSpacingLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const onboardingAudienceLabels = getOnboardingAudienceLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const textAlignmentLabels = getTextAlignmentLabels(locale)
  const uiLocaleLabels = getUiLocaleLabels(locale)

  return (
    <div className="page-shell animate-fade-in" data-testid="page-more" data-page="more">
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
        <SoundscapeControls context="study" variant="full" />
      </div>

      <section className="section-shell-quiet p-4 mb-5" aria-labelledby="more-reader-defaults-title" data-testid="more-reader-defaults">
        <p id="more-reader-defaults-title" className="eyebrow mb-4">{moreCopy.readerDefaults}</p>
        <div className="space-y-3">
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
        </SettingsBlock>
        </div>
      </section>

      <section className="section-shell p-4 mb-5" aria-labelledby="more-profile-language-title" data-testid="more-profile-language">
        <p id="more-profile-language-title" className="eyebrow mb-4">{moreCopy.profileLanguage}</p>
        <div className="space-y-3">
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
        </div>
      </section>

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
