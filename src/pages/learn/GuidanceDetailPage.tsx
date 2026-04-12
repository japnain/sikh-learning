import { useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import useLearnCatalog from "../../hooks/useLearnCatalog"
import useLearnDetail from "../../hooks/useLearnDetail"
import { useLearningStore } from "../../store/learning"
import { buildLearnDetailPath, LEARN_DETAIL_RAILS } from "../../utils/learnRails"
import { resolveLineReference } from "../../utils/learnExperience"
import { IconArrowRight } from "../../components/icons"
import LearnDetailShell from "./LearnDetailShell"
import ExcerptBlock from "./components/ExcerptBlock"

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

function MissingGuidanceDetail() {
  return (
    <div className="page-shell animate-fade-in" data-testid="page-learn-detail-missing">
      <div className="section-shell p-5">
        <p className="eyebrow">Guidance not found</p>
        <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
          This guidance page is not available.
        </p>
      </div>
    </div>
  )
}

export default function GuidanceDetailPage() {
  const { guidanceId } = useParams<{ guidanceId: string }>()
  const [searchParams] = useSearchParams()
  const { catalog, error: catalogError, loading: catalogLoading } = useLearnCatalog()
  const {
    item: guidance,
    error: guidanceError,
    loading: guidanceLoading,
  } = useLearnDetail("daily-guidance", guidanceId)
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)

  useEffect(() => {
    if (guidance) {
      recordLearnItemView(guidance.id, "daily-guidance")
    }
  }, [guidance, recordLearnItemView])

  if (catalogLoading || guidanceLoading) return <MissingGuidanceDetail />
  if (catalogError || guidanceError || !catalog || !guidance) return <MissingGuidanceDetail />

  const excerpt = resolveLineReference(catalog, guidance.source)
  const from = searchParams.get("from") ?? "today"

  return (
    <LearnDetailShell
      title={guidance.title}
      body={guidance.summary}
      itemId={guidance.id}
      itemKind="daily-guidance"
      rail={LEARN_DETAIL_RAILS["today-guidance"]}
      sectionLabel="Today"
      sectionTab="today"
      defaultFrom="today"
    >
      <section
        className={`section-shell p-5 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-guidance-excerpt"
        data-ai-anchor="guidance-excerpt"
      >
        <p className="eyebrow">Excerpt</p>
        <div className="mt-4">
          <ExcerptBlock excerpt={excerpt} shabad={excerpt.deepDive} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section
          className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
          id="learn-detail-guidance-takeaway"
          data-ai-anchor="guidance-takeaway"
        >
          <p className="eyebrow">Takeaway</p>
          <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">{guidance.takeaway}</p>
        </section>
        <section
          className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
          id="learn-detail-guidance-life"
          data-ai-anchor="guidance-life"
        >
          <p className="eyebrow">Life Application</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{guidance.lifeApplication}</p>
        </section>
      </div>

      <section className="section-shell-quiet p-4">
        <p className="eyebrow">Go Deeper</p>
        <Link
          to={buildLearnDetailPath("shabad-deep-dive", guidance.relatedShabadIds[0] ?? excerpt.deepDive.id, from)}
          className="mt-3 inline-flex min-h-[42px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
        >
          Open the full shabad <IconArrowRight size={16} />
        </Link>
      </section>
    </LearnDetailShell>
  )
}
