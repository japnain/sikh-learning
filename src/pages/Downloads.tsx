import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BaniDownloadsPanel from '../components/BaniDownloadsPanel'
import StoryBrowser from '../components/StoryBrowser'
import LibraryDownloadControls from './library/LibraryDownloadControls'
import { getBaniDownloadItems } from '../utils/baniDownloadItems'
import { loadLibraryWorkCatalog } from '../data/libraryRepository'
import { useLocaleStore } from '../store/locale'
import { DOWNLOADS_COPY } from '../content/downloadsCopy'
import { buildReaderOriginNavigationState } from '../utils/libraryReaderNavigation'
import type { LibraryWork } from '../types'
import '../styles/downloads.css'

export default function Downloads() {
  const locale = useLocaleStore(state => state.locale)
  const copy = DOWNLOADS_COPY[locale]
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [works, setWorks] = useState<LibraryWork[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    loadLibraryWorkCatalog().then(catalogue => { if (active) { setWorks(catalogue.works); setFailed(false) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [attempt])
  const items = useMemo(() => getBaniDownloadItems(path => navigate(path, { state: buildReaderOriginNavigationState(path, '/downloads') })), [navigate])
  return <div className="page-shell downloads-page" data-page="downloads" lang={locale}>
    <Link to="/more" className="downloads-back">← {copy.back}</Link>
    <header><h1>{copy.title}</h1><p>{copy.body}</p></header>
    <p className="downloads-help">{copy.reminder}</p>
    <section aria-labelledby="download-banis-title"><h2 id="download-banis-title">{copy.banis}</h2><BaniDownloadsPanel items={items} initiallyOpen /></section>
    <section aria-labelledby="download-stories-title"><h2 id="download-stories-title">{copy.stories}</h2><StoryBrowser downloadsOnly /></section>
    <section aria-labelledby="download-books-title"><h2 id="download-books-title">{copy.books}</h2>
      {failed ? <div role="alert"><p>{copy.failed}</p><button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>{copy.retry}</button></div> : !works ? <p role="status">{copy.loading}</p> : !works.length ? <p>{copy.empty}</p> : works.map(work => <article key={work.id}>
        <h3 lang="en">{work.title}</h3><Link className="downloads-back" to={`/library/${work.id}`} state={buildReaderOriginNavigationState(`/library/${work.id}`, '/downloads')}>{copy.open} →</Link><LibraryDownloadControls work={work} />
      </article>)}
    </section>
  </div>
}
