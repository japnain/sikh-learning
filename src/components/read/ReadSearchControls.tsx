import type { Ref } from 'react'
import '../../styles/read-search.css'
import type { SearchMode, UiLocale } from '../../types'
import type { ReadPageCopy } from '../../content/readPageCopy'
import { READ_SEARCH_UI, SEARCH_SCOPES, type SearchScope } from '../../content/readSearchCopy'
import { PRIMARY_SEARCH_MODES, SEARCH_INTENT_COPY } from '../../content/searchIntentCopy'
import { SEARCH_SOURCE_LABELS, type SearchSource } from '../../utils/appSearch'
import { SOURCE_READER_META } from '../../utils/sourceReaderMeta'
import { SEARCH_QUERY_MAX_LENGTH } from '../../utils/gurbaniSearch'
import { getSearchModeLabels } from '../../utils/translations'
import { IconSearch } from '../icons'

const GROUPS: Array<{ key: 'gurmukhi' | 'location'; modes: SearchMode[] }> = [
  { key: 'gurmukhi', modes: ['first-letters', 'first-letters-anywhere'] },
  { key: 'location', modes: ['ang'] },
]
const REFINEMENT: Record<UiLocale, Record<'gurmukhi' | 'location' | 'source', string>> = {
  en: { gurmukhi: 'Match Gurmukhi', location: 'Go to a location', source: 'Search within' },
  pa: { gurmukhi: 'ਗੁਰਮੁਖੀ ਵਿੱਚ ਖੋਜ', location: 'ਅੰਗ ਜਾਂ ਵਾਰ ਖੋਲ੍ਹੋ', source: 'ਸਰੋਤ ਚੁਣੋ' },
  hi: { gurmukhi: 'गुरमुखी में खोजें', location: 'अंग या वार खोलें', source: 'स्रोत चुनें' },
}

type Props = {
  copy: ReadPageCopy
  locale: UiLocale
  inputRef: Ref<HTMLInputElement>
  query: string
  mode: SearchMode
  source: SearchSource
  scope: SearchScope
  optionsOpen: boolean
  active: boolean
  status: string
  previousQuery: string
  onQuery: (value: string) => void
  onSubmit: () => void
  onMode: (value: SearchMode) => void
  onSource: (value: SearchSource) => void
  onScope: (value: SearchScope) => void
  onToggleOptions: () => void
  onExit: () => void
  onRecover: () => void
}

