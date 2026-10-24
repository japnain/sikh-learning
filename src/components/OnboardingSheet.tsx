import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { MeaningLanguage, OnboardingPresentationMode, ScriptMode, UiLocale } from '../types'
import { getOnboardingCopy, SAMPLE_ONBOARDING_LINE } from '../content/onboardingCopy'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { lockAppScroll } from '../utils/appScroll'
import NaamRasLogoMark from './NaamRasLogoMark'
import { IconArrowLeft, IconArrowRight, IconCheck, IconClose } from './icons'
import '../styles/onboarding.css'

interface Props {
  presentation: OnboardingPresentationMode
  locale: UiLocale
  scriptMode: ScriptMode
  setScriptMode: (mode: ScriptMode) => void
  showTransliteration: boolean
  setShowTransliteration: (value: boolean) => void
  meaningLanguage: MeaningLanguage
  setMeaningLanguage: (value: MeaningLanguage) => void
  onComplete: () => void | Promise<void>
  onDismiss?: () => void
  isCompleting?: boolean
}

const SCRIPTS: ScriptMode[] = ['gurmukhi', 'devanagari']
const MEANINGS: MeaningLanguage[] = ['none', 'en', 'pa', 'hi']

function Choice({ selected, children, onClick, testId, className = '' }: {
  selected: boolean
  children: ReactNode
  onClick: () => void
  testId: string
  className?: string
}) {
  return (
    <button type="button" className={`onboarding-choice ${className}`} aria-pressed={selected} onClick={onClick} data-testid={testId}>
      {children}
      <span className="onboarding-choice-check" aria-hidden="true">{selected && <IconCheck size={12} />}</span>
    </button>
  )
}

