import { useMemo } from "react"
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom"
import CollectionDetailPage from "./learn/CollectionDetailPage"
import GuidanceDetailPage from "./learn/GuidanceDetailPage"
import LearnHub from "./learn/LearnHub"
import ShabadDetailPage from "./learn/ShabadDetailPage"
import TopicDetailPage from "./learn/TopicDetailPage"
import { useCurrentTime } from "../hooks/useCurrentTime"
import { useLearningStore } from "../store/learning"
import { toLocalDayStamp } from "../utils/learnDates"
import { getTodayLearnSurface } from "../utils/learnExperience"
import { buildLearnDetailPath, isLearnTab } from "../utils/learnRails"

function LearnIndexRoute() {
  const [searchParams] = useSearchParams()
  const now = useCurrentTime()
  const learnState = useLearningStore(state => state.learnState)
  const tabParam = searchParams.get("tab")
  const activeTab = isLearnTab(tabParam) ? tabParam : "today"

  const todaySurface = useMemo(
    () => getTodayLearnSurface(toLocalDayStamp(new Date(now)), learnState),
    [learnState, now]
  )

  const legacyRedirectPath = useMemo(() => {
    const detail = searchParams.get("detail")
    const topic = searchParams.get("topic")
    const shabad = searchParams.get("shabad")
    const collection = searchParams.get("collection")

    if (detail === "topic" && topic) {
      return buildLearnDetailPath("topic-guide", topic, activeTab)
    }

    if (detail === "shabad" && shabad) {
      return buildLearnDetailPath("shabad-deep-dive", shabad, activeTab)
    }

    if (detail === "collection" && collection) {
      return buildLearnDetailPath("collection", collection, activeTab)
    }

    if (detail === "guidance") {
      return buildLearnDetailPath("daily-guidance", todaySurface.dailyGuidance.item.id, "today")
    }

    return null
  }, [activeTab, searchParams, todaySurface.dailyGuidance.item.id])

  if (legacyRedirectPath) {
    return <Navigate to={legacyRedirectPath} replace />
  }

  return <LearnHub />
}

export default function Learn() {
  return (
    <Routes>
      <Route index element={<LearnIndexRoute />} />
      <Route path="topics/:topicId" element={<TopicDetailPage />} />
      <Route path="shabads/:shabadId" element={<ShabadDetailPage />} />
      <Route path="guidance/:guidanceId" element={<GuidanceDetailPage />} />
      <Route path="collections/:collectionId" element={<CollectionDetailPage />} />
      <Route path="*" element={<Navigate to="/learn" replace />} />
    </Routes>
  )
}
