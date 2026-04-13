import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { scoreEditorialCopy, tokenSetSimilarity } from "./lib/editorial-rubric.mjs"
import { collectStyleIssues } from "./lib/style-guide.mjs"
import { loadTsModule } from "./lib/pipeline.mjs"
import { loadArchiveDataset } from "./review/review-helpers.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "../..")
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts/learn/.cache")
const OUTPUT_PATH = path.join(CACHE_DIR, "editorial-audit.json")

function getItemOverall(item) {
  return item?.editorial?.scores?.overall ?? 0
}

function auditLearnShellCopy(editorialCopy) {
  const learnCopy = editorialCopy.learn
  const fields = [
    ["heroBody", "Hero body", learnCopy.heroBody],
    ["heroSearchHint", "Hero search hint", learnCopy.heroSearchHint],
    ["proofBody", "Proof body", learnCopy.proofBody],
    ["proofFooter", "Proof footer", learnCopy.proofFooter],
    ["compactGuidanceBody", "Guidance compact body", learnCopy.compactGuidanceBody],
    ["compactTopicBody", "Topic compact body", learnCopy.compactTopicBody],
    ["detailBody", "Detail body", learnCopy.detailBody],
    ["topicsIntroBody", "Topics intro body", learnCopy.topicsIntroBody],
    ["shabadsIntroBody", "Shabads intro body", learnCopy.shabadsIntroBody],
    ["savedIntroBody", "Saved intro body", learnCopy.savedIntroBody],
  ]

  const evaluations = fields.map(([field, label, value]) => {
    const issues = collectStyleIssues({
      text: value,
      includeShellWarnings: true,
    })

    if ((value.match(/,/g) ?? []).length >= 6) {
      issues.push("leans too heavily on enumeration")
    }
    if (/instead of/i.test(value)) {
      issues.push("leans on defensive framing")
    }

    const scored = scoreEditorialCopy({
      textBlocks: [value],
      evidence: {
        coreClaim: label,
        emotionalState: "return",
        turn: value,
        practicalImplication: value,
        bannedOverreach: [],
      },
    })

    return {
      field,
      label,
      overall: scored.scores.overall,
      issues: Array.from(new Set(issues)),
      strengths: scored.strengths,
      value,
    }
  })

  return {
    strongest: evaluations
      .slice()
      .sort((left, right) => right.overall - left.overall)
      .slice(0, 3),
    weakest: evaluations
      .slice()
      .sort((left, right) => left.overall - right.overall)
      .slice(0, 5),
    evaluations,
  }
}

function flattenScenarioItems(topicGuides) {
  return topicGuides.flatMap(topic =>
    topic.scenarioOrder.map((scenarioKey) => {
      const scenario = topic.scenarios[scenarioKey]
      return {
        id: `${topic.id}#${scenarioKey}`,
        topicId: topic.id,
        theme: topic.rotation.theme,
        scenarioKey,
        title: scenario.title,
        overall: getItemOverall(scenario),
        status: scenario.editorial?.status ?? "draft",
        issues: scenario.editorial?.issues ?? [],
        sharedShabadIds: Array.from(new Set(scenario.excerpts.map(excerpt => excerpt.source.deepDiveId))),
        text: [
          scenario.title,
          scenario.issueStatement,
          scenario.centralInsight,
          scenario.practicalReflection,
          scenario.actionPrompt,
        ].join(" "),
      }
    })
  )
}

function summarizeKind(items) {
  return {
    count: items.length,
    averageOverall: Number(
      (
        items.reduce((total, item) => total + (item.overall ?? getItemOverall(item)), 0)
        / Math.max(1, items.length)
      ).toFixed(2)
    ),
    weakest: items
      .slice()
      .sort((left, right) => (left.overall ?? getItemOverall(left)) - (right.overall ?? getItemOverall(right)))
      .slice(0, 3)
      .map(item => ({
        id: item.id,
        title: item.title,
        overall: item.overall ?? getItemOverall(item),
        issues: item.issues ?? item.editorial?.issues ?? [],
      })),
  }
}

