import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPrivateBookshelfState, rememberPrivateBookshelfState, type PrivateBookSummary } from '../../data/privateLibrary'
import { useLocaleStore } from '../../store/locale'
import { IconArrowRight, IconSearch } from '../icons'
import './private-bookshelf.css'

const COPY = {
  en: {
    private: 'Private collection', title: 'Your bookshelf', body: 'A place for the books you return to.',
    search: 'Search your books', searchPlaceholder: 'Title, author or subject', sort: 'Sort books',
    collection: 'Collection order', titleSort: 'Title A–Z', authorSort: 'Author A–Z', recent: 'Recently read',
    categories: 'Book subjects', all: 'All books', clear: 'Clear filters', reading: 'Continue reading',
    loading: 'Opening your bookshelf…', error: 'Your bookshelf could not be opened.', retry: 'Try again',
    empty: 'Your bookshelf is ready for its first book.', noMatches: 'No books match these filters.',
    finished: 'Finished', open: (title: string) => `Open ${title}`, progress: (title: string) => `Reading progress for ${title}`,
    count: (n: number) => `${n} ${n === 1 ? 'book' : 'books'}`, results: (n: number, total: number) => `${n} of ${total} books`,
  },
  pa: {
    private: 'ਨਿੱਜੀ ਸੰਗ੍ਰਹਿ', title: 'ਤੁਹਾਡੀਆਂ ਕਿਤਾਬਾਂ', body: 'ਉਨ੍ਹਾਂ ਕਿਤਾਬਾਂ ਲਈ ਥਾਂ ਜਿਨ੍ਹਾਂ ਵੱਲ ਤੁਸੀਂ ਮੁੜਦੇ ਹੋ।',
    search: 'ਆਪਣੀਆਂ ਕਿਤਾਬਾਂ ਖੋਜੋ', searchPlaceholder: 'ਸਿਰਲੇਖ, ਲੇਖਕ ਜਾਂ ਵਿਸ਼ਾ', sort: 'ਕਿਤਾਬਾਂ ਦਾ ਕ੍ਰਮ',
    collection: 'ਸੰਗ੍ਰਹਿ ਦਾ ਕ੍ਰਮ', titleSort: 'ਸਿਰਲੇਖ ਅਨੁਸਾਰ', authorSort: 'ਲੇਖਕ ਅਨੁਸਾਰ', recent: 'ਹਾਲ ਹੀ ਵਿੱਚ ਪੜ੍ਹੀਆਂ',
    categories: 'ਕਿਤਾਬਾਂ ਦੇ ਵਿਸ਼ੇ', all: 'ਸਾਰੀਆਂ ਕਿਤਾਬਾਂ', clear: 'ਫਿਲਟਰ ਹਟਾਓ', reading: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ',
    loading: 'ਤੁਹਾਡੀਆਂ ਕਿਤਾਬਾਂ ਖੁੱਲ੍ਹ ਰਹੀਆਂ ਹਨ…', error: 'ਤੁਹਾਡੀਆਂ ਕਿਤਾਬਾਂ ਖੋਲ੍ਹੀਆਂ ਨਹੀਂ ਜਾ ਸਕੀਆਂ।', retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    empty: 'ਤੁਹਾਡਾ ਸੰਗ੍ਰਹਿ ਪਹਿਲੀ ਕਿਤਾਬ ਲਈ ਤਿਆਰ ਹੈ।', noMatches: 'ਇਨ੍ਹਾਂ ਫਿਲਟਰਾਂ ਨਾਲ ਕੋਈ ਕਿਤਾਬ ਨਹੀਂ ਮਿਲੀ।',
    finished: 'ਪੂਰੀ ਹੋਈ', open: (title: string) => `${title} ਖੋਲ੍ਹੋ`, progress: (title: string) => `${title} ਦੀ ਪੜ੍ਹਨ ਤਰੱਕੀ`,
    count: (n: number) => `${n} ਕਿਤਾਬਾਂ`, results: (n: number, total: number) => `${total} ਵਿੱਚੋਂ ${n} ਕਿਤਾਬਾਂ`,
  },
  hi: {
    private: 'निजी संग्रह', title: 'आपकी किताबें', body: 'उन किताबों के लिए जगह जिनकी ओर आप लौटते हैं।',
    search: 'अपनी किताबें खोजें', searchPlaceholder: 'शीर्षक, लेखक या विषय', sort: 'किताबों का क्रम',
    collection: 'संग्रह का क्रम', titleSort: 'शीर्षक के अनुसार', authorSort: 'लेखक के अनुसार', recent: 'हाल ही में पढ़ी गई',
    categories: 'किताबों के विषय', all: 'सभी किताबें', clear: 'फ़िल्टर हटाएँ', reading: 'पढ़ना जारी रखें',
    loading: 'आपकी किताबें खुल रही हैं…', error: 'आपकी किताबें खोली नहीं जा सकीं।', retry: 'फिर कोशिश करें',
    empty: 'आपका संग्रह पहली किताब के लिए तैयार है।', noMatches: 'इन फ़िल्टरों से कोई किताब नहीं मिली।',
    finished: 'पूरी हुई', open: (title: string) => `${title} खोलें`, progress: (title: string) => `${title} की पढ़ने की प्रगति`,
    count: (n: number) => `${n} किताबें`, results: (n: number, total: number) => `${total} में से ${n} किताबें`,
  },
}

