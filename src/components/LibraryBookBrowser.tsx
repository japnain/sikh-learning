import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loadLibraryWorkCatalog } from '../data/libraryRepository'
import type { LibraryWork } from '../types'
import {
  buildCurrentAppPath,
  buildLibraryReaderNavigationState,
} from '../utils/libraryReaderNavigation'
import { IconArrowRight, IconLibrary } from './icons'

type LibraryBookBrowserProps = {
  dataTestId?: string
  className?: string
}

export default function LibraryBookBrowser({ dataTestId, className = '' }: LibraryBookBrowserProps) {
  const location = useLocation()
  const readerNavigationState = buildLibraryReaderNavigationState(buildCurrentAppPath(location))
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error'
    works: LibraryWork[]
  }>({ status: 'loading', works: [] })

  useEffect(() => {
    let cancelled = false
    loadLibraryWorkCatalog()
      .then(catalog => {
        if (!cancelled) setState({ status: 'ready', works: catalog.works })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', works: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return <div className={className} data-testid={dataTestId}><p className="read-index-state" role="status">Opening the book catalog…</p></div>
  }

  if (state.status === 'error') {
    return <div className={className} data-testid={dataTestId}><p className="read-index-state" role="status">The book catalog is temporarily unavailable.</p></div>
  }

  if (!state.works.length) {
    return <div className={className} data-testid={dataTestId}><p className="read-index-state">No curated books have been added yet.</p></div>
  }

  return (
    <div className={`library-book-browser ${className}`.trim()} data-testid={dataTestId}>
      {state.works.map(work => (
        <article key={work.id} className="library-book-card" data-testid={`${work.id.replace('-english', '')}-source-card`}>
          <div className="library-book-card__mark" aria-hidden="true">
            <IconLibrary size={20} />
          </div>
          <div className="library-book-card__copy">
            <p className="eyebrow">Curated EPUB · {work.publications?.length ?? 1} volume{work.publications?.length === 1 ? '' : 's'}</p>
            <h3>{work.title}</h3>
            <p>{work.description}</p>
            <div>
              {work.totalChapters ? <span>{work.totalChapters} episodes</span> : null}
              {work.language ? <span>{work.language.toUpperCase()}</span> : null}
            </div>
          </div>
          <Link
            to={`/library/${work.id}`}
            state={readerNavigationState}
            className="interactive-focus"
            aria-label={`Open ${work.shortTitle} book reader`}
          >
            Open book
            <IconArrowRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  )
}
