import '../styles/catalog.css'
import '../styles/rehat-reader.css'
import RehatReaderHeader from '../components/RehatReaderHeader'
import { useEpubReaderStore } from '../store/epubReader'
import { useCompanionCopy } from '../utils/companionCopy'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchRehatChapter, fetchRehatChapters, fetchRehats } from '../api/banidb'
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconChevronUp, IconClose, IconSearch } from '../components/icons'
import { useScriptureCacheStore } from '../store/scriptureCache'
import type { RehatChapterContent, RehatChapterSummary, RehatSummary } from '../types'
import { sanitizeRehatHtml, stripHtmlTags } from '../utils/rehatHtml'
import { highlightRehatHtml } from '../utils/rehatFind'
import { scrollElementIntoAppView } from '../utils/appScroll'

const SGPC_REHIT_MARYADA_SOURCE = 'https://sandiegogurdwara.org/SikhRehat_SGPC_English.pdf'
const EMPTY_REHAT_CHAPTERS: RehatChapterSummary[] = []

function MetadataChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface-muted))] px-2.5 py-1 font-sans text-[13px] font-medium text-text/70 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/80">
      {children}
    </span>
  )
}

function normalizeSearch(text: unknown): string {
  return typeof text === 'string' ? text.toLowerCase() : String(text ?? '').toLowerCase()
}

function parseNumericParam(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
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
    context: 'Chapter text is supplied by BaniDB. Historical notes are included where references are available.',
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
  const { t } = useCompanionCopy()
  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-2 font-sans text-xs text-text/68 dark:text-dark-text/75"
      aria-label={t("Breadcrumb")}
      data-testid="rehat-breadcrumbs"
    >
      <Link to="/banis" className="interactive-focus rounded-full px-2 py-1 text-accent dark:text-accent">
        {t("Read")}</Link>
      <span aria-hidden="true">/</span>
      {rehat ? (
        <Link to="/banis/rehat" className="interactive-focus rounded-full px-2 py-1 text-accent dark:text-accent">
          {t("Rehat")}</Link>
      ) : (
        <span className="rounded-full px-2 py-1 text-text/70 dark:text-dark-text/80">{t("Rehat")}</span>
      )}
      {rehat ? (
        <>
          <span aria-hidden="true">/</span>
          {chapter ? (
            <Link
              to={`/banis/rehat/${rehat.rehatId}`}
              className="interactive-focus rounded-full px-2 py-1 text-accent dark:text-accent"
            >
              {rehat.rehatName}
            </Link>
          ) : (
            <span className="rounded-full px-2 py-1 text-text/70 dark:text-dark-text/80">{rehat.rehatName}</span>
          )}
        </>
      ) : null}
      {chapter ? (
        <>
          <span aria-hidden="true">/</span>
          <span className="rounded-full px-2 py-1 text-text/70 dark:text-dark-text/80">{chapter.chapterName}</span>
        </>
      ) : null}
    </nav>
  )
}

function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
  testId,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  testId: string
}) {
  return (
    <div className="relative mt-4">
      <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text/30 dark:text-dark-text/64" />
      <input
        id={id}
        name={id}
        type="search"
        maxLength={240}
        aria-label={label}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface))] py-3 pl-9 pr-4 font-sans text-sm text-text outline-none transition-colors duration-300 placeholder:text-text/68 focus:border-saffron/40 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text dark:placeholder:text-dark-text/50"
        data-testid={testId}
      />
    </div>
  )
}

