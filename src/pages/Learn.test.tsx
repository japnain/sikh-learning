import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { getTodayLearnSurface } from "../utils/learnExperience"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./learn/testUtils"
import { useLearningStore } from "../store/learning"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("renders the learn hub with the today-first archive structure", () => {
  renderLearnRoute()

  expect(screen.getByRole("heading", { level: 1, name: /^Today$/i })).toBeInTheDocument()
  expect(screen.getByText(/Find the guide that meets the question/i)).toBeInTheDocument()
  expect(screen.getByRole("searchbox", { name: /Search the Learn archive/i })).toBeInTheDocument()
  expect(screen.getByText(/The library is growing in public\./i)).toBeInTheDocument()
  expect(screen.getByTestId("learn-surface-rail")).toBeInTheDocument()
  expect(screen.getByTestId("learn-subsection-rail")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Today's Guidance/i })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Featured Shabad/i })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Topic Spotlight/i })).toBeInTheDocument()
  expect(screen.getByText(/Continue Learning/i)).toBeInTheDocument()
  expect(screen.getByText(/Open by State/i)).toBeInTheDocument()
  expect(screen.getByText(/Editor's Paths/i)).toBeInTheDocument()
})

test("shows live inventory proof instead of fixed launch claims", () => {
  const todaySurface = getTodayLearnSurface("2026-04-11", createDefaultLearnState())

  renderLearnRoute()

  fireEvent.click(screen.getByRole("button", { name: /The library is growing in public\./i }))

  expect(screen.getByText(/Daily guidance entries/i)).toBeInTheDocument()
  expect(screen.getByText(String(todaySurface.inventory.dailyGuidance))).toBeInTheDocument()
  expect(screen.getByText(/^Cross-links$/i)).toBeInTheDocument()
  expect(screen.getByText(String(todaySurface.inventory.crossLinks))).toBeInTheDocument()
  expect(screen.queryByText(/150\+/i)).not.toBeInTheDocument()
})

test("learn disclosure sections start collapsed and reveal their controls on demand", () => {
  renderLearnRoute()

  const inventoryButton = screen.getByRole("button", { name: /The library is growing in public\./i })
  const depthButton = screen.getByRole("button", { name: /Reading Depth Balanced Current/i })

  expect(inventoryButton).toHaveAttribute("aria-expanded", "false")
  expect(depthButton).toHaveAttribute("aria-expanded", "false")
  expect(screen.queryByText(/Daily guidance entries/i)).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Gentle/i })).not.toBeInTheDocument()

  fireEvent.click(depthButton)

  expect(depthButton).toHaveAttribute("aria-expanded", "true")
  expect(screen.getByRole("button", { name: /Gentle/i })).toBeInTheDocument()
})

test("uses stable search input attributes for the archive search", () => {
  renderLearnRoute()

  const archiveSearch = document.querySelector("#learn-archive-search") as HTMLInputElement | null

  expect(archiveSearch).not.toBeNull()
  expect(archiveSearch?.getAttribute("name")).toBe("learn-archive-search")
  expect(archiveSearch?.getAttribute("autocorrect")).toBe("off")
  expect(archiveSearch?.getAttribute("spellcheck")).toBe("false")
})

test("searching stress resolves to the approved anxiety guide on the topics hub", () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "stress" },
  })

  expect(screen.getAllByText(/When the mind is anxious/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Showing the canonical approved guide for “stress”/i)).toBeInTheDocument()
})

test("clicking today's guidance opens a real detail route", () => {
  const todaySurface = getTodayLearnSurface("2026-04-11", createDefaultLearnState())

  renderLearnRoute()
  fireEvent.click(screen.getByRole("link", { name: /Today's Guidance/i }))

  expect(screen.getByTestId("location-display")).toHaveTextContent(
    `/learn/guidance/${todaySurface.dailyGuidance.item.id}?from=today`
  )
})

test("old inline-detail topic URLs redirect to the new topic route", async () => {
  renderLearnRoute("/learn?tab=topics&topic=topic-anxiety&detail=topic")

  expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-anxiety?from=topics")
})

test("choosing a topic chip clears a stale no-match message and opens the topic page", () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "tomato" },
  })
  expect(screen.getByText(/No matching topic found/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /^Anger$/i }))

  expect(screen.queryByText(/No matching topic found/i)).not.toBeInTheDocument()
  expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-anger?from=topics")
})

test("shabads tab shows an empty state instead of crashing when filters remove every deep dive", () => {
  renderLearnRoute("/learn?tab=shabads&theme=does-not-exist")

  expect(screen.getByRole("button", { name: /Clear all filters/i })).toBeInTheDocument()
  expect(screen.getByText(/No deep dives match the current filters/i)).toBeInTheDocument()
})

test("saved tab opens saved items on their own learn sub-routes", () => {
  useLearningStore.setState({
    learnState: {
      ...createDefaultLearnState(),
      savedItemIds: [
        "guidance-hukam",
        "topic-anxiety",
        "shabad-steadied-by-creator",
      ],
    },
  })

  renderLearnRoute("/learn?tab=saved")

  expect(screen.getByText(/^Daily guidance$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Topic guide$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Shabad deep dive$/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /Open daily guidance/i }))

  expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/guidance/guidance-hukam?from=saved")
})

test("exposes the updated stable subsection anchors for the learn rails", () => {
  renderLearnRoute("/learn?tab=topics")

  expect(document.getElementById("learn-topics-search")).toBeInTheDocument()
  expect(document.getElementById("learn-topics-all")).toBeInTheDocument()
  expect(document.getElementById("learn-topics-current-guide")).not.toBeInTheDocument()
})

test("learn subsection rail chips still scroll to anchored hub sections", () => {
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView")

  renderLearnRoute("/learn?tab=topics")
  fireEvent.click(screen.getByTestId("topics-all-topics"))

  expect(scrollIntoView).toHaveBeenCalled()
})
