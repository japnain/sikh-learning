import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchRehatChapter, fetchRehatChapters, fetchRehats } from '../api/banidb'
import { IconArrowLeft, IconArrowRight, IconSearch } from '../components/icons'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { RehatChapterContent, RehatChapterSummary, RehatSummary } from '../types'
import { sanitizeRehatHtml, stripHtmlTags } from '../utils/rehatHtml'

const SGPC_REHIT_MARYADA_SOURCE = 'https://sandiegogurdwara.org/SikhRehat_SGPC_English.pdf'
const EMPTY_REHAT_CHAPTERS: RehatChapterSummary[] = []

function MetadataChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-sand/15 bg-parchment-low px-2.5 py-1 font-sans text-[11px] font-medium text-ink/70 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/80">
      {children}
    </span>
  )
}

function normalizeSearch(text: unknown): string {
  return typeof text === 'string' ? text.toLowerCase() : String(text ?? '').toLowerCase()
}

function parseNumericParam(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildRehatSearchText(rehat: RehatSummary) {
  return [rehat.rehatName, rehat.alphabet, getRehatEditorial(rehat).searchText].map(normalizeSearch).join(' ')
}

function getChapterSearchText(chapter: RehatChapterSummary) {
  return [chapter.chapterName, chapter.alphabet, chapter.chapterId].map(normalizeSearch).join(' ')
}

function getRehatEditorial(rehat: RehatSummary | null) {
  const name = rehat?.rehatName ?? ''

  if (/sikh\s+reh[ai]t\s+maryada/i.test(name)) {
    return {
      summary: 'The SGPC-published Sikh Rehit Maryada is presented here as a formal code of Sikh living, with its draft approvals and 1945 revisions kept source-backed.',
      context: 'The SGPC English source records draft approval by the All-India Sikh Mission Board on 1 August 1936 and by the SGPC on 12 October 1936. It also records Religious Advisory Committee discussion on 7 January 1945 and SGPC approval of additions and deletions on 3 February 1945.',
      chips: ['SGPC source', '1936 draft approvals', '1945 additions and deletions'],
      sourceLabel: 'SGPC English PDF',
      sourceHref: SGPC_REHIT_MARYADA_SOURCE,
      searchText: 'SGPC 1936 1945 Sikh Rehit Maryada Sikh Rehat Maryada code of Sikh living',
    }
  }

  return {
    summary: 'Read this Rehat source chapter by chapter, with search kept close to the list and the text.',
    context: 'Editorial metadata is shown only where the app has a source-backed context. Chapter text is loaded from the Rehat source and sanitized before rendering.',
    chips: ['Rehat source', 'Chapter reader'],
    sourceLabel: null,
    sourceHref: null,
    searchText: 'rehat rehit maryada conduct discipline',
  }
}

function Breadcrumbs({
  rehat,
  chapter,
}: {
  rehat: RehatSummary | null
  chapter: RehatChapterContent | RehatChapterSummary | null
}) {
  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-2 font-sans text-xs text-ink/60 dark:text-dark-text/75"
      aria-label="Breadcrumb"
      data-testid="rehat-breadcrumbs"
    >
      <Link to="/banis" className="interactive-focus rounded-full px-2 py-1 text-gold dark:text-gold-light">
        Read
      </Link>
      <span aria-hidden="true">/</span>
      {rehat ? (
        <Link to="/banis/rehat" className="interactive-focus rounded-full px-2 py-1 text-gold dark:text-gold-light">
          Rehat
        </Link>
      ) : (
        <span className="rounded-full px-2 py-1 text-ink/70 dark:text-dark-text/80">Rehat</span>
      )}
      {rehat ? (
        <>
          <span aria-hidden="true">/</span>
          {chapter ? (
            <Link
              to={`/banis/rehat/${rehat.rehatId}`}
              className="interactive-focus rounded-full px-2 py-1 text-gold dark:text-gold-light"
            >
              {rehat.rehatName}
            </Link>
          ) : (
            <span className="rounded-full px-2 py-1 text-ink/70 dark:text-dark-text/80">{rehat.rehatName}</span>
          )}
        </>
      ) : null}
      {chapter ? (
        <>
          <span aria-hidden="true">/</span>
          <span className="rounded-full px-2 py-1 text-ink/70 dark:text-dark-text/80">{chapter.chapterName}</span>
        </>
      ) : null}
    </nav>
  )
}

function SearchField({
  id,
  value,
  onChange,
  placeholder,
  testId,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  testId: string
}) {
  return (
    <div className="relative mt-4">
      <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 dark:text-dark-text/40" />
      <input
        id={id}
        name={id}
        type="search"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-sand/15 bg-parchment-card py-3 pl-9 pr-4 font-sans text-sm text-ink outline-none transition-colors duration-300 placeholder:text-ink/40 focus:border-saffron/40 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text dark:placeholder:text-dark-text/50"
        data-testid={testId}
      />
    </div>
  )
}