function buildArchiveAudit(itemsByKind, validation) {
  const scenarioItems = flattenScenarioItems(itemsByKind.topicGuides)
  const allItems = [
    ...itemsByKind.dailyGuidance.map(item => ({
      id: item.id,
      kind: "daily-guidance",
      status: item.editorial?.status ?? "draft",
      overall: getItemOverall(item),
      issues: item.editorial?.issues ?? [],
      title: item.title,
    })),
    ...itemsByKind.shabadDeepDives.map(item => ({
      id: item.id,
      kind: "shabad-deep-dive",
      status: item.editorial?.status ?? "draft",
      overall: getItemOverall(item),
      issues: item.editorial?.issues ?? [],
      title: item.title,
    })),
    ...itemsByKind.topicGuides.map(item => ({
      id: item.id,
      kind: "topic-guide",
      status: item.editorial?.status ?? "draft",
      overall: getItemOverall(item),
      issues: item.editorial?.issues ?? [],
      title: item.title,
    })),
    ...scenarioItems.map(item => ({
      id: item.id,
      kind: "topic-scenario",
      status: item.status,
      overall: item.overall,
      issues: item.issues,
      title: item.title,
    })),
    ...itemsByKind.collections.map(item => ({
      id: item.id,
      kind: "collection",
      status: item.editorial?.status ?? "draft",
      overall: getItemOverall(item),
      issues: item.editorial?.issues ?? [],
      title: item.title,
    })),
  ]

  return {
    statuses: validation.editorial.statuses,
    draftCount: validation.editorial.draftCount,
    repetitivePairs: validation.editorial.duplicateWarnings.slice(0, 25),
    weakestCanonicalTopics: itemsByKind.topicGuides
      .slice()
      .sort((left, right) => getItemOverall(left) - getItemOverall(right))
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        title: item.title,
        overall: getItemOverall(item),
        issues: item.editorial?.issues ?? [],
      })),
    weakestScenarios: scenarioItems
      .slice()
      .sort((left, right) => left.overall - right.overall)
      .slice(0, 12)
      .map(item => ({
        id: item.id,
        topicId: item.topicId,
        scenarioKey: item.scenarioKey,
        title: item.title,
        overall: item.overall,
        issues: item.issues,
      })),
    weakestPublicItems: allItems
      .slice()
      .sort((left, right) => left.overall - right.overall)
      .slice(0, 16),
    byKind: {
      dailyGuidance: summarizeKind(itemsByKind.dailyGuidance),
      shabadDeepDives: summarizeKind(itemsByKind.shabadDeepDives),
      topicGuides: summarizeKind(itemsByKind.topicGuides),
      topicScenarios: summarizeKind(scenarioItems),
      collections: summarizeKind(itemsByKind.collections),
    },
  }
}

