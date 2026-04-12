import { startTransition, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  COLLECTION_BY_ID,
  DAILY_GUIDANCE_ENTRIES,
  SHABAD_DEEP_DIVES,
  SHABAD_DEEP_DIVE_BY_ID,
  TOPIC_GUIDES,
  TOPIC_GUIDE_BY_ID,
} from "../data/learnContent"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useLearningStore } from "../store/learning"
import { useLearnRailStore } from "../store/learnRail"
import { useLocaleStore } from "../store/locale"
import type {
  Collection,
  LearnContentKind,
  LearnDepthPreference,
  LearnTab,
  ShabadDeepDive,
  TopicGuide,
} from "../types"
import {
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconSearch,
} from "../components/icons"
import DisclosureSection from "../components/DisclosureSection"
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
import {
  buildLearnTabPath,
  getLearnDetailRailByKey,
  getLearnDetailRailKey,
  getLearnRouteScrollTargetId,
  LEARN_SUBSECTION_RAILS,
  LEARN_SURFACE_RAIL,
} from "../utils/learnRails"
import { getEditorialCopy } from "../content/editorialCopy"

const DEPTH_OPTIONS: Array<{ id: LearnDepthPreference; label: string; detail: string }> = [
  { id: "gentle", label: "Gentle", detail: "More accessible and immediate guidance." },
  { id: "balanced", label: "Balanced", detail: "Mix approachable reading with deeper study." },
  { id: "deep", label: "Deep", detail: "Favor denser study and slower reflection." },
]

const SHABAD_GURUS = Array.from(new Set(SHABAD_DEEP_DIVES.map(item => item.citation.guru)))
const SHABAD_RAAGS = Array.from(new Set(SHABAD_DEEP_DIVES.map(item => item.citation.raag)))
const SHABAD_THEMES = Array.from(new Set(SHABAD_DEEP_DIVES.flatMap(item => item.themes)))

function getPageCopy(editorial: ReturnType<typeof getEditorialCopy>): Record<LearnTab, { title: string; body: string }> {
  return {
    today: editorial?.learn.tabCopy.today ?? {
      title: "Today",
      body: "Daily Gurbani guidance, full-shabad study, and trusted topic pages drawn from approved source material.",
    },
    topics: editorial?.learn.tabCopy.topics ?? {
      title: "Topics",
      body: "Search modern struggles and open canonical Gurbani guidance without open-ended interpretation.",
    },
    shabads: editorial?.learn.tabCopy.shabads ?? {
      title: "Shabads",
      body: "Study full shabad context with filters for theme, Guru, raag, and depth.",
    },
    saved: editorial?.learn.tabCopy.saved ?? {
      title: "Saved",
      body: "Return to the verses, topics, and shabads you marked for deeper study.",
    },
  }
}

function isTab(value: string | null): value is LearnTab {
  return value === "today" || value === "topics" || value === "shabads" || value === "saved"
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
        <p className="mt-2 font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">{body}</p>
      ) : null}
    </div>
  )
}

function InlineRailChip({
  label,
  active,
  onClick,
  testId,
}: {
  label: string
  active: boolean
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`shrink-0 rounded-full border px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 ${
        active
          ? "border-gold/30 bg-white/92 text-saffron shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_rgba(224,154,70,0.12)] dark:border-gold/20 dark:bg-dark-surface/92 dark:text-gold-light dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.12),0_12px_26px_rgba(0,0,0,0.25)]"
          : "border-sand/15 bg-white/72 text-ink/72 hover:text-ink/86 dark:border-dark-text/12 dark:bg-dark-card/82 dark:text-dark-text/74 dark:hover:text-dark-text/88"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function InlineRail({
  chips,
  activeTargetId,
  onSelect,
  testId,
  className = "mt-5 flex gap-2 overflow-x-auto pb-1",
}: {
  chips: Array<{ id: string; label: string; targetId?: string }>
  activeTargetId?: string | null
  onSelect: (chipId: string) => void
  testId: string
  className?: string
}) {
  return (
    <div className={className} data-testid={testId}>
      {chips.map(chip => (
        <InlineRailChip
          key={chip.id}
          label={chip.label}
          active={activeTargetId === (chip.targetId ?? chip.id)}
          onClick={() => onSelect(chip.id)}
          testId={chip.id}
        />
      ))}
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

function InventoryMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="section-shell-quiet rounded-[24px] px-4 py-4">
      <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/60 dark:text-dark-text/60">
        {label}
      </p>
      <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{value}</p>
    </div>
  )
}

function CollectionMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="section-shell-quiet rounded-[22px] px-4 py-4">
      <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/60 dark:text-dark-text/60">
        {label}
      </p>
      <p className="mt-2 font-display text-[1.65rem] leading-none text-ink dark:text-dark-text">{value}</p>
    </div>
  )
}

function SpotlightButton({
  eyebrow,
  title,
  body,
  active,
  onClick,
}: {
  eyebrow: string
  title: string
  body: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[28px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
      }`}
    >
      <p className="eyebrow">{eyebrow}</p>
      <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{title}</p>
      <p className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62">{body}</p>
    </button>
  )
}

function TopicDoorCard({
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
      aria-pressed={active}
      className={`rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
      }`}
    >
      <p className="eyebrow">{topic.shortTitle}</p>
      <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{topic.issueStatement}</p>
    </button>
  )
}

