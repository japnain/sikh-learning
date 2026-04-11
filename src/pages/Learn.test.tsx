import { beforeEach, afterEach, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Learn from "./Learn"
import NavBar from "../components/NavBar"
import { useLearningStore } from "../store/learning"
import { useLearnRailStore } from "../store/learnRail"
import { getTodayLearnSurface } from "../utils/learnExperience"
import { SHABAD_DEEP_DIVE_BY_ID } from "../data/learnContent"

function createDefaultLearnState() {
  return {
    viewedItems: [],
    savedItemIds: [],
    recentTopicIds: [],
    activeCollectionId: null,
    depthPreference: "balanced" as const,
  }
}

function renderLearnRoute(initialEntry = "/learn") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavBar />
      <Learn />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))
  window.scrollTo = vi.fn()
  useLearnRailStore.getState().reset()

  useLearningStore.setState({
    masteredSymbols: [],
    completedLessons: [],
    practiceStreak: 0,
    streakCalendar: {},
    longestStreak: 0,
    earnedMilestoneIds: [],
    pendingMilestoneId: null,
    dailyLesson: null,
    lastPracticedOn: undefined,
    totalPracticeSessions: 0,
    skills: {},
    lessonProgress: {},
    assessmentHistory: [],
    journeys: {},
    activeJourneyId: null,
    activeProgramId: "start-reading",
    programProgress: {
      "start-reading": { currentModuleId: null, completedModuleIds: [] },
      "build-fluency": { currentModuleId: null, completedModuleIds: [] },
      "understand-gurbani": { currentModuleId: null, completedModuleIds: [] },
      "deep-study": { currentModuleId: null, completedModuleIds: [] },
    },
    queuedReviewModuleIds: [],
    placementResult: null,
    lastLearnActivity: null,
    grammarNotesSeen: [],
    masteredWordFamilyIds: [],
    themePathProgress: {},
    completedThemePathIds: [],
    learnState: createDefaultLearnState(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("renders the new today-first Gurbani guidance structure", () => {
  renderLearnRoute()

  expect(screen.getByRole("heading", { level: 1, name: /^Today$/i })).toBeInTheDocument()
  expect(screen.getByText(/NaamRas Learn/i)).toBeInTheDocument()
  expect(screen.getByRole("searchbox", { name: /Search the Learn archive/i })).toBeInTheDocument()
  expect(screen.getByText(/The library is growing in public\./i)).toBeInTheDocument()
  expect(screen.getByTestId("learn-surface-rail")).toBeInTheDocument()
  expect(screen.getByTestId("learn-subsection-rail")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Today's Guidance/i })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Featured Shabad/i })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Topic Spotlight/i })).toBeInTheDocument()
  expect(screen.getByText(/Continue Learning/i)).toBeInTheDocument()
  expect(screen.getByText(/Open by State/i)).toBeInTheDocument()
  expect(screen.getByText(/Editor's Paths/i)).toBeInTheDocument()
  expect(screen.queryByText(/Archive Surface/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/Curation Notes/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/^Placement$/i)).not.toBeInTheDocument()
})

test("shows live inventory proof instead of fixed launch claims", () => {
  const todaySurface = getTodayLearnSurface("2026-04-11", createDefaultLearnState())

  renderLearnRoute()

  expect(screen.getByText(/Daily guidance entries/i)).toBeInTheDocument()
  expect(screen.getByText(String(todaySurface.inventory.dailyGuidance))).toBeInTheDocument()
  expect(screen.getByText(/^Cross-links$/i)).toBeInTheDocument()
  expect(screen.getByText(String(todaySurface.inventory.crossLinks))).toBeInTheDocument()
  expect(screen.queryByText(/150\+/i)).not.toBeInTheDocument()
})

test("learn controls can collapse without losing the current summary", () => {
  renderLearnRoute()

  fireEvent.click(screen.getByRole("button", { name: /Reading Depth Balanced Current/i }))

  expect(screen.queryByRole("button", { name: /Gentle/i })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Reading Depth Balanced Current/i })).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: /Reading Depth Balanced Current/i }))

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

test("searching stress resolves to the approved anxiety guide", () => {
  renderLearnRoute("/learn?tab=topics")
  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "stress" },
  })

  expect(screen.getAllByText(/When the mind is anxious/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Showing the canonical approved guide for “stress”/i)).toBeInTheDocument()
})

test("searching second guessing resolves to the newer doubt guide", () => {
  renderLearnRoute("/learn?tab=topics")
  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "second guessing" },
  })

  expect(screen.getAllByText(/When doubt keeps burning beneath the surface/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Showing the canonical approved guide for “second guessing”/i)).toBeInTheDocument()
})

test("searching burnt out resolves to the exhaustion guide", () => {
  renderLearnRoute("/learn?tab=topics")
  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "burnt out" },
  })

  expect(screen.getAllByText(/When the soul feels worn thin/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Showing the canonical approved guide for “burnt out”/i)).toBeInTheDocument()
})