function RehatSectionNavCard({
  chapter,
  direction,
  rehatId,
}: {
  chapter: RehatChapterSummary | null
  direction: 'previous' | 'next'
  rehatId: number
}) {
  const { t } = useCompanionCopy()
  const isPrevious = direction === 'previous'
  const label = t(isPrevious ? 'Previous section' : 'Next section')
  const emptyLabel = t(isPrevious ? 'Start of source' : 'End of source')
  const icon = isPrevious ? <IconArrowLeft size={15} /> : <IconArrowRight size={15} />

  if (!chapter) {
    return (
      <div
        className="flex min-h-[72px] items-center gap-3 rounded-lg border border-dashed border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface-muted))]/70 px-4 py-3 text-text/68 dark:border-dark-text/15 dark:bg-white/[0.035] dark:text-dark-text/64"
        aria-disabled="true"
      >
        <span className="icon-surface h-8 w-8 shrink-0 opacity-55">{icon}</span>
        <div className="min-w-0">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.04em]">{label}</p>
          <p className="mt-1 font-sans text-sm font-medium">{emptyLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={`/banis/rehat/${rehatId}/chapters/${chapter.chapterId}`}
      aria-label={`${label}: ${chapter.chapterName}`}
      className="interactive-focus flex min-h-[72px] items-center gap-3 rounded-lg border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface))] px-4 py-3 text-left text-text transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
    >
      {isPrevious ? <span className="icon-surface h-8 w-8 shrink-0 text-saffron dark:text-accent">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.04em] text-text/68 dark:text-dark-text/64">
          {label}
        </p>
        <p className="mt-1 truncate font-sans text-sm font-semibold text-text dark:text-dark-text">
          {chapter.chapterName}
        </p>
      </div>
      {!isPrevious ? <span className="icon-surface h-8 w-8 shrink-0 text-saffron dark:text-accent">{icon}</span> : null}
    </Link>
  )
}

function RehatSectionNavigation({
  rehatId,
  previousChapter,
  nextChapter,
}: {
  rehatId: number
  previousChapter: RehatChapterSummary | null
  nextChapter: RehatChapterSummary | null
}) {
  const { t } = useCompanionCopy()
  return (
    <nav
      className="section-shell space-y-4 px-4 py-4"
      aria-label={t("Rehat section navigation")}
      data-testid="rehat-section-navigation"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t("Continue reading")}</p>
          <p className="mt-1 font-sans text-sm text-text/68 dark:text-dark-text/68">
            {t("Move section by section without returning to the chapter list.")}</p>
        </div>
        <Link
          to={`/banis/rehat/${rehatId}`}
          className="interactive-focus shrink-0 rounded-full border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface-muted))] px-3 py-2 font-sans text-xs font-semibold text-text/65 dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text/75"
        >
          {t("Back to all sections")}</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RehatSectionNavCard rehatId={rehatId} chapter={previousChapter} direction="previous" />
        <RehatSectionNavCard rehatId={rehatId} chapter={nextChapter} direction="next" />
      </div>
    </nav>
  )
}

