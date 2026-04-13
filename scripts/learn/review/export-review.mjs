import path from "node:path"
import {
  PRIORITY_PATH,
  RUBRIC_PATH,
  SNAPSHOT_DIR,
  KIND_ORDER,
  buildDatasetIndexes,
  ensureDir,
  flattenReviewItems,
  loadArchiveDataset,
  loadAuditCache,
  loadReviewState,
  pathExists,
  readJson,
  readText,
  resolveSourceLines,
  writeText,
} from "./review-helpers.mjs"

const AUDIT_KIND_KEYS = {
  "daily-guidance": "dailyGuidance",
  "shabad-deep-dive": "shabadDeepDives",
  "topic-guide": "topicGuides",
  "topic-scenario": "topicScenarios",
  collection: "collections",
}

function getEditablePayload(kind, item) {
  if (kind === "daily-guidance") {
    return {
      title: item.title,
      rotationTheme: item.rotation?.theme ?? "",
      summary: item.summary,
      takeaway: item.takeaway,
      lifeApplication: item.lifeApplication,
      source: {
        shortMeaning: item.source.shortMeaning,
        lifeApplication: item.source.lifeApplication,
      },
    }
  }

  if (kind === "shabad-deep-dive") {
    return {
      title: item.title,
      summary: item.summary,
      whyItMatters: item.whyItMatters,
      takeaway: item.takeaway,
      structure: item.structure,
    }
  }

  if (kind === "topic-guide") {
    return {
      title: item.title,
      shortTitle: item.shortTitle,
      issueStatement: item.issueStatement,
      centralInsight: item.centralInsight,
      practicalReflection: item.practicalReflection,
      actionPrompt: item.actionPrompt,
      excerpts: item.excerpts.map(excerpt => ({
        source: {
          shortMeaning: excerpt.source.shortMeaning,
          lifeApplication: excerpt.source.lifeApplication,
        },
        explanation: excerpt.explanation,
      })),
    }
  }

  if (kind === "topic-scenario") {
    return {
      title: item.title,
      issueStatement: item.issueStatement,
      centralInsight: item.centralInsight,
      practicalReflection: item.practicalReflection,
      actionPrompt: item.actionPrompt,
      excerpts: item.excerpts.map(excerpt => ({
        source: {
          shortMeaning: excerpt.source.shortMeaning,
          lifeApplication: excerpt.source.lifeApplication,
        },
        explanation: excerpt.explanation,
      })),
    }
  }

  return {
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    heroSource: {
      shortMeaning: item.heroSource.shortMeaning,
      lifeApplication: item.heroSource.lifeApplication,
    },
  }
}

function getEntrySources(kind, item) {
  if (kind === "daily-guidance") return [item.source]
  if (kind === "collection") return [item.heroSource]
  if (kind === "topic-guide" || kind === "topic-scenario") return item.excerpts.map(excerpt => excerpt.source)
  if (kind === "shabad-deep-dive") {
    return [
      {
        deepDiveId: item.id,
        verseIds: item.keyVerseIds,
      },
    ]
  }
  return []
}

function renderSourceSection(dataset, kind, item) {
  if (kind === "shabad-deep-dive") {
    const lines = item.lines.filter(line => item.keyVerseIds.includes(line.verseId))
    return lines.length === 0
      ? "- No keyed lines found.\n"
      : lines.map(line => `- \`${line.verseId}\` ${line.gurmukhi}\n  English: ${line.translation}`).join("\n") + "\n"
  }

  return getEntrySources(kind, item).map((source, index) => {
    const lines = resolveSourceLines(dataset, source)
    const heading = `- Source ${index + 1}: \`${source.deepDiveId}\` · verseIds ${source.verseIds.join(", ")}`
    const renderedLines = lines.length === 0
      ? "  No lines resolved."
      : lines.map(line => `  - \`${line.verseId}\` ${line.gurmukhi}\n    English: ${line.translation}`).join("\n")
    return `${heading}\n${renderedLines}`
  }).join("\n")
}

function findLinkedShabad(dataset, guidance) {
  const linkedId = guidance.relatedShabadIds?.[0] ?? guidance.source?.deepDiveId
  if (!linkedId) return null
  return dataset.shabadDeepDives.find(shabad => shabad.id === linkedId) ?? null
}

function buildPriorityMap(priority) {
  return new Map(priority.map((entry, index) => [`${entry.kind}:${entry.id}`, { rank: index + 1, ...entry }]))
}

