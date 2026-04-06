import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import SoundscapeControls from '../components/SoundscapeControls'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import {
  ENGLISH_SOURCE_LABELS,
  LEARNING_GOAL_LABELS,
  LEARNING_LEVEL_LABELS,
  LINE_SPACING_LABELS,
  MEANING_LANGUAGE_LABELS,
  ONBOARDING_AUDIENCE_LABELS,
  SCRIPT_MODE_LABELS,
  TEXT_ALIGNMENT_LABELS,
  UI_LOCALE_LABELS,
} from '../utils/translations'
import { renderScriptText } from '../utils/readerDisplay'
import { IconArrowRight } from '../components/icons'
import { getUiCopy } from '../utils/uiCopy'

function SettingsBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="section-shell bg-white/55 dark:bg-dark-card/60 px-4 py-4">
      <p className="eyebrow">{title}</p>
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
    resetOnboarding,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-5">
        <p className="eyebrow">More</p>
        <h1 className="font-display text-4xl text-ink dark:text-dark-text leading-none mt-2">Set the tone of the app.</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          The defaults here shape Home, Study, Hukamnama, and Learn. The app should feel deliberate, calm, and consistent every time you open it.
        </p>
      </div>

      <section className="hero-surface p-5 mb-5">
        <p className="eyebrow">Product Promise</p>
        <p className="font-display text-3xl leading-none text-ink dark:text-dark-text mt-2">
          {copy.home.promise}
        </p>
        <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-3 max-w-[34ch]">
          Nitnem is being shaped as a mobile-first reading and learning companion, not a generic utility dashboard.
        </p>
      </section>

      <div className="mb-5">
        <SoundscapeControls context="study" variant="full" />
      </div>

      <section className="section-shell-quiet p-4 mb-5">
        <p className="eyebrow mb-4">Reader Defaults</p>
        <div className="space-y-3">
        <SettingsBlock
          title="Script & Layout"
          description="Choose the script, text size, spacing, and alignment that keep long reading comfortable."
        >
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Reading script</p>
          <div className="grid grid-cols-2 gap-2">
            {(['gurmukhi', 'devanagari'] as const).map(mode => {
              const selected = scriptMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setScriptMode(mode)}
                  className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[44px] transition-all duration-300 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-white/70 dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {SCRIPT_MODE_LABELS[mode]}
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <div className="flex justify-between mb-1">
            <p className="font-sans text-sm text-ink dark:text-dark-text">Script size</p>
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
              <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Small</span>
              <span
                lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-gold dark:text-gold-light`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {renderScriptText('ੴ', scriptMode)}
              </span>
              <span className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40">Large</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(LINE_SPACING_LABELS).map(([key, label]) => {
              const selected = lineSpacing === key
              return (
                <button
                  key={key}
                  onClick={() => setLineSpacing(key as typeof lineSpacing)}
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
            {Object.entries(TEXT_ALIGNMENT_LABELS).map(([key, label]) => {
              const selected = textAlign === key
              return (
                <button
                  key={key}
                  onClick={() => setTextAlign(key as typeof textAlign)}
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
          title="Reading Support"
          description="Toggle the extra support layers that make the reader lighter or more guided."
        >
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowTransliteration(!showTransliteration)}
            aria-label="Toggle transliteration"
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showTransliteration
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            Transliteration {showTransliteration ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => setLarivaar(!larivaar)}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              larivaar
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            Larivaar {larivaar ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => setShowVishraam(!showVishraam)}
            className={`rounded-2xl px-3 py-3 font-sans text-xs font-medium min-h-[48px] ${
              showVishraam
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-white/70 dark:bg-dark-card text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            Vishraam {showVishraam ? 'On' : 'Off'}
          </button>
        </div>

        <div className="mt-4">
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Meaning language</p>
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
                  {MEANING_LANGUAGE_LABELS[option]}
                </button>
              )
            })}
          </div>
        </div>
        </SettingsBlock>

        <SettingsBlock
          title="Translation Source"
          description="Keep one English source selected so the reader stays consistent."
        >
          <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">English translation</p>
          <div className="grid gap-2">
            {Object.entries(ENGLISH_SOURCE_LABELS).map(([key, label]) => {
              const selected = englishSource === key
              return (
                <button
                  key={key}
                  onClick={() => setEnglishSource(key as typeof englishSource)}
                  className={`w-full flex items-center justify-between rounded-2xl px-3 py-3 border min-h-[48px] ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                      : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                  }`}
                >
                  <span className="font-sans text-sm font-medium">{label}</span>
                  <span className="font-sans text-[10px] uppercase tracking-[0.18em] opacity-70">
                    {selected ? 'Selected' : 'Tap to use'}
                  </span>
                </button>
              )
            })}
          </div>
        </SettingsBlock>
        </div>
      </section>

      <section className="section-shell p-4 mb-5">
        <p className="eyebrow mb-4">Profile & App Language</p>
        <div className="space-y-3">
        <SettingsBlock
          title="App Language"
          description="This changes the app chrome and guidance copy, not the scripture text itself."
        >
        <div className="grid grid-cols-3 gap-2">
          {(['en', 'pa', 'hi'] as const).map(option => {
            const selected = locale === option
            return (
              <button
                key={option}
                onClick={() => setLocale(option)}
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {UI_LOCALE_LABELS[option]}
              </button>
              )
            })}
          </div>
        </SettingsBlock>

        <SettingsBlock
          title="Learning Profile"
          description="This changes what Home recommends first and how Learn frames the path ahead."
        >
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['beginner', 'familiar', 'daily-reader'] as const).map(level => {
            const selected = learningLevel === level
            return (
              <button
                key={level}
                onClick={() => setLearningLevel(level)}
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {LEARNING_LEVEL_LABELS[level]}
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
                className={`rounded-2xl px-2 py-3 border min-h-[48px] font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {ONBOARDING_AUDIENCE_LABELS[option]}
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
                className={`rounded-2xl px-3 py-3 border min-h-[48px] text-left font-sans text-xs font-medium ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                }`}
              >
                {LEARNING_GOAL_LABELS[goal]}
              </button>
            )
          })}
        </div>
        <button
          onClick={resetOnboarding}
          className="font-sans text-xs text-saffron dark:text-saffron-light underline underline-offset-2"
        >
          Re-open first setup on Home
        </button>
        </SettingsBlock>
        </div>
      </section>

      <section className="section-shell-quiet p-4 mb-5">
        <p className="eyebrow mb-3">Grow</p>
        <button
          onClick={() => navigate('/learn')}
          className="w-full flex items-center justify-between section-shell px-4 py-4 min-h-[52px]"
        >
          <div className="text-left">
            <p className="font-sans text-sm font-medium text-ink dark:text-dark-text">Open Learn</p>
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">
              Letters, recognition drills, Gurbani bridge, and mastery tracking
            </p>
          </div>
          <IconArrowRight size={16} className="text-gold dark:text-gold-light" />
        </button>
      </section>

      <section className="section-shell p-4">
        <p className="eyebrow mb-3">About</p>
        <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70">
          Nitnem is a Sikh scripture reading and learning app shaped around three pillars: Read, Understand, and Grow.
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">
          Scripture data is sourced from BaniDB v2. Recitation remains intentionally disabled until a working source exists.
        </p>
        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2">
          Source transparency and correction reporting are part of the trust layer. Until those flows are built, issues should be treated as product work, not hidden edge cases.
        </p>
      </section>
    </div>
  )
}
