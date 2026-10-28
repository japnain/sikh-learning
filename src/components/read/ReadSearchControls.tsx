import type { Ref } from 'react'
import type { SearchMode, UiLocale } from '../../types'
import type { ReadPageCopy } from '../../content/readPageCopy'
import { READ_SEARCH_UI, SEARCH_SCOPES, type SearchScope } from '../../content/readSearchCopy'
import { SEARCH_SOURCE_LABELS, type SearchSource } from '../../utils/appSearch'
import { SOURCE_READER_META } from '../../utils/sourceReaderMeta'
import { getSearchModeLabels } from '../../utils/translations'
import { IconSearch } from '../icons'

const GROUPS: Array<{ key: 'gurmukhi' | 'latin' | 'location'; modes: SearchMode[] }> = [
  { key: 'gurmukhi', modes: ['first-letters', 'first-letters-anywhere', 'gurmukhi'] },
  { key: 'latin', modes: ['english', 'transliteration'] },
  { key: 'location', modes: ['ang'] },
]
const REFINEMENT: Record<UiLocale, Record<'gurmukhi' | 'latin' | 'location' | 'source', string>> = {
  en: { gurmukhi: 'Match Gurmukhi', latin: 'English & Romanized text', location: 'Go to a location', source: 'Search within' },
  pa: { gurmukhi: 'ਗੁਰਮੁਖੀ ਵਿੱਚ ਖੋਜ', latin: 'ਅੰਗਰੇਜ਼ੀ ਅਤੇ ਰੋਮਨ ਲਿਪੀ', location: 'ਅੰਗ ਜਾਂ ਵਾਰ ਖੋਲ੍ਹੋ', source: 'ਸਰੋਤ ਚੁਣੋ' },
  hi: { gurmukhi: 'गुरमुखी में खोजें', latin: 'अंग्रेज़ी और रोमन लिपि', location: 'अंग या वार खोलें', source: 'स्रोत चुनें' },
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
  onMode: (value: SearchMode) => void
  onSource: (value: SearchSource) => void
  onScope: (value: SearchScope) => void
  onToggleOptions: () => void
  onExit: () => void
  onRecover: () => void
}

export default function ReadSearchControls({ copy, locale, inputRef, query, mode, source, scope, optionsOpen,
  active, status, previousQuery, onQuery, onMode, onSource, onScope, onToggleOptions, onExit, onRecover }: Props) {
  const labels = getSearchModeLabels(locale)
  const ui = READ_SEARCH_UI[locale]
  const hasGurbaniOptions = scope === 'all' || scope === 'gurbani'
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
    <div className="read-search-control relative mt-4" data-ai-search-shell="read-smart-search">
      <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/32 dark:text-dark-text/34" />
      <input ref={inputRef} id="banis-search" name="banis-search" type="search"
        aria-label={ui.searchLabels[scope]} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        enterKeyHint="search" inputMode="search" value={query} onChange={event => onQuery(event.target.value)}
        placeholder={hasGurbaniOptions && mode === 'ang' ? labels.ang : ui.placeholders[scope]}
        className="read-search-input w-full rounded-lg border border-sand/15 bg-parchment-card py-4 pl-11 pr-4 font-sans text-base text-ink outline-none transition-colors duration-300 placeholder:text-ink/36 focus:border-saffron/45 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text dark:placeholder:text-dark-text/38"
        data-ai-action="read-smart-search" />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</p>
    </div>
    <div className="read-search-kinds" role="group" aria-label={ui.scopeLabel}>
      {SEARCH_SCOPES.map(value => <button type="button" key={value} aria-pressed={scope === value} onClick={() => onScope(value)}>{ui.scopes[value]}</button>)}
    </div>
    {scope === 'stories' ? <p className="read-search-hint">{ui.metadataHint}</p> : null}
    {!optionsOpen && hasGurbaniOptions && <div className="read-search-summary mt-3 flex flex-wrap items-center gap-2">
      <span className="read-metadata">{mode === 'auto-detect' ? copy.autoDetect : labels[mode]}</span>
      {source !== 'all' && <span className="read-metadata">{SOURCE_READER_META[source].name}</span>}
    </div>}
    {optionsOpen && hasGurbaniOptions && <div id="banis-search-options-panel">
      <button type="button" className="read-refinement-choice read-refinement-auto" aria-pressed={mode === 'auto-detect'} onClick={() => onMode('auto-detect')}>{copy.autoDetect}</button>
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
