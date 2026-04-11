import { startTransition, useDeferredValue, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  COLLECTION_BY_ID,
  DAILY_GUIDANCE_ENTRIES,
  getLearnItemKind,
  SHABAD_DEEP_DIVES,
  SHABAD_DEEP_DIVE_BY_ID,
  TOPIC_GUIDES,
  TOPIC_GUIDE_BY_ID,
} from "../data/learnContent"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useLearningStore } from "../store/learning"
import type {
  Collection,
  LearnContentKind,
  LearnDepthPreference,
  LearnTab,
  ShabadDeepDive,
  TopicGuide,
} from "../types"
import { IconArrowRight, IconBookmark, IconBookmarkFilled, IconSearch } from "../components/icons"
import { toLocalDayStamp } from "../utils/learnDates"
import {
  filterShabadDeepDives,
  getLearnItemLabel,
  getLearnSavedItems,
  getTodayLearnSurface,
  type LearnResolvedExcerpt,
  resolveLineReference,
  resolveTopicGuide,
} from "../utils/learnExperience"

const DEPTH_OPTIONS: Array<{ id: LearnDepthPreference; label: string; detail: string }> = [
  { id: "gentle", label: "Gentle", detail: "More accessible and immediate guidance." },
  { id: "balanced", label: "Balanced", detail: "Mix approachable reading with deeper study." },
  { id: "deep", label: "Deep", detail: "Favor denser study and slower reflection." },
]

function isTab(value: string | null): value is LearnTab {
  return value === "today" || value === "topics" || value === "shabads" || value === "saved"
}

function QueryTab({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[52px] rounded-[24px] border px-4 py-3 text-left transition-all duration-300 ${
        active
          ? "border-saffron/35 bg-white text-ink shadow-soft dark:border-gold/30 dark:bg-dark-card dark:text-dark-text"
          : "border-sand/15 bg-parchment-low/85 text-ink/72 dark:border-dark-text/10 dark:bg-dark-surface/70 dark:text-dark-text/72"
      }`}
    >
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 font-sans text-[11px] leading-5 opacity-75">{detail}</p>
    </button>
  )
}

function SaveButton({
  saved,
  onClick,
  label = "Save",
}: {
  saved: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[44px] rounded-full section-shell-quiet px-3 py-2 text-ink dark:text-dark-text"
      aria-label={saved ? `Remove ${label}` : `Save ${label}`}
    >
      <span className="flex items-center gap-2">
        {saved ? (
          <IconBookmarkFilled size={16} className="text-saffron dark:text-gold-light" />
        ) : (
          <IconBookmark size={16} className="text-ink/65 dark:text-dark-text/65" />
        )}
        <span className="font-sans text-xs font-medium">{saved ? "Saved" : label}</span>
      </span>
    </button>
  )
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="mb-3">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{title}</h2>
      {body ? (
        <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">{body}</p>
      ) : null}
    </div>
  )
}

function CitationLine({ shabad }: { shabad: ShabadDeepDive }) {
  return (
    <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-gold dark:text-gold-light">
      {shabad.citation.guru} · {shabad.citation.raag} · Ang {shabad.citation.ang}
    </p>
  )
}

function ExcerptBlock({
  excerpt,
  shabad,
}: {
  excerpt: LearnResolvedExcerpt
  shabad: ShabadDeepDive
}) {
  return (
    <div className="section-shell-quiet p-4">
      <CitationLine shabad={shabad} />
      <div className="mt-3 space-y-3">
        {excerpt.lines.map(line => (
          <div key={line.verseId} className="reader-divider pb-3 last:pb-0">
            <p lang="pa-Guru" className="font-gurmukhi text-2xl leading-10 text-ink dark:text-dark-text">
              {line.gurmukhi}
            </p>
            <p className="mt-2 font-sans text-xs leading-6 text-ink/55 dark:text-dark-text/55">
              {line.transliteration}
            </p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{line.translation}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="section-shell px-4 py-4">
          <p className="eyebrow">Meaning</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{excerpt.shortMeaning}</p>
        </div>
        <div className="section-shell px-4 py-4">
          <p className="eyebrow">Life Application</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{excerpt.lifeApplication}</p>
        </div>
      </div>
    </div>
  )
}

function TopicCard({
  topic,
  active,
  onClick,
}: {
  topic: TopicGuide
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[96px] rounded-[28px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:bg-dark-surface/78"
      }`}
    >
      <p className="eyebrow">{topic.category === "most-needed" ? "Most Needed" : topic.category === "practice" ? "Practice" : "Inner Work"}</p>
      <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{topic.title}</p>
      <p className="mt-2 font-sans text-sm leading-6 text-ink/60 dark:text-dark-text/60">{topic.centralInsight}</p>
    </button>
  )
}

