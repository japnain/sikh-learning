import { startTransition, useDeferredValue, useEffect, useMemo, useRef } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import SurfaceStateCard from "../../components/SurfaceStateCard"
import { getEditorialCopy } from "../../content/editorialCopy"
import DisclosureSection from "../../components/DisclosureSection"
import { IconArrowRight, IconSearch } from "../../components/icons"
import { useCurrentTime } from "../../hooks/useCurrentTime"
import useLearnCatalog from "../../hooks/useLearnCatalog"
import { useLearningStore } from "../../store/learning"
import { useLearnRailStore } from "../../store/learnRail"
import { useLocaleStore } from "../../store/locale"
import { useSavedFeedbackStore } from "../../store/savedFeedback"
import type { LearnDepthPreference, LearnTab, TopicScenarioKey } from "../../types"
import { toLocalDayStamp } from "../../utils/learnDates"
import {
  filterShabadDeepDives,
  getLearnItemLabel,
  getLearnSavedItems,
  getPremiumFreshDailyGuidanceItems,
  getTodayLearnSurface,
  resolveTopicGuide,
} from "../../utils/learnExperience"
import {
  buildLearnDetailPath,
  buildLearnTabPath,
  isLearnTab,
  LEARN_SUBSECTION_RAILS,
  LEARN_SURFACE_RAIL,
} from "../../utils/learnRails"
import { buildReadSearchPath } from "../../utils/searchRoutes"
import CollectionCard from "./components/CollectionCard"
import InlineRail from "./components/InlineRail"
import InventoryMetric from "./components/InventoryMetric"
import SaveButton from "./components/SaveButton"
import SectionHeader from "./components/SectionHeader"
import ShabadCard from "./components/ShabadCard"
import SpotlightButton from "./components/SpotlightButton"
import TopicCard from "./components/TopicCard"
import TopicDoorCard from "./components/TopicDoorCard"
import SearchHighlight from "../../components/SearchHighlight"

const DEPTH_OPTIONS: Array<{ id: LearnDepthPreference; label: string; detail: string }> = [
  { id: "gentle", label: "Gentle", detail: "More accessible and immediate guidance." },
  { id: "balanced", label: "Balanced", detail: "Mix approachable reading with deeper study." },
  { id: "deep", label: "Deep", detail: "Favor denser study and slower reflection." },
]

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

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

function getCollectionProgressText(
  collectionById: Record<string, { items: Array<{ id: string }> }>,
  collectionId: string,
  itemIds: Set<string>
) {
  const collection = collectionById[collectionId]
  if (!collection) return ""

  const completed = collection.items.filter(item => itemIds.has(item.id)).length
  return `${completed} of ${collection.items.length} completed`
}

