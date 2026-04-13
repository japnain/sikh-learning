import path from "node:path"
import { HARD_BANNED_PATTERNS, toTokens } from "../lib/style-guide.mjs"
import { checkShortMeaningTranslationEcho } from "../lib/editorial-rubric.mjs"
import { TOPIC_FAMILIES } from "../lib/topic-taxonomy.mjs"
import {
  PRIORITY_PATH,
  buildDatasetIndexes,
  ensureDir,
  flattenReviewItems,
  loadArchiveDataset,
  resolveSourceLines,
  writeJson,
} from "./review-helpers.mjs"

function countPatternHits(text, patterns) {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0)
}

function getThemeOverlapRatio(themeKey, lines) {
  const family = TOPIC_FAMILIES.find(entry => entry.key === themeKey)
  if (!family) return 1

  const keywordTokens = new Set([
    ...toTokens(family.key),
    ...toTokens(family.shortTitle),
    ...family.keywords.flatMap(keyword => toTokens(keyword)),
  ])
  if (keywordTokens.size === 0) return 1

  const verseTokens = new Set(lines.flatMap(line => toTokens(line.translation ?? "")))
  const overlap = Array.from(keywordTokens).filter(token => verseTokens.has(token)).length
  return overlap / keywordTokens.size
}

function getSourceEchoFlags(dataset, item) {
  const sources =
    item.source
      ? [item.source]
      : item.heroSource
        ? [item.heroSource]
        : Array.isArray(item.excerpts)
          ? item.excerpts.map(excerpt => excerpt.source)
          : []

  return sources.map((source) => {
    const translation = resolveSourceLines(dataset, source).map(line => line.translation).join(" ")
    return checkShortMeaningTranslationEcho(source.shortMeaning ?? "", translation)
  })
}

function getItemText(item) {
  if (item.source) {
    return [item.title, item.summary, item.takeaway, item.lifeApplication, item.source.shortMeaning, item.source.lifeApplication]
      .filter(Boolean)
      .join(" ")
  }
  if (item.heroSource) {
    return [item.title, item.subtitle, item.description, item.heroSource.shortMeaning, item.heroSource.lifeApplication]
      .filter(Boolean)
      .join(" ")
  }
  if (Array.isArray(item.structure)) {
    return [item.title, item.summary, item.whyItMatters, item.takeaway, ...item.structure].filter(Boolean).join(" ")
  }
  if (Array.isArray(item.excerpts)) {
    return [
      item.title,
      item.issueStatement,
      item.centralInsight,
      item.practicalReflection,
      item.actionPrompt,
      ...item.excerpts.flatMap(excerpt => [
        excerpt.explanation,
        excerpt.source?.shortMeaning,
        excerpt.source?.lifeApplication,
      ]),
    ].filter(Boolean).join(" ")
  }
  return JSON.stringify(item)
}

async function main() {
  const { dataset } = await loadArchiveDataset({ preferDrafts: true })
  const indexes = buildDatasetIndexes(dataset)

  const priority = flattenReviewItems(dataset).map(({ kind, id, item }) => {
    const text = getItemText(item)
    const bannedHits = countPatternHits(text, HARD_BANNED_PATTERNS)
    const sourceEchoes = getSourceEchoFlags(dataset, item)
    const shortMeaningEcho = sourceEchoes.some(result => result.rejected)
    const overall = item.editorial?.scores?.overall ?? 0
    const themeMismatch =
      item.editorial?.status === "theme-mismatch"
      || (
        kind === "daily-guidance"
        && getThemeOverlapRatio(item.rotation?.theme, resolveSourceLines(dataset, item.source)) < 0.15
      )
    const generated = item.editorial?.origin === "generated" ? 1 : 0
    const score =
      bannedHits * 5
      + (shortMeaningEcho ? 4 : 0)
      + (themeMismatch ? 3 : 0)
      + (5 - overall)
      + generated

    return {
      kind,
      id,
      title: item.title ?? "",
      theme: item.rotation?.theme ?? item.theme ?? null,
      score: Number(score.toFixed(2)),
      components: {
        hardBannedHits: bannedHits,
        shortMeaningEcho,
        themeMismatch,
        overall: Number(overall.toFixed(2)),
        generated: Boolean(generated),
      },
      editorial: item.editorial ?? null,
      sourceStatus: item.editorial?.status ?? "unknown",
      reviewedByHuman: item.editorial?.reviewedByHuman === true,
      citationCount:
        item.source
          ? item.source.verseIds.length
          : item.heroSource
            ? item.heroSource.verseIds.length
            : Array.isArray(item.excerpts)
              ? item.excerpts.reduce((count, excerpt) => count + (excerpt.source?.verseIds?.length ?? 0), 0)
              : 0,
      references:
        kind === "daily-guidance"
          ? item.source.deepDiveId
          : kind === "collection"
            ? item.heroSource.deepDiveId
            : kind === "topic-scenario"
              ? item.excerpts.map(excerpt => excerpt.source.deepDiveId)
              : kind === "topic-guide"
                ? item.excerpts.map(excerpt => excerpt.source.deepDiveId)
                : item.id,
      hasKnownParent:
        kind !== "topic-scenario"
        || Boolean(indexes.topicGuidesById[item.topicId]),
    }
  }).sort((left, right) => right.score - left.score || left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id))

  await ensureDir(path.dirname(PRIORITY_PATH))
  await writeJson(PRIORITY_PATH, priority)

  console.log(`Priority ranking written to ${PRIORITY_PATH}`)
  console.log(`Highest priority: ${priority[0]?.kind ?? "none"} ${priority[0]?.id ?? "n/a"} (${priority[0]?.score ?? 0})`)
}

await main()
