import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadTsModule } from "../lib/pipeline.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const PROJECT_ROOT = path.resolve(__dirname, "../../..")
export const CACHE_DIR = path.join(PROJECT_ROOT, "scripts/learn/.cache")
export const REVIEW_DIR = path.join(PROJECT_ROOT, "scripts/learn/review")
export const SNAPSHOT_DIR = path.join(REVIEW_DIR, "snapshots")
export const EDITS_DIR = path.join(REVIEW_DIR, "edits")
export const PUBLIC_DIR = path.join(PROJECT_ROOT, "public/data/learn")
export const DRAFTS_PATH = path.join(CACHE_DIR, "learn-drafts.json")
export const AUDIT_PATH = path.join(CACHE_DIR, "editorial-audit.json")
export const VALIDATION_PATH = path.join(CACHE_DIR, "learn-validation.json")
export const PRIORITY_PATH = path.join(REVIEW_DIR, "priority.json")
export const REVIEW_STATE_PATH = path.join(REVIEW_DIR, "review-state.json")
export const RUBRIC_PATH = path.join(REVIEW_DIR, "RUBRIC.md")
export const OVERRIDE_MODULES = {
  "daily-guidance": {
    filePath: path.join(PROJECT_ROOT, "src/data/learnOverrides/guidance.ts"),
    exportName: "GUIDANCE_COPY_OVERRIDES",
    typeName: "GuidanceOverridePayload",
  },
  "shabad-deep-dive": {
    filePath: path.join(PROJECT_ROOT, "src/data/learnOverrides/shabad.ts"),
    exportName: "SHABAD_COPY_OVERRIDES",
    typeName: "ShabadOverridePayload",
  },
  "topic-guide": {
    filePath: path.join(PROJECT_ROOT, "src/data/learnOverrides/topic.ts"),
    exportName: "TOPIC_COPY_OVERRIDES",
    typeName: "TopicOverridePayload",
  },
  "topic-scenario": {
    filePath: path.join(PROJECT_ROOT, "src/data/learnOverrides/scenario.ts"),
    exportName: "SCENARIO_COPY_OVERRIDES",
    typeName: "ScenarioOverridePayload",
  },
  collection: {
    filePath: path.join(PROJECT_ROOT, "src/data/learnOverrides/collection.ts"),
    exportName: "COLLECTION_COPY_OVERRIDES",
    typeName: "CollectionOverridePayload",
  },
}

export const KIND_ORDER = [
  "daily-guidance",
  "shabad-deep-dive",
  "topic-guide",
  "topic-scenario",
  "collection",
]

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true })
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"))
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8")
}

export async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, value)
}

export function median(values) {
  const numbers = values.filter(Number.isFinite).sort((left, right) => left - right)
  if (numbers.length === 0) return 0
  const midpoint = Math.floor(numbers.length / 2)
  return numbers.length % 2 === 1
    ? numbers[midpoint]
    : (numbers[midpoint - 1] + numbers[midpoint]) / 2
}

export function getScenarioId(topicId, scenarioKey) {
  return `${topicId}#${scenarioKey}`
}

export function buildDatasetIndexes(dataset) {
  return {
    dailyGuidanceById: Object.fromEntries(dataset.dailyGuidance.map(item => [item.id, item])),
    shabadDeepDivesById: Object.fromEntries(dataset.shabadDeepDives.map(item => [item.id, item])),
    topicGuidesById: Object.fromEntries(dataset.topicGuides.map(item => [item.id, item])),
    collectionsById: Object.fromEntries(dataset.collections.map(item => [item.id, item])),
  }
}

