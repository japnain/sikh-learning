import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconCheck, IconClose } from './icons'
import ModalSheet from './ModalSheet'
import { useLanguageStore } from '../store/language'
import { buildNitnemStudyPath, type NitnemRouteOption } from '../store/nitnem'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useReadingPlacesStore } from '../store/readingPlaces'
import type { BaniFetchResult } from '../api/banidb'
import type { SundarGutkaLength, UiLocale } from '../types'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { asSupportedSundarGutkaBaniId, normalizeSundarGutkaLength } from '../utils/sundarGutkaLength'
import { readBaniOfflineCache } from '../utils/baniOfflineCache'
import { useNitnemOfflineStatusStore } from '../store/nitnemOffline'
import BaniLengthControl from './BaniLengthControl'
import { getBaniLengthDestination, type BaniLengthDestination } from '../utils/baniLengthSelection'
import { getBaniLengthDestinationLabel } from './baniLengthCopy'
import { useNitnemRail } from '../hooks/useNitnemRail'
import { rememberHomeNitnemReturn } from '../utils/homeNitnemNavigation'
import '../styles/home-daily-nitnem.css'

const BaniLengthSheet = lazy(() => import('./BaniLengthSheet'))

const COPY = {
  en: {
    title: 'Daily Nitnem', customize: 'Customize', saved: 'Your saved place',
    complete: 'Complete today', begin: 'Begin reading', resume: 'Continue reading', again: 'Read again',
    mark: 'Mark complete', undo: 'Undo completion', next: 'Up next', all: 'Your Nitnem', previous: 'Previous bani', nextCard: 'Next bani', browse: 'Browse your Nitnem',
    length: 'Length', usual: 'Usual', offline: 'Available offline', savedStudy: 'Resume saved study', recorded: 'Recorded today', unknownVersion: 'Version not recorded',
    close: 'Close your banis', description: 'Your daily banis, in your chosen order. Read any bani or update today’s completion.',
    finished: 'Your Nitnem is complete.', finishedBody: 'Return to any bani whenever you wish.', revisit: 'Revisit your banis',
    empty: 'Make space for your daily banis.', choose: 'Choose your banis', order: 'Your practice, in your order.',
    count: (done: number, total: number) => `${done} of ${total} complete today`,
    allCount: (total: number) => total === 1 ? 'Your bani' : `All ${total} banis`, position: (index: number, total: number) => `Bani ${index} of ${total}`,
    groups: { Morning: 'Morning', Evening: 'Evening', Night: 'Night', Additional: 'Additional' },
    lengths: { short: 'Short', medium: 'Medium', long: 'Long', extralong: 'Extra long' },
  },
  pa: {
    title: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ', customize: 'ਬਦਲੋ', saved: 'ਤੁਹਾਡੀ ਸੰਭਾਲੀ ਥਾਂ',
    complete: 'ਅੱਜ ਪੂਰੀ', begin: 'ਪੜ੍ਹਨਾ ਸ਼ੁਰੂ ਕਰੋ', resume: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ', again: 'ਮੁੜ ਪੜ੍ਹੋ',
    mark: 'ਪੂਰੀ ਚਿੰਨ੍ਹੋ', undo: 'ਪੂਰਾ ਚਿੰਨ੍ਹ ਹਟਾਓ', next: 'ਅੱਗੇ', all: 'ਤੁਹਾਡਾ ਨਿਤਨੇਮ', previous: 'ਪਿਛਲੀ ਬਾਣੀ', nextCard: 'ਅਗਲੀ ਬਾਣੀ', browse: 'ਆਪਣੇ ਨਿਤਨੇਮ ਦੀਆਂ ਬਾਣੀਆਂ ਵੇਖੋ',
    length: 'ਲੰਬਾਈ', usual: 'ਰੋਜ਼ਾਨਾ', offline: 'ਆਫ਼ਲਾਈਨ ਉਪਲਬਧ', savedStudy: 'ਸੰਭਾਲਿਆ ਅਧਿਐਨ ਜਾਰੀ ਰੱਖੋ', recorded: 'ਅੱਜ ਦਰਜ ਹੈ', unknownVersion: 'ਲੰਬਾਈ ਦਰਜ ਨਹੀਂ',
    close: 'ਬਾਣੀਆਂ ਬੰਦ ਕਰੋ', description: 'ਤੁਹਾਡੇ ਚੁਣੇ ਕ੍ਰਮ ਵਿੱਚ ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ। ਕੋਈ ਬਾਣੀ ਪੜ੍ਹੋ ਜਾਂ ਅੱਜ ਦੀ ਪੂਰੀ ਬਾਣੀ ਚਿੰਨ੍ਹੋ।',
    finished: 'ਤੁਹਾਡਾ ਨਿਤਨੇਮ ਪੂਰਾ ਹੈ।', finishedBody: 'ਜਦੋਂ ਚਾਹੋ ਕਿਸੇ ਵੀ ਬਾਣੀ ਨੂੰ ਮੁੜ ਪੜ੍ਹੋ।', revisit: 'ਬਾਣੀਆਂ ਮੁੜ ਵੇਖੋ',
    empty: 'ਆਪਣੀਆਂ ਰੋਜ਼ਾਨਾ ਬਾਣੀਆਂ ਚੁਣੋ।', choose: 'ਬਾਣੀਆਂ ਚੁਣੋ', order: 'ਤੁਹਾਡਾ ਅਭਿਆਸ, ਤੁਹਾਡੇ ਕ੍ਰਮ ਵਿੱਚ।',
    count: (done: number, total: number) => `${total} ਵਿੱਚੋਂ ${done} ਅੱਜ ਪੂਰੀਆਂ`,
    allCount: (total: number) => `ਸਾਰੀਆਂ ${total} ਬਾਣੀਆਂ`, position: (index: number, total: number) => `${total} ਵਿੱਚੋਂ ਬਾਣੀ ${index}`,
    groups: { Morning: 'ਸਵੇਰ', Evening: 'ਸ਼ਾਮ', Night: 'ਰਾਤ', Additional: 'ਹੋਰ' },
    lengths: { short: 'ਛੋਟੀ', medium: 'ਦਰਮਿਆਨੀ', long: 'ਲੰਮੀ', extralong: 'ਵਧੇਰੇ ਲੰਮੀ' },
  },
  hi: {
    title: 'दैनिक नितनेम', customize: 'बदलें', saved: 'आपकी सहेजी जगह',
    complete: 'आज पूर्ण', begin: 'पढ़ना शुरू करें', resume: 'पढ़ना जारी रखें', again: 'फिर पढ़ें',
    mark: 'पूर्ण चिह्नित करें', undo: 'पूर्ण चिह्न हटाएँ', next: 'आगे', all: 'आपका नितनेम', previous: 'पिछली बानी', nextCard: 'अगली बानी', browse: 'अपनी नितनेम बानियाँ देखें',
    length: 'लंबाई', usual: 'नियमित', offline: 'ऑफ़लाइन उपलब्ध', savedStudy: 'सहेजा अध्ययन जारी रखें', recorded: 'आज दर्ज है', unknownVersion: 'लंबाई दर्ज नहीं',
    close: 'बानियाँ बंद करें', description: 'आपके चुने क्रम में दैनिक बानियाँ। कोई बानी पढ़ें या आज की पूर्णता बदलें।',
    finished: 'आपका नितनेम पूर्ण है।', finishedBody: 'जब चाहें किसी भी बानी को फिर पढ़ें।', revisit: 'बानियाँ फिर देखें',
    empty: 'अपनी दैनिक बानियाँ चुनें।', choose: 'बानियाँ चुनें', order: 'आपका अभ्यास, आपके क्रम में।',
    count: (done: number, total: number) => `${total} में से ${done} आज पूर्ण`,
    allCount: (total: number) => `सभी ${total} बानियाँ`, position: (index: number, total: number) => `${total} में से बानी ${index}`,
    groups: { Morning: 'सुबह', Evening: 'शाम', Night: 'रात', Additional: 'अन्य' },
    lengths: { short: 'संक्षिप्त', medium: 'मध्यम', long: 'लंबी', extralong: 'अधिक लंबी' },
  },
} as const

