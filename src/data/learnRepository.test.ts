import { beforeEach, expect, test } from "vitest"
import {
  loadLearnCatalog,
  loadLearnDetail,
  loadLearnSearchIndex,
  resetLearnRepositoryCache,
} from "./learnRepository"

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
