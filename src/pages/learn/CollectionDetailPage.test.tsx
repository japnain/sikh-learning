import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { loadLearnCatalog } from "../../data/learnRepository"
import type { CollectionItemReference } from "../../types"
import { getTodayLearnSurface } from "../../utils/learnExperience"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./testUtils"

function getCollectionStepTitle(
  catalog: Awaited<ReturnType<typeof loadLearnCatalog>>,
  item: CollectionItemReference
) {
  const { kind, id } = item
  if (kind === "daily-guidance") return catalog.dailyGuidanceById[id]?.title
  if (kind === "topic-guide") {
    const topic = catalog.topicGuideById[id]
    return item.scenarioKey ? topic?.scenarios[item.scenarioKey]?.title : topic?.title
  }
  return catalog.shabadDeepDiveById[id]?.title
}

function buildCollectionStepPath(collectionId: string, item: CollectionItemReference) {
  const basePath = `/learn/${item.kind === "daily-guidance" ? "guidance" : item.kind === "topic-guide" ? "topics" : "shabads"}/${item.id}?from=collection-${collectionId}`
  if (item.kind === "topic-guide" && item.scenarioKey) {
    return `${basePath}&scenario=${item.scenarioKey}`
  }
  return basePath
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
  const firstTitle = getCollectionStepTitle(catalog, firstItem)

  renderLearnRoute(`/learn/collections/${collection.id}?from=today`)

  expect(await screen.findByRole("heading", { level: 1, name: new RegExp(collection.title, "i") })).toBeInTheDocument()
  expect(screen.getByText(new RegExp(`0 of ${collection.items.length} completed`, "i"))).toBeInTheDocument()
  expect(screen.getByText(new RegExp(firstTitle ?? "", "i"))).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /Continue this journey/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent(buildCollectionStepPath(collection.id, firstItem))
  })
})

test("collection-linked detail pages show the step footer with next navigation", async () => {
  const catalog = await loadLearnCatalog()
  const collection = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState()).featuredCollections[0]!
  const firstItem = collection.items[0]!

  renderLearnRoute(buildCollectionStepPath(collection.id, firstItem))

  expect(await screen.findByTestId("learn-collection-step-footer")).toBeInTheDocument()
  expect(screen.getByText(new RegExp(`Step 1 of ${collection.items.length} in ${collection.title}`, "i"))).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Next/i })).toBeInTheDocument()
})
