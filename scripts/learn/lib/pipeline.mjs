import fs from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"
import { fileURLToPath } from "node:url"
import { TOPIC_FAMILIES } from "./topic-taxonomy.mjs"
import { applyEditorialReview } from "./copy-critic.mjs"
import { createHuggingFaceAdapter } from "./huggingface-adapter.mjs"
import { PLACEHOLDER_PATTERNS, collectStyleIssues } from "./style-guide.mjs"
import { TOPIC_GOLD_SET } from "./topic-gold-set.mjs"
import { scoreEditorialCopy } from "./editorial-rubric.mjs"

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

const GUIDANCE_COPY_OVERRIDES = {
  "guidance-generated-461-2": {
    title: "Service carries the seeker across",
    summary: "Restlessness eases when devotion and service stop being abstractions and become the next faithful act.",
    takeaway: "Union with the Divine is learned through the True Guru, and devotion joined to service becomes a real crossing.",
    lifeApplication: "When the mind wants more motion, choose one act of devotion or service that returns you to the path you already know.",
    source: {
      shortMeaning: "Through the True Guru, devotion and service become the crossing into union.",
      lifeApplication: "Let devotion become concrete before restlessness turns into one more search for novelty.",
    },
  },
  "guidance-work-give-know-the-path-2": {
    title: "Honest work makes the path visible",
    summary: "Seva becomes credible in honest labor and open-handed giving, not in spiritual performance.",
    takeaway: "The true path appears where a person works honestly, shares what they earn, and keeps pretense out of religion.",
    lifeApplication: "Let service become plain and clean today: do the work, share what you can, and stop curating the image of goodness.",
    source: {
      shortMeaning: "The true guide is recognized in honest work and generous sharing, not in spiritual display.",
      lifeApplication: "Do one useful thing cleanly and quietly, then let the giving matter more than the appearance of being good.",
    },
  },
  "guidance-generated-511-2": {
    title: "Mercy lets the hidden sweetness be found",
    summary: "Mercy is not forced out of the day. The heart tastes what was already near when the Merciful One opens it.",
    takeaway: "When the Merciful One shows mercy, the hidden sweetness of the Divine is finally tasted within.",
    lifeApplication: "Before you judge the day again, receive one sign of mercy and let it soften the room you are standing in.",
    source: {
      shortMeaning: "When the Merciful One shows mercy, the hidden sweetness of the Lord is tasted within.",
      lifeApplication: "Receive mercy before you analyze it, and let that reception change the next tone you bring into the day.",
    },
  },
  "guidance-generated-179-2": {
    title: "Serving the Guru makes the heart clean again",
    summary: "Ego loses some of its glamour when service stops being display and becomes inner cleansing.",
    takeaway: "Serving the True Guru lets the Lord abide within, and the mind and body begin to grow clean again.",
    lifeApplication: "When the self wants to lead, choose one act of service that cleans the heart instead of enlarging the image.",
    source: {
      shortMeaning: "Serving the True Guru lets the Lord abide within, and the mind and body grow pure.",
      lifeApplication: "Let service make you smaller and cleaner before urgency turns self-importance into the room's loudest voice.",
    },
  },
  "guidance-generated-152-2": {
    title: "Without holy company, attachment stays dusty",
    summary: "Sangat is not decorative here. Without the right company, attachment keeps coating the heart.",
    takeaway: "Without attunement to the holy company, attachment to Maya stays like dust; with love for Guru, the heart turns cleanly toward the Divine.",
    lifeApplication: "Move closer to the company that helps the heart love well instead of simply agreeing with its habits.",
    source: {
      shortMeaning: "Without holy company, attachment stays like dust; with love for Guru, the heart turns toward the Divine.",
      lifeApplication: "Choose one company today that makes remembrance easier and attachment less convincing.",
    },
  },
  "guidance-generated-109-2": {
    title: "Without the Beloved, the night stays anguished",
    summary: "Doubt loses its swagger when the heart admits how badly it needs the One it keeps postponing.",
    takeaway: "The Guru's word fills the heart with reverence; without the Beloved, even one instant feels anguished.",
    lifeApplication: "Before reopening every question, let one line tell the truth about your dependence and stay there a moment longer.",
    source: {
      shortMeaning: "The Guru's word fills the heart with reverence; without the Beloved, even one instant feels anguished.",
      lifeApplication: "Use the line before the question multiplies again, and let reverence quiet what panic was trying to organize.",
    },
  },
  "guidance-conquer-the-mind-2": {
    title: "Contentment makes discipline visible",
    summary: "Discipline becomes credible when humility, meditation, and contentment begin shaping the body before pressure does.",
    takeaway: "Contentment, humility, and meditation mark the disciplined life more truly than image or strain.",
    lifeApplication: "Choose the smaller, steadier discipline that leaves the heart more content and less performative.",
    source: {
      shortMeaning: "Contentment, humility, and meditation reveal a disciplined life more truly than image or strain.",
      lifeApplication: "Keep the next repetition plain enough that humility and contentment can remain inside it.",
    },
  },
}

