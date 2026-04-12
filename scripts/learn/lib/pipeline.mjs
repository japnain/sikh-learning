import fs from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"
import { fileURLToPath } from "node:url"
import { TOPIC_FAMILIES, TOPIC_LENSES } from "./topic-taxonomy.mjs"
import { applyEditorialReview } from "./copy-critic.mjs"
import { createHuggingFaceAdapter } from "./huggingface-adapter.mjs"
import { PLACEHOLDER_PATTERNS } from "./style-guide.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const PROJECT_ROOT = path.resolve(__dirname, "../../..")
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts/learn/.cache")
const DRAFTS_PATH = path.join(CACHE_DIR, "learn-drafts.json")
const CORPUS_PATH = path.join(CACHE_DIR, "sggs-corpus.json")
const VALIDATION_PATH = path.join(CACHE_DIR, "learn-validation.json")
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public/data/learn")

const KIND_LABELS = {
  "daily-guidance": "Daily guidance",
  "shabad-deep-dive": "Shabad deep dive",
  "topic-guide": "Topic guide",
  collection: "Collection",
}

const LENGTH_BANDS = [
  { key: "short", max: 8 },
  { key: "medium", max: 16 },
  { key: "long", max: Number.POSITIVE_INFINITY },
]

const MODULE_CACHE = new Map()

function titleCase(value) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stableHash(input) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function inferLengthBand(lines) {
  const lineCount = lines.length
  return LENGTH_BANDS.find(entry => lineCount <= entry.max)?.key ?? "long"
}

function inferDifficulty(lines) {
  const averageLength =
    lines.reduce((total, line) => total + (line.translation?.split(" ").length ?? 0), 0) / Math.max(1, lines.length)
  if (lines.length >= 18 || averageLength >= 16) return "deep"
  if (lines.length >= 10 || averageLength >= 12) return "growing"
  return "beginner"
}

function cleanSentence(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
}

function lowerFirst(value) {
  if (!value) return value
  return `${value[0].toLowerCase()}${value.slice(1)}`
}

function summarizeLine(line) {
  return cleanSentence(line.translation.replace(/^\w+:\s*/, "").replace(/\|\|.*$/, ""))
}

function trimToSentence(value, wordLimit = 14) {
  const tokens = cleanSentence(value).split(" ")
  if (tokens.length <= wordLimit) return cleanSentence(value).replace(/[.]+$/, "")
  return `${tokens.slice(0, wordLimit).join(" ").replace(/[.]+$/, "")}`
}

function buildTitleFromTranslation(text, fallback) {
  const cleaned = cleanSentence(text)
    .replace(/^(o\s+\w+,\s*)/i, "")
    .replace(/^the\s+/i, "")
    .replace(/^and\s+/i, "")
    .replace(/^by\s+/i, "")
    .replace(/^through\s+/i, "")
    .replace(/[|]+.*$/, "")
  const words = cleaned.split(" ").filter(Boolean)
  if (words.length >= 3) {
    return titleCase(words.slice(0, Math.min(7, words.length)).join(" ").replace(/[.]+$/, ""))
  }
  return fallback
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"))
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function resolveModulePath(basePath, specifier) {
  const candidates = [
    specifier,
    `${specifier}.ts`,
    `${specifier}.js`,
    path.join(specifier, "index.ts"),
    path.join(specifier, "index.js"),
  ]
  for (const candidate of candidates) {
    const resolved = path.resolve(path.dirname(basePath), candidate)
    try {
      return require.resolve(resolved)
    } catch {
      continue
    }
  }
  throw new Error(`Unable to resolve ${specifier} from ${basePath}`)
}

export function loadTsModule(modulePath) {
  const resolved = path.resolve(modulePath)
  if (MODULE_CACHE.has(resolved)) {
    return MODULE_CACHE.get(resolved)
  }

  const source = ts.sys.readFile(resolved)
  if (!source) {
    throw new Error(`Could not read ${resolved}`)
  }

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: resolved,
  })

  const module = { exports: {} }
  MODULE_CACHE.set(resolved, module.exports)

  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      return loadTsModule(resolveModulePath(resolved, specifier))
    }
    return require(specifier)
  }

  const context = vm.createContext({
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: path.dirname(resolved),
    __filename: resolved,
    console,
    process,
    fetch,
    global,
  })

  new vm.Script(transpiled.outputText, { filename: resolved }).runInContext(context)
  MODULE_CACHE.set(resolved, module.exports)
  return module.exports
}

export function loadLegacySeed() {
  const learnContent = loadTsModule(path.join(PROJECT_ROOT, "src/data/learnContent.ts"))
  return {
    dailyGuidance: learnContent.DAILY_GUIDANCE_ENTRIES,
    shabadDeepDives: learnContent.SHABAD_DEEP_DIVES,
    topicGuides: learnContent.TOPIC_GUIDES,
    collections: learnContent.COLLECTIONS,
  }
}

function getTopicFamily(key) {
  return TOPIC_FAMILIES.find(family => family.key === key) ?? TOPIC_FAMILIES[0]
}

