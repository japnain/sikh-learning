import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { SundarGutkaLength, UiLocale } from '../types'
import type { BaniFetchResult } from '../api/banidb'
import { useBani } from '../hooks/useBani'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { SUNDAR_GUTKA_LENGTH_ORDER, SUNDAR_GUTKA_SUPPORTED_BANIS, type SupportedSundarGutkaBaniId } from '../utils/sundarGutkaLength'
import { BANI_LENGTH_COPY } from './baniLengthCopy'
import { loadExactBaniReading } from '../utils/baniLengthSelection'
import { IconClose } from './icons'
import ModalSheet from './ModalSheet'
import '../styles/bani-length.css'

export interface BaniLengthSheetProps {
  open: boolean
  onClose: () => void
  baniId: SupportedSundarGutkaBaniId
  currentLength: SundarGutkaLength
  usualLength: SundarGutkaLength
  availableLengths?: readonly SundarGutkaLength[]
  onSelect: (length: SundarGutkaLength, remember: boolean, preparedReading?: BaniFetchResult) => Promise<void> | void
  /** Optional reader-specific explanation, evaluated only against verified text. */
  describeDestination?: (reading: BaniFetchResult) => string
  pending?: boolean
  error?: string | null
  locale?: UiLocale
}

function LengthBoundaryPreview({ baniId, length, locale }: { baniId: SupportedSundarGutkaBaniId; length: SundarGutkaLength; locale: UiLocale }) {
  const copy = BANI_LENGTH_COPY[locale]
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const result = useBani(SUNDAR_GUTKA_SUPPORTED_BANIS[baniId].baniDbId, length)
  const lines = result.entries.flatMap(entry => entry.lines?.length
    ? entry.lines.filter(line => !line.isHeader && line.gurmukhi.trim()).map(line => line.gurmukhi)
    : entry.gurmukhi.split('\n').filter(line => line.trim()))
  const first = lines[0]
  const last = lines.at(-1)
  if (!first || !last) return <div className="bani-length-preview__state" role={result.loading ? 'status' : undefined}>
    <p>{result.loading ? copy.previewLoading : copy.previewUnavailable}</p>
    {!result.loading ? <button type="button" onClick={result.retry}>{copy.retry}</button> : null}
  </div>
  return <div className="bani-length-preview" data-testid="bani-length-preview">
    <dl>{[[copy.opening, first], [copy.ending, last]].map(([label, text]) => <div key={label}>
      <dt>{label}</dt><dd className={getScriptTextFontClass(scriptMode)} lang={getScriptTextLang(scriptMode)}>{renderScriptText(text, scriptMode)}</dd>
    </div>)}</dl>
    <p className="bani-length-preview__source">{copy.source}{result.isCached ? ` ${copy.savedPreview}` : ''}</p>
  </div>
}

