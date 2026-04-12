import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
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

test("topic detail renders its own sticky rail and scrolls within the page", async () => {
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView")

  renderLearnRoute("/learn/topics/topic-anxiety?from=topics")

  expect(await screen.findByRole("heading", { level: 1, name: /When the mind is anxious/i })).toBeInTheDocument()
  expect(screen.getByTestId("learn-detail-rail")).toBeInTheDocument()
  expect(screen.getByTestId("topics-topic-action")).toBeInTheDocument()

  fireEvent.click(screen.getByTestId("topics-topic-action"))

  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalled()
  })
  expect(document.getElementById("learn-detail-topic-action")).toBeInTheDocument()
})

test("topic detail back button falls back to the topics hub on direct entry", async () => {
  renderLearnRoute("/learn/topics/topic-anxiety?from=topics")

  fireEvent.click(await screen.findByRole("button", { name: /Back to Topics/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn?tab=topics")
  })
})

test("topic detail opens the requested scenario on the canonical topic page", async () => {
  renderLearnRoute("/learn/topics/topic-mercy?from=topics&scenario=pressure")

  expect(await screen.findByRole("heading", { level: 1, name: /Mercy when the day tightens/i })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Under Pressure/i })).toHaveAttribute("aria-current", "page")
  expect(screen.getByText(/Under pressure, mercy is not sentimental relief/i)).toBeInTheDocument()
})

test("legacy flat topic ids redirect to the canonical topic route with the matching scenario", async () => {
  renderLearnRoute("/learn/topics/topic-mercy-pressure?from=topics")

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-mercy?from=topics&scenario=pressure")
  })
})
