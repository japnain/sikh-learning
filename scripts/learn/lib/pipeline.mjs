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

function createTopicExcerpt(deepDive, scenarioKey, index, explanationFactory) {
  const verseIds = pickScenarioVerseIds(deepDive, scenarioKey, index)
  const source = createLineReference(deepDive, verseIds)
  return {
    source,
    explanation: explanationFactory({ source, deepDive, index }),
  }
}

function getScenarioExplanationFactory(family, scenarioKey) {
  const factories = {
    daily: [
      ({ source }) => `The ordinary day is not spiritually empty here: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `The line lands in plain time rather than special conditions. ${source.lifeApplication}`,
      ({ source }) => `Daily faithfulness becomes visible when ${lowerFirst(source.shortMeaning)}.`,
    ],
    pressure: [
      ({ source }) => `Pressure is named without surrendering the heart to it: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `The line interrupts panic with a truer next movement. ${source.lifeApplication}`,
      ({ source }) => `This excerpt is useful when urgency tries to become your theology.`,
    ],
    repair: [
      ({ source }) => `Return stays possible even after the slip: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `The Guru does not leave repair at remorse alone. ${source.lifeApplication}`,
      ({ source }) => `This excerpt keeps truth and return close enough to move together.`,
    ],
    practice: [
      ({ source }) => `The line is teaching repetition, not merely inspiration: ${lowerFirst(source.shortMeaning)}.`,
      ({ source }) => `Durable practice appears when the teaching can be kept on an ordinary week. ${source.lifeApplication}`,
      ({ source }) => `This excerpt matters because it trains posture, not only agreement.`,
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
        title: `Building a truer practice of ${family.shortTitle.toLowerCase()}`,
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

function buildTopicScenario(family, scenarioKey, candidateShabads, override = null) {
  const scenarioCopy = {
    ...createGenericScenarioCopy(family, scenarioKey),
    ...(override ?? {}),
  }
  const combinedScenarioTerms = (scenarioCopy.searchTerms ?? []).flatMap(term => ([
    `${family.shortTitle.toLowerCase()} ${term.toLowerCase()}`,
    `${family.key} ${term.toLowerCase()}`,
  ]))
  const explanationFactory = getScenarioExplanationFactory(family, scenarioKey)
  const excerpts = candidateShabads.slice(0, 3).map((deepDive, index) => (
    createTopicExcerpt(deepDive, scenarioKey, index, explanationFactory[index % explanationFactory.length])
  ))

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

function buildCanonicalTopicGuide({
  family,
  canonicalSeed,
  candidateShabads,
  scenarioShabadSets,
}) {
  const goldSet = TOPIC_GOLD_SET[family.key] ?? null
  const overviewCopy = {
    ...(canonicalSeed ?? createGenericOverviewCopy(family)),
    ...(goldSet?.overview ?? {}),
  }
  const overviewExcerpts = candidateShabads.slice(0, 3).map((deepDive, index) => (
    createTopicExcerpt(
      deepDive,
      "daily",
      index,
      [
        ({ source }) => `The theme is named without abstraction here: ${lowerFirst(source.shortMeaning)}.`,
        ({ source }) => `The shabad widens the issue beyond mood alone. ${source.lifeApplication}`,
        () => `${overviewCopy.centralInsight} The point is not to isolate advice from Gurbani, but to keep the line in charge of the page.`,
      ][index]
    )
  ))

  const scenarios = Object.fromEntries(
    TOPIC_SCENARIO_KEYS.map((scenarioKey) => ([
      scenarioKey,
      buildTopicScenario(
        family,
        scenarioKey,
        scenarioShabadSets[scenarioKey],
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
  }

  const guidanceKeys = new Set()
  for (const guidance of dataset.dailyGuidance) {
    const key = `${guidance.source.deepDiveId}:${guidance.source.verseIds.join(",")}:${normalizeText(guidance.takeaway)}`
    if (guidanceKeys.has(key)) {
      hardFailures.push(`Duplicate daily guidance window detected for ${guidance.id}`)
    }
    guidanceKeys.add(key)
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
    const shabadCount = new Set(topic.excerpts.map(excerpt => excerpt.source.deepDiveId)).size
    if (topic.excerpts.length < 3 || shabadCount < 2) {
      hardFailures.push(`Topic ${topic.id} does not have at least 3 excerpts from 2 shabads`)
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
