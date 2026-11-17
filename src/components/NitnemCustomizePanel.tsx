import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useBeforeUnload, useLocation, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconClose, IconSearch } from './icons'
import ModalSheet from './ModalSheet'
import { useBani } from '../hooks/useBani'
import {
  DEFAULT_NITNEM_OPTION_IDS, NITNEM_ROUTE_OPTIONS, NITNEM_CATEGORY_ORDER, compareNitnemOptions,
  getNitnemOption, type NitnemRouteOption, type NitnemCategory, useNitemStore,
} from '../store/nitnem'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useNitnemOfflineStatusStore } from '../store/nitnemOffline'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { asSupportedSundarGutkaBaniId, normalizeSundarGutkaLength } from '../utils/sundarGutkaLength'
import { clearNitnemDraft, isNitnemDraftStorageAvailable, readNitnemDraft, rememberNitnemDraft, subscribeNitnemDraftStorage } from '../utils/nitnemDraft'
import { NITNEM_CUSTOMIZE_COPY } from '../utils/nitnemCustomizeCopy'
import type { SundarGutkaLength } from '../types'

type LengthPreferences = ReturnType<typeof useSundarGutkaLengthStore.getState>['lengths']

function LengthChoice({ option, value, onChange }: {
  option: NitnemRouteOption
  value: SundarGutkaLength
  onChange: (value: SundarGutkaLength) => void
}) {
  const locale = useLocaleStore(state => state.locale)
  const copy = NITNEM_CUSTOMIZE_COPY[locale]
  const { availableLengths, loading, error, retry } = useBani(option.baniDbId ?? null, value)
  const choices = availableLengths.length ? availableLengths : [value]
  const savedLengthUnavailable = !choices.includes(value)
  return (
    <div className="nitnem-editor-length">
      <label htmlFor={`nitnem-length-${option.id}`}>{copy.readingLength}</label>
      <select id={`nitnem-length-${option.id}`} aria-label={copy.lengthLabel(option.romanizedTitle)} value={value}
        onChange={event => onChange(event.target.value as SundarGutkaLength)}>
        {savedLengthUnavailable ? <option value={value}>{copy.lengths[value]} · {copy.saved}</option> : null}
        {choices.map(length => <option key={length} value={length}>{copy.lengths[length]}</option>)}
      </select>
      {loading ? <p role="status">{copy.checkingLengths}</p> : error && availableLengths.length === 0 ? <p>{copy.keepingLength} <button type="button" onClick={retry}>{copy.retryLengths}</button></p> : null}
    </div>
  )
}