function classifyShabad(scriptureEntry) {
  const normalized = normalizeText(
    scriptureEntry.lines.map(line => line.translation_en).join(" ")
  )
  const rankedFamilies = TOPIC_FAMILIES
    .map(family => ({
      family,
      score: family.keywords.reduce((total, keyword) => {
        const normalizedKeyword = normalizeText(keyword)
        return total + (normalized.includes(normalizedKeyword) ? 2 : 0)
      }, 0) + (stableHash(`${scriptureEntry.shabadId}:${family.key}`) % 5),
    }))
    .sort((left, right) => right.score - left.score)

  const primary = rankedFamilies[0]?.family ?? TOPIC_FAMILIES[0]
  const secondary = rankedFamilies.slice(1, 3).map(entry => entry.family)
  const families = [primary, ...secondary]
  const emotionalStates = Array.from(new Set(families.flatMap(entry => entry.emotionalStates))).slice(0, 3)
  const themes = Array.from(new Set(families.map(entry => entry.key))).slice(0, 3)

  return {
    primary,
    secondary,
    themes,
    emotionalStates,
  }
}

function pickKeyLineIds(lines, primaryTheme) {
  const normalizedTheme = normalizeText(primaryTheme)
  const scored = lines
    .filter(line => line.verseId)
    .map((line, index) => ({
      line,
      index,
      score: (normalizeText(line.translation).includes(normalizedTheme) ? 5 : 0)
        + (index === 0 ? 3 : 0)
        + (index === lines.length - 1 ? 4 : 0)
        + (stableHash(`${line.verseId}:${primaryTheme}`) % 7),
    }))
    .sort((left, right) => right.score - left.score)

  const verseIds = Array.from(new Set(scored.slice(0, Math.min(4, scored.length)).map(entry => entry.line.verseId)))
  return verseIds.length > 0 ? verseIds.sort((left, right) => left - right) : lines.slice(0, 1).map(line => line.verseId)
}

function toLearnLines(scriptureEntry) {
  return scriptureEntry.lines
    .filter(line => line.verseId)
    .map(line => ({
      verseId: line.verseId,
      gurmukhi: line.gurmukhi,
      transliteration: line.transliteration,
      translation: line.translation_en,
    }))
}

function buildGuidanceWindows(deepDive) {
  const lineIds = deepDive.lines.map(line => line.verseId).filter(Boolean)
  const midpointId = lineIds[Math.floor(lineIds.length / 2)] ?? lineIds[0]
  const candidates = [
    deepDive.keyVerseIds.slice(0, 1),
    deepDive.keyVerseIds.slice(0, Math.min(2, deepDive.keyVerseIds.length)),
    deepDive.keyVerseIds.length >= 2
      ? deepDive.keyVerseIds.slice(-2)
      : [lineIds[lineIds.length - 1] ?? midpointId],
    [midpointId],
  ]

  const unique = []
  const seen = new Set()
  for (const candidate of candidates) {
    const filtered = candidate.filter(Boolean)
    if (filtered.length === 0) continue
    const key = filtered.join(",")
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(filtered)
  }
  return unique
}

function summarizeVerseWindow(selectedLines) {
  const fragments = selectedLines
    .map(line => trimToSentence(summarizeLine(line), 12))
    .filter(Boolean)

  if (fragments.length === 0) return ""
  if (fragments.length === 1) return fragments[0]
  return `${fragments[0]}; ${lowerFirst(fragments[fragments.length - 1])}`
}

function createRotation(theme, depthLevel, priority, balanceCategory, freshnessTier = "evergreen") {
  return {
    theme,
    depthLevel,
    cooldownWindowDays: 45,
    seasonality: ["evergreen"],
    priority,
    freshnessTier,
    balanceCategory,
  }
}

function balanceCategoryForFamily(familyKey) {
  if (["anxiety", "fear", "mercy", "loneliness", "self-worth", "shame", "restlessness", "exhaustion"].includes(familyKey)) {
    return "comfort"
  }
  if (["discipline", "speech", "conduct", "honesty", "patience", "seva"].includes(familyKey)) {
    return "discipline"
  }
  if (["gratitude", "contentment"].includes(familyKey)) {
    return "gratitude"
  }
  if (["hukam", "control"].includes(familyKey)) {
    return "hukam"
  }
  if (["ego", "comparison", "greed"].includes(familyKey)) {
    return "challenge"
  }
  if (["seva", "sangat"].includes(familyKey)) {
    return "seva"
  }
  return "reflection"
}