async function main() {
  const { source, dataset } = await loadArchiveDataset({ preferDrafts: true })
  const reviewState = await loadReviewState()
  const audit = await loadAuditCache()
  const priority = (await pathExists(PRIORITY_PATH)) ? await readJson(PRIORITY_PATH) : []
  const priorityMap = buildPriorityMap(priority)
  const rubric = await readText(RUBRIC_PATH)
  const indexes = buildDatasetIndexes(dataset)
  void indexes

  const groupedEntries = Object.fromEntries(KIND_ORDER.map(kind => [kind, []]))
  for (const entry of flattenReviewItems(dataset)) {
    groupedEntries[entry.kind].push(entry)
  }

  await ensureDir(SNAPSHOT_DIR)

  for (const kind of KIND_ORDER) {
    const auditSummary = audit?.archive?.byKind?.[AUDIT_KIND_KEYS[kind]] ?? null
    const renderedLinkedShabadIds = new Set()
    const entries = groupedEntries[kind]
      .slice()
      .sort((left, right) => {
        const leftPriority = priorityMap.get(`${left.kind}:${left.id}`)?.score ?? -1
        const rightPriority = priorityMap.get(`${right.kind}:${right.id}`)?.score ?? -1
        return rightPriority - leftPriority || left.id.localeCompare(right.id)
      })

    const body = entries.map(({ id, item }) => {
      const priorityEntry = priorityMap.get(`${kind}:${id}`)
      const state = reviewState.items[kind]?.[id] ?? {
        reviewer: null,
        status: "pending",
        reviewedAt: null,
        batchTag: null,
        notes: null,
      }
      const score = item.editorial?.scores?.overall ?? 0
      const linkedShabad = kind === "daily-guidance" ? findLinkedShabad(dataset, item) : null
      const linkedShabadState = linkedShabad
        ? reviewState.items["shabad-deep-dive"]?.[linkedShabad.id] ?? {
            reviewer: null,
            status: "pending",
            reviewedAt: null,
            batchTag: null,
            notes: null,
          }
        : null
      const linkedShabadBlockShouldRender =
        linkedShabad && !renderedLinkedShabadIds.has(linkedShabad.id)
      if (linkedShabadBlockShouldRender) {
        renderedLinkedShabadIds.add(linkedShabad.id)
      }

      return [
        `<!-- REVIEW-ENTRY: ${kind} ${id} -->`,
        `## \`${id}\` ${item.title ? `- ${item.title}` : "- [blank title]"}`,
        `- Priority rank: ${priorityEntry?.rank ?? "n/a"}`,
        `- Priority score: ${priorityEntry?.score ?? "n/a"}`,
        `- Current overall: ${score.toFixed(2)}`,
        `- Editorial status: ${item.editorial?.status ?? "missing"}`,
        `- Origin: ${item.editorial?.origin ?? "unknown"}`,
        `- Reviewed by human: ${item.editorial?.reviewedByHuman === true ? "true" : "false"}`,
        `- Assigned theme: ${item.rotation?.theme ?? item.theme ?? "n/a"}`,
        `- Review state: ${state.status}`,
        state.reviewer ? `- Reviewer: ${state.reviewer}` : null,
        state.batchTag ? `- Batch tag: ${state.batchTag}` : null,
        state.reviewedAt ? `- Reviewed at: ${state.reviewedAt}` : null,
        state.notes ? `- Notes: ${state.notes}` : null,
        `- Current issues: ${(item.editorial?.issues ?? []).join("; ") || "none"}`,
        ``,
        `### Cited Verses`,
        renderSourceSection(dataset, kind, item),
        ``,
        `### Editable YAML`,
        "```yaml",
        JSON.stringify(getEditablePayload(kind, item), null, 2),
        "```",
        linkedShabad ? "" : null,
        linkedShabad ? "### Linked Shabad Deep Dive" : null,
        linkedShabad ? `- Linked shabad: \`${linkedShabad.id}\` - ${linkedShabad.title}` : null,
        linkedShabad ? `- Current overall: ${(linkedShabad.editorial?.scores?.overall ?? 0).toFixed(2)}` : null,
        linkedShabad ? `- Editorial status: ${linkedShabad.editorial?.status ?? "missing"}` : null,
        linkedShabad ? `- Reviewed by human: ${linkedShabad.editorial?.reviewedByHuman === true ? "true" : "false"}` : null,
        linkedShabadState ? `- Review state: ${linkedShabadState.status}` : null,
        linkedShabad ? `- Current issues: ${(linkedShabad.editorial?.issues ?? []).join("; ") || "none"}` : null,
        linkedShabad && linkedShabadBlockShouldRender ? `<!-- REVIEW-LINKED: shabad-deep-dive ${linkedShabad.id} -->` : null,
        linkedShabad && linkedShabadBlockShouldRender ? "```yaml" : null,
        linkedShabad && linkedShabadBlockShouldRender
          ? JSON.stringify(getEditablePayload("shabad-deep-dive", linkedShabad), null, 2)
          : null,
        linkedShabad && linkedShabadBlockShouldRender ? "```" : null,
        linkedShabad && !linkedShabadBlockShouldRender
          ? "- Editable block already appears earlier in this snapshot."
          : null,
      ].filter(Boolean).join("\n")
    }).join("\n\n")

    const header = [
      `# ${kind}`,
      ``,
      `Archive source: ${source}`,
      auditSummary
        ? `Audit summary: average overall ${Number(auditSummary.averageOverall ?? 0).toFixed(2)} across ${auditSummary.count ?? 0} items.`
        : null,
      ``,
      `## Rubric`,
      rubric.trim(),
      ``,
      `Edit the JSON-compatible YAML blocks in place. Apply changes with \`npm run learn:review:apply\`.`,
      ``,
      body,
      ``,
    ].filter(Boolean).join("\n")

    await writeText(path.join(SNAPSHOT_DIR, `${kind}.md`), header)
  }

  console.log(`Review snapshots written to ${SNAPSHOT_DIR}`)
}

await main()
