import { useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import SurfaceStateCard from "../../components/SurfaceStateCard"
import useLearnCatalog from "../../hooks/useLearnCatalog"
import useLearnDetail from "../../hooks/useLearnDetail"
import { useLearningStore } from "../../store/learning"
import { buildLearnDetailPath, LEARN_DETAIL_RAILS } from "../../utils/learnRails"
import { resolveLineReference } from "../../utils/learnExperience"
import { IconArrowRight } from "../../components/icons"
import LearnDetailShell from "./LearnDetailShell"
import ExcerptBlock from "./components/ExcerptBlock"

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

function MissingGuidanceDetail({
  state,
  errorCode = null,
}: {
  state: 'loading' | 'empty' | 'degraded'
  errorCode?: string | null
}) {
  return (
    <SurfaceStateCard
      surface="learn-guidance-detail"
      state={state}
      eyebrow="Today"
      title={state === 'loading' ? 'Preparing this guidance page.' : state === 'degraded' ? 'This guidance page needs another pass.' : 'This guidance page is not available right now.'}
      body={state === 'loading'
        ? 'The guidance page is loading into place.'
        : state === 'degraded'
          ? 'The guidance page did not settle this time. Reload and try again, or head back to Today.'
          : 'The requested guidance page could not be found in the current Learn archive.'}
      testId="page-learn-detail-missing"
      page="learn-detail"
      errorCode={errorCode}
      actions={state === 'loading'
        ? []
        : [
            {
              label: state === 'degraded' ? 'Reload Guidance' : 'Back to Today',
              onClick: () => {
                if (state === 'degraded') {
                  window.location.reload()
                  return
                }
                window.location.assign('/learn?tab=today')
              },
              aiAction: state === 'degraded' ? 'reload-guidance-detail' : 'back-to-today',
            },
          ]}
    />
  )
}

export default function GuidanceDetailPage() {
  const { guidanceId } = useParams<{ guidanceId: string }>()
  const [searchParams] = useSearchParams()
  const { catalog, error: catalogError, status: catalogStatus } = useLearnCatalog()
  const {
    item: guidance,
    error: guidanceError,
    status: guidanceStatus,
  } = useLearnDetail("daily-guidance", guidanceId)
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)

  useEffect(() => {
    if (guidance) {
      recordLearnItemView(guidance.id, "daily-guidance")
    }
  }, [guidance, recordLearnItemView])

  if (catalogStatus === 'loading' || guidanceStatus === 'loading') return <MissingGuidanceDetail state="loading" />
  if (catalogStatus === 'degraded' || guidanceStatus === 'degraded' || catalogError || guidanceError || !catalog) {
    return <MissingGuidanceDetail state="degraded" errorCode={catalogError ?? guidanceError ?? 'unavailable'} />
  }
  if (!guidance) return <MissingGuidanceDetail state="empty" />

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