function createDeepDiveFromScripture(scriptureEntry, index) {
  const classification = classifyShabad(scriptureEntry)
  const lines = toLearnLines(scriptureEntry)
  const keyVerseIds = pickKeyLineIds(lines, classification.primary.key)
  const leadLine = lines.find(line => line.verseId === keyVerseIds[0]) ?? lines[0]
  const middleLine = lines[Math.floor(lines.length / 2)] ?? leadLine
  const closingLine = lines[lines.length - 1] ?? leadLine
  const openingMeaning = trimToSentence(summarizeLine(leadLine), 14)
  const middleMeaning = trimToSentence(summarizeLine(middleLine), 14)
  const closingMeaning = trimToSentence(summarizeLine(closingLine), 14)
  const title = buildTitleFromTranslation(
    leadLine?.translation ?? "",
    `${classification.primary.shortTitle} In Gurbani`
  )

  return {
    id: `shabad-generated-${scriptureEntry.shabadId}`,
    title,
    subtitle: `${scriptureEntry.raag || "SGGS"} · Ang ${scriptureEntry.ang}`,
    summary: `${classification.primary.shortTitle} is carried here from ${lowerFirst(openingMeaning)} toward ${lowerFirst(closingMeaning)}.`,
    whyItMatters: `This shabad is useful when life feels ${classification.emotionalStates.join(", ")}, because it keeps ${classification.primary.shortTitle.toLowerCase()} inside remembrance, conduct, and the Creator's larger care instead of private mood.`,
    takeaway: `${classification.primary.shortTitle} steadies when ${lowerFirst(closingMeaning)}.`,
    themes: classification.themes,
    emotionalStates: classification.emotionalStates,
    difficulty: inferDifficulty(lines),
    estimatedMinutes: Math.max(6, Math.min(14, Math.round(lines.length / 2))),
    lengthBand: inferLengthBand(lines),
    citation: {
      scripture: "SGGS",
      shabad_id: scriptureEntry.shabadId,
      ang: scriptureEntry.ang,
      guru: scriptureEntry.writer || "Guru Granth",
      raag: scriptureEntry.raag || "Unknown",
      line_range: [1, lines.length],
      verse_ids: lines.map(line => line.verseId),
      translator: "BaniDB English",
    },
    lines,
    structure: [
      `The opening movement names the pressure directly: ${lowerFirst(openingMeaning)}.`,
      `The middle movement deepens the correction by holding the mind inside ${lowerFirst(middleMeaning)}.`,
      `The closing movement leaves a return you can actually keep: ${lowerFirst(closingMeaning)}.`,
    ],
    keyVerseIds,
    relatedGuidanceIds: [],
    relatedTopicIds: [],
    relatedCollectionIds: [],
    rotation: createRotation(
      classification.primary.key,
      inferDifficulty(lines),
      6 + (stableHash(`${scriptureEntry.shabadId}`) % 5),
      balanceCategoryForFamily(classification.primary.key)
    ),
    editorial: null,
  }
}

function createLineReference(deepDive, verseIds) {
  const selectedLines = deepDive.lines.filter(line => verseIds.includes(line.verseId))
  const shortMeaning = summarizeVerseWindow(selectedLines.length > 0 ? selectedLines : deepDive.lines.slice(0, 1))
  const lifeApplication = `${deepDive.takeaway} Let the wider window set the tone before the old reflex does.`

  return {
    deepDiveId: deepDive.id,
    verseIds,
    shortMeaning,
    lifeApplication,
  }
}

function createGuidanceFromShabad(deepDive, slotIndex, familyKey) {
  const windows = buildGuidanceWindows(deepDive)
  const verseIds = windows[slotIndex % windows.length]
  const source = createLineReference(deepDive, verseIds)
  const selectedLines = deepDive.lines.filter(line => verseIds.includes(line.verseId))
  const leadLine = selectedLines[0] ?? deepDive.lines[0]
  const tailLine = selectedLines[selectedLines.length - 1] ?? deepDive.lines[deepDive.lines.length - 1] ?? leadLine
  const family = getTopicFamily(familyKey)
  const windowMeaning = summarizeVerseWindow(selectedLines.length > 0 ? selectedLines : [leadLine])
  const variants = [
    {
      key: "doorway",
      fallbackTitle: `Begin with ${family.shortTitle}`,
      titleLine: leadLine,
      summary: `${family.shortTitle} is named plainly here before the mind has time to decorate it.`,
      takeaway: windowMeaning,
      lifeApplication: `${family.actionBase} Begin with the part of the day already in front of you.`,
      sourceLife: `${family.shortTitle} becomes more truthful when ${lowerFirst(windowMeaning)}.`,
    },
    {
      key: "pressure",
      fallbackTitle: `Hold ${family.shortTitle} Under Pressure`,
      titleLine: tailLine,
      summary: `${family.shortTitle} is being answered in the middle of pressure, not after the day has calmed down.`,
      takeaway: windowMeaning,
      lifeApplication: `${family.actionBase} Use the line before the pressure chooses your tone.`,
      sourceLife: `Let the wider line hold together what the mind wants to split apart.`,
    },
    {
      key: "return",
      fallbackTitle: `Return through ${family.shortTitle}`,
      titleLine: tailLine,
      summary: `The shabad does not leave ${family.shortTitle.toLowerCase()} at diagnosis. It turns toward return.`,
      takeaway: trimToSentence(summarizeLine(tailLine), 14),
      lifeApplication: `${family.actionBase} After the reaction, make the next return smaller and truer.`,
      sourceLife: `Return begins when the later line is allowed to outlast the first rush of feeling.`,
    },
  ]
  const variant = variants[slotIndex % variants.length]
  const title = buildTitleFromTranslation(
    variant.titleLine.translation,
    variant.fallbackTitle
  )

  return {
    id: `guidance-${deepDive.id.replace(/^shabad-/, "")}-${slotIndex + 1}`,
    title,
    summary: variant.summary,
    takeaway: variant.takeaway,
    lifeApplication: variant.lifeApplication,
    source: {
      ...source,
      lifeApplication: variant.sourceLife,
    },
    relatedTopicIds: [],
    relatedShabadIds: [deepDive.id],
    relatedCollectionIds: [],
    rotation: createRotation(
      family.key,
      deepDive.difficulty === "deep" ? "growing" : deepDive.difficulty,
      7 + ((slotIndex + stableHash(deepDive.id)) % 4),
      balanceCategoryForFamily(family.key),
      slotIndex === 0 ? "fresh" : "evergreen"
    ),
    editorial: null,
  }
}

