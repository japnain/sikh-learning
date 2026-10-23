import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, setNitnemCompletionSafely, useNitemStore } from '../store/nitnem'
import { getNitnemCompletionForDay, useNitnemHistoryStore } from '../store/nitnemHistory'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { toLocalDayStamp } from '../utils/localDates'
import { getNitnemPracticeResume, isActiveNitnemPracticeReading } from '../utils/nitnemPractice'
import { getNextIncompleteNitnemReading, getNextNitnemReading, getSelectedNitnemReading } from '../utils/nitnemReadingIdentity'
import { normalizeSundarGutkaLength } from '../utils/sundarGutkaLength'
import { rememberHomeNitnemReturn } from '../utils/homeNitnemNavigation'
import { IconArrowRight, IconCheck } from './icons'
import '../styles/reader-finish.css'

const COPY = {
  en: {
    title: 'End of reading', mark: 'Mark complete for today', complete: 'Completed for today', undo: 'Undo',
    next: 'Next bani', routine: 'Return to today’s Nitnem', again: 'Read again', back: 'Return to where you started',
    failed: 'This change could not be saved. Please try again.',
    completeContinue: 'Complete & continue',
    continueTo: (title: string) => `Continue to ${title}`,
    finishReading: 'Finish this reading',
    groups: { Morning: 'Morning', Evening: 'Evening', Night: 'Night', Additional: 'Additional' },
    lengths: { short: 'Short', medium: 'Medium', long: 'Long', extralong: 'Extra long' },
  },
  pa: {
    title: 'ਪਾਠ ਸਮਾਪਤ', mark: 'ਅੱਜ ਲਈ ਪੂਰਾ ਦਰਜ ਕਰੋ', complete: 'ਅੱਜ ਲਈ ਪੂਰਾ ਦਰਜ ਹੈ', undo: 'ਵਾਪਸ ਲਓ',
    next: 'ਅਗਲੀ ਬਾਣੀ', routine: 'ਅੱਜ ਦੇ ਨਿਤਨੇਮ ਵੱਲ ਵਾਪਸ ਜਾਓ', again: 'ਮੁੜ ਪੜ੍ਹੋ', back: 'ਜਿੱਥੋਂ ਸ਼ੁਰੂ ਕੀਤਾ ਸੀ ਉੱਥੇ ਵਾਪਸ ਜਾਓ',
    failed: 'ਇਹ ਤਬਦੀਲੀ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    completeContinue: 'ਪੂਰਾ ਦਰਜ ਕਰਕੇ ਅੱਗੇ ਜਾਓ',
    continueTo: (title: string) => `${title} ਵੱਲ ਅੱਗੇ ਜਾਓ`,
    finishReading: 'ਇਹ ਪਾਠ ਸਮਾਪਤ ਕਰੋ',
    groups: { Morning: 'ਸਵੇਰ', Evening: 'ਸ਼ਾਮ', Night: 'ਰਾਤ', Additional: 'ਹੋਰ' },
    lengths: { short: 'ਛੋਟੀ', medium: 'ਦਰਮਿਆਨੀ', long: 'ਲੰਮੀ', extralong: 'ਵਧੇਰੇ ਲੰਮੀ' },
  },
  hi: {
    title: 'पाठ समाप्त', mark: 'आज के लिए पूरा दर्ज करें', complete: 'आज के लिए पूरा दर्ज है', undo: 'वापस लें',
    next: 'अगली बाणी', routine: 'आज के नितनेम पर लौटें', again: 'फिर पढ़ें', back: 'जहाँ से शुरू किया था वहाँ लौटें',
    failed: 'यह बदलाव सहेजा नहीं जा सका। फिर कोशिश करें।',
    completeContinue: 'पूर्ण दर्ज करके आगे बढ़ें',
    continueTo: (title: string) => `${title} पर आगे बढ़ें`,
    finishReading: 'यह पाठ समाप्त करें',
    groups: { Morning: 'सुबह', Evening: 'शाम', Night: 'रात', Additional: 'अन्य' },
    lengths: { short: 'संक्षिप्त', medium: 'मध्यम', long: 'लंबी', extralong: 'अधिक लंबी' },
  },
} as const