function TopicGuideDetail({
  topic,
  saved,
  onToggleSave,
  onOpenShabad,
}: {
  topic: TopicGuide
  saved: boolean
  onToggleSave: () => void
  onOpenShabad: (shabadId: string) => void
}) {
  return (
    <section className="section-shell p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">What Guru Says About…</p>
          <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{topic.title}</h3>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{topic.issueStatement}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={topic.shortTitle} />
      </div>

      <div className="mt-5 section-shell-quiet p-4">
        <p className="eyebrow">Central Insight</p>
        <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">{topic.centralInsight}</p>
      </div>

      <div className="mt-5 space-y-4">
        {topic.excerpts.map(excerpt => {
          const resolved = resolveLineReference(excerpt.source)
          return (
            <div key={`${resolved.deepDive.id}:${excerpt.source.verseIds.join("-")}`} className="section-shell-quiet p-4">
              <CitationLine shabad={resolved.deepDive} />
              <div className="mt-3 space-y-3">
                {resolved.lines.map(line => (
                  <div key={line.verseId} className="reader-divider pb-3 last:pb-0">
                    <p lang="pa-Guru" className="font-gurmukhi text-[1.65rem] leading-9 text-ink dark:text-dark-text">
                      {line.gurmukhi}
                    </p>
                    <p className="mt-2 font-sans text-xs leading-6 text-ink/55 dark:text-dark-text/55">
                      {line.transliteration}
                    </p>
                    <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{line.translation}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-sans text-sm leading-6 text-ink dark:text-dark-text">{excerpt.explanation}</p>
              <button
                type="button"
                onClick={() => onOpenShabad(resolved.deepDive.id)}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
              >
                Study full shabad <IconArrowRight size={16} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="section-shell-quiet p-4">
          <p className="eyebrow">Reflection</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{topic.practicalReflection}</p>
        </div>
        <div className="section-shell-quiet p-4">
          <p className="eyebrow">Action</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{topic.actionPrompt}</p>
        </div>
      </div>
    </section>
  )
}

function ShabadCard({
  shabad,
  active,
  completed,
  saved,
  onOpen,
  onToggleSave,
}: {
  shabad: ShabadDeepDive
  active: boolean
  completed: boolean
  saved: boolean
  onOpen: () => void
  onToggleSave: () => void
}) {
  return (
    <div className={`rounded-[30px] border px-4 py-4 transition-all duration-300 ${active ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card" : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:bg-dark-surface/78"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CitationLine shabad={shabad} />
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{shabad.title}</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62">{shabad.summary}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={shabad.title} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip-pill">{shabad.difficulty}</span>
        <span className="chip-pill">{shabad.lengthBand}</span>
        {completed ? <span className="chip-pill">Viewed</span> : null}
        {shabad.themes.slice(0, 2).map(theme => (
          <span key={theme} className="chip-pill">{theme}</span>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
      >
        Study this shabad <IconArrowRight size={16} />
      </button>
    </div>
  )
}

function ShabadDetail({
  shabad,
  saved,
  onToggleSave,
}: {
  shabad: ShabadDeepDive
  saved: boolean
  onToggleSave: () => void
}) {
  return (
    <section className="section-shell p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Featured Shabad</p>
          <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{shabad.title}</h3>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{shabad.subtitle}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={shabad.title} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="section-shell-quiet p-4">
          <CitationLine shabad={shabad} />
          <p className="mt-3 font-sans text-sm leading-6 text-ink dark:text-dark-text">{shabad.summary}</p>
        </div>
        <div className="section-shell-quiet p-4">
          <p className="eyebrow">Why It Matters</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{shabad.whyItMatters}</p>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70">{shabad.takeaway}</p>
        </div>
      </div>

      <div className="mt-5 section-shell-quiet p-4">
        <p className="eyebrow">Structure</p>
        <div className="mt-3 space-y-3">
          {shabad.structure.map(item => (
            <p key={item} className="font-sans text-sm leading-6 text-ink dark:text-dark-text">{item}</p>
          ))}
        </div>
      </div>

      <div className="mt-5 section-shell-quiet p-4">
        <CitationLine shabad={shabad} />
        <div className="mt-3 space-y-3">
          {shabad.lines.map(line => (
            <div key={line.verseId} className="reader-divider pb-3 last:pb-0">
              <p lang="pa-Guru" className="font-gurmukhi text-[1.75rem] leading-9 text-ink dark:text-dark-text">
                {line.gurmukhi}
              </p>
              <p className="mt-2 font-sans text-xs leading-6 text-ink/55 dark:text-dark-text/55">{line.transliteration}</p>
              <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{line.translation}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CollectionCard({
  collection,
  active,
  onOpen,
}: {
  collection: Collection
  active: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-[17.5rem] shrink-0 rounded-[30px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:bg-dark-surface/78"
      }`}
    >
      <p className="eyebrow">{collection.durationLabel}</p>
      <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{collection.title}</p>
      <p className="mt-1 font-sans text-sm text-ink/58 dark:text-dark-text/58">{collection.subtitle}</p>
      <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">{collection.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {collection.themes.map(theme => (
          <span key={theme} className="chip-pill">{theme}</span>
        ))}
      </div>
    </button>
  )
}

function CollectionDetail({
  collection,
  onOpenItem,
}: {
  collection: Collection
  onOpenItem: (kind: LearnContentKind, id: string) => void
}) {
  const heroExcerpt = resolveLineReference(collection.heroSource)
  return (
    <section className="section-shell p-5">
      <SectionHeader eyebrow="Continue Learning" title={collection.title} body={collection.description} />
      <ExcerptBlock excerpt={heroExcerpt} shabad={heroExcerpt.deepDive} />
      <div className="mt-5 space-y-3">
        {collection.items.map(item => {
          const kind = getLearnItemKind(item.id)
          const resolved = kind === "daily-guidance"
            ? DAILY_GUIDANCE_ENTRIES.find(entry => entry.id === item.id)
            : kind === "topic-guide"
              ? TOPIC_GUIDE_BY_ID[item.id]
              : SHABAD_DEEP_DIVE_BY_ID[item.id]
          if (!kind || !resolved) return null

          const title = resolved.title
          const body = "centralInsight" in resolved ? resolved.centralInsight : resolved.summary

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenItem(kind, item.id)}
              className="section-shell-quiet w-full rounded-[24px] px-4 py-4 text-left"
            >
              <p className="eyebrow">{getLearnItemLabel(kind)}</p>
              <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{title}</p>
              <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">{body}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function Learn() {
  const [searchParams, setSearchParams] = useSearchParams()
  const now = useCurrentTime()
  const dayStamp = toLocalDayStamp(new Date(now))
  const learnState = useLearningStore(state => state.learnState)
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)
  const toggleSavedLearnItem = useLearningStore(state => state.toggleSavedLearnItem)
  const setActiveLearnCollection = useLearningStore(state => state.setActiveLearnCollection)
  const setLearnDepthPreference = useLearningStore(state => state.setLearnDepthPreference)

  const activeTab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as LearnTab) : "today"
  const deferredQuery = useDeferredValue(searchParams.get("query") ?? "")
  const todaySurface = getTodayLearnSurface(dayStamp, learnState)
  const queryResolution = resolveTopicGuide(deferredQuery)

  const selectedTopic =
    TOPIC_GUIDE_BY_ID[searchParams.get("topic") ?? ""]
    ?? (deferredQuery ? queryResolution.topic : null)
    ?? todaySurface.topicSpotlight.item
  const selectedShabad =
    SHABAD_DEEP_DIVE_BY_ID[searchParams.get("shabad") ?? ""]
    ?? todaySurface.featuredShabad.item
  const selectedCollection =
    COLLECTION_BY_ID[searchParams.get("collection") ?? ""]
    ?? (learnState.activeCollectionId ? COLLECTION_BY_ID[learnState.activeCollectionId] : null)
    ?? todaySurface.exploreCollections[0]

  const shabadThemeFilter = searchParams.get("theme") ?? ""
  const shabadGuruFilter = searchParams.get("guru") ?? ""
  const shabadRaagFilter = searchParams.get("raag") ?? ""
  const shabadDifficultyFilter = searchParams.get("difficulty") ?? ""
  const shabadLengthFilter = searchParams.get("length") ?? ""
  const shabadSavedOnly = searchParams.get("savedOnly") === "1"
  const shabadCompletedOnly = searchParams.get("completedOnly") === "1"

  const filteredShabads = filterShabadDeepDives(
    {
      theme: shabadThemeFilter || undefined,
      guru: shabadGuruFilter || undefined,
      raag: shabadRaagFilter || undefined,
      difficulty: shabadDifficultyFilter || undefined,
      lengthBand: shabadLengthFilter || undefined,
      savedOnly: shabadSavedOnly,
      completedOnly: shabadCompletedOnly,
    },
    learnState
  )

  const savedItems = getLearnSavedItems(learnState.savedItemIds)
  const viewedIds = new Set(learnState.viewedItems.map(item => item.itemId))
  const continueLearning = todaySurface.continueLearning
  const gurus = Array.from(new Set(SHABAD_DEEP_DIVES.map(item => item.citation.guru)))
  const raags = Array.from(new Set(SHABAD_DEEP_DIVES.map(item => item.citation.raag)))
  const shabadThemes = Array.from(new Set(SHABAD_DEEP_DIVES.flatMap(item => item.themes)))
  const activeDetail = searchParams.get("detail") ?? "topic"

  function setParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        next.delete(key)
        return
      }
      next.set(key, value)
    })
    startTransition(() => {
      setSearchParams(next)
    })
  }

  function openTopic(topicId: string, tab: LearnTab = activeTab) {
    setParams({
      tab,
      topic: topicId,
      detail: "topic",
      query: tab === "topics" ? searchParams.get("query") : null,
    })
  }

  function openShabad(shabadId: string, tab: LearnTab = activeTab) {
    setParams({
      tab,
      shabad: shabadId,
      detail: "shabad",
    })
  }

  function openCollection(collectionId: string) {
    setActiveLearnCollection(collectionId)
    setParams({
      tab: "today",
      collection: collectionId,
      detail: "collection",
    })
  }

  function openCollectionItem(kind: LearnContentKind, itemId: string) {
    if (kind === "topic-guide") {
      openTopic(itemId)
      return
    }

    if (kind === "shabad-deep-dive") {
      openShabad(itemId)
      return
    }

    if (kind === "daily-guidance") {
      const guidance = DAILY_GUIDANCE_ENTRIES.find(item => item.id === itemId)
      openShabad(guidance?.relatedShabadIds[0] ?? selectedShabad.id)
    }
  }

  useEffect(() => {
    recordLearnItemView(todaySurface.dailyGuidance.item.id, "daily-guidance")
  }, [recordLearnItemView, todaySurface.dailyGuidance.item.id])

  useEffect(() => {
    if (selectedTopic) {
      recordLearnItemView(selectedTopic.id, "topic-guide")
    }
  }, [recordLearnItemView, selectedTopic])

  useEffect(() => {
    if (selectedShabad) {
      recordLearnItemView(selectedShabad.id, "shabad-deep-dive")
    }
  }, [recordLearnItemView, selectedShabad])

  useEffect(() => {
    if (selectedCollection) {
      recordLearnItemView(selectedCollection.id, "collection")
    }
  }, [recordLearnItemView, selectedCollection])

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-6">
        <p className="eyebrow">Learn</p>
        <h1 className="mt-2 font-display text-5xl leading-none text-ink dark:text-dark-text">Today</h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">
          Daily Gurbani guidance, full shabad study, and trusted topic pages built from approved source material.
        </p>
      </div>

      <section className="hero-surface p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <QueryTab
            active={activeTab === "today"}
            label="Today"
            detail="Fresh daily guidance, featured shabad, and topic spotlight."
            onClick={() => setParams({ tab: "today", query: null })}
          />
          <QueryTab
            active={activeTab === "topics"}
            label="Topics"
            detail="Search approved guides for anger, anxiety, ego, loneliness, and more."
            onClick={() => setParams({ tab: "topics" })}
          />
          <QueryTab
            active={activeTab === "shabads"}
            label="Shabads"
            detail="Filter the study library by theme, Guru, raag, and depth."
            onClick={() => setParams({ tab: "shabads" })}
          />
          <QueryTab
            active={activeTab === "saved"}
            label="Saved"
            detail="Keep verses, topic guides, and shabads together with clear labels."
            onClick={() => setParams({ tab: "saved" })}
          />
        </div>
      </section>

      <section className="section-shell-quiet mt-5 p-4">
        <p className="eyebrow">Reading Depth</p>
        <div className="mt-3 grid gap-3">
          {DEPTH_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setLearnDepthPreference(option.id)}
              className={`rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
                learnState.depthPreference === option.id
                  ? "border-saffron/30 bg-white dark:border-gold/25 dark:bg-dark-card"
                  : "border-sand/12 bg-parchment-low/70 dark:border-dark-text/10 dark:bg-dark-surface/70"
              }`}
            >
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{option.label}</p>
              <p className="mt-1 font-sans text-xs leading-5 text-ink/60 dark:text-dark-text/60">{option.detail}</p>
            </button>
          ))}
        </div>
      </section>

      {activeTab === "today" && (
        <>
          <section className="section-shell mt-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Today&apos;s Guidance</p>
                <h2 className="mt-2 font-display text-[2.1rem] leading-none text-ink dark:text-dark-text">
                  {todaySurface.dailyGuidance.item.title}
                </h2>
              </div>
              <SaveButton
                saved={learnState.savedItemIds.includes(todaySurface.dailyGuidance.item.id)}
                onClick={() => toggleSavedLearnItem(todaySurface.dailyGuidance.item.id)}
                label={todaySurface.dailyGuidance.item.title}
              />
            </div>

            <div className="mt-5">
              <ExcerptBlock
                excerpt={resolveLineReference(todaySurface.dailyGuidance.item.source)}
                shabad={resolveLineReference(todaySurface.dailyGuidance.item.source).deepDive}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="section-shell-quiet p-4">
                <p className="eyebrow">Takeaway</p>
                <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">
                  {todaySurface.dailyGuidance.item.takeaway}
                </p>
                <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">
                  {todaySurface.dailyGuidance.item.lifeApplication}
                </p>
              </div>
              <div className="section-shell-quiet p-4">
                <p className="eyebrow">Read Full Meaning</p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
                  {todaySurface.dailyGuidance.item.summary}
                </p>
                <button
                  type="button"
                  onClick={() => openShabad(todaySurface.dailyGuidance.item.relatedShabadIds[0] ?? todaySurface.featuredShabad.item.id)}
                  className="mt-4 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
                >
                  Read full meaning <IconArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5">
            <div className="section-shell p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Featured Shabad</p>
                  <h2 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">
                    {todaySurface.featuredShabad.item.title}
                  </h2>
                  <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">
                    {todaySurface.featuredShabad.item.whyItMatters}
                  </p>
                </div>
                <SaveButton
                  saved={learnState.savedItemIds.includes(todaySurface.featuredShabad.item.id)}
                  onClick={() => toggleSavedLearnItem(todaySurface.featuredShabad.item.id)}
                  label={todaySurface.featuredShabad.item.title}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {todaySurface.featuredShabad.item.themes.map(theme => (
                  <span key={theme} className="chip-pill">{theme}</span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openShabad(todaySurface.featuredShabad.item.id)}
                className="mt-5 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
              >
                Study this shabad <IconArrowRight size={16} />
              </button>
            </div>

            <div className="section-shell p-5">
              <SectionHeader
                eyebrow="What Guru Says About…"
                title={todaySurface.topicSpotlight.item.title}
                body={todaySurface.topicSpotlight.item.centralInsight}
              />
              <div className="flex gap-3 overflow-x-auto pb-1">
                {todaySurface.themeRail.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => openTopic(topic.id)}
                    className={`shrink-0 rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-300 ${
                      selectedTopic.id === topic.id
                        ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg"
                        : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"
                    }`}
                  >
                    {topic.shortTitle}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-start justify-between gap-4 section-shell-quiet p-4">
                <div>
                  <p className="eyebrow">Topic Spotlight</p>
                  <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                    {todaySurface.topicSpotlight.item.title}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">
                    {todaySurface.topicSpotlight.item.issueStatement}
                  </p>
                </div>
                <div className="shrink-0">
                  <SaveButton
                    saved={learnState.savedItemIds.includes(todaySurface.topicSpotlight.item.id)}
                    onClick={() => toggleSavedLearnItem(todaySurface.topicSpotlight.item.id)}
                    label={todaySurface.topicSpotlight.item.shortTitle}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => openTopic(todaySurface.topicSpotlight.item.id)}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
              >
                Open approved guide <IconArrowRight size={16} />
              </button>
            </div>
          </section>

          <section className="section-shell mt-5 p-5">
            <SectionHeader eyebrow="Continue Learning" title={continueLearning.title} body={continueLearning.body} />
            {continueLearning.kind === "collection" ? (
              <button
                type="button"
                onClick={() => openCollection(continueLearning.collection.id)}
                className="section-shell-quiet w-full rounded-[26px] px-4 py-4 text-left"
              >
                <p className="eyebrow">{continueLearning.collection.durationLabel}</p>
                <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                  {continueLearning.collection.subtitle}
                </p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                  {continueLearning.collection.description}
                </p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openTopic(continueLearning.topic.id)}
                className="section-shell-quiet w-full rounded-[26px] px-4 py-4 text-left"
              >
                <p className="eyebrow">Topic Guide</p>
                <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                  {continueLearning.topic.shortTitle}
                </p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                  {continueLearning.topic.centralInsight}
                </p>
              </button>
            )}
          </section>

          <section className="section-shell mt-5 p-5">
            <SectionHeader eyebrow="Explore by Theme" title="Collections and journeys" body="Structured paths that move from short guidance into deeper study." />
            <div className="flex gap-4 overflow-x-auto pb-1">
              {todaySurface.exploreCollections.map(collection => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  active={selectedCollection.id === collection.id}
                  onOpen={() => openCollection(collection.id)}
                />
              ))}
            </div>
          </section>

          {activeDetail === "topic" && selectedTopic ? (
            <div className="mt-5">
              <TopicGuideDetail
                topic={selectedTopic}
                saved={learnState.savedItemIds.includes(selectedTopic.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedTopic.id)}
                onOpenShabad={openShabad}
              />
            </div>
          ) : null}

          {activeDetail === "shabad" && selectedShabad ? (
            <div className="mt-5">
              <ShabadDetail
                shabad={selectedShabad}
                saved={learnState.savedItemIds.includes(selectedShabad.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedShabad.id)}
              />
            </div>
          ) : null}

          {activeDetail === "collection" && selectedCollection ? (
            <div className="mt-5">
              <CollectionDetail collection={selectedCollection} onOpenItem={openCollectionItem} />
            </div>
          ) : null}

          <section className="section-shell-quiet mt-5 p-4">
            <p className="eyebrow">Curation Notes</p>
            <div className="mt-3 space-y-2 font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/72">
              <p>Daily guidance: {todaySurface.dailyGuidance.reason}</p>
              <p>Featured shabad: {todaySurface.featuredShabad.reason}</p>
              <p>Topic spotlight: {todaySurface.topicSpotlight.reason}</p>
              {todaySurface.inventory.readyForLaunch ? null : (
                <p>
                  Current seed inventory is below the launch threshold for a paid Learn product, so the rotation engine is allowed to widen to adjacent approved items instead of leaving empty slots.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "topics" && (
        <>
          <section className="section-shell mt-5 p-5">
            <SectionHeader
              eyebrow="Topics"
              title="Find the approved guide first"
              body="Search modern need-states and land on canonical Gurbani-based topic pages, not speculative synthesis."
            />
            <label className="section-shell-quiet flex items-center gap-3 rounded-[24px] px-4 py-3">
              <IconSearch size={18} className="text-ink/45 dark:text-dark-text/45" />
              <input
                aria-label="Search topic guides"
                value={searchParams.get("query") ?? ""}
                onChange={event => setParams({ tab: "topics", query: event.target.value, topic: null })}
                placeholder="Search stress, anger, ego, loneliness, purpose…"
                className="w-full bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink/40 dark:text-dark-text dark:placeholder:text-dark-text/40"
              />
            </label>
            {deferredQuery ? (
              <p className="mt-3 font-sans text-sm text-ink/65 dark:text-dark-text/65">
                {queryResolution.matchedBy === "synonym"
                  ? `Showing the canonical approved guide for “${deferredQuery}”.`
                  : queryResolution.matchedBy === "closest"
                    ? `No exact approved page matched “${deferredQuery}”, so the nearest approved guide is shown.`
                    : `Approved guide matched “${deferredQuery}”.`}
              </p>
            ) : null}
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {TOPIC_GUIDES.map(topic => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => openTopic(topic.id, "topics")}
                  className={`shrink-0 rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-300 ${
                    selectedTopic.id === topic.id
                      ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg"
                      : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"
                  }`}
                >
                  {topic.shortTitle}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-5">
            <TopicGuideDetail
              topic={selectedTopic}
              saved={learnState.savedItemIds.includes(selectedTopic.id)}
              onToggleSave={() => toggleSavedLearnItem(selectedTopic.id)}
              onOpenShabad={shabadId => openShabad(shabadId, "topics")}
            />
          </div>

          <section className="mt-5 grid gap-4">
            {TOPIC_GUIDES.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                active={selectedTopic.id === topic.id}
                onClick={() => openTopic(topic.id, "topics")}
              />
            ))}
          </section>
        </>
      )}

      {activeTab === "shabads" && (
        <>
          <section className="section-shell mt-5 p-5">
            <SectionHeader eyebrow="Shabads" title="Study the full context" body="Filter by theme, Guru, raag, difficulty, and whether you have already viewed or saved a deep dive." />

            <div className="grid gap-3 md:grid-cols-2">
              <select
                aria-label="Filter shabads by theme"
                value={shabadThemeFilter}
                onChange={event => setParams({ tab: "shabads", theme: event.target.value || null })}
                className="section-shell-quiet min-h-[48px] rounded-[20px] px-4 font-sans text-sm text-ink dark:bg-dark-surface dark:text-dark-text"
              >
                <option value="">All themes</option>
                {shabadThemes.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>

              <select
                aria-label="Filter shabads by Guru"
                value={shabadGuruFilter}
                onChange={event => setParams({ tab: "shabads", guru: event.target.value || null })}
                className="section-shell-quiet min-h-[48px] rounded-[20px] px-4 font-sans text-sm text-ink dark:bg-dark-surface dark:text-dark-text"
              >
                <option value="">All Gurus</option>
                {gurus.map(guru => (
                  <option key={guru} value={guru}>{guru}</option>
                ))}
              </select>

              <select
                aria-label="Filter shabads by raag"
                value={shabadRaagFilter}
                onChange={event => setParams({ tab: "shabads", raag: event.target.value || null })}
                className="section-shell-quiet min-h-[48px] rounded-[20px] px-4 font-sans text-sm text-ink dark:bg-dark-surface dark:text-dark-text"
              >
                <option value="">All raags</option>
                {raags.map(raag => (
                  <option key={raag} value={raag}>{raag}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <select
                  aria-label="Filter shabads by difficulty"
                  value={shabadDifficultyFilter}
                  onChange={event => setParams({ tab: "shabads", difficulty: event.target.value || null })}
                  className="section-shell-quiet min-h-[48px] rounded-[20px] px-4 font-sans text-sm text-ink dark:bg-dark-surface dark:text-dark-text"
                >
                  <option value="">All depth</option>
                  <option value="beginner">Beginner</option>
                  <option value="growing">Growing</option>
                  <option value="deep">Deep</option>
                </select>
                <select
                  aria-label="Filter shabads by length"
                  value={shabadLengthFilter}
                  onChange={event => setParams({ tab: "shabads", length: event.target.value || null })}
                  className="section-shell-quiet min-h-[48px] rounded-[20px] px-4 font-sans text-sm text-ink dark:bg-dark-surface dark:text-dark-text"
                >
                  <option value="">All length</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setParams({ tab: "shabads", savedOnly: shabadSavedOnly ? null : "1" })}
                className={`rounded-full px-4 py-2 font-sans text-xs font-semibold ${shabadSavedOnly ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg" : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"}`}
              >
                Saved only
              </button>
              <button
                type="button"
                onClick={() => setParams({ tab: "shabads", completedOnly: shabadCompletedOnly ? null : "1" })}
                className={`rounded-full px-4 py-2 font-sans text-xs font-semibold ${shabadCompletedOnly ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg" : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"}`}
              >
                Viewed only
              </button>
            </div>
          </section>

          <div className="mt-5">
            <ShabadDetail
              shabad={selectedShabad}
              saved={learnState.savedItemIds.includes(selectedShabad.id)}
              onToggleSave={() => toggleSavedLearnItem(selectedShabad.id)}
            />
          </div>

          <section className="mt-5 grid gap-4">
            {filteredShabads.map(shabad => (
              <ShabadCard
                key={shabad.id}
                shabad={shabad}
                active={selectedShabad.id === shabad.id}
                completed={viewedIds.has(shabad.id)}
                saved={learnState.savedItemIds.includes(shabad.id)}
                onOpen={() => openShabad(shabad.id, "shabads")}
                onToggleSave={() => toggleSavedLearnItem(shabad.id)}
              />
            ))}
            {filteredShabads.length === 0 ? (
              <div className="section-shell-quiet rounded-[28px] p-5">
                <p className="eyebrow">No blank shelves</p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
                  No deep dives match the current filters. The approved library is still available if you widen the filters.
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {activeTab === "saved" && (
        <>
          <section className="section-shell mt-5 p-5">
            <SectionHeader eyebrow="Saved" title="Keep verses, topics, and shabads together" body="Everything saved inside Learn stays labelled by type so inspiration still leads back into context." />
          </section>

          <section className="mt-5 grid gap-4">
            {savedItems.length === 0 ? (
              <div className="section-shell-quiet rounded-[28px] p-5">
                <p className="eyebrow">Nothing saved yet</p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
                  Save a daily guidance entry, topic guide, or shabad deep dive and it will appear here with its type clearly labelled.
                </p>
              </div>
            ) : null}

            {savedItems.map(item => (
              <div key={item.id} className="section-shell rounded-[28px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{getLearnItemLabel(item.kind)}</p>
                    <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{item.title}</p>
                    <p className="mt-1 font-sans text-sm text-ink/58 dark:text-dark-text/58">{item.subtitle}</p>
                    <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">{item.detail}</p>
                  </div>
                  <SaveButton saved onClick={() => toggleSavedLearnItem(item.id)} label={item.title} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="chip-pill">{item.theme}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.kind === "topic-guide") {
                        openTopic(item.id, "saved")
                        return
                      }
                      if (item.kind === "shabad-deep-dive") {
                        openShabad(item.id, "saved")
                        return
                      }
                      if (item.kind === "collection") {
                        openCollection(item.id)
                        return
                      }
                      const guidance = DAILY_GUIDANCE_ENTRIES.find(entry => entry.id === item.id)
                      openShabad(guidance?.relatedShabadIds[0] ?? selectedShabad.id, "saved")
                    }}
                    className="inline-flex min-h-[40px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
                  >
                    Open {getLearnItemLabel(item.kind).toLowerCase()} <IconArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </section>

          {activeDetail === "topic" && selectedTopic ? (
            <div className="mt-5">
              <TopicGuideDetail
                topic={selectedTopic}
                saved={learnState.savedItemIds.includes(selectedTopic.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedTopic.id)}
                onOpenShabad={shabadId => openShabad(shabadId, "saved")}
              />
            </div>
          ) : null}

          {activeDetail === "shabad" && selectedShabad ? (
            <div className="mt-5">
              <ShabadDetail
                shabad={selectedShabad}
                saved={learnState.savedItemIds.includes(selectedShabad.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedShabad.id)}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