export async function loadArchiveDataset({ preferDrafts = false } = {}) {
  const publicPaths = {
    manifest: path.join(PUBLIC_DIR, "manifest.json"),
    searchIndex: path.join(PUBLIC_DIR, "search-index.json"),
    validation: path.join(PUBLIC_DIR, "validation-report.json"),
    dailyGuidance: path.join(PUBLIC_DIR, "lists/daily-guidance.json"),
    shabadDeepDives: path.join(PUBLIC_DIR, "lists/shabad-deep-dives.json"),
    topicGuides: path.join(PUBLIC_DIR, "lists/topic-guides.json"),
    collections: path.join(PUBLIC_DIR, "lists/collections.json"),
  }

  const canUsePublic = await Promise.all(Object.values(publicPaths).map(pathExists)).then(results => results.every(Boolean))
  const canUseDrafts = await pathExists(DRAFTS_PATH)

  if (preferDrafts && canUseDrafts) {
    const draftDataset = await readJson(DRAFTS_PATH)
    return {
      source: "drafts",
      dataset: {
        ...draftDataset,
        validation: (await pathExists(VALIDATION_PATH)) ? await readJson(VALIDATION_PATH) : null,
      },
    }
  }

  if (canUsePublic) {
    return {
      source: "public",
      dataset: {
        manifest: await readJson(publicPaths.manifest),
        searchIndex: await readJson(publicPaths.searchIndex),
        validation: await readJson(publicPaths.validation),
        dailyGuidance: await readJson(publicPaths.dailyGuidance),
        shabadDeepDives: await readJson(publicPaths.shabadDeepDives),
        topicGuides: await readJson(publicPaths.topicGuides),
        collections: await readJson(publicPaths.collections),
      },
    }
  }

  if (!canUseDrafts) {
    throw new Error("No published archive or draft cache found. Run learn:publish or learn:generate-drafts first.")
  }

  const draftDataset = await readJson(DRAFTS_PATH)
  return {
    source: "drafts",
    dataset: {
      ...draftDataset,
      validation: (await pathExists(VALIDATION_PATH)) ? await readJson(VALIDATION_PATH) : null,
    },
  }
}

export async function loadAuditCache() {
  return (await pathExists(AUDIT_PATH)) ? readJson(AUDIT_PATH) : null
}

export async function loadReviewState() {
  if (!(await pathExists(REVIEW_STATE_PATH))) {
    return {
      version: 1,
      items: Object.fromEntries(KIND_ORDER.map(kind => [kind, {}])),
    }
  }

  const state = await readJson(REVIEW_STATE_PATH)
  return {
    version: state.version ?? 1,
    items: {
      ...Object.fromEntries(KIND_ORDER.map(kind => [kind, {}])),
      ...(state.items ?? {}),
    },
  }
}

export async function saveReviewState(state) {
  await writeJson(REVIEW_STATE_PATH, state)
}

export function resolveSourceLines(dataset, source) {
  const shabad = dataset.shabadDeepDives.find(item => item.id === source?.deepDiveId)
  if (!shabad) return []
  return shabad.lines.filter(line => source.verseIds.includes(line.verseId))
}

export function flattenReviewItems(dataset) {
  return [
    ...dataset.dailyGuidance.map(item => ({ kind: "daily-guidance", id: item.id, item })),
    ...dataset.shabadDeepDives.map(item => ({ kind: "shabad-deep-dive", id: item.id, item })),
    ...dataset.topicGuides.map(item => ({ kind: "topic-guide", id: item.id, item })),
    ...dataset.topicGuides.flatMap(topic =>
      topic.scenarioOrder.map(scenarioKey => ({
        kind: "topic-scenario",
        id: getScenarioId(topic.id, scenarioKey),
        item: {
          ...topic.scenarios[scenarioKey],
          topicId: topic.id,
          rotation: topic.rotation,
        },
      }))
    ),
    ...dataset.collections.map(item => ({ kind: "collection", id: item.id, item })),
  ]
}

export function loadOverrideRecord(kind) {
  const moduleInfo = OVERRIDE_MODULES[kind]
  if (!moduleInfo) {
    throw new Error(`Unsupported override kind: ${kind}`)
  }
  const module = loadTsModule(moduleInfo.filePath)
  return {
    ...moduleInfo,
    record: module[moduleInfo.exportName] ?? {},
  }
}

export function serializeOverrideModule(kind, record) {
  const moduleInfo = OVERRIDE_MODULES[kind]
  if (!moduleInfo) {
    throw new Error(`Unsupported override kind: ${kind}`)
  }

  const objectLiteral = JSON.stringify(record, null, 2)
  return `import type { ${moduleInfo.typeName} } from "../../types"\n\nexport const ${moduleInfo.exportName} = ${objectLiteral} satisfies Record<string, ${moduleInfo.typeName}>\n`
}