interface ReaderFinishPanelProps {
  readingPath: string
  onReadAgain: () => void
  onBack: () => void
}

/** Render only after the final canonical passage has successfully loaded. */
export default function ReaderFinishPanel({ readingPath, onReadAgain, onBack }: ReaderFinishPanelProps) {
  const navigate = useNavigate()
  const locale = useLocaleStore(state => state.locale)
  const selectedIds = useNitemStore(state => state.selectedIds)
  const completedIds = useNitemStore(state => state.completedIds)
  const completedDate = useNitemStore(state => state.completedDate)
  const tracking = useNitemStore(state => state.completionTrackingEnabled)
  const completionEvents = useNitnemHistoryStore(state => state.events)
  const activePractice = useNitnemPracticeStore(state => state.active)
  // The next reading uses its current usual version; this open reading stays eligible.
  useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
  const [lastActionAt, setLastActionAt] = useState(0)
  const [failure, setFailure] = useState<{ path: string; date: string } | null>(null)
  const today = toLocalDayStamp(new Date(Math.max(now, lastActionAt)))
  const option = getSelectedNitnemReading(readingPath, selectedIds)
  const eligible = tracking && option !== null
  const completedToday = completedDate === today ? completedIds : []
  const complete = eligible && completedToday.includes(option.id)
  const canFinishPractice = option !== null && (!tracking || complete) && isActiveNitnemPracticeReading(readingPath, activePractice)
  const next = option ? tracking
    ? getNextIncompleteNitnemReading(option.id, selectedIds, completedToday)
    : getNextNitnemReading(option.id, selectedIds) : null
  const recorded = option ? getNitnemCompletionForDay(completionEvents, today, option.id) : null
  const completedLength = recorded?.readingPath
    ? normalizeSundarGutkaLength(new URLSearchParams(recorded.readingPath.split('?')[1]).get('sgLength')) : null
  const copy = COPY[locale]

  const changeCompletion = (completed: boolean) => {
    // Resolve again on click: the routine, length, tracking or day may have
    // changed since these controls were painted.
    const current = useNitemStore.getState()
    const currentOption = getSelectedNitnemReading(readingPath, current.selectedIds)
    const timestamp = Date.now()
    setLastActionAt(timestamp)
    setFailure(null)
    if (!currentOption || !current.completionTrackingEnabled) return false
    const completion = getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, toLocalDayStamp(new Date(timestamp)), currentOption.id)
    const result = setNitnemCompletionSafely(currentOption.id, completed, completed ? readingPath : completion?.readingPath)
    if (result === 'failed') setFailure({ path: readingPath, date: toLocalDayStamp(new Date(timestamp)) })
    if (completed && (result === 'changed' || result === 'unchanged')
      && isActiveNitnemPracticeReading(readingPath, useNitnemPracticeStore.getState().active)) {
      useNitnemPracticeStore.getState().finish(currentOption.id)
    }
    return result === 'changed' || result === 'unchanged'
  }

  const continueReading = () => {
    const current = useNitemStore.getState()
    const currentOption = getSelectedNitnemReading(readingPath, current.selectedIds)
    if (!currentOption) return
    const today = toLocalDayStamp(new Date())
    const nextReading = current.completionTrackingEnabled
      ? getNextIncompleteNitnemReading(currentOption.id, current.selectedIds, current.completedDate === today ? current.completedIds : [])
      : getNextNitnemReading(currentOption.id, current.selectedIds)
    if (!nextReading) return
    const practice = useNitnemPracticeStore.getState()
    const resume = getNitnemPracticeResume(nextReading, practice.active)
    const durable = resume ? practice.updatePath(resume) : practice.start(nextReading.id, buildNitnemStudyPath(nextReading))
    const active = useNitnemPracticeStore.getState().active
    if (!active || active.optionId !== nextReading.id) return
    rememberHomeNitnemReturn(nextReading.id)
    navigate(active.readingPath, { state: { readerOrigin: '/', nitnemSessionOnly: !durable } })
  }

  const finishThisReading = () => {
    const current = useNitemStore.getState()
    const currentOption = getSelectedNitnemReading(readingPath, current.selectedIds)
    const practice = useNitnemPracticeStore.getState()
    const previous = practice.active
    const timestamp = Date.now()
    setLastActionAt(timestamp)
    setFailure(null)
    if (!currentOption || (current.completionTrackingEnabled && !current.isComplete(currentOption.id))
      || !isActiveNitnemPracticeReading(readingPath, previous)) return
    const key = useNitnemPracticeStore.persist.getOptions().name ?? 'naamras-nitnem-practice'
    let saved: string | null
    try { saved = localStorage.getItem(key) } catch {
      setFailure({ path: readingPath, date: toLocalDayStamp(new Date(timestamp)) })
      return
    }
    if (practice.finish(currentOption.id)) return
    // A failed persistent write must leave an unfinished context that can retry.
    try { useNitnemPracticeStore.setState({ active: previous }) } catch { /* The in-memory rollback still applies. */ }
    try { if (saved === null) localStorage.removeItem(key); else localStorage.setItem(key, saved) } catch { /* Preserve the retry action when storage stays unavailable. */ }
    setFailure({ path: readingPath, date: toLocalDayStamp(new Date(timestamp)) })
  }

  return (
    <section className="reader-finish" aria-label={copy.title} data-reader-interactive data-testid="reader-finish-panel">
      <span className="reader-finish__rule" aria-hidden="true" />
      <h2>{copy.title}</h2>
      {eligible ? (
        <div className="reader-finish__completion">
          {complete ? (
            <div className="reader-finish__confirmed" role="status">
              <span><span aria-hidden="true"><IconCheck size={18} /></span>{copy.complete}{completedLength ? ` · ${copy.lengths[completedLength]}` : ''}</span>
              <button type="button" onClick={() => changeCompletion(false)}>{copy.undo}</button>
            </div>
          ) : (
            <>
              {next ? <button type="button" className="reader-finish__mark" onClick={() => { if (changeCompletion(true)) continueReading() }}>{copy.completeContinue}</button> : null}
              <button type="button" className={next ? 'reader-finish__return' : 'reader-finish__mark'} onClick={() => changeCompletion(true)}>{copy.mark}</button>
            </>
          )}
        </div>
      ) : null}
      {failure?.path === readingPath && failure.date === today ? <p className="reader-finish__error" role="alert">{copy.failed}</p> : null}
      <div className="reader-finish__actions">
        {canFinishPractice ? <button type="button" className={!tracking && next ? 'reader-finish__return' : 'reader-finish__mark'} onClick={finishThisReading}>{copy.finishReading}</button> : null}
        {next ? (
          <button type="button" className={`reader-finish__next${eligible && (!complete || canFinishPractice) ? ' reader-finish__next--quiet' : ''}`} onClick={continueReading}
            aria-label={tracking ? `${copy.next} ${locale === 'en' ? next.romanizedTitle : next.gurmukhiTitle}` : copy.continueTo(locale === 'en' ? next.romanizedTitle : next.gurmukhiTitle)}>
            <span><span>{copy.next} · {copy.groups[next.group]}</span>{' '}<strong>{tracking ? locale === 'en' ? next.romanizedTitle : next.gurmukhiTitle : copy.continueTo(locale === 'en' ? next.romanizedTitle : next.gurmukhiTitle)}</strong></span>
            <span aria-hidden="true"><IconArrowRight size={20} /></span>
          </button>
        ) : null}
        {option ? <button type="button" className="reader-finish__return" data-reader-back="true" onClick={() => { rememberHomeNitnemReturn(option.id); navigate('/') }}>{copy.routine}</button> : (
          <button type="button" className="reader-finish__return" data-reader-back="true" onClick={onBack}>{copy.back}</button>
        )}
        <button type="button" className="reader-finish__again" onClick={onReadAgain}>{copy.again}</button>
      </div>
    </section>
  )
}
