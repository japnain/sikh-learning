import { expect, test } from "vitest"
import {
  filterShabadDeepDives,
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

test("resolves modern search synonyms to canonical approved topic guides", () => {
  expect(resolveTopicGuide("stress").topic?.id).toBe("topic-anxiety")
  expect(resolveTopicGuide("anger").topic?.id).toBe("topic-anger")
  expect(resolveTopicGuide("ego").topic?.id).toBe("topic-ego")
  expect(resolveTopicGuide("loneliness").topic?.id).toBe("topic-loneliness")
})

test("builds a today surface with no empty slots and a stable continue-learning card", () => {
  const surface = getTodayLearnSurface("2026-04-11", baseLearnState)

  expect(surface.dailyGuidance.item.id).toBeTruthy()
  expect(surface.featuredShabad.item.id).toBeTruthy()
  expect(surface.topicSpotlight.item.id).toBeTruthy()
  expect(surface.continueLearning.title).toBeTruthy()
  expect(surface.exploreCollections.length).toBeGreaterThan(0)
})

test("changes the featured shabad on a three-day cadence", () => {
  const first = getTodayLearnSurface("2026-04-11", baseLearnState)
  const second = getTodayLearnSurface("2026-04-14", baseLearnState)

  expect(first.featuredShabad.item.id).not.toBe(second.featuredShabad.item.id)
})

test("keeps the same topic spotlight after saving an unrelated item on the same day", () => {
  const first = getTodayLearnSurface("2026-04-11", baseLearnState)
  const second = getTodayLearnSurface("2026-04-11", {
    ...baseLearnState,
    savedItemIds: ["guidance-seva-without-advertising"],
  })

  expect(first.topicSpotlight.item.id).toBe(second.topicSpotlight.item.id)
})

test("filters shabads by theme and saved state", () => {
  const filtered = filterShabadDeepDives(
    { theme: "seva", savedOnly: true },
    {
      ...baseLearnState,
      savedItemIds: ["shabad-selfless-service"],
    }
  )

  expect(filtered.map(item => item.id)).toEqual(["shabad-selfless-service"])
})

test("reports the current inventory as below paid-launch readiness", () => {
  const summary = getLearnInventorySummary()

  expect(summary.dailyGuidance).toBeGreaterThan(0)
  expect(summary.shabadDeepDives).toBeGreaterThan(0)
  expect(summary.topicGuides).toBeGreaterThan(0)
  expect(summary.readyForLaunch).toBe(false)
})
