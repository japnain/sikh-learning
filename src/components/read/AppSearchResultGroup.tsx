import { useSearchParams } from 'react-router-dom'
import type { ReadPageCopy } from '../../content/readPageCopy'
import type { SearchMode } from '../../types'
import type { AppSearchMatch, SearchSource } from '../../utils/appSearch'
import { hasSearchMatch } from '../../utils/searchHighlight'
import SearchHighlight from '../SearchHighlight'
import { IconArrowRight } from '../icons'

export default function AppSearchResultGroup({
  matches,
  query,
  groupLabel,
  groupHint,
  testId,
  aiResultGroup,
  resultAnchor,
  className,
  copy,
  searchMode,
  searchSource,
  addRecent,
  openSearchDestination,
}: {
  matches: AppSearchMatch[]
  query: string
  groupLabel: string
  groupHint?: string
  testId: string
  aiResultGroup: string
  resultAnchor: boolean
  className: string
  copy: ReadPageCopy
  searchMode: SearchMode
  searchSource: SearchSource
  addRecent: (query: string, mode: SearchMode, source: SearchSource) => void
  openSearchDestination: (path: string) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const expanded = (searchParams.get('show') ?? '').split(',').includes(aiResultGroup)
  const toggleExpanded = () => setSearchParams(current => {
    const next = new URLSearchParams(current)
    const groups = new Set((next.get('show') ?? '').split(',').filter(Boolean))
    if (groups.has(aiResultGroup)) groups.delete(aiResultGroup)
    else groups.add(aiResultGroup)
    if (groups.size) next.set('show', [...groups].join(','))
    else next.delete('show')
    return next
  }, { replace: true })
  const visibleMatches = expanded ? matches : matches.slice(0, 8)
  const trimmedQuery = query.trim()

  return (
    <div
      data-search-result-anchor={resultAnchor ? 'true' : undefined}
      className={`nav-safe-results space-y-2 ${className}`}
      data-testid={testId}
      data-ai-result-group={aiResultGroup}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/75 dark:text-dark-text/76">
          {groupLabel}
        </h3>
        {groupHint ? (
          <p className="font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
            {groupHint}
          </p>
        ) : null}
      </div>
      {visibleMatches.map(match => {
        const matchDetail = match.kind === 'library-work' && match.library
          ? copy.libraryWorkDetail(match.library.chapterCount ?? 0)
          : match.kind === 'library-chapter' && match.library
            ? copy.libraryChapterDetail(
                match.library.shortTitle,
                match.library.volume ?? 1,
                match.library.episodeNumber
              )
            : match.detail
        const showMatchedQuery = trimmedQuery.length >= 2
          && !hasSearchMatch(match.label, trimmedQuery)
          && !hasSearchMatch(matchDetail, trimmedQuery)
          && !hasSearchMatch(match.excerpt ?? '', trimmedQuery)

        return (
          <button
            key={match.key}
            id={`read-result-${match.key}`}
            data-read-launch="true"
            onClick={() => {
              addRecent(trimmedQuery, searchMode, searchSource)
              openSearchDestination(match.path)
            }}
            className="w-full rounded-lg border border-saffron/20 bg-saffron/8 px-4 py-3 text-left transition-colors duration-300 active:scale-[0.99] dark:border-saffron/20 dark:bg-saffron/12"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                  <SearchHighlight text={match.label} query={trimmedQuery} />
                </p>
                <p className="mt-1 font-sans text-xs text-ink/68 dark:text-dark-text/64">
                  <SearchHighlight text={matchDetail} query={trimmedQuery} />
                </p>
                {match.excerpt ? (
                  <p className="mt-2 line-clamp-3 font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/76">
                    <SearchHighlight text={match.excerpt} query={trimmedQuery} />
                  </p>
                ) : null}
                {showMatchedQuery ? (
                  <p className="mt-2 font-sans text-[11px] text-ink/68 dark:text-dark-text/64">
                    {copy.matchedFor} <SearchHighlight text={trimmedQuery} query={trimmedQuery} />
                  </p>
                ) : null}
              </div>
              <IconArrowRight size={18} className="shrink-0" aria-hidden="true" />
            </div>
          </button>
        )
      })}
      {matches.length > 8 ? <div className="read-result-expansion">
        <p>{copy.showingItems(visibleMatches.length, matches.length)}</p>
        <button type="button" className="read-search-clear" onClick={toggleExpanded}>{expanded ? copy.showFewer : copy.showAllItems(matches.length)}</button>
      </div> : null}
    </div>
  )
}