function buildTopicGuide(family, lens, candidateShabads, existingIds) {
  const explanationPatterns = [
    (excerpt) => `The line names the pressure without melodrama: ${lowerFirst(excerpt.source.shortMeaning)}.`,
    (excerpt) => `The turn is practical here. ${excerpt.source.lifeApplication}`,
    () => `${lens.insight(family)} This keeps the guide attached to Gurbani rather than floating into advice.`,
  ]
  const excerpts = candidateShabads.slice(0, 3).map((deepDive, index) => {
    const verseIds = deepDive.keyVerseIds.slice(index % Math.max(1, deepDive.keyVerseIds.length), (index % Math.max(1, deepDive.keyVerseIds.length)) + 1)
    const selectedVerseIds = verseIds.length > 0 ? verseIds : deepDive.keyVerseIds.slice(0, 1)
    const source = createLineReference(deepDive, selectedVerseIds)
    return {
      source,
      explanation: explanationPatterns[index % explanationPatterns.length]({ source }),
    }
  })

  const id = existingIds.has(`topic-${family.key}`) && lens.key === "daily"
    ? `topic-${family.key}-daily`
    : `topic-${family.key}-${lens.key}`

  return {
    id,
    title: lens.title(family),
    shortTitle: `${family.shortTitle} · ${titleCase(lens.key)}`,
    category: family.category,
    issueStatement: lens.issue(family),
    centralInsight: lens.insight(family),
    practicalReflection: `${candidateShabads[0]?.takeaway ?? family.insightBase} ${family.actionBase}`.trim(),
    actionPrompt: lens.action(family),
    searchTerms: Array.from(new Set([
      ...family.searchTerms,
      ...lens.extraSearchTerms,
      family.shortTitle.toLowerCase(),
    ])),
    excerpts,
    relatedShabadIds: candidateShabads.slice(0, 3).map(item => item.id),
    relatedTopicIds: [],
    relatedCollectionIds: [],
    rotation: createRotation(
      family.key,
      lens.key === "practice" ? "growing" : "beginner",
      6 + (stableHash(`${family.key}:${lens.key}`) % 4),
      balanceCategoryForFamily(family.key)
    ),
    editorial: null,
  }
}

function buildCollection({ id, title, subtitle, description, heroSource, themes, items }) {
  return {
    id,
    title,
    subtitle,
    description,
    durationLabel: items.length >= 4 ? `${items.length}-step journey` : `${items.length}-step bundle`,
    themes,
    heroSource,
    items,
    relatedTopicIds: [],
    relatedShabadIds: [],
    editorial: null,
  }
}

function averageCrossLinks(dataset) {
  const totalItems =
    dataset.dailyGuidance.length
    + dataset.shabadDeepDives.length
    + dataset.topicGuides.length
    + dataset.collections.length
  if (totalItems === 0) return 0

  const crossLinks =
    dataset.dailyGuidance.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length, 0)
    + dataset.shabadDeepDives.reduce((count, item) => count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
    + dataset.topicGuides.reduce((count, item) => count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
    + dataset.collections.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length, 0)

  return crossLinks / totalItems
}

function buildSearchIndex(topicGuides) {
  const synonyms = {}
  for (const topic of topicGuides) {
    for (const term of topic.searchTerms) {
      const normalized = normalizeText(term)
      if (!normalized || synonyms[normalized]) continue
      synonyms[normalized] = topic.id
    }
  }

  return {
    synonyms,
    topics: topicGuides.map(topic => ({
      id: topic.id,
      title: topic.title,
      shortTitle: topic.shortTitle,
      searchTerms: topic.searchTerms,
    })),
  }
}