export interface HomeDailyNitnemProps {
  selected: NitnemRouteOption[]
  completed: ReadonlySet<string>
  tracking: boolean
  activeId: string | undefined
  initialBrowseId?: string | null
  /** Only an explicitly started daily practice may supply the primary Continue. */
  getResume: (option: NitnemRouteOption) => string | null
  getReadingPath?: (option: NitnemRouteOption) => string
  getSavedStudy?: (option: NitnemRouteOption) => string | null
  getCompletionPath?: (option: NitnemRouteOption) => string | undefined
  onRead?: (option: NitnemRouteOption, path: string) => void
  onLengthChange?: (option: NitnemRouteOption, length: SundarGutkaLength, remember: boolean, signal?: AbortSignal,
    preparedReading?: BaniFetchResult, preparedDestination?: BaniLengthDestination) => Promise<void>
  onComplete: (option: NitnemRouteOption) => void
  locale: UiLocale
}

export default function HomeDailyNitnem({ selected, completed, tracking, activeId, initialBrowseId, getResume, getReadingPath,
  getSavedStudy, getCompletionPath, onRead, onLengthChange, onComplete, locale }: HomeDailyNitnemProps) {
  const copy = COPY[locale]
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const lengths = useSundarGutkaLengthStore(state => state.lengths)
  // A completed download can change the active reading's readiness while the
  // overall routine remains 'preparing' or 'partial'. Recheck on progress too.
  const offlineRevision = useNitnemOfflineStatusStore(state => `${state.signature}:${state.status}:${state.ready}:${state.retryRevision}`)
  const [allOpen, setAllOpen] = useState(false)
  const [lengthOption, setLengthOption] = useState<NitnemRouteOption | null>(null)
  const [cachedPlace, setCachedPlace] = useState<{ path: string; line: string; revision: string } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetListRef = useRef<HTMLOListElement>(null)
  const sheetOpeningIdRef = useRef<string | null>(null)
  const lengthAbortRef = useRef<AbortController | null>(null)
  const lengthDestinationRef = useRef<{ optionId: string; origin: string; reading: BaniFetchResult; destination: BaniLengthDestination } | null>(null)
  useEffect(() => () => lengthAbortRef.current?.abort(), [])
  const closeLength = () => { lengthAbortRef.current?.abort(); lengthDestinationRef.current = null; setLengthOption(null) }
  const isDone = (option: NitnemRouteOption) => tracking && completed.has(option.id)
  const resumes = new Map(selected.map(option => [option.id, getResume(option)]))
  const savedStudies = new Map(selected.map(option => [option.id,
    !resumes.get(option.id) && !isDone(option) ? getSavedStudy?.(option) ?? null : null]))
  const hasSavedStudy = [...savedStudies.values()].some(Boolean)
  const count = tracking ? selected.filter(isDone).length : 0
  const finished = tracking && selected.length > 0 && count === selected.length && !selected.some(option => resumes.get(option.id))
  const initialActive = selected.find(option => option.id === activeId) ?? selected.find(option => !isDone(option)) ?? selected[0]
  const { id: browsedId, index: activeIndex, announcement, railRef, cardsRef, browse, onScroll, onFocus, onKeyDown, onPointerDown, onPointerEnd, onWheel } =
    useNitnemRail(selected.map(option => option.id), initialActive?.id, initialBrowseId)
  const active = selected.find(option => option.id === browsedId)
  useEffect(() => {
    if (!allOpen) return
    const frame = requestAnimationFrame(() => {
      const list = sheetListRef.current
      const row = list ? [...list.children].find(child => (child as HTMLElement).dataset.nitnemId === sheetOpeningIdRef.current) : null
      if (!list || !row || list.clientHeight <= 0 || list.scrollHeight <= list.clientHeight) return
      const viewport = list.getBoundingClientRect()
      const bounds = row.getBoundingClientRect()
      if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) {
        // Reveal the chosen bani inside the sheet only; keep Close focused and
        // never move the underlying Home page or reposition after completion.
        list.scrollTop += bounds.top - viewport.top - 8
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [allOpen])
  const readingPath = (option: NitnemRouteOption) => resumes.get(option.id) || getReadingPath?.(option) || buildNitnemStudyPath(option)
  const selectedLength = (option: NitnemRouteOption) => normalizeSundarGutkaLength(new URLSearchParams(readingPath(option).split('?')[1]).get('sgLength'))
  const lengthLabel = (option: NitnemRouteOption) => {
    const length = selectedLength(option)
    return length ? copy.lengths[length] : null
  }
  const details = (option: NitnemRouteOption) => [copy.groups[option.group], lengthLabel(option)].filter(Boolean).join(' · ')
  const completedDetail = (option: NitnemRouteOption) => {
    const path = getCompletionPath?.(option)
    const length = path ? normalizeSundarGutkaLength(new URLSearchParams(path.split('?')[1]).get('sgLength')) : null
    return [copy.recorded, option.supportsLengthAdjustment ? length ? copy.lengths[length] : copy.unknownVersion : null].filter(Boolean).join(' · ')
  }
  const activePath = active ? readingPath(active) : null
  useEffect(() => {
    if (!activePath) return
    let cancelled = false
    const params = new URLSearchParams(activePath.split('?')[1])
    const id = Number(params.get('baniDbId'))
    if (!Number.isSafeInteger(id) || id <= 0) return
    const length = normalizeSundarGutkaLength(params.get('sgLength'))
    void readBaniOfflineCache(id, length).then(cached => {
      if (cancelled) return
      const verseId = Number(params.get('resumeVerseId'))
      const verseSource = params.get('resumeSource')
      const matches = cached?.entries.filter(entry => !verseSource || entry.source === verseSource)
        .flatMap(entry => entry.lines ?? []).filter(line => !line.isHeader && line.verseId === verseId) ?? []
      const line = matches.length === 1 ? matches[0].gurmukhi : ''
      setCachedPlace(cached ? { path: activePath, line, revision: offlineRevision } : null)
    }).catch(() => { if (!cancelled) setCachedPlace(null) })
    return () => { cancelled = true }
  }, [activePath, offlineRevision])
  const cachedActive = cachedPlace?.path === activePath && cachedPlace?.revision === offlineRevision ? cachedPlace : null
  const title = (option: NitnemRouteOption, heading = false) => <>
    <span className={`${getScriptTextFontClass(scriptMode)} ${heading ? 'home-daily-script' : 'home-daily-row-script'}`}
      lang={getScriptTextLang(scriptMode)}>{renderScriptText(option.gurmukhiTitle, scriptMode)}</span>
    <span className={heading ? 'home-daily-english' : 'home-daily-row-english'}>{option.romanizedTitle}</span>
  </>
  const completion = (option: NitnemRouteOption, className: string) => <button type="button" className={className}
    aria-label={`${isDone(option) ? copy.undo : copy.mark}: ${option.romanizedTitle}`}
    aria-pressed={isDone(option)} onClick={() => { browse(option.id); onComplete(option) }}>
    <span aria-hidden="true" className="home-daily-completion-mark">{isDone(option) ? <IconCheck size={15} /> : null}</span>
    <span>{isDone(option) ? copy.undo : copy.mark}</span>
  </button>
  const lengthControl = (option: NitnemRouteOption) => {
    const value = selectedLength(option)
    return onLengthChange && asSupportedSundarGutkaBaniId(option.baseBaniId) && value ? <BaniLengthControl
      value={value} locale={locale} ariaLabel={`${option.romanizedTitle} ${copy.length}: ${copy.lengths[value]}`}
      onClick={() => { lengthDestinationRef.current = null; setLengthOption(option) }} /> : null
  }
  const openReading = (option: NitnemRouteOption, event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    browse(option.id)
    rememberHomeNitnemReturn(option.id)
    if (onRead) { event.preventDefault(); onRead(option, readingPath(option)) }
    setAllOpen(false)
  }
  const lengthId = lengthOption ? asSupportedSundarGutkaBaniId(lengthOption.baseBaniId) : null
  const describeLengthDestination = (reading: BaniFetchResult) => {
    if (!lengthOption) return getBaniLengthDestinationLabel('beginning', locale)
    const resume = getResume(lengthOption)
    const currentPath = resume ?? readingPath(lengthOption)
    const params = new URLSearchParams(currentPath.split('?')[1])
    const verseId = Number(params.get('resumeVerseId'))
    const destination = getBaniLengthDestination(currentPath, reading, resume ? useReadingPlacesStore.getState().places : {},
      resume && verseId > 0 ? { verseId, source: params.get('resumeSource') ?? params.get('source') ?? undefined } : null)
    lengthDestinationRef.current = { optionId: lengthOption.id, origin: currentPath, reading, destination }
    return getBaniLengthDestinationLabel(destination.destination, locale)
  }

  return <section className="home-daily" aria-labelledby="home-nitnem-title" data-testid="home-nitnem-spotlight">
    <header className="home-daily-heading">
      <h2 id="home-nitnem-title">{copy.title}</h2>
      <Link to="/nitnem/customize" data-testid="home-nitnem-manage">{copy.customize}<SettingsIcon /></Link>
    </header>
    <div className="home-daily-summary" data-testid="home-nitnem-summary">
      <p>{tracking && selected.length > 0 ? copy.count(count, selected.length) : copy.order}</p>
      {selected.length > 0 ? <button type="button" className="home-daily-all-link" onClick={() => { sheetOpeningIdRef.current = browsedId ?? null; setAllOpen(true) }}>{copy.allCount(selected.length)}<IconArrowRight size={15} /></button> : null}
    </div>
    {tracking && selected.length > 0 ? <div className="home-daily-progress" role="progressbar"
      aria-label={copy.title} aria-valuemin={0} aria-valuemax={selected.length} aria-valuenow={count} aria-valuetext={copy.count(count, selected.length)}>
      {selected.map(option => <span key={option.id} aria-hidden="true" data-complete={isDone(option)} />)}
    </div> : null}

    {finished ? <div className="home-daily-finished" data-testid="home-nitnem-finished">
      <span className="home-daily-finished-mark" aria-hidden="true"><IconCheck size={19} /></span>
      <div><h3>{copy.finished}</h3><p>{copy.finishedBody}</p></div>
    </div> : null}
    {active ? <div className="home-daily-carousel" data-testid="home-nitnem-carousel" role="region" aria-label={copy.browse} aria-roledescription="carousel">
      <div className="home-daily-rail" data-single={selected.length === 1 || undefined} ref={railRef} tabIndex={selected.length > 1 ? 0 : undefined}
        role="list" aria-label={copy.title} onScroll={onScroll} onFocusCapture={onFocus} onKeyDown={event => onKeyDown(event, copy.position)}
        onPointerDownCapture={onPointerDown} onPointerUpCapture={onPointerEnd} onPointerCancelCapture={onPointerEnd} onWheelCapture={onWheel}>
        {selected.map((option, index) => {
          const resume = resumes.get(option.id)
          const done = isDone(option) && !resume
          const viewed = option.id === active.id
          const cached = viewed ? cachedActive : null
          const savedStudy = savedStudies.get(option.id)
          const action = done ? copy.again : resume ? copy.resume : copy.begin
          return <article key={option.id} ref={element => { if (element) cardsRef.current.set(option.id, element); else cardsRef.current.delete(option.id) }}
            className={`home-daily-current${done ? ' is-complete' : ''}`} role="listitem"
            data-nitnem-card={option.id} data-testid={viewed ? 'home-nitnem-active-reading' : 'home-nitnem-card'}
            data-nitnem-id={option.id} data-nitnem-index={index} aria-labelledby={`home-daily-title-${option.id}`}>
            <div className="home-daily-current-overline"><span>{copy.groups[option.group]}</span>
              <span className="home-daily-position" aria-label={copy.position(index + 1, selected.length)}>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div data-testid={viewed ? 'home-nitnem-reading-panel' : undefined} className="home-daily-reading-panel">
              <h3 id={`home-daily-title-${option.id}`}>{title(option, true)}</h3>
              <div className="home-daily-reading-options">{lengthControl(option)}{cached ? <span className="home-daily-availability">{copy.offline}</span> : null}</div>
              {isDone(option) ? <p className="home-daily-current-meta">{completedDetail(option)}</p> : null}
              {resume ? <p className="home-daily-current-meta">{copy.saved}</p> : null}
              {resume && cached?.line ? <p className={`home-daily-saved-line ${getScriptTextFontClass(scriptMode)}`} lang={getScriptTextLang(scriptMode)}>{renderScriptText(cached.line, scriptMode)}</p> : null}
              <div className="home-daily-current-actions">
                <Link to={readingPath(option)} state={{ readerOrigin: '/' }} onClick={event => openReading(option, event)}
                  aria-label={`${action}: ${option.romanizedTitle}`} className="home-daily-read" data-testid={viewed && !done ? 'home-nitnem-primary-action' : undefined}>
                  {action}<IconArrowRight size={19} />
                </Link>
                {tracking ? completion(option, 'home-daily-complete') : null}
              </div>
              {hasSavedStudy ? <div className="home-daily-study-slot">{savedStudy ? <Link className="home-daily-saved-study" to={savedStudy}
                aria-label={`${copy.savedStudy}: ${option.romanizedTitle}`} state={{ readerOrigin: '/' }} onClick={() => rememberHomeNitnemReturn(option.id)}>{copy.savedStudy}<IconArrowRight size={15} /></Link> : <span className="home-daily-saved-study home-daily-study-placeholder" aria-hidden="true">{copy.savedStudy}<IconArrowRight size={15} /></span>}</div> : null}
            </div>
          </article>
        })}
      </div>
      {selected.length > 1 ? <div className="home-daily-pagination">
        <p>{copy.position(activeIndex + 1, selected.length)}</p>
        <div><button type="button" aria-label={copy.previous} aria-disabled={activeIndex === 0} onClick={() => {
          const previous = selected[activeIndex - 1]
          if (previous) browse(previous.id, { animate: true, announce: `${copy.position(activeIndex, selected.length)}: ${previous.romanizedTitle}` })
        }}><IconArrowLeft size={19} /></button>
        <button type="button" aria-label={copy.nextCard} aria-disabled={activeIndex === selected.length - 1} onClick={() => {
          const next = selected[activeIndex + 1]
          if (next) browse(next.id, { animate: true, announce: `${copy.position(activeIndex + 2, selected.length)}: ${next.romanizedTitle}` })
        }}><IconArrowRight size={19} /></button></div>
      </div> : null}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
    </div> : <div className="home-daily-empty"><p>{copy.empty}</p><Link to="/nitnem/customize" className="home-daily-read">{copy.choose}<IconArrowRight size={19} /></Link></div>}

    {allOpen ? <ModalSheet open onClose={() => setAllOpen(false)} title={copy.all} description={copy.description}
      className="home-daily-sheet" testId="home-nitnem-all" initialFocusRef={closeRef}>
      <header className="home-daily-sheet-heading"><div><p>{tracking ? copy.count(count, selected.length) : copy.order}</p><h2>{copy.all}</h2></div>
        <button ref={closeRef} type="button" onClick={() => setAllOpen(false)} aria-label={copy.close}><IconClose size={21} /></button>
      </header>
      <ol ref={sheetListRef} className="home-daily-sheet-list" aria-label={copy.title}>
        {selected.map((option, index) => <li key={option.id} data-nitnem-id={option.id} data-current={active?.id === option.id || undefined}>
          <Link to={readingPath(option)} state={{ readerOrigin: '/' }} className="home-daily-sheet-reading" onClick={event => openReading(option, event)}
            aria-label={`${resumes.get(option.id) ? copy.resume : isDone(option) ? copy.again : copy.begin}: ${option.romanizedTitle}`}>
            <span className="home-daily-next-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="home-daily-next-copy">{title(option)}<span className="home-daily-next-meta">{details(option)}{resumes.get(option.id) ? ` · ${copy.saved}` : ''}</span></span>
            <IconArrowRight size={19} />
          </Link>
          {isDone(option) ? <p className="home-daily-sheet-recorded">{completedDetail(option)}</p> : null}
          <div className="home-daily-sheet-row-actions">{lengthControl(option)}{tracking ? completion(option, 'home-daily-sheet-complete') : null}</div>
        </li>)}
      </ol>
      <footer className="home-daily-sheet-footer"><Link to="/nitnem/customize" onClick={() => setAllOpen(false)}>{copy.customize}<SettingsIcon /></Link></footer>
    </ModalSheet> : null}
    {lengthOption && lengthId && onLengthChange ? <Suspense fallback={<p role="status">{copy.length}…</p>}><BaniLengthSheet open onClose={closeLength} baniId={lengthId} locale={locale}
      currentLength={selectedLength(lengthOption) ?? lengths[lengthId]} usualLength={lengths[lengthId]}
      describeDestination={describeLengthDestination}
      onSelect={async (length, remember, preparedReading) => {
        lengthAbortRef.current?.abort()
        const request = new AbortController()
        lengthAbortRef.current = request
        const preview = lengthDestinationRef.current
        const destination = preview?.optionId === lengthOption.id && preview.origin === readingPath(lengthOption)
          && preview.reading === preparedReading ? preview.destination : undefined
        await onLengthChange(lengthOption, length, remember, request.signal, preparedReading, destination)
        if (!request.signal.aborted) { setLengthOption(null); setAllOpen(false) }
      }} /></Suspense> : null}
  </section>
}

function SettingsIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 7h7m6 0h5M3 17h12m6 0h0" /><circle cx="13" cy="7" r="3" /><circle cx="18" cy="17" r="3" /></svg>
}
