import type { LearningLevel, MeaningLanguage, ScriptMode } from '../types'
import { ENGLISH_SOURCE_LABELS, LEARNING_LEVEL_LABELS, MEANING_LANGUAGE_LABELS, SCRIPT_MODE_LABELS } from '../utils/translations'
import type { EnglishSource } from '../types'

interface Props {
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
  onComplete: () => void
}

export default function OnboardingSheet({
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
  onComplete,
}: Props) {
  return (
    <div className="fixed inset-0 z-[110] bg-ink/55 dark:bg-black/80 backdrop-blur-sm">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pt-4">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-gold/10 shadow-gold-strong"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="sticky top-0 z-10 px-5 pt-5 pb-4 border-b border-sand/10 dark:border-dark-text/10 bg-parchment-card dark:bg-dark-card">
            <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-[0.18em] mb-2">Welcome</p>
            <h2 className="font-display text-3xl leading-none text-ink dark:text-dark-text">Set your reading defaults</h2>
            <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-3">
              Choose how Gurbani should open and how much support you want while learning.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 overscroll-contain space-y-4">
            <div>
              <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Reading script</p>
              <div className="grid grid-cols-2 gap-2">
                {(['gurmukhi', 'devanagari'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setScriptMode(mode)}
                    className={`rounded-xl px-3 py-3 font-sans text-xs font-medium min-h-[44px] ${
                      scriptMode === mode
                        ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                        : 'bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {SCRIPT_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Meaning</p>
              <div className="grid grid-cols-4 gap-2">
                {(['none', 'en', 'pa', 'hi'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setMeaningLanguage(option)}
                    className={`rounded-xl px-2 py-3 font-sans text-xs font-medium min-h-[44px] ${
                      meaningLanguage === option
                        ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                        : 'bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {MEANING_LANGUAGE_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-sans text-sm text-ink dark:text-dark-text">Transliteration</p>
                <button
                  onClick={() => setShowTransliteration(!showTransliteration)}
                  aria-label="Toggle onboarding transliteration"
                  className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${showTransliteration ? 'bg-gold' : 'bg-sand/30 dark:bg-dark-text/20'}`}
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${showTransliteration ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {meaningLanguage === 'en' && (
                <div className="grid gap-2">
                  {Object.entries(ENGLISH_SOURCE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setEnglishSource(key as EnglishSource)}
                      className={`w-full rounded-xl px-3 py-3 text-left font-sans text-xs min-h-[44px] ${
                        englishSource === key
                          ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                          : 'bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-sans text-sm text-ink dark:text-dark-text mb-2">Learning level</p>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'familiar', 'daily-reader'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setLearningLevel(level)}
                    className={`rounded-xl px-2 py-3 font-sans text-xs font-medium min-h-[52px] ${
                      learningLevel === level
                        ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                        : 'bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                    }`}
                  >
                    {LEARNING_LEVEL_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 px-5 pb-5 pt-4 border-t border-sand/10 dark:border-dark-text/10 bg-parchment-card dark:bg-dark-card">
            <button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-saffron to-saffron-light rounded-2xl py-3 text-white font-sans font-semibold text-sm min-h-[48px]"
            >
              Save Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
