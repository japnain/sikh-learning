import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, setNitnemCompletionSafely, useNitemStore } from '../store/nitnem'
import { useProgressStore } from '../store/progress'
import { useReadingPlacesStore } from '../store/readingPlaces'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { toLocalDayStamp } from '../utils/localDates'
import { getHomeNitnemResume } from '../utils/homeNitnemResume'
import { getNextIncompleteNitnemReading, getSelectedNitnemReading } from '../utils/nitnemReadingIdentity'
import { IconArrowRight, IconCheck } from './icons'
import '../styles/reader-finish.css'

const COPY = {
  en: {
    title: 'End of reading', mark: 'Mark complete for today', complete: 'Completed for today', undo: 'Undo',
    next: 'Next bani', routine: 'Return to today’s Nitnem', again: 'Read again', back: 'Return to where you started',
    failed: 'This change could not be saved. Please try again.',
  },
  pa: {
    title: 'ਪਾਠ ਸਮਾਪਤ', mark: 'ਅੱਜ ਲਈ ਪੂਰਾ ਦਰਜ ਕਰੋ', complete: 'ਅੱਜ ਲਈ ਪੂਰਾ ਦਰਜ ਹੈ', undo: 'ਵਾਪਸ ਲਓ',
    next: 'ਅਗਲੀ ਬਾਣੀ', routine: 'ਅੱਜ ਦੇ ਨਿਤਨੇਮ ਵੱਲ ਵਾਪਸ ਜਾਓ', again: 'ਮੁੜ ਪੜ੍ਹੋ', back: 'ਜਿੱਥੋਂ ਸ਼ੁਰੂ ਕੀਤਾ ਸੀ ਉੱਥੇ ਵਾਪਸ ਜਾਓ',
    failed: 'ਇਹ ਤਬਦੀਲੀ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
  hi: {
    title: 'पाठ समाप्त', mark: 'आज के लिए पूरा दर्ज करें', complete: 'आज के लिए पूरा दर्ज है', undo: 'वापस लें',
    next: 'अगली बाणी', routine: 'आज के नितनेम पर लौटें', again: 'फिर पढ़ें', back: 'जहाँ से शुरू किया था वहाँ लौटें',
    failed: 'यह बदलाव सहेजा नहीं जा सका। फिर कोशिश करें।',
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
  // Changing a selected length immediately changes completion eligibility.
  useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
  const [lastActionAt, setLastActionAt] = useState(0)
  const [failure, setFailure] = useState<{ path: string; date: string } | null>(null)
  const today = toLocalDayStamp(new Date(Math.max(now, lastActionAt)))
  const option = getSelectedNitnemReading(readingPath, selectedIds)
  const eligible = tracking && option !== null
  const completedToday = completedDate === today ? completedIds : []
  const complete = eligible && completedToday.includes(option.id)
  const next = eligible ? getNextIncompleteNitnemReading(option.id, selectedIds, completedToday) : null
  const copy = COPY[locale]

  const changeCompletion = (completed: boolean) => {
    // Resolve again on click: the routine, length, tracking or day may have
    // changed since these controls were painted.
    const current = useNitemStore.getState()
    const currentOption = getSelectedNitnemReading(readingPath, current.selectedIds)
    const timestamp = Date.now()
    setLastActionAt(timestamp)
    setFailure(null)
    if (!currentOption || !current.completionTrackingEnabled) return
    const result = setNitnemCompletionSafely(currentOption.id, completed)
    if (result === 'failed') setFailure({ path: readingPath, date: toLocalDayStamp(new Date(timestamp)) })
  }

  const continueReading = () => {
    if (!next) return
    const path = getHomeNitnemResume(next, useProgressStore.getState().currentSession, useReadingPlacesStore.getState().places)
      ?? buildNitnemStudyPath(next)
    navigate(path, { state: { readerOrigin: '/' } })
  }

  return (
    <section className="reader-finish" aria-label={copy.title} data-reader-interactive data-testid="reader-finish-panel">
      <span className="reader-finish__rule" aria-hidden="true" />
      <h2>{copy.title}</h2>
      {eligible ? (
        <div className="reader-finish__completion">
          {complete ? (
            <div className="reader-finish__confirmed" role="status">
              <span><span aria-hidden="true"><IconCheck size={18} /></span>{copy.complete}</span>
              <button type="button" onClick={() => changeCompletion(false)}>{copy.undo}</button>
            </div>
          ) : (
            <button type="button" className="reader-finish__mark" onClick={() => changeCompletion(true)}>{copy.mark}</button>
          )}
          {failure?.path === readingPath && failure.date === today ? <p className="reader-finish__error" role="alert">{copy.failed}</p> : null}
        </div>
      ) : null}
      <div className="reader-finish__actions">
        {next ? (
          <button type="button" className="reader-finish__next" onClick={continueReading}>
            <span><span>{copy.next}</span>{' '}<strong>{locale === 'en' ? next.romanizedTitle : next.gurmukhiTitle}</strong></span>
            <span aria-hidden="true"><IconArrowRight size={20} /></span>
          </button>
        ) : null}
        {option ? <button type="button" className="reader-finish__return" data-reader-back="true" onClick={() => navigate('/')}>{copy.routine}</button> : (
          <button type="button" className="reader-finish__return" data-reader-back="true" onClick={onBack}>{copy.back}</button>
        )}
        <button type="button" className="reader-finish__again" onClick={onReadAgain}>{copy.again}</button>
      </div>
    </section>
  )
}
