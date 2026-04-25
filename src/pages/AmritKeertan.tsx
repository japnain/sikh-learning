import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchAmritKeertanIndex,
  fetchAmritKeertanShabads,
  type AmritKeertanHeader,
  type AmritKeertanShabad,
} from '../api/banidb'
import { IconArrowLeft, IconArrowRight, IconSearch } from '../components/icons'

const AMRIT_KEERTAN_SECTION_COUNT = 113

type AmritKeertanSortMode = 'book' | 'source-ang' | 'raag' | 'writer'

const AMRIT_KEERTAN_SORT_OPTIONS: Array<{
  id: AmritKeertanSortMode
  label: string
  description: string
}> = [
  {
    id: 'book',
    label: 'Book order',
    description: 'Amrit Keertan index',
  },
  {
    id: 'source-ang',
    label: 'Source Ang',
    description: 'Where it appears',
  },
  {
    id: 'raag',
    label: 'Raag',
    description: 'Musical grouping',
  },
  {
    id: 'writer',
    label: 'Writer',
    description: 'Author metadata',
  },
]

function MetadataChip({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-sand/15 bg-parchment-low px-2.5 py-1 font-sans text-[11px] font-medium text-ink/70 transition-colors duration-300 hover:border-gold/30 hover:text-gold-dark dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/80 dark:hover:border-gold/30 dark:hover:text-gold-light"
      >
        {children}
      </button>
    )
  }

  return (
    <span className="rounded-full border border-sand/15 bg-parchment-low px-2.5 py-1 font-sans text-[11px] font-medium text-ink/70 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/80">
      {children}
    </span>
  )
}

function normalizeSearch(text: unknown): string {
  return typeof text === 'string' ? text.toLowerCase() : String(text ?? '').toLowerCase()
}

function getSourceAngLabel(shabad: AmritKeertanShabad): string | null {
  if (shabad.sourceAng == null) return null

  const sourceId = shabad.sourceMeta?.sourceId
  if (sourceId === 'G') return `SGGS Ang ${shabad.sourceAng}`
  if (sourceId === 'D') return `DG Ang ${shabad.sourceAng}`
  if (sourceId) return `${sourceId} Ang ${shabad.sourceAng}`

  return `Source Ang ${shabad.sourceAng}`
}

function getShabadSearchText(shabad: AmritKeertanShabad): string {
  return [
    shabad.gurmukhi,
    shabad.transliteration,
    shabad.translationEn,
    shabad.source,
    shabad.sourceMeta?.sourceId,
    shabad.sourceMeta?.english,
    shabad.sourceMeta?.gurmukhi,
    shabad.sourceMeta?.unicode,
    shabad.sourceAng,
    shabad.raag,
    shabad.raagMeta?.english,
    shabad.raagMeta?.gurmukhi,
    shabad.raagMeta?.unicode,
    shabad.raagMeta?.raagWithPage,
    shabad.writer,
    shabad.writerMeta?.english,
    shabad.writerMeta?.gurmukhi,
    shabad.writerMeta?.unicode,
    shabad.lineNo,
    shabad.amritPageNo,
    shabad.shabadId,
    shabad.indexId,
  ].map(normalizeSearch).join(' ')
}

function getShabadKey(shabad: AmritKeertanShabad): string {
  return `${shabad.headerId}-${shabad.indexId}-${shabad.shabadId}`
}

function getAmritPageRange(shabads: AmritKeertanShabad[]): string | null {
  const pages = shabads
    .map(shabad => shabad.amritPageNo)
    .filter((page): page is number => Number.isFinite(page) && page > 0)

  if (pages.length === 0) return null

  const first = Math.min(...pages)
  const last = Math.max(...pages)

  return first === last ? `AK Page ${first}` : `AK Pages ${first}-${last}`
}

function compareNullableNumbers(a: number | null | undefined, b: number | null | undefined): number {
  const left = Number.isFinite(a) ? Number(a) : null
  const right = Number.isFinite(b) ? Number(b) : null

  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  return left - right
}

function compareLabels(a: string | null | undefined, b: string | null | undefined): number {
  const left = normalizeSearch(a).trim()
  const right = normalizeSearch(b).trim()

  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1

  return left.localeCompare(right)
}

function getCompactMeta(shabad: AmritKeertanShabad): string[] {
  return [
    getSourceAngLabel(shabad),
    shabad.raag,
    shabad.writer,
  ].filter((item): item is string => Boolean(item))
}

