import { expect, test } from "vitest"
import { loadLearnCatalog } from "../data/learnRepository"
import {
  filterShabadDeepDives,
  getLearnSavedItems,
  getLearnInventorySummary,
  getTodayLearnSurface,
  resolveTopicGuide,
} from "./learnExperience"

const baseLearnState = {
  viewedItems: [],
  savedItemIds: [],
  recentTopicIds: [],
  activeCollectionId: null,
  depthPreference: "balanced" as const,
}

test("resolves modern search synonyms to canonical approved topic guides", async () => {
  const catalog = await loadLearnCatalog()

  expect(resolveTopicGuide(catalog, "stress").topic?.id).toBe("topic-anxiety")
  expect(resolveTopicGuide(catalog, "anger").topic?.id).toBe("topic-anger")
  expect(resolveTopicGuide(catalog, "ego").topic?.id).toBe("topic-ego")
  expect(resolveTopicGuide(catalog, "loneliness").topic?.id).toBe("topic-loneliness")
  expect(resolveTopicGuide(catalog, "second guessing").topic?.id).toBe("topic-doubt")
  expect(resolveTopicGuide(catalog, "gossip").topic?.id).toBe("topic-speech")
  expect(resolveTopicGuide(catalog, "resentment").topic?.id).toBe("topic-forgiveness")
  expect(resolveTopicGuide(catalog, "micromanaging").topic?.id).toBe("topic-control")
  expect(resolveTopicGuide(catalog, "burnt out").topic?.id).toBe("topic-exhaustion")
})

test("resolves scenario language to a canonical topic plus the matching scenario", async () => {
  const catalog = await loadLearnCatalog()
  const resolution = resolveTopicGuide(catalog, "mercy under pressure")

  expect(resolution.topic?.id).toBe("topic-mercy")
  expect(resolution.scenarioKey).toBe("pressure")
  expect(resolution.matchedBy).toBe("synonym")
})

test("returns a no-match result so the UI can fall back to today's spotlight topic", async () => {
  const catalog = await loadLearnCatalog()
  const resolution = resolveTopicGuide(catalog, "tomato")

  expect(resolution.topic).toBeNull()
  expect(resolution.matchedBy).toBe("no-match")
})

test("builds a today surface with no empty slots and a stable continue-learning card", async () => {
  const catalog = await loadLearnCatalog()
  const surface = getTodayLearnSurface(catalog, "2026-04-11", baseLearnState)

  expect(surface.dailyGuidance.item.id).toBeTruthy()
  expect(surface.featuredShabad.item.id).toBeTruthy()
  expect(surface.topicSpotlight.item.id).toBeTruthy()
  expect(surface.continueLearning.title).toBeTruthy()
  expect(surface.themeRail).toHaveLength(4)
  expect(surface.featuredCollections).toHaveLength(3)
  expect(surface.exploreCollections.length).toBeGreaterThan(0)
  expect(new Set(surface.themeRail.map(topic => topic.rotation.theme)).size).toBe(surface.themeRail.length)
  expect(surface.themeRail.map(topic => topic.rotation.theme)).not.toContain(surface.topicSpotlight.item.rotation.theme)
})

test("changes the featured shabad on a three-day cadence", async () => {
  const catalog = await loadLearnCatalog()
  const first = getTodayLearnSurface(catalog, "2026-04-11", baseLearnState)
  const second = getTodayLearnSurface(catalog, "2026-04-14", baseLearnState)

  expect(first.featuredShabad.item.id).not.toBe(second.featuredShabad.item.id)
})

test("keeps the same topic spotlight after saving an unrelated item on the same day", async () => {
  const catalog = await loadLearnCatalog()
  const first = getTodayLearnSurface(catalog, "2026-04-11", baseLearnState)
  const second = getTodayLearnSurface(catalog, "2026-04-11", {
    ...baseLearnState,
    savedItemIds: ["guidance-seva-without-advertising"],
  })

  expect(first.topicSpotlight.item.id).toBe(second.topicSpotlight.item.id)
})

test("filters shabads by theme and saved state", async () => {
  const catalog = await loadLearnCatalog()
  const filtered = filterShabadDeepDives(
    catalog,
    { theme: "seva", savedOnly: true },
    {
      ...baseLearnState,
      savedItemIds: ["shabad-selfless-service"],
    }
  )

  expect(filtered.map(item => item.id)).toEqual(["shabad-selfless-service"])
})

test("reorders shabads to favor deep study when the depth preference is deep", async () => {
  const catalog = await loadLearnCatalog()
  const filtered = filterShabadDeepDives(
    catalog,
    {},
    {
      ...baseLearnState,
      depthPreference: "deep",
    }
  )

  expect(filtered[0]?.id).toBe("shabad-detached-and-steady")
  expect(filtered[0]?.difficulty).toBe("deep")
})

test("ignores saved learn ids that no longer exist in the content library", async () => {
  const catalog = await loadLearnCatalog()
  expect(getLearnSavedItems(catalog, ["nonexistent-id"])).toEqual([])
})

test("reports the current inventory as above launch readiness", async () => {
  const catalog = await loadLearnCatalog()
  const summary = getLearnInventorySummary(catalog)

  expect(summary.dailyGuidance).toBeGreaterThanOrEqual(240)
  expect(summary.shabadDeepDives).toBeGreaterThanOrEqual(100)
  expect(summary.topicGuides).toBeGreaterThanOrEqual(28)
  expect(summary.topicScenarios).toBeGreaterThanOrEqual(112)
  expect(summary.collections).toBeGreaterThanOrEqual(100)
  expect(summary.crossLinks).toBeGreaterThanOrEqual(500)
  expect(summary.readyForLaunch).toBe(true)
})