test("today's guidance can open the linked shabad detail without leaving the hub", () => {
  const todaySurface = getTodayLearnSurface("2026-04-11", createDefaultLearnState())
  const relatedShabad = SHABAD_DEEP_DIVE_BY_ID[todaySurface.dailyGuidance.item.relatedShabadIds[0]!]!

  renderLearnRoute()

  fireEvent.click(screen.getByRole("button", { name: /Today's Guidance/i }))
  fireEvent.click(screen.getByRole("button", { name: /Open the full shabad/i }))

  expect(screen.getAllByText(new RegExp(relatedShabad.title, "i")).length).toBeGreaterThan(0)
  expect(screen.getByText(relatedShabad.lines[0]!.translation)).toBeInTheDocument()
})

test("opening a featured collection shows grouped editorial landing sections", () => {
  const todaySurface = getTodayLearnSurface("2026-04-11", createDefaultLearnState())
  const featuredCollection = todaySurface.featuredCollections[0]!

  renderLearnRoute()

  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(featuredCollection.title, "i") })[0]!)

  expect(screen.getByText(/Guidance Openings/i)).toBeInTheDocument()
  expect(screen.getByText(/Topic Guides/i)).toBeInTheDocument()
  expect(screen.getByText(/^Full Shabad Study$/i)).toBeInTheDocument()
})

test("choosing a topic chip clears a stale search fallback message", () => {
  renderLearnRoute("/learn?tab=topics")

  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "tomato" },
  })
  expect(screen.getByText(/nearest approved guide/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: /^Anger$/i }))

  expect(screen.queryByText(/nearest approved guide/i)).not.toBeInTheDocument()
  expect(screen.getByLabelText(/Search topic guides/i)).toHaveValue("")
  expect(screen.getAllByText(/When anger takes over/i).length).toBeGreaterThan(0)
})

test("studying a shabad from a topic guide moves into the shabads surface", () => {
  renderLearnRoute("/learn?tab=topics&topic=topic-anger")

  fireEvent.click(screen.getAllByRole("button", { name: /Study full shabad/i })[0]!)

  expect(screen.getByRole("heading", { level: 1, name: /^Shabads$/i })).toBeInTheDocument()
  expect(screen.getAllByText(/Ego Is the Disease and the Clue/i).length).toBeGreaterThan(0)
})

test("saved tab mixes daily guidance, topic guides, and shabad deep dives with clear labels", () => {
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
  expect(screen.getByRole("button", { name: /Open source shabad/i })).toBeInTheDocument()
  expect(screen.getAllByText(/Begin within Hukam/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/When the mind is anxious/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Why Do You Waver\?/i).length).toBeGreaterThan(0)
})

test("exposes stable subsection anchors for the learn rails", () => {
  renderLearnRoute("/learn?tab=topics")

  expect(document.getElementById("learn-topics-search")).toBeInTheDocument()
  expect(document.getElementById("learn-topics-current-guide")).toBeInTheDocument()
  expect(document.getElementById("learn-topics-all")).toBeInTheDocument()
})

test("learn subsection rail chips scroll to anchored sections", () => {
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView")

  renderLearnRoute("/learn?tab=topics")
  fireEvent.click(screen.getByTestId("topics-current-guide"))

  expect(scrollIntoView).toHaveBeenCalled()
})

test("learn detail rail appears for long topic guides and scrolls within the detail view", () => {
  const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView")

  renderLearnRoute("/learn?tab=topics&topic=topic-anxiety&detail=topic")

  expect(screen.getByTestId("learn-detail-rail")).toBeInTheDocument()
  expect(screen.getByTestId("topics-topic-action")).toBeInTheDocument()

  fireEvent.click(screen.getByTestId("topics-topic-action"))

  expect(scrollIntoView).toHaveBeenCalled()
  expect(document.getElementById("learn-detail-topic-action")).toBeInTheDocument()
})

test("default shabads surface publishes the deep-detail rail above the nav stack", () => {
  renderLearnRoute("/learn?tab=shabads")

  expect(screen.getByTestId("learn-detail-rail")).toBeInTheDocument()
  expect(screen.getByTestId("shabads-shabad-summary")).toBeInTheDocument()
  expect(screen.getByTestId("shabads-shabad-lines")).toBeInTheDocument()
})

test("route-driven learn details auto-scroll to their anchored section on load", () => {
  const scrolledIds: string[] = []
  vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(function mockScrollIntoView(this: HTMLElement) {
    scrolledIds.push(this.id)
  })

  const topicsRoute = renderLearnRoute("/learn?tab=topics&topic=topic-anxiety&detail=topic")
  expect(scrolledIds).toContain("learn-topics-current-guide")
  topicsRoute.unmount()

  scrolledIds.length = 0
  const guidanceRoute = renderLearnRoute("/learn?detail=guidance")
  expect(scrolledIds).toContain("learn-today-detail")
  guidanceRoute.unmount()

  scrolledIds.length = 0
  renderLearnRoute("/learn?tab=shabads&shabad=shabad-hukam-inside-everything&detail=shabad")
  expect(scrolledIds).toContain("learn-shabads-current")
})