type ShelfSort = 'collection' | 'title' | 'author' | 'recent'
type ShelfState = { query: string; category: string; sort: ShelfSort }
export type PrivateBookshelfProgress = { fraction: number; updatedAt?: string; completed?: boolean }

export interface PrivateBookshelfProps {
  books: PrivateBookSummary[]
  coverUrls?: Record<string, string | undefined>
  progress?: Record<string, PrivateBookshelfProgress | undefined>
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function initialShelfState(): ShelfState {
  const input = getPrivateBookshelfState()
  return {
    query: typeof input?.query === 'string' ? input.query : '',
    category: typeof input?.category === 'string' ? input.category : '',
    sort: input?.sort && ['collection', 'title', 'author', 'recent'].includes(input.sort) ? input.sort : 'collection',
  }
}

function normalize(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim()
}

function readingFraction(value: number | undefined) {
  return value != null && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function coverTone(id: string) {
  return Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4
}

function PrivateBookCover({ book, url }: { book: PrivateBookSummary; url?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // Covers are fetched with the current session by the parent. Never turn
  // metadata or a remote URL into an unauthenticated browser image request.
  const source = url?.startsWith('blob:') && url !== failedUrl ? url : null
  return <span className="private-book-cover" data-tone={coverTone(book.id)} aria-hidden="true">
    {source ? <img src={source} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(source)} />
      : <span className="private-book-cover__fallback" lang={book.language}>
        <span className="private-book-cover__rule" />
        <strong>{book.title}</strong>
        <span className="private-book-cover__author">{book.authors.join(' · ')}</span>
        <span className="private-book-cover__rule" />
      </span>}
  </span>
}

export default function PrivateBookshelf({ books, coverUrls = {}, progress = {}, loading = false, error = null, onRetry }: PrivateBookshelfProps) {
  const locale = useLocaleStore(state => state.locale)
  const copy = COPY[locale]
  const id = useId()
  const [filters, setFilters] = useState(initialShelfState)
  const categories = useMemo(() => Array.from(new Set(books.map(book => book.category).filter(Boolean))), [books])
  const category = categories.includes(filters.category) ? filters.category : ''
  useEffect(() => { rememberPrivateBookshelfState({ ...filters, category }) }, [filters, category])
  const terms = normalize(filters.query).split(/\s+/u).filter(Boolean)
  const filtered = books.filter(book => {
    if (category && book.category !== category) return false
    const haystack = normalize([book.title, book.subtitle, ...book.authors, ...(book.contributors ?? []), book.category].filter(Boolean).join(' '))
    return terms.every(term => haystack.includes(term))
  })
  if (filters.sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title, locale))
  if (filters.sort === 'author') filtered.sort((a, b) => a.authors.join(' ').localeCompare(b.authors.join(' '), locale) || a.title.localeCompare(b.title, locale))
  if (filters.sort === 'recent') filtered.sort((a, b) => (Date.parse(progress[b.id]?.updatedAt ?? '') || 0) - (Date.parse(progress[a.id]?.updatedAt ?? '') || 0))
  const grouped = filters.sort === 'collection' && !category && !terms.length
    ? categories.map(label => ({ label, books: filtered.filter(book => book.category === label) }))
    : [{ label: category || copy.all, books: filtered }]
  const uncategorized = filters.sort === 'collection' && !category && !terms.length ? filtered.filter(book => !book.category) : []
  if (uncategorized.length) grouped.push({ label: copy.all, books: uncategorized })
  const resumeBook = [...books].filter(book => {
    const fraction = readingFraction(progress[book.id]?.fraction)
    return fraction > 0 && !progress[book.id]?.completed
  }).sort((a, b) => (Date.parse(progress[b.id]?.updatedAt ?? '') || 0) - (Date.parse(progress[a.id]?.updatedAt ?? '') || 0))[0]
  const navigationState = { privateBookshelfOrigin: '/banis?collection=books' }
  const clearFilters = () => setFilters({ query: '', category: '', sort: filters.sort })
  const hasFilters = Boolean(category || terms.length)

  return <section className="private-bookshelf" aria-labelledby={`${id}-title`} lang={locale} data-testid="private-bookshelf">
    <header className="private-bookshelf__header">
      <div>
        <p className="private-bookshelf__eyebrow"><span aria-hidden="true" className="private-bookshelf__seal" />{copy.private}</p>
        <h2 id={`${id}-title`}>{copy.title}</h2>
        <p className="private-bookshelf__intro">{copy.body}</p>
      </div>
      {!loading && !error && books.length > 0 ? <span className="private-bookshelf__total">{copy.count(books.length)}</span> : null}
    </header>
    {loading ? <div className="private-bookshelf__state" role="status"><span className="private-bookshelf__loading-mark" aria-hidden="true" />{copy.loading}</div>
      : error ? <div className="private-bookshelf__state" role="status"><p>{copy.error}</p>{onRetry ? <button className="private-bookshelf__reset interactive-focus" type="button" onClick={onRetry}>{copy.retry}</button> : null}</div>
        : !books.length ? <p className="private-bookshelf__state" role="status">{copy.empty}</p>
          : <>
            {resumeBook && !hasFilters ? <Link className="private-bookshelf__resume interactive-focus" to={`/books/private/${encodeURIComponent(resumeBook.id)}`} state={navigationState}>
              <span><span className="private-bookshelf__resume-label">{copy.reading}</span><strong lang={resumeBook.language}>{resumeBook.title}</strong></span>
              <span className="private-bookshelf__resume-end"><span>{Math.round(readingFraction(progress[resumeBook.id]?.fraction) * 100)}%</span><IconArrowRight size={19} /></span>
            </Link> : null}
            <div className="private-bookshelf__controls">
              <div className="private-bookshelf__search">
                <label className="sr-only" htmlFor={`${id}-search`}>{copy.search}</label>
                <span aria-hidden="true"><IconSearch size={18} /></span>
                <input id={`${id}-search`} type="search" autoComplete="off" value={filters.query} placeholder={copy.searchPlaceholder} onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} />
              </div>
              <div className="private-bookshelf__sort">
                <label className="sr-only" htmlFor={`${id}-sort`}>{copy.sort}</label>
                <select id={`${id}-sort`} value={filters.sort} onChange={event => setFilters(current => ({ ...current, sort: event.target.value as ShelfSort }))}>
                  <option value="collection">{copy.collection}</option><option value="title">{copy.titleSort}</option><option value="author">{copy.authorSort}</option><option value="recent">{copy.recent}</option>
                </select>
              </div>
            </div>
            <div className="private-bookshelf__categories" role="group" aria-label={copy.categories}>
              <button type="button" aria-pressed={!category} onClick={() => setFilters(current => ({ ...current, category: '' }))}>{copy.all}</button>
              {categories.map(label => <button key={label} type="button" aria-pressed={category === label} onClick={() => setFilters(current => ({ ...current, category: label }))}>{label}</button>)}
            </div>
            {hasFilters ? <div className="private-bookshelf__results"><p role="status">{copy.results(filtered.length, books.length)}</p><button className="private-bookshelf__reset interactive-focus" type="button" onClick={clearFilters}>{copy.clear}</button></div> : null}
            {!filtered.length ? <p className="private-bookshelf__state">{copy.noMatches}</p> : grouped.map((group, index) => <section key={group.label} className="private-book-shelf" aria-labelledby={`${id}-shelf-${index}`}>
              <div className="private-book-shelf__heading"><h3 id={`${id}-shelf-${index}`}>{group.label}</h3><span>{copy.count(group.books.length)}</span></div>
              <ul className="private-book-shelf__books">
                {group.books.map(book => {
                  const completed = progress[book.id]?.completed === true
                  const fraction = completed ? 1 : readingFraction(progress[book.id]?.fraction)
                  return <li className="private-book" key={book.id}>
                    <Link className="private-book__link interactive-focus" to={`/books/private/${encodeURIComponent(book.id)}`} state={navigationState} aria-label={copy.open(book.title)}>
                      <span className="private-book__display"><PrivateBookCover book={book} url={coverUrls[book.id]} /></span>
                      <span className="private-book__details"><strong lang={book.language}>{book.title}</strong><span className="private-book__authors" lang={book.language}>{book.authors.join(' · ')}</span></span>
                    </Link>
                    {fraction > 0 ? <div className="private-book__progress"><progress max={1} value={fraction} aria-label={copy.progress(book.title)} /><span>{completed ? copy.finished : `${Math.round(fraction * 100)}%`}</span></div> : null}
                  </li>
                })}
              </ul>
            </section>)}
          </>}
  </section>
}
