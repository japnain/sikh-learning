import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useBeforeUnload, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconClose, IconSearch } from './icons'
import ModalSheet from './ModalSheet'
import { useBani } from '../hooks/useBani'
import {
  DEFAULT_NITNEM_OPTION_IDS, NITNEM_ROUTE_OPTIONS, compareNitnemOptions,
  getNitnemOption, type NitnemRouteOption, useNitemStore,
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
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const keepEditingRef = useRef<HTMLButtonElement>(null)
  const selected = draftIds.map(getNitnemOption).filter((option): option is NitnemRouteOption => option !== null)
  const available = useMemo(() => [...NITNEM_ROUTE_OPTIONS].sort(compareNitnemOptions), [])
    .filter(option => !draftIds.includes(option.id))
  const matches = available.filter(option => `${option.name} ${option.gurmukhiTitle} ${option.group} ${copy.groups[option.group]}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
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
    else { clearNitnemDraft(); navigate('/') }
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
    const next = [...draftIds]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraftIds(next)
    setNotice(copy.moved(getNitnemOption(id)?.name ?? id, target + 1))
  }
  const remove = (id: string) => {
    if (draftIds.length <= 1) return
    setDraftIds(draftIds.filter(value => value !== id))
    setNotice(copy.removed(getNitnemOption(id)?.name ?? id))
  }
  const add = (option: NitnemRouteOption) => {
    setDraftIds(ids => ids.includes(option.id) ? ids : [...ids, option.id])
    setNotice(copy.added(option.name))
    if (available.length === 1) setLibraryOpen(false)
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
      navigate('/')
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
        <h1 id="nitnem-customize-title">{copy.title} <em>{copy.titleEmphasis}</em></h1>
        <p>{copy.subtitle}</p>
        {recoveredDraft ? <p className="nitnem-editor-recovered" role="status">{copy.recovered}</p> : null}
        {hasChanges && !draftStorageAvailable ? <p className="nitnem-editor-draft-warning" role="status">{copy.draftUnavailable}</p> : null}
      </header>
      <section aria-labelledby="nitnem-customize-title" data-testid="nitnem-ritual-order">
        <p className="nitnem-editor-selection-count">{copy.selected(selected.length)}</p>
        <ol className="nitnem-editor-list">
          {selected.map((option, index) => {
            const lengthId = asSupportedSundarGutkaBaniId(option.baseBaniId)
            return <li className="nitnem-editor-row" key={option.id} data-testid="nitnem-ritual-item">
              <details className="nitnem-editor-bani-details">
                <summary aria-label={copy.editBani(option.romanizedTitle)}>
                  <span className="nitnem-editor-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div className="nitnem-editor-bani">{title(option)}<p className="nitnem-editor-period">{copy.groups[option.group]}{lengthId ? ` · ${copy.lengths[draftLengths[lengthId]]}` : ''}</p></div>
                  <span className="nitnem-editor-edit" aria-hidden="true">{copy.edit} <IconArrowRight size={14} /></span>
                </summary>
                <div className="nitnem-editor-bani-adjustments">
                  {lengthId ? <LengthChoice option={option} value={draftLengths[lengthId]} onChange={value => setDraftLengths(current => ({ ...current, [lengthId]: value }))} /> : null}
                  <div className="nitnem-editor-row-actions">
                    <span>{copy.position(index + 1, selected.length)}</span>
                    <div>
                      <button type="button" disabled={index === 0} onClick={() => move(option.id, 'up')} aria-label={copy.moveUp(option.romanizedTitle)}><IconArrowRight size={16} className="-rotate-90" /><span>{copy.up}</span></button>
                      <button type="button" disabled={index === selected.length - 1} onClick={() => move(option.id, 'down')} aria-label={copy.moveDown(option.romanizedTitle)}><IconArrowRight size={16} className="rotate-90" /><span>{copy.down}</span></button>
                    </div>
                    <button type="button" disabled={selected.length === 1} onClick={() => remove(option.id)} aria-label={copy.removeBani(option.romanizedTitle)}>{copy.remove}</button>
                  </div>
                  {selected.length === 1 ? <p className="nitnem-editor-hint">{copy.keepOne}</p> : null}
                </div>
              </details>
            </li>
          })}
        </ol>
        <div className="nitnem-editor-add-row">
          <button type="button" onClick={() => { setQuery(''); setLibraryOpen(true) }} disabled={!available.length} className="nitnem-editor-add"><span aria-hidden="true">＋</span><span>{copy.add}</span><small>{copy.available(available.length)}</small></button>
          <button type="button" className="nitnem-editor-reset" onClick={() => { setDraftIds([...DEFAULT_NITNEM_OPTION_IDS]); setNotice(copy.restoredSeven) }} data-testid="nitnem-reset">{copy.restore}</button>
        </div>
      </section>
      <section className="nitnem-editor-offline" aria-labelledby="nitnem-offline-title" data-offline-status={offline.status}>
        <div><h2 id="nitnem-offline-title">{copy.offlineTitle}</h2><p role="status">{offlineCopy}</p>{readingsChanged ? <p className="nitnem-editor-offline-draft">{copy.draftPreparing}</p> : null}</div>
        {['offline', 'paused', 'partial', 'error'].includes(offline.status) ? <button type="button" onClick={offline.retry}>{offline.status === 'paused' ? copy.prepareNow : copy.tryAgain}<IconArrowRight size={16} /></button> : null}
      </section>
      <section id="nitnem-continuity" className="nitnem-editor-goal" aria-labelledby="nitnem-weekly-goal-title">
        <div><p className="nitnem-editor-eyebrow">{copy.continuity}</p><h2 id="nitnem-weekly-goal-title">{copy.goalTitle}</h2><p>{copy.goalDescription}</p></div>
        <div className="nitnem-editor-tracking"><div><span id="nitnem-tracking-label">{copy.completion}</span><p id="nitnem-tracking-description">{copy.completionDescription}</p></div><button type="button" role="switch" aria-labelledby="nitnem-tracking-label" aria-describedby="nitnem-tracking-description" aria-checked={draftTracking} onClick={() => setDraftTracking(value => !value)}><span /></button></div>
        <label htmlFor="nitnem-weekly-goal">{copy.weeklyGoal}</label>
        <select id="nitnem-weekly-goal" value={draftGoal} onChange={event => setDraftGoal(Number(event.target.value))}>{Array.from({ length: 7 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{copy.daysPerWeek(day)}</option>)}</select>
      </section>
      <p className="nitnem-editor-notice sr-only" role="status" aria-live="polite">{notice}</p>
      {saveError ? <p className="nitnem-editor-save-error" role="alert">{saveError}</p> : null}
      <footer className="nitnem-editor-footer"><p className="nitnem-editor-save-state" aria-live="polite">{saveError ? copy.notSaved : hasChanges ? copy.unsaved : ''}</p><div className="nitnem-editor-save-actions"><button type="button" onClick={leave} className="nitnem-editor-cancel">{copy.cancel}</button><button type="button" onClick={save} className="nitnem-editor-save" aria-label={copy.saveRoutine}>{copy.save}<IconArrowRight size={18} /></button></div></footer>
      <ModalSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} title={copy.discardTitle} description={copy.discardDescription} className="nitnem-editor-discard" initialFocusRef={keepEditingRef}>
        <h2>{copy.discardTitle}</h2>
        <p>{copy.discardBody}</p>
        <div>
          <button ref={keepEditingRef} type="button" onClick={() => setLeaveOpen(false)} className="nitnem-editor-keep-editing">{copy.keepEditing}</button>
          <button type="button" onClick={() => { clearNitnemDraft(); setLeaveOpen(false); navigate('/') }}>{copy.discard}</button>
        </div>
      </ModalSheet>
      <ModalSheet open={libraryOpen} onClose={() => setLibraryOpen(false)} title={copy.add} description={copy.addDescription} className="nitnem-editor-library" testId="nitnem-selection">
        <div className="nitnem-editor-library-heading"><div><p className="nitnem-editor-eyebrow">{copy.title} {copy.titleEmphasis}</p><h2>{copy.addTitle}</h2></div><button type="button" onClick={() => setLibraryOpen(false)} onFocus={event => { const sheet = event.currentTarget.closest<HTMLElement>('.nitnem-editor-library'); if (sheet) sheet.scrollTop = 0 }} aria-label={copy.closeAvailable}><IconClose size={20} /></button></div>
        <label className="nitnem-editor-search"><IconSearch size={18} /><input type="search" aria-label={copy.searchLabel} placeholder={copy.searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="nitnem-editor-available">
          {matches.map(option => <article key={option.id}><div>{title(option)}<p className="nitnem-editor-period">{copy.groups[option.group]}</p></div><button type="button" onClick={() => add(option)} aria-label={copy.addBani(option.romanizedTitle)}><span aria-hidden="true">＋</span></button></article>)}
          {matches.length === 0 ? <p className="nitnem-editor-empty">{copy.noMatches}</p> : null}
        </div>
        <footer className="nitnem-editor-library-footer"><p className="nitnem-editor-hint">{copy.addedHint}</p><button type="button" onClick={() => setLibraryOpen(false)} onFocus={event => { const sheet = event.currentTarget.closest<HTMLElement>('.nitnem-editor-library'); if (sheet) sheet.scrollTop = sheet.scrollHeight }}>{copy.done}<IconArrowRight size={18} /></button></footer>
      </ModalSheet>
    </div>
  )
}
