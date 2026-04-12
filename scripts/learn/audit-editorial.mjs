import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { scoreEditorialCopy } from "./lib/editorial-rubric.mjs"
import { collectStyleIssues } from "./lib/style-guide.mjs"
import { loadTsModule } from "./lib/pipeline.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "../..")
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public/data/learn")
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts/learn/.cache")
const OUTPUT_PATH = path.join(CACHE_DIR, "editorial-audit.json")

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"))
}

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

function auditArchive(itemsByKind, validation) {
  const allItems = Object.entries(itemsByKind).flatMap(([kind, items]) =>
    items.map(item => ({
      id: item.id,
      kind,
      status: item.editorial?.status ?? "draft",
      overall: getItemOverall(item),
      issues: item.editorial?.issues ?? [],
      strengths: item.editorial?.strengths ?? [],
      title: item.title,
    }))
  )

  const byKind = Object.fromEntries(
    Object.entries(itemsByKind).map(([kind, items]) => ([
      kind,
      {
        count: items.length,
        averageOverall: Number(
          (
            items.reduce((total, item) => total + getItemOverall(item), 0)
            / Math.max(1, items.length)
          ).toFixed(2)
        ),
        weakest: items
          .slice()
          .sort((left, right) => getItemOverall(left) - getItemOverall(right))
          .slice(0, 3)
          .map(item => ({
            id: item.id,
            title: item.title,
            overall: getItemOverall(item),
            issues: item.editorial?.issues ?? [],
          })),
      },
    ]))
  )

  return {
    statuses: validation.editorial.statuses,
    draftCount: validation.editorial.draftCount,
    repetitivePairs: validation.editorial.duplicateWarnings.slice(0, 25),
    weakestItems: allItems
      .slice()
      .sort((left, right) => left.overall - right.overall)
      .slice(0, 12),
    byKind,
  }
}

async function main() {
  const manifest = await readJson(path.join(PUBLIC_DIR, "manifest.json"))
  const validation = await readJson(path.join(PUBLIC_DIR, "validation-report.json"))
  const dailyGuidance = await readJson(path.join(PUBLIC_DIR, "lists/daily-guidance.json"))
  const shabadDeepDives = await readJson(path.join(PUBLIC_DIR, "lists/shabad-deep-dives.json"))
  const topicGuides = await readJson(path.join(PUBLIC_DIR, "lists/topic-guides.json"))
  const collections = await readJson(path.join(PUBLIC_DIR, "lists/collections.json"))

  const editorialModule = loadTsModule(path.join(PROJECT_ROOT, "src/content/editorialCopy.ts"))
  const editorialCopy = editorialModule.getEditorialCopy("en")

  const shellAudit = auditLearnShellCopy(editorialCopy)
  const archiveAudit = auditArchive({
    dailyGuidance,
    shabadDeepDives,
    topicGuides,
    collections,
  }, validation)

  const report = {
    generatedAt: new Date().toISOString(),
    inventory: manifest.inventory,
    archive: archiveAudit,
    learnShell: shellAudit,
  }

  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`)

  console.log(`Editorial audit written to ${OUTPUT_PATH}`)
  console.log(
    `Archive statuses: locked ${archiveAudit.statuses.locked}, approved ${archiveAudit.statuses.approved}, draft ${archiveAudit.statuses.draft}`
  )
  if (archiveAudit.repetitivePairs.length > 0) {
    console.log(`Repetitive pairs flagged: ${archiveAudit.repetitivePairs.length}`)
  }
  console.log("Weakest Learn shell copy fields:")
  for (const entry of shellAudit.weakest.slice(0, 3)) {
    console.log(`- ${entry.label}: ${entry.issues.join("; ") || "no explicit issue"}, score ${entry.overall.toFixed(2)}`)
  }
}

await main()