export default function Rehat() {
  const { rehatId: rehatIdParam, chapterId: chapterIdParam } = useParams()
  const selectedRehatId = parseNumericParam(rehatIdParam)
  const selectedChapterId = parseNumericParam(chapterIdParam)
  const rehats = useScriptureCacheStore(state => state.rehatList)
  const rehatChapterListCache = useScriptureCacheStore(state => state.rehatChapterListCache)
  const rehatChapterCache = useScriptureCacheStore(state => state.rehatChapterCache)
  const setCachedRehats = useScriptureCacheStore(state => state.setRehats)
  const setCachedRehatChapters = useScriptureCacheStore(state => state.setRehatChapters)
  const setCachedRehatChapter = useScriptureCacheStore(state => state.setRehatChapter)
  const [rehatIssue, setRehatIssue] = useState(false)
  const [chapterListIssueRehatId, setChapterListIssueRehatId] = useState<number | null>(null)
  const [chapterIssueKey, setChapterIssueKey] = useState<string | null>(null)
  const [rehatQuery, setRehatQuery] = useState('')
  const [chapterQuery, setChapterQuery] = useState('')
  const [chapterTextSearch, setChapterTextSearch] = useState({ key: '', value: '' })
  const selectedChapterKey = selectedRehatId && selectedChapterId ? `${selectedRehatId}-${selectedChapterId}` : null
  const cachedSelectedChapters = selectedRehatId ? rehatChapterListCache[String(selectedRehatId)] : undefined
  const selectedChapters = useMemo(
    () => cachedSelectedChapters ?? EMPTY_REHAT_CHAPTERS,
    [cachedSelectedChapters]
  )
  const selectedChapter = selectedChapterKey ? rehatChapterCache[selectedChapterKey] ?? null : null
  const chapterListIssue = selectedRehatId !== null && chapterListIssueRehatId === selectedRehatId
  const chapterIssue = selectedChapterKey !== null && chapterIssueKey === selectedChapterKey
  const loadingRehats = rehats.length === 0 && !rehatIssue
  const loadingChapters = selectedRehatId !== null && !cachedSelectedChapters && !chapterListIssue
  const loadingChapter = selectedChapterKey !== null && !selectedChapter && !chapterIssue
  const chapterTextQuery = selectedChapterKey && chapterTextSearch.key === selectedChapterKey
    ? chapterTextSearch.value
    : ''
  const updateChapterTextQuery = (value: string) => {
    if (!selectedChapterKey) return
    setChapterTextSearch({ key: selectedChapterKey, value })
  }

  useEffect(() => {
    if (rehats.length > 0) return

    let cancelled = false
    fetchRehats()
      .then(data => {
        if (cancelled) return
        setCachedRehats(data)
        setRehatIssue(data.length === 0)
      })
      .catch(() => {
        if (cancelled) return
        setRehatIssue(true)
      })

    return () => {
      cancelled = true
    }
  }, [rehats.length, setCachedRehats])

  useEffect(() => {
    if (!selectedRehatId || cachedSelectedChapters) return

    let cancelled = false
    fetchRehatChapters(selectedRehatId)
      .then(chapters => {
        if (cancelled) return
        setCachedRehatChapters(selectedRehatId, chapters)
        setChapterListIssueRehatId(current => current === selectedRehatId ? null : current)
      })
      .catch(() => {
        if (cancelled) return
        setChapterListIssueRehatId(selectedRehatId)
      })

    return () => {
      cancelled = true
    }
  }, [cachedSelectedChapters, selectedRehatId, setCachedRehatChapters])

  useEffect(() => {
    if (!selectedRehatId || !selectedChapterId || !selectedChapterKey || selectedChapter) return

    let cancelled = false
    fetchRehatChapter(selectedRehatId, selectedChapterId)
      .then(chapter => {
        if (cancelled) return
        if (chapter) {
          setCachedRehatChapter(selectedRehatId, chapter)
          setChapterIssueKey(current => current === selectedChapterKey ? null : current)
        } else {
          setChapterIssueKey(selectedChapterKey)
        }
      })
      .catch(() => {
        if (cancelled) return
        setChapterIssueKey(selectedChapterKey)
      })

    return () => {
      cancelled = true
    }
  }, [selectedChapter, selectedChapterId, selectedChapterKey, selectedRehatId, setCachedRehatChapter])

  const selectedRehat = selectedRehatId
    ? rehats.find(rehat => rehat.rehatId === selectedRehatId) ?? null
    : null
  const selectedChapterSummary = selectedChapterId
    ? selectedChapters.find(chapter => chapter.chapterId === selectedChapterId) ?? null
    : null
  const breadcrumbChapter = selectedChapter ?? selectedChapterSummary
  const editorial = getRehatEditorial(selectedRehat)
  const normalizedRehatQuery = rehatQuery.trim().toLowerCase()
  const normalizedChapterQuery = chapterQuery.trim().toLowerCase()
  const normalizedChapterTextQuery = chapterTextQuery.trim().toLowerCase()
  const filteredRehats = useMemo(() => {
    if (!normalizedRehatQuery) return rehats
    return rehats.filter(rehat => buildRehatSearchText(rehat).includes(normalizedRehatQuery))
  }, [normalizedRehatQuery, rehats])
  const filteredChapters = useMemo(() => {
    if (!normalizedChapterQuery) return selectedChapters
    return selectedChapters.filter(chapter => getChapterSearchText(chapter).includes(normalizedChapterQuery))
  }, [normalizedChapterQuery, selectedChapters])
  const selectedChapterText = useMemo(
    () => stripHtmlTags(selectedChapter?.chapterContent ?? ''),
    [selectedChapter?.chapterContent]
  )
  const chapterTextHasMatch = !normalizedChapterTextQuery
    || selectedChapterText.toLowerCase().includes(normalizedChapterTextQuery)
  const wordCount = selectedChapterText.split(/\s+/).filter(Boolean).length
  const invalidRoute = Boolean(rehatIdParam && !selectedRehatId) || Boolean(chapterIdParam && !selectedChapterId)

  return (
    <div
      className="page-shell max-w-3xl mx-auto min-h-screen bg-parchment text-ink transition-colors duration-300 animate-fade-in dark:bg-dark-bg dark:text-dark-text"
      data-testid="page-rehat"
      data-page="rehat"
      data-ai-surface="rehat"
      data-ai-state={invalidRoute || rehatIssue || chapterListIssue || chapterIssue ? 'degraded' : loadingRehats || loadingChapters || loadingChapter ? 'loading' : 'ready'}
      data-ai-error={rehatIssue ? 'rehat-list' : chapterListIssue ? 'rehat-chapters' : chapterIssue || invalidRoute ? 'rehat-chapter' : undefined}
    >
      <Breadcrumbs rehat={selectedRehat} chapter={breadcrumbChapter} />

      <section className="hero-surface px-5 py-5" aria-labelledby="rehat-title">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Read Directory</p>
            <h1 id="rehat-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">
              {selectedChapter?.chapterName ?? selectedRehat?.rehatName ?? 'Rehat'}
            </h1>
            <p className="mt-3 max-w-[42rem] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/90">
              {selectedChapter ? selectedRehat?.rehatName : editorial.summary}
            </p>
          </div>
          <span className="chip-pill shrink-0">
            {selectedChapter ? 'Chapter' : selectedRehat ? `${selectedChapters.length} chapters` : `${rehats.length} rehats`}
          </span>
        </div>

        {selectedRehat && !selectedChapter ? (
          <div className="mt-4 rounded-lg border border-sand/15 bg-parchment-card/58 px-4 py-4 dark:border-dark-text/12 dark:bg-white/[0.045]">
            <p className="font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/78">
              {editorial.context}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {editorial.chips.map(chip => <MetadataChip key={chip}>{chip}</MetadataChip>)}
              {editorial.sourceHref ? (
                <a
                  href={editorial.sourceHref}
                  className="interactive-focus rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 font-sans text-[11px] font-semibold text-gold-dark dark:border-gold/25 dark:bg-gold/10 dark:text-gold-light"
                  target="_blank"
                  rel="noreferrer"
                >
                  {editorial.sourceLabel}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {!selectedRehatId ? (
          <SearchField
            id="rehat-search"
            value={rehatQuery}
            onChange={setRehatQuery}
            placeholder="Search rehats..."
            testId="rehat-search"
          />
        ) : selectedChapterId ? (
          <SearchField
            id="rehat-chapter-text-search"
            value={chapterTextQuery}
            onChange={updateChapterTextQuery}
            placeholder="Search inside this chapter..."
            testId="rehat-chapter-text-search"
          />
        ) : (
          <SearchField
            id="rehat-chapter-search"
            value={chapterQuery}
            onChange={setChapterQuery}
            placeholder="Search chapters..."
            testId="rehat-chapter-search"
          />
        )}
      </section>

      {invalidRoute ? (
        <section className="section-shell-quiet mt-5 px-4 py-5" data-testid="rehat-error-state">
          <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
            This Rehat route is not valid.
          </p>
          <Link
            to="/banis/rehat"
            className="interactive-focus interactive-pill-link mt-4 min-h-[44px] gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
          >
            <IconArrowLeft size={14} />
            Back to Rehat
          </Link>
        </section>
      ) : selectedRehatId && selectedChapterId ? (
        <section className="mt-5 space-y-4" data-testid="rehat-chapter-page">
          {loadingChapter ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              Loading chapter...
            </p>
          ) : chapterIssue || !selectedChapter ? (
            <section className="section-shell-quiet px-4 py-5" data-testid="rehat-error-state">
              <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
                This Rehat chapter could not be loaded right now.
              </p>
              <Link
                to={selectedRehatId ? `/banis/rehat/${selectedRehatId}` : '/banis/rehat'}
                className="interactive-focus interactive-pill-link mt-4 min-h-[44px] gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
              >
                <IconArrowLeft size={14} />
                Back to chapters
              </Link>
            </section>
          ) : (
            <>
              <section className="section-shell px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">Rehat Chapter</p>
                    <h2 className="mt-2 font-display text-3xl leading-none text-ink dark:text-dark-text">
                      {selectedChapter.chapterName}
                    </h2>
                    <p className="mt-2 font-sans text-sm text-ink/58 dark:text-dark-text/68">
                      {selectedRehat?.rehatName ?? `Rehat ${selectedRehatId}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <MetadataChip>{selectedChapter.alphabet}</MetadataChip>
                    <MetadataChip>{wordCount} words</MetadataChip>
                  </div>
                </div>
              </section>

              {!chapterTextHasMatch ? (
                <section className="section-shell-quiet px-4 py-5">
                  <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">
                    No matching text found in this chapter.
                  </p>
                </section>
              ) : (
                <article className="section-shell p-5" data-testid="rehat-chapter-content">
                  <div
                    className="font-sans text-sm leading-7 text-ink dark:text-dark-text [&_p]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeRehatHtml(selectedChapter.chapterContent) }}
                  />
                </article>
              )}
            </>
          )}
        </section>
      ) : selectedRehatId ? (
        <section className="mt-5 space-y-3" data-testid="rehat-chapter-list-page">
          <Link
            to="/banis/rehat"
            className="interactive-focus inline-flex min-h-[40px] items-center gap-2 rounded-full bg-parchment-low px-3 py-2 font-sans text-xs font-medium text-ink/65 transition-colors duration-300 dark:bg-dark-surface dark:text-dark-text/65"
          >
            <IconArrowLeft size={14} />
            Back to rehats
          </Link>

          {loadingChapters ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              Loading chapters...
            </p>
          ) : chapterListIssue ? (
            <section className="section-shell-quiet px-4 py-5" data-testid="rehat-error-state">
              <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
                Rehat chapters could not load right now.
              </p>
            </section>
          ) : filteredChapters.length === 0 ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              No chapters match this search yet.
            </p>
          ) : (
            filteredChapters.map(chapter => (
              <Link
                key={chapter.chapterId}
                to={`/banis/rehat/${selectedRehatId}/chapters/${chapter.chapterId}`}
                className="block rounded-lg border border-sand/15 bg-parchment-card px-4 py-4 text-ink transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-sans text-base font-semibold text-ink dark:text-dark-text">
                      {chapter.chapterName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <MetadataChip>{chapter.alphabet}</MetadataChip>
                    </div>
                  </div>
                  <span className="icon-surface mt-1 h-8 w-8 shrink-0 text-saffron dark:text-gold-light">
                    <IconArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>
      ) : (
        <section className="mt-5 space-y-3" data-testid="rehat-list-page">
          {loadingRehats ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              Loading rehats...
            </p>
          ) : rehatIssue ? (
            <section className="section-shell-quiet px-4 py-5" data-testid="rehat-error-state">
              <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
                Rehat could not load right now.
              </p>
            </section>
          ) : filteredRehats.length === 0 ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              No rehats match this search yet.
            </p>
          ) : (
            filteredRehats.map(rehat => {
              const rehatEditorial = getRehatEditorial(rehat)

              return (
                <Link
                  key={rehat.rehatId}
                  to={`/banis/rehat/${rehat.rehatId}`}
                  className="block rounded-lg border border-sand/15 bg-parchment-card px-4 py-4 text-ink transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-sans text-base font-semibold text-ink dark:text-dark-text">
                        {rehat.rehatName}
                      </p>
                      <p className="mt-2 font-sans text-sm leading-6 text-ink/60 dark:text-dark-text/70">
                        {rehatEditorial.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <MetadataChip>{rehat.alphabet}</MetadataChip>
                        {rehatEditorial.chips.map(chip => <MetadataChip key={chip}>{chip}</MetadataChip>)}
                      </div>
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
