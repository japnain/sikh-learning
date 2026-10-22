import { useId, useMemo, useState } from 'react'
import type { ScriptureEntry } from '../types'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { findBaniLines } from '../utils/baniFind'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { getSourceReaderUnitLabel } from '../utils/sourceReaderMeta'
import '../styles/bani-find.css'

const COPY = {
  en: { title: 'Find within this bani', hint: 'Search Gurmukhi or Roman transliteration.', placeholder: 'A word or phrase', empty: 'No matching lines in this reading.', count: (count: number, more: boolean) => `${count}${more ? '+' : ''} matching ${count === 1 ? 'line' : 'lines'}${more ? ' · refine your search' : ''}`, current: 'Current section' },
  pa: { title: 'ਇਸ ਬਾਣੀ ਵਿੱਚ ਲੱਭੋ', hint: 'ਗੁਰਮੁਖੀ ਜਾਂ ਰੋਮਨ ਲਿਪੀ ਵਿੱਚ ਲੱਭੋ।', placeholder: 'ਸ਼ਬਦ ਜਾਂ ਪੰਕਤੀ', empty: 'ਇਸ ਪਾਠ ਵਿੱਚ ਮੇਲ ਖਾਂਦੀ ਪੰਕਤੀ ਨਹੀਂ ਮਿਲੀ।', count: (count: number, more: boolean) => `${count}${more ? '+' : ''} ਮੇਲ ਖਾਂਦੀਆਂ ਪੰਕਤੀਆਂ${more ? ' · ਖੋਜ ਹੋਰ ਸਪਸ਼ਟ ਕਰੋ' : ''}`, current: 'ਮੌਜੂਦਾ ਭਾਗ' },
  hi: { title: 'इस बाणी में खोजें', hint: 'गुरमुखी या रोमन लिपि में खोजें।', placeholder: 'शब्द या पंक्ति', empty: 'इस पाठ में कोई मिलती पंक्ति नहीं मिली।', count: (count: number, more: boolean) => `${count}${more ? '+' : ''} मिलती पंक्तियाँ${more ? ' · खोज और स्पष्ट करें' : ''}`, current: 'वर्तमान भाग' },
} as const

interface Props {
  entries: readonly ScriptureEntry[]
  onJump: (entryIndex: number, lineIndex: number) => void
  currentEntryIndex?: number
}

export default function BaniFindPanel({ entries, onJump, currentEntryIndex }: Props) {
  const id = useId()
  const locale = useLocaleStore(state => state.locale)
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const [query, setQuery] = useState('')
  const hits = useMemo(() => findBaniLines(entries, query, { limit: 61 }), [entries, query])
  const visible = hits.slice(0, 60)
  const copy = COPY[locale]
  return <section className="bani-find" aria-labelledby={`${id}-label`}>
    <label id={`${id}-label`} htmlFor={`${id}-input`}>{copy.title}</label>
    <p id={`${id}-hint`} className="bani-find__hint">{copy.hint}</p>
    <input id={`${id}-input`} type="search" value={query} maxLength={240} placeholder={copy.placeholder}
      aria-describedby={`${id}-hint ${id}-status`} autoComplete="off" spellCheck={false}
      onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing && visible[0]) {
          event.preventDefault()
          onJump(visible[0].entryIndex, visible[0].lineIndex)
        }
      }} />
    <p id={`${id}-status`} role="status" className="bani-find__status">{query.trim() ? visible.length ? copy.count(visible.length, hits.length > 60) : copy.empty : null}</p>
    {visible.length ? <ol className="bani-find__results">
      {visible.map(hit => <li key={`${hit.entryId}:${hit.entryIndex}:${hit.lineIndex}`}>
        <button type="button" onClick={() => onJump(hit.entryIndex, hit.lineIndex)}>
          <span className={getScriptTextFontClass(scriptMode)} lang={getScriptTextLang(scriptMode)}>{renderScriptText(hit.gurmukhi, scriptMode)}</span>
          {hit.matchedField === 'transliteration' ? <span className="bani-find__roman" lang="en">{hit.transliteration}</span> : null}
          <small>{entries[hit.entryIndex].sourceName || entries[hit.entryIndex].scripture} · {getSourceReaderUnitLabel(hit.source, locale, entries[hit.entryIndex].scripture)} {hit.ang}{hit.entryIndex === currentEntryIndex ? ` · ${copy.current}` : ''}</small>
        </button>
      </li>)}
    </ol> : null}
  </section>
}
