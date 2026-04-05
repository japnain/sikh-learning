import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchSearch,
  fetchBanisIndex,
  fetchAmritKeertanIndex,
  fetchAmritKeertanShabads,
  type SearchResult,
  type BaniIndexItem,
  type AmritKeertanHeader,
  type AmritKeertanShabad,
} from '../api/banidb'
import { SGGS_INDEX, DG_INDEX, type ScriptureIndexItem } from '../data/scriptureIndex'
import { useRecentSearchStore } from '../store/recentSearch'
import { IconSearch, IconChevronUp, IconChevronDown, IconLibrary, IconSword } from '../components/icons'

type Scripture = 'SGGS' | 'DG'

const SCRIPTURE_META: Record<Scripture, { label: string; icon: ReactNode; items: ScriptureIndexItem[] }> = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji', icon: <IconLibrary size={18} />, items: SGGS_INDEX },
  DG: { label: 'Dasam Granth', icon: <IconSword size={18} />, items: DG_INDEX },
}

const SUNDAR_GUTKA_NITNEM_IDS = [2, 4, 6, 9, 10, 20, 21, 23]
const SUNDAR_GUTKA_POPULAR_IDS = [90, 30, 31, 22]

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="bg-saffron/30 text-saffron dark:text-saffron-light font-semibold rounded-sm px-0.5">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function IndexRow({
  label,
  detail,
  onClick,
}: {
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 mb-1 transition-colors duration-300 active:scale-95 transition-transform duration-150"
    >
      <p className="font-sans text-sm text-ink dark:text-dark-text">{label}</p>
      <p className="font-sans text-xs text-gold dark:text-gold-light mt-0.5">{detail}</p>
    </button>
  )
}

function MetadataChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-gold/10 dark:bg-gold/10 border border-gold/15 dark:border-gold/20 px-2 py-1 font-sans text-[10px] text-gold dark:text-gold-light">
      {children}
    </span>
  )
}