function wireRelationships(dataset) {
  const topicsByTheme = new Map()
  for (const topic of dataset.topicGuides) {
    const key = topic.id.split("-")[1] ?? "anxiety"
    const list = topicsByTheme.get(key) ?? []
    list.push(topic.id)
    topicsByTheme.set(key, list)
  }

  const collectionsByTheme = new Map()
  for (const collection of dataset.collections) {
    for (const theme of collection.themes) {
      const list = collectionsByTheme.get(theme) ?? []
      list.push(collection.id)
      collectionsByTheme.set(theme, list)
    }
  }

  for (const shabad of dataset.shabadDeepDives) {
    const primaryTheme = shabad.themes[0] ?? "anxiety"
    shabad.relatedTopicIds = (topicsByTheme.get(primaryTheme) ?? []).slice(0, 3)
    shabad.relatedCollectionIds = (collectionsByTheme.get(primaryTheme) ?? []).slice(0, 3)
  }

  for (const guidance of dataset.dailyGuidance) {
    const sourceShabad = dataset.shabadDeepDivesById[guidance.relatedShabadIds[0]]
    const primaryTheme = sourceShabad?.themes[0] ?? guidance.rotation.theme
    guidance.relatedTopicIds = (topicsByTheme.get(primaryTheme) ?? []).slice(0, 3)
    guidance.relatedCollectionIds = (collectionsByTheme.get(primaryTheme) ?? []).slice(0, 2)
  }

  const guidanceByShabad = new Map()
  for (const guidance of dataset.dailyGuidance) {
    const shabadId = guidance.relatedShabadIds[0]
    const list = guidanceByShabad.get(shabadId) ?? []
    list.push(guidance.id)
    guidanceByShabad.set(shabadId, list)
  }

  for (const shabad of dataset.shabadDeepDives) {
    shabad.relatedGuidanceIds = (guidanceByShabad.get(shabad.id) ?? []).slice(0, 4)
  }

  const siblingTopicsByFamily = new Map()
  for (const topic of dataset.topicGuides) {
    const parts = topic.id.split("-")
    const familyKey = parts[1] ?? "anxiety"
    const list = siblingTopicsByFamily.get(familyKey) ?? []
    list.push(topic.id)
    siblingTopicsByFamily.set(familyKey, list)
  }

  for (const topic of dataset.topicGuides) {
    const familyKey = topic.id.split("-")[1] ?? "anxiety"
    topic.relatedTopicIds = (siblingTopicsByFamily.get(familyKey) ?? [])
      .filter(candidate => candidate !== topic.id)
      .slice(0, 2)
    topic.relatedCollectionIds = (collectionsByTheme.get(familyKey) ?? []).slice(0, 3)
  }

  for (const collection of dataset.collections) {
    const topicIds = collection.items.filter(item => item.kind === "topic-guide").map(item => item.id)
    const shabadIds = collection.items.filter(item => item.kind === "shabad-deep-dive").map(item => item.id)
    collection.relatedTopicIds = Array.from(new Set([
      ...topicIds,
      ...collection.themes.flatMap(theme => (topicsByTheme.get(theme) ?? []).slice(0, 1)),
    ])).slice(0, 4)
    collection.relatedShabadIds = Array.from(new Set([
      ...shabadIds,
      ...collection.themes.flatMap(theme =>
        dataset.shabadDeepDives
          .filter(item => item.themes.includes(theme))
          .slice(0, 2)
          .map(item => item.id)
      ),
    ])).slice(0, 4)
  }
}

function buildDatasetIndexes(dataset) {
  return {
    dailyGuidanceById: Object.fromEntries(dataset.dailyGuidance.map(item => [item.id, item])),
    shabadDeepDivesById: Object.fromEntries(dataset.shabadDeepDives.map(item => [item.id, item])),
    topicGuidesById: Object.fromEntries(dataset.topicGuides.map(item => [item.id, item])),
    collectionsById: Object.fromEntries(dataset.collections.map(item => [item.id, item])),
  }
}

export async function syncSggsCorpus({
  shabadTarget = 140,
  refresh = false,
} = {}) {
  await ensureDir(CACHE_DIR)
  if (!refresh) {
    try {
      return await readJson(CORPUS_PATH)
    } catch {
      // Ignore missing cache and continue.
    }
  }

  const legacy = loadLegacySeed()
  const { fetchAng, fetchShabad } = loadTsModule(path.join(PROJECT_ROOT, "src/api/banidb.ts"))

  const shabadIds = new Set(legacy.shabadDeepDives.map(item => item.citation.shabad_id))
  const orderedAngs = []
  let currentAng = 1
  for (let count = 0; count < 1430; count += 1) {
    orderedAngs.push(currentAng)
    currentAng = ((currentAng + 16) % 1430) + 1
  }

  for (const ang of orderedAngs) {
    if (shabadIds.size >= shabadTarget) break
    const entries = await fetchAng(ang, "G")
    for (const entry of entries) {
      if (entry.shabadId) {
        shabadIds.add(entry.shabadId)
      }
    }
  }

  const scriptureEntries = []
  for (const shabadId of shabadIds) {
    const shabad = await fetchShabad(shabadId)
    if (shabad?.shabadId) {
      scriptureEntries.push(shabad)
    }
  }

  const corpus = {
    generatedAt: new Date().toISOString(),
    scripture: "SGGS",
    shabads: scriptureEntries,
  }
  await writeJson(CORPUS_PATH, corpus)
  return corpus
}