export default function Rehat() {
  const { t, lang } = useCompanionCopy()
  const { rehatId: rehatIdParam, chapterId: chapterIdParam } = useParams()
  const isChapterRoute = Boolean(chapterIdParam)
  const fontScale = useEpubReaderStore(state => state.fontScale)
  const lineHeight = useEpubReaderStore(state => state.lineHeight)
  const measure = useEpubReaderStore(state => state.measure)
  const selectedRehatId = parseNumericParam(rehatIdParam)
  const selectedChapterId = parseNumericParam(chapterIdParam)
  const rehats = useScriptureCacheStore(state => state.rehatList)
  const rehatChapterListCache = useScriptureCacheStore(state => state.rehatChapterListCache)
  const rehatChapterCache = useScriptureCacheStore(state => state.rehatChapterCache)
  const setCachedRehats = useScriptureCacheStore(state => state.setRehats)
  const setCachedRehatChapters = useScriptureCacheStore(state => state.setRehatChapters)
  const setCachedRehatChapter = useScriptureCacheStore(state => state.setRehatChapter)
  const [rehatIssue, setRehatIssue] = useState(false)
  const [rehatLoadAttempt, setRehatLoadAttempt] = useState(0)
  const [chapterListIssueRehatId, setChapterListIssueRehatId] = useState<number | null>(null)
  const [chapterListLoadAttempts, setChapterListLoadAttempts] = useState<Record<number, number>>({})
  const [chapterIssueKey, setChapterIssueKey] = useState<string | null>(null)
  const [chapterLoadAttempts, setChapterLoadAttempts] = useState<Record<string, number>>({})
  const [rehatQuery, setRehatQuery] = useState('')
  const [chapterQuery, setChapterQuery] = useState('')
  const [chapterTextSearch, setChapterTextSearch] = useState({ key: '', value: '' })
  const [activeMatch, setActiveMatch] = useState(0)
  const chapterContentRef = useRef<HTMLElement>(null)
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
    setActiveMatch(0)
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
  }, [rehatLoadAttempt, rehats.length, setCachedRehats])

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
  }, [cachedSelectedChapters, chapterListLoadAttempts, selectedRehatId, setCachedRehatChapters])

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
  }, [chapterLoadAttempts, selectedChapter, selectedChapterId, selectedChapterKey, selectedRehatId, setCachedRehatChapter])

  const retryRehats = () => {
    setRehatIssue(false)
    setRehatLoadAttempt(attempt => attempt + 1)
  }

  const retryChapterList = () => {
    if (!selectedRehatId) return
    setChapterListIssueRehatId(current => current === selectedRehatId ? null : current)
    setChapterListLoadAttempts(current => ({
      ...current,
      [selectedRehatId]: (current[selectedRehatId] ?? 0) + 1,
    }))
  }

  const retryChapter = () => {
    if (!selectedChapterKey) return
    setChapterIssueKey(current => current === selectedChapterKey ? null : current)
    setChapterLoadAttempts(current => ({
      ...current,
      [selectedChapterKey]: (current[selectedChapterKey] ?? 0) + 1,
    }))
  }

  const selectedRehat = selectedRehatId
    ? rehats.find(rehat => rehat.rehatId === selectedRehatId) ?? null
    : null
  const selectedChapterSummary = selectedChapterId
    ? selectedChapters.find(chapter => chapter.chapterId === selectedChapterId) ?? null
    : null
  const selectedChapterIndex = selectedChapterId
    ? selectedChapters.findIndex(chapter => chapter.chapterId === selectedChapterId)
    : -1
  const previousChapter = selectedChapterIndex > 0 ? selectedChapters[selectedChapterIndex - 1] : null
  const nextChapter = selectedChapterIndex >= 0 && selectedChapterIndex < selectedChapters.length - 1
    ? selectedChapters[selectedChapterIndex + 1]
    : null
  const breadcrumbChapter = selectedChapter ?? selectedChapterSummary
  const editorial = getRehatEditorial(selectedRehat)
  const normalizedRehatQuery = rehatQuery.trim().toLowerCase()
  const normalizedChapterQuery = chapterQuery.trim().toLowerCase()
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
  const chapterFind = useMemo(() => highlightRehatHtml(sanitizeRehatHtml(selectedChapter?.chapterContent ?? ''), chapterTextQuery, activeMatch), [selectedChapter?.chapterContent, chapterTextQuery, activeMatch])
  useEffect(() => {
    if (!chapterTextQuery.trim() || !chapterFind.count) return
    const target = chapterContentRef.current?.querySelector<HTMLElement>(`[data-rehat-match="${activeMatch}"]`)
    if (target) scrollElementIntoAppView(target, { behavior: 'auto', block: 'center' })
  }, [activeMatch, chapterTextQuery, chapterFind.count])
  const wordCount = selectedChapterText.split(/\s+/).filter(Boolean).length
  const invalidRoute = Boolean(rehatIdParam && !selectedRehatId) || Boolean(chapterIdParam && !selectedChapterId)

  return (
    <div
      lang={lang}
      className={isChapterRoute ? 'rehat-reader-shell' : 'page-shell max-w-3xl mx-auto min-h-screen scripture-directory transition-colors duration-300 animate-fade-in'}
      style={isChapterRoute ? {
        '--rehat-font-scale': fontScale,
        '--rehat-line-height': { compact: 1.6, comfortable: 1.8, spacious: 2.05 }[lineHeight],
        '--rehat-measure': { narrow: '40rem', standard: '48rem', wide: '58rem' }[measure],
      } as CSSProperties : undefined}
      data-testid="page-rehat"
      data-page="rehat"
      data-ai-surface="rehat"
      data-ai-state={invalidRoute || rehatIssue || chapterListIssue || chapterIssue ? 'degraded' : loadingRehats || loadingChapters || loadingChapter ? 'loading' : 'ready'}
      data-ai-error={rehatIssue ? 'rehat-list' : chapterListIssue ? 'rehat-chapters' : chapterIssue || invalidRoute ? 'rehat-chapter' : undefined}
    >
      {isChapterRoute ? <RehatReaderHeader
        title={breadcrumbChapter?.chapterName ?? t('Chapter')}
        subtitle={selectedRehat?.rehatName ?? t('Rehat')}
        rehatId={selectedRehatId}
        chapterId={selectedChapterId}
        chapters={selectedChapters}
        loading={loadingChapters}
        error={chapterListIssue}
        onRetry={retryChapterList}
        search={<>
          <SearchField id="rehat-chapter-text-search" label={t('Search inside this Rehat chapter')} value={chapterTextQuery} onChange={updateChapterTextQuery} placeholder={t('Search inside this chapter...')} testId="rehat-chapter-text-search" />
          {chapterTextQuery.trim() ? <div className="rehat-find-controls" data-testid="rehat-find-controls">
                <p role="status" aria-live="polite" aria-atomic="true">
                  <span aria-hidden="true">{chapterFind.count ? activeMatch + 1 : 0} / {chapterFind.count}</span>
                  <span className="sr-only">{chapterFind.count ? t('{current} of {total} matches', { current: activeMatch + 1, total: chapterFind.count }) : t('No matching text found in this chapter.')}</span>
                </p>
                <button type="button" className="interactive-focus" aria-label={t('Previous match')} title={t('Previous match')} disabled={!chapterFind.count} onClick={() => setActiveMatch(index => (index - 1 + chapterFind.count) % chapterFind.count)}><span aria-hidden="true"><IconChevronUp size={20} /></span></button>
                <button type="button" className="interactive-focus" aria-label={t('Next match')} title={t('Next match')} disabled={!chapterFind.count} onClick={() => setActiveMatch(index => (index + 1) % chapterFind.count)}><span aria-hidden="true"><IconChevronDown size={20} /></span></button>
                <button type="button" className="interactive-focus" aria-label={t('Clear find')} title={t('Clear find')} onClick={() => updateChapterTextQuery('')}><span aria-hidden="true"><IconClose size={20} /></span></button>
              </div> : null}
        </>}
      /> : <>
      <Breadcrumbs rehat={selectedRehat} chapter={breadcrumbChapter} />

      <section className="hero-surface px-5 py-5" aria-labelledby="rehat-title">
        <div className="directory-title-row flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0">
            <p className="eyebrow">{t("Read Directory")}</p>
            <h1 id="rehat-title" className="mt-2 font-display text-4xl leading-none text-text dark:text-dark-text">
              {selectedChapter?.chapterName ?? selectedRehat?.rehatName ?? t('Rehat')}
            </h1>
            <p className="mt-3 max-w-[42rem] font-sans text-sm leading-6 text-text/70 dark:text-dark-text/90">
              {selectedChapter ? selectedRehat?.rehatName : t(editorial.summary)}
            </p>
          </div>
          <span className="chip-pill shrink-0">
            {selectedChapter ? t('Chapter') : selectedRehat ? `${selectedChapters.length} ${t('chapters')}` : `${rehats.length} ${t('rehats')}`}
          </span>
        </div>

        {selectedRehat && !selectedChapter ? (
          <div className="mt-4 rounded-lg border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface))]/58 px-4 py-4 dark:border-dark-text/12 dark:bg-white/[0.045]">
            <p className="font-sans text-sm leading-6 text-text/68 dark:text-dark-text/78">
              {t(editorial.context)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {editorial.chips.map(chip => <MetadataChip key={chip}>{t(chip)}</MetadataChip>)}
              {editorial.sourceHref ? (
                <a
                  href={editorial.sourceHref}
                  className="interactive-focus rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 font-sans text-[13px] font-semibold text-accent dark:border-gold/25 dark:bg-gold/10 dark:text-accent"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(editorial.sourceLabel ?? '')}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {!selectedRehatId ? (
          <SearchField
            id="rehat-search"
            label={t("Search rehats")}
            value={rehatQuery}
            onChange={setRehatQuery}
            placeholder={t("Search rehats...")}
            testId="rehat-search"
          />
        ) : (
          <SearchField
            id="rehat-chapter-search"
            label={t("Search Rehat chapters")}
            value={chapterQuery}
            onChange={setChapterQuery}
            placeholder={t("Search chapters...")}
            testId="rehat-chapter-search"
          />
        )}
      </section>

      </>}

      {invalidRoute ? (
        <section className="section-shell-quiet mt-5 px-4 py-5" data-testid="rehat-error-state">
          <p className="font-sans text-sm leading-6 text-text/65 dark:text-dark-text/70">
            {t("This Rehat route is not valid.")}</p>
          <Link
            to="/banis/rehat"
            className="interactive-focus interactive-pill-link mt-4 min-h-[44px] gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
          >
            <IconArrowLeft size={14} />
            {t("Back to Rehat")}</Link>
        </section>
      ) : selectedRehatId && selectedChapterId ? (
        <section className="rehat-reader-main space-y-6" data-testid="rehat-chapter-page">
          {loadingChapter ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-text/68 dark:text-dark-text/64">
              {t("Loading chapter...")}</p>
          ) : chapterIssue || !selectedChapter ? (
            <section className="section-shell-quiet px-4 py-5" role="alert" data-testid="rehat-error-state">
              <p className="font-sans text-sm leading-6 text-text/65 dark:text-dark-text/70">
                {t("This Rehat chapter could not be loaded right now.")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={retryChapter}
                  className="interactive-focus min-h-[44px] rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
                >
                  {t("Retry")}</button>
                <Link
                  to={selectedRehatId ? `/banis/rehat/${selectedRehatId}` : '/banis/rehat'}
                  className="interactive-focus interactive-pill-link min-h-[44px] gap-2 rounded-lg border border-[rgb(var(--color-border))]/15 px-4 font-sans text-sm font-semibold text-text dark:border-dark-text/20 dark:text-dark-text"
                >
                  <IconArrowLeft size={14} />
                  {t("Back to chapters")}</Link>
              </div>
            </section>
          ) : (
            <>
              <div className="rehat-reader-source">
                <span>{t('Rehat Chapter')}</span><span aria-hidden="true">·</span>
                <span>{wordCount} {t('words')}</span>
                {editorial.sourceHref ? <a className="interactive-focus underline underline-offset-4" href={editorial.sourceHref} target="_blank" rel="noreferrer">{t(editorial.sourceLabel ?? '')}</a> : null}
              </div>

              <article ref={chapterContentRef} className="rehat-reader-article" data-testid="rehat-chapter-content" lang="en">
                <div className="rehat-reading-prose font-sans text-base leading-7 text-text dark:text-dark-text [&_p]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: chapterFind.html }} />
              </article>

              <RehatSectionNavigation
                rehatId={selectedRehatId}
                previousChapter={previousChapter}
                nextChapter={nextChapter}
              />
            </>
          )}
        </section>
      ) : selectedRehatId ? (
        <section className="mt-5 space-y-3" data-testid="rehat-chapter-list-page">
          <Link
            to="/banis/rehat"
            className="interactive-focus inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[rgb(var(--color-surface-muted))] px-3 py-2 font-sans text-xs font-medium text-text-muted transition-colors duration-300 dark:bg-dark-surface"
          >
            <IconArrowLeft size={14} />
            {t("Back to rehats")}</Link>

          {loadingChapters ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-text/68 dark:text-dark-text/64">
              {t("Loading chapters...")}</p>
          ) : chapterListIssue ? (
            <section className="section-shell-quiet px-4 py-5" role="alert" data-testid="rehat-error-state">
              <p className="font-sans text-sm leading-6 text-text/65 dark:text-dark-text/70">
                {t("Rehat chapters could not load right now.")}</p>
              <button
                type="button"
                onClick={retryChapterList}
                className="interactive-focus mt-4 min-h-[44px] rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
              >
                {t("Retry")}</button>
            </section>
          ) : filteredChapters.length === 0 ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-text/68 dark:text-dark-text/64">
              {t("No chapters match this search yet.")}</p>
          ) : (
            filteredChapters.map(chapter => (
              <Link
                key={chapter.chapterId}
                to={`/banis/rehat/${selectedRehatId}/chapters/${chapter.chapterId}`}
                className="block rounded-lg border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface))] px-4 py-4 text-text transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-sans text-base font-semibold text-text dark:text-dark-text">
                      {chapter.chapterName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <MetadataChip>{chapter.alphabet}</MetadataChip>
                    </div>
                  </div>
                  <span className="icon-surface mt-1 h-8 w-8 shrink-0 text-saffron dark:text-accent">
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
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-text/68 dark:text-dark-text/64">
              {t("Loading rehats...")}</p>
          ) : rehatIssue ? (
            <section className="section-shell-quiet px-4 py-5" role="alert" data-testid="rehat-error-state">
              <p className="font-sans text-sm leading-6 text-text/65 dark:text-dark-text/70">
                {t("Rehat could not load right now.")}</p>
              <button
                type="button"
                onClick={retryRehats}
                className="interactive-focus mt-4 min-h-[44px] rounded-lg bg-ink px-4 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
              >
                {t("Retry")}</button>
            </section>
          ) : filteredRehats.length === 0 ? (
            <p className="section-shell-quiet px-4 py-5 font-sans text-sm text-text/68 dark:text-dark-text/64">
              {t("No rehats match this search yet.")}</p>
          ) : (
            filteredRehats.map(rehat => {
              const rehatEditorial = getRehatEditorial(rehat)

              return (
                <Link
                  key={rehat.rehatId}
                  to={`/banis/rehat/${rehat.rehatId}`}
                  className="block rounded-lg border border-[rgb(var(--color-border))]/15 bg-[rgb(var(--color-surface))] px-4 py-4 text-text transition-colors duration-300 active:scale-[0.99] dark:border-dark-text/20 dark:bg-white/[0.055] dark:text-dark-text"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-sans text-base font-semibold text-text dark:text-dark-text">
                        {rehat.rehatName}
                      </p>
                      <p className="mt-2 font-sans text-sm leading-6 text-text/68 dark:text-dark-text/70">
                        {t(rehatEditorial.summary)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <MetadataChip>{rehat.alphabet}</MetadataChip>
                        {rehatEditorial.chips.map(chip => <MetadataChip key={chip}>{t(chip)}</MetadataChip>)}
                      </div>
                    </div>
                    <span className="icon-surface mt-1 h-8 w-8 shrink-0 text-saffron dark:text-accent">
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