export default function Banis() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sundarGutkaBanis, setSundarGutkaBanis] = useState<BaniIndexItem[]>([])
  const [loadingSundarGutka, setLoadingSundarGutka] = useState(true)
  const [amritHeaders, setAmritHeaders] = useState<AmritKeertanHeader[]>([])
  const [loadingAmritHeaders, setLoadingAmritHeaders] = useState(true)
  const [amritShabadsByHeader, setAmritShabadsByHeader] = useState<Record<number, AmritKeertanShabad[]>>({})
  const [loadingAmritHeader, setLoadingAmritHeader] = useState<number | null>(null)

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const { recent, addRecent, clearRecent } = useRecentSearchStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoadingSundarGutka(true)
    fetchBanisIndex()
      .then(data => {
        if (!cancelled) setSundarGutkaBanis(data)
      })
      .catch(() => {
        if (!cancelled) setSundarGutkaBanis([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSundarGutka(false)
      })

    setLoadingAmritHeaders(true)
    fetchAmritKeertanIndex()
      .then(data => {
        if (!cancelled) setAmritHeaders(data)
      })
      .catch(() => {
        if (!cancelled) setAmritHeaders([])
      })
      .finally(() => {
        if (!cancelled) setLoadingAmritHeaders(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const trimmed = query.trim()
        const isEnglish = /^[a-zA-Z\s.,!?'-]+$/.test(trimmed)
        const results = await fetchSearch(trimmed, isEnglish ? 3 : 1)
        setSearchResults(results)
        addRecent(trimmed)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [addRecent])

  const openSearchResult = (result: SearchResult) => {
    navigate(`/study?shabadId=${result.shabadId}&verseId=${result.verseId}`)
  }

  const openScriptureIndexItem = (source: 'G' | 'D', item: ScriptureIndexItem) => {
    navigate(`/study?source=${source}&ang=${item.pages[0]}&startAng=${item.pages[0]}&bani=${encodeURIComponent(item.name)}&endAng=${item.pages[1]}`)
  }

  const openSundarGutkaBani = (item: BaniIndexItem) => {
    navigate(`/study?baniDbId=${item.id}&bani=${encodeURIComponent(item.transliteration || item.gurmukhi)}`)
  }

  const loadAmritHeader = async (headerId: number) => {
    if (amritShabadsByHeader[headerId] || loadingAmritHeader === headerId) return
    setLoadingAmritHeader(headerId)
    try {
      const shabads = await fetchAmritKeertanShabads(headerId)
      setAmritShabadsByHeader(current => ({ ...current, [headerId]: shabads }))
    } catch {
      setAmritShabadsByHeader(current => ({ ...current, [headerId]: [] }))
    } finally {
      setLoadingAmritHeader(current => (current === headerId ? null : current))
    }
  }

  const sundarGutkaGroups = useMemo(() => {
    const nitnem = sundarGutkaBanis.filter(item => SUNDAR_GUTKA_NITNEM_IDS.includes(item.id))
    const popular = sundarGutkaBanis.filter(item => SUNDAR_GUTKA_POPULAR_IDS.includes(item.id))
    const other = sundarGutkaBanis.filter(item => !SUNDAR_GUTKA_NITNEM_IDS.includes(item.id) && !SUNDAR_GUTKA_POPULAR_IDS.includes(item.id))

    return [
      { key: 'nitnem', label: 'Nitnem', items: nitnem },
      { key: 'popular', label: 'Popular Bani', items: popular },
      { key: 'other', label: 'Other', items: other },
    ].filter(group => group.items.length > 0)
  }, [sundarGutkaBanis])

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6 mt-4">Banis</h1>

      <div className="mb-6">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 dark:text-dark-text/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search Gurbani..."
            className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl pl-9 pr-4 py-3 font-sans text-sm text-ink dark:text-dark-text placeholder:text-ink/30 dark:placeholder:text-dark-text/30 outline-none focus:border-saffron/40 transition-colors duration-300"
          />
        </div>
        {searching && <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">Searching exact results...</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {searchResults.map(r => (
              <button
                key={`${r.shabadId}-${r.verseId}`}
                onClick={() => openSearchResult(r)}
                className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 transition-colors duration-300"
              >
                <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text"><Highlight text={r.gurmukhi} query={searchQuery} /></p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5"><Highlight text={r.transliteration} query={searchQuery} /></p>
                <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-0.5"><Highlight text={r.translation_en} query={searchQuery} /></p>
                <p className="font-sans text-[10px] text-gold dark:text-gold-light mt-1">
                  {r.source === 'D' ? 'DG' : r.source === 'B' ? 'BGV' : r.source === 'A' ? 'AK' : 'SGGS'} · Ang {r.pageNo} · Open exact shabad
                </p>
              </button>
            ))}
          </div>
        )}
        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">No results found</p>
        )}
        {!searchQuery && recent.length > 0 && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <p className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40 uppercase tracking-wider">Recent</p>
              <button onClick={clearRecent} className="font-sans text-[10px] text-ink/30 dark:text-dark-text/30">Clear</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {recent.map(q => (
                <button key={q} onClick={() => handleSearch(q)} className="font-sans text-xs bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-full px-3 py-1 text-ink/60 dark:text-dark-text/60 active:scale-95 transition-transform duration-150">{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <button
          onClick={() => toggle('sundar-gutka')}
          className="w-full flex justify-between items-center bg-gradient-to-r from-saffron/10 to-saffron-light/10 dark:from-saffron/15 dark:to-saffron-light/15 border border-saffron/20 dark:border-saffron/20 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-saffron dark:text-saffron-light">ਸੁੰਦਰ ਗੁਟਕਾ · Sundar Gutka</p>
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">Live bani index grouped like STTM</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['sundar-gutka'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
        </button>

        {expanded['sundar-gutka'] && (
          <div className="mt-2 ml-2">
            {loadingSundarGutka ? (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 px-2 py-3">Loading Sundar Gutka…</p>
            ) : sundarGutkaGroups.map(group => {
              const groupKey = `sundar-gutka-${group.key}`
              return (
                <div key={group.key} className="mb-2">
                  <button
                    onClick={() => toggle(groupKey)}
                    className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl p-3 min-h-[44px] transition-colors duration-300 active:scale-95 transition-transform duration-150"
                  >
                    <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{group.label}</p>
                    <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{expanded[groupKey] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                  </button>
                  {expanded[groupKey] && (
                    <div className="mt-1 ml-2">
                      {group.items.map(item => (
                        <IndexRow
                          key={item.id}
                          label={item.gurmukhi}
                          detail={item.transliteration || `Bani #${item.id}`}
                          onClick={() => openSundarGutkaBani(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(['SGGS', 'DG'] as Scripture[]).map(scripture => {
        const meta = SCRIPTURE_META[scripture]
        const sectionKey = scripture.toLowerCase()
        const isOpen = expanded[sectionKey]
        const source = scripture === 'SGGS' ? 'G' : 'D'

        return (
          <div key={scripture} className="mb-4">
            <button
              onClick={() => toggle(sectionKey)}
              className={`w-full flex justify-between items-center ${scripture === 'SGGS' ? 'bg-parchment-card dark:bg-dark-card' : 'bg-parchment-low dark:bg-dark-surface'} border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150`}
            >
              <div className="text-left">
                <p className={`font-sans font-semibold text-base flex items-center gap-1.5 ${scripture === 'SGGS' ? 'text-saffron dark:text-saffron-light' : 'text-ink dark:text-dark-text'}`}>{meta.icon} {meta.label}</p>
                <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">{meta.items.length} sections</p>
              </div>
              <span className="text-saffron dark:text-saffron-light font-sans text-sm">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
            </button>

            {isOpen && (
              <div className="mt-2 ml-2">
                {meta.items.map(item => (
                  <IndexRow
                    key={item.name}
                    label={item.name}
                    detail={`Ang ${item.pages[0]}–${item.pages[1]}`}
                    onClick={() => openScriptureIndexItem(source, item)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="mb-4">
        <button
          onClick={() => toggle('ak')}
          className="w-full flex justify-between items-center bg-parchment-low dark:bg-dark-surface border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-ink dark:text-dark-text">Amrit Keertan</p>
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">Expandable chapter index like STTM</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['ak'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
        </button>

        {expanded['ak'] && (
          <div className="mt-2 ml-2">
            {loadingAmritHeaders ? (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 px-2 py-3">Loading Amrit Keertan…</p>
            ) : amritHeaders.map(header => {
              const headerKey = `ak-header-${header.headerId}`
              const isOpen = expanded[headerKey]
              const shabads = amritShabadsByHeader[header.headerId] ?? []
              return (
                <div key={header.headerId} className="mb-2">
                  <button
                    onClick={() => {
                      toggle(headerKey)
                      if (!isOpen) void loadAmritHeader(header.headerId)
                    }}
                    className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl p-3 min-h-[44px] transition-colors duration-300 active:scale-95 transition-transform duration-150"
                  >
                    <div className="text-left">
                      <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text">{header.gurmukhi}</p>
                      <p className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40 mt-0.5">{header.transliteration}</p>
                    </div>
                    <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-1 ml-2">
                      {loadingAmritHeader === header.headerId && shabads.length === 0 ? (
                        <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 px-2 py-3">Loading shabads…</p>
                      ) : shabads.map(shabad => (
                        <button
                          key={shabad.shabadId}
                          onClick={() => navigate(`/study?shabadId=${shabad.shabadId}`)}
                          className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 mb-1 transition-colors duration-300 active:scale-95 transition-transform duration-150"
                        >
                          <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text leading-relaxed">
                            {shabad.gurmukhi}
                          </p>
                          {shabad.transliteration && shabad.transliteration.length <= 80 && (
                            <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-1">
                              {shabad.transliteration}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {shabad.source && <MetadataChip>{shabad.source}</MetadataChip>}
                            {shabad.raag && <MetadataChip>{shabad.raag}</MetadataChip>}
                            {shabad.pageNo ? <MetadataChip>{`Ang ${shabad.pageNo}`}</MetadataChip> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
