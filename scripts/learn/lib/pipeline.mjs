import fs from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"
import { fileURLToPath } from "node:url"
import { TOPIC_FAMILIES } from "./topic-taxonomy.mjs"
import { PREMIUM_EDITORIAL_THRESHOLDS, applyEditorialReview } from "./copy-critic.mjs"
import { createHuggingFaceAdapter } from "./huggingface-adapter.mjs"
import { HARD_BANNED_PATTERNS, PLACEHOLDER_PATTERNS, collectStyleIssues, toTokens } from "./style-guide.mjs"
import { TOPIC_GOLD_SET } from "./topic-gold-set.mjs"
import { checkShortMeaningTranslationEcho, scoreEditorialCopy, tokenSetSimilarity } from "./editorial-rubric.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const PROJECT_ROOT = path.resolve(__dirname, "../../..")
const CACHE_DIR = path.join(PROJECT_ROOT, "scripts/learn/.cache")
const DRAFTS_PATH = path.join(CACHE_DIR, "learn-drafts.json")
const CORPUS_PATH = path.join(CACHE_DIR, "sggs-corpus.json")
const VALIDATION_PATH = path.join(CACHE_DIR, "learn-validation.json")
const TOPIC_UNIQUENESS_PATH = path.join(CACHE_DIR, "topic-uniqueness.json")
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public/data/learn")
const LEARN_OVERRIDE_PATHS = {
  guidance: path.join(PROJECT_ROOT, "src/data/learnOverrides/guidance.ts"),
  shabad: path.join(PROJECT_ROOT, "src/data/learnOverrides/shabad.ts"),
  topic: path.join(PROJECT_ROOT, "src/data/learnOverrides/topic.ts"),
  scenario: path.join(PROJECT_ROOT, "src/data/learnOverrides/scenario.ts"),
  collection: path.join(PROJECT_ROOT, "src/data/learnOverrides/collection.ts"),
}

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

const TOPIC_SCENARIO_KEYS = ["daily", "pressure", "repair", "practice"]
const TOPIC_SCENARIO_ORDER = [...TOPIC_SCENARIO_KEYS]
const TOPIC_SCENARIO_LABELS = {
  daily: "Daily",
  pressure: "Under Pressure",
  repair: "After the Slip",
  practice: "Steady Practice",
}
const TOPIC_SCENARIO_SHABAD_LAYOUT = {
  daily: [0, 1, 2],
  pressure: [1, 3, 4],
  repair: [2, 3, 5],
  practice: [4, 0, 5],
}

const MODULE_CACHE = new Map()
const ORDINAL_MEHLA_PATTERN = "(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)"
const HEADING_ONLY_PATTERNS = [
  new RegExp(`^\\s*(?:raag\\s+)?[a-z][a-z' -]+,\\s*${ORDINAL_MEHLA_PATTERN}\\s+mehla:?\\s*$`, "i"),
  /^\s*(?:slok|salok|pauree|pauri|rahaau|rahau|rahao|chaupade|ashtpadee|ashtapadee|ghar\s+\d+):?\s*$/i,
]
const METADATA_PREFIX_PATTERNS = [
  new RegExp(`^\\s*(?:raag\\s+)?[a-z][a-z' -]+,\\s*${ORDINAL_MEHLA_PATTERN}\\s+mehla:\\s*`, "i"),
  /^\s*[^;:]*\b(?:mehla|mahala)\b[^;:]*:\s*/i,
  /^\s*[^;:]*\b(?:vaar|var|shalok|shaloks|slok|salok|pauree|pauri|rahaau|rahau|rahao|chaupade|ashtpadee|ashtapadee|ghar)\b[^;:]*:\s*/i,
  /^\s*(?:slok|salok|pauree|pauri|rahaau|rahau|rahao|chaupade|ashtpadee|ashtapadee|ghar\s+\d+):\s*/i,
]
const INCOMPLETE_ENDING_PATTERN = /\b(?:the|a|an|and|or|but|to|of|for|with|without|from|in|on|at|by|your|my|our|their|his|her|its|this|that|these|those|who|which|whose|are|is|was|were|be|been|being|am|do|does|did|have|has|had|will|would|can|could|should|may|might|must)\.?$/i
const TITLE_TRAILING_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "in",
  "into",
  "is",
  "like",
  "may",
  "might",
  "must",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "these",
  "this",
  "those",
  "to",
  "was",
  "were",
  "which",
  "who",
  "will",
  "with",
  "would",
])
const TITLE_BAD_OPENINGS = new Set(["like"])

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
  return String(value ?? "")
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