export async function generateDrafts() {
  const legacy = loadLegacySeed()
  const corpus = await syncSggsCorpus()
  const huggingFaceAdapter = createHuggingFaceAdapter()

  const existingShabadIds = new Set(legacy.shabadDeepDives.map(item => item.citation.shabad_id))
  const generatedShabads = corpus.shabads
    .filter(item => item.shabadId && !existingShabadIds.has(item.shabadId))
    .slice(0, 100 - legacy.shabadDeepDives.length)
    .map((entry, index) => createDeepDiveFromScripture(entry, index))

  const shabadDeepDives = [...legacy.shabadDeepDives, ...generatedShabads]
  const shabadDeepDivesById = Object.fromEntries(shabadDeepDives.map(item => [item.id, item]))

  const dailyGuidance = [...legacy.dailyGuidance]
  for (const shabad of shabadDeepDives) {
    const slots = shabad.citation.shabad_id % 5 < 2 ? 3 : 2
    for (let slotIndex = 0; slotIndex < slots; slotIndex += 1) {
      if (dailyGuidance.length >= 240) break
      const guidance = createGuidanceFromShabad(shabad, slotIndex, shabad.themes[0] ?? "anxiety")
      if (!dailyGuidance.some(item => item.id === guidance.id)) {
        dailyGuidance.push(guidance)
      }
    }
    if (dailyGuidance.length >= 240) break
  }

  const existingTopicIds = new Set(legacy.topicGuides.map(item => item.id))
  const themeShabads = new Map()
  for (const shabad of shabadDeepDives) {
    for (const theme of shabad.themes) {
      const list = themeShabads.get(theme) ?? []
      list.push(shabad)
      themeShabads.set(theme, list)
    }
  }

  const generatedTopics = []
  for (const family of TOPIC_FAMILIES) {
    const candidates = (themeShabads.get(family.key) ?? shabadDeepDives)
      .slice(0, 6)
    if (candidates.length < 2) continue
    for (const lens of TOPIC_LENSES) {
      if (legacy.topicGuides.length + generatedTopics.length >= 100) break
      const topic = buildTopicGuide(family, lens, candidates, existingTopicIds)
      if (!existingTopicIds.has(topic.id) && !generatedTopics.some(item => item.id === topic.id)) {
        generatedTopics.push(topic)
      }
    }
  }

  const topicGuides = [...legacy.topicGuides, ...generatedTopics].slice(0, 100)
  const topicGuidesById = Object.fromEntries(topicGuides.map(item => [item.id, item]))

  const guidanceByTheme = new Map()
  for (const item of dailyGuidance) {
    const theme = item.rotation.theme
    const list = guidanceByTheme.get(theme) ?? []
    list.push(item)
    guidanceByTheme.set(theme, list)
  }

  const collections = legacy.collections.map(item => ({
    ...item,
    items: item.items.slice(0, 7),
  }))
  for (const family of TOPIC_FAMILIES) {
    const theme = family.key
    const topic = topicGuides.find(item => item.id === `topic-${theme}`) ?? topicGuides.find(item => item.id.startsWith(`topic-${theme}`))
    const shabads = (themeShabads.get(theme) ?? []).slice(0, 3)
    const guidance = (guidanceByTheme.get(theme) ?? []).slice(0, 3)
    if (!topic || shabads.length < 2 || guidance.length === 0) continue

    collections.push(buildCollection({
      id: `collection-${theme}-journey`,
      title: `From ${family.shortTitle} to steadier practice`,
      subtitle: `A deliberate path through ${family.shortTitle.toLowerCase()}`,
      description: `${family.insightBase} This path starts with short guidance, opens the topic fully, and then stays long enough with Gurbani to change pace.`,
      heroSource: guidance[0].source,
      themes: [theme, ...(shabads[1]?.themes ?? []).slice(0, 1)],
      items: [
        { kind: "daily-guidance", id: guidance[0].id },
        { kind: "topic-guide", id: topic.id },
        { kind: "shabad-deep-dive", id: shabads[0].id },
        { kind: "daily-guidance", id: guidance[1]?.id ?? guidance[0].id },
        { kind: "shabad-deep-dive", id: shabads[1].id },
      ],
    }))

    collections.push(buildCollection({
      id: `collection-${theme}-bundle`,
      title: `${family.shortTitle} in one shorter sitting`,
      subtitle: `A compact bundle for ${family.shortTitle.toLowerCase()}`,
      description: `${family.issueBase} This shorter bundle keeps one guidance card, one topic guide, and one shabad together so the archive stays usable on busy days.`,
      heroSource: guidance[0].source,
      themes: [theme],
      items: [
        { kind: "daily-guidance", id: guidance[0].id },
        { kind: "topic-guide", id: topic.id },
        { kind: "shabad-deep-dive", id: shabads[0].id },
      ],
    }))
  }

  const familyPairs = TOPIC_FAMILIES.flatMap((family, index) => {
    const partner = TOPIC_FAMILIES[(index + 1) % TOPIC_FAMILIES.length]
    return [
      [family, partner],
      [family, TOPIC_FAMILIES[(index + 7) % TOPIC_FAMILIES.length]],
    ]
  })

  for (const [leftFamily, rightFamily] of familyPairs) {
    if (collections.length >= 100) break
    const leftTopic = topicGuides.find(item => item.id.startsWith(`topic-${leftFamily.key}`))
    const rightTopic = topicGuides.find(item => item.id.startsWith(`topic-${rightFamily.key}`))
    const leftGuidance = (guidanceByTheme.get(leftFamily.key) ?? [])[0]
    const rightGuidance = (guidanceByTheme.get(rightFamily.key) ?? [])[0]
    const leftShabad = (themeShabads.get(leftFamily.key) ?? [])[0]
    const rightShabad = (themeShabads.get(rightFamily.key) ?? [])[0]
    if (!leftTopic || !rightTopic || !leftGuidance || !rightGuidance || !leftShabad || !rightShabad) continue

    collections.push(buildCollection({
      id: `collection-${leftFamily.key}-to-${rightFamily.key}-${collections.length}`,
      title: `${leftFamily.shortTitle} to ${rightFamily.shortTitle}`,
      subtitle: `A cross-linked bridge between two recurring pressures`,
      description: `${leftFamily.insightBase} This bridge then carries into ${rightFamily.insightBase.toLowerCase()}`,
      heroSource: leftGuidance.source,
      themes: [leftFamily.key, rightFamily.key],
      items: [
        { kind: "daily-guidance", id: leftGuidance.id },
        { kind: "topic-guide", id: leftTopic.id },
        { kind: "shabad-deep-dive", id: leftShabad.id },
        { kind: "topic-guide", id: rightTopic.id },
        { kind: "daily-guidance", id: rightGuidance.id },
        { kind: "shabad-deep-dive", id: rightShabad.id },
      ],
    }))
  }

  const dataset = {
    version: "2026-04-11",
    generatedAt: new Date().toISOString(),
    dailyGuidance,
    shabadDeepDives,
    topicGuides,
    collections: collections.slice(0, 100),
  }

  Object.assign(dataset, buildDatasetIndexes(dataset))
  wireRelationships(dataset)
  dataset.searchIndex = buildSearchIndex(dataset.topicGuides)
  dataset.generation = {
    huggingFaceAdapterEnabled: huggingFaceAdapter.enabled,
  }
  dataset.editorialReview = applyEditorialReview(dataset, legacy)

  await writeJson(DRAFTS_PATH, dataset)
  return dataset
}

