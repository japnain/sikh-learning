import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import CloudSyncPanel from '../components/CloudSyncPanel'
import DisclosureSection from '../components/DisclosureSection'
import SoundscapeControls from '../components/SoundscapeControls'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useThemeStore } from '../store/theme'
import {
  getEnglishSourceLabels,
  getHindiSourceLabels,
  getLineSpacingLabels,
  getMeaningLanguageLabels,
  getPunjabiSourceLabels,
  getScriptModeLabels,
  getTextAlignmentLabels,
  getUiLocaleLabels,
  getVisraamSourceLabels,
} from '../utils/translations'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight, IconExternalLink } from '../components/icons'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import { getPublicAppLinks } from '../utils/appConfig'

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
        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-1 mb-3">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export default function More() {
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
  const openOnboarding = useOnboardingStore(s => s.openOnboarding)
  const dark = useThemeStore(s => s.dark)
  const setDark = useThemeStore(s => s.setDark)
  const selectedNitnemCount = useNitemStore(s => s.selectedIds.length)
  const completionTrackingEnabled = useNitemStore(s => s.completionTrackingEnabled)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const commonCopy = copy.common
  const moreCopy = copy.more
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)
  const lineSpacingLabels = getLineSpacingLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const textAlignmentLabels = getTextAlignmentLabels(locale)
  const uiLocaleLabels = getUiLocaleLabels(locale)
  const publicLinks = getPublicAppLinks()
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

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SettingsBlock
          title={moreCopy.appearanceTitle}
          description={moreCopy.appearanceDescription}
          headingId="more-appearance-title"
          testId="more-appearance"
        >
          <div className="grid grid-cols-2 gap-2">
            {([false, true] as const).map(option => {
              const selected = dark === option
              return (
                <button
                  key={option ? 'dark' : 'light'}
                  type="button"
                  onClick={() => setDark(option)}
                  aria-pressed={selected}
                  className={`interactive-focus min-h-[48px] rounded-lg border px-3 font-sans text-sm font-semibold ${
                    selected
                      ? 'border-saffron bg-saffron text-white'
                      : 'border-sand/15 text-ink dark:border-dark-text/10 dark:text-dark-text'
                  }`}
                >
                  {option ? moreCopy.darkMode : moreCopy.lightMode}
                </button>
              )
            })}
          </div>
        </SettingsBlock>

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
                  type="button"
                  onClick={() => setLocale(option)}
                  aria-pressed={selected}
                  className={`interactive-focus min-h-[48px] rounded-lg border px-2 font-sans text-xs font-semibold ${
                    selected
                      ? 'border-saffron bg-saffron text-white'
                      : 'border-sand/15 text-ink dark:border-dark-text/10 dark:text-dark-text'
                  }`}
                >
                  {uiLocaleLabels[option]}
                </button>
              )
            })}
          </div>
        </SettingsBlock>
      </div>

      <section
        id="daily-nitnem"
        className="section-shell-quiet p-4 mb-5 scroll-mt-24"
        aria-labelledby="more-daily-nitnem-title"
        data-testid="more-daily-nitnem-link"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{moreCopy.dailyRitual}</p>
            <h2 id="more-daily-nitnem-title" className="mt-2 font-display text-2xl leading-none text-ink dark:text-dark-text">
              {moreCopy.dailyNitnem}
            </h2>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
              {moreCopy.dailyNitnemDescription}
            </p>
          </div>
          <span className="chip-pill shrink-0">
            {completionTrackingEnabled ? moreCopy.trackingOn : moreCopy.baniCount(selectedNitnemCount)}
          </span>
        </div>
        <Link
          to="/nitnem/customize"
          className="interactive-focus interactive-pill-link mt-4 min-h-[48px] w-full gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
          data-testid="more-open-nitnem-customize"
        >
          {moreCopy.customizeDailyNitnem}
          <IconArrowRight size={14} />
        </Link>
      </section>

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
                  className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[44px] transition-colors duration-200 ${
                    selected
                      ? 'bg-saffron text-white'
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
            <span className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{fontSize}px</span>
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
              <span className="font-sans text-[10px] text-ink/68 dark:text-dark-text/64">{commonCopy.small}</span>
              <span
                lang={getScriptTextLang(scriptMode)}
                className={`${getScriptTextFontClass(scriptMode)} text-gold-dark dark:text-gold-light`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {renderScriptText('ੴ', scriptMode)}
              </span>
              <span className="font-sans text-[10px] text-ink/68 dark:text-dark-text/64">{commonCopy.large}</span>
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
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
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
                  className={`rounded-lg px-2 py-3 font-sans text-xs font-medium min-h-[48px] ${
                    selected
                      ? 'bg-saffron text-white'
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
            aria-pressed={showTransliteration}
            className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showTransliteration
                ? 'bg-saffron text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}
          </button>
          <button
            onClick={() => setLarivaar(!larivaar)}
            aria-pressed={larivaar}
            className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              larivaar
                ? 'bg-saffron text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {moreCopy.larivaar} {larivaar ? commonCopy.on : commonCopy.off}
          </button>
          <button
            onClick={() => setShowVishraam(!showVishraam)}
            aria-pressed={showVishraam}
            className={`rounded-lg px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showVishraam
                ? 'bg-saffron text-white'
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
                  className={`rounded-lg px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
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
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-3 border min-h-[48px] ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
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
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
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
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
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
                  className={`rounded-lg px-3 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                    selected
                      ? 'bg-saffron text-white border-saffron'
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

      <div className="mb-5">
        <CloudSyncPanel />
      </div>

      <div className="mb-5">
        <SoundscapeControls
          context="study"
          variant="full"
          storageKey="more-soundscapes"
          defaultExpanded={false}
        />
      </div>

      <section className="section-shell p-4" aria-labelledby="more-about-title" data-testid="more-about">
        <p id="more-about-title" className="eyebrow mb-3">{moreCopy.about}</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          {editorial?.more.aboutBody ?? moreCopy.aboutBody}
        </p>
        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2">
          {moreCopy.aboutSource}
        </p>
        <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 mt-2">
          {moreCopy.aboutTrust}
        </p>
        <button
          type="button"
          onClick={openOnboarding}
          className="interactive-focus interactive-pill-link mt-4 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
          data-testid="more-open-onboarding"
        >
          {moreCopy.reopenOnHome}
          <IconArrowRight size={14} />
        </button>
        {publicLinks.supportUrl ? (
          <a
            href={publicLinks.supportUrl}
            target="_blank"
            rel="noreferrer"
            className="interactive-focus interactive-pill-link mt-2 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
            data-testid="more-open-support"
          >
            {moreCopy.support}
            <IconExternalLink size={14} />
          </a>
        ) : (
          <Link
            to="/support"
            className="interactive-focus interactive-pill-link mt-2 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
            data-testid="more-open-support"
          >
            {moreCopy.support}
            <IconArrowRight size={14} />
          </Link>
        )}
        {publicLinks.privacyUrl ? (
          <a
            href={publicLinks.privacyUrl}
            target="_blank"
            rel="noreferrer"
            className="interactive-focus interactive-pill-link mt-2 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
            data-testid="more-open-public-privacy"
          >
            {moreCopy.publicPrivacyPolicy}
            <IconExternalLink size={14} />
          </a>
        ) : (
          <Link
            to="/privacy"
            className="interactive-focus interactive-pill-link mt-2 min-h-[48px] w-full gap-2 rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
            data-testid="more-open-public-privacy"
          >
            {moreCopy.publicPrivacyPolicy}
            <IconArrowRight size={14} />
          </Link>
        )}
      </section>
    </div>
  )
}
