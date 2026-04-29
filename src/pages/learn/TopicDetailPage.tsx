import { useEffect } from "react"
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom"
import SurfaceStateCard from "../../components/SurfaceStateCard"
import { IconArrowRight } from "../../components/icons"
import useLearnCatalog from "../../hooks/useLearnCatalog"
import useLearnDetail from "../../hooks/useLearnDetail"
import { useLearningStore } from "../../store/learning"
import { resolveLineReference } from "../../utils/learnExperience"
import { buildLearnDetailPath, LEARN_DETAIL_RAILS } from "../../utils/learnRails"
import LearnDetailShell from "./LearnDetailShell"
import CitationLine from "./components/CitationLine"
import { useLanguageStore } from "../../store/language"
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from "../../utils/readerDisplay"

const LEARN_ANCHOR_OFFSET_CLASS = "scroll-mt-32 md:scroll-mt-36"

function MissingTopicDetail({
  state,
  errorCode = null,
}: {
  state: 'loading' | 'empty' | 'degraded'
  errorCode?: string | null
}) {
  return (
    <SurfaceStateCard
      surface="learn-topic-detail"
      state={state}
      eyebrow="Topics"
      title={state === 'loading' ? 'Preparing this topic.' : state === 'degraded' ? 'This topic needs another pass.' : 'This topic is not available right now.'}
      body={state === 'loading'
        ? 'The topic guide is loading into place.'
        : state === 'degraded'
          ? 'The topic guide did not settle this time. Reload and try again, or return to Topics.'
          : 'The requested topic guide could not be found in the current Learn archive.'}
      testId="page-learn-detail-missing"
      page="learn-detail"
      errorCode={errorCode}
      actions={state === 'loading'
        ? []
        : [
            {
              label: state === 'degraded' ? 'Reload Topic' : 'Back to Topics',
              onClick: () => {
                if (state === 'degraded') {
                  window.location.reload()
                  return
                }
                window.location.assign('/learn?tab=topics')
              },
              aiAction: state === 'degraded' ? 'reload-topic-detail' : 'back-to-topics',
            },
          ]}
    />
  )
}

export default function TopicDetailPage() {
  const scriptMode = useLanguageStore(state => state.scriptMode)
  const { topicId } = useParams<{ topicId: string }>()
  const [searchParams] = useSearchParams()
  const { catalog, error: catalogError, status: catalogStatus } = useLearnCatalog()
  const { item: topic, error: topicError, status: topicStatus } = useLearnDetail("topic-guide", topicId)
  const recordLearnItemView = useLearningStore(state => state.recordLearnItemView)

  useEffect(() => {
    if (topic) {
      recordLearnItemView(topic.id, "topic-guide")
    }
  }, [recordLearnItemView, topic])

  if (catalogStatus === 'loading' || topicStatus === 'loading') return <MissingTopicDetail state="loading" />
  if (catalogStatus === 'degraded' || topicStatus === 'degraded' || catalogError || topicError || !catalog) {
    return <MissingTopicDetail state="degraded" errorCode={catalogError ?? topicError ?? 'unavailable'} />
  }

  const aliasTarget = topicId ? catalog.searchIndex.legacyTopicAliases[topicId] : null
  if (!topic && aliasTarget) {
    return (
      <Navigate
        to={buildLearnDetailPath("topic-guide", aliasTarget.topicId, searchParams.get("from") ?? undefined, aliasTarget.scenarioKey ?? null)}
        replace
      />
    )
  }

  if (!topic) return <MissingTopicDetail state="empty" />

  const from = searchParams.get("from") ?? "topics"
  const scenarioParam = searchParams.get("scenario")
  const hasScenarioParam = Boolean(
    scenarioParam
    && Object.prototype.hasOwnProperty.call(topic.scenarios ?? {}, scenarioParam)
  )
  const activeScenarioKey = hasScenarioParam
    ? scenarioParam as keyof typeof topic.scenarios
    : topic.defaultScenarioKey ?? "overview"
  const activeScenario = activeScenarioKey === "overview"
    ? null
    : topic.scenarios?.[activeScenarioKey] ?? null
  const activeTitle = activeScenario?.title ?? topic.title
  const activeIssueStatement = activeScenario?.issueStatement ?? topic.issueStatement
  const activeInsight = activeScenario?.centralInsight ?? topic.centralInsight
  const activeReflection = activeScenario?.practicalReflection ?? topic.practicalReflection
  const activeAction = activeScenario?.actionPrompt ?? topic.actionPrompt
  const activeExcerpts = activeScenario?.excerpts ?? topic.excerpts

  return (
    <LearnDetailShell
      title={activeTitle}
      body={activeIssueStatement}
      itemId={topic.id}
      itemKind="topic-guide"
      rail={LEARN_DETAIL_RAILS["topics-topic"]}
      sectionLabel="Topics"
      sectionTab="topics"
      defaultFrom="topics"
    >
      <section
        className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-topic-scenarios"
        data-ai-anchor="topic-scenarios"
      >
        <p className="eyebrow">Scenario Views</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={buildLearnDetailPath("topic-guide", topic.id, from)}
            aria-current={activeScenarioKey === "overview" ? "page" : undefined}
            className={`rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-300 ${
              activeScenarioKey === "overview"
                ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg"
                : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"
            }`}
          >
            Overview
          </Link>
          {topic.scenarioOrder.map((scenarioKey) => (
            <Link
              key={scenarioKey}
              to={buildLearnDetailPath("topic-guide", topic.id, from, scenarioKey)}
              aria-current={activeScenarioKey === scenarioKey ? "page" : undefined}
              className={`rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all duration-300 ${
                activeScenarioKey === scenarioKey
                  ? "bg-saffron text-white dark:bg-gold dark:text-dark-bg"
                  : "bg-parchment-low text-ink/72 dark:bg-dark-surface dark:text-dark-text/72"
              }`}
            >
              {topic.scenarios[scenarioKey].label}
            </Link>
          ))}
        </div>
      </section>

      <section
        className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-topic-insight"
        data-ai-anchor="topic-insight"
      >
        <p className="eyebrow">Central Insight</p>
        <p className="mt-2 font-sans text-base leading-7 text-ink dark:text-dark-text">{activeInsight}</p>
      </section>

      <section
        className={`space-y-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
        id="learn-detail-topic-excerpts"
        data-ai-anchor="topic-excerpts"
      >
        {activeExcerpts.map(excerpt => {
          const resolved = resolveLineReference(catalog, excerpt.source)

          return (
            <div key={`${resolved.deepDive.id}:${excerpt.source.verseIds.join("-")}`} className="section-shell-quiet p-4">
              <CitationLine shabad={resolved.deepDive} />
              <div className="mt-3 space-y-3">
                {resolved.lines.map(line => (
                  <div key={line.verseId} className="reader-divider pb-3 last:pb-0">
                    <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-[1.65rem] leading-9 text-ink dark:text-dark-text`}>
                      {renderScriptText(line.gurmukhi, scriptMode)}
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
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{activeReflection}</p>
        </section>
        <section
          className={`section-shell-quiet p-4 ${LEARN_ANCHOR_OFFSET_CLASS}`}
          id="learn-detail-topic-action"
          data-ai-anchor="topic-action"
        >
          <p className="eyebrow">Action</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink dark:text-dark-text">{activeAction}</p>
        </section>
      </div>
    </LearnDetailShell>
  )
}