export default function OnboardingSheet({
  presentation, locale, scriptMode, setScriptMode, showTransliteration, setShowTransliteration,
  meaningLanguage, setMeaningLanguage, onComplete, onDismiss, isCompleting = false,
}: Props) {
  const [step, setStep] = useState<0 | 1>(0)
  const [submitting, setSubmitting] = useState(false)
  const [completionFailed, setCompletionFailed] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const hasNavigatedRef = useRef(false)
  const completionInFlight = useRef(false)
  const returnFocusRef = useRef<HTMLElement | null>(
    presentation === 'overlay' && typeof document !== 'undefined' ? document.activeElement as HTMLElement : null
  )
  const copy = getOnboardingCopy(locale)
  const overlay = presentation === 'overlay'
  const busy = isCompleting || submitting

  useEffect(() => {
    if (!overlay) return
    const returnFocus = returnFocusRef.current
    const unlock = lockAppScroll()
    return () => {
      unlock()
      window.requestAnimationFrame(() => returnFocus?.focus({ preventScroll: true }))
    }
  }, [overlay])

  function navigateStep(next: 0 | 1) {
    if (busy) return
    hasNavigatedRef.current = true
    setStep(next)
  }

  useEffect(() => {
    if (!hasNavigatedRef.current) return
    bodyRef.current?.scrollTo?.({ top: 0, behavior: 'instant' })
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  async function complete() {
    if (busy || completionInFlight.current) return
    completionInFlight.current = true
    setSubmitting(true)
    setCompletionFailed(false)
    try {
      await onComplete()
    } catch {
      setCompletionFailed(true)
    } finally {
      completionInFlight.current = false
      setSubmitting(false)
    }
  }

  const chrome = (
    <div className="onboarding-frame" data-testid={overlay ? 'onboarding-dialog' : 'onboarding-first-run-panel'}>
      <header className="onboarding-header">
        <span className="onboarding-brand"><NaamRasLogoMark size={30} testId="onboarding-brand-mark" /><span>NaamRas</span></span>
        {overlay && onDismiss && (
          <button type="button" className="onboarding-icon-button" onClick={onDismiss} aria-label={copy.close} disabled={busy}>
            <IconClose size={20} />
          </button>
        )}
      </header>

      <div className="onboarding-progress" role="progressbar" aria-label={copy.step} aria-valuemin={1} aria-valuemax={2} aria-valuenow={step + 1} aria-valuetext={`${copy.step} ${step + 1} ${copy.of} 2`}>
        {[0, 1].map(index => <span key={index} data-active={index <= step} aria-hidden="true" />)}
      </div>

      <div className="onboarding-body" ref={bodyRef}>
        <div className="onboarding-step" key={step}>
          <p className="onboarding-step-number">{step + 1} / 2</p>
          <h1 id="onboarding-title" ref={headingRef} tabIndex={-1} className="onboarding-title">
            {step === 0 ? copy.scriptTitle : copy.meaningTitle}
          </h1>
          <p className="onboarding-description" id="onboarding-description">{step === 0 ? copy.scriptBody : copy.meaningBody}</p>

          {step === 0 ? (
            <div data-testid="onboarding-script-step">
              <div className="onboarding-script-choices">
                {SCRIPTS.map(mode => (
                  <Choice key={mode} selected={scriptMode === mode} onClick={() => setScriptMode(mode)} testId={`onboarding-script-${mode}`} className="onboarding-script-choice">
                    <span className={`onboarding-script-sample ${getScriptTextFontClass(mode)}`} lang={getScriptTextLang(mode)}>{renderScriptText('ਸਤਿ ਨਾਮੁ', mode)}</span>
                    <span className="onboarding-choice-title">{copy.scriptNames[mode]}</span>
                  </Choice>
                ))}
              </div>
              <label className="onboarding-pronunciation">
                <span>
                  <span className="onboarding-choice-title">{copy.pronunciationTitle}</span>
                  <span className="onboarding-choice-description">{copy.pronunciationBody}</span>
                </span>
                <input type="checkbox" role="switch" checked={showTransliteration} onChange={event => setShowTransliteration(event.target.checked)} aria-label={copy.pronunciationTitle} />
                <span className="onboarding-switch" aria-hidden="true" />
              </label>
              {showTransliteration && <p className="onboarding-pronunciation-example" data-testid="onboarding-pronunciation-example">{SAMPLE_ONBOARDING_LINE.transliteration}</p>}
            </div>
          ) : (
            <div data-testid="onboarding-support-step">
              <div className="onboarding-meaning-choices">
                {MEANINGS.map(language => (
                  <Choice key={language} selected={meaningLanguage === language} onClick={() => setMeaningLanguage(language)} testId={`onboarding-meaning-${language}`}>
                    <span className={`onboarding-choice-title ${language === 'pa' ? 'font-gurmukhi' : language === 'hi' ? 'font-devanagari' : ''}`} lang={language === 'pa' ? 'pa-Guru' : language === 'hi' ? 'hi' : undefined}>{copy.meanings[language]}</span>
                  </Choice>
                ))}
              </div>
              <section className="onboarding-reader-preview" data-testid="onboarding-preview-hero" aria-label={copy.previewLabel}>
                <p className="onboarding-preview-label">{copy.previewLabel}</p>
                <p className={`onboarding-preview-script ${getScriptTextFontClass(scriptMode)}`} lang={getScriptTextLang(scriptMode)}>{renderScriptText(SAMPLE_ONBOARDING_LINE.gurmukhi, scriptMode)}</p>
                {showTransliteration && <p className="onboarding-preview-pronunciation" data-testid="onboarding-preview-pronunciation">{SAMPLE_ONBOARDING_LINE.transliteration}</p>}
                {meaningLanguage !== 'none' && (
                  <p className={`onboarding-preview-meaning ${meaningLanguage === 'pa' ? getScriptTextFontClass(scriptMode) : meaningLanguage === 'hi' ? 'font-devanagari' : ''}`} lang={meaningLanguage === 'pa' ? getScriptTextLang(scriptMode) : meaningLanguage}>
                    {meaningLanguage === 'pa' ? renderScriptText(SAMPLE_ONBOARDING_LINE.meaning.pa, scriptMode) : SAMPLE_ONBOARDING_LINE.meaning[meaningLanguage]}
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <footer className="onboarding-footer" data-testid={step === 1 ? 'onboarding-preview-action-bar' : 'onboarding-setup-action-bar'}>
        {completionFailed && <p className="onboarding-error" role="alert">{copy.completionError}</p>}
        <div className="onboarding-actions">
          {step === 1 && <button type="button" className="onboarding-back" onClick={() => navigateStep(0)} aria-label={copy.back} disabled={busy}><IconArrowLeft size={20} /></button>}
          <button type="button" className="onboarding-primary" onClick={() => step === 1 ? void complete() : navigateStep(1)} disabled={busy} data-testid={step === 1 ? 'onboarding-preview-primary-action' : 'onboarding-setup-primary-action'} data-ai-action={step === 1 ? 'complete-onboarding' : 'onboarding-continue'}>
            <span>{busy ? copy.saving : step === 1 ? overlay ? copy.save : copy.start : copy.continue}</span><IconArrowRight size={19} />
          </button>
        </div>
        <p className="onboarding-footer-note">{overlay ? copy.immediateChanges : copy.footer}</p>
      </footer>
    </div>
  )

  if (overlay) return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onDismiss?.() }}><Dialog.Portal>
    <Dialog.Overlay className="onboarding-overlay-backdrop" />
    <Dialog.Content className="onboarding-root onboarding-modal" data-testid="onboarding-overlay" data-page="onboarding" aria-describedby="onboarding-description">
      <Dialog.Title className="sr-only">NaamRas · {step === 0 ? copy.scriptTitle : copy.meaningTitle}</Dialog.Title>
      {chrome}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>

  return <main className="onboarding-root" data-testid="onboarding-first-run" data-page="onboarding" data-ai-surface="onboarding" data-ai-state="ready" aria-labelledby="onboarding-title" aria-describedby="onboarding-description">{chrome}</main>
}