function isMetadataOnlySegment(value) {
  const cleaned = cleanSentence(value)
  if (!cleaned) return true
  const wordCount = normalizeText(cleaned).split(" ").filter(Boolean).length
  const strippedPunctuation = cleaned.replace(/[,:;.!?'"-]/g, " ").trim()
  const words = strippedPunctuation.split(/\s+/).filter(Boolean)
  const titleLikeWords = words.filter(word => /^[A-Z][a-z'’/-]*$/.test(word)).length
  return (
    HEADING_ONLY_PATTERNS.some(pattern => pattern.test(cleaned))
    || (/:\s*$/.test(cleaned) && wordCount <= 6 && words.length > 0 && titleLikeWords / words.length >= 0.6)
    || (/\bmehla\b/i.test(cleaned) && wordCount <= 5)
  )
}

function stripMetadataPrefix(value) {
  let cleaned = cleanSentence(String(value ?? "").replace(/\|\|.*$/, ""))
  for (const pattern of METADATA_PREFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim()
  }
  return cleanSentence(cleaned.replace(/^[-–—]\s*/, ""))
}

function extractMeaningfulSegments(value) {
  const raw = cleanSentence(String(value ?? "").replace(/\|\|.*$/, ""))
  if (!raw) return []

  return raw
    .split(";")
    .map(segment => stripMetadataPrefix(segment))
    .filter(segment => segment && !isMetadataOnlySegment(segment))
}

function scoreMeaningfulSegment(value) {
  const cleaned = cleanSentence(value)
  const wordCount = normalizeText(cleaned).split(" ").filter(Boolean).length
  return wordCount + (/[.!?]$/.test(cleaned) ? 2 : 0) + (INCOMPLETE_ENDING_PATTERN.test(cleaned) ? -4 : 2)
}

function pickBestMeaningfulSegment(value) {
  const segments = extractMeaningfulSegments(value)
  if (segments.length === 0) return ""
  return [...segments].sort((left, right) => scoreMeaningfulSegment(right) - scoreMeaningfulSegment(left))[0]
}

function isMeaningfulExcerptText(value) {
  const bestSegment = pickBestMeaningfulSegment(value)
  return normalizeText(bestSegment).split(" ").filter(Boolean).length >= 3
}

function summarizeLine(line) {
  return pickBestMeaningfulSegment(line.translation) || cleanSentence(line.translation.replace(/^\w+:\s*/, "").replace(/\|\|.*$/, ""))
}

function trimToSentence(value, wordLimit = 14) {
  const cleaned = cleanSentence(value)
  const tokens = cleaned.split(" ")
  if (tokens.length <= wordLimit) return cleaned.replace(/[,:;.!?]+$/, "")
  if (/[.!?]$/.test(cleaned) && tokens.length <= wordLimit + 6) {
    return cleaned.replace(/[,:;.!?]+$/, "")
  }

  const trimmed = tokens.slice(0, wordLimit)
  while (trimmed.length >= 3) {
    const lastToken = normalizeText(trimmed.at(-1) ?? "").split(" ").filter(Boolean).at(-1) ?? ""
    if (!TITLE_TRAILING_STOPWORDS.has(lastToken)) break
    trimmed.pop()
  }
  return `${trimmed.join(" ").replace(/[,:;.!?]+$/, "")}`
}

function stripActionLeadIn(value) {
  const cleaned = cleanSentence(String(value ?? "").replace(/[.!?]+$/, ""))
  if (!cleaned) return ""
  const match = cleaned.match(/^(?:Before|When|At|After|For|In|On|As soon as)\b[^,]*,\s*(.+)$/i)
  return match ? cleanSentence(match[1]) : cleaned
}

function trimTitleWords(words, maxWords = 7) {
  const trimmed = words.slice(0, Math.min(maxWords, words.length))
  while (trimmed.length >= 3) {
    const lastToken = normalizeText(trimmed.at(-1) ?? "").split(" ").filter(Boolean).at(-1) ?? ""
    if (!TITLE_TRAILING_STOPWORDS.has(lastToken)) break
    trimmed.pop()
  }
  return trimmed
}

function titleNeedsFallback(title) {
  const normalizedTokens = normalizeText(title).split(" ").filter(Boolean)
  if (normalizedTokens.length < 3) return true
  const firstToken = normalizedTokens[0]
  const lastToken = normalizedTokens.at(-1) ?? ""
  return (
    TITLE_BAD_OPENINGS.has(firstToken)
    || TITLE_TRAILING_STOPWORDS.has(lastToken)
    || isMetadataOnlySegment(title)
  )
}

function buildTitleFromTranslation(text, fallback) {
  const candidates = [
    pickBestMeaningfulSegment(text),
    ...extractMeaningfulSegments(text),
  ].filter(Boolean)

  for (const candidate of candidates) {
    const cleaned = cleanSentence(candidate)
      .replace(/^(o\s+\w+,\s*)/i, "")
      .replace(/^the\s+/i, "")
      .replace(/^and\s+/i, "")
      .replace(/^by\s+/i, "")
      .replace(/^through\s+/i, "")
      .replace(/[|]+.*$/, "")
    const words = cleaned.split(" ").filter(Boolean)
    const trimmedWords = trimTitleWords(words, 7)
    if (trimmedWords.length < 3) continue
    const title = titleCase(trimmedWords.join(" ").replace(/[,:;.!?]+$/, ""))
    if (!titleNeedsFallback(title)) {
      return title
    }
  }
  return fallback
}

function sanitizePublicText(value) {
  const cleaned = cleanSentence(String(value ?? ""))
  if (!cleaned) return ""
  const meaningful = pickBestMeaningfulSegment(cleaned)
  if (meaningful) return cleanSentence(meaningful)
  return cleanSentence(stripMetadataPrefix(cleaned))
}

function publicTextNeedsCleanup(value) {
  const cleaned = cleanSentence(String(value ?? ""))
  if (!cleaned) return true
  const firstSegment = cleanSentence(cleaned.split(";")[0] ?? "")
  const sanitized = sanitizePublicText(cleaned)
  return (
    !sanitized
    || isMetadataOnlySegment(cleaned)
    || (Boolean(firstSegment) && isMetadataOnlySegment(firstSegment))
    || METADATA_PREFIX_PATTERNS.some(pattern => pattern.test(cleaned))
  )
}

function joinNaturalList(values) {
  const filtered = values.filter(Boolean)
  if (filtered.length === 0) return ""
  if (filtered.length === 1) return filtered[0]
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered.at(-1)}`
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

function loadLearnOverrides() {
  const guidanceModule = loadTsModule(LEARN_OVERRIDE_PATHS.guidance)
  const shabadModule = loadTsModule(LEARN_OVERRIDE_PATHS.shabad)
  const topicModule = loadTsModule(LEARN_OVERRIDE_PATHS.topic)
  const scenarioModule = loadTsModule(LEARN_OVERRIDE_PATHS.scenario)
  const collectionModule = loadTsModule(LEARN_OVERRIDE_PATHS.collection)

  return {
    guidance: guidanceModule.GUIDANCE_COPY_OVERRIDES ?? {},
    shabad: shabadModule.SHABAD_COPY_OVERRIDES ?? {},
    topic: topicModule.TOPIC_COPY_OVERRIDES ?? {},
    scenario: scenarioModule.SCENARIO_COPY_OVERRIDES ?? {},
    collection: collectionModule.COLLECTION_COPY_OVERRIDES ?? {},
  }
}

function getTopicFamily(key) {
  return TOPIC_FAMILIES.find(family => family.key === key) ?? TOPIC_FAMILIES[0]
}

function classifyShabad(scriptureEntry) {
  const normalized = normalizeText(
    scriptureEntry.lines
      .flatMap(line => extractMeaningfulSegments(line.translation_en))
      .join(" ")
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
  const usableLines = lines.filter(line => line.verseId && isMeaningfulExcerptText(line.translation))
  const sourceLines = usableLines.length > 0 ? usableLines : lines.filter(line => line.verseId)
  const scored = sourceLines
    .map((line, index) => ({
      line,
      index,
      score: (normalizeText(summarizeLine(line)).includes(normalizedTheme) ? 5 : 0)
        + (index === 0 ? 3 : 0)
        + (index === sourceLines.length - 1 ? 4 : 0)
        + (stableHash(`${line.verseId}:${primaryTheme}`) % 7),
    }))
    .sort((left, right) => right.score - left.score)

  const verseIds = Array.from(new Set(scored.slice(0, Math.min(4, scored.length)).map(entry => entry.line.verseId)))
  return verseIds.length > 0 ? verseIds.sort((left, right) => left - right) : sourceLines.slice(0, 1).map(line => line.verseId)
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

function buildContiguousLineWindow(lineIds, anchorIndex, size, placement = "center") {
  if (lineIds.length === 0) return []

  const boundedSize = Math.max(1, Math.min(size, lineIds.length))
  let startIndex

  if (placement === "after") {
    startIndex = anchorIndex
  } else if (placement === "before") {
    startIndex = anchorIndex - boundedSize + 1
  } else {
    startIndex = anchorIndex - Math.floor((boundedSize - 1) / 2)
  }

  const clampedStart = Math.max(0, Math.min(startIndex, lineIds.length - boundedSize))
  return lineIds.slice(clampedStart, clampedStart + boundedSize)
}

function buildGuidanceWindows(deepDive) {
  const lineIds = deepDive.lines.map(line => line.verseId).filter(Boolean)
  if (lineIds.length === 0) return []

  const meaningfulLineIds = deepDive.lines
    .filter(line => line.verseId && isMeaningfulExcerptText(line.translation))
    .map(line => line.verseId)
  const meaningfulLineIdSet = new Set(meaningfulLineIds)
  const hasMeaningfulLines = meaningfulLineIds.length > 0
  const keyLineIds = deepDive.keyVerseIds.filter(verseId => lineIds.includes(verseId))
  const preferredKeyLineIds = hasMeaningfulLines
    ? keyLineIds.filter(verseId => meaningfulLineIdSet.has(verseId))
    : keyLineIds

  const midpointIndex = (() => {
    if (!hasMeaningfulLines) return Math.floor(lineIds.length / 2)
    const meaningfulIndexes = lineIds
      .map((verseId, index) => (meaningfulLineIdSet.has(verseId) ? index : -1))
      .filter(index => index >= 0)
    return meaningfulIndexes[Math.floor(meaningfulIndexes.length / 2)] ?? Math.floor(lineIds.length / 2)
  })()
  const firstAnchorIndex = lineIds.indexOf(preferredKeyLineIds[0] ?? keyLineIds[0] ?? lineIds[0])
  const lastAnchorVerseId = preferredKeyLineIds.at(-1) ?? keyLineIds.at(-1) ?? lineIds.at(-1)
  const lastAnchorIndex = lineIds.indexOf(lastAnchorVerseId)
  const candidates = [
    buildContiguousLineWindow(lineIds, firstAnchorIndex, 1, "center"),
    buildContiguousLineWindow(lineIds, firstAnchorIndex, 2, "after"),
    buildContiguousLineWindow(lineIds, lastAnchorIndex, 2, "before"),
    buildContiguousLineWindow(lineIds, midpointIndex, 1, "center"),
    buildContiguousLineWindow(lineIds, midpointIndex, 2, "after"),
    buildContiguousLineWindow(lineIds, midpointIndex, 2, "before"),
    buildContiguousLineWindow(lineIds, lastAnchorIndex, 1, "center"),
    buildContiguousLineWindow(lineIds, firstAnchorIndex + 1, 1, "center"),
    buildContiguousLineWindow(lineIds, lastAnchorIndex - 1, 1, "center"),
    buildContiguousLineWindow(lineIds, midpointIndex, 3, "center"),
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

function guidanceWindowKey(verseIds) {
  return verseIds.filter(Boolean).join(",")
}

function summarizeVerseWindow(selectedLines) {
  const fragments = selectedLines
    .map(line => trimToSentence(summarizeLine(line), 14))
    .filter(Boolean)

  if (fragments.length === 0) return ""
  const ranked = [...fragments].sort((left, right) => scoreMeaningfulSegment(right) - scoreMeaningfulSegment(left))
  if (ranked.length === 1) return ranked[0]

  if (
    scoreMeaningfulSegment(ranked[0]) >= 10
    && scoreMeaningfulSegment(ranked[1]) >= 10
    && !INCOMPLETE_ENDING_PATTERN.test(ranked[0])
    && !INCOMPLETE_ENDING_PATTERN.test(ranked[1])
  ) {
    return `${ranked[0]}; ${lowerFirst(ranked[1])}`
  }

  return ranked[0]
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
  const meaningfulLines = lines.filter(line => isMeaningfulExcerptText(line.translation))
  const narrativeLines = meaningfulLines.length > 0 ? meaningfulLines : lines
  const keyVerseIds = pickKeyLineIds(lines, classification.primary.key)
  const leadLine = narrativeLines.find(line => line.verseId === keyVerseIds[0]) ?? narrativeLines[0]
  const middleLine = narrativeLines[Math.floor(narrativeLines.length / 2)] ?? leadLine
  const closingLine = narrativeLines[narrativeLines.length - 1] ?? leadLine
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
    summary: `This shabad opens with ${lowerFirst(openingMeaning)}. It turns the heart toward ${lowerFirst(closingMeaning)}.`,
    whyItMatters: `It matters when life feels ${joinNaturalList(classification.emotionalStates)} because the shabad keeps ${classification.primary.shortTitle.toLowerCase()} inside remembrance, conduct, and the Creator's larger care instead of private momentum.`,
    takeaway: `Keep returning to this turn: ${closingMeaning}.`,
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
      `It opens by naming the condition without ornament: ${lowerFirst(openingMeaning)}.`,
      `The middle movement widens the correction through ${lowerFirst(middleMeaning)}.`,
      `It closes with a return you can actually keep: ${lowerFirst(closingMeaning)}.`,
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

function selectReferenceLines(deepDive, verseIds) {
  const selectedLines = deepDive.lines.filter(line => verseIds.includes(line.verseId))
  const meaningfulSelectedLines = selectedLines.filter(line => isMeaningfulExcerptText(line.translation))
  const meaningfulFallbackLines = deepDive.lines.filter(line => isMeaningfulExcerptText(line.translation))

  if (meaningfulSelectedLines.length > 0) return meaningfulSelectedLines
  if (meaningfulFallbackLines.length > 0) return meaningfulFallbackLines.slice(0, 1)
  if (selectedLines.length > 0) return selectedLines
  return deepDive.lines.slice(0, 1)
}

function normalizeExcerptVerseIds(deepDive, verseIds) {
  const orderedLineIds = deepDive.lines.map(line => line.verseId).filter(Boolean)
  if (!orderedLineIds.length) return []

  const selectedIndexes = orderedLineIds
    .map((verseId, index) => (verseIds.includes(verseId) ? index : -1))
    .filter(index => index >= 0)

  if (!selectedIndexes.length) return orderedLineIds.slice(0, 1)

  const startIndex = selectedIndexes[0]
  const endIndex = selectedIndexes[selectedIndexes.length - 1]
  return orderedLineIds.slice(startIndex, endIndex + 1)
}

function createLineReference(deepDive, verseIds, options = {}) {
  const normalizedVerseIds = normalizeExcerptVerseIds(deepDive, verseIds)
  const referenceLines = selectReferenceLines(deepDive, normalizedVerseIds)
  const shortMeaning = options.blankCopy === true
    ? ""
    : (options.shortMeaning ?? summarizeVerseWindow(referenceLines))
  const lifeApplication = options.blankCopy === true
    ? ""
    : (options.lifeApplication ?? "Keep this line close enough to set the next faithful move before the old reflex retakes the room.")

  return {
    deepDiveId: deepDive.id,
    verseIds: normalizedVerseIds,
    shortMeaning,
    lifeApplication,
  }
}

function createGuidanceFromShabad(deepDive, slotIndex, familyKey, verseIds = null) {
  const windows = buildGuidanceWindows(deepDive)
  const selectedVerseIds = verseIds ?? windows[slotIndex % windows.length]
  const source = createLineReference(deepDive, selectedVerseIds, { blankCopy: true })
  const selectedLines = deepDive.lines.filter(line => source.verseIds.includes(line.verseId))
  const leadLine = selectedLines[0] ?? deepDive.lines[0]
  const tailLine = selectedLines[selectedLines.length - 1] ?? deepDive.lines[deepDive.lines.length - 1] ?? leadLine
  const family = getTopicFamily(familyKey)
  const title = buildTitleFromTranslation(
    (slotIndex % 3 === 0 ? leadLine : tailLine).translation,
    slotIndex % 3 === 0 ? `Begin with ${family.shortTitle}` : `Return through ${family.shortTitle}`
  )

  return {
    id: `guidance-${deepDive.id.replace(/^shabad-/, "")}-${slotIndex + 1}`,
    title,
    summary: "",
    takeaway: "",
    lifeApplication: "",
    source,
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
    editorial: {
      status: "draft",
      issues: ["needs human copy"],
      reviewedByHuman: false,
    },
  }
}

function dedupeSearchTerms(values) {
  const seen = new Set()
  const deduped = []
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    deduped.push(value)
  }
  return deduped
}

function extendCandidateShabads(primaryCandidates, fallbackPool, count = 6) {
  const merged = []
  const seen = new Set()
  for (const candidate of [...primaryCandidates, ...fallbackPool]) {
    if (!candidate || seen.has(candidate.id)) continue
    seen.add(candidate.id)
    merged.push(candidate)
    if (merged.length >= count) break
  }
  return merged
}

function pickScenarioVerseIds(deepDive, scenarioKey, index) {
  const windows = buildGuidanceWindows(deepDive)
  const scenarioOffset = TOPIC_SCENARIO_ORDER.indexOf(scenarioKey)
  const verseIds = windows[(index + Math.max(0, scenarioOffset)) % windows.length]
  return verseIds?.length ? verseIds : deepDive.keyVerseIds.slice(0, 1)
}

function createTopicSourceLifeApplication(family, scenarioKey) {
  const core = lowerFirst(stripActionLeadIn(family.actionBase))
  const variants = {
    overview: `At the next real cue in the body or room, ${core}.`,
    daily: `In the next plain stretch of the day, ${core}.`,
    pressure: `As soon as the body tightens under strain, ${core}.`,
    repair: `After the miss is visible and before the excuse arrives, ${core}.`,
    practice: `At one fixed cue you can keep this week, ${core}.`,
  }
  return variants[scenarioKey] ?? `${titleCase(family.shortTitle)} is practiced here by how you answer the next moment.`
}

function createTopicExcerpt(deepDive, family, scenarioKey, index, explanationFactory) {
  const verseIds = pickScenarioVerseIds(deepDive, scenarioKey, index)
  const source = scenarioKey === "overview"
    ? createLineReference(deepDive, verseIds)
    : createLineReference(deepDive, verseIds, {
        blankCopy: true,
      })
  return {
    source,
    explanation: "",
  }
}

function createManualTopicExcerpt(spec, shabadById, family, scenarioKey, index, explanationFactory) {
  const deepDive = shabadById.get(spec.deepDiveId)
  if (!deepDive) {
    throw new Error(`Unknown deep dive "${spec.deepDiveId}" in manual topic excerpt override`)
  }

  const verseIds = spec.verseIds?.length
    ? spec.verseIds
    : pickScenarioVerseIds(deepDive, scenarioKey, index)
  const source = {
    ...createLineReference(deepDive, verseIds, {
      lifeApplication: createTopicSourceLifeApplication(family, scenarioKey),
    }),
    ...(spec.shortMeaning ? { shortMeaning: spec.shortMeaning } : {}),
    ...(spec.lifeApplication ? { lifeApplication: spec.lifeApplication } : {}),
  }

  return {
    source,
    explanation: spec.explanation || "",
  }
}

function buildTopicExcerpts({
  family,
  candidateShabads,
  scenarioKey,
  explanationFactory,
  manualExcerpts,
  shabadById,
}) {
  if (Array.isArray(manualExcerpts) && manualExcerpts.length > 0) {
    return manualExcerpts.slice(0, 3).map((spec, index) => (
      createManualTopicExcerpt(
        spec,
        shabadById,
        family,
        scenarioKey,
        index,
        explanationFactory[index % explanationFactory.length]
      )
    ))
  }

  return candidateShabads.slice(0, 3).map((deepDive, index) => (
    createTopicExcerpt(
      deepDive,
      family,
      scenarioKey,
      index,
      explanationFactory[index % explanationFactory.length]
    )
  ))
}

function getScenarioExplanationFactory(family, scenarioKey) {
  const factories = {
    daily: [
      ({ source }) => `Ordinary life is already being addressed here: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `The teaching meets routine before the room becomes ideal. ${source.lifeApplication}`,
      ({ source }) => `This makes daily faithfulness concrete: ${lowerFirst(source.shortMeaning)}.`,
    ],
    pressure: [
      ({ source }) => `Under strain, the line stays exact: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `The next faithful move is smaller than panic wants. ${source.lifeApplication}`,
      () => `This line keeps urgency from becoming the only narrator in the room.`,
    ],
    repair: [
      ({ source }) => `Return is still being offered here: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `The Guru does not leave repair at remorse alone. ${source.lifeApplication}`,
      () => `Truth and return are kept close enough here to move together.`,
    ],
    practice: [
      ({ source }) => `The line is teaching repetition more than momentary inspiration: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `Durable practice appears when the teaching can survive an ordinary week. ${source.lifeApplication}`,
      () => `This excerpt matters because it trains posture, not only agreement.`,
    ],
  }

  return factories[scenarioKey].map(factory => (context) => factory(context))
}

function createGenericOverviewCopy(family) {
  return {
    title: `When ${family.titleBase}`,
    issueStatement: family.issueBase,
    centralInsight: family.insightBase,
    practicalReflection: `${family.insightBase} ${family.actionBase}`.trim(),
    actionPrompt: family.actionBase,
    searchTerms: family.searchTerms,
  }
}

function buildScenarioShabadSets(candidateShabads) {
  return Object.fromEntries(
    TOPIC_SCENARIO_KEYS.map((scenarioKey) => ([
      scenarioKey,
      TOPIC_SCENARIO_SHABAD_LAYOUT[scenarioKey]
        .map(index => candidateShabads[index])
        .filter(Boolean),
    ]))
  )
}

function buildTopicScenario(family, scenarioKey, candidateShabads, shabadById, override = null) {
  const scenarioCopy = override ?? {
    title: "",
    issueStatement: "",
    centralInsight: "",
    practicalReflection: "",
    actionPrompt: "",
    searchTerms: [],
  }
  const combinedScenarioTerms = (scenarioCopy.searchTerms ?? []).flatMap(term => ([
    `${family.shortTitle.toLowerCase()} ${term.toLowerCase()}`,
    `${family.key} ${term.toLowerCase()}`,
  ]))
  const explanationFactory = getScenarioExplanationFactory(family, scenarioKey)
  const excerpts = buildTopicExcerpts({
    family,
    candidateShabads,
    scenarioKey,
    explanationFactory,
    manualExcerpts: override?.excerpts ?? null,
    shabadById,
  })

  return {
    key: scenarioKey,
    label: TOPIC_SCENARIO_LABELS[scenarioKey],
    title: scenarioCopy.title,
    issueStatement: scenarioCopy.issueStatement,
    centralInsight: scenarioCopy.centralInsight,
    practicalReflection: scenarioCopy.practicalReflection,
    actionPrompt: scenarioCopy.actionPrompt,
    searchTerms: dedupeSearchTerms([
      ...family.searchTerms,
      family.shortTitle.toLowerCase(),
      ...(scenarioCopy.title ? [scenarioCopy.title.toLowerCase()] : []),
      ...(scenarioCopy.title ? [`${family.shortTitle.toLowerCase()} ${TOPIC_SCENARIO_LABELS[scenarioKey].toLowerCase()}`] : []),
      ...(scenarioCopy.searchTerms ?? []),
      ...combinedScenarioTerms,
    ]),
    excerpts,
    editorial: override
      ? { forcedLocked: true }
      : {
          status: "draft",
          issues: ["needs human copy"],
          reviewedByHuman: false,
        },
  }
}

function getOverviewExplanationFactory(overviewCopy) {
  return [
    ({ source }) => `The line turns the issue by naming ${lowerFirst(source.shortMeaning)}.`,
    ({ source }) => `The shabad widens the issue and gives it a truer direction. ${source.lifeApplication}`,
    () => `${overviewCopy.centralInsight} The line is not a detached quote; it belongs to a fuller turn the whole shabad is making.`,
  ]
}

function buildCanonicalTopicGuide({
  family,
  canonicalSeed,
  candidateShabads,
  scenarioShabadSets,
  shabadById,
}) {
  const goldSet = TOPIC_GOLD_SET[family.key] ?? null
  const overviewCopy = {
    ...(canonicalSeed ?? createGenericOverviewCopy(family)),
    ...(goldSet?.overview ?? {}),
  }
  const overviewExcerpts = buildTopicExcerpts({
    family,
    candidateShabads,
    scenarioKey: "overview",
    explanationFactory: getOverviewExplanationFactory(overviewCopy),
    manualExcerpts: goldSet?.overview?.excerpts ?? null,
    shabadById,
  })

  const scenarios = Object.fromEntries(
    TOPIC_SCENARIO_KEYS.map((scenarioKey) => ([
      scenarioKey,
      buildTopicScenario(
        family,
        scenarioKey,
        scenarioShabadSets[scenarioKey],
        shabadById,
        goldSet?.scenarios?.[scenarioKey] ?? null
      ),
    ]))
  )

  const relatedShabadIds = Array.from(new Set([
    ...overviewExcerpts.map(excerpt => excerpt.source.deepDiveId),
    ...TOPIC_SCENARIO_KEYS.flatMap(scenarioKey =>
      scenarios[scenarioKey].excerpts.map(excerpt => excerpt.source.deepDiveId)
    ),
  ]))

  return {
    id: `topic-${family.key}`,
    title: overviewCopy.title,
    shortTitle: family.shortTitle,
    category: family.category,
    issueStatement: overviewCopy.issueStatement,
    centralInsight: overviewCopy.centralInsight,
    practicalReflection: overviewCopy.practicalReflection,
    actionPrompt: overviewCopy.actionPrompt,
    searchTerms: dedupeSearchTerms([
      ...family.searchTerms,
      family.shortTitle.toLowerCase(),
      ...(overviewCopy.searchTerms ?? []),
      ...TOPIC_SCENARIO_KEYS.flatMap(scenarioKey => scenarios[scenarioKey].searchTerms),
    ]),
    excerpts: overviewExcerpts,
    defaultScenarioKey: "overview",
    scenarioOrder: [...TOPIC_SCENARIO_ORDER],
    scenarios,
    relatedShabadIds,
    relatedTopicIds: [],
    relatedCollectionIds: [],
    rotation: createRotation(
      family.key,
      family.category === "practice" ? "growing" : "beginner",
      7 + (stableHash(`${family.key}:overview`) % 4),
      balanceCategoryForFamily(family.key)
    ),
    editorial: goldSet?.overview ? { forcedLocked: true } : null,
  }
}

function buildCanonicalTopicSeed(topicGuide) {
  if (!topicGuide) return null
  return {
    title: topicGuide.title,
    issueStatement: topicGuide.issueStatement,
    centralInsight: topicGuide.centralInsight,
    practicalReflection: topicGuide.practicalReflection,
    actionPrompt: topicGuide.actionPrompt,
    searchTerms: topicGuide.searchTerms,
  }
}

function buildCanonicalTopics(shabadDeepDives, legacyTopicGuides) {
  const shabadById = new Map(shabadDeepDives.map(shabad => [shabad.id, shabad]))
  const canonicalSeedByTheme = new Map()
  for (const topicGuide of legacyTopicGuides) {
    const familyKey = topicGuide.id.replace(/^topic-/, "").split("-")[0]
    if (!canonicalSeedByTheme.has(familyKey) || topicGuide.id === `topic-${familyKey}`) {
      canonicalSeedByTheme.set(familyKey, buildCanonicalTopicSeed(topicGuide))
    }
  }

  const themeShabads = new Map()
  for (const shabad of shabadDeepDives) {
    for (const theme of shabad.themes) {
      const list = themeShabads.get(theme) ?? []
      list.push(shabad)
      themeShabads.set(theme, list)
    }
  }

  return TOPIC_FAMILIES.map((family) => {
    const primaryCandidates = themeShabads.get(family.key) ?? []
    const candidateShabads = extendCandidateShabads(primaryCandidates, shabadDeepDives, 6)
    const scenarioShabadSets = buildScenarioShabadSets(candidateShabads)

    return buildCanonicalTopicGuide({
      family,
      canonicalSeed: canonicalSeedByTheme.get(family.key) ?? null,
      candidateShabads,
      scenarioShabadSets,
      shabadById,
    })
  })
}

async function buildTopicUniquenessRegistry(topicGuides, huggingFaceAdapter) {
  const entries = []

  for (const topic of topicGuides) {
    entries.push({
      key: `${topic.id}#overview`,
      topicId: topic.id,
      scenarioKey: "overview",
      titleFingerprint: normalizeText(topic.title),
      coreClaimFingerprint: normalizeText(topic.centralInsight),
      actionFingerprint: normalizeText(topic.actionPrompt),
      excerptFingerprint: topic.excerpts.map(excerpt => `${excerpt.source.deepDiveId}:${excerpt.source.verseIds.join(",")}`).join("|"),
      text: [topic.title, topic.issueStatement, topic.centralInsight, topic.practicalReflection, topic.actionPrompt]
        .filter(Boolean)
        .join(" "),
    })

    for (const scenarioKey of TOPIC_SCENARIO_KEYS) {
      const scenario = topic.scenarios[scenarioKey]
      entries.push({
        key: `${topic.id}#${scenarioKey}`,
        topicId: topic.id,
        scenarioKey,
        titleFingerprint: normalizeText(scenario.title),
        coreClaimFingerprint: normalizeText(scenario.centralInsight),
        actionFingerprint: normalizeText(scenario.actionPrompt),
        excerptFingerprint: scenario.excerpts.map(excerpt => `${excerpt.source.deepDiveId}:${excerpt.source.verseIds.join(",")}`).join("|"),
        text: [scenario.title, scenario.issueStatement, scenario.centralInsight, scenario.practicalReflection, scenario.actionPrompt]
          .filter(Boolean)
          .join(" "),
      })
    }
  }

  const embeddings = huggingFaceAdapter.enabled
    ? await huggingFaceAdapter.embed(entries.map(entry => entry.text))
    : null

  const registry = {
    generatedAt: new Date().toISOString(),
    entries: entries.map((entry, index) => ({
      ...entry,
      embedding: Array.isArray(embeddings?.[index]) ? embeddings[index] : null,
    })),
  }

  await writeJson(TOPIC_UNIQUENESS_PATH, registry)
  return registry
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
    + dataset.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0)
    + dataset.collections.length
  if (totalItems === 0) return 0

  const crossLinks =
    dataset.dailyGuidance.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length, 0)
    + dataset.shabadDeepDives.reduce((count, item) => count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
    + dataset.topicGuides.reduce((count, item) => count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
    + dataset.topicGuides.reduce(
      (count, item) => count + item.scenarioOrder.reduce(
        (scenarioCount, scenarioKey) => scenarioCount + item.scenarios[scenarioKey].excerpts.length + 1,
        0
      ),
      0
    )
    + dataset.collections.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length, 0)

  return crossLinks / totalItems
}

function buildShabadNarrativeCopy(shabad) {
  const meaningfulLines = shabad.lines.filter(line => isMeaningfulExcerptText(line.translation))
  const narrativeLines = meaningfulLines.length > 0 ? meaningfulLines : shabad.lines
  const leadLine = narrativeLines.find(line => shabad.keyVerseIds.includes(line.verseId)) ?? narrativeLines[0]
  const middleLine = narrativeLines[Math.floor(narrativeLines.length / 2)] ?? leadLine
  const closingLine = narrativeLines[narrativeLines.length - 1] ?? leadLine
  const openingMeaning = trimToSentence(summarizeLine(leadLine), 14)
  const middleMeaning = trimToSentence(summarizeLine(middleLine), 14)
  const closingMeaning = trimToSentence(summarizeLine(closingLine), 14)
  const primaryFamily = getTopicFamily(shabad.themes[0] ?? "anxiety")

  return {
    title: buildTitleFromTranslation(leadLine?.translation ?? "", `${primaryFamily.shortTitle} In Gurbani`),
    summary: `This shabad opens with ${lowerFirst(openingMeaning)}. It turns the heart toward ${lowerFirst(closingMeaning)}.`,
    whyItMatters: `It matters when life feels ${joinNaturalList(shabad.emotionalStates)} because the shabad keeps ${primaryFamily.shortTitle.toLowerCase()} inside remembrance, conduct, and the Creator's larger care instead of private momentum.`,
    takeaway: `Keep returning to this turn: ${closingMeaning}.`,
    structure: [
      `It opens by naming the condition without ornament: ${lowerFirst(openingMeaning)}.`,
      `The middle movement widens the correction through ${lowerFirst(middleMeaning)}.`,
      `It closes with a return you can actually keep: ${lowerFirst(closingMeaning)}.`,
    ],
  }
}

function normalizeLineReference(reference, deepDive, fallbackLifeApplication) {
  const shortMeaning = reference.shortMeaning === ""
    ? ""
    : publicTextNeedsCleanup(reference.shortMeaning)
      ? summarizeVerseWindow(selectReferenceLines(deepDive, reference.verseIds))
      : reference.shortMeaning
  const shouldReplaceLifeApplication =
    reference.lifeApplication !== ""
    && (
      publicTextNeedsCleanup(reference.lifeApplication)
      || /becomes more truthful when/i.test(reference.lifeApplication)
      || /let the wider window set the tone/i.test(reference.lifeApplication)
    )

  return {
    ...reference,
    shortMeaning,
    lifeApplication: shouldReplaceLifeApplication ? fallbackLifeApplication : reference.lifeApplication,
  }
}

function normalizeGuidanceItem(guidance, shabadById) {
  const deepDive = shabadById.get(guidance.source.deepDiveId)
  if (!deepDive) return guidance

  const referenceLines = selectReferenceLines(deepDive, guidance.source.verseIds)
  const fallbackMeaning = summarizeVerseWindow(referenceLines)
  const fallbackTitle = buildTitleFromTranslation(referenceLines[0]?.translation ?? "", guidance.title)

  return {
    ...guidance,
    title: publicTextNeedsCleanup(guidance.title) ? fallbackTitle : guidance.title,
    takeaway:
      guidance.takeaway === ""
        ? ""
        : publicTextNeedsCleanup(guidance.takeaway)
          ? fallbackMeaning
          : guidance.takeaway,
    source: normalizeLineReference(guidance.source, deepDive, guidance.lifeApplication),
  }
}

function normalizeExcerpt(excerpt, deepDive, family, scenarioKey, explanationFactory, index) {
  const source = normalizeLineReference(
    excerpt.source,
    deepDive,
    createTopicSourceLifeApplication(family, scenarioKey)
  )
  const needsExplanationRefresh =
    excerpt.explanation !== ""
    && (
      publicTextNeedsCleanup(excerpt.explanation)
      || excerpt.explanation.includes(excerpt.source.shortMeaning)
      || excerpt.explanation.includes(excerpt.source.lifeApplication)
    )

  return {
    source,
    explanation: needsExplanationRefresh
      ? explanationFactory[index % explanationFactory.length]({ source, deepDive, index })
      : excerpt.explanation,
  }
}

function normalizeTopicGuideItem(topic, shabadById) {
  const family = getTopicFamily(topic.rotation.theme)
  const overviewCopy = {
    title: topic.title,
    issueStatement: topic.issueStatement,
    centralInsight: topic.centralInsight,
    practicalReflection: topic.practicalReflection,
    actionPrompt: topic.actionPrompt,
    searchTerms: topic.searchTerms,
  }
  const overviewFactory = getOverviewExplanationFactory(overviewCopy)

  const excerpts = topic.excerpts.map((excerpt, index) => {
    const deepDive = shabadById.get(excerpt.source.deepDiveId)
    return deepDive
      ? normalizeExcerpt(excerpt, deepDive, family, "overview", overviewFactory, index)
      : excerpt
  })

  const scenarios = Object.fromEntries(
    topic.scenarioOrder.map((scenarioKey) => {
      const scenario = topic.scenarios[scenarioKey]
      const explanationFactory = getScenarioExplanationFactory(family, scenarioKey)
      const normalizedExcerpts = scenario.excerpts.map((excerpt, index) => {
        const deepDive = shabadById.get(excerpt.source.deepDiveId)
        return deepDive
          ? normalizeExcerpt(excerpt, deepDive, family, scenarioKey, explanationFactory, index)
          : excerpt
      })

      return [
        scenarioKey,
        {
          ...scenario,
          excerpts: normalizedExcerpts,
        },
      ]
    })
  )

  return {
    ...topic,
    excerpts,
    scenarios,
  }
}

function normalizeCollectionItem(collection, shabadById) {
  const deepDive = shabadById.get(collection.heroSource.deepDiveId)
  if (!deepDive) return collection
  const family = getTopicFamily(collection.themes[0] ?? deepDive.themes?.[0] ?? "anxiety")

  return {
    ...collection,
    heroSource: normalizeLineReference(collection.heroSource, deepDive, family.actionBase),
  }
}

function applyEditorialOverrideMetadata(item, override) {
  if (!override) return item
  const baseEditorial = override.reviewedByHuman === true ? {} : (item.editorial ?? {})
  return {
    ...item,
    editorial: {
      ...baseEditorial,
      ...(override.reviewedByHuman === true ? { issues: [] } : {}),
      ...(override.reviewedByHuman === true ? { reviewedByHuman: true } : {}),
      ...(override.forcedLocked === true ? { forcedLocked: true } : {}),
    },
  }
}

function applyExcerptOverrides(excerpts, overrideExcerpts = []) {
  if (!Array.isArray(overrideExcerpts) || overrideExcerpts.length === 0) {
    return excerpts
  }

  return excerpts.map((excerpt, index) => {
    const override = overrideExcerpts[index]
    if (!override) return excerpt

    return {
      ...excerpt,
      ...(override.explanation !== undefined ? { explanation: override.explanation } : {}),
      source: {
        ...excerpt.source,
        ...(override.source ?? {}),
      },
    }
  })
}

function applyGuidanceCopyOverrides(guidance, overrides) {
  const override = overrides.guidance[guidance.id]
  if (!override) return guidance

  return applyEditorialOverrideMetadata({
    ...guidance,
    ...(override.title !== undefined ? { title: override.title } : {}),
    ...(override.summary !== undefined ? { summary: override.summary } : {}),
    ...(override.takeaway !== undefined ? { takeaway: override.takeaway } : {}),
    ...(override.lifeApplication !== undefined ? { lifeApplication: override.lifeApplication } : {}),
    ...(override.rotationTheme !== undefined
      ? {
          rotation: {
            ...guidance.rotation,
            theme: override.rotationTheme,
          },
        }
      : {}),
    source: {
      ...guidance.source,
      ...(override.source ?? {}),
    },
  }, override)
}

function applyCollectionCopyOverrides(collection, overrides) {
  const override = overrides.collection[collection.id]
  if (!override) return collection

  return applyEditorialOverrideMetadata({
    ...collection,
    ...(override.title !== undefined ? { title: override.title } : {}),
    ...(override.subtitle !== undefined ? { subtitle: override.subtitle } : {}),
    ...(override.description !== undefined ? { description: override.description } : {}),
    ...(override.heroSource
      ? {
          heroSource: {
            ...collection.heroSource,
            ...override.heroSource,
          },
        }
      : {}),
  }, override)
}

function applyShabadCopyOverrides(shabad, overrides) {
  const override = overrides.shabad[shabad.id]
  if (!override) return shabad

  return applyEditorialOverrideMetadata({
    ...shabad,
    ...(override.title !== undefined ? { title: override.title } : {}),
    ...(override.summary !== undefined ? { summary: override.summary } : {}),
    ...(override.whyItMatters !== undefined ? { whyItMatters: override.whyItMatters } : {}),
    ...(override.takeaway !== undefined ? { takeaway: override.takeaway } : {}),
    ...(override.structure !== undefined ? { structure: override.structure } : {}),
  }, override)
}

function applyTopicCopyOverrides(topic, overrides) {
  const topicOverride = overrides.topic[topic.id]
  const updatedTopic = topicOverride
    ? applyEditorialOverrideMetadata({
        ...topic,
        ...(topicOverride.title !== undefined ? { title: topicOverride.title } : {}),
        ...(topicOverride.shortTitle !== undefined ? { shortTitle: topicOverride.shortTitle } : {}),
        ...(topicOverride.issueStatement !== undefined ? { issueStatement: topicOverride.issueStatement } : {}),
        ...(topicOverride.centralInsight !== undefined ? { centralInsight: topicOverride.centralInsight } : {}),
        ...(topicOverride.practicalReflection !== undefined ? { practicalReflection: topicOverride.practicalReflection } : {}),
        ...(topicOverride.actionPrompt !== undefined ? { actionPrompt: topicOverride.actionPrompt } : {}),
        excerpts: applyExcerptOverrides(topic.excerpts, topicOverride.excerpts),
      }, topicOverride)
    : topic

  const scenarios = Object.fromEntries(
    updatedTopic.scenarioOrder.map((scenarioKey) => {
      const scenario = updatedTopic.scenarios[scenarioKey]
      const scenarioOverride = overrides.scenario[`${updatedTopic.id}#${scenarioKey}`]

      if (!scenarioOverride) {
        return [scenarioKey, scenario]
      }

      return [
        scenarioKey,
        applyEditorialOverrideMetadata({
          ...scenario,
          ...(scenarioOverride.title !== undefined ? { title: scenarioOverride.title } : {}),
          ...(scenarioOverride.issueStatement !== undefined ? { issueStatement: scenarioOverride.issueStatement } : {}),
          ...(scenarioOverride.centralInsight !== undefined ? { centralInsight: scenarioOverride.centralInsight } : {}),
          ...(scenarioOverride.practicalReflection !== undefined ? { practicalReflection: scenarioOverride.practicalReflection } : {}),
          ...(scenarioOverride.actionPrompt !== undefined ? { actionPrompt: scenarioOverride.actionPrompt } : {}),
          excerpts: applyExcerptOverrides(scenario.excerpts, scenarioOverride.excerpts),
        }, scenarioOverride),
      ]
    })
  )

  return {
    ...updatedTopic,
    scenarios,
  }
}

function themeKeywordOverlapRatio(themeKey, lines) {
  const family = getTopicFamily(themeKey)
  const keywordTokens = new Set([
    ...toTokens(family.key),
    ...toTokens(family.shortTitle),
    ...family.keywords.flatMap(keyword => toTokens(keyword)),
    ...family.searchTerms.flatMap(term => toTokens(term)),
    ...family.emotionalStates.flatMap(state => toTokens(state)),
  ])
  if (keywordTokens.size === 0) return 0

  const verseTokens = new Set(lines.flatMap(line => toTokens(line.translation ?? "")))
  const overlap = Array.from(keywordTokens).filter(token => verseTokens.has(token)).length
  return overlap / keywordTokens.size
}

function applyGeneratedGuidanceGuards(guidance, shabadById) {
  const isGenerated =
    guidance.id.startsWith("guidance-generated-")
    || guidance.editorial?.issues?.includes("needs human copy") === true
  const reviewedByHuman = guidance.editorial?.reviewedByHuman === true
  if (!isGenerated || reviewedByHuman) {
    return guidance
  }

  const deepDive = shabadById.get(guidance.source.deepDiveId)
  if (!deepDive) return guidance

  const overlapRatio = themeKeywordOverlapRatio(
    guidance.rotation.theme,
    selectReferenceLines(deepDive, guidance.source.verseIds)
  )
  const issues = new Set(guidance.editorial?.issues ?? [])

  if (overlapRatio < 0.15) {
    issues.add("theme mismatch between verse and assigned theme")
    return {
      ...guidance,
      editorial: {
        ...(guidance.editorial ?? {}),
        status: "theme-mismatch",
        issues: Array.from(issues),
        reviewedByHuman: false,
      },
    }
  }

  issues.add("needs human copy")
  return {
    ...guidance,
    editorial: {
      ...(guidance.editorial ?? {}),
      status: "draft",
      issues: Array.from(issues),
      reviewedByHuman: false,
    },
  }
}

function normalizePublishedCopy(dataset, overrides) {
  dataset.shabadDeepDives = dataset.shabadDeepDives.map((shabad) => {
    const refreshed = buildShabadNarrativeCopy(shabad)
    return {
      ...shabad,
      title: publicTextNeedsCleanup(shabad.title) ? refreshed.title : shabad.title,
      summary:
        publicTextNeedsCleanup(shabad.summary) || /\bis carried here from\b/i.test(shabad.summary)
          ? refreshed.summary
          : shabad.summary,
      whyItMatters:
        /instead of private mood/i.test(shabad.whyItMatters)
          ? refreshed.whyItMatters
          : shabad.whyItMatters,
      takeaway:
        publicTextNeedsCleanup(shabad.takeaway) || /\bsteadies when\b/i.test(shabad.takeaway)
          ? refreshed.takeaway
          : shabad.takeaway,
      structure:
        shabad.structure.some(line => /opening movement names the pressure directly/i.test(line))
          ? refreshed.structure
          : shabad.structure,
    }
  }).map(shabad => applyShabadCopyOverrides(shabad, overrides))

  const shabadById = new Map(dataset.shabadDeepDives.map(item => [item.id, item]))
  dataset.dailyGuidance = dataset.dailyGuidance
    .map(item => normalizeGuidanceItem(item, shabadById))
    .map(item => applyGuidanceCopyOverrides(item, overrides))
    .map(item => applyGeneratedGuidanceGuards(item, shabadById))
  dataset.topicGuides = dataset.topicGuides
    .map(item => normalizeTopicGuideItem(item, shabadById))
    .map(item => applyTopicCopyOverrides(item, overrides))
  dataset.collections = dataset.collections
    .map(item => normalizeCollectionItem(item, shabadById))
    .map(item => applyCollectionCopyOverrides(item, overrides))
}

function buildSearchIndex(topicGuides) {
  const synonyms = {}
  const legacyTopicAliases = {}

  for (const topic of topicGuides) {
    const family = TOPIC_FAMILIES.find(entry => entry.key === topic.rotation.theme)
    const scenarioTerms = new Set(
      topic.scenarioOrder.flatMap(scenarioKey => topic.scenarios[scenarioKey].searchTerms.map(term => normalizeText(term)))
    )

    for (const term of [
      topic.title,
      topic.shortTitle,
      ...(family?.searchTerms ?? []),
      ...topic.searchTerms.filter(term => !scenarioTerms.has(normalizeText(term))),
    ]) {
      const normalized = normalizeText(term)
      if (!normalized || synonyms[normalized]) continue
      synonyms[normalized] = { topicId: topic.id }
    }
  }

  for (const topic of topicGuides) {
    legacyTopicAliases[topic.id] = { topicId: topic.id }

    for (const scenarioKey of topic.scenarioOrder) {
      const scenario = topic.scenarios[scenarioKey]
      const legacyId = `${topic.id}-${scenarioKey}`
      legacyTopicAliases[legacyId] = { topicId: topic.id, scenarioKey }

      for (const term of scenario.searchTerms) {
        const normalized = normalizeText(term)
        if (!normalized || synonyms[normalized]) continue
        synonyms[normalized] = { topicId: topic.id, scenarioKey }
      }
    }
  }

  return {
    synonyms,
    legacyTopicAliases,
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
    topicsByTheme.set(topic.rotation.theme, topic.id)
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
    const topicId = topicsByTheme.get(primaryTheme)
    shabad.relatedTopicIds = topicId ? [topicId] : []
    shabad.relatedCollectionIds = (collectionsByTheme.get(primaryTheme) ?? []).slice(0, 3)
  }

  for (const guidance of dataset.dailyGuidance) {
    const sourceShabad = dataset.shabadDeepDivesById[guidance.relatedShabadIds[0]]
    const primaryTheme = sourceShabad?.themes[0] ?? guidance.rotation.theme
    const topicId = topicsByTheme.get(primaryTheme)
    guidance.relatedTopicIds = topicId ? [topicId] : []
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

  const topicsByCategory = new Map()
  for (const topic of dataset.topicGuides) {
    const list = topicsByCategory.get(topic.category) ?? []
    list.push(topic.id)
    topicsByCategory.set(topic.category, list)
  }

  for (const topic of dataset.topicGuides) {
    const familyKey = topic.rotation.theme
    topic.relatedTopicIds = (topicsByCategory.get(topic.category) ?? [])
      .filter(candidate => candidate !== topic.id)
      .slice(0, 2)
    topic.relatedCollectionIds = (collectionsByTheme.get(familyKey) ?? []).slice(0, 3)
  }

  for (const collection of dataset.collections) {
    const topicIds = collection.items.filter(item => item.kind === "topic-guide").map(item => item.id)
    const shabadIds = collection.items.filter(item => item.kind === "shabad-deep-dive").map(item => item.id)
    collection.relatedTopicIds = Array.from(new Set([
      ...topicIds,
      ...collection.themes.flatMap(theme => {
        const topicId = topicsByTheme.get(theme)
        return topicId ? [topicId] : []
      }),
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

function buildLearnCatalogSnapshot(dataset) {
  const indexes = buildDatasetIndexes(dataset)
  return {
    manifest: {
      inventory: {
        dailyGuidance: dataset.dailyGuidance.length,
        shabadDeepDives: dataset.shabadDeepDives.length,
        topicGuides: dataset.topicGuides.length,
        topicScenarios: dataset.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0),
        collections: dataset.collections.length,
        crossLinks: 0,
        readyForLaunch: false,
      },
      filters: {
        shabadThemes: [],
        shabadGurus: [],
        shabadRaags: [],
      },
    },
    searchIndex: dataset.searchIndex,
    dailyGuidance: dataset.dailyGuidance,
    shabadDeepDives: dataset.shabadDeepDives,
    topicGuides: dataset.topicGuides,
    collections: dataset.collections,
    dailyGuidanceById: indexes.dailyGuidanceById,
    shabadDeepDiveById: indexes.shabadDeepDivesById,
    topicGuideById: indexes.topicGuidesById,
    collectionById: indexes.collectionsById,
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

function buildSurfaceCollisionSamples(dataset) {
  const { getTodayLearnSurface } = loadTsModule(path.join(PROJECT_ROOT, "src/utils/learnExperience.ts"))
  const catalog = buildLearnCatalogSnapshot(dataset)
  const learnState = {
    viewedItems: [],
    savedItemIds: [],
    recentTopicIds: [],
    activeCollectionId: null,
    depthPreference: "balanced",
  }

  return enumerateDayStamps("2026-04-01", 35).flatMap((dayStamp) => {
    const surface = getTodayLearnSurface(catalog, dayStamp, learnState)
    const railThemes = surface.themeRail.map(topic => topic.rotation.theme)
    const duplicateRailThemes = Array.from(
      new Set(railThemes.filter((theme, index) => railThemes.indexOf(theme) !== index))
    )
    const spotlightTheme = surface.topicSpotlight.item.rotation.theme
    const spotlightCollision = railThemes.includes(spotlightTheme)

    if (duplicateRailThemes.length === 0 && !spotlightCollision) {
      return []
    }

    return [{
      dayStamp,
      railTopicIds: surface.themeRail.map(topic => topic.id),
      railThemes,
      duplicateRailThemes,
      spotlightTopicId: surface.topicSpotlight.item.id,
      spotlightTheme,
      spotlightCollision,
    }]
  })
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
  const overrides = loadLearnOverrides()
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
    const occupiedWindowKeys = new Set(
      dailyGuidance
        .filter(item => item.source.deepDiveId === shabad.id)
        .map(item => guidanceWindowKey(item.source.verseIds))
    )
    const availableWindows = buildGuidanceWindows(shabad)
      .filter(window => !occupiedWindowKeys.has(guidanceWindowKey(window)))

    for (let slotIndex = 0; slotIndex < Math.min(slots, availableWindows.length); slotIndex += 1) {
      if (dailyGuidance.length >= 240) break
      const guidance = createGuidanceFromShabad(
        shabad,
        slotIndex,
        shabad.themes[0] ?? "anxiety",
        availableWindows[slotIndex]
      )
      if (!dailyGuidance.some(item => item.id === guidance.id)) {
        dailyGuidance.push(guidance)
      }
    }
    if (dailyGuidance.length >= 240) break
  }

  const themeShabads = new Map()
  for (const shabad of shabadDeepDives) {
    for (const theme of shabad.themes) {
      const list = themeShabads.get(theme) ?? []
      list.push(shabad)
      themeShabads.set(theme, list)
    }
  }

  const topicGuides = buildCanonicalTopics(shabadDeepDives, legacy.topicGuides)

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
        { kind: "topic-guide", id: topic.id, scenarioKey: "daily" },
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
        { kind: "topic-guide", id: topic.id, scenarioKey: "practice" },
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
        { kind: "topic-guide", id: leftTopic.id, scenarioKey: "pressure" },
        { kind: "shabad-deep-dive", id: leftShabad.id },
        { kind: "topic-guide", id: rightTopic.id, scenarioKey: "repair" },
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

  normalizePublishedCopy(dataset, overrides)
  Object.assign(dataset, buildDatasetIndexes(dataset))
  wireRelationships(dataset)
  dataset.searchIndex = buildSearchIndex(dataset.topicGuides)
  dataset.topicUniquenessRegistry = await buildTopicUniquenessRegistry(dataset.topicGuides, huggingFaceAdapter)
  dataset.generation = {
    huggingFaceAdapterEnabled: huggingFaceAdapter.enabled,
  }
  dataset.editorialReview = applyEditorialReview(dataset, legacy)

  await writeJson(DRAFTS_PATH, dataset)
  return dataset
}
function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    return null
  }

  let dot = 0
  let leftMagnitude = 0
  let rightMagnitude = 0

  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    dot += left[index] * right[index]
    leftMagnitude += left[index] * left[index]
    rightMagnitude += right[index] * right[index]
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return null
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
}

function stemToken(token) {
  return token.replace(/(ing|edly|edly|edly|ed|es|s)$/i, "")
}

function actionPromptSimilarity(left, right) {
  const leftTokens = new Set(normalizeText(left).split(" ").filter(token => token.length > 2).map(stemToken))
  const rightTokens = new Set(normalizeText(right).split(" ").filter(token => token.length > 2).map(stemToken))
  const overlap = Array.from(leftTokens).filter(token => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : overlap / union
}

function getUniquenessEntry(registry, topicId, scenarioKey = "overview") {
  return registry?.entries?.find(entry => entry.topicId === topicId && entry.scenarioKey === scenarioKey) ?? null
}

function validateLearnShellCopy() {
  const editorialModule = loadTsModule(path.join(PROJECT_ROOT, "src/content/editorialCopy.ts"))
  const editorialCopy = editorialModule.getEditorialCopy("en")
  const fields = [
    ["heroBody", "Hero body", editorialCopy.learn.heroBody],
    ["heroSearchHint", "Hero search hint", editorialCopy.learn.heroSearchHint],
    ["proofBody", "Proof body", editorialCopy.learn.proofBody],
    ["proofFooter", "Proof footer", editorialCopy.learn.proofFooter],
    ["compactGuidanceBody", "Guidance compact body", editorialCopy.learn.compactGuidanceBody],
    ["compactTopicBody", "Topic compact body", editorialCopy.learn.compactTopicBody],
    ["detailBody", "Detail body", editorialCopy.learn.detailBody],
    ["topicsIntroBody", "Topics intro body", editorialCopy.learn.topicsIntroBody],
    ["shabadsIntroBody", "Shabads intro body", editorialCopy.learn.shabadsIntroBody],
    ["savedIntroBody", "Saved intro body", editorialCopy.learn.savedIntroBody],
  ]

  return fields.map(([field, label, value]) => {
    const reviewed = scoreEditorialCopy({
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
      value,
      issues: collectStyleIssues({
        text: value,
        includeShellWarnings: true,
      }),
      scores: reviewed.scores,
    }
  })
}

function collectDuplicateIds(items) {
  const seen = new Map()
  for (const item of items) {
    seen.set(item.id, (seen.get(item.id) ?? 0) + 1)
  }
  return Array.from(seen.entries()).filter(([, count]) => count > 1).map(([id]) => id)
}

function addPublicTextValidation(hardFailures, label, value) {
  if (publicTextNeedsCleanup(value)) {
    hardFailures.push(`${label} still contains structural heading text or unusable copy`)
  }
}

function getReferenceTranslation(indexes, source) {
  const shabad = indexes.shabadDeepDivesById[source?.deepDiveId]
  if (!shabad) return ""

  return shabad.lines
    .filter(line => source.verseIds.includes(line.verseId))
    .map(line => line.translation)
    .filter(Boolean)
    .join(" ")
}

function addLineReferenceValidation(hardFailures, indexes, label, source) {
  addPublicTextValidation(hardFailures, label, source.shortMeaning)
  const translationCheck = checkShortMeaningTranslationEcho(
    source.shortMeaning,
    getReferenceTranslation(indexes, source)
  )
  if (translationCheck.rejected) {
    hardFailures.push(`${label} echoes the cited translation too closely (${translationCheck.similarity.toFixed(2)})`)
  }
}

function addEditorialGateFailures(hardFailures, label, editorial) {
  if (!editorial) return

  if (editorial.status === "theme-mismatch") {
    hardFailures.push(`${label} is marked theme-mismatch and cannot be published`)
  }
  if (editorial.origin === "generated" && editorial.reviewedByHuman !== true) {
    hardFailures.push(`${label} is generated but not marked reviewedByHuman`)
  }
}

function shouldValidatePublishedCopy(editorial) {
  return !(editorial?.origin === "generated" && editorial.reviewedByHuman !== true)
    && editorial?.status !== "theme-mismatch"
}

function clearsEditorialThresholds(editorial, thresholds) {
  if (!editorial || !thresholds) return false
  return (
    editorial.scores.overall >= thresholds.overall
    && editorial.scores.faithfulness >= thresholds.faithfulness
    && editorial.scores.clarity >= thresholds.clarity
    && editorial.scores.usefulness >= thresholds.usefulness
    && editorial.scores.beauty >= thresholds.beauty
  )
}

const TOPIC_EDITORIAL_THRESHOLDS = {
  overall: 3.75,
  faithfulness: 3.7,
  clarity: 2.9,
  usefulness: 3,
  beauty: 3.1,
}

function getEditorialThresholds(kind) {
  if (kind === "daily-guidance") return PREMIUM_EDITORIAL_THRESHOLDS["daily-guidance"]
  if (kind === "shabad-deep-dive") return PREMIUM_EDITORIAL_THRESHOLDS["shabad-deep-dive"]
  if (kind === "collection") return PREMIUM_EDITORIAL_THRESHOLDS.collection
  if (kind === "topic-guide" || kind === "topic-scenario") return TOPIC_EDITORIAL_THRESHOLDS
  return null
}

function getValidationPayload(item) {
  if (item?.source?.deepDiveId) {
    return JSON.stringify({
      id: item.id,
      title: item.title,
      summary: item.summary,
      takeaway: item.takeaway,
      lifeApplication: item.lifeApplication,
      source: {
        shortMeaning: item.source.shortMeaning,
        lifeApplication: item.source.lifeApplication,
      },
    })
  }

  if (Array.isArray(item?.lines)) {
    return JSON.stringify({
      id: item.id,
      title: item.title,
      summary: item.summary,
      whyItMatters: item.whyItMatters,
      takeaway: item.takeaway,
      structure: item.structure,
    })
  }

  if (item?.heroSource?.deepDiveId) {
    return JSON.stringify({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      heroSource: {
        shortMeaning: item.heroSource.shortMeaning,
        lifeApplication: item.heroSource.lifeApplication,
      },
    })
  }

  if (item?.centralInsight && item?.issueStatement) {
    return JSON.stringify({
      id: item.id,
      title: item.title,
      issueStatement: item.issueStatement,
      centralInsight: item.centralInsight,
      practicalReflection: item.practicalReflection,
      actionPrompt: item.actionPrompt,
      excerpts: (item.excerpts ?? []).map(excerpt => ({
        explanation: excerpt.explanation,
        source: {
          shortMeaning: excerpt.source?.shortMeaning,
          lifeApplication: excerpt.source?.lifeApplication,
        },
      })),
    })
  }

  return JSON.stringify(item)
}

function pushPayloadCopyIssues(issues, item) {
  const payload = getValidationPayload(item)
  if (PLACEHOLDER_PATTERNS.some(pattern => pattern.test(payload))) {
    issues.push(`${item.id} contains placeholder copy`)
  }
  if (HARD_BANNED_PATTERNS.some(pattern => pattern.test(payload))) {
    issues.push(`${item.id} contains a hard-banned editorial phrase`)
  }
}

function collectShabadPublishIssues(shabad, indexes) {
  const issues = []
  addEditorialGateFailures(issues, `Shabad ${shabad.id}`, shabad.editorial)
  if (!shabad.editorial) {
    issues.push(`Shabad ${shabad.id} is missing editorial review`)
    return issues
  }
  if (shabad.editorial.status === "draft") {
    issues.push(`Shabad ${shabad.id} is still in draft status`)
  }
  if (shouldValidatePublishedCopy(shabad.editorial)) {
    addPublicTextValidation(issues, `Shabad ${shabad.id} title`, shabad.title)
    addPublicTextValidation(issues, `Shabad ${shabad.id} summary`, shabad.summary)
    addPublicTextValidation(issues, `Shabad ${shabad.id} whyItMatters`, shabad.whyItMatters)
    addPublicTextValidation(issues, `Shabad ${shabad.id} takeaway`, shabad.takeaway)
    for (const [index, structureLine] of shabad.structure.entries()) {
      addPublicTextValidation(issues, `Shabad ${shabad.id} structure ${index + 1}`, structureLine)
    }
    if (shabad.editorial.issues.length > 0) {
      issues.push(`Shabad ${shabad.id} still has editorial issues: ${shabad.editorial.issues.join(", ")}`)
    }
    if (!clearsEditorialThresholds(shabad.editorial, getEditorialThresholds("shabad-deep-dive"))) {
      issues.push(`Shabad ${shabad.id} did not clear premium editorial thresholds`)
    }
    pushPayloadCopyIssues(issues, shabad)
  }
  return issues
}

function collectGuidancePublishIssues(guidance, indexes) {
  const issues = []
  addEditorialGateFailures(issues, `Guidance ${guidance.id}`, guidance.editorial)
  if (!guidance.editorial) {
    issues.push(`Guidance ${guidance.id} is missing editorial review`)
    return issues
  }
  if (guidance.editorial.status === "draft") {
    issues.push(`Guidance ${guidance.id} is still in draft status`)
  }
  if (!indexes.shabadDeepDivesById[guidance.source.deepDiveId]) {
    issues.push(`Guidance ${guidance.id} references missing shabad ${guidance.source.deepDiveId}`)
  }
  if (shouldValidatePublishedCopy(guidance.editorial)) {
    addPublicTextValidation(issues, `Guidance ${guidance.id} title`, guidance.title)
    addPublicTextValidation(issues, `Guidance ${guidance.id} summary`, guidance.summary)
    addPublicTextValidation(issues, `Guidance ${guidance.id} takeaway`, guidance.takeaway)
    addPublicTextValidation(issues, `Guidance ${guidance.id} life application`, guidance.lifeApplication)
    addLineReferenceValidation(issues, indexes, `Guidance ${guidance.id} excerpt meaning`, guidance.source)
    if (guidance.editorial.issues.length > 0) {
      issues.push(`Guidance ${guidance.id} still has editorial issues: ${guidance.editorial.issues.join(", ")}`)
    }
    if (!clearsEditorialThresholds(guidance.editorial, getEditorialThresholds("daily-guidance"))) {
      issues.push(`Guidance ${guidance.id} did not clear premium editorial thresholds`)
    }
    pushPayloadCopyIssues(issues, guidance)
  }
  return issues
}

function collectScenarioPublishIssues(topic, scenarioKey, indexes) {
  const scenario = topic.scenarios[scenarioKey]
  const issues = []
  if (!scenario) {
    issues.push(`Scenario ${topic.id}#${scenarioKey} is missing`)
    return issues
  }
  addEditorialGateFailures(issues, `Scenario ${topic.id}#${scenarioKey}`, scenario.editorial)
  if (!scenario.editorial) {
    issues.push(`Scenario ${topic.id}#${scenarioKey} is missing editorial review`)
    return issues
  }
  if (scenario.editorial.status === "draft") {
    issues.push(`Scenario ${topic.id}#${scenarioKey} is still in draft status`)
  }
  if (shouldValidatePublishedCopy(scenario.editorial)) {
    addPublicTextValidation(issues, `Scenario ${topic.id}#${scenarioKey} title`, scenario.title)
    for (const [excerptIndex, excerpt] of scenario.excerpts.entries()) {
      addLineReferenceValidation(issues, indexes, `Scenario ${topic.id}#${scenarioKey} excerpt ${excerptIndex + 1} meaning`, excerpt.source)
    }
    if (scenario.editorial.issues.length > 0) {
      issues.push(`Scenario ${topic.id}#${scenarioKey} still has editorial issues: ${scenario.editorial.issues.join(", ")}`)
    }
    if (!clearsEditorialThresholds(scenario.editorial, getEditorialThresholds("topic-scenario"))) {
      issues.push(`Scenario ${topic.id}#${scenarioKey} did not clear editorial thresholds`)
    }
    pushPayloadCopyIssues(issues, scenario)
  }
  return issues
}

function collectTopicPublishIssues(topic, indexes) {
  const issues = []
  addEditorialGateFailures(issues, `Canonical topic ${topic.id}`, topic.editorial)
  if (!topic.editorial) {
    issues.push(`Canonical topic ${topic.id} is missing editorial review`)
    return issues
  }
  if (topic.editorial.status === "draft") {
    issues.push(`Canonical topic ${topic.id} is still in draft status`)
  }
  if (shouldValidatePublishedCopy(topic.editorial)) {
    addPublicTextValidation(issues, `Topic ${topic.id} title`, topic.title)
    for (const [excerptIndex, excerpt] of topic.excerpts.entries()) {
      addLineReferenceValidation(issues, indexes, `Topic ${topic.id} overview excerpt ${excerptIndex + 1} meaning`, excerpt.source)
    }
    if (topic.editorial.issues.length > 0) {
      issues.push(`Canonical topic ${topic.id} still has editorial issues: ${topic.editorial.issues.join(", ")}`)
    }
    if (!clearsEditorialThresholds(topic.editorial, getEditorialThresholds("topic-guide"))) {
      issues.push(`Canonical topic ${topic.id} did not clear editorial thresholds`)
    }
    for (const scenarioKey of topic.scenarioOrder) {
      issues.push(...collectScenarioPublishIssues(topic, scenarioKey, indexes))
    }
    pushPayloadCopyIssues(issues, topic)
  }
  return issues
}

function collectCollectionPublishIssues(collection, indexes) {
  const issues = []
  addEditorialGateFailures(issues, `Collection ${collection.id}`, collection.editorial)
  if (!collection.editorial) {
    issues.push(`Collection ${collection.id} is missing editorial review`)
    return issues
  }
  if (collection.editorial.status === "draft") {
    issues.push(`Collection ${collection.id} is still in draft status`)
  }
  if (!collection.heroSource?.deepDiveId) {
    issues.push(`Collection ${collection.id} is missing a hero source`)
  }
  if (shouldValidatePublishedCopy(collection.editorial)) {
    addPublicTextValidation(issues, `Collection ${collection.id} title`, collection.title)
    addPublicTextValidation(issues, `Collection ${collection.id} subtitle`, collection.subtitle)
    addPublicTextValidation(issues, `Collection ${collection.id} description`, collection.description)
    addLineReferenceValidation(issues, indexes, `Collection ${collection.id} hero meaning`, collection.heroSource)
    if (collection.editorial.issues.length > 0) {
      issues.push(`Collection ${collection.id} still has editorial issues: ${collection.editorial.issues.join(", ")}`)
    }
    if (!clearsEditorialThresholds(collection.editorial, getEditorialThresholds("collection"))) {
      issues.push(`Collection ${collection.id} did not clear premium editorial thresholds`)
    }
    pushPayloadCopyIssues(issues, collection)
  }
  return issues
}

async function loadExistingPublicDataset() {
  const paths = {
    manifest: path.join(PUBLIC_DIR, "manifest.json"),
    searchIndex: path.join(PUBLIC_DIR, "search-index.json"),
    validation: path.join(PUBLIC_DIR, "validation-report.json"),
    dailyGuidance: path.join(PUBLIC_DIR, "lists/daily-guidance.json"),
    shabadDeepDives: path.join(PUBLIC_DIR, "lists/shabad-deep-dives.json"),
    topicGuides: path.join(PUBLIC_DIR, "lists/topic-guides.json"),
    collections: path.join(PUBLIC_DIR, "lists/collections.json"),
  }
  const exists = await Promise.all(Object.values(paths).map(async filePath => {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }))
  if (!exists.every(Boolean)) return null

  return {
    manifest: await readJson(paths.manifest),
    searchIndex: await readJson(paths.searchIndex),
    validation: await readJson(paths.validation),
    dailyGuidance: await readJson(paths.dailyGuidance),
    shabadDeepDives: await readJson(paths.shabadDeepDives),
    topicGuides: await readJson(paths.topicGuides),
    collections: await readJson(paths.collections),
  }
}

function mergeItemsById(existingItems, overlayItems) {
  const overlaysById = new Map(overlayItems.map(item => [item.id, item]))
  const merged = existingItems.map(item => overlaysById.get(item.id) ?? item)
  for (const overlay of overlayItems) {
    if (!existingItems.some(item => item.id === overlay.id)) {
      merged.push(overlay)
    }
  }
  return merged
}

function createPublishableOverlay(drafts) {
  const indexes = buildDatasetIndexes(drafts)
  const shabadDeepDives = drafts.shabadDeepDives.filter(item => collectShabadPublishIssues(item, indexes).length === 0)
  const publishableShabadIds = new Set(shabadDeepDives.map(item => item.id))
  const guidance = drafts.dailyGuidance.filter(item =>
    publishableShabadIds.has(item.source.deepDiveId)
    && collectGuidancePublishIssues(item, indexes).length === 0
  )
  const topicGuides = drafts.topicGuides.filter(item => collectTopicPublishIssues(item, indexes).length === 0)
  const collections = drafts.collections.filter(item => collectCollectionPublishIssues(item, indexes).length === 0)

  return {
    version: drafts.version,
    generatedAt: new Date().toISOString(),
    dailyGuidance: guidance,
    shabadDeepDives,
    topicGuides,
    collections,
  }
}

function createMergedPublishedDataset(drafts, existingPublic) {
  const overlay = createPublishableOverlay(drafts)
  const merged = {
    version: drafts.version,
    generatedAt: new Date().toISOString(),
    dailyGuidance: mergeItemsById(existingPublic?.dailyGuidance ?? [], overlay.dailyGuidance),
    shabadDeepDives: mergeItemsById(existingPublic?.shabadDeepDives ?? [], overlay.shabadDeepDives),
    topicGuides: mergeItemsById(existingPublic?.topicGuides ?? [], overlay.topicGuides),
    collections: mergeItemsById(existingPublic?.collections ?? [], overlay.collections),
  }

  Object.assign(merged, buildDatasetIndexes(merged))
  wireRelationships(merged)
  merged.searchIndex = buildSearchIndex(merged.topicGuides)

  return merged
}

function buildPublicManifest(dataset, validation) {
  const shabadThemes = Array.from(new Set(dataset.shabadDeepDives.flatMap(item => item.themes))).sort((left, right) => left.localeCompare(right))
  const shabadGurus = Array.from(new Set(dataset.shabadDeepDives.map(item => item.citation.guru))).sort((left, right) => left.localeCompare(right))
  const shabadRaags = Array.from(new Set(dataset.shabadDeepDives.map(item => item.citation.raag))).sort((left, right) => left.localeCompare(right))
  const inventory = {
    dailyGuidance: dataset.dailyGuidance.length,
    shabadDeepDives: dataset.shabadDeepDives.length,
    topicGuides: dataset.topicGuides.length,
    topicScenarios: dataset.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0),
    collections: dataset.collections.length,
    crossLinks:
      dataset.dailyGuidance.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length, 0)
      + dataset.shabadDeepDives.reduce((count, item) => count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
      + dataset.topicGuides.reduce((count, item) => count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
      + dataset.topicGuides.reduce(
        (count, item) => count + item.scenarioOrder.reduce(
          (scenarioCount, scenarioKey) => scenarioCount + item.scenarios[scenarioKey].excerpts.length + 1,
          0
        ),
        0
      )
      + dataset.collections.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length, 0),
    readyForLaunch: validation.counts.readyForLaunch,
  }

  return {
    version: dataset.version,
    generatedAt: dataset.generatedAt,
    inventory,
    targets: {
      dailyGuidance: 240,
      shabadDeepDives: 100,
      topicGuides: 28,
      topicScenarios: 112,
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
}

function buildHomeSummary(dataset) {
  return {
    dailyGuidance: dataset.dailyGuidance.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      relatedTopicIds: item.relatedTopicIds,
      relatedShabadIds: item.relatedShabadIds,
      relatedCollectionIds: item.relatedCollectionIds,
      rotation: item.rotation,
    })),
    shabadDeepDives: dataset.shabadDeepDives.map(item => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      summary: item.summary,
      whyItMatters: item.whyItMatters,
      themes: item.themes,
      relatedGuidanceIds: item.relatedGuidanceIds,
      relatedTopicIds: item.relatedTopicIds,
      relatedCollectionIds: item.relatedCollectionIds,
      rotation: item.rotation,
    })),
    topicGuides: dataset.topicGuides.map(item => ({
      id: item.id,
      title: item.title,
      shortTitle: item.shortTitle,
      category: item.category,
      centralInsight: item.centralInsight,
      searchTerms: item.searchTerms,
      relatedTopicIds: item.relatedTopicIds,
      relatedShabadIds: item.relatedShabadIds,
      relatedCollectionIds: item.relatedCollectionIds,
      rotation: item.rotation,
    })),
    collections: dataset.collections.map(item => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      durationLabel: item.durationLabel,
      themes: item.themes,
      relatedTopicIds: item.relatedTopicIds,
      relatedShabadIds: item.relatedShabadIds,
      itemCount: item.items.length,
    })),
  }
}

async function writePublicArchive(dataset, validation) {
  const manifest = buildPublicManifest(dataset, validation)
  const homeSummary = buildHomeSummary(dataset)

  await fs.rm(PUBLIC_DIR, { recursive: true, force: true })
  await ensureDir(PUBLIC_DIR)
  await writeJson(path.join(PUBLIC_DIR, "manifest.json"), manifest)
  await writeJson(path.join(PUBLIC_DIR, "home-summary.json"), homeSummary)
  await writeJson(path.join(PUBLIC_DIR, "search-index.json"), dataset.searchIndex)
  await writeJson(path.join(PUBLIC_DIR, "validation-report.json"), validation)
  await writeJson(path.join(PUBLIC_DIR, "lists/daily-guidance.json"), dataset.dailyGuidance)
  await writeJson(path.join(PUBLIC_DIR, "lists/shabad-deep-dives.json"), dataset.shabadDeepDives)
  await writeJson(path.join(PUBLIC_DIR, "lists/topic-guides.json"), dataset.topicGuides)
  await writeJson(path.join(PUBLIC_DIR, "lists/collections.json"), dataset.collections)

  for (const item of dataset.dailyGuidance) {
    await writeJson(path.join(PUBLIC_DIR, `details/daily-guidance/${item.id}.json`), item)
  }
  for (const item of dataset.shabadDeepDives) {
    await writeJson(path.join(PUBLIC_DIR, `details/shabad-deep-dive/${item.id}.json`), item)
  }
  for (const item of dataset.topicGuides) {
    await writeJson(path.join(PUBLIC_DIR, `details/topic-guide/${item.id}.json`), item)
  }
  for (const item of dataset.collections) {
    await writeJson(path.join(PUBLIC_DIR, `details/collection/${item.id}.json`), item)
  }

  return manifest
}

export async function validateDrafts(drafts = null) {
  const dataset = drafts ?? await generateDrafts()
  const hardFailures = []
  const warnings = []
  const topicUniquenessRegistry = dataset.topicUniquenessRegistry ?? await readJson(TOPIC_UNIQUENESS_PATH)
  const indexes = buildDatasetIndexes(dataset)

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
    addEditorialGateFailures(hardFailures, `Shabad ${shabad.id}`, shabad.editorial)
    if (shouldValidatePublishedCopy(shabad.editorial)) {
      addPublicTextValidation(hardFailures, `Shabad ${shabad.id} title`, shabad.title)
      addPublicTextValidation(hardFailures, `Shabad ${shabad.id} summary`, shabad.summary)
      addPublicTextValidation(hardFailures, `Shabad ${shabad.id} whyItMatters`, shabad.whyItMatters)
      addPublicTextValidation(hardFailures, `Shabad ${shabad.id} takeaway`, shabad.takeaway)
      for (const [structureIndex, structureLine] of shabad.structure.entries()) {
        addPublicTextValidation(hardFailures, `Shabad ${shabad.id} structure ${structureIndex + 1}`, structureLine)
      }
      if (shabad.editorial.issues.length > 0) {
        hardFailures.push(`Shabad ${shabad.id} still has editorial issues: ${shabad.editorial.issues.join(", ")}`)
      }
      if (!clearsEditorialThresholds(shabad.editorial, PREMIUM_EDITORIAL_THRESHOLDS["shabad-deep-dive"])) {
        hardFailures.push(`Shabad ${shabad.id} did not clear premium editorial thresholds`)
      }
    }
  }

  const guidanceKeys = new Set()
  for (const guidance of dataset.dailyGuidance) {
    const key = `${guidance.source.deepDiveId}:${guidance.source.verseIds.join(",")}:${normalizeText(guidance.takeaway)}`
    if (guidanceKeys.has(key)) {
      hardFailures.push(`Duplicate daily guidance window detected for ${guidance.id}`)
    }
    guidanceKeys.add(key)
    addEditorialGateFailures(hardFailures, `Guidance ${guidance.id}`, guidance.editorial)
    if (shouldValidatePublishedCopy(guidance.editorial)) {
      addPublicTextValidation(hardFailures, `Guidance ${guidance.id} title`, guidance.title)
      addPublicTextValidation(hardFailures, `Guidance ${guidance.id} summary`, guidance.summary)
      addPublicTextValidation(hardFailures, `Guidance ${guidance.id} takeaway`, guidance.takeaway)
      addPublicTextValidation(hardFailures, `Guidance ${guidance.id} life application`, guidance.lifeApplication)
      addLineReferenceValidation(hardFailures, indexes, `Guidance ${guidance.id} excerpt meaning`, guidance.source)
      if (guidance.editorial.issues.length > 0) {
        hardFailures.push(`Guidance ${guidance.id} still has editorial issues: ${guidance.editorial.issues.join(", ")}`)
      }
      if (!clearsEditorialThresholds(guidance.editorial, PREMIUM_EDITORIAL_THRESHOLDS["daily-guidance"])) {
        hardFailures.push(`Guidance ${guidance.id} did not clear premium editorial thresholds`)
      }
    }
  }

  const topicFamilies = new Set()
  for (const topic of dataset.topicGuides) {
    if (topicFamilies.has(topic.rotation.theme)) {
      hardFailures.push(`Multiple canonical topics found for family ${topic.rotation.theme}`)
    }
    topicFamilies.add(topic.rotation.theme)
  }

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

    if (!topic.editorial) {
      hardFailures.push(`Topic ${topic.id} is missing editorial review`)
    } else {
      addEditorialGateFailures(hardFailures, `Canonical topic ${topic.id}`, topic.editorial)
      if (topic.editorial.status === "draft" && shouldValidatePublishedCopy(topic.editorial)) {
        hardFailures.push(`Canonical topic ${topic.id} is still in draft status`)
      }
      if (topic.editorial.issues.length > 0 && shouldValidatePublishedCopy(topic.editorial)) {
        hardFailures.push(`Canonical topic ${topic.id} still has editorial issues: ${topic.editorial.issues.join(", ")}`)
      }
      if (
        shouldValidatePublishedCopy(topic.editorial)
        && (
        topic.editorial.scores.overall < 3.75
        || topic.editorial.scores.faithfulness < 3.7
        || topic.editorial.scores.clarity < 2.9
        || topic.editorial.scores.usefulness < 3
        || topic.editorial.scores.beauty < 3.1
        )
      ) {
        hardFailures.push(`Canonical topic ${topic.id} did not clear editorial thresholds`)
      }
    }
    if (shouldValidatePublishedCopy(topic.editorial)) {
      addPublicTextValidation(hardFailures, `Topic ${topic.id} title`, topic.title)
      for (const [excerptIndex, excerpt] of topic.excerpts.entries()) {
        addLineReferenceValidation(hardFailures, indexes, `Topic ${topic.id} overview excerpt ${excerptIndex + 1} meaning`, excerpt.source)
      }
    }

    const firstScenarioExcerpts = new Set()
    for (const scenarioKey of topic.scenarioOrder) {
      const scenario = topic.scenarios[scenarioKey]
      if (!scenario) {
        hardFailures.push(`Topic ${topic.id} is missing scenario ${scenarioKey}`)
        continue
      }

      const scenarioShabadCount = new Set(scenario.excerpts.map(excerpt => excerpt.source.deepDiveId)).size
      if (scenario.excerpts.length < 3 || scenarioShabadCount < 2) {
        hardFailures.push(`Scenario ${topic.id}#${scenarioKey} does not have at least 3 excerpts from 2 shabads`)
      }

      const firstExcerptKey = scenario.excerpts[0]
        ? `${scenario.excerpts[0].source.deepDiveId}:${scenario.excerpts[0].source.verseIds.join(",")}`
        : null
      if (firstExcerptKey) {
        if (firstScenarioExcerpts.has(firstExcerptKey)) {
          hardFailures.push(`Sibling scenarios in ${topic.id} reuse the same first excerpt`)
        }
        firstScenarioExcerpts.add(firstExcerptKey)
      }

      if (!scenario.editorial) {
        hardFailures.push(`Scenario ${topic.id}#${scenarioKey} is missing editorial review`)
      } else {
        addEditorialGateFailures(hardFailures, `Scenario ${topic.id}#${scenarioKey}`, scenario.editorial)
        if (scenario.editorial.status === "draft" && shouldValidatePublishedCopy(scenario.editorial)) {
          hardFailures.push(`Scenario ${topic.id}#${scenarioKey} is still in draft status`)
        }
        if (scenario.editorial.issues.length > 0 && shouldValidatePublishedCopy(scenario.editorial)) {
          hardFailures.push(`Scenario ${topic.id}#${scenarioKey} still has editorial issues: ${scenario.editorial.issues.join(", ")}`)
        }
        if (
          shouldValidatePublishedCopy(scenario.editorial)
          && (
          scenario.editorial.scores.overall < 3.75
          || scenario.editorial.scores.faithfulness < 3.7
          || scenario.editorial.scores.clarity < 2.9
          || scenario.editorial.scores.usefulness < 3
          || scenario.editorial.scores.beauty < 3.1
          )
        ) {
          hardFailures.push(`Scenario ${topic.id}#${scenarioKey} did not clear editorial thresholds`)
        }
      }
      if (shouldValidatePublishedCopy(scenario.editorial)) {
        addPublicTextValidation(hardFailures, `Scenario ${topic.id}#${scenarioKey} title`, scenario.title)
        for (const [excerptIndex, excerpt] of scenario.excerpts.entries()) {
          addLineReferenceValidation(hardFailures, indexes, `Scenario ${topic.id}#${scenarioKey} excerpt ${excerptIndex + 1} meaning`, excerpt.source)
        }
      }
    }

    for (let index = 0; index < topic.scenarioOrder.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < topic.scenarioOrder.length; compareIndex += 1) {
        const leftKey = topic.scenarioOrder[index]
        const rightKey = topic.scenarioOrder[compareIndex]
        const leftScenario = topic.scenarios[leftKey]
        const rightScenario = topic.scenarios[rightKey]
        if (!leftScenario || !rightScenario) continue

        const leftShabads = new Set(leftScenario.excerpts.map(excerpt => excerpt.source.deepDiveId))
        const rightShabads = new Set(rightScenario.excerpts.map(excerpt => excerpt.source.deepDiveId))
        const sharedShabads = Array.from(leftShabads).filter(shabadId => rightShabads.has(shabadId))
        if (sharedShabads.length > 1) {
          hardFailures.push(`Sibling scenarios ${topic.id}#${leftKey} and ${topic.id}#${rightKey} share more than one shabad source`)
        }

        const leftEntry = getUniquenessEntry(topicUniquenessRegistry, topic.id, leftKey)
        const rightEntry = getUniquenessEntry(topicUniquenessRegistry, topic.id, rightKey)
        const semanticSimilarity =
          cosineSimilarity(leftEntry?.embedding, rightEntry?.embedding)
          ?? tokenSetSimilarity(leftEntry?.text ?? "", rightEntry?.text ?? "")
        if (semanticSimilarity >= 0.78) {
          hardFailures.push(`Sibling scenarios ${topic.id}#${leftKey} and ${topic.id}#${rightKey} are too semantically similar (${semanticSimilarity.toFixed(2)})`)
        }

        const promptSimilarity = actionPromptSimilarity(leftScenario.actionPrompt, rightScenario.actionPrompt)
        if (promptSimilarity >= 0.7) {
          hardFailures.push(`Sibling scenarios ${topic.id}#${leftKey} and ${topic.id}#${rightKey} have overlapping action prompts (${promptSimilarity.toFixed(2)})`)
        }
      }
    }
  }

  for (const collection of dataset.collections) {
    if (!collection.heroSource?.deepDiveId) {
      hardFailures.push(`Collection ${collection.id} is missing a hero source`)
    }
    addEditorialGateFailures(hardFailures, `Collection ${collection.id}`, collection.editorial)
    if (shouldValidatePublishedCopy(collection.editorial)) {
      addPublicTextValidation(hardFailures, `Collection ${collection.id} title`, collection.title)
      addPublicTextValidation(hardFailures, `Collection ${collection.id} subtitle`, collection.subtitle)
      addPublicTextValidation(hardFailures, `Collection ${collection.id} description`, collection.description)
      addLineReferenceValidation(hardFailures, indexes, `Collection ${collection.id} hero meaning`, collection.heroSource)
      if (collection.editorial.issues.length > 0) {
        hardFailures.push(`Collection ${collection.id} still has editorial issues: ${collection.editorial.issues.join(", ")}`)
      }
      if (!clearsEditorialThresholds(collection.editorial, PREMIUM_EDITORIAL_THRESHOLDS.collection)) {
        hardFailures.push(`Collection ${collection.id} did not clear premium editorial thresholds`)
      }
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
      if (item.kind === "topic-guide" && item.scenarioKey && !indexes.topicGuidesById[item.id]?.scenarios?.[item.scenarioKey]) {
        hardFailures.push(`Collection ${collection.id} references missing scenario ${item.id}#${item.scenarioKey}`)
      }
      if (item.kind === "shabad-deep-dive" && !indexes.shabadDeepDivesById[item.id]) {
        hardFailures.push(`Collection ${collection.id} has missing shabad step ${item.id}`)
      }
    }
  }

  for (const bucket of [dataset.dailyGuidance, dataset.shabadDeepDives, dataset.topicGuides, dataset.collections]) {
    for (const item of bucket) {
      if (!shouldValidatePublishedCopy(item.editorial)) continue
      const payload = getValidationPayload(item)
      if (PLACEHOLDER_PATTERNS.some(pattern => pattern.test(payload))) {
        hardFailures.push(`${item.id} contains placeholder copy`)
      }
      if (HARD_BANNED_PATTERNS.some(pattern => pattern.test(payload))) {
        hardFailures.push(`${item.id} contains a hard-banned editorial phrase`)
      }
    }
  }

  for (const [synonym, target] of Object.entries(dataset.searchIndex.synonyms)) {
    if (!indexes.topicGuidesById[target.topicId]) {
      hardFailures.push(`Synonym ${synonym} points to missing topic ${target.topicId}`)
    }
    if (target.scenarioKey && !indexes.topicGuidesById[target.topicId]?.scenarios?.[target.scenarioKey]) {
      hardFailures.push(`Synonym ${synonym} points to missing scenario ${target.topicId}#${target.scenarioKey}`)
    }
  }

  for (const [legacyId, target] of Object.entries(dataset.searchIndex.legacyTopicAliases)) {
    if (!indexes.topicGuidesById[target.topicId]) {
      hardFailures.push(`Legacy topic alias ${legacyId} points to missing topic ${target.topicId}`)
    }
    if (target.scenarioKey && !indexes.topicGuidesById[target.topicId]?.scenarios?.[target.scenarioKey]) {
      hardFailures.push(`Legacy topic alias ${legacyId} points to missing scenario ${target.topicId}#${target.scenarioKey}`)
    }
  }

  const shellCopyAudit = validateLearnShellCopy()
  for (const field of shellCopyAudit) {
    if (
      field.issues.length > 0
      || field.scores.overall < 3.35
      || field.scores.clarity < 3.1
      || field.scores.usefulness < 2.9
      || field.scores.beauty < 3
    ) {
      hardFailures.push(`Learn shell copy field ${field.field} did not clear editorial thresholds`)
    }
  }

  const surfaceCollisions = buildSurfaceCollisionSamples(dataset)
  for (const collision of surfaceCollisions) {
    if (collision.duplicateRailThemes.length > 0) {
      hardFailures.push(
        `Theme rail surfaced duplicate families on ${collision.dayStamp}: ${collision.duplicateRailThemes.join(", ")}`
      )
    }
    if (collision.spotlightCollision) {
      hardFailures.push(
        `Topic spotlight collides with the Today rail on ${collision.dayStamp}: ${collision.spotlightTheme}`
      )
    }
  }

  if (dataset.editorialReview?.draftCount > 0) {
    hardFailures.push(`Editorial review left ${dataset.editorialReview.draftCount} public items in draft status`)
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
    topicScenarios: dataset.topicGuides.reduce((count, topic) => count + topic.scenarioOrder.length, 0),
    collections: dataset.collections.length,
    crossLinks:
      dataset.dailyGuidance.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.relatedCollectionIds.length, 0)
      + dataset.shabadDeepDives.reduce((count, item) => count + item.relatedGuidanceIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
      + dataset.topicGuides.reduce((count, item) => count + item.relatedShabadIds.length + item.relatedTopicIds.length + item.relatedCollectionIds.length, 0)
      + dataset.topicGuides.reduce(
        (count, item) => count + item.scenarioOrder.reduce(
          (scenarioCount, scenarioKey) => scenarioCount + item.scenarios[scenarioKey].excerpts.length + 1,
          0
        ),
        0
      )
      + dataset.collections.reduce((count, item) => count + item.relatedTopicIds.length + item.relatedShabadIds.length + item.items.length, 0),
    readyForLaunch: false,
  }

  const averageLinks = averageCrossLinks(dataset)
  inventory.readyForLaunch =
    hardFailures.length === 0
    && inventory.dailyGuidance >= 240
    && inventory.shabadDeepDives >= 100
    && inventory.topicGuides >= 28
    && inventory.topicScenarios >= 112
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
    shellCopy: shellCopyAudit,
    surfaceCollisions,
    hardFailures,
    warnings,
  }

  await writeJson(VALIDATION_PATH, report)
  return report
}

export async function publishLearnArchive() {
  const drafts = await generateDrafts()
  const validation = await validateDrafts(drafts)
  const publicBaseline = await loadExistingPublicDataset()
  const publishedDataset =
    validation.hardFailures.length === 0
      ? drafts
      : createMergedPublishedDataset(drafts, publicBaseline)

  const manifest = await writePublicArchive(publishedDataset, validation)

  if (validation.hardFailures.length > 0) {
    throw new Error(`Learn archive validation failed:\n${validation.hardFailures.join("\n")}`)
  }

  return {
    manifest,
    validation,
  }
}
