import { useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { TOPIC_GUIDE_BY_ID } from "../../data/learnContent"
import { IconArrowRight } from "../../components/icons"
import { useLearningStore } from "../../store/learning"
import { resolveLineReference } from "../../utils/learnExperience"
import { buildLearnDetailPath, LEARN_DETAIL_RAILS } from "../../utils/learnRails"
import LearnDetailShell from "./LearnDetailShell"
import CitationLine from "./components/CitationLine"

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

function MissingTopicDetail() {
  return (
    <div className="page-shell animate-fade-in" data-testid="page-learn-detail-missing">
      <div className="section-shell p-5">
        <p className="eyebrow">Topic not found</p>
        <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">
          This topic guide is not available.
        </p>
      </div>
    </div>
  )
}

export default function TopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const [searchParams] = useSearchParams()
  const topic = topicId ? TOPIC_GUIDE_BY_ID[topicId] : null
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)

  useEffect(() => {
    if (topic) {
      recordLearnItemView(topic.id, "topic-guide")
    }
  }, [recordLearnItemView, topic])

  if (!topic) return <MissingTopicDetail />

  const from = searchParams.get("from") ?? "topics"

  return (
    <LearnDetailShell
      title={topic.title}
      body={topic.issueStatement}
      itemId={topic.id}
      itemKind="topic-guide"
      rail={LEARN_DETAIL_RAILS["topics-topic"]}
      sectionLabel="Topics"
      sectionTab="topics"
      defaultFrom="topics"
    >
      <section
        className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-topic-insight"
        data-ai-anchor="topic-insight"
      >
        <p className="eyebrow">Central Insight</p>
        <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">{topic.centralInsight}</p>
      </section>

      <section
        className={`space-y-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-topic-excerpts"
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
              <Link
                to={buildLearnDetailPath("shabad-deep-dive", resolved.deepDive.id, from)}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 font-sans text-sm font-semibold text-saffron dark:text-gold-light touch-manipulation"
              >
                Study full shabad <IconArrowRight size={16} />
              </Link>
            </div>
          )
        })}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section
          className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
          id="learn-detail-topic-reflection"
          data-ai-anchor="topic-reflection"
        >
          <p className="eyebrow">Reflection</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{topic.practicalReflection}</p>
        </section>
        <section
          className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
          id="learn-detail-topic-action"
          data-ai-anchor="topic-action"
        >
          <p className="eyebrow">Action</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{topic.actionPrompt}</p>
        </section>
      </div>
    </LearnDetailShell>
  )
}