function buildFamilyOverlapReport(topicGuides) {
  return topicGuides.map(topic => {
    const scenarioPairs = []

    for (let index = 0; index < topic.scenarioOrder.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < topic.scenarioOrder.length; compareIndex += 1) {
        const leftKey = topic.scenarioOrder[index]
        const rightKey = topic.scenarioOrder[compareIndex]
        const leftScenario = topic.scenarios[leftKey]
        const rightScenario = topic.scenarios[rightKey]
        const leftShabads = Array.from(new Set(leftScenario.excerpts.map(excerpt => excerpt.source.deepDiveId)))
        const rightShabads = Array.from(new Set(rightScenario.excerpts.map(excerpt => excerpt.source.deepDiveId)))
        const sharedShabadIds = leftShabads.filter(shabadId => rightShabads.includes(shabadId))
        const similarity = tokenSetSimilarity(
          [leftScenario.title, leftScenario.issueStatement, leftScenario.centralInsight, leftScenario.practicalReflection, leftScenario.actionPrompt].join(" "),
          [rightScenario.title, rightScenario.issueStatement, rightScenario.centralInsight, rightScenario.practicalReflection, rightScenario.actionPrompt].join(" ")
        )

        scenarioPairs.push({
          pair: `${leftKey}:${rightKey}`,
          sharedShabadIds,
          sharedShabadCount: sharedShabadIds.length,
          identicalFirstExcerpt:
            leftScenario.excerpts[0]?.source.deepDiveId === rightScenario.excerpts[0]?.source.deepDiveId
            && JSON.stringify(leftScenario.excerpts[0]?.source.verseIds ?? []) === JSON.stringify(rightScenario.excerpts[0]?.source.verseIds ?? []),
          semanticSimilarity: Number(similarity.toFixed(2)),
        })
      }
    }

    return {
      topicId: topic.id,
      theme: topic.rotation.theme,
      highestSemanticSimilarity: Number(
        Math.max(0, ...scenarioPairs.map(pair => pair.semanticSimilarity)).toFixed(2)
      ),
      maxSharedShabadCount: Math.max(0, ...scenarioPairs.map(pair => pair.sharedShabadCount)),
      overlaps: scenarioPairs
        .filter(pair => pair.sharedShabadCount > 0 || pair.semanticSimilarity >= 0.6 || pair.identicalFirstExcerpt)
        .sort((left, right) => right.semanticSimilarity - left.semanticSimilarity),
    }
  })
}

function createCatalog(manifest, searchIndex, dailyGuidance, shabadDeepDives, topicGuides, collections) {
  return {
    manifest,
    searchIndex,
    dailyGuidance,
    shabadDeepDives,
    topicGuides,
    collections,
    dailyGuidanceById: Object.fromEntries(dailyGuidance.map(item => [item.id, item])),
    shabadDeepDiveById: Object.fromEntries(shabadDeepDives.map(item => [item.id, item])),
    topicGuideById: Object.fromEntries(topicGuides.map(item => [item.id, item])),
    collectionById: Object.fromEntries(collections.map(item => [item.id, item])),
  }
}

function enumerateDayStamps(startDateString, days) {
  const startDate = new Date(`${startDateString}T00:00:00.000Z`)
  return Array.from({ length: days }, (_, index) => {
    const cursor = new Date(startDate)
    cursor.setUTCDate(startDate.getUTCDate() + index)
    return cursor.toISOString().slice(0, 10)
  })
}

function buildSurfaceCollisionReport(catalog) {
  const { getTodayLearnSurface } = loadTsModule(path.join(PROJECT_ROOT, "src/utils/learnExperience.ts"))
  const learnState = {
    viewedItems: [],
    savedItemIds: [],
    recentTopicIds: [],
    activeCollectionId: null,
    depthPreference: "balanced",
  }

  const topicListThemes = catalog.topicGuides.map(topic => topic.rotation.theme)
  const topicListDuplicates = Array.from(
    new Set(topicListThemes.filter((theme, index) => topicListThemes.indexOf(theme) !== index))
  )

  const samples = enumerateDayStamps("2026-04-01", 35).map((dayStamp) => {
    const surface = getTodayLearnSurface(catalog, dayStamp, learnState)
    const railThemes = surface.themeRail.map(topic => topic.rotation.theme)
    const duplicateRailThemes = Array.from(
      new Set(railThemes.filter((theme, index) => railThemes.indexOf(theme) !== index))
    )
    const spotlightTheme = surface.topicSpotlight.item.rotation.theme

    return {
      dayStamp,
      railTopicIds: surface.themeRail.map(topic => topic.id),
      railThemes,
      duplicateRailThemes,
      spotlightTopicId: surface.topicSpotlight.item.id,
      spotlightTheme,
      spotlightCollision: railThemes.includes(spotlightTheme),
    }
  })

  return {
    window: {
      start: samples[0]?.dayStamp ?? null,
      end: samples.at(-1)?.dayStamp ?? null,
      days: samples.length,
    },
    topicList: {
      duplicateThemes: topicListDuplicates,
      hasCollisions: topicListDuplicates.length > 0,
    },
    themeRail: {
      collisionDays: samples.filter(sample => sample.duplicateRailThemes.length > 0),
      hasCollisions: samples.some(sample => sample.duplicateRailThemes.length > 0),
    },
    spotlight: {
      collisionDays: samples.filter(sample => sample.spotlightCollision),
      hasCollisions: samples.some(sample => sample.spotlightCollision),
    },
  }
}