export default function NitnemCustomizePanel() {
  const navigate = useNavigate()
  const location = useLocation()
  // Only known in-app entry points may control where the editor returns.
  const returnPath = location.state?.nitnemOrigin === '/more' ? '/more' : '/'
  const selectedIds = useNitemStore(state => state.selectedIds)
  const weeklyDayGoal = useNitemStore(state => state.weeklyDayGoal)
  const completionTrackingEnabled = useNitemStore(state => state.completionTrackingEnabled)
  const lengths = useSundarGutkaLengthStore(state => state.lengths)
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const locale = useLocaleStore(state => state.locale)
  const copy = NITNEM_CUSTOMIZE_COPY[locale]
  const offline = useNitnemOfflineStatusStore()
  const [committedBase] = useState(() => ({ selectedIds: [...selectedIds], lengths: { ...lengths }, weeklyDayGoal, completionTrackingEnabled }))
  const [recoveredDraft] = useState(() => readNitnemDraft(committedBase))
  const [draftIds, setDraftIds] = useState(() => [...(recoveredDraft?.selectedIds ?? selectedIds)])
  const [draftLengths, setDraftLengths] = useState<LengthPreferences>(() => ({ ...(recoveredDraft?.lengths ?? lengths) }))
  const [draftGoal, setDraftGoal] = useState(recoveredDraft?.weeklyDayGoal ?? weeklyDayGoal)
  const [draftTracking, setDraftTracking] = useState(recoveredDraft?.completionTrackingEnabled ?? completionTrackingEnabled)
  const draftStorageAvailable = useSyncExternalStore(subscribeNitnemDraftStorage, isNitnemDraftStorageAvailable, () => true)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<NitnemCategory | 'all'>('all')
  const [expanded, setExpanded] = useState<string[]>([])
  const [preferencesOpen, setPreferencesOpen] = useState(() => location.hash === '#nitnem-continuity' || (typeof window !== 'undefined' && window.innerWidth >= 800))
  const [lastRemoved, setLastRemoved] = useState<{ id: string; index: number } | null>(null)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const keepEditingRef = useRef<HTMLButtonElement>(null)
  const selectedControls = useRef(new Map<string, HTMLElement>())
  const moveControls = useRef(new Map<string, HTMLButtonElement>())
  const availableControls = useRef(new Map<string, HTMLButtonElement>())
  const librarySearchRef = useRef<HTMLInputElement>(null)
  const editorHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<{ list: 'selected' | 'available' | 'move'; id?: string } | null>(null)
  const selected = draftIds.map(getNitnemOption).filter((option): option is NitnemRouteOption => option !== null)
  const available = useMemo(() => [...NITNEM_ROUTE_OPTIONS].sort(compareNitnemOptions), [])
    .filter(option => !draftIds.includes(option.id))
  const normalizeSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()
  const queryWords = normalizeSearch(query).split(/\s+/).filter(Boolean)
  const matches = available.filter(option => {
    if (category !== 'all' && option.category !== category) return false
    const haystack = normalizeSearch(`${option.name} ${option.romanizedTitle} ${option.gurmukhiTitle} ${renderScriptText(option.gurmukhiTitle, 'devanagari')} ${option.searchTerms ?? ''} ${option.group} ${copy.groups[option.group]}`)
    return queryWords.every(word => haystack.includes(word))
  })
  const openLibrary = () => { setQuery(''); setCategory('all'); setNotice(''); setLibraryOpen(true) }
  const toggleBani = (id: string) => setExpanded(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id])
  useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const control = target.id
      ? (target.list === 'selected' ? selectedControls.current : target.list === 'move' ? moveControls.current : availableControls.current).get(target.id)
      : undefined
    ;(control ?? (libraryOpen ? librarySearchRef.current : editorHeadingRef.current))?.focus({ preventScroll: true })
  }, [draftIds, libraryOpen])
  const readingsChanged = draftIds.join('|') !== selectedIds.join('|')
    || Object.entries(draftLengths).some(([id, value]) => value !== lengths[id as keyof LengthPreferences])
  const hasChanges = readingsChanged || draftGoal !== weeklyDayGoal || draftTracking !== completionTrackingEnabled
  const hasUnsavedChanges = hasChanges || Boolean(saveError)
  const draftValues = useMemo(() => ({ selectedIds: draftIds, lengths: draftLengths, weeklyDayGoal: draftGoal, completionTrackingEnabled: draftTracking }), [draftIds, draftLengths, draftGoal, draftTracking])
  useEffect(() => {
    if (hasChanges) rememberNitnemDraft(committedBase, draftValues)
    else clearNitnemDraft()
  }, [committedBase, draftValues, hasChanges])
  useBeforeUnload(useCallback(event => {
    if (!hasUnsavedChanges) return
    event.preventDefault()
    event.returnValue = ''
  }, [hasUnsavedChanges]))
  const leave = () => {
    if (hasUnsavedChanges) setLeaveOpen(true)
    else { clearNitnemDraft(); navigate(returnPath) }
  }
  const offlineCopy = offline.status === 'ready'
    ? copy.ready(offline.ready, offline.total)
    : offline.status === 'checking' ? copy.checking
    : offline.status === 'preparing' ? copy.preparing(offline.ready, offline.total)
    : offline.status === 'offline' ? copy.offline(offline.ready, offline.total)
    : offline.status === 'paused' ? copy.paused(offline.ready, offline.total)
    : offline.status === 'partial' ? copy.partial(offline.ready, offline.total)
    : copy.offlineError

  const move = (id: string, direction: 'up' | 'down') => {
    const index = draftIds.indexOf(id)
    const target = index + (direction === 'up' ? -1 : 1)
    if (target < 0 || target >= draftIds.length) return
    pendingFocus.current = { list: 'move', id: `${id}-${target === 0 ? 'down' : target === draftIds.length - 1 ? 'up' : direction}` }
    const next = [...draftIds]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraftIds(next)
    setLastRemoved(null)
    setNotice(copy.moved(getNitnemOption(id)?.name ?? id, target + 1))
  }
  const remove = (id: string) => {
    if (draftIds.length <= 1) return
    const index = draftIds.indexOf(id)
    pendingFocus.current = { list: 'selected', id: draftIds[index + 1] ?? draftIds[index - 1] }
    setLastRemoved({ id, index })
    setDraftIds(draftIds.filter(value => value !== id))
    setNotice(copy.removed(getNitnemOption(id)?.name ?? id))
  }
  const add = (option: NitnemRouteOption) => {
    const index = matches.findIndex(item => item.id === option.id)
    pendingFocus.current = { list: 'available', id: matches[index + 1]?.id ?? matches[index - 1]?.id }
    setDraftIds(ids => ids.includes(option.id) ? ids : [...ids, option.id])
    setLastRemoved(null)
    setNotice(copy.added(option.name))
    if (available.length === 1) setLibraryOpen(false)
  }
  const undoRemove = () => {
    if (!lastRemoved) return
    const next = draftIds.filter(id => id !== lastRemoved.id)
    next.splice(Math.min(lastRemoved.index, next.length), 0, lastRemoved.id)
    pendingFocus.current = { list: 'selected', id: lastRemoved.id }
    setDraftIds(next)
    setLastRemoved(null)
    setNotice(copy.added(getNitnemOption(lastRemoved.id)?.name ?? lastRemoved.id))
  }
  const save = () => {
    const current = useNitemStore.getState()
    const committedRoutine = { selectedIds: [...current.selectedIds], weeklyDayGoal: current.weeklyDayGoal, completionTrackingEnabled: current.completionTrackingEnabled }
    const committedLengths = { ...useSundarGutkaLengthStore.getState().lengths }
    const nextLengths = { ...committedLengths }
    for (const [id, value] of Object.entries(draftLengths)) {
      const supportedId = asSupportedSundarGutkaBaniId(id)
      const validLength = normalizeSundarGutkaLength(value)
      if (supportedId && validLength) nextLengths[supportedId] = validLength
    }
    setSaveError('')
    try {
      useNitemStore.getState().setSelectedIds(draftIds)
      useNitemStore.getState().setWeeklyDayGoal(draftGoal)
      useNitemStore.getState().setCompletionTrackingEnabled(draftTracking)
      // Persist the complete draft on every attempt, including a retry after a failed write.
      useSundarGutkaLengthStore.setState({ lengths: nextLengths })
      clearNitnemDraft()
      navigate(returnPath)
    } catch {
      // Persist middleware updates memory before writing storage. Restore the
      // committed draft fields even when storage remains unavailable.
      try { useNitemStore.setState(committedRoutine) } catch { /* Memory is restored before this write can fail. */ }
      try { useSundarGutkaLengthStore.setState({ lengths: committedLengths }) } catch { /* Restore this store independently. */ }
      setSaveError(copy.saveError)
    }
  }
  const title = (option: NitnemRouteOption) => (
    <>
      <p className={`nitnem-editor-bani-title ${getScriptTextFontClass(scriptMode)}`} lang={getScriptTextLang(scriptMode)}>{renderScriptText(option.gurmukhiTitle, scriptMode)}</p>
      <p className="nitnem-editor-bani-name">{option.romanizedTitle}</p>
    </>
  )
  return (
    <div className="nitnem-editor" data-testid="nitnem-customize-panel">
      <nav className="nitnem-editor-nav" aria-label={copy.titleEmphasis}>
        <button type="button" onClick={leave}><IconArrowLeft size={18} />{copy.back}</button>
      </nav>
      <header className="nitnem-editor-intro">
        <h1 id="nitnem-customize-title" ref={editorHeadingRef} tabIndex={-1}>{copy.title} <em>{copy.titleEmphasis}</em></h1>
        <p>{copy.subtitle}</p>
        {recoveredDraft ? <p className="nitnem-editor-recovered" role="status">{copy.recovered}</p> : null}
        {hasChanges && !draftStorageAvailable ? <p className="nitnem-editor-draft-warning" role="status">{copy.draftUnavailable}</p> : null}
      </header>
      <div className="nitnem-editor-layout">
      <section className="nitnem-editor-routine" aria-labelledby="nitnem-routine-title" data-testid="nitnem-ritual-order">
        <div className="nitnem-editor-routine-heading">
          <div><h2 id="nitnem-routine-title">{copy.routineTitle}</h2><p className="nitnem-editor-selection-count">{copy.selected(selected.length)}</p></div>
          <button type="button" onClick={openLibrary} disabled={!available.length} className="nitnem-editor-add"><span aria-hidden="true">＋</span>{copy.add}</button>
        </div>
        <p className="nitnem-editor-hint">{copy.orderHint}</p>
        <ol className="nitnem-editor-list">
          {selected.map((option, index) => {
            const lengthId = asSupportedSundarGutkaBaniId(option.baseBaniId)
            const isExpanded = expanded.includes(option.id)
            return <li className="nitnem-editor-row" key={option.id} data-testid="nitnem-ritual-item">
              {lengthId ? <details className="nitnem-editor-bani-details" open={isExpanded}>
                <summary aria-label={copy.editBani(option.romanizedTitle)} onClick={event => { event.preventDefault(); toggleBani(option.id) }} ref={node => { if (node) selectedControls.current.set(option.id, node); else selectedControls.current.delete(option.id) }}>
                  <span className="nitnem-editor-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div className="nitnem-editor-bani">{title(option)}<p className="nitnem-editor-period">{copy.groups[option.group]}{lengthId ? ` · ${copy.lengths[draftLengths[lengthId]]}` : ''}</p></div>
                  <span className="nitnem-editor-edit" aria-hidden="true">{copy.readingLength}<IconArrowRight size={14} /></span>
                </summary>
                {isExpanded ? <div className="nitnem-editor-bani-adjustments">
                  <LengthChoice option={option} value={draftLengths[lengthId]} onChange={value => setDraftLengths(current => ({ ...current, [lengthId]: value }))} />
                  <p className="nitnem-editor-hint">{copy.position(index + 1, selected.length)}</p>
                </div> : null}
              </details> : <div className="nitnem-editor-fixed-title" role="group" tabIndex={-1} aria-label={option.romanizedTitle} ref={node => { if (node) selectedControls.current.set(option.id, node); else selectedControls.current.delete(option.id) }}>
                <span className="nitnem-editor-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="nitnem-editor-bani">{title(option)}<p className="nitnem-editor-period">{copy.groups[option.group]}</p></div>
              </div>}
              <div className="nitnem-editor-row-actions">
                <div>
                  <button type="button" disabled={index === 0} onClick={() => move(option.id, 'up')} ref={node => { if (node) moveControls.current.set(`${option.id}-up`, node); else moveControls.current.delete(`${option.id}-up`) }} aria-label={copy.moveUp(option.romanizedTitle)}><IconArrowRight size={14} className="-rotate-90" /><span>{copy.up}</span></button>
                  <button type="button" disabled={index === selected.length - 1} onClick={() => move(option.id, 'down')} ref={node => { if (node) moveControls.current.set(`${option.id}-down`, node); else moveControls.current.delete(`${option.id}-down`) }} aria-label={copy.moveDown(option.romanizedTitle)}><IconArrowRight size={14} className="rotate-90" /><span>{copy.down}</span></button>
                </div>
                <button type="button" disabled={selected.length === 1} onClick={() => remove(option.id)} aria-label={copy.removeBani(option.romanizedTitle)}><IconClose size={14} />{copy.remove}</button>
              </div>
            </li>
          })}
        </ol>
        {selected.length === 1 ? <p className="nitnem-editor-hint">{copy.keepOne}</p> : null}
        {lastRemoved ? <div className="nitnem-editor-undo" role="status"><span>{copy.removed(getNitnemOption(lastRemoved.id)?.name ?? lastRemoved.id)}</span><button type="button" onClick={undoRemove}>{copy.undo}</button></div> : null}
        <button type="button" className="nitnem-editor-reset" onClick={() => { setDraftIds([...DEFAULT_NITNEM_OPTION_IDS]); setLastRemoved(null); setNotice(copy.restoredSeven) }} data-testid="nitnem-reset">{copy.restore}</button>
      </section>
      <aside className="nitnem-editor-preferences">
        <details open={preferencesOpen} className="nitnem-editor-preferences-disclosure" id="nitnem-continuity">
          <summary aria-label={copy.preferences} onClick={event => { event.preventDefault(); setPreferencesOpen(value => !value) }}>
            <div><span>{copy.preferences}</span><small>{draftTracking ? copy.daysPerWeek(draftGoal) : copy.trackingOff}</small></div><IconArrowRight size={18} />
          </summary>
          <div className="nitnem-editor-preferences-body">
            <section className="nitnem-editor-goal" aria-labelledby="nitnem-weekly-goal-title">
              <h2 id="nitnem-weekly-goal-title">{copy.continuity}</h2>
              <p>{copy.goalDescription}</p>
              <div className="nitnem-editor-tracking"><div><span id="nitnem-tracking-label">{copy.completion}</span><p id="nitnem-tracking-description">{copy.completionDescription}</p></div><button type="button" role="switch" aria-labelledby="nitnem-tracking-label" aria-describedby="nitnem-tracking-description" aria-checked={draftTracking} onClick={() => setDraftTracking(value => !value)}><span /></button></div>
              <label htmlFor="nitnem-weekly-goal">{copy.weeklyGoal}</label>
              <select id="nitnem-weekly-goal" value={draftGoal} onChange={event => setDraftGoal(Number(event.target.value))}>{Array.from({ length: 7 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{copy.daysPerWeek(day)}</option>)}</select>
              {!draftTracking ? <p className="nitnem-editor-hint">{copy.goalPaused}</p> : null}
            </section>
            <section className="nitnem-editor-offline" aria-labelledby="nitnem-offline-title" data-offline-status={offline.status}>
              <div><h2 id="nitnem-offline-title">{copy.offlineTitle}</h2><p role="status">{offlineCopy}</p>{readingsChanged ? <p className="nitnem-editor-offline-draft">{copy.draftPreparing}</p> : null}</div>
              {['offline', 'paused', 'partial', 'error'].includes(offline.status) ? <button type="button" onClick={offline.retry}>{offline.status === 'paused' ? copy.prepareNow : copy.tryAgain}<IconArrowRight size={16} /></button> : null}
            </section>
          </div>
        </details>
        <p className="nitnem-editor-save-hint">{copy.saveHint}</p>
      </aside>
      </div>
      <p className="nitnem-editor-notice sr-only" role="status" aria-live="polite">{notice}</p>
      {saveError ? <p className="nitnem-editor-save-error" role="alert">{saveError}</p> : null}
      <footer className="nitnem-editor-footer"><p className="nitnem-editor-save-state" aria-live="polite">{saveError ? copy.notSaved : hasChanges ? copy.unsaved : copy.upToDate}</p><div className="nitnem-editor-save-actions"><button type="button" onClick={leave} className="nitnem-editor-cancel">{copy.cancel}</button><button type="button" onClick={save} className="nitnem-editor-save" aria-label={copy.saveRoutine}>{copy.saveRoutine}<IconArrowRight size={18} /></button></div></footer>
      <ModalSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} title={copy.discardTitle} description={copy.discardDescription} className="nitnem-editor-discard" initialFocusRef={keepEditingRef}>
        <h2>{copy.discardTitle}</h2>
        <p>{copy.discardBody}</p>
        <div>
          <button ref={keepEditingRef} type="button" onClick={() => setLeaveOpen(false)} className="nitnem-editor-keep-editing">{copy.keepEditing}</button>
          <button type="button" onClick={() => { clearNitnemDraft(); setLeaveOpen(false); navigate(returnPath) }}>{copy.discard}</button>
        </div>
      </ModalSheet>
      <ModalSheet open={libraryOpen} onClose={() => setLibraryOpen(false)} title={copy.add} description={copy.addDescription} className="nitnem-editor-library" testId="nitnem-selection" initialFocusRef={librarySearchRef}>
        <div className="nitnem-editor-library-heading"><div><p className="nitnem-editor-eyebrow">{copy.libraryCount(NITNEM_ROUTE_OPTIONS.length)}</p><h2>{copy.addTitle}</h2></div><button type="button" onClick={() => setLibraryOpen(false)} onFocus={event => { const sheet = event.currentTarget.closest<HTMLElement>('.nitnem-editor-library'); if (sheet) sheet.scrollTop = 0 }} aria-label={copy.closeAvailable}><IconClose size={20} /></button></div>
        <label className="nitnem-editor-search"><IconSearch size={18} /><input ref={librarySearchRef} type="search" aria-label={copy.searchLabel} placeholder={copy.searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="nitnem-editor-library-filters">
          <label htmlFor="nitnem-library-category">{copy.category}</label>
          <select id="nitnem-library-category" value={category} onChange={event => setCategory(event.target.value as NitnemCategory | 'all')}>
            <option value="all">{copy.allCategories}</option>
            {NITNEM_CATEGORY_ORDER.map(value => <option key={value} value={value}>{copy.categories[value]}</option>)}
          </select>
          <p aria-live="polite">{copy.available(matches.length)}</p>
        </div>
        <div className="nitnem-editor-available">
          {matches.map(option => <article key={option.id}><div>{title(option)}<p className="nitnem-editor-period">{option.category ? copy.categories[option.category] : copy.groups[option.group]}</p></div><button type="button" ref={node => { if (node) availableControls.current.set(option.id, node); else availableControls.current.delete(option.id) }} onClick={() => add(option)} aria-label={copy.addBani(option.romanizedTitle)}><span aria-hidden="true">＋</span><span>{copy.addShort}</span></button></article>)}
          {matches.length === 0 ? <div className="nitnem-editor-empty"><p>{available.length === 0 ? copy.allAdded : copy.noMatches}</p>{available.length > 0 ? <button type="button" onClick={() => { setQuery(''); setCategory('all'); librarySearchRef.current?.focus() }}>{copy.clearFilters}</button> : null}</div> : null}
        </div>
        <p className="nitnem-editor-library-feedback" role="status">{notice || copy.addedHint}</p><footer className="nitnem-editor-library-footer"><p className="nitnem-editor-hint">{copy.inRoutine(selected.length)}</p><button type="button" onClick={() => setLibraryOpen(false)} onFocus={event => { const sheet = event.currentTarget.closest<HTMLElement>('.nitnem-editor-library'); if (sheet) sheet.scrollTop = sheet.scrollHeight }}>{copy.done}<IconArrowRight size={18} /></button></footer>
      </ModalSheet>
    </div>
  )
}
