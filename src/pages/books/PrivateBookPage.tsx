import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight } from '../../components/icons'
import { createPrivateObjectUrl, revokePrivateObjectUrl, fetchPrivateAsset, loadPrivateBook, loadPrivateReadingState, type PrivateBook } from '../../data/privateLibrary'
import { usePrivateLibraryAccess } from '../../hooks/usePrivateLibraryAccess'
import { privateSectionLabel } from './privateBookNavigation'
import './private-book-reader.css'

export function PrivateBookAccessMessage({ loading, retry }: { loading?: boolean; retry?: () => void }) {
  return <main className="private-book-state page-shell" aria-busy={loading || undefined}>
    <Link className="private-book-back" to="/banis?collection=books"><IconArrowLeft size={18} /> Books</Link>
    <p className="private-book-eyebrow">Naamras</p>
    <h1>{loading ? 'Opening your collection…' : 'This book is unavailable'}</h1>
    <p>{loading ? 'Checking your access.' : 'Sign in with an account that has access, then try again.'}</p>
    {!loading && retry ? <button type="button" className="private-book-button" onClick={retry}>Try again</button> : null}
  </main>
}

export default function PrivateBookPage() {
  const access = usePrivateLibraryAccess()
  const { bookId = '' } = useParams<{ bookId: string }>()
  if (access.loading || !access.allowed) return <PrivateBookAccessMessage loading={access.loading} retry={access.recheck} />
  return <BookDetails key={`${bookId}:${access.epoch}`} bookId={bookId} />
}

function BookDetails({ bookId }: { bookId: string }) {
  const location = useLocation()
  const [book, setBook] = useState<PrivateBook | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>()
  const [hasPosition, setHasPosition] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [visibleContents, setVisibleContents] = useState(32)
  const shelfOrigin = typeof location.state?.privateBookshelfOrigin === 'string' && /^\/banis(?:\?[^#]*)?$/.test(location.state.privateBookshelfOrigin) ? location.state.privateBookshelfOrigin : '/banis?collection=books'
  const shelfState = { privateBookshelfOrigin: shelfOrigin }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    let objectUrl: string | undefined
    void loadPrivateBook(bookId).then(async nextBook => {
      if (!active) return
      setBook(nextBook)
      setError(false)
      void loadPrivateReadingState(bookId, nextBook.editionVersion).then(state => {
        if (!active || !state) return
        setHasPosition(true)
        setProgress(Math.min(1, Math.max(0, Number(state.progress) || 0)))
      }).catch(() => { /* Reading remains available when progress cannot be fetched. */ })
      if (nextBook.coverAssetId) {
        const cover = await fetchPrivateAsset(bookId, nextBook.coverAssetId, { signal: controller.signal })
        if (!active) return
        objectUrl = createPrivateObjectUrl(cover)
        setCoverUrl(objectUrl)
      }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false; controller.abort(); if (objectUrl) revokePrivateObjectUrl(objectUrl) }
  }, [bookId, attempt])

  if (!book) return <main className="private-book-state page-shell" aria-busy={!error || undefined}>
    <Link className="private-book-back" to={shelfOrigin} state={shelfState}><IconArrowLeft size={18} /> Books</Link>
    <h1>{error ? 'The book could not be opened' : 'Opening book…'}</h1>
    <p>{error ? 'Check your connection and try again.' : 'Preparing your reading space.'}</p>
    {error ? <button type="button" className="private-book-button" onClick={() => setAttempt(value => value + 1)}>Try again</button> : null}
  </main>

  const readerPath = `/books/private/${encodeURIComponent(book.id)}/read`
  return <main className="private-book-detail page-shell" lang={book.language || 'en'}>
    <Link className="private-book-back" to={shelfOrigin} state={shelfState}><IconArrowLeft size={18} /> Books</Link>
    <section className="private-book-detail__hero" aria-labelledby="private-book-title">
      <div className="private-book-detail__cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div className="private-book-cover-fallback"><span>{book.authors.join(' · ')}</span><strong>{book.title}</strong><span>Naamras collection</span></div>}
      </div>
      <div className="private-book-detail__identity">
        <p className="private-book-eyebrow">{book.category}</p>
        <h1 id="private-book-title">{book.title}</h1>
        {book.subtitle ? <p className="private-book-detail__subtitle">{book.subtitle}</p> : null}
        <p className="private-book-detail__authors">{book.authors.join(' · ')}</p>
        {book.contributors?.length ? <p className="private-book-detail__contributors">{book.contributors.join(' · ')}</p> : null}
        <p className="private-book-detail__description">{book.description}</p>
        <div className="private-book-detail__facts">
          <span>Private collection</span><span>{book.formats.join(' / ').toUpperCase()}</span>
          <span>{book.renderer === 'chapters' ? `${book.contents.length} sections` : `${book.pageCount || book.contents.length} pages`}</span>
        </div>
        <Link className="private-book-button private-book-button--primary" to={readerPath} state={shelfState}>{hasPosition ? 'Continue reading' : 'Begin reading'}<IconArrowRight size={18} /></Link>
        {hasPosition ? <p className="private-book-detail__progress">{Math.round(progress * 100)}% read · Your place is saved to your account.</p> : null}
      </div>
    </section>
    {book.renderer === 'chapters' && book.contents.length ? <section className="private-book-contents" aria-labelledby="private-book-contents-title">
      <div className="private-book-section-heading"><h2 id="private-book-contents-title">Inside this book</h2><span>{book.contents.length} sections</span></div>
      <ol>{book.contents.slice(0, visibleContents).map((entry, index) => <li key={entry.id}>
        <Link to={`${readerPath}?section=${index}`} state={shelfState}><span className="private-book-contents__number">{String(index + 1).padStart(2, '0')}</span><span>{privateSectionLabel(entry.title, index)}</span><IconArrowRight size={16} /></Link>
      </li>)}</ol>
      {visibleContents < book.contents.length ? <button type="button" className="private-book-button" onClick={() => setVisibleContents(value => value + 40)}>Show more sections</button> : null}
    </section> : <section className="private-book-facsimile-note"><h2>Read the original pages</h2><p>This edition preserves the source pages. Use page navigation and zoom to read comfortably; text search is available only where the source contains usable text.</p></section>}
  </main>
}