async function main() {
  const { source, dataset } = await loadArchiveDataset({ preferDrafts: true })
  const manifest = dataset.manifest ?? {
    inventory: {
      dailyGuidance: dataset.dailyGuidance.length,
      shabadDeepDives: dataset.shabadDeepDives.length,
      topicGuides: dataset.topicGuides.length,
      topicScenarios: dataset.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0),
      collections: dataset.collections.length,
    },
  }
  const validation = dataset.validation ?? {
    editorial: {
      statuses: { draft: 0, approved: 0, locked: 0, "theme-mismatch": 0 },
      draftCount: 0,
      duplicateWarnings: [],
    },
    hardFailures: [],
    warnings: [],
    averageCrossLinksPerItem: 0,
  }
  const searchIndex = dataset.searchIndex ?? { synonyms: {}, legacyTopicAliases: {} }
  const { dailyGuidance, shabadDeepDives, topicGuides, collections } = dataset

  const editorialModule = loadTsModule(path.join(PROJECT_ROOT, "src/content/editorialCopy.ts"))
  const editorialCopy = editorialModule.getEditorialCopy("en")
  const catalog = createCatalog(manifest, searchIndex, dailyGuidance, shabadDeepDives, topicGuides, collections)

  const shellAudit = auditLearnShellCopy(editorialCopy)
  const archiveAudit = buildArchiveAudit({
    dailyGuidance,
    shabadDeepDives,
    topicGuides,
    collections,
  }, validation)
  const familyOverlap = buildFamilyOverlapReport(topicGuides)
  const surfacedCollisions = buildSurfaceCollisionReport(catalog)

  const report = {
    generatedAt: new Date().toISOString(),
    inventory: manifest.inventory,
    archive: archiveAudit,
    learnShell: shellAudit,
    weakestCanonicalTopics: archiveAudit.weakestCanonicalTopics,
    weakestScenarios: archiveAudit.weakestScenarios,
    surfacedCollisions,
    familyOverlap,
    validationSummary: {
      hardFailureCount: validation.hardFailures.length,
      warningCount: validation.warnings.length,
      averageCrossLinksPerItem: validation.averageCrossLinksPerItem,
    },
  }

  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`)

  console.log(`Editorial audit written to ${OUTPUT_PATH}`)
  console.log(`Archive source: ${source}`)
  console.log(
    `Archive statuses: locked ${archiveAudit.statuses.locked ?? 0}, approved ${archiveAudit.statuses.approved ?? 0}, draft ${archiveAudit.statuses.draft ?? 0}, theme-mismatch ${archiveAudit.statuses["theme-mismatch"] ?? 0}`
  )
  console.log(
    `Weakest canonical topic: ${archiveAudit.weakestCanonicalTopics[0]?.id ?? "none"}`
  )
  console.log(
    `Weakest scenario: ${archiveAudit.weakestScenarios[0]?.id ?? "none"}`
  )
  console.log(
    `Surface collisions: topic list=${surfacedCollisions.topicList.hasCollisions}, theme rail=${surfacedCollisions.themeRail.hasCollisions}, spotlight=${surfacedCollisions.spotlight.hasCollisions}`
  )
  console.log("Weakest Learn shell copy fields:")
  for (const entry of shellAudit.weakest.slice(0, 3)) {
    console.log(`- ${entry.label}: ${entry.issues.join("; ") || "no explicit issue"}, score ${entry.overall.toFixed(2)}`)
  }
}

await main()
