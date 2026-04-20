import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { loadLearnCatalog } from "../data/learnRepository"
import { getTodayLearnSurface } from "../utils/learnExperience"
import { createDefaultLearnState, renderLearnRoute, resetLearnTestState } from "./learn/testUtils"
import { useLearningStore } from "../store/learning"
import { useSavedFeedbackStore } from "../store/savedFeedback"

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  resetLearnTestState()
  useSavedFeedbackStore.getState().clearSaved()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("renders the learn hub with the today-first archive structure", async () => {
  renderLearnRoute()

  expect(await screen.findByRole("heading", { level: 1, name: /^Today$/i })).toBeInTheDocument()
  expect(screen.getByText(/Find the guide that can actually bear the question/i)).toBeInTheDocument()
  expect(screen.getByRole("searchbox", { name: /Search the Learn archive/i })).toBeInTheDocument()
  expect(screen.getByText(/This archive is here to carry real return, not to perform volume\./i)).toBeInTheDocument()
  expect(screen.getByTestId("learn-surface-rail")).toBeInTheDocument()
  expect(screen.getByTestId("learn-subsection-rail")).toBeInTheDocument()
  expect(screen.getByTestId("learn-today-support-row")).toBeInTheDocument()
  expect(screen.getByTestId("learn-inventory-compact")).toBeInTheDocument()
  expect(screen.getByTestId("learn-reading-depth-compact")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Today's Guidance/i })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Featured Shabad/i })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Topic Spotlight/i })).toBeInTheDocument()
  expect(screen.getByText(/Continue Learning/i)).toBeInTheDocument()
  expect(screen.getByText(/Open by State/i)).toBeInTheDocument()
  expect(screen.getByText(/Editor's Paths/i)).toBeInTheDocument()
}, 10000)

test("learn shell copy reflects the reviewed archive instead of public-growth framing", async () => {
  renderLearnRoute()

  expect(await screen.findByText(/Search the need plainly\./i)).toBeInTheDocument()
  expect(screen.getByText(/This archive is here to carry real return, not to perform volume\./i)).toBeInTheDocument()
  expect(screen.queryByText(/The library is growing in public\./i)).not.toBeInTheDocument()
})

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

  renderLearnRoute()

  const compactInventory = await screen.findByTestId("learn-inventory-compact")

  expect(within(compactInventory).getByText(/Daily guidance entries/i)).toBeInTheDocument()
  expect(within(compactInventory).getByText(/Full shabad deep dives/i)).toBeInTheDocument()
  expect(within(compactInventory).getByText(/Canonical topic guides/i)).toBeInTheDocument()
  expect(within(compactInventory).getByText(/^Cross-links$/i)).toBeInTheDocument()
  expect(within(compactInventory).getByText(String(todaySurface.inventory.dailyGuidance))).toBeInTheDocument()
  expect(within(compactInventory).getByText(String(todaySurface.inventory.shabadDeepDives))).toBeInTheDocument()
  expect(within(compactInventory).getByText(String(todaySurface.inventory.topicGuides))).toBeInTheDocument()
  expect(within(compactInventory).getByText(String(todaySurface.inventory.crossLinks))).toBeInTheDocument()
  expect(screen.queryByText(/150\+/i)).not.toBeInTheDocument()
})

test("learn today keeps inventory and reading depth compact before the archive doors", async () => {
  renderLearnRoute()

  expect(await screen.findByTestId("learn-reading-depth-compact")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /The library is growing in public\./i })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Reading Depth Balanced Current/i })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Balanced/i })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Gentle/i })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Deep/i })).toBeInTheDocument()
})

test("today surface exposes fresh daily guidance entries from the published archive", async () => {
  const catalog = await loadLearnCatalog()
  const expectedFreshTitles = [...catalog.dailyGuidance]
    .filter(item => item.rotation.freshnessTier === "fresh")
    .sort((left, right) => {
      if (right.rotation.priority !== left.rotation.priority) {
        return right.rotation.priority - left.rotation.priority
      }

      return left.title.localeCompare(right.title)
    })
    .slice(0, 6)
    .map(item => item.title)

  renderLearnRoute()

  expect(await screen.findByText(/Fresh guidance/i)).toBeInTheDocument()
  const freshGrid = screen.getByTestId("learn-fresh-guidance-grid")
  expect(screen.getByTestId("today-fresh-guidance")).toBeInTheDocument()
  expect(within(freshGrid).getAllByRole("link")).toHaveLength(expectedFreshTitles.length)

  for (const title of expectedFreshTitles) {
    expect(within(freshGrid).getByText(title)).toBeInTheDocument()
  }
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

test("topic search keeps the literal query in both inputs and the url while typing", async () => {
  renderLearnRoute("/learn?tab=topics")

  const topicSearch = await screen.findByLabelText(/Search topic guides/i)
  const archiveSearch = screen.getByRole("searchbox", { name: /Search the Learn archive/i })
  const querySteps = ["a", "an", "anx", "anxi", "anxie", "anxiet", "anxiety"]

  for (const query of querySteps) {
    fireEvent.change(topicSearch, {
      target: { value: query },
    })

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent(`/learn?tab=topics&query=${query}`)
      expect(archiveSearch).toHaveValue(query)
      expect(topicSearch).toHaveValue(query)
    })
  }
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

test("saved tab reflects the most recent learn save inline and highlights the matching row", async () => {
  useLearningStore.setState({
    learnState: {
      ...createDefaultLearnState(),
      savedItemIds: ["guidance-hukam"],
    },
  })
  useSavedFeedbackStore.setState({
    lastSaved: {
      kind: "learn",
      targetId: "guidance-hukam",
      surfacedAt: "2026-04-11T11:00:00.000Z",
    },
  })

  renderLearnRoute("/learn?tab=saved")

  expect(await screen.findByRole("status")).toHaveTextContent(/Saved to Learn just now/i)
  const savedCard = document.querySelector("#learn-saved-items .saved-feedback-highlight")
  expect(savedCard).not.toBeNull()
  expect(within(savedCard as HTMLElement).getByText(/^Daily guidance$/i)).toBeInTheDocument()
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