const SHABAD_COPY_OVERRIDES = {
  "shabad-generated-822": {
    title: "Offering everything to the One who can unite you",
    summary: "This shabad begins by giving up private bargaining and asking to be brought near to the Divine. It ends with fear losing its final authority.",
    whyItMatters: "It matters when fear feels personal and total because the shabad turns the heart from private bargaining toward union, clarity, and release from dread.",
    takeaway: "Keep returning to this turn: fear is dispelled when the heart is united with the One it was made for.",
    structure: [
      "It opens with total offering and a plain request for union with the Divine.",
      "The middle movement keeps pressing past fear and doubt instead of negotiating with them.",
      "It closes in freedom, where dread no longer gets to govern the soul.",
    ],
  },
}

const COLLECTION_COPY_OVERRIDES = {
  "collection-tired-heart-to-rest": {
    subtitle: "A slower path for the overused inner life",
    description: "Start where the heart is worn thin. Then move toward company, patient listening, and remembrance that actually gives rest.",
  },
  "collection-conduct-and-clean-speech": {
    subtitle: "A path for cleaner speech and truer living",
    description: "Keep speech and conduct tied together. Good words are not enough if the life carrying them says something else.",
  },
  "collection-control-to-release": {
    subtitle: "For the mind that grips too hard",
    description: "Begin where fear tightens the hand. Then move through Hukam, trust, and grace until action stays faithful without pretending to be absolute.",
  },
  "collection-ego-to-humility": {
    subtitle: "A path out of self-importance",
    description: "See how haumai distorts the mind. Then follow the Guru's quieter path into humility, service, and truthful speech.",
  },
  "collection-truthful-wealth": {
    subtitle: "A path out of empty gain",
    description: "Follow the profit that can travel with the soul. Let work, praise, and truthful discipline replace the hunger for impressive gain.",
  },
  "collection-restlessness-to-stillness": {
    subtitle: "For minds that move faster than they settle",
    description: "Follow the wandering mind into better company, deeper listening, and the stillness that no longer needs constant motion.",
  },
  "collection-sangat-and-belonging": {
    subtitle: "A return to company that helps the heart breathe",
    description: "Study how holy company cools isolation and teaches the heart how to belong without performing.",
  },
  "collection-mercy-and-fearlessness": {
    subtitle: "A path out of hardness and self-protection",
    description: "Move from grace into forgiveness and fearless steadiness. The path softens the heart without making it weak.",
  },
  "collection-service-and-purpose": {
    subtitle: "A practical path toward meaningful living",
    description: "Return to why life was given. Let seva, honest work, and Naam turn purpose from a mood into a way of living.",
  },
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

function buildGuidanceWindows(deepDive) {
  const lineIds = deepDive.lines.map(line => line.verseId).filter(Boolean)
  const meaningfulLineIds = deepDive.lines
    .filter(line => line.verseId && isMeaningfulExcerptText(line.translation))
    .map(line => line.verseId)
  const usableLineIds = meaningfulLineIds.length > 0 ? meaningfulLineIds : lineIds
  const midpointId = usableLineIds[Math.floor(usableLineIds.length / 2)] ?? usableLineIds[0]
  const candidates = [
    deepDive.keyVerseIds.slice(0, 1),
    deepDive.keyVerseIds.slice(0, Math.min(2, deepDive.keyVerseIds.length)),
    deepDive.keyVerseIds.length >= 2
      ? deepDive.keyVerseIds.slice(-2)
      : [usableLineIds[usableLineIds.length - 1] ?? midpointId],
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

function createLineReference(deepDive, verseIds, options = {}) {
  const referenceLines = selectReferenceLines(deepDive, verseIds)
  const shortMeaning = summarizeVerseWindow(referenceLines)
  const lifeApplication =
    options.lifeApplication
    ?? "Keep this line close enough to set the next faithful move before the old reflex retakes the room."

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
      sourceLife: `${family.actionBase} Let the line meet the ordinary room before self-judgment starts arranging it.`,
    },
    {
      key: "pressure",
      fallbackTitle: `Hold ${family.shortTitle} Under Pressure`,
      titleLine: tailLine,
      summary: `${family.shortTitle} is being answered in the middle of pressure, not after the day has calmed down.`,
      takeaway: windowMeaning,
      lifeApplication: `${family.actionBase} Use the line before the pressure chooses your tone.`,
      sourceLife: `${family.actionBase} Use the line before urgency gets to rename fear as wisdom.`,
    },
    {
      key: "return",
      fallbackTitle: `Return through ${family.shortTitle}`,
      titleLine: tailLine,
      summary: `The shabad does not leave ${family.shortTitle.toLowerCase()} at diagnosis. It turns toward return.`,
      takeaway: trimToSentence(summarizeLine(tailLine), 14),
      lifeApplication: `${family.actionBase} After the reaction, make the next return smaller and truer.`,
      sourceLife: `${family.actionBase} Let this line guide the first honest return after the reaction.`,
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
  switch (scenarioKey) {
    case "daily":
      return `${family.actionBase} Let the line meet the part of the day already in front of you.`
    case "pressure":
      return `${family.actionBase} Let the line decide the next tone before urgency does.`
    case "repair":
      return `${family.actionBase} Let the next return stay smaller and truer than the slip.`
    case "practice":
      return `${family.actionBase} Keep the line close enough to become a repeatable posture.`
    default:
      return `${family.actionBase} Let the line stay in charge of what comes next.`
  }
}

function createTopicExcerpt(deepDive, family, scenarioKey, index, explanationFactory) {
  const verseIds = pickScenarioVerseIds(deepDive, scenarioKey, index)
  const source = createLineReference(deepDive, verseIds, {
    lifeApplication: createTopicSourceLifeApplication(family, scenarioKey),
  })
  return {
    source,
    explanation: explanationFactory({ source, deepDive, index }),
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
    explanation: spec.explanation || explanationFactory({ source, deepDive, index }),
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

function createGenericScenarioCopy(family, scenarioKey) {
  switch (scenarioKey) {
    case "daily":
      return {
        title: `${family.shortTitle} in the ordinary day`,
        issueStatement: `${family.issueBase} The struggle keeps showing up in plain time, not only in dramatic moments.`,
        centralInsight: `${family.insightBase} Gurbani treats the ordinary day as a real place of return.`,
        practicalReflection: `The daily shape of life exposes whether ${family.shortTitle.toLowerCase()} is being remembered or postponed.`,
        actionPrompt: `${family.actionBase} Keep the next response small enough to survive an ordinary day.`,
        searchTerms: ["today", "daily", "ordinary day", "routine"],
      }
    case "pressure":
      return {
        title: `${family.shortTitle} when the day tightens`,
        issueStatement: `${family.issueBase} Pressure exposes what the mind reaches for first when it feels cornered.`,
        centralInsight: `${family.insightBase} Under strain, the line must interrupt panic before panic defines the moment.`,
        practicalReflection: `Pressure is revealing because it shows which voice the mind trusts when there is no time to decorate itself.`,
        actionPrompt: `${family.actionBase} Use one line before the pressure chooses your tone.`,
        searchTerms: ["pressure", "stress", "under strain", "cornered"],
      }
    case "repair":
      return {
        title: `${family.shortTitle} after the slip`,
        issueStatement: `${family.issueBase} The wound or failure has already happened, and the next task is to return truthfully instead of rehearsing despair.`,
        centralInsight: `${family.insightBase} Gurbani keeps repair close to humility, remembrance, and return instead of theatre.`,
        practicalReflection: `Repair becomes honest when the mind stops turning failure into identity and lets the next true act matter.`,
        actionPrompt: `${family.actionBase} Choose the next truthful return instead of rehearsing the failure.`,
        searchTerms: ["repair", "return", "after slipping", "start again"],
      }
    case "practice":
      return {
        title: `Learning a steadier way with ${family.shortTitle.toLowerCase()}`,
        issueStatement: `${family.issueBase} The deeper need is a form of return that can outlast novelty, urgency, and mood.`,
        centralInsight: `${family.insightBase} The teaching becomes durable when it is practiced repeatedly enough to change posture.`,
        practicalReflection: `Practice matters because the heart is always being trained by something; Gurbani asks what pattern is becoming ordinary.`,
        actionPrompt: `${family.actionBase} Repeat what you can actually keep.`,
        searchTerms: ["practice", "habit", "steady return", "formation"],
      }
      default:
        return createGenericOverviewCopy(family)
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
  const scenarioCopy = {
    ...createGenericScenarioCopy(family, scenarioKey),
    ...(override ?? {}),
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
      scenarioCopy.title.toLowerCase(),
      `${family.shortTitle.toLowerCase()} ${TOPIC_SCENARIO_LABELS[scenarioKey].toLowerCase()}`,
      ...(scenarioCopy.searchTerms ?? []),
      ...combinedScenarioTerms,
    ]),
    excerpts,
    editorial: override ? { forcedLocked: true } : null,
  }
}

function getOverviewExplanationFactory(family, overviewCopy) {
  return [
    ({ source }) => `The theme is named plainly here: ${lowerFirst(source.shortMeaning)}.`,
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
    explanationFactory: getOverviewExplanationFactory(family, overviewCopy),
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
  const shortMeaning = publicTextNeedsCleanup(reference.shortMeaning)
    ? summarizeVerseWindow(selectReferenceLines(deepDive, reference.verseIds))
    : reference.shortMeaning
  const shouldReplaceLifeApplication =
    publicTextNeedsCleanup(reference.lifeApplication)
    || /becomes more truthful when/i.test(reference.lifeApplication)
    || /let the wider window set the tone/i.test(reference.lifeApplication)

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
    takeaway: publicTextNeedsCleanup(guidance.takeaway) ? fallbackMeaning : guidance.takeaway,
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
    publicTextNeedsCleanup(excerpt.explanation)
    || excerpt.explanation.includes(excerpt.source.shortMeaning)
    || excerpt.explanation.includes(excerpt.source.lifeApplication)

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
  const overviewFactory = getOverviewExplanationFactory(family, overviewCopy)

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

function applyGuidanceCopyOverrides(guidance) {
  const override = GUIDANCE_COPY_OVERRIDES[guidance.id]
  if (!override) return guidance

  return {
    ...guidance,
    ...(override.title ? { title: override.title } : {}),
    ...(override.summary ? { summary: override.summary } : {}),
    ...(override.takeaway ? { takeaway: override.takeaway } : {}),
    ...(override.lifeApplication ? { lifeApplication: override.lifeApplication } : {}),
    source: {
      ...guidance.source,
      ...(override.source ?? {}),
    },
    editorial: {
      ...(guidance.editorial ?? {}),
      forcedLocked: true,
    },
  }
}

function applyCollectionCopyOverrides(collection) {
  const override = COLLECTION_COPY_OVERRIDES[collection.id]
  if (!override) return collection

  return {
    ...collection,
    ...override,
    editorial: {
      ...(collection.editorial ?? {}),
      forcedLocked: true,
    },
  }
}

function applyShabadCopyOverrides(shabad) {
  const override = SHABAD_COPY_OVERRIDES[shabad.id]
  if (!override) return shabad

  return {
    ...shabad,
    ...override,
    editorial: {
      ...(shabad.editorial ?? {}),
      forcedLocked: true,
    },
  }
}

function normalizePublishedCopy(dataset) {
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
  }).map(applyShabadCopyOverrides)

  const shabadById = new Map(dataset.shabadDeepDives.map(item => [item.id, item]))
  dataset.dailyGuidance = dataset.dailyGuidance
    .map(item => normalizeGuidanceItem(item, shabadById))
    .map(applyGuidanceCopyOverrides)
  dataset.topicGuides = dataset.topicGuides.map(item => normalizeTopicGuideItem(item, shabadById))
  dataset.collections = dataset.collections
    .map(item => normalizeCollectionItem(item, shabadById))
    .map(applyCollectionCopyOverrides)
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

  normalizePublishedCopy(dataset)
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

function tokenSetSimilarity(left, right) {
  const leftTokens = new Set(normalizeText(left).split(" ").filter(Boolean))
  const rightTokens = new Set(normalizeText(right).split(" ").filter(Boolean))
  const overlap = Array.from(leftTokens).filter(token => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : overlap / union
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

export async function validateDrafts(drafts = null) {
  const dataset = drafts ?? await generateDrafts()
  const hardFailures = []
  const warnings = []
  const topicUniquenessRegistry = dataset.topicUniquenessRegistry ?? await readJson(TOPIC_UNIQUENESS_PATH)

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
    addPublicTextValidation(hardFailures, `Shabad ${shabad.id} title`, shabad.title)
    addPublicTextValidation(hardFailures, `Shabad ${shabad.id} summary`, shabad.summary)
    addPublicTextValidation(hardFailures, `Shabad ${shabad.id} takeaway`, shabad.takeaway)
  }

  const guidanceKeys = new Set()
  for (const guidance of dataset.dailyGuidance) {
    const key = `${guidance.source.deepDiveId}:${guidance.source.verseIds.join(",")}:${normalizeText(guidance.takeaway)}`
    if (guidanceKeys.has(key)) {
      hardFailures.push(`Duplicate daily guidance window detected for ${guidance.id}`)
    }
    guidanceKeys.add(key)
    addPublicTextValidation(hardFailures, `Guidance ${guidance.id} title`, guidance.title)
    addPublicTextValidation(hardFailures, `Guidance ${guidance.id} takeaway`, guidance.takeaway)
    addPublicTextValidation(hardFailures, `Guidance ${guidance.id} excerpt meaning`, guidance.source.shortMeaning)
  }

  const topicFamilies = new Set()
  for (const topic of dataset.topicGuides) {
    if (topicFamilies.has(topic.rotation.theme)) {
      hardFailures.push(`Multiple canonical topics found for family ${topic.rotation.theme}`)
    }
    topicFamilies.add(topic.rotation.theme)
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
    addPublicTextValidation(hardFailures, `Topic ${topic.id} title`, topic.title)
    const shabadCount = new Set(topic.excerpts.map(excerpt => excerpt.source.deepDiveId)).size
    if (topic.excerpts.length < 3 || shabadCount < 2) {
      hardFailures.push(`Topic ${topic.id} does not have at least 3 excerpts from 2 shabads`)
    }
    for (const [excerptIndex, excerpt] of topic.excerpts.entries()) {
      addPublicTextValidation(
        hardFailures,
        `Topic ${topic.id} overview excerpt ${excerptIndex + 1} meaning`,
        excerpt.source.shortMeaning
      )
    }

    if (!topic.editorial) {
      hardFailures.push(`Topic ${topic.id} is missing editorial review`)
    } else {
      if (topic.editorial.status === "draft") {
        hardFailures.push(`Canonical topic ${topic.id} is still in draft status`)
      }
      if (topic.editorial.issues.length > 0) {
        hardFailures.push(`Canonical topic ${topic.id} still has editorial issues: ${topic.editorial.issues.join(", ")}`)
      }
      if (
        topic.editorial.scores.overall < 3.75
        || topic.editorial.scores.faithfulness < 3.7
        || topic.editorial.scores.clarity < 2.9
        || topic.editorial.scores.usefulness < 3
        || topic.editorial.scores.beauty < 3.1
      ) {
        hardFailures.push(`Canonical topic ${topic.id} did not clear editorial thresholds`)
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
      addPublicTextValidation(hardFailures, `Scenario ${topic.id}#${scenarioKey} title`, scenario.title)
      for (const [excerptIndex, excerpt] of scenario.excerpts.entries()) {
        addPublicTextValidation(
          hardFailures,
          `Scenario ${topic.id}#${scenarioKey} excerpt ${excerptIndex + 1} meaning`,
          excerpt.source.shortMeaning
        )
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
        if (scenario.editorial.status === "draft") {
          hardFailures.push(`Scenario ${topic.id}#${scenarioKey} is still in draft status`)
        }
        if (scenario.editorial.issues.length > 0) {
          hardFailures.push(`Scenario ${topic.id}#${scenarioKey} still has editorial issues: ${scenario.editorial.issues.join(", ")}`)
        }
        if (
          scenario.editorial.scores.overall < 3.75
          || scenario.editorial.scores.faithfulness < 3.7
          || scenario.editorial.scores.clarity < 2.9
          || scenario.editorial.scores.usefulness < 3
          || scenario.editorial.scores.beauty < 3.1
        ) {
          hardFailures.push(`Scenario ${topic.id}#${scenarioKey} did not clear editorial thresholds`)
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
    addPublicTextValidation(hardFailures, `Collection ${collection.id} title`, collection.title)
    addPublicTextValidation(hardFailures, `Collection ${collection.id} hero meaning`, collection.heroSource.shortMeaning)
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
      const payload = JSON.stringify(item)
      if (PLACEHOLDER_PATTERNS.some(pattern => pattern.test(payload))) {
        hardFailures.push(`${item.id} contains placeholder copy`)
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

  await fs.rm(PUBLIC_DIR, { recursive: true, force: true })
  await ensureDir(PUBLIC_DIR)
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
