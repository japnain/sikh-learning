import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useContinueReadings } from '../hooks/useContinueReadings'
import { useLocaleStore } from '../store/locale'
import { useReadingVisibilityStore } from '../store/readingVisibility'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { BANIS } from '../data/banis'
import { buildCurrentAppPath, buildLibraryReaderNavigationState, buildReaderOriginNavigationState } from '../utils/libraryReaderNavigation'
import { IconArrowRight, IconClose } from './icons'
import '../styles/read-continue.css'

const COPY = {
  en: { all: 'All reading places', fewer: 'Show fewer', title: 'Continue reading', body: 'Return to the places you left open.', begin: 'Begin here', beginBody: 'A quiet place to start: Japji Sahib, the opening bani of Sri Guru Granth Sahib Ji.', start: 'Read Japji Sahib' },
  pa: { all: 'ਪੜ੍ਹਨ ਦੀਆਂ ਸਾਰੀਆਂ ਥਾਵਾਂ', fewer: 'ਘੱਟ ਵੇਖੋ', title: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ', body: 'ਆਪਣੇ ਛੱਡੇ ਹੋਏ ਪਾਠਾਂ ਵੱਲ ਮੁੜੋ।', begin: 'ਇੱਥੋਂ ਸ਼ੁਰੂ ਕਰੋ', beginBody: 'ਜਪੁਜੀ ਸਾਹਿਬ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ — ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੀ ਪਹਿਲੀ ਬਾਣੀ।', start: 'ਜਪੁਜੀ ਸਾਹਿਬ ਪੜ੍ਹੋ' },
  hi: { all: 'पढ़ने के सभी स्थान', fewer: 'कम दिखाएँ', title: 'पढ़ना जारी रखें', body: 'अपने छोड़े हुए पाठों पर लौटें।', begin: 'यहाँ से शुरू करें', beginBody: 'जपुजी साहिब से शुरू करें — श्री गुरु ग्रंथ साहिब जी की पहली बाणी।', start: 'जपुजी साहिब पढ़ें' },
}

const VISIBILITY_COPY = {
  en: { hide: (title: string) => `Hide ${title} from Continue reading`, hidden: (title: string) => `${title} hidden from Continue reading. Your place is kept.`, undo: 'Undo', restore: 'Restore hidden reading places', empty: 'Your reading places are hidden. Restore them here, or open a reading to continue.' },
  pa: { hide: (title: string) => `${title} ਨੂੰ ਜਾਰੀ ਪਾਠਾਂ ਵਿੱਚੋਂ ਲੁਕਾਓ`, hidden: (title: string) => `${title} ਜਾਰੀ ਪਾਠਾਂ ਵਿੱਚੋਂ ਲੁਕਾਇਆ ਗਿਆ। ਪੜ੍ਹਨ ਦੀ ਥਾਂ ਸੰਭਾਲੀ ਹੋਈ ਹੈ।`, undo: 'ਵਾਪਸ ਕਰੋ', restore: 'ਲੁਕਾਏ ਪਾਠ ਮੁੜ ਦਿਖਾਓ', empty: 'ਤੁਹਾਡੇ ਪਾਠ ਲੁਕਾਏ ਹੋਏ ਹਨ। ਇੱਥੇ ਮੁੜ ਦਿਖਾਓ ਜਾਂ ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖਣ ਲਈ ਕੋਈ ਪਾਠ ਖੋਲ੍ਹੋ।' },
  hi: { hide: (title: string) => `${title} को जारी पाठों से छिपाएँ`, hidden: (title: string) => `${title} जारी पाठों से छिपाया गया। पढ़ने का स्थान सुरक्षित है।`, undo: 'वापस करें', restore: 'छिपे हुए पाठ फिर दिखाएँ', empty: 'आपके पाठ छिपे हुए हैं। यहाँ फिर दिखाएँ या पढ़ना जारी रखने के लिए कोई पाठ खोलें।' },
}

export default function ReadContinue() {
  const locale = useLocaleStore(state => state.locale)
  const allReadings = useContinueReadings()
  const hidden = useReadingVisibilityStore(state => state.hidden)
  const hide = useReadingVisibilityStore(state => state.hide)
  const restore = useReadingVisibilityStore(state => state.restore)
  const restoreAll = useReadingVisibilityStore(state => state.restoreAll)
  const [lastHidden, setLastHidden] = useState<{ id: string; title: string } | null>(null)
  const undoRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (lastHidden) undoRef.current?.focus({ preventScroll: true }) }, [lastHidden])
  const [showAll, setShowAll] = useState(() => {
    try { return sessionStorage.getItem('naamras-read-continue-expanded') === '1' } catch { return false }
  })
  const toggleAll = () => {
    const next = !showAll
    setShowAll(next)
    try { sessionStorage.setItem('naamras-read-continue-expanded', next ? '1' : '0') } catch { /* Expansion still works without storage. */ }
  }
  const visibleReadings = allReadings.filter(reading => hidden[reading.id] !== reading.updatedAt)
  const hiddenCount = allReadings.length - visibleReadings.length
  const readings = showAll ? visibleReadings : visibleReadings.slice(0, 3)
  const location = useLocation()
  const origin = buildCurrentAppPath(location)
  const copy = COPY[locale]
  const visibilityCopy = VISIBILITY_COPY[locale]
  const beginPath = buildCanonicalBaniStudyPath(BANIS.find(bani => bani.id === 'japji-sahib')!)
  return <section className="read-continue" aria-labelledby="read-continue-title" data-testid="read-continue" lang={locale}>
    <div className="read-continue__intro"><h2 ref={titleRef} tabIndex={-1} id="read-continue-title">{allReadings.length ? copy.title : copy.begin}</h2><p>{readings.length ? copy.body : hiddenCount ? visibilityCopy.empty : copy.beginBody}</p></div>
    {readings.length ? <ol className="read-continue__list">{readings.map(reading => <li key={reading.id}>
      <Link id={`read-continue-${reading.id}`} className="read-continue__link interactive-focus" to={reading.path} state={reading.kind === 'story' ? buildLibraryReaderNavigationState(origin) : buildReaderOriginNavigationState(reading.path, origin)}>
        <span><strong lang="en">{reading.title}</strong><span>{reading.detail}</span></span><IconArrowRight size={18} />
      </Link>
      <button type="button" className="read-continue__hide interactive-focus" aria-label={visibilityCopy.hide(reading.title)} onClick={() => { hide(reading.id, reading.updatedAt); setLastHidden({ id: reading.id, title: reading.title }) }}><IconClose size={16} /></button>
    </li>)}</ol> : hiddenCount ? null : <Link id="read-continue-begin" className="read-continue__start interactive-focus" to={beginPath} state={buildReaderOriginNavigationState(beginPath, origin)}>{copy.start}<IconArrowRight size={18} /></Link>}
    {lastHidden ? <div className="read-continue__feedback"><span role="status">{visibilityCopy.hidden(lastHidden.title)}</span><button ref={undoRef} type="button" className="read-continue__more interactive-focus" onClick={() => { restore(lastHidden.id); setLastHidden(null); titleRef.current?.focus({ preventScroll: true }) }}>{visibilityCopy.undo}</button></div> : null}
    {hiddenCount ? <button type="button" className="read-continue__more interactive-focus" onClick={() => { restoreAll(); setLastHidden(null); titleRef.current?.focus({ preventScroll: true }) }}>{visibilityCopy.restore}</button> : null}
    {visibleReadings.length > 3 ? <button id="read-continue-more" type="button" className="read-continue__more interactive-focus" aria-expanded={showAll} onClick={toggleAll}>{showAll ? copy.fewer : copy.all}</button> : null}
  </section>
}
