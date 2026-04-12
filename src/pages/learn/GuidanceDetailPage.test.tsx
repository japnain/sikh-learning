import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { DAILY_GUIDANCE_BY_ID } from "../../data/learnContent"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./testUtils"
import { getTodayLearnSurface } from "../../utils/learnExperience"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("guidance detail links onward to the related shabad route", () => {
  const guidance = DAILY_GUIDANCE_BY_ID["guidance-hukam"]

  renderLearnRoute("/learn/guidance/guidance-hukam?from=today")

  expect(screen.getByRole("heading", { level: 1, name: new RegExp(guidance.title, "i") })).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /Open the full shabad/i }))

  expect(screen.getByTestId("location-display")).toHaveTextContent(
    `/learn/shabads/${guidance.relatedShabadIds[0]}?from=today`
  )
})

test("guidance detail reflects saved context in its local navigation", () => {
  renderLearnRoute("/learn/guidance/guidance-hukam?from=saved")

  expect(screen.getByRole("button", { name: /Back to Saved/i })).toBeInTheDocument()
  expect(screen.getByRole("navigation", { name: /Saved detail navigation/i })).toBeInTheDocument()
})

test("collection-linked guidance back button returns to the collection overview instead of prior step history", () => {
  const collection = getTodayLearnSurface("2026-04-11", createDefaultLearnState()).featuredCollections[0]!
  const guidanceItems = collection.items.filter(item => item.kind === "daily-guidance")
  const firstItem = guidanceItems[0]!
  const secondItem = guidanceItems[1]!

  renderLearnRoute(
    `/learn/guidance/${secondItem.id}?from=collection-${collection.id}`,
    {
      initialEntries: [
        `/learn/collections/${collection.id}?from=today`,
        `/learn/guidance/${firstItem.id}?from=collection-${collection.id}`,
        `/learn/guidance/${secondItem.id}?from=collection-${collection.id}`,
      ],
      initialIndex: 2,
    }
  )

  fireEvent.click(screen.getByRole("button", { name: new RegExp(`Back to ${collection.title}`, "i") }))

  expect(screen.getByTestId("location-display")).toHaveTextContent(
    `/learn/collections/${collection.id}`
  )
})
