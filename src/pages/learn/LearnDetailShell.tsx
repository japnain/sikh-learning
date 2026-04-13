import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import useLearnCatalog from "../../hooks/useLearnCatalog"
import { useLearningStore } from "../../store/learning"
import type { LearnContentKind, LearnTab } from "../../types"
import { buildLearnDetailPath, buildLearnTabPath, type LearnRailChip } from "../../utils/learnRails"
import { IconArrowLeft, IconArrowRight } from "../../components/icons"
import LearnBackButton from "./LearnBackButton"
import InlineRail from "./components/InlineRail"
import SaveButton from "./components/SaveButton"

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

type LearnDetailShellProps = {
  title: string
  body?: string
  itemId: string
  itemKind: LearnContentKind
  rail: LearnRailChip[]
  sectionLabel: string
  sectionTab: LearnTab
  defaultFrom: string
  children: ReactNode
}

type CollectionStepContext = {
  collectionId: string
  title: string
  position: number
  total: number
  previousPath: string | null
  nextPath: string | null
}

function getBackContext(
  collectionById: Record<string, { id: string; title: string }>,
  from: string | null,
  defaultFrom: string,
  fallbackLabel: string,
  fallbackTab: LearnTab
) {
  const resolvedFrom = from ?? defaultFrom

  if (resolvedFrom.startsWith("collection-")) {
    const collectionId = resolvedFrom.slice("collection-".length)
    const collection = collectionById[collectionId]
    return {
      label: collection ? `Back to ${collection.title}` : "Back to Collection",
      fallbackPath: collection ? buildLearnDetailPath("collection", collection.id) : buildLearnTabPath("today"),
      breadcrumbLabel: collection?.title ?? "Collection",
      breadcrumbPath: collection ? buildLearnDetailPath("collection", collection.id) : buildLearnTabPath("today"),
      resolvedFrom,
    }
  }

  if (resolvedFrom === "topics" || resolvedFrom === "shabads" || resolvedFrom === "saved" || resolvedFrom === "today") {
    const breadcrumbLabel =
      resolvedFrom === "today"
        ? "Today"
        : resolvedFrom === "topics"
          ? "Topics"
          : resolvedFrom === "shabads"
            ? "Shabads"
            : "Saved"

    return {
      label:
        resolvedFrom === "today"
          ? "Back to Today"
          : resolvedFrom === "topics"
          ? "Back to Topics"
          : resolvedFrom === "shabads"
          ? "Back to Shabads"
          : "Back to Saved",
      fallbackPath: buildLearnTabPath(resolvedFrom),
      breadcrumbLabel,
      breadcrumbPath: buildLearnTabPath(resolvedFrom),
      resolvedFrom,
    }
  }

  return {
    label: "Back to Learn",
    fallbackPath: buildLearnTabPath(fallbackTab),
    breadcrumbLabel: fallbackLabel,
    breadcrumbPath: buildLearnTabPath(fallbackTab),
    resolvedFrom,
  }
}

function getCollectionStepContext(
  collectionById: Record<string, { id: string; title: string; items: Array<{ kind: Exclude<LearnContentKind, "collection">; id: string; scenarioKey?: "daily" | "pressure" | "repair" | "practice" }> }>,
  from: string,
  itemKind: LearnContentKind,
  itemId: string
): CollectionStepContext | null {
  if (!from.startsWith("collection-") || itemKind === "collection") return null

  const collectionId = from.slice("collection-".length)
  const collection = collectionById[collectionId]
  if (!collection) return null

  const index = collection.items.findIndex(item => item.kind === itemKind && item.id === itemId)
  if (index === -1) return null

  const previousItem = index > 0 ? collection.items[index - 1] : null
  const nextItem = index < collection.items.length - 1 ? collection.items[index + 1] : null

  return {
    collectionId,
    title: collection.title,
    position: index + 1,
    total: collection.items.length,
    previousPath: previousItem
      ? buildLearnDetailPath(previousItem.kind, previousItem.id, from, previousItem.kind === "topic-guide" ? previousItem.scenarioKey ?? null : null)
      : null,
    nextPath: nextItem
      ? buildLearnDetailPath(nextItem.kind, nextItem.id, from, nextItem.kind === "topic-guide" ? nextItem.scenarioKey ?? null : null)
      : null,
  }
}

