import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
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

test("topic detail renders its own sticky rail and scrolls within the page", () => {
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView")

  renderLearnRoute("/learn/topics/topic-anxiety?from=topics")

  expect(screen.getByRole("heading", { level: 1, name: /When the mind is anxious/i })).toBeInTheDocument()
  expect(screen.getByTestId("learn-detail-rail")).toBeInTheDocument()
  expect(screen.getByTestId("topics-topic-action")).toBeInTheDocument()

  fireEvent.click(screen.getByTestId("topics-topic-action"))

  expect(scrollIntoView).toHaveBeenCalled()
  expect(document.getElementById("learn-detail-topic-action")).toBeInTheDocument()
})

test("topic detail back button falls back to the topics hub on direct entry", () => {
  renderLearnRoute("/learn/topics/topic-anxiety?from=topics")

  fireEvent.click(screen.getByRole("button", { name: /Back to Topics/i }))

  expect(screen.getByTestId("location-display")).toHaveTextContent("/learn?tab=topics")
})
