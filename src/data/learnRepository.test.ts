import fs from "node:fs"
import path from "node:path"
import { beforeEach, expect, test } from "vitest"
import {
  configureLearnRepositoryLoader,
  loadLearnCatalog,
  loadLearnDetail,
  loadLearnHomeCatalog,
  loadLearnSearchIndex,
  resetLearnRepositoryCache,
} from "./learnRepository"

const LOW_SCORING_TOPIC_SCENARIOS = [
  ["topic-purpose", "pressure"],
  ["topic-speech", "pressure"],
  ["topic-softness", "pressure"],
  ["topic-softness", "repair"],
  ["topic-sangat", "pressure"],
  ["topic-shame", "practice"],
  ["topic-conduct", "pressure"],
  ["topic-sangat", "repair"],
  ["topic-self-worth", "practice"],
  ["topic-shame", "pressure"],
  ["topic-anger", "pressure"],
  ["topic-purpose", "repair"],
  ["topic-speech", "practice"],
  ["topic-control", "pressure"],
  ["topic-comparison", "pressure"],
  ["topic-sangat", "daily"],
  ["topic-self-worth", "pressure"],
  ["topic-softness", "practice"],
  ["topic-comparison", "repair"],
  ["topic-shame", "daily"],
  ["topic-fear", "pressure"],
  ["topic-conduct", "repair"],
  ["topic-anger", "daily"],
  ["topic-control", "daily"],
] as const

const GENERIC_SCENARIO_PHRASES = [
  "The ordinary day is where the heart learns whether it will keep returning or keep drifting.",
  "Pressure reveals what the heart trusts first. That is why this moment needs remembrance more than speed.",
  "Repair is not self-theatre. It is the quiet refusal to let failure become your permanent story.",
  "A kept rule is gentler than a burst of intensity and usually more transformative.",
]

const GENERATED_LEARN_COPY_PATTERNS = [
  /\bfeels trying to feel\b/i,
  /\bthis is for anyone who feels\b/i,
  /\blet this stay with you:/i,
  /\bhold onto this:/i,
  /\bcarry this with you:/i,
  /\bquestion appetite avoids\b/i,
  /\bprofit that can follow you\b/i,
]

const FORMULAIC_SHABAD_STRUCTURE_PATTERN = /^(First|Then|Finally), it\b/i

