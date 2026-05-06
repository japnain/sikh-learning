import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { loadLearnCatalog } from "../../data/learnRepository"
import { renderLearnRoute, resetLearnTestState } from "./testUtils"

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("shabad detail renders its sections on a dedicated page", async () => {
  const catalog = await loadLearnCatalog()
  const shabad = catalog.shabadDeepDiveById["shabad-hukam-inside-everything"]

  renderLearnRoute("/learn/shabads/shabad-hukam-inside-everything?from=shabads")

  expect(await screen.findByRole("heading", { level: 1, name: new RegExp(shabad.title, "i") })).toBeInTheDocument()
  expect(screen.getByTestId("learn-detail-rail")).toBeInTheDocument()
  expect(screen.getByTestId("learn-detail-rail").parentElement).toHaveClass("learn-detail-rail-wrap")
  expect(screen.getByText(/Why It Matters/i)).toBeInTheDocument()
  expect(screen.getByTestId("shabads-shabad-structure")).toBeInTheDocument()
  expect(document.getElementById("learn-detail-shabad-lines")).toHaveClass("learn-detail-section", "learn-detail-source-card")
  expect(document.getElementById("learn-detail-shabad-structure")).toHaveClass("learn-detail-section")
})

test("shabad detail back button falls back to the shabads hub on direct entry", async () => {
  renderLearnRoute("/learn/shabads/shabad-hukam-inside-everything?from=shabads")

  fireEvent.click(await screen.findByRole("button", { name: /Back to Shabads/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn?tab=shabads")
  })
})
