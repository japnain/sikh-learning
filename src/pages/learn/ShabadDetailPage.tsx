import { useEffect } from "react"
import { useParams } from "react-router-dom"
import SurfaceStateCard from "../../components/SurfaceStateCard"
import useLearnDetail from "../../hooks/useLearnDetail"
import { useLearningStore } from "../../store/learning"
import { LEARN_DETAIL_RAILS } from "../../utils/learnRails"
import LearnDetailShell from "./LearnDetailShell"
import CitationLine from "./components/CitationLine"

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

function MissingShabadDetail({
  state,
  errorCode = null,
}: {
  state: 'loading' | 'empty' | 'degraded'
  errorCode?: string | null
}) {
  return (
    <SurfaceStateCard
      surface="learn-shabad-detail"
      state={state}
      eyebrow="Shabads"
      title={state === 'loading' ? 'Preparing this shabad.' : state === 'degraded' ? 'This shabad needs another pass.' : 'This shabad is not available right now.'}
      body={state === 'loading'
        ? 'The shabad deep dive is loading into place.'
        : state === 'degraded'
          ? 'The shabad deep dive did not settle this time. Reload and try again, or return to Shabads.'
          : 'The requested shabad deep dive could not be found in the current Learn archive.'}
      testId="page-learn-detail-missing"
      page="learn-detail"
      errorCode={errorCode}
      actions={state === 'loading'
        ? []
        : [
            {
              label: state === 'degraded' ? 'Reload Shabad' : 'Back to Shabads',
              onClick: () => {
                if (state === 'degraded') {
                  window.location.reload()
                  return
                }
                window.location.assign('/learn?tab=shabads')
              },
              aiAction: state === 'degraded' ? 'reload-shabad-detail' : 'back-to-shabads',
            },
          ]}
    />
  )
}

export default function ShabadDetailPage() {
  const { shabadId } = useParams<{ shabadId: string }>()
  const { item: shabad, error, status } = useLearnDetail("shabad-deep-dive", shabadId)
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)

  useEffect(() => {
    if (shabad) {
      recordLearnItemView(shabad.id, "shabad-deep-dive")
    }
  }, [recordLearnItemView, shabad])

  if (status === 'loading') return <MissingShabadDetail state="loading" />
  if (status === 'degraded' || error) return <MissingShabadDetail state="degraded" errorCode={error ?? 'unavailable'} />
  if (!shabad) return <MissingShabadDetail state="empty" />

  return (
    <LearnDetailShell
      title={shabad.title}
      body={shabad.subtitle}
      itemId={shabad.id}
      itemKind="shabad-deep-dive"
      rail={LEARN_DETAIL_RAILS["shabads-shabad"]}
      sectionLabel="Shabads"
      sectionTab="shabads"
      defaultFrom="shabads"
    >
      <section
        className={`grid gap-4 md:grid-cols-2 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-shabad-summary"
        data-ai-anchor="shabad-summary"
      >
        <div className="section-shell-quiet p-4">
          <CitationLine shabad={shabad} />
          <p className="mt-3 font-sans text-sm leading-6 text-ink dark:text-dark-text">{shabad.summary}</p>
        </div>
        <div className="section-shell-quiet p-4">
          <p className="eyebrow">Why It Matters</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{shabad.whyItMatters}</p>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70">{shabad.takeaway}</p>
        </div>
      </section>

      <section
        className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-shabad-structure"
        data-ai-anchor="shabad-structure"
      >
        <p className="eyebrow">Structure</p>
        <div className="mt-3 space-y-3">
          {shabad.structure.map(item => (
            <p key={item} className="font-sans text-sm leading-6 text-ink dark:text-dark-text">{item}</p>
          ))}
        </div>
      </section>

      <section
        className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-shabad-lines"
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
      </section>
    </LearnDetailShell>
  )
}