const ORDINAL_MEHLA_PATTERN = "(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)"
const HEADING_ONLY_PATTERN = new RegExp(
  `^\\s*(?:raag\\s+)?[a-z][a-z' -]+,\\s*${ORDINAL_MEHLA_PATTERN}\\s+mehla:?\\s*$`,
  "i"
)
const STRUCTURAL_PREFIX_PATTERN = /^\s*[^;:]*\b(?:mehla|mahala|vaar|var|shalok|shaloks|slok|salok|pauree|pauri|rahaau|rahau|rahao|chaupade|ashtpadee|ashtapadee|ghar)\b[^;:]*:\s*/i
const SHORT_TITLE_COLON_PATTERN = /^[A-Z][A-Za-z'’ -]+:\s*$/

function hasStructuralHeadingLeak(value: string) {
  const cleaned = value.trim()
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length

  return (
    !cleaned
    || HEADING_ONLY_PATTERN.test(cleaned)
    || STRUCTURAL_PREFIX_PATTERN.test(cleaned)
    || (SHORT_TITLE_COLON_PATTERN.test(cleaned) && wordCount <= 6)
  )
}

const PROJECT_ROOT = process.cwd()

function readPublicLearnJson(resourcePath: string) {
  const normalizedPath = resourcePath.startsWith('/')
    ? resourcePath.slice(1)
    : resourcePath
  const filePath = path.join(PROJECT_ROOT, 'public', normalizedPath.replace(/^data\/learn\//, 'data/learn/'))
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

beforeEach(() => {
  resetLearnRepositoryCache()
})

test("loads canonical topic guides with nested scenarios", async () => {
  const catalog = await loadLearnCatalog()
  const mercyTopics = catalog.topicGuides.filter(topic => topic.rotation.theme === "mercy")

  expect(mercyTopics).toHaveLength(1)
  expect(mercyTopics[0]?.id).toBe("topic-mercy")
  expect(mercyTopics[0]?.scenarioOrder).toEqual(["daily", "pressure", "repair", "practice"])
  expect(mercyTopics[0]?.scenarios.pressure.title).toMatch(/mercy/i)
})

test("search index keeps legacy topic ids as aliases to canonical topics and scenarios", async () => {
  const searchIndex = await loadLearnSearchIndex()

  expect(searchIndex.legacyTopicAliases["topic-mercy-pressure"]).toEqual({
    topicId: "topic-mercy",
    scenarioKey: "pressure",
  })
})

test("home catalog summary omits the search index and still exposes lookup maps", async () => {
  const catalog = await loadLearnHomeCatalog()

  expect(catalog.dailyGuidance.length).toBeGreaterThan(0)
  expect(catalog.shabadDeepDives.length).toBeGreaterThan(0)
  expect(catalog.topicGuides.length).toBeGreaterThan(0)
  expect(catalog.collections.length).toBeGreaterThan(0)
  expect(catalog.dailyGuidanceById[catalog.dailyGuidance[0]!.id]).toEqual(catalog.dailyGuidance[0])
  expect(catalog.shabadDeepDiveById[catalog.shabadDeepDives[0]!.id]).toEqual(catalog.shabadDeepDives[0])
  expect(catalog.topicGuideById[catalog.topicGuides[0]!.id]).toEqual(catalog.topicGuides[0])
  expect(catalog.collectionById[catalog.collections[0]!.id]).toEqual(catalog.collections[0])
})

test("home catalog falls back to the full learn archive when the summary payload is malformed", async () => {
  configureLearnRepositoryLoader(async (resourcePath) => {
    if (resourcePath === '/data/learn/home-summary.json') {
      throw new Error('Learn repository returned malformed JSON for /data/learn/home-summary.json: Unexpected token < in JSON')
    }
    return readPublicLearnJson(resourcePath)
  })

  resetLearnRepositoryCache()

  const homeCatalog = await loadLearnHomeCatalog()

  expect(homeCatalog.dailyGuidance.length).toBeGreaterThan(0)
  expect(homeCatalog.shabadDeepDives.length).toBeGreaterThan(0)
})

test("topic detail payloads stay canonical and expose scenario content", async () => {
  const topic = await loadLearnDetail("topic-guide", "topic-mercy")

  expect(topic).not.toBeNull()
  expect(topic?.title).toMatch(/mercy/i)
  expect(topic?.scenarios.practice.actionPrompt).toBeTruthy()
})

test("published learn catalog does not leak structural heading text into public copy", async () => {
  const catalog = await loadLearnCatalog()

  for (const shabad of catalog.shabadDeepDives) {
    expect(hasStructuralHeadingLeak(shabad.title)).toBe(false)
    expect(hasStructuralHeadingLeak(shabad.summary)).toBe(false)
    expect(hasStructuralHeadingLeak(shabad.takeaway)).toBe(false)
  }

  for (const guidance of catalog.dailyGuidance) {
    expect(hasStructuralHeadingLeak(guidance.title)).toBe(false)
    expect(hasStructuralHeadingLeak(guidance.takeaway)).toBe(false)
    expect(hasStructuralHeadingLeak(guidance.source.shortMeaning)).toBe(false)
  }

  for (const topic of catalog.topicGuides) {
    expect(hasStructuralHeadingLeak(topic.title)).toBe(false)

    for (const excerpt of topic.excerpts) {
      expect(hasStructuralHeadingLeak(excerpt.source.shortMeaning)).toBe(false)
    }

    for (const scenarioKey of topic.scenarioOrder) {
      const scenario = topic.scenarios[scenarioKey]
      expect(hasStructuralHeadingLeak(scenario.title)).toBe(false)

      for (const excerpt of scenario.excerpts) {
        expect(hasStructuralHeadingLeak(excerpt.source.shortMeaning)).toBe(false)
      }
    }
  }

  for (const collection of catalog.collections) {
    expect(hasStructuralHeadingLeak(collection.title)).toBe(false)
    expect(hasStructuralHeadingLeak(collection.heroSource.shortMeaning)).toBe(false)
  }
})

test("published learn collections only reference valid topic ids", async () => {
  const catalog = await loadLearnCatalog()
  const topicIds = new Set(catalog.topicGuides.map(topic => topic.id))

  for (const collection of catalog.collections) {
    for (const topicId of collection.relatedTopicIds) {
      expect(topicId).toMatch(/^topic-/)
      expect(topicIds.has(topicId)).toBe(true)
    }
  }
})

test("low-scoring topic scenarios are manually reviewed before they remain in the archive", async () => {
  for (const [topicId, scenarioKey] of LOW_SCORING_TOPIC_SCENARIOS) {
    const topic = await loadLearnDetail("topic-guide", topicId)
    expect(topic).not.toBeNull()
    expect(topic?.scenarios?.[scenarioKey]?.editorial?.reviewedByHuman).toBe(true)
  }
})

test("priority topic scenarios do not keep the old generic template lines", async () => {
  const topicIds = Array.from(new Set(LOW_SCORING_TOPIC_SCENARIOS.map(([topicId]) => topicId)))

  for (const topicId of topicIds) {
    const topic = await loadLearnDetail("topic-guide", topicId)
    expect(topic).not.toBeNull()

    for (const scenarioKey of topic!.scenarioOrder) {
      const scenario = topic!.scenarios[scenarioKey]
      for (const phrase of GENERIC_SCENARIO_PHRASES) {
        expect(scenario.issueStatement).not.toContain(phrase)
        expect(scenario.centralInsight).not.toContain(phrase)
        expect(scenario.practicalReflection).not.toContain(phrase)
      }
    }
  }
})

test("published daily guidance summaries are distinct and avoid repeated exhortation scaffolds", async () => {
  const catalog = await loadLearnCatalog()
  const seenSummaries = new Map<string, string>()
  const repeatedSummaryPhrases = [
    "keep this close",
    "let this stay with you",
    "hold onto this",
    "carry this with you",
    "do not let the day outrun this",
  ]

  for (const guidance of catalog.dailyGuidance) {
    const normalizedSummary = guidance.summary.trim().toLowerCase()
    expect(seenSummaries.has(normalizedSummary)).toBe(false)
    seenSummaries.set(normalizedSummary, guidance.id)

    for (const phrase of repeatedSummaryPhrases) {
      expect(normalizedSummary).not.toContain(phrase)
    }
  }
})

test("published learn copy avoids generated scaffolding that does not survive human reading", async () => {
  const catalog = await loadLearnCatalog()

  for (const shabad of catalog.shabadDeepDives) {
    const shabadCopy = [
      shabad.title,
      shabad.summary,
      shabad.whyItMatters,
      shabad.takeaway,
      ...(shabad.structure ?? []),
    ].join("\n")

    for (const pattern of GENERATED_LEARN_COPY_PATTERNS) {
      expect(shabadCopy).not.toMatch(pattern)
    }

    for (const movement of shabad.structure ?? []) {
      expect(movement).not.toMatch(FORMULAIC_SHABAD_STRUCTURE_PATTERN)
    }
  }

  for (const guidance of catalog.dailyGuidance) {
    const guidanceCopy = [guidance.title, guidance.summary, guidance.takeaway].join("\n")

    for (const pattern of GENERATED_LEARN_COPY_PATTERNS) {
      expect(guidanceCopy).not.toMatch(pattern)
    }
  }
})

test("published learn catalog no longer uses generated ids for canonical guidance or shabads", async () => {
  const catalog = await loadLearnCatalog()

  for (const guidance of catalog.dailyGuidance) {
    expect(guidance.id).not.toContain("generated-")
  }

  for (const shabad of catalog.shabadDeepDives) {
    expect(shabad.id).not.toContain("generated-")
  }
})

test("learn excerpt surfaces use multi-verse references instead of one-line fragments", async () => {
  const catalog = await loadLearnCatalog()

  for (const guidance of catalog.dailyGuidance) {
    expect(guidance.source.verseIds.length).toBeGreaterThanOrEqual(2)
  }

  for (const topic of catalog.topicGuides) {
    for (const excerpt of topic.excerpts) {
      expect(excerpt.source.verseIds.length).toBeGreaterThanOrEqual(2)
    }

    for (const scenarioKey of topic.scenarioOrder) {
      for (const excerpt of topic.scenarios[scenarioKey].excerpts) {
        expect(excerpt.source.verseIds.length).toBeGreaterThanOrEqual(2)
      }
    }
  }

  for (const collection of catalog.collections) {
    expect(collection.heroSource.verseIds.length).toBeGreaterThanOrEqual(2)
  }
})

test("legacy generated learn ids still resolve through catalog indexes", async () => {
  const catalog = await loadLearnCatalog()

  expect(catalog.dailyGuidanceById["guidance-generated-178-1"]?.id).toBeTruthy()
  expect(catalog.dailyGuidanceById["guidance-generated-178-1"]?.id).not.toBe("guidance-generated-178-1")
  expect(catalog.shabadDeepDiveById["shabad-generated-818"]?.id).toBeTruthy()
  expect(catalog.shabadDeepDiveById["shabad-generated-818"]?.id).not.toBe("shabad-generated-818")
})
