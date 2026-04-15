import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { loadLearnCatalog } from "../data/learnRepository"
import { getTodayLearnSurface } from "../utils/learnExperience"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./learn/testUtils"
import { useLearningStore } from "../store/learning"

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("renders the learn hub with the today-first archive structure", async () => {
  renderLearnRoute()

  expect(await screen.findByRole("heading", { level: 1, name: /^Today$/i })).toBeInTheDocument()
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
}, 10000)

test("learn hub card links render as block-level cards for stable mobile painting", async () => {
  renderLearnRoute()

  expect(await screen.findByRole("link", { name: /Continue collection:/i })).toHaveClass("block")
  expect(screen.getByRole("link", { name: /Today's Guidance/i })).toHaveClass("block")
  expect(screen.getByRole("link", { name: /^Loneliness$/i })).toHaveClass("block")
  expect(screen.getAllByRole("link", { name: /step/i })[0]).toHaveClass("block")
})

test("shows live inventory proof instead of fixed launch claims", async () => {
  const catalog = await loadLearnCatalog()
  const todaySurface = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState())
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  renderLearnRoute()

  await user.click(await screen.findByRole("button", { name: /The library is growing in public\./i }))

  await waitFor(() => {
    expect(within(screen.getByTestId("learn-inventory")).getByText(/Daily guidance entries/i)).toBeInTheDocument()
  })
  expect(within(screen.getByTestId("learn-inventory")).getByText(/Canonical topic guides/i)).toBeInTheDocument()
  expect(within(screen.getByTestId("learn-inventory")).getByText(/Scenario views/i)).toBeInTheDocument()
  expect(within(screen.getByTestId("learn-inventory")).getByText(String(todaySurface.inventory.dailyGuidance))).toBeInTheDocument()
  expect(within(screen.getByTestId("learn-inventory")).getByText(String(todaySurface.inventory.topicGuides))).toBeInTheDocument()
  expect(within(screen.getByTestId("learn-inventory")).getByText(String(todaySurface.inventory.topicScenarios))).toBeInTheDocument()
  expect(within(screen.getByTestId("learn-inventory")).getByText(/^Cross-links$/i)).toBeInTheDocument()
  expect(within(screen.getByTestId("learn-inventory")).getByText(String(todaySurface.inventory.crossLinks))).toBeInTheDocument()
  expect(screen.queryByText(/150\+/i)).not.toBeInTheDocument()
})

test("learn disclosure sections start collapsed and reveal their controls on demand", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  renderLearnRoute()

  const inventoryButton = await screen.findByRole("button", { name: /The library is growing in public\./i })
  const depthButton = screen.getByRole("button", { name: /Reading Depth Balanced Current/i })

  expect(inventoryButton).toHaveAttribute("aria-expanded", "false")
  expect(depthButton).toHaveAttribute("aria-expanded", "false")
  expect(screen.queryByText(/Daily guidance entries/i)).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Gentle/i })).not.toBeInTheDocument()

  await user.click(depthButton)

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Reading Depth Balanced Current/i })).toHaveAttribute("aria-expanded", "true")
  })
  expect(screen.getByRole("button", { name: /Gentle/i })).toBeInTheDocument()
})

test("uses stable search input attributes for the archive search", async () => {
  renderLearnRoute()

  await screen.findByRole("searchbox", { name: /Search the Learn archive/i })
  const archiveSearch = document.querySelector("#learn-archive-search") as HTMLInputElement | null

  expect(archiveSearch).not.toBeNull()
  expect(archiveSearch?.getAttribute("name")).toBe("learn-archive-search")
  expect(archiveSearch?.getAttribute("autocorrect")).toBe("off")
  expect(archiveSearch?.getAttribute("spellcheck")).toBe("false")
})

test("searching stress resolves to the approved anxiety guide on the topics hub", async () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(await screen.findByLabelText(/Search topic guides/i), {
    target: { value: "stress" },
  })

  expect(screen.getAllByText(/When the mind is anxious/i).length).toBeGreaterThan(0)
  const [statusCopy] = screen.getAllByText((_, element) => (
    element?.tagName.toLowerCase() === 'p'
    && (element.textContent?.includes('Showing the canonical approved guide for “stress”') ?? false)
  ))
  expect(statusCopy).toBeInTheDocument()
})

test("highlights matching terms inside learn topic results", async () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(await screen.findByLabelText(/Search topic guides/i), {
    target: { value: "stress" },
  })

  await waitFor(() => {
    expect(document.querySelector('[data-search-highlight="true"]')).not.toBeNull()
  })
})