function collectDuplicateIds(items) {
  const seen = new Map()
  for (const item of items) {
    seen.set(item.id, (seen.get(item.id) ?? 0) + 1)
  }
  return Array.from(seen.entries()).filter(([, count]) => count > 1).map(([id]) => id)
}

export async function validateDrafts(drafts = null) {
  const dataset = drafts ?? await generateDrafts()
  const hardFailures = []
  const warnings = []

  const duplicateIds = {
    dailyGuidance: collectDuplicateIds(dataset.dailyGuidance),
    shabadDeepDives: collectDuplicateIds(dataset.shabadDeepDives),
    topicGuides: collectDuplicateIds(dataset.topicGuides),
    collections: collectDuplicateIds(dataset.collections),
  }

  for (const [kind, ids] of Object.entries(duplicateIds)) {
    if (ids.length > 0) {
      hardFailures.push(`${kind} contains duplicate ids: ${ids.join(", ")}`)
    }
  }

  const shabadIds = new Set()
  for (const shabad of dataset.shabadDeepDives) {
    if (shabadIds.has(shabad.citation.shabad_id)) {
      hardFailures.push(`Duplicate shabad coverage found for shabad_id ${shabad.citation.shabad_id}`)
    }
    shabadIds.add(shabad.citation.shabad_id)
  }

  const guidanceKeys = new Set()
  for (const guidance of dataset.dailyGuidance) {
    const key = `${guidance.source.deepDiveId}:${guidance.source.verseIds.join(",")}:${normalizeText(guidance.takeaway)}`
    if (guidanceKeys.has(key)) {
      hardFailures.push(`Duplicate daily guidance window detected for ${guidance.id}`)
    }
    guidanceKeys.add(key)
  }

  const indexes = buildDatasetIndexes(dataset)
  for (const guidance of dataset.dailyGuidance) {
    if (!indexes.shabadDeepDivesById[guidance.source.deepDiveId]) {
      hardFailures.push(`Guidance ${guidance.id} references missing shabad ${guidance.source.deepDiveId}`)
    }
    for (const relatedId of guidance.relatedTopicIds) {
      if (!indexes.topicGuidesById[relatedId]) {
        hardFailures.push(`Guidance ${guidance.id} references missing topic ${relatedId}`)
      }
    }
  }

  for (const shabad of dataset.shabadDeepDives) {
    for (const relatedId of shabad.relatedGuidanceIds) {
      if (!indexes.dailyGuidanceById[relatedId]) {
        hardFailures.push(`Shabad ${shabad.id} references missing guidance ${relatedId}`)
      }
    }
  }

  for (const topic of dataset.topicGuides) {
    const shabadCount = new Set(topic.excerpts.map(excerpt => excerpt.source.deepDiveId)).size
    if (topic.excerpts.length < 3 || shabadCount < 2) {
      hardFailures.push(`Topic ${topic.id} does not have at least 3 excerpts from 2 shabads`)
    }
  }

  for (const collection of dataset.collections) {
    if (!collection.heroSource?.deepDiveId) {
      hardFailures.push(`Collection ${collection.id} is missing a hero source`)
    }
    if (collection.items.length < 2 || collection.items.length > 7) {
      hardFailures.push(`Collection ${collection.id} has invalid length ${collection.items.length}`)
    }
    for (const item of collection.items) {
      if (item.kind === "daily-guidance" && !indexes.dailyGuidanceById[item.id]) {
        hardFailures.push(`Collection ${collection.id} has missing daily guidance step ${item.id}`)
      }
      if (item.kind === "topic-guide" && !indexes.topicGuidesById[item.id]) {
        hardFailures.push(`Collection ${collection.id} has missing topic step ${item.id}`)
      }
      if (item.kind === "shabad-deep-dive" && !indexes.shabadDeepDivesById[item.id]) {
        hardFailures.push(`Collection ${collection.id} has missing shabad step ${item.id}`)
      }
    }
  }

  for (const bucket of [dataset.dailyGuidance, dataset.shabadDeepDives, dataset.topicGuides, dataset.collections]) {
    for (const item of bucket) {
      const payload = JSON.stringify(item)
      if (PLACEHOLDER_PATTERNS.some(pattern => pattern.test(payload))) {
        hardFailures.push(`${item.id} contains placeholder copy`)
      }
    }
  }

  const synonymTargets = new Map()
  for (const [synonym, topicId] of Object.entries(dataset.searchIndex.synonyms)) {
    const existing = synonymTargets.get(synonym)
    if (existing && existing !== topicId) {
      hardFailures.push(`Synonym conflict for ${synonym}: ${existing} vs ${topicId}`)
    }
    synonymTargets.set(synonym, topicId)
  }

  if (dataset.editorialReview?.draftCount > 0) {
    warnings.push(`Editorial review left ${dataset.editorialReview.draftCount} items in draft status for future revision`)
  }

  warnings.push(...(dataset.editorialReview?.duplicateWarnings ?? []))
  warnings.push(
    ...(dataset.editorialReview?.lowScoringItems ?? []).map(
      item => `Editorial review: ${item.kind} ${item.id} scored ${item.overall.toFixed(2)}`
    )
  )

  const inventory = {
    dailyGuidance: dataset.dailyGuidance.length,
    shabadDeepDives: dataset.shabadDeepDives.length,
    topicGuides: dataset.topicGuides.length,
    collections: dataset.collections.length,
    crossLinks:
      dataset.dailyGuidance.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length, 0)
      + dataset.shabadDeepDives.reduce((count, item) => count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
      + dataset.topicGuides.reduce((count, item) => count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
      + dataset.collections.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length, 0),
    readyForLaunch: false,
  }

  const averageLinks = averageCrossLinks(dataset)
  inventory.readyForLaunch =
    hardFailures.length === 0
    && inventory.dailyGuidance >= 240
    && inventory.shabadDeepDives >= 100
    && inventory.topicGuides >= 100
    && inventory.collections >= 100
    && inventory.crossLinks >= 500
    && averageLinks >= 5

  if (averageLinks < 5) {
    hardFailures.push(`Average cross-link density is ${averageLinks.toFixed(2)}, below 5.00`)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    counts: inventory,
    averageCrossLinksPerItem: Number(averageLinks.toFixed(2)),
    editorial: {
      voiceVersion: dataset.editorialReview?.voiceVersion ?? "unknown",
      statuses: dataset.editorialReview?.statuses ?? { draft: 0, approved: 0, locked: 0 },
      draftCount: dataset.editorialReview?.draftCount ?? 0,
      lowScoringItems: dataset.editorialReview?.lowScoringItems ?? [],
      duplicateWarnings: dataset.editorialReview?.duplicateWarnings ?? [],
    },
    hardFailures,
    warnings,
  }

  await writeJson(VALIDATION_PATH, report)
  return report
}