export default function ReadSearchControls({ copy, locale, inputRef, query, mode, source, scope, optionsOpen,
  active, status, previousQuery, onQuery, onSubmit, onMode, onSource, onScope, onToggleOptions, onExit, onRecover }: Props) {
  const labels = getSearchModeLabels(locale)
  const ui = READ_SEARCH_UI[locale]
  const intentCopy = SEARCH_INTENT_COPY[locale]
  const intent = intentCopy.modes[mode]
  const hasGurbaniOptions = scope === 'all' || scope === 'gurbani'
  const isAdvancedMode = !PRIMARY_SEARCH_MODES.some(value => value === mode)
  return <>
    <div className="read-quick-find-card__heading">
      <div className="read-quick-find-card__title">
        <p className="eyebrow">{copy.find}</p>
        <h2 id="banis-quick-find-title">{copy.searchTitle}</h2>
      </div>
      {hasGurbaniOptions && <button type="button" onClick={onToggleOptions}
        aria-expanded={optionsOpen} aria-controls="banis-search-options-panel" data-ai-action="toggle-search-options">
        {optionsOpen ? copy.simplify : copy.refine}
      </button>}
    </div>
    <form className="read-search-control read-search-control--intent relative mt-4" data-ai-search-shell="read-smart-search"
      role="search" onSubmit={event => { event.preventDefault(); onSubmit() }}>
      <div className="read-search-field">
      <input ref={inputRef} id="banis-search" name="banis-search" type="search"
        aria-label={ui.searchLabels[scope]} maxLength={SEARCH_QUERY_MAX_LENGTH} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        aria-describedby={hasGurbaniOptions ? 'banis-search-intent-hint' : undefined}
        enterKeyHint="search" inputMode={hasGurbaniOptions && mode === 'ang' ? 'numeric' : 'search'} value={query} onChange={event => onQuery(event.target.value)}
        placeholder={hasGurbaniOptions ? intent.placeholder : ui.placeholders[scope]}
        className="read-search-input w-full rounded-lg border border-sand/15 bg-parchment-card py-4 font-sans text-base text-ink outline-none transition-colors duration-300 placeholder:text-ink/36 focus:border-saffron/45 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text dark:placeholder:text-dark-text/38"
        data-ai-action="read-smart-search" />
      {query && <button type="button" className="read-search-erase" aria-label={intentCopy.clear}
        onClick={event => { onQuery(''); event.currentTarget.parentElement?.querySelector('input')?.focus() }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>}
      </div>
      <button type="submit" className="read-search-submit" aria-label={intentCopy.submit}><span aria-hidden="true"><IconSearch size={19} /></span></button>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</p>
    </form>
    {hasGurbaniOptions && <>
      <div className="read-search-intents" role="group" aria-label={intentCopy.groupLabel}>
        {PRIMARY_SEARCH_MODES.map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => onMode(value)}>{intentCopy.modes[value].label}</button>)}
      </div>
      <p id="banis-search-intent-hint" className="read-search-intent-hint">{intent.hint}</p>
      {!query.trim() && <div className="read-search-intent-examples" role="group" aria-label={intentCopy.examplesLabel}>
        {intent.examples.map(example => <button type="button" key={example} onClick={() => onQuery(example)}>{example}</button>)}
      </div>}
    </>}
    <div className="read-search-kinds" role="group" aria-label={ui.scopeLabel}>
      {SEARCH_SCOPES.map(value => <button type="button" key={value} aria-pressed={scope === value} onClick={() => onScope(value)}>{ui.scopes[value]}</button>)}
    </div>
    {scope === 'stories' ? <p className="read-search-hint">{ui.metadataHint}</p> : null}
    {!optionsOpen && hasGurbaniOptions && (isAdvancedMode || source !== 'all') && <div className="read-search-summary mt-3 flex flex-wrap items-center gap-2">
      {isAdvancedMode && <span className="read-metadata">{labels[mode]}</span>}
      {source !== 'all' && <span className="read-metadata">{SOURCE_READER_META[source].name}</span>}
    </div>}
    {optionsOpen && hasGurbaniOptions && <div id="banis-search-options-panel">
      {GROUPS.map(group => <fieldset key={group.key} className="read-refinement-group">
        <legend>{REFINEMENT[locale][group.key]}</legend>
        <div className="read-refinement-options">{group.modes.map(value => <button type="button" key={value} className="read-refinement-choice" aria-pressed={mode === value} onClick={() => onMode(value)}>{labels[value]}</button>)}</div>
      </fieldset>)}
      <fieldset className="read-refinement-group"><legend>{REFINEMENT[locale].source}</legend>
        <div className="read-refinement-sources">{(Object.keys(SEARCH_SOURCE_LABELS) as SearchSource[]).map(value => <button type="button" key={value} className="read-refinement-choice" aria-pressed={source === value} onClick={() => onSource(value)}>{value === 'all' ? copy.allSources : SOURCE_READER_META[value].name}</button>)}</div>
      </fieldset>
    </div>}
    {active ? <div className="read-search-view-heading"><h3>{ui.results}</h3><button type="button" className="read-search-clear" onClick={onExit}>{ui.exit}</button></div>
      : !query && previousQuery ? <button type="button" className="read-search-recover" onClick={onRecover}>{ui.recover(previousQuery)}</button> : null}
  </>
}