function DailyGuidanceDetail({
  guidanceTitle,
  summary,
  takeaway,
  lifeApplication,
  excerpt,
  shabad,
  saved,
  onToggleSave,
  onOpenShabad,
}: {
  guidanceTitle: string
  summary: string
  takeaway: string
  lifeApplication: string
  excerpt: LearnResolvedExcerpt
  shabad: ShabadDeepDive
  saved: boolean
  onToggleSave: () => void
  onOpenShabad: () => void
}) {
  return (
    <section className="section-shell p-5" data-testid="learn-detail-guidance" data-ai-surface="learn-guidance-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Today's Guidance</p>
          <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{guidanceTitle}</h3>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{summary}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={guidanceTitle} />
      </div>

      <div
        className="mt-5"
        id="learn-detail-guidance-excerpt"
        data-learn-anchor
        data-learn-detail-anchor="true"
        data-ai-anchor="guidance-excerpt"
      >
        <ExcerptBlock excerpt={excerpt} shabad={shabad} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div
          className="section-shell-quiet p-4"
          id="learn-detail-guidance-takeaway"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="guidance-takeaway"
        >
          <p className="eyebrow">Takeaway</p>
          <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">{takeaway}</p>
        </div>
        <div
          className="section-shell-quiet p-4"
          id="learn-detail-guidance-life"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="guidance-life"
        >
          <p className="eyebrow">Life Application</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{lifeApplication}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenShabad}
        className="mt-5 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
      >
        Open the full shabad <IconArrowRight size={16} />
      </button>
    </section>
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
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
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
    <section className="section-shell p-5" data-testid="learn-detail-topic" data-ai-surface="learn-topic-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">What Guru Says About…</p>
          <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{topic.title}</h3>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{topic.issueStatement}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={topic.shortTitle} />
      </div>

      <div
        className="mt-5 section-shell-quiet p-4"
        id="learn-detail-topic-insight"
        data-learn-anchor
        data-learn-detail-anchor="true"
        data-ai-anchor="topic-insight"
      >
        <p className="eyebrow">Central Insight</p>
        <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">{topic.centralInsight}</p>
      </div>

      <div
        className="mt-5 space-y-4"
        id="learn-detail-topic-excerpts"
        data-learn-anchor
        data-learn-detail-anchor="true"
        data-ai-anchor="topic-excerpts"
      >
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
        <div
          className="section-shell-quiet p-4"
          id="learn-detail-topic-reflection"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="topic-reflection"
        >
          <p className="eyebrow">Reflection</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{topic.practicalReflection}</p>
        </div>
        <div
          className="section-shell-quiet p-4"
          id="learn-detail-topic-action"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="topic-action"
        >
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
    <div className={`rounded-[30px] border px-4 py-4 transition-all duration-300 ${active ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card" : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"}`}>
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
    <section className="section-shell p-5" data-testid="learn-detail-shabad" data-ai-surface="learn-shabad-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Featured Shabad</p>
          <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{shabad.title}</h3>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/68">{shabad.subtitle}</p>
        </div>
        <SaveButton saved={saved} onClick={onToggleSave} label={shabad.title} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2" id="learn-detail-shabad-summary" data-learn-anchor data-learn-detail-anchor="true" data-ai-anchor="shabad-summary">
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

      <div
        className="mt-5 section-shell-quiet p-4"
        id="learn-detail-shabad-structure"
        data-learn-anchor
        data-learn-detail-anchor="true"
        data-ai-anchor="shabad-structure"
      >
        <p className="eyebrow">Structure</p>
        <div className="mt-3 space-y-3">
          {shabad.structure.map(item => (
            <p key={item} className="font-sans text-sm leading-6 text-ink dark:text-dark-text">{item}</p>
          ))}
        </div>
      </div>

      <div
        className="mt-5 section-shell-quiet p-4"
        id="learn-detail-shabad-lines"
        data-learn-anchor
        data-learn-detail-anchor="true"
        data-ai-anchor="shabad-lines"
      >
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
      className={`w-[17.5rem] shrink-0 snap-start rounded-[30px] border px-4 py-4 text-left transition-all duration-300 ${
        active
          ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
          : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
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
  const guidanceItems = collection.items.filter(item => item.kind === "daily-guidance")
  const topicItems = collection.items.filter(item => item.kind === "topic-guide")
  const shabadItems = collection.items.filter(item => item.kind === "shabad-deep-dive")

  return (
    <section className="section-shell p-5" data-testid="learn-detail-collection" data-ai-surface="learn-collection-detail">
      <div
        className="grid gap-5 lg:grid-cols-[1.15fr,0.85fr]"
        id="learn-detail-collection-overview"
        data-learn-anchor
        data-learn-detail-anchor="true"
        data-ai-anchor="collection-overview"
      >
        <div>
          <SectionHeader eyebrow="Collection" title={collection.title} body={collection.description} />
          <ExcerptBlock excerpt={heroExcerpt} shabad={heroExcerpt.deepDive} />
        </div>

        <div className="space-y-4">
          <div className="section-shell-quiet p-4">
            <p className="eyebrow">{collection.durationLabel}</p>
            <p className="mt-2 font-display text-[1.7rem] leading-none text-ink dark:text-dark-text">
              {collection.subtitle}
            </p>
            <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
              This journey is arranged as a deliberate sequence instead of a loose pile of links.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <CollectionMetric label="Guidance" value={guidanceItems.length} />
              <CollectionMetric label="Topics" value={topicItems.length} />
              <CollectionMetric label="Shabads" value={shabadItems.length} />
            </div>
          </div>

          <div className="section-shell-quiet p-4">
            <p className="eyebrow">Themes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {collection.themes.map(theme => (
                <span key={theme} className="chip-pill">{theme}</span>
              ))}
            </div>
          </div>

          <div className="section-shell-quiet p-4">
            <p className="eyebrow">What This Sequence Does</p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
              Begin with a shorter guidance opening, let the topic pages name the inner work plainly, and then move into full shabad study without losing the thread.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div
          className="section-shell-quiet p-4"
          id="learn-detail-collection-guidance"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="collection-guidance"
        >
          <p className="eyebrow">Guidance Openings</p>
          <div className="mt-3 space-y-3">
            {guidanceItems.map(item => {
              const guidance = DAILY_GUIDANCE_ENTRIES.find(entry => entry.id === item.id)
              if (!guidance) return null

              return (
                <button
                  key={guidance.id}
                  type="button"
                  onClick={() => onOpenItem("daily-guidance", guidance.id)}
                  className="w-full rounded-[20px] bg-white/70 px-4 py-4 text-left dark:!bg-dark-card"
                >
                  <p className="eyebrow">Daily guidance</p>
                  <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    {guidance.title}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                    {guidance.summary}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="section-shell-quiet p-4"
          id="learn-detail-collection-topics"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="collection-topics"
        >
          <p className="eyebrow">Topic Guides</p>
          <div className="mt-3 space-y-3">
            {topicItems.map(item => {
              const topic = TOPIC_GUIDE_BY_ID[item.id]
              if (!topic) return null

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onOpenItem("topic-guide", topic.id)}
                  className="w-full rounded-[20px] bg-white/70 px-4 py-4 text-left dark:!bg-dark-card"
                >
                  <p className="eyebrow">Topic guide</p>
                  <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    {topic.shortTitle}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                    {topic.centralInsight}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="section-shell-quiet p-4"
          id="learn-detail-collection-shabads"
          data-learn-anchor
          data-learn-detail-anchor="true"
          data-ai-anchor="collection-shabads"
        >
          <p className="eyebrow">Full Shabad Study</p>
          <div className="mt-3 space-y-3">
            {shabadItems.map(item => {
              const shabad = SHABAD_DEEP_DIVE_BY_ID[item.id]
              if (!shabad) return null

              return (
                <button
                  key={shabad.id}
                  type="button"
                  onClick={() => onOpenItem("shabad-deep-dive", shabad.id)}
                  className="w-full rounded-[20px] bg-white/70 px-4 py-4 text-left dark:!bg-dark-card"
                >
                  <p className="eyebrow">Shabad deep dive</p>
                  <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    {shabad.title}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                    {shabad.summary}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Learn() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const topicSearchInputRef = useRef<HTMLInputElement | null>(null)
  const lastRouteScrollKeyRef = useRef<string | null>(null)
  const locale = useLocaleStore(state => state.locale)
  const editorial = getEditorialCopy(locale) ?? getEditorialCopy("en")
  const now = useCurrentTime()
  const dayStamp = toLocalDayStamp(new Date(now))
  const viewedItems = useLearningStore(state => state.learnState.viewedItems)
  const savedItemIds = useLearningStore(state => state.learnState.savedItemIds)
  const recentTopicIds = useLearningStore(state => state.learnState.recentTopicIds)
  const activeCollectionId = useLearningStore(state => state.learnState.activeCollectionId)
  const depthPreference = useLearningStore(state => state.learnState.depthPreference)
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)
  const toggleSavedLearnItem = useLearningStore(state => state.toggleSavedLearnItem)
  const setActiveLearnCollection = useLearningStore(state => state.setActiveLearnCollection)
  const setLearnDepthPreference = useLearningStore(state => state.setLearnDepthPreference)
  const setActiveSectionId = useLearnRailStore(state => state.setActiveSectionId)
  const setActiveDetailSectionId = useLearnRailStore(state => state.setActiveDetailSectionId)
  const activeSectionId = useLearnRailStore(state => state.activeSectionId)
  const activeDetailSectionId = useLearnRailStore(state => state.activeDetailSectionId)

  const activeTab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as LearnTab) : "today"
  const pageCopy = getPageCopy(editorial)[activeTab]
  const deferredQuery = useDeferredValue(searchParams.get("query") ?? "")
  const learnStateSnapshot = useMemo(
    () => ({
      viewedItems,
      savedItemIds,
      recentTopicIds,
      activeCollectionId,
      depthPreference,
    }),
    [activeCollectionId, depthPreference, recentTopicIds, savedItemIds, viewedItems]
  )
  const todaySurface = useMemo(
    () => getTodayLearnSurface(dayStamp, learnStateSnapshot),
    [dayStamp, learnStateSnapshot]
  )
  const queryResolution = useMemo(() => resolveTopicGuide(deferredQuery), [deferredQuery])

  const selectedTopic =
    TOPIC_GUIDE_BY_ID[searchParams.get("topic") ?? ""]
    ?? (deferredQuery ? queryResolution.topic : null)
    ?? todaySurface.topicSpotlight.item
  const requestedShabad =
    SHABAD_DEEP_DIVE_BY_ID[searchParams.get("shabad") ?? ""]
    ?? todaySurface.featuredShabad.item
  const selectedCollection =
    COLLECTION_BY_ID[searchParams.get("collection") ?? ""]
    ?? (activeCollectionId ? COLLECTION_BY_ID[activeCollectionId] : null)
    ?? todaySurface.exploreCollections[0]

  const shabadThemeFilter = searchParams.get("theme") ?? ""
  const shabadGuruFilter = searchParams.get("guru") ?? ""
  const shabadRaagFilter = searchParams.get("raag") ?? ""
  const shabadDifficultyFilter = searchParams.get("difficulty") ?? ""
  const shabadLengthFilter = searchParams.get("length") ?? ""
  const shabadSavedOnly = searchParams.get("savedOnly") === "1"
  const shabadCompletedOnly = searchParams.get("completedOnly") === "1"

  const filteredShabads = useMemo(
    () => filterShabadDeepDives(
      {
        theme: shabadThemeFilter || undefined,
        guru: shabadGuruFilter || undefined,
        raag: shabadRaagFilter || undefined,
        difficulty: shabadDifficultyFilter || undefined,
        lengthBand: shabadLengthFilter || undefined,
        savedOnly: shabadSavedOnly,
        completedOnly: shabadCompletedOnly,
      },
      learnStateSnapshot
    ),
    [
      dayStamp,
      learnStateSnapshot,
      shabadCompletedOnly,
      shabadDifficultyFilter,
      shabadGuruFilter,
      shabadLengthFilter,
      shabadRaagFilter,
      shabadSavedOnly,
      shabadThemeFilter,
    ]
  )

  const selectedShabad =
    activeTab === "shabads"
      ? filteredShabads.find(item => item.id === requestedShabad.id) ?? filteredShabads[0] ?? null
      : requestedShabad

  const savedItems = useMemo(() => getLearnSavedItems(savedItemIds), [savedItemIds])
  const viewedIds = useMemo(() => new Set(viewedItems.map(item => item.itemId)), [viewedItems])
  const continueLearning = todaySurface.continueLearning
  const activeDetail = searchParams.get("detail")
  const activeTopicParam = searchParams.get("topic")
  const activeShabadParam = searchParams.get("shabad")
  const activeCollectionParam = searchParams.get("collection")
  const activeDepthOption = DEPTH_OPTIONS.find(option => option.id === depthPreference) ?? DEPTH_OPTIONS[1]
  const hasActiveShabadFilters = Boolean(
    shabadThemeFilter
    || shabadGuruFilter
    || shabadRaagFilter
    || shabadDifficultyFilter
    || shabadLengthFilter
    || shabadSavedOnly
    || shabadCompletedOnly
  )
  const inventorySummary = `${todaySurface.inventory.dailyGuidance} guidance entries, ${todaySurface.inventory.shabadDeepDives} deep dives, and ${todaySurface.inventory.crossLinks} live cross-links are visible right now.`
  const activeSubsectionRail = LEARN_SUBSECTION_RAILS[activeTab]
  const activeDetailRailKey =
    activeTab === "topics"
      ? "topics-topic"
      : activeTab === "shabads" && selectedShabad
      ? "shabads-shabad"
      : getLearnDetailRailKey(activeTab, activeDetail)
  const activeDetailRail = getLearnDetailRailByKey(activeDetailRailKey)
  const routeScrollTargetId = getLearnRouteScrollTargetId({
    tab: activeTab,
    detail: activeDetail,
    hasTopicParam: Boolean(activeTopicParam),
    hasShabadParam: Boolean(activeShabadParam),
    hasCollectionParam: Boolean(activeCollectionParam),
  })
  const routeScrollKey = [
    activeTab,
    activeDetail ?? "",
    activeTopicParam ?? "",
    activeShabadParam ?? "",
    activeCollectionParam ?? "",
  ].join("|")
  const showInlineSubsectionRail = activeTab !== "saved" && activeSubsectionRail.length > 0
  const showInlineDetailRail = activeDetailRail.length > 0

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

  function scrollToAnchor(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function navigateToLearnSurface(tab: LearnTab) {
    navigate(buildLearnTabPath(tab))
  }

  function handleDetailRailSelect(chipId: string) {
    const target = activeDetailRail.find(item => item.id === chipId)
    if (target) {
      scrollToAnchor(target.targetId)
    }
  }

  function focusArchiveSearch() {
    globalThis.requestAnimationFrame(() => {
      topicSearchInputRef.current?.focus()
    })
  }

  function openTodayGuidance() {
    setParams({
      tab: "today",
      query: null,
      topic: null,
      shabad: null,
      collection: null,
      detail: "guidance",
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    })
  }

  function openTodayTopic(topicId: string) {
    setParams({
      tab: "today",
      query: null,
      topic: topicId,
      shabad: null,
      collection: null,
      detail: "topic",
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    })
  }

  function openTodayShabad(shabadId: string) {
    setParams({
      tab: "today",
      query: null,
      topic: null,
      shabad: shabadId,
      collection: null,
      detail: "shabad",
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    })
  }

  function openTopic(topicId: string, tab: LearnTab = "topics") {
    setParams({
      tab,
      topic: topicId,
      query: null,
      shabad: null,
      collection: null,
      detail: "topic",
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    })
  }

  function openShabad(
    shabadId: string,
    tab: LearnTab = "shabads",
    options?: { preserveFilters?: boolean }
  ) {
    setParams({
      tab,
      shabad: shabadId,
      topic: null,
      collection: null,
      detail: "shabad",
      query: null,
      theme: options?.preserveFilters ? shabadThemeFilter || null : null,
      guru: options?.preserveFilters ? shabadGuruFilter || null : null,
      raag: options?.preserveFilters ? shabadRaagFilter || null : null,
      difficulty: options?.preserveFilters ? shabadDifficultyFilter || null : null,
      length: options?.preserveFilters ? shabadLengthFilter || null : null,
      savedOnly: options?.preserveFilters ? (shabadSavedOnly ? "1" : null) : null,
      completedOnly: options?.preserveFilters ? (shabadCompletedOnly ? "1" : null) : null,
    })
  }

  function openCollection(collectionId: string) {
    setActiveLearnCollection(collectionId)
    setParams({
      tab: "today",
      query: null,
      topic: null,
      shabad: null,
      collection: collectionId,
      detail: "collection",
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    })
  }

  function openCollectionItem(kind: LearnContentKind, itemId: string) {
    if (kind === "topic-guide") {
      openTodayTopic(itemId)
      return
    }

    if (kind === "shabad-deep-dive") {
      openTodayShabad(itemId)
      return
    }

    if (kind === "daily-guidance") {
      const guidance = DAILY_GUIDANCE_ENTRIES.find(item => item.id === itemId)
      openTodayShabad(guidance?.relatedShabadIds[0] ?? todaySurface.featuredShabad.item.id)
    }
  }

  function handleHeroSearchChange(value: string) {
    setParams({
      tab: value ? "topics" : "today",
      query: value || null,
      topic: null,
      shabad: null,
      collection: null,
      detail: value ? "topic" : null,
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    })
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

  useLayoutEffect(() => {
    if (lastRouteScrollKeyRef.current === routeScrollKey) return
    lastRouteScrollKeyRef.current = routeScrollKey

    if (routeScrollTargetId) {
      document.getElementById(routeScrollTargetId)?.scrollIntoView({
        behavior: "auto",
        block: "start",
      })
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [routeScrollKey, routeScrollTargetId])

  useEffect(() => {
    setActiveSectionId(activeSubsectionRail[0]?.targetId ?? null)
    setActiveDetailSectionId(activeDetailRail[0]?.targetId ?? null)
  }, [activeDetailRail, activeSubsectionRail, setActiveDetailSectionId, setActiveSectionId])

  useEffect(() => {
    const sectionElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-learn-section-anchor="true"]')
    )
    const detailElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-learn-detail-anchor="true"]')
    )

    const updateSection = (entries: IntersectionObserverEntry[]) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)
      const target = visible[0]?.target as HTMLElement | undefined
      if (target?.id) {
        setActiveSectionId(target.id)
      }
    }

    const updateDetail = (entries: IntersectionObserverEntry[]) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)
      const target = visible[0]?.target as HTMLElement | undefined
      if (target?.id) {
        setActiveDetailSectionId(target.id)
      }
    }

    const sectionObserver = new IntersectionObserver(updateSection, {
      root: null,
      rootMargin: '-15% 0px -55% 0px',
      threshold: 0.15,
    })
    const detailObserver = new IntersectionObserver(updateDetail, {
      root: null,
      rootMargin: '-18% 0px -52% 0px',
      threshold: 0.15,
    })

    sectionElements.forEach(element => sectionObserver.observe(element))
    detailElements.forEach(element => detailObserver.observe(element))

    return () => {
      sectionObserver.disconnect()
      detailObserver.disconnect()
    }
  }, [activeDetail, activeTab, setActiveDetailSectionId, setActiveSectionId])

  useEffect(() => {
    const state = (location.state as { focusSearch?: boolean } | null) ?? null
    if (!state?.focusSearch) return

    focusArchiveSearch()
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      { replace: true, state: null }
    )
  }, [location.pathname, location.search, location.state, navigate])

  return (
    <div className="page-shell animate-fade-in" data-testid="page-learn" data-page="learn">
      <div className="mb-6">
        <p className="eyebrow">{editorial?.learn.eyebrow ?? "Learn"}</p>
        <h1 className="mt-2 font-display text-5xl leading-none text-ink dark:text-dark-text">{pageCopy.title}</h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/76 dark:text-dark-text/78">
          {pageCopy.body}
        </p>
      </div>

      <section className="hero-surface p-5" aria-labelledby="learn-hero-title" data-testid="learn-hero">
        <p className="eyebrow">{editorial?.learn.heroEyebrow ?? "Archive"}</p>
        <h2 id="learn-hero-title" className="mt-2 font-display text-[2.45rem] leading-none text-ink dark:text-dark-text">
          {editorial?.learn.heroTitle ?? "Find the guide that meets the question."}
        </h2>
        <p className="mt-3 max-w-[36ch] font-sans text-sm leading-6 text-ink/76 dark:text-dark-text/78">
          {editorial?.learn.heroBody}
        </p>

        <label className="section-shell mt-5 flex items-center gap-3 rounded-[26px] px-4 py-3">
          <IconSearch size={18} className="text-ink/60 dark:text-dark-text/60" />
          <input
            ref={topicSearchInputRef}
            id="learn-archive-search"
            name="learn-archive-search"
            type="search"
            aria-label="Search the Learn archive"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            value={searchParams.get("query") ?? ""}
            onChange={event => handleHeroSearchChange(event.target.value)}
            placeholder={editorial?.learn.heroSearchPlaceholder ?? "Search the archive by question, feeling, or theme…"}
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink/40 dark:text-dark-text dark:placeholder:text-dark-text/40"
            data-testid="learn-archive-search"
          />
        </label>
        <p className="mt-3 font-sans text-xs leading-5 text-ink/60 dark:text-dark-text/62">
          {editorial?.learn.heroSearchHint}
        </p>
      </section>

      <InlineRail
        chips={LEARN_SURFACE_RAIL.map(rail => ({
          id: `learn-surface-${rail.id}`,
          label: rail.label,
          targetId: rail.id,
        }))}
        activeTargetId={activeTab}
        onSelect={chipId => navigateToLearnSurface(chipId.replace("learn-surface-", "") as LearnTab)}
        testId="learn-surface-rail"
      />

      <DisclosureSection
        storageKey="learn-archive-public"
        eyebrow={editorial?.learn.proofEyebrow ?? "Inventory"}
        title={editorial?.learn.proofTitle ?? "The library is growing in public."}
        summary="Open to inspect the live archive counts and cross-link depth."
        badge="Live"
        defaultOpen={false}
        className="section-shell mt-5 p-5"
        bodyClassName="mt-5"
        titleClassName="font-display text-[2rem] leading-none text-ink dark:text-dark-text"
        sectionId="learn-inventory"
        testId="learn-inventory"
      >
        <p className="font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
          {editorial?.learn.proofBody ?? inventorySummary}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <InventoryMetric
            label={editorial?.learn.inventoryLabels.dailyGuidance ?? "Daily guidance entries"}
            value={todaySurface.inventory.dailyGuidance}
          />
          <InventoryMetric
            label={editorial?.learn.inventoryLabels.shabadDeepDives ?? "Full shabad deep dives"}
            value={todaySurface.inventory.shabadDeepDives}
          />
          <InventoryMetric
            label={editorial?.learn.inventoryLabels.topicGuides ?? "Topical answer pages"}
            value={todaySurface.inventory.topicGuides}
          />
          <InventoryMetric
            label={editorial?.learn.inventoryLabels.collections ?? "Curated collections"}
            value={todaySurface.inventory.collections}
          />
          <InventoryMetric
            label={editorial?.learn.inventoryLabels.crossLinks ?? "Cross-links"}
            value={todaySurface.inventory.crossLinks}
          />
        </div>
        <p className="mt-4 font-sans text-xs leading-5 text-ink/65 dark:text-dark-text/65">
          {editorial?.learn.proofFooter}
        </p>
      </DisclosureSection>

      <DisclosureSection
        storageKey="learn-reading-depth"
        eyebrow="Reading Depth"
        title={activeDepthOption.label}
        summary="Open to change whether shabads surface more accessible guidance or denser study first."
        badge="Current"
        defaultOpen={false}
        sectionId="learn-reading-depth"
        testId="learn-reading-depth"
      >
        <p className="font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
          {activeDepthOption.detail}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {DEPTH_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setLearnDepthPreference(option.id)}
              aria-pressed={depthPreference === option.id}
              className={`rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
                depthPreference === option.id
                  ? "border-saffron/30 bg-white dark:border-gold/25 dark:bg-dark-card"
                  : "border-sand/12 bg-parchment-low/70 dark:border-dark-text/10 dark:!bg-dark-surface"
              }`}
            >
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{option.label}</p>
              <p className="mt-1 font-sans text-xs leading-5 text-ink/60 dark:text-dark-text/60">{option.detail}</p>
            </button>
          ))}
        </div>
      </DisclosureSection>

      {showInlineSubsectionRail ? (
        <InlineRail
          chips={activeSubsectionRail}
          activeTargetId={activeSectionId}
          onSelect={chipId => {
            const target = activeSubsectionRail.find(item => item.id === chipId)
            if (target) {
              scrollToAnchor(target.targetId)
            }
          }}
          testId="learn-subsection-rail"
        />
      ) : null}

      {activeTab === "today" && (
        <>
          <section className="section-shell mt-5 p-5">
            <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <div id="learn-today-continue" data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Continue Learning"
                  title={continueLearning.title}
                  body={editorial?.learn.compactContinueBody ?? continueLearning.body}
                />
                {continueLearning.kind === "collection" ? (
                  <button
                    type="button"
                    onClick={() => openCollection(continueLearning.collection.id)}
                    className="section-shell-quiet w-full rounded-[28px] px-5 py-5 text-left"
                  >
                    <p className="eyebrow">{continueLearning.collection.durationLabel}</p>
                    <p className="mt-2 font-display text-[1.8rem] leading-none text-ink dark:text-dark-text">
                      {continueLearning.collection.subtitle}
                    </p>
                    <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                      {continueLearning.collection.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {continueLearning.collection.themes.map(theme => (
                        <span key={theme} className="chip-pill">{theme}</span>
                      ))}
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openTodayTopic(continueLearning.topic.id)}
                    className="section-shell-quiet w-full rounded-[28px] px-5 py-5 text-left"
                  >
                    <p className="eyebrow">Topic guide</p>
                    <p className="mt-2 font-display text-[1.8rem] leading-none text-ink dark:text-dark-text">
                      {continueLearning.topic.shortTitle}
                    </p>
                    <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                      {continueLearning.topic.centralInsight}
                    </p>
                  </button>
                )}
              </div>

              <div id="learn-today-surface" data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Today in the archive"
                  title="Open one doorway, then go deep."
                  body={editorial?.learn.detailBody}
                />
                <div className="grid gap-3">
                  <SpotlightButton
                    eyebrow="Today's Guidance"
                    title={todaySurface.dailyGuidance.item.title}
                    body={editorial?.learn.compactGuidanceBody ?? todaySurface.dailyGuidance.item.summary}
                    active={activeDetail === "guidance"}
                    onClick={openTodayGuidance}
                  />
                  <SpotlightButton
                    eyebrow="Featured Shabad"
                    title={todaySurface.featuredShabad.item.title}
                    body={editorial?.learn.compactShabadBody ?? todaySurface.featuredShabad.item.whyItMatters}
                    active={activeDetail === "shabad"}
                    onClick={() => openTodayShabad(todaySurface.featuredShabad.item.id)}
                  />
                  <SpotlightButton
                    eyebrow="Topic Spotlight"
                    title={todaySurface.topicSpotlight.item.title}
                    body={editorial?.learn.compactTopicBody ?? todaySurface.topicSpotlight.item.centralInsight}
                    active={activeDetail === "topic"}
                    onClick={() => openTodayTopic(todaySurface.topicSpotlight.item.id)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="section-shell mt-5 p-5">
            <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
              <div className="min-w-0" id="learn-today-doors" data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Open by State"
                  title="A few stronger doors into the archive."
                  body="These topic doors rotate from the larger library so the first scroll stays edited instead of endless."
                />
                <div className="grid gap-3">
                  {todaySurface.themeRail.map(topic => (
                    <TopicDoorCard
                      key={topic.id}
                      topic={topic}
                      active={activeDetail === "topic" && selectedTopic.id === topic.id}
                      onClick={() => openTodayTopic(topic.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0" id="learn-today-paths" data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Editor's Paths"
                  title="Collections worth opening next."
                  body={editorial?.learn.compactCollectionsBody ?? "Structured paths that begin with short guidance and open into deeper study."}
                />
                <div className="min-w-0 snap-x snap-mandatory flex gap-4 overflow-x-auto pb-1 pr-1">
                  {todaySurface.featuredCollections.map(collection => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      active={activeDetail === "collection" && selectedCollection.id === collection.id}
                      onOpen={() => openCollection(collection.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {activeDetail === "guidance" ? (
            <div className="mt-5" id="learn-today-detail" data-learn-anchor data-learn-section-anchor="true">
              {showInlineDetailRail ? (
                <InlineRail
                  chips={activeDetailRail}
                  activeTargetId={activeDetailSectionId}
                  onSelect={handleDetailRailSelect}
                  testId="learn-detail-rail"
                  className="mb-4 flex gap-2 overflow-x-auto pb-1"
                />
              ) : null}
              <DailyGuidanceDetail
                guidanceTitle={todaySurface.dailyGuidance.item.title}
                summary={todaySurface.dailyGuidance.item.summary}
                takeaway={todaySurface.dailyGuidance.item.takeaway}
                lifeApplication={todaySurface.dailyGuidance.item.lifeApplication}
                excerpt={resolveLineReference(todaySurface.dailyGuidance.item.source)}
                shabad={resolveLineReference(todaySurface.dailyGuidance.item.source).deepDive}
                saved={savedItemIds.includes(todaySurface.dailyGuidance.item.id)}
                onToggleSave={() => toggleSavedLearnItem(todaySurface.dailyGuidance.item.id)}
                onOpenShabad={() => openTodayShabad(todaySurface.dailyGuidance.item.relatedShabadIds[0] ?? todaySurface.featuredShabad.item.id)}
              />
            </div>
          ) : null}

          {activeDetail === "topic" ? (
            <div className="mt-5" id="learn-today-detail" data-learn-anchor data-learn-section-anchor="true">
              {showInlineDetailRail ? (
                <InlineRail
                  chips={activeDetailRail}
                  activeTargetId={activeDetailSectionId}
                  onSelect={handleDetailRailSelect}
                  testId="learn-detail-rail"
                  className="mb-4 flex gap-2 overflow-x-auto pb-1"
                />
              ) : null}
              <TopicGuideDetail
                topic={selectedTopic}
                saved={savedItemIds.includes(selectedTopic.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedTopic.id)}
                onOpenShabad={openTodayShabad}
              />
            </div>
          ) : null}

          {activeDetail === "shabad" && selectedShabad ? (
            <div className="mt-5" id="learn-today-detail" data-learn-anchor data-learn-section-anchor="true">
              {showInlineDetailRail ? (
                <InlineRail
                  chips={activeDetailRail}
                  activeTargetId={activeDetailSectionId}
                  onSelect={handleDetailRailSelect}
                  testId="learn-detail-rail"
                  className="mb-4 flex gap-2 overflow-x-auto pb-1"
                />
              ) : null}
              <ShabadDetail
                shabad={selectedShabad}
                saved={savedItemIds.includes(selectedShabad.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedShabad.id)}
              />
            </div>
          ) : null}

          {activeDetail === "collection" && selectedCollection ? (
            <div className="mt-5" id="learn-today-detail" data-learn-anchor data-learn-section-anchor="true">
              {showInlineDetailRail ? (
                <InlineRail
                  chips={activeDetailRail}
                  activeTargetId={activeDetailSectionId}
                  onSelect={handleDetailRailSelect}
                  testId="learn-detail-rail"
                  className="mb-4 flex gap-2 overflow-x-auto pb-1"
                />
              ) : null}
              <CollectionDetail collection={selectedCollection} onOpenItem={openCollectionItem} />
            </div>
          ) : null}
        </>
      )}

      {activeTab === "topics" && (
        <>
          <section className="section-shell mt-5 p-5" id="learn-topics-search" data-learn-anchor data-learn-section-anchor="true">
            <SectionHeader
              eyebrow="Topics"
              title={editorial?.learn.topicsIntroTitle ?? "Find the approved guide"}
              body={editorial?.learn.topicsIntroBody ?? "Search modern struggles and land on canonical Gurbani-based topic pages, not improvised interpretation."}
            />
            <label className="section-shell-quiet flex items-center gap-3 rounded-[24px] px-4 py-3">
              <IconSearch size={18} className="text-ink/60 dark:text-dark-text/60" />
              <input
                ref={topicSearchInputRef}
                id="learn-topic-search"
                name="learn-topic-search"
                type="search"
                aria-label="Search topic guides"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                inputMode="search"
                value={searchParams.get("query") ?? ""}
                onChange={event => setParams({ tab: "topics", query: event.target.value, topic: null })}
                placeholder={editorial?.learn.topicsSearchPlaceholder ?? "Search stress, anger, ego, loneliness, purpose…"}
                className="min-w-0 flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink/40 dark:text-dark-text dark:placeholder:text-dark-text/40"
              />
            </label>
            {deferredQuery ? (
              <p className="mt-3 font-sans text-sm text-ink/72 dark:text-dark-text/74">
                {queryResolution.matchedBy === "synonym"
                  ? `Showing the canonical approved guide for “${deferredQuery}”.`
                  : queryResolution.matchedBy === "no-match"
                    ? "No matching topic found - showing today's spotlight."
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

          <div className="mt-5" id="learn-topics-current-guide" data-learn-anchor data-learn-section-anchor="true">
            {showInlineDetailRail ? (
              <InlineRail
                chips={activeDetailRail}
                activeTargetId={activeDetailSectionId}
                onSelect={handleDetailRailSelect}
                testId="learn-detail-rail"
                className="mb-4 flex gap-2 overflow-x-auto pb-1"
              />
            ) : null}
            <TopicGuideDetail
              topic={selectedTopic}
              saved={savedItemIds.includes(selectedTopic.id)}
              onToggleSave={() => toggleSavedLearnItem(selectedTopic.id)}
              onOpenShabad={shabadId => openShabad(shabadId, "shabads")}
            />
          </div>

          <section className="mt-5 grid gap-4" id="learn-topics-all" data-learn-anchor data-learn-section-anchor="true">
            {TOPIC_GUIDES.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                active={selectedTopic.id === topic.id}
                onClick={() => openTopic(topic.id, "topics")}
              />
            ))}
            {queryResolution.matchedBy === "no-match" ? (
              <div className="section-shell-quiet rounded-[28px] p-5">
                <p className="eyebrow">No matching topic yet</p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
                  No approved topic guide matched the current search. The spotlight and full topic library are still available below.
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {activeTab === "shabads" && (
        <>
          <section className="section-shell mt-5 p-5" id="learn-shabads-filters" data-learn-anchor data-learn-section-anchor="true">
            <SectionHeader
              eyebrow="Shabads"
              title={editorial?.learn.shabadsIntroTitle ?? "Study the full context"}
              body={editorial?.learn.shabadsIntroBody ?? "Filter by theme, Guru, raag, difficulty, and whether you have already viewed or saved a deep dive."}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <select
                aria-label="Filter shabads by theme"
                value={shabadThemeFilter}
                onChange={event => setParams({ tab: "shabads", theme: event.target.value || null })}
                className="section-shell-quiet min-h-[48px] rounded-[20px] px-4 font-sans text-sm text-ink dark:bg-dark-surface dark:text-dark-text"
              >
                <option value="">All themes</option>
                {SHABAD_THEMES.map(theme => (
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
                {SHABAD_GURUS.map(guru => (
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
                {SHABAD_RAAGS.map(raag => (
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
              {hasActiveShabadFilters ? (
                <button
                  type="button"
                  onClick={() => setParams({
                    tab: "shabads",
                    theme: null,
                    guru: null,
                    raag: null,
                    difficulty: null,
                    length: null,
                    savedOnly: null,
                    completedOnly: null,
                  })}
                  className="rounded-full px-4 py-2 font-sans text-xs font-semibold text-gold dark:text-gold-light underline underline-offset-2"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          </section>

          {selectedShabad ? (
            <div className="mt-5" id="learn-shabads-current" data-learn-anchor data-learn-section-anchor="true">
              {showInlineDetailRail ? (
                <InlineRail
                  chips={activeDetailRail}
                  activeTargetId={activeDetailSectionId}
                  onSelect={handleDetailRailSelect}
                  testId="learn-detail-rail"
                  className="mb-4 flex gap-2 overflow-x-auto pb-1"
                />
              ) : null}
              <ShabadDetail
                shabad={selectedShabad}
                saved={savedItemIds.includes(selectedShabad.id)}
                onToggleSave={() => toggleSavedLearnItem(selectedShabad.id)}
              />
            </div>
          ) : null}

          <section className="mt-5 grid gap-4" id="learn-shabads-all" data-learn-anchor data-learn-section-anchor="true">
            {filteredShabads.map(shabad => (
              <ShabadCard
                key={shabad.id}
                shabad={shabad}
                active={selectedShabad?.id === shabad.id}
                completed={viewedIds.has(shabad.id)}
                saved={savedItemIds.includes(shabad.id)}
                onOpen={() => openShabad(shabad.id, "shabads", { preserveFilters: true })}
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
          <section className="section-shell mt-5 p-5" id="learn-saved-overview" data-learn-anchor data-learn-section-anchor="true">
            <SectionHeader
              eyebrow="Saved"
              title={editorial?.learn.savedIntroTitle ?? "Keep verses, topics, and shabads together"}
              body={editorial?.learn.savedIntroBody ?? "Everything saved inside Learn stays labelled by type so inspiration still leads back into context."}
            />
          </section>

          <section className="mt-5 grid gap-4" id="learn-saved-items" data-learn-anchor data-learn-section-anchor="true">
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
                        openTopic(item.id, "topics")
                        return
                      }
                      if (item.kind === "shabad-deep-dive") {
                        openShabad(item.id, "shabads")
                        return
                      }
                      if (item.kind === "collection") {
                        openCollection(item.id)
                        return
                      }
                      const guidance = DAILY_GUIDANCE_ENTRIES.find(entry => entry.id === item.id)
                      openShabad(guidance?.relatedShabadIds[0] ?? todaySurface.featuredShabad.item.id, "shabads")
                    }}
                    className="inline-flex min-h-[40px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light"
                  >
                    {item.kind === "daily-guidance" ? "Open source shabad" : `Open ${getLearnItemLabel(item.kind).toLowerCase()}`} <IconArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
