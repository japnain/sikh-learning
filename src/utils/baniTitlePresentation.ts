import type { UiLocale } from '../types'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from './readerDisplay'

type BaniNames = { romanizedTitle: string; gurmukhiTitle: string }

/** Navigation names follow interface language; scripture display remains independent. */
export function getBaniTitlePresentation(names: BaniNames, locale: UiLocale) {
  const romanized = { text: names.romanizedTitle, lang: 'en', fontClassName: 'font-sans' }
  const scriptMode = locale === 'hi' ? 'devanagari' : 'gurmukhi'
  const script = {
    text: renderScriptText(names.gurmukhiTitle, scriptMode),
    lang: getScriptTextLang(scriptMode),
    fontClassName: getScriptTextFontClass(scriptMode),
  }
  return locale === 'en'
    ? { primary: romanized, secondary: script }
    : { primary: script, secondary: romanized }
}