test("topic search keeps the literal query in both inputs and the url", async () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(await screen.findByLabelText(/Search topic guides/i), {
    target: { value: "anxiety" },
  })

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn?tab=topics&query=anxiety")
    expect(screen.getByRole("searchbox", { name: /Search the Learn archive/i })).toHaveValue("anxiety")
    expect(screen.getByRole("searchbox", { name: /Search topic guides/i })).toHaveValue("anxiety")
  })
})

test("topics tab shows canonical topic cards instead of flat scenario variants", async () => {
  renderLearnRoute("/learn?tab=topics")

  await screen.findByLabelText(/Search topic guides/i)
  const topicGrid = document.getElementById("learn-topics-all")
  expect(topicGrid).not.toBeNull()

  const mercyCards = within(topicGrid as HTMLElement)
    .getAllByRole("link")
    .filter(link => link.getAttribute("href") === "/learn/topics/topic-mercy?from=topics")

  expect(mercyCards).toHaveLength(1)
  expect(within(topicGrid as HTMLElement).queryByRole("link", { name: /Mercy when the day tightens/i })).not.toBeInTheDocument()
})

test("today surface keeps the topic spotlight family out of the door rail", async () => {
  const catalog = await loadLearnCatalog()
  const todaySurface = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState())

  expect(new Set(todaySurface.themeRail.map(topic => topic.rotation.theme)).size).toBe(todaySurface.themeRail.length)
  expect(todaySurface.themeRail.map(topic => topic.rotation.theme)).not.toContain(todaySurface.topicSpotlight.item.rotation.theme)
})

test("searching mercy under pressure opens the canonical mercy page with the pressure scenario active", async () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(await screen.findByLabelText(/Search topic guides/i), {
    target: { value: "mercy under pressure" },
  })

  fireEvent.click(screen.getByRole("link", { name: /When mercy has to be received before it can be trusted/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-mercy?from=topics&scenario=pressure")
  })
  expect(await screen.findByRole("heading", { level: 1, name: /When mercy tightens under pressure/i })).toBeInTheDocument()
})

test("clicking today's guidance opens a real detail route", async () => {
  const catalog = await loadLearnCatalog()
  const todaySurface = getTodayLearnSurface(catalog, "2026-04-11", createDefaultLearnState())

  renderLearnRoute()
  fireEvent.click(await screen.findByRole("link", { name: /Today's Guidance/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      `/learn/guidance/${todaySurface.dailyGuidance.item.id}?from=today`
    )
  })
})

test("old inline-detail topic URLs redirect to the new topic route", async () => {
  renderLearnRoute("/learn?tab=topics&topic=topic-anxiety&detail=topic")

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-anxiety?from=topics")
  })
})

test("legacy flat topic urls redirect to the canonical topic route with the scenario query", async () => {
  renderLearnRoute("/learn?tab=topics&topic=topic-mercy-pressure&detail=topic")

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-mercy?from=topics&scenario=pressure")
  })
})

test("choosing a topic chip clears a stale no-match message and opens the topic page", async () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(await screen.findByLabelText(/Search topic guides/i), {
    target: { value: "tomato" },
  })
  expect(screen.getByText(/No matching topic found/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /^Anger$/i }))

  await waitFor(() => {
    expect(screen.queryByText(/No matching topic found/i)).not.toBeInTheDocument()
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/topics/topic-anger?from=topics")
  })
})

test("shabads tab shows an empty state instead of crashing when filters remove every deep dive", async () => {
  renderLearnRoute("/learn?tab=shabads&theme=does-not-exist")

  expect(await screen.findByRole("button", { name: /Clear all filters/i })).toBeInTheDocument()
  expect(screen.getByText(/No deep dives match the current filters/i)).toBeInTheDocument()
})

test("saved tab opens saved items on their own learn sub-routes", async () => {
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

  expect(await screen.findByText(/^Daily guidance$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Topic guide$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Shabad deep dive$/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole("link", { name: /Open daily guidance/i }))

  await waitFor(() => {
    expect(screen.getByTestId("location-display")).toHaveTextContent("/learn/guidance/guidance-hukam?from=saved")
  })
})

test("exposes the updated stable subsection anchors for the learn rails", async () => {
  renderLearnRoute("/learn?tab=topics")
  await screen.findByLabelText(/Search topic guides/i)

  expect(document.getElementById("learn-topics-search")).toBeInTheDocument()
  expect(document.getElementById("learn-topics-all")).toBeInTheDocument()
  expect(document.getElementById("learn-topics-current-guide")).not.toBeInTheDocument()
})

test("learn subsection rail chips still scroll to anchored hub sections", async () => {
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView")

  renderLearnRoute("/learn?tab=topics")
  await screen.findByLabelText(/Search topic guides/i)
  fireEvent.click(screen.getByTestId("topics-all-topics"))

  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalled()
  })
})
