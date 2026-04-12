import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { SHABAD_DEEP_DIVE_BY_ID } from "../../data/learnContent"
import { renderLearnRoute, resetLearnTestState } from "./testUtils"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("shabad detail renders its sections on a dedicated page", () => {
  const shabad = SHABAD_DEEP_DIVE_BY_ID["shabad-hukam-inside-everything"]

  renderLearnRoute("/learn/shabads/shabad-hukam-inside-everything?from=shabads")

  expect(screen.getByRole("heading", { level: 1, name: new RegExp(shabad.title, "i") })).toBeInTheDocument()
  expect(screen.getByTestId("learn-detail-rail")).toBeInTheDocument()
  expect(screen.getByText(/Why It Matters/i)).toBeInTheDocument()
  expect(screen.getByTestId("shabads-shabad-structure")).toBeInTheDocument()
  expect(document.getElementById("learn-detail-shabad-structure")).toBeInTheDocument()
})

test("shabad detail back button falls back to the shabads hub on direct entry", () => {
  renderLearnRoute("/learn/shabads/shabad-hukam-inside-everything?from=shabads")

  fireEvent.click(screen.getByRole("button", { name: /Back to Shabads/i }))

  expect(screen.getByTestId("location-display")).toHaveTextContent("/learn?tab=shabads")
})