export default function AmritKeertan() {
  const navigate = useNavigate()
  const { headerId } = useParams()
  const selectedHeaderId = headerId ? Number(headerId) : null
  const [headers, setHeaders] = useState<AmritKeertanHeader[]>([])
  const [loadingHeaders, setLoadingHeaders] = useState(true)
  const [headerIssue, setHeaderIssue] = useState(false)
  const [shabadsByHeader, setShabadsByHeader] = useState<Record<number, AmritKeertanShabad[]>>({})
  const fetchingHeaderIdsRef = useRef(new Set<number>())
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<AmritKeertanSortMode>('book')
  const [showEnglishPreview, setShowEnglishPreview] = useState(true)
  const [expandedDetailsKey, setExpandedDetailsKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchAmritKeertanIndex()
      .then(data => {
        if (!cancelled) setHeaders(data)
      })
      .catch(() => {
        if (!cancelled) {
          setHeaders([])
          setHeaderIssue(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHeaders(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedHeaderId || !Number.isFinite(selectedHeaderId)) return
    if (Object.prototype.hasOwnProperty.call(shabadsByHeader, selectedHeaderId)) return
    if (fetchingHeaderIdsRef.current.has(selectedHeaderId)) return

    fetchingHeaderIdsRef.current.add(selectedHeaderId)
    fetchAmritKeertanShabads(selectedHeaderId)
      .then(shabads => {
        setShabadsByHeader(current => ({ ...current, [selectedHeaderId]: shabads }))
      })
      .catch(() => {
        setShabadsByHeader(current => ({ ...current, [selectedHeaderId]: [] }))
      })
      .finally(() => {
        fetchingHeaderIdsRef.current.delete(selectedHeaderId)
      })
  }, [selectedHeaderId, shabadsByHeader])

  const normalizedQuery = query.trim().toLowerCase()
  const selectedHeader = selectedHeaderId
    ? headers.find(header => header.headerId === selectedHeaderId) ?? null
    : null
  const selectedHeaderIndex = selectedHeader
    ? headers.findIndex(header => header.headerId === selectedHeader.headerId)
    : -1
  const selectedHeaderLoaded = selectedHeaderId
    ? Object.prototype.hasOwnProperty.call(shabadsByHeader, selectedHeaderId)
    : false
  const selectedShabads = useMemo(() => (
    selectedHeaderId && selectedHeaderLoaded ? (shabadsByHeader[selectedHeaderId] ?? []) : []
  ), [selectedHeaderId, selectedHeaderLoaded, shabadsByHeader])
  const selectedAmritPageRange = useMemo(
    () => getAmritPageRange(selectedShabads),
    [selectedShabads]
  )
  const bookPositionByKey = useMemo(() => {
    const positions = new Map<string, number>()
    selectedShabads.forEach((shabad, index) => {
      positions.set(getShabadKey(shabad), index + 1)
    })
    return positions
  }, [selectedShabads])

  const filteredHeaders = useMemo(() => {
    if (!normalizedQuery) return headers

    return headers.filter(header => [
      header.headerId,
      header.gurmukhi,
      header.transliteration,
    ].map(normalizeSearch).join(' ').includes(normalizedQuery))
  }, [headers, normalizedQuery])

  const filteredShabads = useMemo(() => {
    if (!normalizedQuery) return selectedShabads
    return selectedShabads.filter(shabad => getShabadSearchText(shabad).includes(normalizedQuery))
  }, [normalizedQuery, selectedShabads])
  const visibleShabads = useMemo(() => {
    return filteredShabads
      .map(shabad => ({
        shabad,
        bookPosition: bookPositionByKey.get(getShabadKey(shabad)) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => {
        const bookOrder = a.bookPosition - b.bookPosition

        if (sortMode === 'source-ang') {
          return compareNullableNumbers(a.shabad.sourceAng, b.shabad.sourceAng) || bookOrder
        }

        if (sortMode === 'raag') {
          return compareLabels(a.shabad.raag, b.shabad.raag) || bookOrder
        }

        if (sortMode === 'writer') {
          return compareLabels(a.shabad.writer, b.shabad.writer) || bookOrder
        }

        return bookOrder
      })
      .map(item => item.shabad)
  }, [bookPositionByKey, filteredShabads, sortMode])

  const previousHeader = selectedHeaderIndex > 0 ? headers[selectedHeaderIndex - 1] : null
  const nextHeader = selectedHeaderIndex >= 0 && selectedHeaderIndex < headers.length - 1
    ? headers[selectedHeaderIndex + 1]
    : null

  const openShabad = (shabad: AmritKeertanShabad, bookPosition: number) => {
    const params = new URLSearchParams()
    params.set('shabadId', String(shabad.shabadId))
    params.set('from', 'amrit-keertan')

    if (selectedHeader) params.set('akHeaderId', String(selectedHeader.headerId))
    if (selectedHeaderIndex >= 0) params.set('akSection', String(selectedHeaderIndex + 1))
    if (Number.isFinite(bookPosition)) params.set('akItem', String(bookPosition))
    if (shabad.amritPageNo) params.set('akPage', String(shabad.amritPageNo))

    navigate(`/study?${params.toString()}`)
  }

  const searchPlaceholder = selectedHeader
    ? 'Search this section by shabad, source, raag, writer, English, or ang...'
    : 'Search Amrit Keertan sections...'

  return (
    <div
      className="page-shell max-w-3xl mx-auto min-h-screen bg-parchment text-ink transition-colors duration-300 animate-fade-in dark:bg-dark-bg dark:text-dark-text"
      data-testid="page-amrit-keertan"
      data-page="amrit-keertan"
    >
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 font-sans text-xs text-ink/60 dark:text-dark-text/75"
        aria-label="Breadcrumb"
        data-testid="amrit-keertan-breadcrumbs"
      >
        <Link to="/banis" className="interactive-focus rounded-full px-2 py-1 text-gold dark:text-gold-light">
          Read
        </Link>
        <span aria-hidden="true">/</span>
        {selectedHeader ? (
          <Link to="/banis/amrit-keertan" className="interactive-focus rounded-full px-2 py-1 text-gold dark:text-gold-light">
            Amrit Keertan
          </Link>
        ) : (
          <span className="rounded-full px-2 py-1 text-ink/70 dark:text-dark-text/80">Amrit Keertan</span>
        )}
        {selectedHeader ? (
          <>
            <span aria-hidden="true">/</span>
            <span className="rounded-full px-2 py-1 text-ink/70 dark:text-dark-text/80">Section</span>
          </>
        ) : null}
      </nav>

      <section className="hero-surface px-5 py-5" aria-labelledby="amrit-keertan-title">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Read Directory</p>
            <h1 id="amrit-keertan-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
              Amrit Keertan
            </h1>
            <p className="mt-3 max-w-[42rem] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/90">
              Browse Amrit Keertan by section, search within each set of shabads, and open the full shabad in the Study reader with source metadata intact.
            </p>
          </div>
          <span className="chip-pill shrink-0">
            {AMRIT_KEERTAN_SECTION_COUNT} sections
          </span>
        </div>

        <div className="relative mt-5">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 dark:text-dark-text/40" />
          <input
            id="amrit-keertan-search"
            name="amrit-keertan-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-sand/15 bg-parchment-card py-3 pl-9 pr-4 font-sans text-sm text-ink outline-none transition-colors duration-300 placeholder:text-ink/40 focus:border-saffron/40 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text dark:placeholder:text-dark-text/50"
            data-testid="amrit-keertan-search"
          />
        </div>
      </section>

      {selectedHeaderId ? (
        <section className="mt-5 space-y-4" data-testid="amrit-keertan-chapter">
          {selectedHeader ? (
            <>
              <div className="section-shell px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">Keertan Section</p>
                    <p lang="pa-Guru" className="mt-2 font-gurmukhi text-3xl leading-relaxed text-ink dark:text-dark-text">
                      {selectedHeader.gurmukhi}
                    </p>
                    {selectedHeader.transliteration ? (
                      <p className="mt-2 font-sans text-sm italic text-ink/60 dark:text-dark-text/70">
                        {selectedHeader.transliteration}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MetadataChip>Section {selectedHeaderIndex + 1} of {AMRIT_KEERTAN_SECTION_COUNT}</MetadataChip>
                    <MetadataChip>Book order</MetadataChip>
                    {selectedAmritPageRange ? <MetadataChip>{selectedAmritPageRange}</MetadataChip> : null}
                    <MetadataChip>{selectedShabads.length} shabads</MetadataChip>
                    {normalizedQuery ? <MetadataChip>{filteredShabads.length} matching</MetadataChip> : null}
                  </div>
                </div>
                {selectedHeaderLoaded ? (
                  <p className="mt-3 border-t border-sand/12 pt-3 font-sans text-xs leading-5 text-ink/62 dark:border-dark-text/12 dark:text-dark-text/72">
                    Ordered by the Amrit Keertan book index. SGGS Ang, source, raag, and writer show where each shabad comes from.
                  </p>
                ) : null}
              </div>

              {selectedHeaderLoaded ? (
                <div className="section-shell-quiet px-4 py-4" data-testid="amrit-keertan-order-controls">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">View order</p>
                      <p className="mt-1 font-sans text-xs leading-5 text-ink/60 dark:text-dark-text/66">
                        Keep book order as the default, or compare by source metadata.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEnglishPreview(value => !value)}
                      className="interactive-focus rounded-full border border-sand/15 bg-parchment-card px-3 py-2 font-sans text-xs font-semibold text-ink/70 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/80"
                    >
                      English {showEnglishPreview ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {AMRIT_KEERTAN_SORT_OPTIONS.map(option => {
                      const selected = sortMode === option.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSortMode(option.id)}
                          className={`interactive-focus rounded-lg border px-3 py-3 text-left transition-colors duration-300 ${
                            selected
                              ? 'border-gold/35 bg-gold/[0.10] text-gold-dark dark:border-gold/45 dark:bg-gold/15 dark:text-gold-light'
                              : 'border-sand/15 bg-parchment-card text-ink/68 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/74'
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="block font-sans text-xs font-semibold">{option.label}</span>
                          <span className="mt-1 block font-sans text-[11px] leading-4 opacity-75">{option.description}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2" data-testid="amrit-keertan-page-nav">
                {previousHeader ? (
                  <Link
                    to={`/banis/amrit-keertan/${previousHeader.headerId}`}
                    className="interactive-focus inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-sand/15 bg-parchment-card px-4 py-3 font-sans text-sm font-semibold text-ink/75 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/90"
                  >
                    <IconArrowLeft size={15} />
                    Previous section
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-sand/10 bg-parchment-low px-4 py-3 font-sans text-sm text-ink/40 dark:border-dark-text/10 dark:bg-white/[0.035] dark:text-dark-text/50">
                    Previous section
                  </span>
                )}

                {nextHeader ? (
                  <Link
                    to={`/banis/amrit-keertan/${nextHeader.headerId}`}
                    className="interactive-focus inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
                  >
                    Next section
                    <IconArrowRight size={15} />
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-sand/10 bg-parchment-low px-4 py-3 font-sans text-sm text-ink/40 dark:border-dark-text/10 dark:bg-white/[0.035] dark:text-dark-text/50">
                    Next section
                  </span>
                )}
              </div>

              {!selectedHeaderLoaded ? (
                <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
                  Loading shabads...
                </p>
              ) : visibleShabads.length === 0 ? (
                <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
                  No shabads match this search yet.
                </p>
              ) : (
                <div className="space-y-3" data-testid="amrit-keertan-shabad-list">
                  {visibleShabads.map((shabad, index) => {
                    const sourceAngLabel = getSourceAngLabel(shabad)
                    const shabadKey = getShabadKey(shabad)
                    const bookPosition = bookPositionByKey.get(shabadKey) ?? index + 1
                    const compactMeta = getCompactMeta(shabad)
                    const detailsOpen = expandedDetailsKey === shabadKey

                    return (
                      <article
                        key={`${shabadKey}-${index}`}
                        className="rounded-lg border border-sand/15 bg-parchment-card px-4 py-4 text-ink transition-colors duration-300 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
                        data-testid="amrit-keertan-shabad-row"
                      >
                        <button
                          type="button"
                          onClick={() => openShabad(shabad, bookPosition)}
                          className="interactive-focus w-full rounded-md text-left"
                          aria-label={`Open AK Page ${shabad.amritPageNo || 'unknown'} item ${bookPosition} in Study`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark dark:text-gold-light">
                                {shabad.amritPageNo ? `AK Page ${shabad.amritPageNo}` : 'AK Page unknown'} · Item {bookPosition} of {selectedShabads.length}
                              </p>
                              <p lang="pa-Guru" className="font-gurmukhi text-xl leading-relaxed text-ink dark:text-dark-text">
                                {shabad.gurmukhi}
                              </p>
                              {shabad.transliteration ? (
                                <p className="mt-2 font-sans text-sm italic text-ink/60 dark:text-dark-text/75">
                                  {shabad.transliteration}
                                </p>
                              ) : null}
                              {showEnglishPreview && shabad.translationEn ? (
                                <p className="mt-3 border-l border-gold/25 pl-3 font-sans text-sm leading-6 text-ink/70 dark:border-gold/30 dark:text-dark-text/90">
                                  {shabad.translationEn}
                                </p>
                              ) : null}
                              {compactMeta.length > 0 ? (
                                <p className="mt-3 font-sans text-xs leading-5 text-ink/56 dark:text-dark-text/62">
                                  {compactMeta.join(' · ')}
                                </p>
                              ) : null}
                            </div>
                            <span className="mt-1 shrink-0 rounded-full border border-gold/20 bg-gold/[0.08] px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark dark:border-gold/25 dark:bg-gold/10 dark:text-gold-light">
                              Open
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedDetailsKey(detailsOpen ? null : shabadKey)}
                          className="interactive-focus mt-3 rounded-full font-sans text-xs font-semibold text-gold-dark underline-offset-4 hover:underline dark:text-gold-light"
                          aria-expanded={detailsOpen}
                        >
                          {detailsOpen ? 'Hide source details' : 'Show source details'}
                        </button>

                        {detailsOpen ? (
                          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="amrit-keertan-source-details">
                            {shabad.amritPageNo ? <MetadataChip onClick={() => setQuery(String(shabad.amritPageNo))}>AK Page {shabad.amritPageNo}</MetadataChip> : null}
                            {sourceAngLabel ? <MetadataChip onClick={() => setQuery(String(shabad.sourceAng))}>{sourceAngLabel}</MetadataChip> : null}
                            {shabad.lineNo ? <MetadataChip onClick={() => setQuery(String(shabad.lineNo))}>Line {shabad.lineNo}</MetadataChip> : null}
                            {shabad.source ? <MetadataChip onClick={() => setQuery(shabad.source)}>{shabad.source}</MetadataChip> : null}
                            {shabad.raag ? <MetadataChip onClick={() => setQuery(shabad.raag)}>{shabad.raag}</MetadataChip> : null}
                            {shabad.raagMeta?.raagWithPage ? <MetadataChip onClick={() => setQuery(shabad.raagMeta?.raagWithPage ?? '')}>{shabad.raagMeta.raagWithPage}</MetadataChip> : null}
                            {shabad.writer ? <MetadataChip onClick={() => setQuery(shabad.writer)}>{shabad.writer}</MetadataChip> : null}
                            <MetadataChip onClick={() => setQuery(String(shabad.shabadId))}>Shabad {shabad.shabadId}</MetadataChip>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          ) : loadingHeaders ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              Loading section...
            </p>
          ) : (
            <div className="section-shell-quiet px-4 py-5">
              <p className="font-sans text-sm text-ink/60 dark:text-dark-text/70">
                This Amrit Keertan section was not found.
              </p>
              <Link
                to="/banis/amrit-keertan"
                className="interactive-focus interactive-pill-link mt-4 min-h-[44px] rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
              >
                Back to Amrit Keertan
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-5 space-y-3" data-testid="amrit-keertan-header-list">
          {loadingHeaders ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              Loading sections...
            </p>
          ) : headerIssue ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              Amrit Keertan could not load right now.
            </p>
          ) : filteredHeaders.length === 0 ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              No sections match this search yet.
            </p>
          ) : (
            filteredHeaders.map(header => {
              const sectionIndex = headers.findIndex(entry => entry.headerId === header.headerId)

              return (
                <Link
                  key={header.headerId}
                  to={`/banis/amrit-keertan/${header.headerId}`}
                  className="block rounded-lg border border-sand/15 bg-parchment-card px-4 py-4 text-ink transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        Section {sectionIndex + 1}
                      </p>
                      <p lang="pa-Guru" className="mt-2 font-gurmukhi text-xl leading-relaxed text-ink dark:text-dark-text">
                        {header.gurmukhi}
                      </p>
                      {header.transliteration ? (
                        <p className="mt-2 font-sans text-sm italic text-ink/60 dark:text-dark-text/75">
                          {header.transliteration}
                        </p>
                      ) : null}
                    </div>
                    <span className="icon-surface mt-1 h-8 w-8 shrink-0 text-saffron dark:text-gold-light">
                      <IconArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}
