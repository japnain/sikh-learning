import { useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import {
  COLLECTION_BY_ID,
  DAILY_GUIDANCE_BY_ID,
  SHABAD_DEEP_DIVE_BY_ID,
  TOPIC_GUIDE_BY_ID,
} from "../../data/learnContent"
import { IconArrowRight } from "../../components/icons"
import { useLearningStore } from "../../store/learning"
import type { CollectionItemReference, LearnContentKind } from "../../types"
import { resolveLineReference } from "../../utils/learnExperience"
import { buildLearnDetailPath, LEARN_DETAIL_RAILS } from "../../utils/learnRails"
import LearnDetailShell from "./LearnDetailShell"
import ExcerptBlock from "./components/ExcerptBlock"

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

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

function MissingCollectionDetail() {
  return (
    <div className="page-shell animate-fade-in" data-testid="page-learn-detail-missing">
      <div className="section-shell p-5">
        <p className="eyebrow">Collection not found</p>
        <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
          This collection is not available.
        </p>
      </div>
    </div>
  )
}

function getStepCopy(item: CollectionItemReference): {
  kind: LearnContentKind
  title: string
  description: string
  eyebrow: string
} | null {
  if (item.kind === "daily-guidance") {
    const guidance = DAILY_GUIDANCE_BY_ID[item.id]
    if (!guidance) return null

    return {
      kind: item.kind,
      title: guidance.title,
      description: guidance.summary,
      eyebrow: "Daily guidance",
    }
  }

  if (item.kind === "topic-guide") {
    const topic = TOPIC_GUIDE_BY_ID[item.id]
    if (!topic) return null

    return {
      kind: item.kind,
      title: topic.title,
      description: topic.centralInsight,
      eyebrow: "Topic guide",
    }
  }

  const shabad = SHABAD_DEEP_DIVE_BY_ID[item.id]
  if (!shabad) return null

  return {
    kind: item.kind,
    title: shabad.title,
    description: shabad.summary,
    eyebrow: "Shabad deep dive",
  }
}

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const collection = collectionId ? COLLECTION_BY_ID[collectionId] : null
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)
  const setActiveLearnCollection = useLearningStore(state => state.setActiveLearnCollection)
  const viewedItems = useLearningStore(state => state.learnState.viewedItems)

  useEffect(() => {
    if (collection) {
      setActiveLearnCollection(collection.id)
      recordLearnItemView(collection.id, "collection")
    }
  }, [collection, recordLearnItemView, setActiveLearnCollection])

  if (!collection) return <MissingCollectionDetail />

  const heroExcerpt = resolveLineReference(collection.heroSource)
  const viewedIds = useMemo(() => new Set(viewedItems.map(item => item.itemId)), [viewedItems])
  const completedCount = collection.items.filter(item => viewedIds.has(item.id)).length
  const nextUnviewedItem = collection.items.find(item => !viewedIds.has(item.id)) ?? collection.items[collection.items.length - 1] ?? null
  const nextUnviewedIndex = nextUnviewedItem
    ? collection.items.findIndex(item => item.kind === nextUnviewedItem.kind && item.id === nextUnviewedItem.id)
    : -1
  const nextUnviewedStepCopy = nextUnviewedItem ? getStepCopy(nextUnviewedItem) : null

  const firstGuidanceId = collection.items.find(item => item.kind === "daily-guidance")?.id
  const firstTopicId = collection.items.find(item => item.kind === "topic-guide")?.id
  const firstShabadId = collection.items.find(item => item.kind === "shabad-deep-dive")?.id

  return (
    <LearnDetailShell
      title={collection.title}
      body={collection.description}
      itemId={collection.id}
      itemKind="collection"
      rail={LEARN_DETAIL_RAILS["today-collection"]}
      sectionLabel="Today"
      sectionTab="today"
      defaultFrom="today"
    >
      <section
        className={`grid gap-5 lg:grid-cols-[1.15fr,0.85fr] ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-collection-overview"
        data-ai-anchor="collection-overview"
      >
        <div>
          <p className="eyebrow">{collection.durationLabel}</p>
          <p className="mt-2 font-display text-[1.9rem] leading-none text-ink dark:text-dark-text">{collection.subtitle}</p>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
            This journey is arranged as a deliberate sequence instead of a loose pile of links.
          </p>
          <div className="mt-5">
            <ExcerptBlock excerpt={heroExcerpt} shabad={heroExcerpt.deepDive} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="section-shell-quiet p-4">
            <p className="eyebrow">Progress</p>
            <p className="mt-2 font-display text-[1.7rem] leading-none text-ink dark:text-dark-text">
              {completedCount} of {collection.items.length} completed
            </p>
            <div className="mt-4 h-2 rounded-full bg-sand/20 dark:bg-dark-text/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-saffron to-gold-light transition-all duration-300"
                style={{ width: `${collection.items.length === 0 ? 0 : (completedCount / collection.items.length) * 100}%` }}
              />
            </div>
            {nextUnviewedItem ? (
              <Link
                to={buildLearnDetailPath(nextUnviewedItem.kind, nextUnviewedItem.id, `collection-${collection.id}`)}
                aria-label={`Continue this journey with step ${nextUnviewedIndex + 1}: ${nextUnviewedStepCopy?.title ?? collection.title}`}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
              >
                Continue this journey <IconArrowRight size={16} />
              </Link>
            ) : null}
          </div>

          <div className="section-shell-quiet p-4">
            <p className="eyebrow">Themes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {collection.themes.map(theme => (
                <span key={theme} className="chip-pill">{theme}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CollectionMetric label="Steps" value={collection.items.length} />
            <CollectionMetric label="Topics" value={collection.items.filter(item => item.kind === "topic-guide").length} />
            <CollectionMetric label="Shabads" value={collection.items.filter(item => item.kind === "shabad-deep-dive").length} />
          </div>
        </div>
      </section>

      <section className="section-shell p-5">
        <p className="eyebrow">Journey Steps</p>
        <div className="mt-4 space-y-3">
          {collection.items.map((item, index) => {
            const stepCopy = getStepCopy(item)
            if (!stepCopy) return null

            const sectionId =
              item.kind === "daily-guidance" && item.id === firstGuidanceId
                ? "learn-detail-collection-guidance"
                : item.kind === "topic-guide" && item.id === firstTopicId
                ? "learn-detail-collection-topics"
                : item.kind === "shabad-deep-dive" && item.id === firstShabadId
                ? "learn-detail-collection-shabads"
                : undefined
            const viewed = viewedIds.has(item.id)
            const isNext = nextUnviewedItem?.id === item.id && nextUnviewedItem.kind === item.kind

            return (
              <div
                key={`${item.kind}:${item.id}`}
                id={sectionId}
                className={`rounded-[24px] border px-4 py-4 transition-all duration-300 ${LEARN_ANCHOR_OFFSET_CLASS} ${
                  isNext
                    ? "border-saffron/30 bg-white shadow-soft dark:border-gold/25 dark:bg-dark-card"
                    : "border-sand/12 bg-parchment-low/85 dark:border-dark-text/10 dark:!bg-dark-surface"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip-pill">Step {index + 1}</span>
                      <p className="eyebrow">{stepCopy.eyebrow}</p>
                      {viewed ? <span className="chip-pill">Viewed</span> : null}
                      {isNext ? <span className="chip-pill">Continue</span> : null}
                    </div>
                    <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">{stepCopy.title}</p>
                    <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">{stepCopy.description}</p>
                  </div>
                  <Link
                    to={buildLearnDetailPath(item.kind, item.id, `collection-${collection.id}`)}
                    aria-label={`Open step ${index + 1}: ${stepCopy.title}`}
                    className="inline-flex min-h-[40px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
                  >
                    Open <IconArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </LearnDetailShell>
  )
}
