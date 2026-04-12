import { render } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { vi } from "vitest"
import NavBar from "../../components/NavBar"
import { UI_DISCLOSURE_STORAGE_KEY } from "../../hooks/usePersistentDisclosure"
import Learn from "../Learn"
import { useLearnRailStore } from "../../store/learnRail"
import { useLearningStore } from "../../store/learning"

export function createDefaultLearnState() {
  return {
    viewedItems: [],
    savedItemIds: [],
    recentTopicIds: [],
    activeCollectionId: null,
    depthPreference: "balanced" as const,
  }
}

export function resetLearnTestState() {
  window.scrollTo = vi.fn()
  window.localStorage.removeItem(UI_DISCLOSURE_STORAGE_KEY)
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
}

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>
}

export function renderLearnRoute(
  initialEntry = "/learn",
  options?: {
    initialEntries?: string[]
    initialIndex?: number
  }
) {
  const initialEntries = options?.initialEntries ?? [initialEntry]

  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={options?.initialIndex}>
      <NavBar />
      <Routes>
        <Route path="/learn/*" element={<><Learn /><LocationSpy /></>} />
        <Route path="*" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  )
}