function BaniLengthSheetContent({ onClose, baniId, currentLength, usualLength, availableLengths, onSelect, describeDestination, pending = false, error, locale: requestedLocale }: BaniLengthSheetProps) {
  const storedLocale = useLocaleStore(state => state.locale)
  const locale = requestedLocale ?? storedLocale
  const copy = BANI_LENGTH_COPY[locale]
  const discovery = useBani(availableLengths === undefined ? SUNDAR_GUTKA_SUPPORTED_BANIS[baniId].baniDbId : null, currentLength)
  const verified = availableLengths ?? discovery.availableLengths
  const choices = SUNDAR_GUTKA_LENGTH_ORDER.filter(length => verified.includes(length))
  const [selectedLength, setSelectedLength] = useState(currentLength)
  const [remember, setRemember] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [destinationRevision, setDestinationRevision] = useState(0)
  const [destination, setDestination] = useState<{ length: SundarGutkaLength; reading?: BaniFetchResult; description?: string; error?: string } | null>(null)
  const describeRef = useRef(describeDestination)
  const closeRef = useRef<HTMLButtonElement>(null)
  const submissionRef = useRef(false)
  const mountedRef = useRef(true)
  const id = useId()
  const busy = pending || submitting
  const canApply = choices.includes(selectedLength)
  const discovering = availableLengths === undefined && discovery.loading
  const discoveryFailed = availableLengths === undefined && Boolean(discovery.error)
  const displayedError = selectionError || error
  const needsDestination = Boolean(describeDestination)
  const selectedDestination = destination?.length === selectedLength ? destination : null
  const destinationReady = !needsDestination || Boolean(selectedDestination?.reading)
  const checkingDestination = needsDestination && canApply && !selectedDestination
  useEffect(() => { describeRef.current = describeDestination }, [describeDestination])
  useEffect(() => {
    if (!needsDestination || !canApply) return
    let cancelled = false
    const request = new AbortController()
    void loadExactBaniReading(SUNDAR_GUTKA_SUPPORTED_BANIS[baniId].baniDbId, selectedLength, request.signal).then(reading => {
      if (cancelled) return
      const description = describeRef.current?.(reading)
      setDestination({ length: selectedLength, reading, description })
    }).catch(reason => {
      if (!cancelled) setDestination({ length: selectedLength, error: reason instanceof Error && reason.message.trim() ? reason.message : copy.failed })
    })
    return () => { cancelled = true; request.abort() }
  }, [baniId, selectedLength, needsDestination, canApply, destinationRevision, copy.failed])
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || submissionRef.current || !canApply || !destinationReady) return
    submissionRef.current = true
    setSubmitting(true)
    setSelectionError(null)
    try {
      if (needsDestination && selectedDestination?.reading) await onSelect(selectedLength, remember, selectedDestination.reading)
      else await onSelect(selectedLength, remember)
    } catch (reason) {
      if (mountedRef.current) setSelectionError(reason instanceof Error && reason.message.trim() ? reason.message : copy.failed)
    } finally {
      submissionRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  return <ModalSheet open onClose={onClose} title={copy.title} description={copy.description}
    className="bani-length-sheet" testId="bani-length-sheet" initialFocusRef={closeRef}>
    <form className="bani-length-sheet__inner" onSubmit={submit} lang={locale} aria-busy={busy || checkingDestination}>
      <header className="bani-length-sheet__heading"><div><p>{copy.banis[baniId]}</p><h2>{copy.title}</h2></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.close}><IconClose size={21} /></button>
      </header>
      <div className="bani-length-sheet__scroll">
        <p className="bani-length-sheet__description">{copy.description}</p>
        <dl className="bani-length-sheet__context">
          <div><dt>{copy.current}</dt><dd>{copy.lengths[currentLength]}</dd></div>
          <div><dt>{copy.usual}</dt><dd>{copy.lengths[usualLength]}</dd></div>
        </dl>
        <fieldset className="bani-length-sheet__choices" disabled={busy}>
          <legend>{copy.options}</legend>
          {choices.map(length => <label className="bani-length-sheet__option" key={length} data-selected={selectedLength === length}>
            <input type="radio" name={`${id}-length`} value={length} checked={selectedLength === length}
              aria-label={[copy.lengths[length], length === currentLength ? copy.current : '', length === usualLength ? copy.usual : ''].filter(Boolean).join(' ')}
              onChange={() => { setSelectedLength(length); setSelectionError(null) }} />
            <span>{copy.lengths[length]}</span>
            <span className="bani-length-sheet__badges">{length === currentLength ? <small>{copy.current}</small> : null}{length === usualLength ? <small>{copy.usual}</small> : null}</span>
          </label>)}
        </fieldset>
        {discovering ? <p className="bani-length-sheet__status" role="status">{copy.checking}</p> : null}
        {discoveryFailed ? <div className="bani-length-sheet__status" role="status"><p>{copy.unavailable}</p><button type="button" onClick={discovery.retry} disabled={busy}>{copy.retry}</button></div>
          : !discovering && choices.length === 0 ? <p className="bani-length-sheet__status">{copy.empty}</p> : null}
        {needsDestination ? <div id={`${id}-destination`} className="bani-length-sheet__status" data-testid="bani-length-destination">
          <p role={selectedDestination?.error ? 'alert' : 'status'}>{selectedDestination?.error || selectedDestination?.description || (canApply ? copy.destinationLoading : copy.destinationUnavailable)}</p>
          {selectedDestination?.error ? <button type="button" disabled={busy} onClick={() => { setDestination(null); setDestinationRevision(value => value + 1) }}>{copy.retry}</button> : null}
        </div> : null}
        {canApply ? <details className="bani-length-sheet__preview" onToggle={event => setPreviewOpen(event.currentTarget.open)}>
          <summary>{copy.preview}<span aria-hidden="true">⌄</span></summary>
          {previewOpen ? <LengthBoundaryPreview key={`${baniId}:${selectedLength}`} baniId={baniId} length={selectedLength} locale={locale} /> : null}
        </details> : null}
        <label className="bani-length-sheet__remember"><input type="checkbox" checked={remember} disabled={busy} aria-describedby={`${id}-scope`}
          onChange={event => { setRemember(event.target.checked); setSelectionError(null) }} />
          <span>{copy.remember}</span>
        </label>
        <p id={`${id}-scope`} className="bani-length-sheet__scope">{remember ? copy.remembered : copy.readingOnly}</p>
      </div>
      <footer className="bani-length-sheet__footer">
        {displayedError ? <p className="bani-length-sheet__error" role="alert">{displayedError}</p> : null}
        <button type="submit" className="bani-length-sheet__apply" disabled={busy || !canApply || !destinationReady} aria-describedby={`${id}-scope${needsDestination ? ` ${id}-destination` : ''}`}>
          {busy ? copy.applying : copy.apply(copy.lengths[selectedLength])}<span aria-hidden="true">→</span>
        </button>
      </footer>
    </form>
  </ModalSheet>
}

export default function BaniLengthSheet(props: BaniLengthSheetProps) {
  return props.open ? <BaniLengthSheetContent key={props.baniId} {...props} /> : null
}
