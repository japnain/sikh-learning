import { scoreEditorialCopy } from "./editorial-rubric.mjs"
import { EDITORIAL_VOICE_VERSION, normalizeEditorialText } from "./style-guide.mjs"

function tokenSetSimilarity(left, right) {
  const leftTokens = new Set(normalizeEditorialText(left).split(" ").filter(Boolean))
  const rightTokens = new Set(normalizeEditorialText(right).split(" ").filter(Boolean))
  const overlap = Array.from(leftTokens).filter(token => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : overlap / union
}

function getOrigin(kind, item, legacyIds) {
  if (item?.editorial?.forcedLocked) return "manual"
  return legacyIds[kind].has(item.id) ? "legacy" : "generated"
}

function buildAssessment({
  kind,
  item,
  evidence,
  templateKey,
  origin,
  lockedByDefault = false,
}) {
  const textBlocks =
    kind === "daily-guidance"
      ? [item.title, item.summary, item.takeaway, item.lifeApplication, item.source.shortMeaning]
      : kind === "shabad-deep-dive"
        ? [item.title, item.summary, item.whyItMatters, item.takeaway, ...item.structure]
        : kind === "topic-guide"
          ? [item.title, item.issueStatement, item.centralInsight, item.practicalReflection, item.actionPrompt, ...item.excerpts.map(excerpt => excerpt.explanation)]
          : [item.title, item.subtitle, item.description]

  const reviewed = scoreEditorialCopy({
    textBlocks,
    evidence,
  })

  const requiresActionThreshold = kind === "daily-guidance" || kind === "topic-guide"
  let status = "approved"
  if (
    reviewed.issues.some(issue =>
      issue.includes("placeholder")
      || issue.includes("banned overreach")
      || issue.includes("do not support")
    )
    || reviewed.scores.overall < (requiresActionThreshold ? 2.95 : 2.75)
    || reviewed.scores.faithfulness < 2.75
    || (requiresActionThreshold && reviewed.scores.usefulness < 2.5)
  ) {
    status = "draft"
  } else if (
    lockedByDefault
    && reviewed.scores.overall >= 3.8
    && reviewed.scores.faithfulness >= 3.7
    && reviewed.scores.clarity >= 3.2
    && reviewed.scores.usefulness >= 3.1
    && reviewed.scores.beauty >= 3.1
  ) {
    status = "locked"
  } else if (origin === "legacy" && reviewed.scores.overall >= 3.55 && reviewed.scores.faithfulness >= 3.7) {
    status = "locked"
  }

  return {
    status,
    origin,
    voiceVersion: EDITORIAL_VOICE_VERSION,
    templateKey,
    evidence,
    scores: reviewed.scores,
    strengths: reviewed.strengths,
    issues: reviewed.issues,
  }
}

function buildGuidanceEvidence(item, dataset) {
  const shabad = dataset.shabadDeepDivesById[item.source.deepDiveId]
  return {
    coreClaim: item.source.shortMeaning || item.takeaway,
    emotionalState: shabad?.emotionalStates?.join(", ") || item.rotation.theme,
    turn: shabad?.takeaway || item.summary,
    practicalImplication: item.lifeApplication,
    bannedOverreach: [],
  }
}

function buildShabadEvidence(item) {
  return {
    coreClaim: item.summary,
    emotionalState: item.emotionalStates.join(", "),
    turn: item.structure[1] || item.takeaway,
    practicalImplication: item.takeaway,
    bannedOverreach: [],
  }
}

function buildTopicEvidence(item, dataset) {
  const relatedShabad = dataset.shabadDeepDivesById[item.relatedShabadIds[0]]
  return {
    coreClaim: item.centralInsight,
    emotionalState: relatedShabad?.emotionalStates?.join(", ") || item.category,
    turn: item.issueStatement,
    practicalImplication: item.actionPrompt,
    bannedOverreach: [],
  }
}

function buildTopicScenarioEvidence(topic, scenarioKey, dataset) {
  const scenario = topic.scenarios[scenarioKey]
  const relatedShabad = dataset.shabadDeepDivesById[scenario.excerpts[0]?.source.deepDiveId]
  return {
    coreClaim: scenario.centralInsight,
    emotionalState: relatedShabad?.emotionalStates?.join(", ") || topic.category,
    turn: scenario.issueStatement,
    practicalImplication: scenario.actionPrompt,
    bannedOverreach: [],
  }
}

function buildCollectionEvidence(item, dataset) {
  const heroShabad = dataset.shabadDeepDivesById[item.heroSource.deepDiveId]
  return {
    coreClaim: item.description,
    emotionalState: heroShabad?.emotionalStates?.join(", ") || item.themes.join(", "),
    turn: item.subtitle,
    practicalImplication: `Move through ${item.items.length} linked steps without dropping the thread.`,
    bannedOverreach: [],
  }
}

function registerSimilarityIssue(left, right, record, duplicateWarnings) {
  const duplicateMessage = `${record.label}: ${left.id} vs ${right.id}`
  duplicateWarnings.push(duplicateMessage)

  const loser = left.editorial.scores.overall <= right.editorial.scores.overall ? left : right
  const existingIssues = new Set(loser.editorial.issues)
  existingIssues.add(`too similar to ${loser === left ? right.id : left.id}`)
  loser.editorial.issues = Array.from(existingIssues)
  if (loser.editorial.status !== "locked") {
    loser.editorial.status = "draft"
  }
}

function reviewSimilarity(dataset) {
  const duplicateWarnings = []
  const topicScenarioItems = dataset.topicGuides.flatMap(topic =>
    topic.scenarioOrder.map((scenarioKey) => ({
      id: `${topic.id}#${scenarioKey}`,
      topicId: topic.id,
      editorial: topic.scenarios[scenarioKey].editorial,
      title: topic.scenarios[scenarioKey].title,
      issueStatement: topic.scenarios[scenarioKey].issueStatement,
      centralInsight: topic.scenarios[scenarioKey].centralInsight,
      practicalReflection: topic.scenarios[scenarioKey].practicalReflection,
      actionPrompt: topic.scenarios[scenarioKey].actionPrompt,
    }))
  )
  const buckets = [
    {
      label: "daily guidance similarity",
      items: dataset.dailyGuidance,
      group: item => item.source.deepDiveId,
      text: item => `${item.title} ${item.summary} ${item.takeaway} ${item.lifeApplication}`,
      threshold: 0.92,
    },
    {
      label: "topic guide similarity",
      items: dataset.topicGuides,
      group: item => item.rotation.theme,
      text: item => `${item.title} ${item.issueStatement} ${item.centralInsight} ${item.practicalReflection}`,
      threshold: 0.94,
    },
    {
      label: "topic scenario similarity",
      items: topicScenarioItems,
      group: item => item.topicId,
      text: item => `${item.title} ${item.issueStatement} ${item.centralInsight} ${item.practicalReflection} ${item.actionPrompt}`,
      threshold: 0.88,
    },
    {
      label: "collection similarity",
      items: dataset.collections,
      group: item => item.themes[0] || item.id,
      text: item => `${item.title} ${item.subtitle} ${item.description}`,
      threshold: 0.94,
    },
  ]

  for (const record of buckets) {
    for (let index = 0; index < record.items.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < record.items.length; compareIndex += 1) {
        const left = record.items[index]
        const right = record.items[compareIndex]
        if (record.group(left) !== record.group(right)) continue
        const similarity = tokenSetSimilarity(record.text(left), record.text(right))
        if (similarity >= record.threshold) {
          registerSimilarityIssue(left, right, record, duplicateWarnings)
        }
      }
    }
  }

  return duplicateWarnings
}