function formatGuidanceThemeLabel(theme: string) {
  return theme
    .split(/[-\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function LearnHub() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const topicSearchInputRef = useRef<HTMLInputElement | null>(null)
  const { catalog, error, loading } = useLearnCatalog()
  const locale = useLocaleStore(state => state.locale)
  const editorial = getEditorialCopy(locale) ?? getEditorialCopy("en")
  const now = useCurrentTime()
  const dayStamp = toLocalDayStamp(new Date(now))
  const savedItemIds = useLearningStore(state => state.learnState.savedItemIds)
  const recentTopicIds = useLearningStore(state => state.learnState.recentTopicIds)
  const activeCollectionId = useLearningStore(state => state.learnState.activeCollectionId)
  const depthPreference = useLearningStore(state => state.learnState.depthPreference)
  const viewedItems = useLearningStore(state => state.learnState.viewedItems)
  const toggleSavedLearnItem = useLearningStore(state => state.toggleSavedLearnItem)
  const setLearnDepthPreference = useLearningStore(state => state.setLearnDepthPreference)
  const activeSectionId = useLearnRailStore(state => state.activeSectionId)
  const setActiveSectionId = useLearnRailStore(state => state.setActiveSectionId)
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)

  const tabParam = searchParams.get("tab")
  const activeTab: LearnTab = isLearnTab(tabParam) ? tabParam : "today"
  const pageCopy = getPageCopy(editorial)[activeTab]
  const queryParam = searchParams.get("query") ?? ""
  const deferredQuery = useDeferredValue(queryParam)
  const shabadThemes = catalog?.manifest.filters.shabadThemes ?? []
  const shabadGurus = catalog?.manifest.filters.shabadGurus ?? []
  const shabadRaags = catalog?.manifest.filters.shabadRaags ?? []
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
    () => (catalog ? getTodayLearnSurface(catalog, dayStamp, learnStateSnapshot) : null),
    [catalog, dayStamp, learnStateSnapshot]
  )
  const queryResolution = useMemo(
    () => (
      catalog
        ? resolveTopicGuide(catalog, deferredQuery)
        : {
            topic: null,
            query: deferredQuery,
            matchedBy: deferredQuery ? "no-match" : "empty",
            scenarioKey: null,
          }
    ),
    [catalog, deferredQuery]
  )
    const selectedTopic = catalog
      ? catalog.topicGuideById[searchParams.get("topic") ?? ""]
      ?? (deferredQuery ? queryResolution.topic : null)
      : null
    const topicNoMatch = queryResolution.matchedBy === "no-match"
  const selectedScenarioKey = (
    searchParams.get("scenario")
    ?? queryResolution.scenarioKey
    ?? null
  ) as Exclude<TopicScenarioKey, "overview"> | null
  const readSearchFallbackPath = deferredQuery.trim().length >= 2
    ? buildReadSearchPath({ query: deferredQuery, mode: "auto-detect" })
    : null
  const selectedCollection = catalog && todaySurface
    ? catalog.collectionById[searchParams.get("collection") ?? ""]
      ?? (activeCollectionId ? catalog.collectionById[activeCollectionId] : null)
      ?? todaySurface.exploreCollections[0]
    : null
  const viewedIds = useMemo(() => new Set(viewedItems.map(item => item.itemId)), [viewedItems])
  const savedItems = useMemo(() => (catalog ? getLearnSavedItems(catalog, savedItemIds) : []), [catalog, savedItemIds])
  const continueLearning = todaySurface?.continueLearning ?? null
  const freshGuidanceItems = useMemo(() => {
    if (!catalog) return []

    return getPremiumFreshDailyGuidanceItems(catalog.dailyGuidance)
  }, [catalog])

  const shabadThemeFilter = searchParams.get("theme") ?? ""
  const shabadGuruFilter = searchParams.get("guru") ?? ""
  const shabadRaagFilter = searchParams.get("raag") ?? ""
  const shabadDifficultyFilter = searchParams.get("difficulty") ?? ""
  const shabadLengthFilter = searchParams.get("length") ?? ""
  const shabadSavedOnly = searchParams.get("savedOnly") === "1"
  const shabadCompletedOnly = searchParams.get("completedOnly") === "1"

  const filteredShabads = useMemo(
    () => (
      catalog
        ? filterShabadDeepDives(
            catalog,
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
          )
        : []
    ),
    [
      catalog,
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

  const activeDepthOption = DEPTH_OPTIONS.find(option => option.id === depthPreference) ?? DEPTH_OPTIONS[1]
  const compactTodayPageBody = locale === "en" && activeTab === "today"
    ? "One real need, one substantial passage, one next act of return."
    : pageCopy.body
  const compactTodayHeroBody = locale === "en" && activeTab === "today"
    ? "Search the need plainly. One trustworthy guide stays central, with deeper verses and the next faithful paths close."
    : editorial?.learn.heroBody
  const compactTodayHeroHint = locale === "en" && activeTab === "today"
    ? "Start with the clearest guide, then follow the scenario and the deeper verses without losing the thread."
    : editorial?.learn.heroSearchHint
  const hasActiveShabadFilters = Boolean(
    shabadThemeFilter
    || shabadGuruFilter
    || shabadRaagFilter
    || shabadDifficultyFilter
    || shabadLengthFilter
    || shabadSavedOnly
    || shabadCompletedOnly
  )
  const inventorySummary = todaySurface
    ? `${todaySurface.inventory.dailyGuidance} guidance entries, ${todaySurface.inventory.shabadDeepDives} deep dives, ${todaySurface.inventory.topicGuides} canonical topics, ${todaySurface.inventory.topicScenarios} scenario views, and ${todaySurface.inventory.crossLinks} live cross-links are visible right now.`
    : ""
  const activeSubsectionRail = LEARN_SUBSECTION_RAILS[activeTab]
  const showInlineSubsectionRail = activeTab !== "saved" && activeSubsectionRail.length > 0
  const continueCardClass = "section-shell-quiet relative isolate block w-full rounded-[28px] px-5 py-5 text-left touch-manipulation"

  function setParams(updates: Record<string, string | null>, options: { replace?: boolean } = {}) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        next.delete(key)
        return
      }
      next.set(key, value)
    })

    startTransition(() => {
      setSearchParams(next, { replace: options.replace ?? false })
    })
  }

  function scrollToAnchor(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function navigateToLearnSurface(tab: LearnTab) {
    navigate(buildLearnTabPath(tab))
  }

  function focusArchiveSearch() {
    globalThis.requestAnimationFrame(() => {
      topicSearchInputRef.current?.focus()
    })
  }

  function handleHeroSearchChange(value: string) {
    setParams({
      tab: value ? "topics" : "today",
      query: value || null,
      topic: null,
      shabad: null,
      collection: null,
      detail: null,
      theme: null,
      guru: null,
      raag: null,
      difficulty: null,
      length: null,
      savedOnly: null,
      completedOnly: null,
    }, { replace: true })
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [activeTab])

  useEffect(() => {
    setActiveSectionId(activeSubsectionRail[0]?.targetId ?? null)
  }, [activeSubsectionRail, setActiveSectionId])

  useEffect(() => {
    const sectionElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-learn-section-anchor="true"]')
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

    const sectionObserver = new IntersectionObserver(updateSection, {
      root: null,
      rootMargin: "-15% 0px -55% 0px",
      threshold: 0.15,
    })

    sectionElements.forEach(element => sectionObserver.observe(element))

    return () => {
      sectionObserver.disconnect()
    }
  }, [activeTab, setActiveSectionId])

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

  if (loading) {
    return (
      <SurfaceStateCard
        surface="learn-hub"
        state="loading"
        eyebrow="Learn"
        title="Preparing the SGGS archive."
        body="Daily guidance, topic pages, and saved study paths are loading into place."
        testId="page-learn-loading"
        page="learn"
      />
    )
  }

  if (error || !catalog || !todaySurface || !continueLearning) {
    return (
      <SurfaceStateCard
        surface="learn-hub"
        state="degraded"
        eyebrow="Learn"
        title="Learn is regrouping."
        body="The archive did not settle this time. Reload and try again, or keep moving through the rest of the app."
        testId="page-learn-error"
        page="learn"
        errorCode={error ?? 'unavailable'}
        actions={[
          {
            label: 'Reload Learn',
            onClick: () => window.location.reload(),
            aiAction: 'reload-learn',
          },
          {
            label: 'Go Home',
            onClick: () => window.location.assign('/'),
            aiAction: 'go-home',
            emphasis: 'secondary',
          },
        ]}
      />
    )
  }

  return (
    <div
      className="page-shell pb-[calc(var(--nav-stack-height)+var(--safe-area-bottom)+4.75rem)] animate-fade-in"
      data-testid="page-learn"
      data-page="learn"
      data-ai-surface="learn-hub"
      data-ai-state="ready"
    >
      <div className="mb-6">
        <p className="eyebrow">{editorial?.learn.eyebrow ?? "Learn"}</p>
        <h1 className="mt-2 font-display text-5xl leading-none text-ink dark:text-dark-text">{pageCopy.title}</h1>
        <p className="mt-3 font-sans text-sm leading-6 text-ink/76 dark:text-dark-text/78">
          {compactTodayPageBody}
        </p>
      </div>

      <section className="hero-surface p-4 sm:p-5" aria-labelledby="learn-hero-title" data-testid="learn-hero">
        <p className="eyebrow">{editorial?.learn.heroEyebrow ?? "Archive"}</p>
        <h2 id="learn-hero-title" className="mt-2 font-display text-[2.15rem] leading-none text-ink dark:text-dark-text sm:text-[2.45rem]">
          {editorial?.learn.heroTitle ?? "Find the guide that meets the question."}
        </h2>
        <p className="mt-3 max-w-[36ch] font-sans text-sm leading-6 text-ink/76 dark:text-dark-text/78">
          {compactTodayHeroBody}
        </p>

        <label className="section-shell mt-5 flex items-center gap-3 rounded-[26px] px-4 py-3 focus-within:ring-2 focus-within:ring-saffron/25 focus-within:ring-offset-2 focus-within:ring-offset-parchment dark:focus-within:ring-gold/30 dark:focus-within:ring-offset-dark-bg">
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
            value={queryParam}
            onChange={event => handleHeroSearchChange(event.target.value)}
            placeholder={editorial?.learn.heroSearchPlaceholder ?? "Search the archive by question, feeling, or theme…"}
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink/40 dark:text-dark-text dark:placeholder:text-dark-text/40"
            data-testid="learn-archive-search"
            data-ai-action="learn-archive-search"
          />
        </label>
        <p className="mt-2 font-sans text-[11px] leading-5 text-ink/68 dark:text-dark-text/78 sm:mt-3 sm:text-xs">
          {compactTodayHeroHint}
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
        ariaLabel="Learn surface navigation"
        className="mt-[calc(var(--nav-stack-height)+1rem)] flex flex-wrap gap-2 pb-3 pr-1"
      />

      {activeTab !== "today" ? (
        <>
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
            <div className="grid gap-3">
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
                label={editorial?.learn.inventoryLabels.topicScenarios ?? "Scenario views"}
                value={todaySurface.inventory.topicScenarios}
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
            <div className="grid gap-3">
              {DEPTH_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLearnDepthPreference(option.id)}
                  aria-pressed={depthPreference === option.id}
                  className={`interactive-focus rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
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
        </>
      ) : null}

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
          ariaLabel={`${pageCopy.title} section navigation`}
        />
      ) : null}

      {activeTab === "today" ? (
        <>
          <section className="section-shell mt-5 p-5">
            <div className="grid gap-6">
              <div id="learn-today-continue" className={LEARN_ANCHOR_OFFSET_CLASS} data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Continue Learning"
                  title={continueLearning.title}
                  body={editorial?.learn.compactContinueBody ?? continueLearning.body}
                />
                {continueLearning.kind === "collection" ? (
                  <Link
                    to={buildLearnDetailPath("collection", continueLearning.collection.id, "today")}
                    aria-label={`Continue collection: ${continueLearning.collection.title}`}
                    className={continueCardClass}
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
                  </Link>
                ) : (
                  <Link
                    to={buildLearnDetailPath("topic-guide", continueLearning.topic.id, "today")}
                    aria-label={`Continue topic guide: ${continueLearning.topic.title}`}
                    className={continueCardClass}
                  >
                    <p className="eyebrow">Topic guide</p>
                    <p className="mt-2 font-display text-[1.8rem] leading-none text-ink dark:text-dark-text">
                      {continueLearning.topic.shortTitle}
                    </p>
                    <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                      {continueLearning.topic.centralInsight}
                    </p>
                  </Link>
                )}
              </div>

              <div id="learn-today-surface" className={LEARN_ANCHOR_OFFSET_CLASS} data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Today in the archive"
                  title="Open one doorway, then go deep."
                  body={editorial?.learn.detailBody ?? "Start with one edited doorway, then keep the next two in reach without turning the first screen into a wall of equal cards."}
                />
                <div className="grid gap-3">
                  <SpotlightButton
                    eyebrow="Today's Guidance"
                    title={todaySurface.dailyGuidance.item.title}
                    body={editorial?.learn.compactGuidanceBody ?? todaySurface.dailyGuidance.item.summary}
                    active={false}
                    viewed={viewedIds.has(todaySurface.dailyGuidance.item.id)}
                    to={buildLearnDetailPath("daily-guidance", todaySurface.dailyGuidance.item.id, "today")}
                  />
                  <div className="grid gap-3">
                    <Link
                      to={buildLearnDetailPath("shabad-deep-dive", todaySurface.featuredShabad.item.id, "today")}
                      className="section-shell-quiet interactive-focus interactive-card-link rounded-[24px] px-4 py-4 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="eyebrow">Featured Shabad</p>
                        {viewedIds.has(todaySurface.featuredShabad.item.id) ? <span className="chip-pill">Viewed</span> : null}
                      </div>
                      <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                        {todaySurface.featuredShabad.item.title}
                      </p>
                      <p className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62">
                        {editorial?.learn.compactShabadBody ?? todaySurface.featuredShabad.item.whyItMatters}
                      </p>
                    </Link>
                    <Link
                      to={buildLearnDetailPath("topic-guide", todaySurface.topicSpotlight.item.id, "today")}
                      className="section-shell-quiet interactive-focus interactive-card-link rounded-[24px] px-4 py-4 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="eyebrow">Topic Spotlight</p>
                        {viewedIds.has(todaySurface.topicSpotlight.item.id) ? <span className="chip-pill">Viewed</span> : null}
                      </div>
                      <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                        {todaySurface.topicSpotlight.item.title}
                      </p>
                      <p className="mt-2 font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62">
                        {editorial?.learn.compactTopicBody ?? todaySurface.topicSpotlight.item.centralInsight}
                      </p>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-3" data-testid="learn-today-support-row">
            <div className="section-shell-quiet p-4" data-testid="learn-inventory-compact">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{editorial?.learn.proofEyebrow ?? "Inventory"}</p>
                  <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                    {editorial?.learn.proofTitle ?? "The library is growing in public."}
                  </p>
                </div>
                <span className="chip-pill">Live</span>
              </div>
              <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
                {editorial?.learn.proofBody ?? inventorySummary}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2">
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
                  label={editorial?.learn.inventoryLabels.crossLinks ?? "Cross-links"}
                  value={todaySurface.inventory.crossLinks}
                />
              </div>
            </div>

            <div className="section-shell-quiet p-4" data-testid="learn-reading-depth-compact">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Reading Depth</p>
                  <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                    {activeDepthOption.label}
                  </p>
                </div>
                <span className="chip-pill">Current</span>
              </div>
              <p className="mt-3 font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
                {activeDepthOption.detail}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {DEPTH_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLearnDepthPreference(option.id)}
                    aria-pressed={depthPreference === option.id}
                    className={`interactive-focus rounded-[20px] border px-3 py-3 text-left transition-all duration-300 ${
                      depthPreference === option.id
                        ? "border-saffron/30 bg-white dark:border-gold/25 dark:bg-dark-card"
                        : "border-sand/12 bg-parchment-low/70 dark:border-dark-text/10 dark:!bg-dark-surface"
                    }`}
                  >
                    <p className="font-sans text-xs font-semibold text-ink dark:text-dark-text">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {freshGuidanceItems.length ? (
            <section className="section-shell mt-5 p-5">
              <div
                id="learn-today-fresh-guidance"
                className={LEARN_ANCHOR_OFFSET_CLASS}
                data-learn-anchor
                data-learn-section-anchor="true"
              >
                <SectionHeader
                  eyebrow="Fresh Guidance"
                  title="Only substantial new guidance appears here."
                  body="Recently added guidance is filtered for enough source depth, cross-links, and authored context before it earns space on the first Learn screen."
                />
                <div className="grid gap-3" data-testid="learn-fresh-guidance-grid">
                  {freshGuidanceItems.map(item => (
                    <SpotlightButton
                      key={item.id}
                      eyebrow={`Fresh theme: ${formatGuidanceThemeLabel(item.rotation.theme)}`}
                      title={item.title}
                      body={item.summary}
                      active={false}
                      viewed={viewedIds.has(item.id)}
                      to={buildLearnDetailPath("daily-guidance", item.id, "today")}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="section-shell mt-5 p-5">
            <div className="grid gap-6">
              <div className={`min-w-0 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-today-doors" data-learn-anchor data-learn-section-anchor="true">
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
                      active={selectedTopic?.id === topic.id}
                      query={deferredQuery}
                      viewed={viewedIds.has(topic.id)}
                      to={buildLearnDetailPath("topic-guide", topic.id, "today")}
                    />
                  ))}
                </div>
              </div>

              <div className={`min-w-0 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-today-paths" data-learn-anchor data-learn-section-anchor="true">
                <SectionHeader
                  eyebrow="Editor's Paths"
                  title="Collections worth opening next."
                  body={editorial?.learn.compactCollectionsBody ?? "Structured paths that begin with short guidance and open into deeper study."}
                />
                <div className="grid min-w-0 gap-3 pb-1 pr-1">
                  {todaySurface.featuredCollections.map(collection => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      active={selectedCollection?.id === collection.id}
                      progressText={getCollectionProgressText(catalog.collectionById, collection.id, viewedIds)}
                      to={buildLearnDetailPath("collection", collection.id, "today")}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "topics" ? (
        <>
          <section className={`section-shell mt-5 p-5 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-topics-search" data-learn-anchor data-learn-section-anchor="true">
            <SectionHeader
              eyebrow="Topics"
              title={editorial?.learn.topicsIntroTitle ?? "Find the approved guide"}
              body={editorial?.learn.topicsIntroBody ?? "Search modern struggles and land on canonical Gurbani-based topic pages, not improvised interpretation."}
            />
            <label className="section-shell-quiet flex items-center gap-3 rounded-[24px] px-4 py-3 focus-within:ring-2 focus-within:ring-saffron/25 focus-within:ring-offset-2 focus-within:ring-offset-parchment dark:focus-within:ring-gold/30 dark:focus-within:ring-offset-dark-bg">
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
                value={queryParam}
                onChange={event => setParams({
                  tab: "topics",
                  query: event.target.value || null,
                  topic: null,
                  shabad: null,
                  collection: null,
                  detail: null,
                })}
                placeholder={editorial?.learn.topicsSearchPlaceholder ?? "Search stress, anger, ego, loneliness, purpose…"}
                className="min-w-0 flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink/40 dark:text-dark-text dark:placeholder:text-dark-text/40"
              />
            </label>
            {deferredQuery ? (
              <div className="mt-3 space-y-3">
                <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74">
                  {queryResolution.matchedBy === "synonym"
                    ? (
                        <>
                          Showing the canonical approved guide for “
                          <SearchHighlight text={deferredQuery} query={deferredQuery} />
                          ”
                          {selectedScenarioKey ? ` with the ${selectedScenarioKey} scenario ready.` : "."}
                        </>
                      )
                      : topicNoMatch
                        ? "No matching topic found. Try the same words against Gurbani lines in Read, or browse all approved topics."
                      : queryResolution.matchedBy === "closest"
                        ? (
                            <>
                              No exact approved page matched “
                              <SearchHighlight text={deferredQuery} query={deferredQuery} />
                              ”, so the nearest approved guide is shown.
                            </>
                          )
                        : (
                            <>
                              Approved guide matched “
                              <SearchHighlight text={deferredQuery} query={deferredQuery} />
                              ”.
                            </>
                          )}
                </p>
                {topicNoMatch ? (
                  <div className="flex flex-wrap gap-2">
                    {readSearchFallbackPath ? (
                      <Link
                        to={readSearchFallbackPath}
                        className="interactive-focus interactive-pill-link min-h-[44px] gap-2 rounded-full border border-saffron/18 bg-parchment-card px-4 py-2 font-sans text-xs font-semibold text-saffron transition-colors duration-300 dark:border-gold/16 dark:bg-dark-card dark:text-gold-light"
                        data-testid="learn-read-search-fallback"
                      >
                        Search Gurbani lines in Read
                        <IconArrowRight size={13} />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setParams({
                        query: null,
                        topic: null,
                        shabad: null,
                        collection: null,
                        detail: null,
                        scenario: null,
                      }, { replace: true })}
                      className="interactive-focus min-h-[44px] rounded-full border border-sand/18 bg-parchment-card px-4 py-2 font-sans text-xs font-semibold text-ink/72 transition-colors duration-300 dark:border-dark-text/12 dark:bg-dark-card dark:text-dark-text/72"
                      data-testid="learn-browse-all-topics"
                    >
                      Browse all topics
                    </button>
                  </div>
                ) : null}
                </div>
              ) : null}
              {!topicNoMatch ? (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {catalog.topicGuides.map(topic => (
                    <Link
                      key={topic.id}
                      to={buildLearnDetailPath(
                        "topic-guide",
                        topic.id,
                        "topics",
                        topic.id === selectedTopic?.id ? selectedScenarioKey : null
                      )}
                      className={`min-h-[44px] shrink-0 rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-300 ${
                        selectedTopic?.id === topic.id
                          ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg"
                          : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"
                      } touch-manipulation`}
                    >
                      <SearchHighlight text={topic.shortTitle} query={deferredQuery} />
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={`mt-5 grid gap-4 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-topics-all" data-learn-anchor data-learn-section-anchor="true">
              {topicNoMatch ? (
                <div className="section-shell-quiet rounded-[28px] p-5" data-testid="learn-topic-no-match">
                  <p className="eyebrow">No matching topic yet</p>
                  <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
                    No approved topic guide matched the current search. Clear the search to browse the full approved topic library.
                  </p>
                </div>
              ) : (
                catalog.topicGuides.map(topic => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    active={selectedTopic?.id === topic.id}
                    query={deferredQuery}
                    viewed={viewedIds.has(topic.id)}
                    to={buildLearnDetailPath(
                      "topic-guide",
                      topic.id,
                      "topics",
                      topic.id === selectedTopic?.id ? selectedScenarioKey : null
                    )}
                  />
                ))
              )}
            </section>
        </>
      ) : null}

      {activeTab === "shabads" ? (
        <>
          <section className={`section-shell mt-5 p-5 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-shabads-filters" data-learn-anchor data-learn-section-anchor="true">
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
                {shabadGurus.map(guru => (
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
                {shabadRaags.map(raag => (
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

          <section className={`mt-5 grid gap-4 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-shabads-all" data-learn-anchor data-learn-section-anchor="true">
            {filteredShabads.map(shabad => (
              <ShabadCard
                key={shabad.id}
                shabad={shabad}
                active={false}
                completed={viewedIds.has(shabad.id)}
                saved={savedItemIds.includes(shabad.id)}
                to={buildLearnDetailPath("shabad-deep-dive", shabad.id, "shabads")}
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
      ) : null}

      {activeTab === "saved" ? (
        <>
          <section className={`section-shell mt-5 p-5 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-saved-overview" data-learn-anchor data-learn-section-anchor="true">
            <SectionHeader
              eyebrow="Saved"
              title={editorial?.learn.savedIntroTitle ?? "Keep verses, topics, and shabads together"}
              body={editorial?.learn.savedIntroBody ?? "Everything saved inside Learn stays labelled by type so inspiration still leads back into context."}
            />
            {lastSaved?.kind === "learn" ? (
              <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
                <p role="status" className="inline-flex rounded-full bg-gold/10 px-3 py-1.5 font-sans text-xs font-medium text-gold-dark dark:bg-gold/12 dark:text-gold-light">
                  Saved to Learn just now.
                </p>
              </div>
            ) : null}
          </section>

          <section className={`mt-5 grid gap-4 ${LEARN_ANCHOR_OFFSET_CLASS}`} id="learn-saved-items" data-learn-anchor data-learn-section-anchor="true">
            {savedItems.length === 0 ? (
              <div className="section-shell-quiet rounded-[28px] p-5">
                <p className="eyebrow">Nothing saved yet</p>
                <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
                  Save a daily guidance entry, topic guide, or shabad deep dive and it will appear here with its type clearly labelled.
                </p>
              </div>
            ) : null}

            {savedItems.map(item => {
              const recentlySaved = lastSaved?.kind === "learn" && lastSaved.targetId === item.id

              return (
              <div key={item.id} className={`section-shell rounded-[28px] p-4 transition-all duration-300 ${recentlySaved ? "saved-feedback-highlight" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{getLearnItemLabel(item.kind)}</p>
                    <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{item.title}</p>
                    <p className="mt-1 font-sans text-sm text-ink/58 dark:text-dark-text/58">{item.subtitle}</p>
                    <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">{item.detail}</p>
                  </div>
                  <SaveButton saved recentlySaved={recentlySaved} onClick={() => toggleSavedLearnItem(item.id)} label={item.title} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="chip-pill">{item.theme}</span>
                    {viewedIds.has(item.id) ? <span className="chip-pill">Viewed</span> : null}
                  </div>
                  <Link
                    to={buildLearnDetailPath(item.kind, item.id, "saved")}
                    className="inline-flex min-h-[40px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
                  >
                    {`Open ${getLearnItemLabel(item.kind).toLowerCase()}`} <IconArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )})}
          </section>
        </>
      ) : null}
    </div>
  )
}
