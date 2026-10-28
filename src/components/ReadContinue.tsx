import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useContinueReadings } from '../hooks/useContinueReadings'
import { useLocaleStore } from '../store/locale'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { BANIS } from '../data/banis'
import { buildCurrentAppPath, buildLibraryReaderNavigationState, buildReaderOriginNavigationState } from '../utils/libraryReaderNavigation'
import { IconArrowRight } from './icons'
import '../styles/read-continue.css'

const COPY = {
  en: { all: 'All reading places', fewer: 'Show fewer', title: 'Continue reading', body: 'Return to the places you left open.', begin: 'Begin here', beginBody: 'A quiet place to start: Japji Sahib, the opening bani of Sri Guru Granth Sahib Ji.', start: 'Read Japji Sahib' },
  pa: { all: 'ਪੜ੍ਹਨ ਦੀਆਂ ਸਾਰੀਆਂ ਥਾਵਾਂ', fewer: 'ਘੱਟ ਵੇਖੋ', title: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ', body: 'ਆਪਣੇ ਛੱਡੇ ਹੋਏ ਪਾਠਾਂ ਵੱਲ ਮੁੜੋ।', begin: 'ਇੱਥੋਂ ਸ਼ੁਰੂ ਕਰੋ', beginBody: 'ਜਪੁਜੀ ਸਾਹਿਬ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ — ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੀ ਪਹਿਲੀ ਬਾਣੀ।', start: 'ਜਪੁਜੀ ਸਾਹਿਬ ਪੜ੍ਹੋ' },
  hi: { all: 'पढ़ने के सभी स्थान', fewer: 'कम दिखाएँ', title: 'पढ़ना जारी रखें', body: 'अपने छोड़े हुए पाठों पर लौटें।', begin: 'यहाँ से शुरू करें', beginBody: 'जपुजी साहिब से शुरू करें — श्री गुरु ग्रंथ साहिब जी की पहली बाणी।', start: 'जपुजी साहिब पढ़ें' },
}

export default function ReadContinue() {
  const locale = useLocaleStore(state => state.locale)
  const allReadings = useContinueReadings()
  const [showAll, setShowAll] = useState(() => {
    try { return sessionStorage.getItem('naamras-read-continue-expanded') === '1' } catch { return false }
  })
  const toggleAll = () => {
    const next = !showAll
    setShowAll(next)
    try { sessionStorage.setItem('naamras-read-continue-expanded', next ? '1' : '0') } catch { /* Expansion still works without storage. */ }
  }
  const readings = showAll ? allReadings : allReadings.slice(0, 3)
  const location = useLocation()
  const origin = buildCurrentAppPath(location)
  const copy = COPY[locale]
  const beginPath = buildCanonicalBaniStudyPath(BANIS.find(bani => bani.id === 'japji-sahib')!)
  return <section className="read-continue" aria-labelledby="read-continue-title" data-testid="read-continue" lang={locale}>
    <div className="read-continue__intro"><h2 id="read-continue-title">{readings.length ? copy.title : copy.begin}</h2><p>{readings.length ? copy.body : copy.beginBody}</p></div>
    {readings.length ? <ol className="read-continue__list">{readings.map(reading => <li key={reading.id}>
      <Link id={`read-continue-${reading.id}`} className="read-continue__link interactive-focus" to={reading.path} state={reading.kind === 'story' ? buildLibraryReaderNavigationState(origin) : buildReaderOriginNavigationState(reading.path, origin)}>
        <span><strong lang="en">{reading.title}</strong><span>{reading.detail}</span></span><IconArrowRight size={18} />
      </Link>
    </li>)}</ol> : <Link id="read-continue-begin" className="read-continue__start interactive-focus" to={beginPath} state={buildReaderOriginNavigationState(beginPath, origin)}>{copy.start}<IconArrowRight size={18} /></Link>}
    {allReadings.length > 3 ? <button id="read-continue-more" type="button" className="read-continue__more interactive-focus" aria-expanded={showAll} onClick={toggleAll}>{showAll ? copy.fewer : copy.all}</button> : null}
  </section>
}