export function applyEditorialReview(dataset, legacySeed) {
  const legacyIds = {
    "daily-guidance": new Set(legacySeed.dailyGuidance.map(item => item.id)),
    "shabad-deep-dive": new Set(legacySeed.shabadDeepDives.map(item => item.id)),
    "topic-guide": new Set(legacySeed.topicGuides.map(item => item.id)),
    collection: new Set(legacySeed.collections.map(item => item.id)),
  }

  for (const item of dataset.dailyGuidance) {
    item.editorial = buildAssessment({
      kind: "daily-guidance",
      item,
      evidence: buildGuidanceEvidence(item, dataset),
      templateKey: `guidance:${item.source.verseIds.length}-line-window`,
      origin: getOrigin("daily-guidance", item, legacyIds),
    })
  }

  for (const item of dataset.shabadDeepDives) {
    item.editorial = buildAssessment({
      kind: "shabad-deep-dive",
      item,
      evidence: buildShabadEvidence(item),
      templateKey: item.id.startsWith("shabad-generated-") ? "shabad:generated" : "shabad:legacy",
      origin: getOrigin("shabad-deep-dive", item, legacyIds),
    })
  }

  for (const item of dataset.topicGuides) {
    item.editorial = buildAssessment({
      kind: "topic-guide",
      item,
      evidence: buildTopicEvidence(item, dataset),
      templateKey: item.id.split("-").slice(0, 3).join(":"),
      origin: getOrigin("topic-guide", item, legacyIds),
      lockedByDefault: item.editorial?.forcedLocked === true,
    })

    for (const scenarioKey of item.scenarioOrder) {
      const scenario = item.scenarios[scenarioKey]
      scenario.editorial = buildAssessment({
        kind: "topic-guide",
        item: {
          ...scenario,
          excerpts: scenario.excerpts,
        },
        evidence: buildTopicScenarioEvidence(item, scenarioKey, dataset),
        templateKey: `${item.id}:${scenarioKey}`,
        origin: scenario.editorial?.forcedLocked === true ? "manual" : "generated",
        lockedByDefault: scenario.editorial?.forcedLocked === true,
      })
    }
  }

  for (const item of dataset.collections) {
    item.editorial = buildAssessment({
      kind: "collection",
      item,
      evidence: buildCollectionEvidence(item, dataset),
      templateKey: item.items.length >= 4 ? "collection:journey" : "collection:bundle",
      origin: getOrigin("collection", item, legacyIds),
    })
  }

  const duplicateWarnings = reviewSimilarity(dataset)
  const allItems = [
    ...dataset.dailyGuidance.map(item => ({ id: item.id, kind: "daily-guidance", editorial: item.editorial })),
    ...dataset.shabadDeepDives.map(item => ({ id: item.id, kind: "shabad-deep-dive", editorial: item.editorial })),
    ...dataset.topicGuides.map(item => ({ id: item.id, kind: "topic-guide", editorial: item.editorial })),
    ...dataset.topicGuides.flatMap(item =>
      item.scenarioOrder.map((scenarioKey) => ({
        id: `${item.id}#${scenarioKey}`,
        kind: "topic-guide",
        editorial: item.scenarios[scenarioKey].editorial,
      }))
    ),
    ...dataset.collections.map(item => ({ id: item.id, kind: "collection", editorial: item.editorial })),
  ]

  const statuses = { draft: 0, approved: 0, locked: 0 }
  for (const item of allItems) {
    statuses[item.editorial.status] += 1
  }

  const lowScoringItems = allItems
    .filter(item => item.editorial.scores.overall < 3.9 || item.editorial.issues.length > 0)
    .sort((left, right) => left.editorial.scores.overall - right.editorial.scores.overall)
    .slice(0, 25)
    .map(item => ({
      id: item.id,
      kind: item.kind,
      status: item.editorial.status,
      overall: item.editorial.scores.overall,
      issues: item.editorial.issues,
    }))

  return {
    voiceVersion: EDITORIAL_VOICE_VERSION,
    statuses,
    draftCount: statuses.draft,
    lowScoringItems,
    duplicateWarnings,
  }
}
