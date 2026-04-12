import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { loadLearnCatalog } from "../../data/learnRepository"
import { getTodayLearnSurface } from "../../utils/learnExperience"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./testUtils"

function getCollectionStepTitle(catalog: Awaited<ReturnType<typeof loadLearnCatalog>>, kind: "daily-guidance" | "topic-guide" | "shabad-deep-dive", id: string) {
  if (kind === "daily-guidance") return catalog.dailyGuidanceById[id]?.title
  if (kind === "topic-guide") return catalog.topicGuideById[id]?.title
  return catalog.shabadDeepDiveById[id]?.title
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("collection detail shows ordered journey progress and continues into the first step", async () => {
  const catalog = await loadLearnCatalog()
  const collection = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState()).featuredCollections[0]!
  const firstItem = collection.items[0]!
  const firstTitle = getCollectionStepTitle(catalog, firstItem.kind, firstItem.id)

  renderLearnRoute(`/learn/collections/${collection.id}?from=today`)

  expect(await screen.findByRole("heading", { level: 1, name: new RegExp(collection.title, "i") })).toBeInTheDocument()
  expect(screen.getByText(new RegExp(`0 of ${collection.items.length} completed`, "i"))).toBeInTheDocument()
  expect(screen.getByText(new RegExp(firstTitle ?? "", "i"))).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /Continue this journey/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      `/learn/${firstItem.kind === "daily-guidance" ? "guidance" : firstItem.kind === "topic-guide" ? "topics" : "shabads"}/${firstItem.id}?from=collection-${collection.id}`
    )
  })
})

test("collection-linked detail pages show the step footer with next navigation", async () => {
  const catalog = await loadLearnCatalog()
  const collection = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState()).featuredCollections[0]!
  const firstItem = collection.items[0]!

  renderLearnRoute(
    `/learn/${firstItem.kind === "daily-guidance" ? "guidance" : firstItem.kind === "topic-guide" ? "topics" : "shabads"}/${firstItem.id}?from=collection-${collection.id}`
  )

  expect(await screen.findByTestId("learn-collection-step-footer")).toBeInTheDocument()
  expect(screen.getByText(new RegExp(`Step 1 of ${collection.items.length} in ${collection.title}`, "i"))).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Next/i })).toBeInTheDocument()
})
