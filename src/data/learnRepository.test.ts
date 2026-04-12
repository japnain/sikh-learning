import { beforeEach, expect, test } from "vitest"
import {
  loadLearnCatalog,
  loadLearnDetail,
  loadLearnSearchIndex,
  resetLearnRepositoryCache,
} from "./learnRepository"

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
