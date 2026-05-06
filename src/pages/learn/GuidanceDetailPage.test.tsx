import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { loadLearnCatalog } from "../../data/learnRepository"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./testUtils"
import { getTodayLearnSurface, resolveLineReference } from "../../utils/learnExperience"

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("guidance detail links onward to the related shabad route", async () => {
  const catalog = await loadLearnCatalog()
  const guidance = catalog.dailyGuidanceById["guidance-hukam"]

  renderLearnRoute("/learn/guidance/guidance-hukam?from=today")

  expect(await screen.findByRole("heading", { level: 1, name: new RegExp(guidance.title, "i") })).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /Open the full shabad/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      `/learn/shabads/${guidance.relatedShabadIds[0]}?from=today`
    )
  })
})

test("guidance detail reflects saved context in its local navigation", async () => {
  renderLearnRoute("/learn/guidance/guidance-hukam?from=saved")

  expect(await screen.findByRole("button", { name: /Back to Saved/i })).toBeInTheDocument()
  expect(screen.getByRole("navigation", { name: /Saved detail navigation/i })).toBeInTheDocument()
})

test("guidance detail surfaces inline shabad depth for the related passage", async () => {
  const catalog = await loadLearnCatalog()
  const guidance = catalog.dailyGuidanceById["guidance-sweet-speech-humble-walk"]
  const excerpt = resolveLineReference(catalog, guidance.source)

  renderLearnRoute("/learn/guidance/guidance-sweet-speech-humble-walk?from=today")

  expect(await screen.findByRole("heading", { level: 1, name: new RegExp(guidance.title, "i") })).toBeInTheDocument()
  expect(screen.getByTestId("page-learn-detail")).toHaveClass("learn-detail-room-shell")
  expect(screen.getByTestId("learn-detail-hero")).toHaveClass("learn-detail-hero")
  expect(screen.getByTestId("learn-detail-rail").parentElement).toHaveClass("learn-detail-rail-wrap")
  expect(document.getElementById("learn-detail-guidance-excerpt")).toHaveClass("learn-detail-section", "learn-detail-source-card")
  expect(screen.getByRole("heading", { level: 2, name: new RegExp(excerpt.deepDive.title, "i") })).toBeInTheDocument()
  expect(screen.getByText(excerpt.deepDive.whyItMatters)).toBeInTheDocument()
  expect(screen.getByText(excerpt.deepDive.structure[0]!)).toBeInTheDocument()
  expect(screen.getByText(/Deeper Meaning/i)).toBeInTheDocument()
  expect(screen.getByText(/Live This/i)).toBeInTheDocument()
  expect(excerpt.lines.length).toBeGreaterThanOrEqual(2)
})

test("collection-linked guidance back button returns to the collection overview instead of prior step history", async () => {
  const catalog = await loadLearnCatalog()
  const collection = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState()).featuredCollections[0]!
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

  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`Back to ${collection.title}`, "i") }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      `/learn/collections/${collection.id}`
    )
  })
})
