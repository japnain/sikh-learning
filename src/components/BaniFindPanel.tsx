import { useId, useMemo, useState } from 'react'
import type { ScriptureEntry } from '../types'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import { findBaniLines, getBaniFindFragments } from '../utils/baniFind'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { getSourceReaderUnitLabel } from '../utils/sourceReaderMeta'
import '../styles/bani-find.css'

const COPY = {
  en: { title: 'Find within this bani', hint: 'Search Gurmukhi, Devanagari or Roman transliteration.', placeholder: 'A word or phrase', empty: 'No matching lines in this reading.', count: (count: number, more: boolean) => `${count}${more ? '+' : ''} matching ${count === 1 ? 'line' : 'lines'}${more ? ' · refine your search' : ''}`, current: 'Current section' },
  pa: { title: 'ਇਸ ਬਾਣੀ ਵਿੱਚ ਲੱਭੋ', hint: 'ਗੁਰਮੁਖੀ, ਦੇਵਨਾਗਰੀ ਜਾਂ ਰੋਮਨ ਲਿਪੀ ਵਿੱਚ ਲੱਭੋ।', placeholder: 'ਸ਼ਬਦ ਜਾਂ ਪੰਕਤੀ', empty: 'ਇਸ ਪਾਠ ਵਿੱਚ ਮੇਲ ਖਾਂਦੀ ਪੰਕਤੀ ਨਹੀਂ ਮਿਲੀ।', count: (count: number, more: boolean) => `${count}${more ? '+' : ''} ਮੇਲ ਖਾਂਦੀਆਂ ਪੰਕਤੀਆਂ${more ? ' · ਖੋਜ ਹੋਰ ਸਪਸ਼ਟ ਕਰੋ' : ''}`, current: 'ਮੌਜੂਦਾ ਭਾਗ' },
  hi: { title: 'इस बाणी में खोजें', hint: 'गुरमुखी, देवनागरी या रोमन लिपि में खोजें।', placeholder: 'शब्द या पंक्ति', empty: 'इस पाठ में कोई मिलती पंक्ति नहीं मिली।', count: (count: number, more: boolean) => `${count}${more ? '+' : ''} मिलती पंक्तियाँ${more ? ' · खोज और स्पष्ट करें' : ''}`, current: 'वर्तमान भाग' },
} as const

interface Props {
  entries: readonly ScriptureEntry[]
  onJump: (entryIndex: number, lineIndex: number) => void
  currentEntryIndex?: number
  query?: string
  onQueryChange?: (query: string) => void
}

function FindText({ text, query }: { text: string; query: string }) {
  return getBaniFindFragments(text, query).map((fragment, index) => fragment.match
    ? <mark key={index}>{fragment.text}</mark> : fragment.text)
}

export default function BaniFindPanel({ entries, onJump, currentEntryIndex, query: controlledQuery, onQueryChange }: Props) {
  const id = useId()
  const locale = useLocaleStore(state => state.locale)
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const [localQuery, setLocalQuery] = useState('')
  const query = controlledQuery ?? localQuery
  const updateQuery = (value: string) => { setLocalQuery(value); onQueryChange?.(value) }
  const hits = useMemo(() => findBaniLines(entries, query, { limit: 61 }), [entries, query])
  const visible = hits.slice(0, 60)
  const copy = COPY[locale]
  return <section className="bani-find" aria-labelledby={`${id}-label`}>
    <label id={`${id}-label`} htmlFor={`${id}-input`}>{copy.title}</label>
    <p id={`${id}-hint`} className="bani-find__hint">{copy.hint}</p>
    <input id={`${id}-input`} type="search" value={query} maxLength={240} placeholder={copy.placeholder}
      aria-describedby={`${id}-hint ${id}-status`} autoComplete="off" spellCheck={false}
      onChange={event => updateQuery(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing && visible[0]) {
          event.preventDefault()
          onJump(visible[0].entryIndex, visible[0].lineIndex)
        }
      }} />
    <p id={`${id}-status`} role="status" className="bani-find__status">{query.trim() ? visible.length ? copy.count(visible.length, hits.length > 60) : copy.empty : null}</p>
    {visible.length ? <ol className="bani-find__results">
      {visible.map(hit => <li key={`${hit.entryId}:${hit.entryIndex}:${hit.lineIndex}`}>
        <button type="button" onClick={() => onJump(hit.entryIndex, hit.lineIndex)} aria-label={[
          renderScriptText(hit.gurmukhi, scriptMode), hit.matchedField === 'transliteration' ? hit.transliteration : null,
          `${entries[hit.entryIndex].sourceName || entries[hit.entryIndex].scripture} · ${getSourceReaderUnitLabel(hit.source, locale, entries[hit.entryIndex].scripture)} ${hit.ang}`,
          hit.entryIndex === currentEntryIndex ? copy.current : null,
        ].filter(Boolean).join(' · ')}>
          <span className={getScriptTextFontClass(scriptMode)} lang={getScriptTextLang(scriptMode)}><FindText text={renderScriptText(hit.gurmukhi, scriptMode)} query={hit.matchedField === 'gurmukhi' ? renderScriptText(query, scriptMode) : hit.matchedField === 'devanagari' && scriptMode === 'devanagari' ? query : ''} /></span>
          {hit.matchedField === 'transliteration' ? <span className="bani-find__roman" lang="en"><FindText text={hit.transliteration} query={query} /></span> : null}
          <small>{entries[hit.entryIndex].sourceName || entries[hit.entryIndex].scripture} · {getSourceReaderUnitLabel(hit.source, locale, entries[hit.entryIndex].scripture)} {hit.ang}{hit.entryIndex === currentEntryIndex ? ` · ${copy.current}` : ''}</small>
        </button>
      </li>)}
    </ol> : null}
  </section>
}
