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
  expect(resolveTopicGuide("second guessing").topic?.id).toBe("topic-doubt")
  expect(resolveTopicGuide("gossip").topic?.id).toBe("topic-speech")
  expect(resolveTopicGuide("resentment").topic?.id).toBe("topic-forgiveness")
  expect(resolveTopicGuide("micromanaging").topic?.id).toBe("topic-control")
  expect(resolveTopicGuide("burnt out").topic?.id).toBe("topic-exhaustion")
})

test("builds a today surface with no empty slots and a stable continue-learning card", () => {
  const surface = getTodayLearnSurface("2026-04-11", baseLearnState)

  expect(surface.dailyGuidance.item.id).toBeTruthy()
  expect(surface.featuredShabad.item.id).toBeTruthy()
  expect(surface.topicSpotlight.item.id).toBeTruthy()
  expect(surface.continueLearning.title).toBeTruthy()
  expect(surface.themeRail).toHaveLength(4)
  expect(surface.featuredCollections).toHaveLength(3)
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

  expect(summary.dailyGuidance).toBeGreaterThanOrEqual(48)
  expect(summary.shabadDeepDives).toBeGreaterThanOrEqual(24)
  expect(summary.topicGuides).toBeGreaterThanOrEqual(28)
  expect(summary.collections).toBeGreaterThanOrEqual(14)
  expect(summary.crossLinks).toBeGreaterThanOrEqual(700)
  expect(summary.readyForLaunch).toBe(false)
})