export async function publishLearnArchive() {
  const drafts = await generateDrafts()
  const validation = await validateDrafts(drafts)
  if (validation.hardFailures.length > 0) {
    throw new Error(`Learn archive validation failed:\n${validation.hardFailures.join("\n")}`)
  }

  const shabadThemes = Array.from(new Set(drafts.shabadDeepDives.flatMap(item => item.themes))).sort((left, right) => left.localeCompare(right))
  const shabadGurus = Array.from(new Set(drafts.shabadDeepDives.map(item => item.citation.guru))).sort((left, right) => left.localeCompare(right))
  const shabadRaags = Array.from(new Set(drafts.shabadDeepDives.map(item => item.citation.raag))).sort((left, right) => left.localeCompare(right))

  const manifest = {
    version: drafts.version,
    generatedAt: drafts.generatedAt,
    inventory: validation.counts,
    targets: {
      dailyGuidance: 240,
      shabadDeepDives: 100,
      topicGuides: 100,
      collections: 100,
      crossLinks: 500,
      averageCrossLinksPerItem: 5,
    },
    filters: {
      shabadThemes,
      shabadGurus,
      shabadRaags,
    },
    searchIndexPath: "/data/learn/search-index.json",
    listPaths: {
      dailyGuidance: "/data/learn/lists/daily-guidance.json",
      shabadDeepDives: "/data/learn/lists/shabad-deep-dives.json",
      topicGuides: "/data/learn/lists/topic-guides.json",
      collections: "/data/learn/lists/collections.json",
    },
    detailPathTemplate: {
      "daily-guidance": "/data/learn/details/daily-guidance/:id.json",
      "shabad-deep-dive": "/data/learn/details/shabad-deep-dive/:id.json",
      "topic-guide": "/data/learn/details/topic-guide/:id.json",
      collection: "/data/learn/details/collection/:id.json",
    },
    validationReportPath: "/data/learn/validation-report.json",
  }

  await writeJson(path.join(PUBLIC_DIR, "manifest.json"), manifest)
  await writeJson(path.join(PUBLIC_DIR, "search-index.json"), drafts.searchIndex)
  await writeJson(path.join(PUBLIC_DIR, "validation-report.json"), validation)
  await writeJson(path.join(PUBLIC_DIR, "lists/daily-guidance.json"), drafts.dailyGuidance)
  await writeJson(path.join(PUBLIC_DIR, "lists/shabad-deep-dives.json"), drafts.shabadDeepDives)
  await writeJson(path.join(PUBLIC_DIR, "lists/topic-guides.json"), drafts.topicGuides)
  await writeJson(path.join(PUBLIC_DIR, "lists/collections.json"), drafts.collections)

  for (const item of drafts.dailyGuidance) {
    await writeJson(path.join(PUBLIC_DIR, `details/daily-guidance/${item.id}.json`), item)
  }
  for (const item of drafts.shabadDeepDives) {
    await writeJson(path.join(PUBLIC_DIR, `details/shabad-deep-dive/${item.id}.json`), item)
  }
  for (const item of drafts.topicGuides) {
    await writeJson(path.join(PUBLIC_DIR, `details/topic-guide/${item.id}.json`), item)
  }
  for (const item of drafts.collections) {
    await writeJson(path.join(PUBLIC_DIR, `details/collection/${item.id}.json`), item)
  }

  return {
    manifest,
    validation,
  }
}
