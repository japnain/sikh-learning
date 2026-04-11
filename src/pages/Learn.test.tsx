import { beforeEach, afterEach, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Learn from "./Learn"
import { useLearningStore } from "../store/learning"
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

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-04-11T09:00:00.000Z"))

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
  vi.useRealTimers()
})

test("renders the new today-first Gurbani guidance structure", () => {
  render(
    <MemoryRouter initialEntries={["/learn"]}>
      <Learn />
    </MemoryRouter>
  )

  expect(screen.getByRole("heading", { level: 1, name: /^Today$/i })).toBeInTheDocument()
  expect(screen.getByText(/Daily Gurbani guidance, full shabad study/i)).toBeInTheDocument()
  expect(screen.getByText(/Today's Guidance/i)).toBeInTheDocument()
  expect(screen.getAllByText(/Featured Shabad/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/What Guru Says About/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Continue Learning/i)).toBeInTheDocument()
  expect(screen.getByText(/Explore by Theme/i)).toBeInTheDocument()
  expect(screen.queryByText(/^Placement$/i)).not.toBeInTheDocument()
})

test("searching stress resolves to the approved anxiety guide", () => {
  render(
    <MemoryRouter initialEntries={["/learn"]}>
      <Learn />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole("button", { name: /Topics/i }))
  fireEvent.change(screen.getByLabelText(/Search topic guides/i), {
    target: { value: "stress" },
  })

  expect(screen.getAllByText(/When the mind is anxious/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Showing the canonical approved guide for “stress”/i)).toBeInTheDocument()
})

test("read full meaning opens the related full shabad context in one tap", () => {
  const todaySurface = getTodayLearnSurface("2026-04-11", createDefaultLearnState())
  const relatedShabad = SHABAD_DEEP_DIVE_BY_ID[todaySurface.dailyGuidance.item.relatedShabadIds[0]!]!

  render(
    <MemoryRouter initialEntries={["/learn"]}>
      <Learn />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole("button", { name: /Read full meaning/i }))

  expect(screen.getAllByText(new RegExp(relatedShabad.title, "i")).length).toBeGreaterThan(0)
  expect(screen.getByText(relatedShabad.lines[0]!.translation)).toBeInTheDocument()
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

  render(
    <MemoryRouter initialEntries={["/learn"]}>
      <Learn />
    </MemoryRouter>
  )

  fireEvent.click(screen.getByRole("button", { name: /Saved/i }))

  expect(screen.getByText(/^Daily guidance$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Topic guide$/i)).toBeInTheDocument()
  expect(screen.getByText(/^Shabad deep dive$/i)).toBeInTheDocument()
  expect(screen.getAllByText(/Begin inside Hukam/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/When the mind is anxious/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Why Do You Waver\?/i).length).toBeGreaterThan(0)
})