export default function LearnDetailShell({
  title,
  body,
  itemId,
  itemKind,
  rail,
  sectionLabel,
  sectionTab,
  defaultFrom,
  children,
}: LearnDetailShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { catalog } = useLearnCatalog()
  const toggleSavedLearnItem = useLearningStore(state => state.toggleSavedLearnItem)
  const savedItemIds = useLearningStore(state => state.learnState.savedItemIds)
  const viewedItems = useLearningStore(state => state.learnState.viewedItems)
  const [activeTargetId, setActiveTargetId] = useState<string | null>(rail[0]?.targetId ?? null)

  const saved = savedItemIds.includes(itemId)
  const viewed = viewedItems.some(item => item.itemId === itemId)
  const collectionById = catalog?.collectionById ?? {}
  const backContext = getBackContext(collectionById, searchParams.get("from"), defaultFrom, sectionLabel, sectionTab)
  const collectionStepContext = useMemo(
    () => getCollectionStepContext(collectionById, backContext.resolvedFrom, itemKind, itemId),
    [backContext.resolvedFrom, collectionById, itemId, itemKind]
  )

  useEffect(() => {
    setActiveTargetId(rail[0]?.targetId ?? null)
  }, [rail])

  function handleBack() {
    if (backContext.resolvedFrom.startsWith("collection-")) {
      navigate(backContext.fallbackPath)
      return
    }

    if (location.key !== "default") {
      navigate(-1)
      return
    }

    navigate(backContext.fallbackPath)
  }

  function handleRailSelect(chipId: string) {
    const target = rail.find(item => item.id === chipId)
    if (!target) return

    setActiveTargetId(target.targetId)
    document.getElementById(target.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="page-learn-detail"
      data-page="learn-detail"
      data-ai-surface="learn-detail-shell"
      data-ai-state="ready"
      data-ai-flow={sectionTab}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow flex flex-wrap items-center gap-2">
            <Link to="/learn" className="hover:text-saffron dark:hover:text-gold-light">Learn</Link>
            <span>&gt;</span>
            <Link to={backContext.breadcrumbPath} className="hover:text-saffron dark:hover:text-gold-light">
              {backContext.breadcrumbLabel}
            </Link>
            <span>&gt;</span>
            <span>{title}</span>
          </p>
          <LearnBackButton label={backContext.label} onClick={handleBack} />
        </div>

        <div className="flex items-center gap-2">
          {viewed ? <span className="chip-pill">Viewed</span> : null}
          <SaveButton saved={saved} onClick={() => toggleSavedLearnItem(itemId)} label={title} />
        </div>
      </div>

      <div className="mt-5 max-w-[48rem]">
        <h1 className="font-display text-[2.85rem] leading-none text-ink dark:text-dark-text">{title}</h1>
        {body ? (
          <p className="mt-3 font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">{body}</p>
        ) : null}
      </div>

      {rail.length > 0 ? (
        <div className="sticky top-[calc(var(--nav-stack-height,0px)+0.75rem)] z-20 mt-5 section-shell px-3 py-3 backdrop-blur-[20px]">
          <InlineRail
            chips={rail}
            activeTargetId={activeTargetId}
            onSelect={handleRailSelect}
            testId="learn-detail-rail"
            ariaLabel={`${backContext.breadcrumbLabel} detail navigation`}
            className="flex gap-2 overflow-x-auto pb-1"
          />
        </div>
      ) : null}

      <div className={`mt-5 space-y-5 ${LEARN_ANCHOR_OFFSET_CLASS}`}>{children}</div>

      {collectionStepContext ? (
        <section className="section-shell mt-6 p-5" data-testid="learn-collection-step-footer">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Collection Step</p>
              <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                Step {collectionStepContext.position} of {collectionStepContext.total} in {collectionStepContext.title}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {collectionStepContext.previousPath ? (
                <Link
                  to={collectionStepContext.previousPath}
                  className="inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
                >
                  <IconArrowLeft size={16} />
                  Previous
                </Link>
              ) : null}
              {collectionStepContext.nextPath ? (
                <Link
                  to={collectionStepContext.nextPath}
                  className="inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
                >
                  Next
                  <IconArrowRight size={16} />
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
