import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import type { ReaderWordContext } from '../hooks/useReaderInteraction'
import type { ReaderPresentation } from '../hooks/useReaderPresentation'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { IconArrowLeft, IconArrowRight, IconClose, IconMoreHorizontal } from './icons'
import BaniLengthControl from './BaniLengthControl'
import type { SundarGutkaLength } from '../types'

const WORD_MEANING_COPY = {
  en: { languages: { en: 'English', pa: 'Punjabi', hi: 'Hindi' }, fallback: 'English fallback', missing: (language: string) => `No ${language} study meaning is available for this word.` },
  pa: { languages: { en: 'ਅੰਗਰੇਜ਼ੀ', pa: 'ਪੰਜਾਬੀ', hi: 'ਹਿੰਦੀ' }, fallback: 'ਉਪਲਬਧ ਅੰਗਰੇਜ਼ੀ ਅਰਥ', missing: (language: string) => `ਇਸ ਸ਼ਬਦ ਦੇ ${language} ਅਧਿਐਨ ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।` },
  hi: { languages: { en: 'अंग्रेज़ी', pa: 'पंजाबी', hi: 'हिंदी' }, fallback: 'उपलब्ध अंग्रेज़ी अर्थ', missing: (language: string) => `इस शब्द का ${language} अध्ययन अर्थ उपलब्ध नहीं है।` },
} as const

interface Props {
  visible: boolean
  title: string
  location: string
  presentation: ReaderPresentation
  word: ReaderWordContext | null
  notice?: ReactNode
  onBack: () => void
  onSections: () => void
  onAppearance: () => void
  onMore: (trigger: HTMLButtonElement) => void
  onMode: (mode: ReaderPresentation) => void
  onHide: () => void
  onExplore: () => void
  length?: SundarGutkaLength | null
  onLength?: () => void
}

export default function ReaderDock(props: Props) {
  const locale = useLocaleStore(s => s.locale)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const language = useLanguageStore(s => s.meaningLanguage)
  const copy = locale === 'pa'
    ? { controls: 'ਪਾਠ ਦੇ ਕੰਟਰੋਲ', hide: 'ਕੰਟਰੋਲ ਲੁਕਾਓ', back: 'ਵਾਪਸ', contents: 'ਸਥਾਨ', appearance: 'ਦਿੱਖ', more: 'ਹੋਰ', read: 'ਪਾਠ', study: 'ਅਧਿਐਨ', explore: 'ਸ਼ਬਦ ਵੇਖੋ', previous: 'ਪਿਛਲੀ ਸਕ੍ਰੀਨ ਤੇ ਵਾਪਸ ਜਾਓ' }
    : locale === 'hi'
      ? { controls: 'पाठ के नियंत्रण', hide: 'नियंत्रण छिपाएँ', back: 'वापस', contents: 'स्थान', appearance: 'दिखावट', more: 'अधिक', read: 'पाठ', study: 'अध्ययन', explore: 'शब्द देखें', previous: 'पिछली स्क्रीन पर लौटें' }
      : { controls: 'Reader controls', hide: 'Hide reader controls', back: 'Back', contents: 'Location', appearance: 'Appearance', more: 'More', read: 'Read', study: 'Study', explore: 'Explore word', previous: 'Return to previous screen' }
  const selected = props.word?.word
  const meaningCopy = WORD_MEANING_COPY[locale]
  const uiLang = locale === 'pa' ? 'pa-Guru' : locale
  const preferredLanguage = language === 'none' ? 'en' : language
  const preferredMeaning = selected?.[`meaning_${preferredLanguage}`]?.trim()
  const meaning = preferredMeaning || selected?.meaning_en?.trim()
  const actualMeaningLanguage = preferredMeaning ? preferredLanguage : 'en'
  const englishFallback = Boolean(meaning && !preferredMeaning && preferredLanguage !== 'en')

  return createPortal(
    <section className="reader-dock" aria-label={copy.controls} data-testid="reader-dock" hidden={!props.visible} inert={!props.visible} tabIndex={-1}>
      {selected ? <div className="reader-dock__word" aria-live="polite" aria-atomic="true">
        <div className="reader-dock__word-heading"><p className={getScriptTextFontClass(scriptMode)} lang={getScriptTextLang(scriptMode)}>{renderScriptText(selected.gurmukhi, scriptMode)}</p><button type="button" onClick={props.onExplore}>{copy.explore}<IconArrowRight size={14} /></button></div>
        {englishFallback ? <small className="reader-dock__word-source" lang={uiLang}>{meaningCopy.fallback}</small> : null}
        <p data-testid="reader-word-meaning"
          className={meaning && actualMeaningLanguage === 'pa' ? getScriptTextFontClass(scriptMode) : meaning && actualMeaningLanguage === 'hi' ? getScriptTextFontClass('devanagari') : undefined}
          lang={!meaning ? uiLang : actualMeaningLanguage === 'pa' ? getScriptTextLang(scriptMode) : actualMeaningLanguage}>
          {meaning ? actualMeaningLanguage === 'pa' ? renderScriptText(meaning, scriptMode) : meaning : meaningCopy.missing(meaningCopy.languages[preferredLanguage])}
        </p>
      </div> : null}
      <div className="reader-dock__heading"><span>{props.title}</span><button type="button" onClick={props.onHide} aria-label={copy.hide}><IconClose size={16} /></button></div>
      {props.length && props.onLength ? <div className="reader-dock__length"><BaniLengthControl value={props.length} onClick={props.onLength} /></div> : null}
      <div className="reader-dock__context"><button type="button" onClick={props.onSections} aria-haspopup="dialog">{props.location}<span aria-hidden="true">⌄</span></button><fieldset><legend className="sr-only">{locale === 'en' ? 'Reading presentation' : copy.controls}</legend>{(['read', 'study'] as const).map(mode => <label key={mode}><input type="radio" name="reader-presentation-dock" checked={props.presentation === mode} onChange={() => props.onMode(mode)} /><span>{copy[mode]}</span></label>)}</fieldset></div>
      {props.notice ? <div className="reader-dock__notice">{props.notice}</div> : null}
      <nav className="reader-dock__actions" aria-label={copy.controls}>
        <button type="button" onClick={props.onBack} aria-label={copy.previous} data-reader-back="true"><IconArrowLeft size={18} /><span>{copy.back}</span></button>
        <button type="button" onClick={props.onSections} aria-haspopup="dialog"><span className="reader-dock__contents" aria-hidden="true">☷</span><span>{copy.contents}</span></button>
        <button type="button" onClick={props.onAppearance}><span className="study-reader-aa" aria-hidden="true">Aa</span><span>{copy.appearance}</span></button>
        <button type="button" onClick={event => props.onMore(event.currentTarget)} aria-haspopup="dialog"><IconMoreHorizontal size={20} /><span>{copy.more}</span></button>
      </nav>
    </section>, document.body,
  )
}
