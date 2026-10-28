import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loadLibraryWorkCatalog } from '../data/libraryRepository'
import type { LibraryWork } from '../types'
import { useCompanionCopy } from '../utils/companionCopy'
import '../styles/library-book-browser.css'
import {
  buildCurrentAppPath,
  buildLibraryReaderNavigationState,
} from '../utils/libraryReaderNavigation'
import { IconArrowRight } from './icons'

const BOOK_COPY = {
  en: {
    loading: 'Opening the book catalog…', error: 'The book catalog could not be loaded.',
    offline: 'You are offline. Connect to load the book catalog, then try again.',
    retry: 'Try again', empty: 'No curated books have been added yet.',
    edition: 'Reading edition', english: 'English edition', open: 'Open book',
    volumes: (count: number) => `${count} ${count === 1 ? 'volume' : 'volumes'}`,
    episodes: (count: number) => `${count} episodes`, openLabel: (title: string) => `Open ${title} book reader`,
  },
  pa: {
    loading: 'ਕਿਤਾਬਾਂ ਦੀ ਸੂਚੀ ਖੁੱਲ੍ਹ ਰਹੀ ਹੈ…', error: 'ਕਿਤਾਬਾਂ ਦੀ ਸੂਚੀ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀ।',
    offline: 'ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਹੋ। ਕਿਤਾਬਾਂ ਦੀ ਸੂਚੀ ਲੋਡ ਕਰਨ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜ ਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ', empty: 'ਹਾਲੇ ਕੋਈ ਚੁਣੀਆਂ ਕਿਤਾਬਾਂ ਨਹੀਂ ਜੋੜੀਆਂ ਗਈਆਂ।',
    edition: 'ਪਾਠ ਸੰਸਕਰਨ', english: 'ਅੰਗਰੇਜ਼ੀ ਸੰਸਕਰਨ', open: 'ਕਿਤਾਬ ਖੋਲ੍ਹੋ',
    volumes: (count: number) => `${count} ਭਾਗ`, episodes: (count: number) => `${count} ਪ੍ਰਸੰਗ`,
    openLabel: (title: string) => `${title} ਕਿਤਾਬ ਖੋਲ੍ਹੋ`,
  },
  hi: {
    loading: 'पुस्तकों की सूची खुल रही है…', error: 'पुस्तकों की सूची लोड नहीं हो सकी।',
    offline: 'आप ऑफ़लाइन हैं। पुस्तकों की सूची लोड करने के लिए इंटरनेट से जुड़कर फिर कोशिश करें।',
    retry: 'फिर कोशिश करें', empty: 'अभी कोई चुनी हुई पुस्तक नहीं जोड़ी गई है।',
    edition: 'पाठ संस्करण', english: 'अंग्रेज़ी संस्करण', open: 'पुस्तक खोलें',
    volumes: (count: number) => `${count} खंड`, episodes: (count: number) => `${count} प्रसंग`,
    openLabel: (title: string) => `${title} पुस्तक खोलें`,
  },
}

type LibraryBookBrowserProps = {
  dataTestId?: string
  className?: string
}

export default function LibraryBookBrowser({ dataTestId, className = '' }: LibraryBookBrowserProps) {
  const location = useLocation()
  const { locale, lang } = useCompanionCopy()
  const copy = BOOK_COPY[locale]
  const [attempt, setAttempt] = useState(0)
  const readerNavigationState = buildLibraryReaderNavigationState(buildCurrentAppPath(location))
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error'
    works: LibraryWork[]
    offline?: boolean
  }>({ status: 'loading', works: [] })

  useEffect(() => {
    let cancelled = false
    loadLibraryWorkCatalog()
      .then(catalog => {
        if (!cancelled) setState({ status: 'ready', works: catalog.works })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', works: [], offline: !navigator.onLine })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (state.status === 'loading') {
    return <div className={className} lang={lang} data-testid={dataTestId}><p className="read-index-state" role="status">{copy.loading}</p></div>
  }

  if (state.status === 'error') {
    return <div className={className} lang={lang} data-testid={dataTestId}><div className="read-index-state library-book-recovery" role="status"><p>{state.offline ? copy.offline : copy.error}</p><button type="button" className="interactive-focus" onClick={() => { setState({ status: 'loading', works: [] }); setAttempt(value => value + 1) }}>{copy.retry}</button></div></div>
  }

  if (!state.works.length) {
    return <div className={className} lang={lang} data-testid={dataTestId}><p className="read-index-state">{copy.empty}</p></div>
  }

  return (
    <div className={`library-book-browser ${className}`.trim()} lang={lang} data-testid={dataTestId}>
      {state.works.map(work => (
        <article key={work.id} className="library-book-card library-book-card--edition" data-testid={`${work.id.replace('-english', '')}-source-card`}>
          <div className="epub-book-cover library-book-card__cover" aria-hidden="true">
            <span className="epub-book-cover__mark">ੴ</span>
            <span lang={work.language}>{work.shortTitle}</span>
            <small>{/^en(?:glish)?$/i.test(work.language) ? copy.english : work.language}</small>
          </div>
          <div className="library-book-card__copy">
            <p className="eyebrow">{copy.edition} · {copy.volumes(work.publications?.length || 1)}</p>
            <h3 lang={work.language}>{work.title}</h3>
            <p lang={work.language}>{work.description}</p>
            <div>
              {work.totalChapters ? <span>{copy.episodes(work.totalChapters)}</span> : null}
              {work.language ? <span>{/^en(?:glish)?$/i.test(work.language) ? copy.english : work.language.toUpperCase()}</span> : null}
            </div>
          </div>
          <Link
            id={`read-book-${work.id}`}
            to={`/library/${work.id}`}
            state={readerNavigationState}
            className="interactive-focus"
            aria-label={copy.openLabel(work.shortTitle)}
          >
            {copy.open}
            <IconArrowRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  )
}
