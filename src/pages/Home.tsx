import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchSearch, type SearchResult } from '../api/banidb'
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconMoon,
  IconSearch,
  IconShare,
  IconSun,
} from '../components/icons'
import StreakBadge from '../components/StreakBadge'
import { BANIS } from '../data/banis'
import { GUIDED_JOURNEYS } from '../data/guidedJourneys'
import { useHukamnama } from '../hooks/useHukamnama'
import { useAng } from '../hooks/useAng'
import { useCurrentTime } from '../hooks/useCurrentTime'
import useDailyLesson from '../hooks/useDailyLesson'
import { useDailyFlowStore } from '../store/dailyFlow'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS, NITNEM_TIME_ORDER, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import type { StudiedEntry, UiLocale } from '../types'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import { getLearningLevelLabels } from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'
import { getDailyPickAng } from '../utils/dailyPick'
import { formatUiDate } from '../utils/formatUiDate'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'
import { getAngTargets, getAppSearchMatches, groupSearchResults } from '../utils/appSearch'
import { getEditorialCopy } from '../content/editorialCopy'

const TODAYS_PATH_HIGHLIGHT_CLASSES = [
  'border-gold/45',
  'shadow-gold-strong',
  'ring-2',
  'ring-gold/35',
  'ring-offset-2',
  'ring-offset-parchment',
  'dark:ring-offset-dark-bg',
]

function parseSession(scriptureId: string | null | undefined): { source: string | null; ang: number | null } {
  if (!scriptureId) return { source: null, ang: null }
  const parts = scriptureId.split('-')
  if (parts.length < 2) return { source: null, ang: null }
  return {
    source: parts[0] ?? null,
    ang: Number(parts[1]) || null,
  }
}

const HOME_MESSAGES: Record<UiLocale, {
  resumeReading: string
  resumeStudyBody: string
  resumeReadingBody: string
  openTodaysHukamnama: string
  todaysMeaningBody: string
  todaysReadingBody: string
  buildHabitTitle: string
  learnScriptTitle: string
  buildConfidenceTitle: string
  childLearnBody: string
  adultLearnBody: string
  pickUpPausedTitle: string
  nitnemImmediateBody: string
  beginTodayTitle: string
  beginTodayMeaningTitle: string
  beginTodayMeaningBody: string
  beginTodayBody: string
  browseRead: string
  trackSuffix: string
  reviewDue: (count: number) => string
}> = {
  en: {
    resumeReading: 'Resume Reading',
    resumeStudyBody: 'Return to the last passage you were studying so the context stays intact.',
    resumeReadingBody: 'Open the passage you were already working through.',
    openTodaysHukamnama: 'Open Today’s Hukamnama',
    todaysMeaningBody: 'Start with the daily hukamnama and keep the meaning close.',
    todaysReadingBody: 'Start with the daily hukamnama and stay in a steady daily rhythm.',
    buildHabitTitle: 'Build a reading habit before adding more weight.',
    learnScriptTitle: 'Learn the script before chasing too much meaning.',
    buildConfidenceTitle: 'Build reading confidence before the overwhelm.',
    childLearnBody: 'Keep the next step simple: guided letters, short drills, then one real line at a time.',
    adultLearnBody: 'Start with guided letters, practice recognition, then move into live pankti when you are ready.',
    pickUpPausedTitle: 'Pick up exactly where you paused.',
    nitnemImmediateBody: 'Nitnem should feel immediate. Resume your last reading without hunting through the library.',
    beginTodayTitle: 'Begin with today’s hukamnama.',
    beginTodayMeaningTitle: 'Begin with today’s hukamnama and keep the meaning close.',
    beginTodayMeaningBody: 'A calm first step for daily reading, with meaning controls and guided support built into the reader.',
    beginTodayBody: 'A calm first step for daily reading, with meaning controls and a cleaner mobile reader built in.',
    browseRead: 'Browse Read',
    trackSuffix: 'track',
    reviewDue: (count) => `${count} review item${count === 1 ? '' : 's'} due`,
  },
  pa: {
    resumeReading: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ',
    resumeStudyBody: 'ਜਿੱਥੇ ਤੁਸੀਂ ਅਖੀਰ ਵਾਰ ਅਰਥ ਨਾਲ ਪੜ੍ਹ ਰਹੇ ਸੀ, ਓਥੇ ਹੀ ਵਾਪਸ ਜਾਓ ਤਾਂ ਜੋ ਸੰਦਰਭ ਬਣਾ ਰਹੇ।',
    resumeReadingBody: 'ਉਹੀ ਪੰਕਤੀ ਖੋਲ੍ਹੋ ਜਿਸ ਤੇ ਤੁਸੀਂ ਪਹਿਲਾਂ ਕੰਮ ਕਰ ਰਹੇ ਸੀ।',
    openTodaysHukamnama: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ ਖੋਲ੍ਹੋ',
    todaysMeaningBody: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਅਰਥ ਨੂੰ ਨੇੜੇ ਰੱਖੋ।',
    todaysReadingBody: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਪਾਠ ਦੀ ਲਯ ਬਣਾਈ ਰੱਖੋ।',
    buildHabitTitle: 'ਹੋਰ ਭਾਰ ਜੋੜਨ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਦੀ ਆਦਤ ਬਣਾਓ।',
    learnScriptTitle: 'ਬਹੁਤ ਅਰਥ ਦੇ ਪਿੱਛੇ ਦੌੜਨ ਤੋਂ ਪਹਿਲਾਂ ਲਿਪੀ ਸਿੱਖੋ।',
    buildConfidenceTitle: 'ਘਬਰਾਹਟ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਦਾ ਵਿਸ਼ਵਾਸ ਬਣਾਓ।',
    childLearnBody: 'ਅਗਲਾ ਕਦਮ ਸੌਖਾ ਰੱਖੋ: ਮਾਰਗਦਰਸ਼ਿਤ ਅੱਖਰ, ਛੋਟੇ ਅਭਿਆਸ, ਫਿਰ ਇੱਕ ਅਸਲੀ ਲਾਈਨ।',
    adultLearnBody: 'ਮਾਰਗਦਰਸ਼ਿਤ ਅੱਖਰਾਂ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ, ਪਛਾਣ ਦਾ ਅਭਿਆਸ ਕਰੋ, ਫਿਰ ਜਦੋਂ ਤਿਆਰ ਹੋਵੋ ਤਾਂ ਜੀਵੰਤ ਪੰਕਤੀ ਵੱਲ ਵਧੋ।',
    pickUpPausedTitle: 'ਜਿੱਥੇ ਰੁਕੇ ਸੀ ਓਥੇ ਹੀ ਤੋਂ ਚੁੱਕੋ।',
    nitnemImmediateBody: 'ਨਿਤਨੇਮ ਤੁਰੰਤ ਮਹਿਸੂਸ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ। ਲਾਇਬ੍ਰੇਰੀ ਵਿੱਚ ਲੱਭਣ ਤੋਂ ਬਿਨਾਂ ਆਪਣਾ ਪਿਛਲਾ ਪਾਠ ਜਾਰੀ ਰੱਖੋ।',
    beginTodayTitle: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।',
    beginTodayMeaningTitle: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਅਰਥ ਨੂੰ ਨੇੜੇ ਰੱਖੋ।',
    beginTodayMeaningBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ ਲਈ ਇੱਕ ਸ਼ਾਂਤ ਪਹਿਲਾ ਕਦਮ, ਜਿਸ ਵਿੱਚ ਅਰਥ ਨਿਯੰਤਰਣ ਅਤੇ ਮਾਰਗਦਰਸ਼ਿਤ ਸਹਾਇਤਾ ਬਣੀ ਹੋਈ ਹੈ।',
    beginTodayBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ ਲਈ ਇੱਕ ਸ਼ਾਂਤ ਪਹਿਲਾ ਕਦਮ, ਜਿਸ ਵਿੱਚ ਅਰਥ ਨਿਯੰਤਰਣ ਅਤੇ ਹੋਰ ਸਾਫ਼ ਮੋਬਾਈਲ ਪਾਠਕ ਸ਼ਾਮਲ ਹੈ।',
    browseRead: 'ਪੜ੍ਹੋ ਬ੍ਰਾਊਜ਼ ਕਰੋ',
    trackSuffix: 'ਮਾਰਗ',
    reviewDue: (count) => `${count} ਦੁਹਰਾਈ ਆਇਟਮ ਬਾਕੀ`,
  },
  hi: {
    resumeReading: 'पढ़ना जारी रखें',
    resumeStudyBody: 'जिस अंश को आप अर्थ के साथ पढ़ रहे थे, वहीं लौटें ताकि संदर्भ बना रहे।',
    resumeReadingBody: 'वही अंश खोलें जिस पर आप पहले काम कर रहे थे।',
    openTodaysHukamnama: 'आज का हुकमनामा खोलें',
    todaysMeaningBody: 'दैनिक हुकमनामे से शुरू करें और अर्थ को पास रखें।',
    todaysReadingBody: 'दैनिक हुकमनामे से शुरू करें और पढ़ने की लय बनाए रखें।',
    buildHabitTitle: 'और भार जोड़ने से पहले पढ़ने की आदत बनाइए।',
    learnScriptTitle: 'बहुत अर्थ पकड़ने से पहले लिपि सीखिए।',
    buildConfidenceTitle: 'घबराहट से पहले पढ़ने का आत्मविश्वास बनाइए।',
    childLearnBody: 'अगला कदम सरल रखें: मार्गदर्शित अक्षर, छोटे अभ्यास, फिर एक वास्तविक पंक्ति।',
    adultLearnBody: 'मार्गदर्शित अक्षरों से शुरू करें, पहचान का अभ्यास करें, फिर तैयार होने पर जीवंत पंक्ति में जाएँ।',
    pickUpPausedTitle: 'जहाँ रुके थे, वहीं से आगे बढ़ें।',
    nitnemImmediateBody: 'नितनेम तुरंत उपलब्ध लगना चाहिए। लाइब्रेरी में खोजे बिना अपना पिछला पाठ जारी रखें।',
    beginTodayTitle: 'आज के हुकमनामे से शुरू करें।',
    beginTodayMeaningTitle: 'आज के हुकमनामे से शुरू करें और अर्थ को पास रखें।',
    beginTodayMeaningBody: 'दैनिक पाठ के लिए एक शांत पहला कदम, जिसमें अर्थ नियंत्रण और मार्गदर्शित सहायता पहले से जुड़ी हो।',
    beginTodayBody: 'दैनिक पाठ के लिए एक शांत पहला कदम, जिसमें अर्थ नियंत्रण और एक अधिक साफ़ मोबाइल रीडर शामिल है।',
    browseRead: 'रीड ब्राउज़ करें',
    trackSuffix: 'मार्ग',
    reviewDue: (count) => `${count} रिव्यू आइटम बाकी`,
  },
}

const PROGRESS_BANIS = BANIS.filter(b =>
  ['japji-sahib', 'sukhmani-sahib', 'anand-sahib', 'rehras-sahib', 'jaap-sahib'].includes(b.id)
)

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const { streak, currentSession, studied } = useProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const { dark, toggle: toggleTheme } = useThemeStore()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const locale = useLocaleStore(s => s.locale)
  const {
    lesson: dailyLesson,
    needsPersist: dailyLessonNeedsPersist,
    persistLesson,
  } = useDailyLesson()
  const {
    selectedIds,
    markComplete,
    unmarkComplete,
    isComplete,
    toggleSelected,
    resetSelections,
    resetIfNewDay,
  } = useNitemStore()
  const ensureDailyToday = useDailyFlowStore(s => s.ensureToday)
  const toggleDailyAction = useDailyFlowStore(s => s.toggleAction)
  const isDailyActionDone = useDailyFlowStore(s => s.isCompleted)
  const completedActionIds = useDailyFlowStore(s => s.completedActionIds)
  const getProgress = useReadingProgressStore(state => state.getProgress)
  const readingProgress = useReadingProgressStore(state => state.progress)
  const vocab = useVocabStore(s => s.vocab)
  const { masteredSymbols, completedLessons, journeys, activeJourneyId } = useLearningStore()
  const {
    learningLevel,
    audience,
    learningGoal,
    openOnboarding,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const commonCopy = copy.common
  const homeCopy = copy.home
  const homeMessages = HOME_MESSAGES[locale]
  const learningLevelLabels = getLearningLevelLabels(locale)
  const [nitnemOpen, setNitnemOpen] = useState(false)
  const [nitnemEditing, setNitnemEditing] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [homeSearchQuery, setHomeSearchQuery] = useState('')
  const [homeSearchResults, setHomeSearchResults] = useState<SearchResult[]>([])
  const [homeSearching, setHomeSearching] = useState(false)
  const [homeSearchError, setHomeSearchError] = useState(false)
  const [confirmingNitnemReset, setConfirmingNitnemReset] = useState(false)
  const todaysPathRef = useRef<HTMLElement | null>(null)
  const homeSearchDebounceRef = useRef<number | null>(null)
  const nitnemResetConfirmRef = useRef<number | null>(null)
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()

  const getNitnemOptionDetail = (option: NitnemRouteOption) => (
    isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
      ? getSundarGutkaLengthDetail(sundarGutkaLengths[option.baseBaniId])
      : option.detail
  )

  useEffect(() => {
    resetIfNewDay()
    ensureDailyToday()
  }, [ensureDailyToday, resetIfNewDay])

  useEffect(() => {
    if (dailyLessonNeedsPersist) {
      persistLesson()
    }
  }, [dailyLessonNeedsPersist, persistLesson])

  useEffect(() => {
    return () => {
      if (homeSearchDebounceRef.current !== null) {
        window.clearTimeout(homeSearchDebounceRef.current)
      }
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (nitnemEditing) return
    if (nitnemResetConfirmRef.current !== null) {
      window.clearTimeout(nitnemResetConfirmRef.current)
      nitnemResetConfirmRef.current = null
    }
    setConfirmingNitnemReset(false)
  }, [nitnemEditing])

  useEffect(() => {
    const state = (location.state as {
      reopenOnboarding?: boolean
      highlightTodayPath?: boolean
    } | null) ?? null

    if (!state?.reopenOnboarding && !state?.highlightTodayPath) return

    let highlightTimer: number | null = null

    if (state.reopenOnboarding) {
      openOnboarding()
    }

    if (state.highlightTodayPath) {
      globalThis.requestAnimationFrame(() => {
        todaysPathRef.current?.classList.add(...TODAYS_PATH_HIGHLIGHT_CLASSES)
        todaysPathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      highlightTimer = window.setTimeout(() => {
        todaysPathRef.current?.classList.remove(...TODAYS_PATH_HIGHLIGHT_CLASSES)
      }, 2600)
    }

    navigate(location.pathname, { replace: true, state: null })

    return () => {
      if (highlightTimer !== null) {
        window.clearTimeout(highlightTimer)
      }
    }
  }, [location.pathname, location.state, navigate, openOnboarding])

  const { source, ang } = getDailyPickAng()
  const { entries: pickEntries, loading: pickLoading } = useAng(ang, source)
  const todaysPick = pickEntries[0] ?? null
  const { data: hukamnama, loading: hukamnamaLoading, error: hukamnamaError } = useHukamnama()

  const selectedNitnemOptions = useMemo(() => {
    return selectedIds
      .map(optionId => NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null)
      .filter((option): option is NitnemRouteOption => option !== null)
      .sort((left, right) =>
        NITNEM_TIME_ORDER[left.time] - NITNEM_TIME_ORDER[right.time]
        || left.startAng - right.startAng
        || left.name.localeCompare(right.name)
      )
  }, [selectedIds])
  const groupedNitnemOptions = useMemo(() => {
    return selectedNitnemOptions.reduce<Record<NitnemRouteOption['time'], NitnemRouteOption[]>>(
      (groups, option) => {
        groups[option.time].push(option)
        return groups
      },
      { Morning: [], Evening: [], Night: [] }
    )
  }, [selectedNitnemOptions])
  const availableNitnemOptions = useMemo(() => {
    return [...NITNEM_ROUTE_OPTIONS].sort((left, right) =>
      NITNEM_TIME_ORDER[left.time] - NITNEM_TIME_ORDER[right.time]
      || left.startAng - right.startAng
      || left.name.localeCompare(right.name)
    )
  }, [])
  const nitnemDone = selectedNitnemOptions.filter(option => isComplete(option.id)).length
  const nitnemProgressPct = selectedNitnemOptions.length > 0
    ? (nitnemDone / selectedNitnemOptions.length) * 100
    : 0
  const dueReview = useMemo(
    () => vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= now),
    [now, vocab]
  )
  const { savedWords, savedPhrases } = useMemo(() => ({
    savedWords: vocab.filter(entry => (entry.kind ?? 'word') === 'word').length,
    savedPhrases: vocab.filter(entry => (entry.kind ?? 'word') === 'phrase').length,
  }), [vocab])
  const progressItems = useMemo(
    () => PROGRESS_BANIS
      .map(b => ({ ...b, ...getProgress(b.id) }))
      .filter(p => p.done > 0),
    [getProgress, readingProgress]
  )
  const recentlyStudied = useMemo(
    () => [...studied]
      .sort((a: StudiedEntry, b: StudiedEntry) =>
        new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
      )
      .slice(0, 5)
      .map((s: StudiedEntry) => {
        const entry = getEntryById(s.id)
        return entry ? { ...entry, swipedAt: s.swipedAt } : null
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [getEntryById, studied]
  )

  const sessionTarget = parseSession(currentSession?.scriptureId)
  const showLearnHero = learningLevel === 'beginner' && !currentSession
  const activeJourney = useMemo(() => {
    if (activeJourneyId) {
      return GUIDED_JOURNEYS.find(journey => journey.id === activeJourneyId) ?? null
    }
    return GUIDED_JOURNEYS.find(journey => journeys[journey.id] && !journeys[journey.id]?.completedAt) ?? null
  }, [activeJourneyId, journeys])
  const activeJourneyProgress = activeJourney ? journeys[activeJourney.id] : null
  const nextJourneyStep = activeJourney?.steps.find(step => !activeJourneyProgress?.completedStepIds.includes(step.id)) ?? null
  const completedDailyCount = completedActionIds.length

  const readAction = useMemo(() => {
    if (currentSession && sessionTarget.source && sessionTarget.ang) {
      return {
        title: homeMessages.resumeReading,
        body: learningGoal === 'understand'
          ? homeMessages.resumeStudyBody
          : homeMessages.resumeReadingBody,
        onAction: () => navigate(`/study?source=${sessionTarget.source}&ang=${sessionTarget.ang}`),
      }
    }

    return {
      title: homeMessages.openTodaysHukamnama,
      body: learningGoal === 'understand'
        ? homeMessages.todaysMeaningBody
        : homeMessages.todaysReadingBody,
      onAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
    }
  }, [currentSession, homeMessages, hukamnama, learningGoal, navigate, sessionTarget.ang, sessionTarget.source])

  const heroPrimary = useMemo(() => {
    if (showLearnHero) {
      return {
        eyebrow: 'Grow',
        title: learningGoal === 'habit'
          ? homeMessages.buildHabitTitle
          : learningGoal === 'understand'
            ? homeMessages.learnScriptTitle
            : homeMessages.buildConfidenceTitle,
        body: audience === 'child'
          ? homeMessages.childLearnBody
          : homeMessages.adultLearnBody,
        buttonLabel: 'Continue Learn',
        buttonAction: () => navigate('/learn'),
        secondaryLabel: homeMessages.openTodaysHukamnama,
        secondaryAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      }
    }

    if (currentSession && sessionTarget.source && sessionTarget.ang) {
      return {
        eyebrow: 'Read',
        title: homeMessages.pickUpPausedTitle,
        body: learningGoal === 'understand'
          ? homeMessages.resumeStudyBody
          : homeMessages.nitnemImmediateBody,
        buttonLabel: homeMessages.resumeReading,
        buttonAction: () => navigate(`/study?source=${sessionTarget.source}&ang=${sessionTarget.ang}`),
        secondaryLabel: homeMessages.openTodaysHukamnama,
        secondaryAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      }
    }

    return {
      eyebrow: 'Read',
      title: learningGoal === 'habit'
        ? homeMessages.beginTodayTitle
        : learningGoal === 'understand'
          ? homeMessages.beginTodayMeaningTitle
          : homeMessages.beginTodayTitle,
      body: learningGoal === 'understand'
        ? homeMessages.beginTodayMeaningBody
        : homeMessages.beginTodayBody,
      buttonLabel: homeMessages.openTodaysHukamnama,
      buttonAction: () => navigate(hukamnama ? `/study?hukamnamaDate=${hukamnama.date}` : '/banis'),
      secondaryLabel: homeMessages.browseRead,
      secondaryAction: () => navigate('/banis'),
    }
  }, [audience, currentSession, homeMessages, hukamnama, learningGoal, navigate, sessionTarget.ang, sessionTarget.source, showLearnHero])

  const openGrowAction = () => {
    toggleDailyAction('grow')
    if (nextJourneyStep?.type === 'study' && nextJourneyStep.source && nextJourneyStep.ang) {
      navigate(`/study?source=${nextJourneyStep.source}&ang=${nextJourneyStep.ang}&bani=${encodeURIComponent(nextJourneyStep.baniTitle ?? activeJourney?.title ?? 'Journey')}`)
      return
    }
    if (nextJourneyStep?.type === 'review') {
      navigate('/vocab')
      return
    }
    navigate('/learn')
  }

  const openReadAction = () => {
    toggleDailyAction('read')
    readAction.onAction()
  }

  const openReviewAction = () => {
    toggleDailyAction('review')
    navigate('/vocab')
  }

  const nextStep = (() => {
    if (!isDailyActionDone('read')) {
      return {
        title: readAction.title,
        body: readAction.body,
        actionLabel: homeCopy.doReadingStep,
        onAction: openReadAction,
      }
    }

    if (!isDailyActionDone('grow')) {
      return {
        title: activeJourney ? activeJourney.title : 'Continue Learn',
        body: nextJourneyStep
          ? nextJourneyStep.title
          : `${learningLevelLabels[learningLevel]} ${homeMessages.trackSuffix} should stay active today.`,
        actionLabel: homeCopy.doGrowthStep,
        onAction: openGrowAction,
      }
    }

    if (!isDailyActionDone('review')) {
      return {
        title: dueReview.length > 0 ? homeMessages.reviewDue(dueReview.length) : 'Quick review pass',
        body: 'Use saved words and phrases to keep comprehension sticky.',
        actionLabel: homeCopy.doReviewStep,
        onAction: openReviewAction,
      }
    }

    return {
      title: homeCopy.coreLoopComplete,
      body: homeCopy.coreLoopCompleteBody,
      actionLabel: homeCopy.openSaved,
      onAction: () => navigate('/library'),
    }
  })()

  const todaysPickPreview = useMemo(() => {
    if (!todaysPick) return null
    const previewLine = todaysPick.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? todaysPick.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? todaysPick.lines?.find(line => line.gurmukhi.trim())
    if (!previewLine) return todaysPick
    return {
      ...todaysPick,
      gurmukhi: previewLine.gurmukhi,
      transliteration: previewLine.transliteration || todaysPick.transliteration,
      translation_en: previewLine.translation_en || todaysPick.translation_en,
      translation_hi: previewLine.translation_hi || todaysPick.translation_hi,
      translation_pa: previewLine.translation_pa || todaysPick.translation_pa,
      lines: [previewLine],
    }
  }, [todaysPick])
  const hukamnamaPreviewLine = useMemo(() => {
    if (!hukamnama) return null
    return hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? hukamnama.entry.lines?.find(line => line.gurmukhi.trim())
      ?? null
  }, [hukamnama])
  const hukamnamaMeaningPreview = useMemo(() => {
    if (!hukamnama || meaningLanguage === 'none') return ''
    if (hukamnamaPreviewLine) {
      return getLineMeaningText(hukamnamaPreviewLine, meaningLanguage, englishSource)
    }
    return getEntryMeaningText(hukamnama.entry, meaningLanguage, englishSource)
  }, [englishSource, hukamnama, hukamnamaPreviewLine, meaningLanguage])
  const homeAppMatches = useMemo(
    () => homeSearchQuery.trim().length >= 2 ? getAppSearchMatches(homeSearchQuery, 'all').slice(0, 6) : [],
    [homeSearchQuery]
  )
  const homeAngTargets = useMemo(
    () => getAngTargets(homeSearchQuery, 'all'),
    [homeSearchQuery]
  )
  const groupedHomeSearchResults = useMemo(
    () => groupSearchResults(homeSearchResults).slice(0, 4),
    [homeSearchResults]
  )

  useEffect(() => {
    const trimmed = homeSearchQuery.trim()
    let cancelled = false

    if (homeSearchDebounceRef.current !== null) {
      window.clearTimeout(homeSearchDebounceRef.current)
      homeSearchDebounceRef.current = null
    }

    if (trimmed.length < 2) {
      setHomeSearchResults([])
      setHomeSearchError(false)
      setHomeSearching(false)
      return
    }

    setHomeSearchError(false)
    setHomeSearching(true)
    homeSearchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await fetchSearch(trimmed, 8, 'all')
        if (cancelled) return
        setHomeSearchResults(results)
        setHomeSearchError(false)
      } catch {
        if (cancelled) return
        setHomeSearchResults([])
        setHomeSearchError(true)
      } finally {
        if (!cancelled) {
          setHomeSearching(false)
        }
      }
    }, 260)

    return () => {
      cancelled = true
      if (homeSearchDebounceRef.current !== null) {
        window.clearTimeout(homeSearchDebounceRef.current)
        homeSearchDebounceRef.current = null
      }
    }
  }, [homeSearchQuery])

  const handleNitnemReset = () => {
    if (confirmingNitnemReset) {
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
        nitnemResetConfirmRef.current = null
      }
      setConfirmingNitnemReset(false)
      resetSelections()
      return
    }

    setConfirmingNitnemReset(true)
    if (nitnemResetConfirmRef.current !== null) {
      window.clearTimeout(nitnemResetConfirmRef.current)
    }
    nitnemResetConfirmRef.current = window.setTimeout(() => {
      nitnemResetConfirmRef.current = null
      setConfirmingNitnemReset(false)
    }, 3000)
  }

  const handleShareProgress = async () => {
    const text = [
      `${editorial?.brand.name ?? 'NaamRas'} progress note`,
      `${streak} day streak`,
      `${masteredSymbols.length} symbols mastered`,
      `${completedLessons.length} lessons completed`,
      `${nitnemDone} of ${selectedNitnemOptions.length} daily Nitnem banis complete today`,
      activeJourney ? `${activeJourney.title}: ${activeJourneyProgress?.completedStepIds.length ?? 0}/${activeJourney.steps.length} steps` : '',
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(text)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className="page-shell animate-fade-in" data-testid="page-home" data-page="home">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <p className="eyebrow">{editorial?.brand.domain ?? 'Naamras.xyz'}</p>
          <p className="font-display text-[3.1rem] text-ink dark:text-dark-text leading-none mt-2">
            {editorial?.brand.name ?? 'NaamRas'}
          </p>
          <p className="font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/62 mt-3 max-w-[26ch]">
            {editorial?.brand.promise ?? copy.home.promise}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="section-shell-quiet min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/75 dark:text-dark-text/75 active:scale-95 transition-transform duration-150"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            data-testid="home-theme-toggle"
          >
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <StreakBadge streak={streak} />
        </div>
      </div>

      <div className="mb-4">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
          {formatUiDate(locale)}
        </p>
        <h1 className="font-display text-[1.8rem] leading-none text-ink dark:text-dark-text mt-2">
          {copy.home.greeting}
        </h1>
      </div>

      <section
        className="hero-surface ornate-top p-6 mb-5 animate-slide-up stagger-1"
        aria-labelledby="home-hero-title"
        data-testid="home-hero"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="eyebrow">{editorial?.home.heroEyebrow ?? heroPrimary.eyebrow}</span>
          <span className="chip-pill">{learningLevelLabels[learningLevel]}</span>
        </div>
        <h2 id="home-hero-title" className="font-display text-[2.35rem] leading-[0.95] text-ink dark:text-dark-text max-w-[20ch]">
          {editorial?.home.heroTitle ?? heroPrimary.title}
        </h2>
        <p className="font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70 mt-3 max-w-[34ch]">
          {editorial?.home.heroBody ?? heroPrimary.body}
        </p>

        <div className="section-shell-quiet mt-5 p-4">
          <p className="eyebrow">{heroPrimary.eyebrow}</p>
          <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
            {heroPrimary.title}
          </p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">
            {heroPrimary.body}
          </p>
        </div>

        {hukamnamaLoading ? (
          <div className="section-shell-quiet mt-5 p-4 animate-pulse">
            <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-24 mb-3" />
            <div className="h-6 rounded bg-sand/20 dark:bg-dark-text/10 mb-2" />
            <div className="h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
          </div>
        ) : hukamnama ? (
          <div className="section-shell-quiet mt-5 p-4">
            <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
            <p className="font-sans text-[11px] text-ink/65 dark:text-dark-text/65 mb-2">
              {hukamnama.entry.raag ? `${hukamnama.entry.raag} · ` : ''}
              {hukamnama.entry.scripture} · Ang {hukamnama.ang}
            </p>
            <p
              lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
              className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-2xl leading-relaxed text-ink dark:text-dark-text line-clamp-3`}
            >
              {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
            </p>
            {hukamnamaMeaningPreview && (
              <p className={`mt-3 text-sm text-ink/70 dark:text-dark-text/70 line-clamp-2 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                {hukamnamaMeaningPreview}
              </p>
            )}
          </div>
        ) : hukamnamaError ? (
          <div className="section-shell-quiet mt-5 p-4" data-testid="home-hukamnama-error">
            <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
            <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
              Couldn't load today's hukamnama right now. You can still continue into Read.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 mt-5">
          <button
            onClick={heroPrimary.buttonAction}
            className="min-h-[50px] rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold px-5 active:scale-95 transition-transform duration-150"
            data-testid="home-hero-primary-action"
          >
            {heroPrimary.buttonLabel}
          </button>
          <button
            onClick={heroPrimary.secondaryAction}
            className="min-h-[48px] rounded-full bg-white/70 dark:bg-dark-card/70 text-ink dark:text-dark-text font-sans text-sm font-medium px-5 border border-sand/15 dark:border-dark-text/10 active:scale-95 transition-transform duration-150"
            data-testid="home-hero-secondary-action"
          >
            {heroPrimary.secondaryLabel}
          </button>
        </div>
      </section>

      <section
        className="section-shell p-5 mb-5 animate-slide-up stagger-2"
        aria-labelledby="home-smart-search-title"
        data-testid="home-smart-search"
        data-ai-surface="home-smart-search"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{editorial?.home.learnSearchEyebrow ?? 'Quick Find'}</p>
            <h2 id="home-smart-search-title" className="mt-2 font-display text-[1.85rem] leading-none text-ink dark:text-dark-text">
              {editorial?.home.learnSearchTitle ?? 'Search paths already inside the app.'}
            </h2>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">
              {editorial?.home.learnSearchBody ?? 'Type a topic, bani, shabad, or ang. Direct destinations appear first, then broader Gurbani search results.'}
            </p>
          </div>
          <div className="rounded-[22px] border border-gold/20 bg-white/72 p-3 text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_28px_rgba(224,154,70,0.12)] dark:border-gold/12 dark:bg-dark-surface/86 dark:text-gold-light dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.08),0_18px_32px_rgba(0,0,0,0.3)]">
            <IconSearch size={18} />
          </div>
        </div>

        <label
          htmlFor="home-smart-search-input"
          className="mt-5 flex items-center gap-3 rounded-[24px] border border-gold/18 bg-[linear-gradient(180deg,rgba(255,252,244,0.96),rgba(247,236,215,0.92))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_34px_rgba(77,53,22,0.12)] transition-shadow duration-300 focus-within:border-saffron/28 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_20px_36px_rgba(224,154,70,0.18)] dark:border-gold/12 dark:bg-[linear-gradient(180deg,rgba(36,27,46,0.96),rgba(27,20,38,0.94))] dark:shadow-[inset_0_1px_0_rgba(255,214,153,0.08),0_18px_34px_rgba(0,0,0,0.34)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/16 bg-white/85 text-saffron shadow-[0_10px_24px_rgba(224,154,70,0.18)] dark:border-gold/10 dark:bg-dark-card/92 dark:text-gold-light dark:shadow-[0_14px_24px_rgba(0,0,0,0.32)]">
            <IconSearch size={16} />
          </span>
          <input
            id="home-smart-search-input"
            name="home-smart-search"
            type="search"
            value={homeSearchQuery}
            onChange={(event) => setHomeSearchQuery(event.target.value)}
            placeholder={editorial?.home.learnSearchPlaceholder ?? 'Try anxiety, Japji Sahib, hukam, or Ang 12'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label="Search paths, banis, topics, or angs"
            className="w-full bg-transparent font-sans text-sm text-ink placeholder:text-ink/40 focus:outline-none dark:text-dark-text dark:placeholder:text-dark-text/36"
            data-testid="home-smart-search-input"
            data-ai-search-input="home-smart-search"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2" data-testid="home-smart-search-quick-links">
          <button
            type="button"
            onClick={() => navigate('/learn')}
            className="rounded-full border border-sand/20 bg-white/76 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
            data-testid="home-open-learn"
          >
            Continue Learn
          </button>
          <button
            type="button"
            onClick={() => navigate('/banis')}
            className="rounded-full border border-sand/20 bg-white/76 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-all duration-300 active:scale-[0.98] dark:border-dark-text/10 dark:bg-dark-card/78 dark:text-dark-text"
            data-testid="home-open-read"
          >
            Browse Read
          </button>
        </div>

        <div
          className="mt-4 space-y-3"
          aria-live="polite"
          data-testid="home-smart-search-results"
          data-ai-search-state={homeSearchQuery.trim().length >= 2 ? 'active' : 'idle'}
        >
          {homeSearchQuery.trim().length < 2 ? (
            <p className="font-sans text-xs leading-5 text-ink/46 dark:text-dark-text/46">
              Direct app paths appear first. Broader Gurbani results stay available underneath when the query needs it.
            </p>
          ) : null}

          {homeAngTargets.length > 0 ? (
            <div className="space-y-2" data-testid="home-smart-search-ang-results">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60">
                  Direct ang
                </p>
                <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60">
                  Open the page without running a word search
                </p>
              </div>
              {homeAngTargets.map(target => (
                <button
                  key={target.source}
                  type="button"
                  onClick={() => navigate(target.path)}
                  className="w-full rounded-[22px] border border-sand/16 bg-white/74 px-4 py-3 text-left transition-all duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-card/78"
                  data-ai-result-kind="ang"
                >
                  <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    Open {target.label} {target.kind} {homeSearchQuery.trim()}
                  </p>
                  <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">
                    Direct page lookup without leaving the home surface.
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {homeAppMatches.length > 0 ? (
            <div className="space-y-2" data-testid="home-smart-search-app-results">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60">
                  In the app
                </p>
                <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60">
                  Exact destinations first
                </p>
              </div>
              {homeAppMatches.map(match => (
                <button
                  key={match.key}
                  type="button"
                  onClick={() => navigate(match.path)}
                  className="w-full rounded-[24px] border border-saffron/20 bg-gradient-to-r from-saffron/8 to-saffron-light/10 px-4 py-3 text-left transition-all duration-300 active:scale-[0.99] dark:border-saffron/18 dark:from-saffron/12 dark:to-saffron-light/12"
                  data-ai-result-kind={match.kind}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text">{match.label}</p>
                      <p className="mt-1 font-sans text-xs text-ink/55 dark:text-dark-text/55">{match.detail}</p>
                    </div>
                    <span className="chip-pill">{match.kind === 'learn-topic' ? 'Learn' : 'Read'}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {homeSearching ? (
            <p className="px-1 font-sans text-xs text-ink/60 dark:text-dark-text/60">
              Searching Gurbani results...
            </p>
          ) : null}

          {homeSearchError ? (
            <p className="px-1 font-sans text-xs text-ink/65 dark:text-dark-text/65" data-testid="home-smart-search-error">
              Couldn't search right now. Try again.
            </p>
          ) : null}

          {!homeSearching && groupedHomeSearchResults.length > 0 ? (
            <div className="space-y-2" data-testid="home-smart-search-gurbani-results">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60">
                  Gurbani search
                </p>
                <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60">
                  Broader matches after direct paths
                </p>
              </div>
              {groupedHomeSearchResults.map(result => (
                <button
                  key={result.key}
                  type="button"
                  onClick={() => navigate(`/study?shabadId=${result.shabadId}&verseId=${result.verseId}`)}
                  className="w-full rounded-[22px] border border-sand/16 bg-white/74 px-4 py-3 text-left transition-all duration-300 active:scale-[0.99] dark:border-dark-text/10 dark:bg-dark-card/78"
                  data-ai-result-kind="gurbani-search"
                >
                  <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text">{result.gurmukhi}</p>
                  <p className="mt-0.5 font-sans text-xs text-ink/65 dark:text-dark-text/65">{result.transliteration}</p>
                  <p className="mt-0.5 font-sans text-xs text-ink/60 dark:text-dark-text/60">{result.translation_en}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.sourceName ? <span className="chip-pill">{result.sourceName}</span> : null}
                    {typeof result.pageNo === 'number' && result.pageNo > 0 ? <span className="chip-pill">{`Ang ${result.pageNo}`}</span> : null}
                    {result.matchCount > 1 ? <span className="chip-pill">{`${result.matchCount} matches`}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {homeSearchQuery.trim().length >= 2 && !homeSearching && !homeSearchError && homeAppMatches.length === 0 && homeAngTargets.length === 0 && groupedHomeSearchResults.length === 0 ? (
            <p className="px-1 font-sans text-xs text-ink/60 dark:text-dark-text/60">
              No in-app or Gurbani matches found yet.
            </p>
          ) : null}
        </div>
      </section>

      <section
        ref={todaysPathRef}
        tabIndex={-1}
        className="section-shell p-4 mb-5 animate-slide-up stagger-2 transition-[box-shadow,transform,border-color] duration-500"
        aria-labelledby="home-todays-path-title"
        data-testid="home-todays-path"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="home-todays-path-title" className="eyebrow">{homeCopy.todaysPath}</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
              {nextStep.title}
            </p>
            <p className="font-sans text-sm text-ink/74 dark:text-dark-text/76 mt-1">
              {editorial?.home.pathBodyPrefix ? `${editorial.home.pathBodyPrefix} ${nextStep.body}` : nextStep.body}
            </p>
          </div>
          <button
            onClick={handleShareProgress}
            className="min-h-[40px] min-w-[40px] rounded-full section-shell-quiet flex items-center justify-center text-gold dark:text-gold-light"
            aria-label={editorial?.home.shareProgress ?? homeCopy.shareProgress}
            data-testid="home-share-progress"
          >
            {showCopied ? <span className="font-sans text-[10px]">{commonCopy.copied}</span> : <IconShare size={16} />}
          </button>
        </div>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${(completedDailyCount / 3) * 100}%` }} />
        </div>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-2">
          {completedDailyCount} / 3 {homeCopy.coreActionsDone}
        </p>
        <div
          className="section-shell-quiet mt-4 p-4"
          data-testid="home-todays-path-lesson-summary"
          data-ai-surface="home-todays-path-lesson"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{editorial?.home.lessonEyebrow ?? "Today's Lesson"}</p>
              <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
                {dailyLesson.completedStepIds.length} of {dailyLesson.steps.length} steps done
              </p>
              <p className="mt-1 font-sans text-sm text-ink/60 dark:text-dark-text/60">
                {dailyLesson.steps[0]?.title ?? editorial?.home.lessonFallback ?? 'Open Learn to start today’s lesson.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="chip-pill">
                {Math.max(1, Math.round(dailyLesson.totalEstimatedSeconds / 60))} min
              </span>
              <button
                type="button"
                onClick={() => navigate('/learn')}
                className="font-sans text-xs font-semibold text-gold dark:text-gold-light"
                data-testid="home-open-daily-lesson"
              >
                Open Learn
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={nextStep.onAction}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[48px]"
          data-testid="home-todays-path-action"
        >
          {nextStep.actionLabel}
        </button>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={openReadAction}
            className="section-shell-quiet p-4 text-left active:scale-[0.99] transition-transform duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{homeCopy.read}</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                  {readAction.title}
                </p>
                <p className="font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76 mt-1">
                  {readAction.body}
                </p>
              </div>
              {isDailyActionDone('read') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>

          <button
            onClick={openGrowAction}
            className="section-shell-quiet p-4 text-left active:scale-[0.99] transition-transform duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{homeCopy.grow}</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                  {activeJourney ? activeJourney.title : `${learningLevelLabels[learningLevel]} ${homeMessages.trackSuffix}`}
                </p>
                <p className="font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76 mt-1">
                  {nextJourneyStep ? nextJourneyStep.title : homeCopy.keepGrowthActive}
                </p>
              </div>
              {isDailyActionDone('grow') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>

          <button
            onClick={openReviewAction}
            className="section-shell-quiet p-4 text-left active:scale-[0.99] transition-transform duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{homeCopy.review}</p>
                <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
                  {dueReview.length > 0 ? homeMessages.reviewDue(dueReview.length) : 'Quick review pass'}
                </p>
                <p className="font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76 mt-1">
                  {homeCopy.reviewReady}
                </p>
              </div>
              {isDailyActionDone('review') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>
        </div>
      </section>

      <section
        className="section-shell-quiet p-4 mb-5 animate-slide-up stagger-3"
        aria-labelledby="home-nitnem-title"
        data-testid="home-nitnem-progress"
      >
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setNitnemOpen(open => !open)}
            className="flex-1 text-left min-h-[44px]"
            aria-expanded={nitnemOpen}
            aria-controls="nitnem-progress-panel"
          >
            <p id="home-nitnem-title" className="eyebrow">{homeCopy.nitnemProgress}</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
              {nitnemDone} / {selectedNitnemOptions.length} {homeCopy.dailyBanisComplete}
            </p>
            <p className="mt-2 font-sans text-xs text-ink/60 dark:text-dark-text/62">
              {selectedNitnemOptions.length > 0
                ? `${selectedNitnemOptions[0]?.time} through ${selectedNitnemOptions[selectedNitnemOptions.length - 1]?.time} routes`
                : 'Choose the banis that make up your daily Nitnem.'}
            </p>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNitnemOpen(true)
                setNitnemEditing(editing => !editing)
              }}
              className="rounded-full section-shell px-3 py-2 font-sans text-xs font-medium text-gold dark:text-gold-light min-h-[40px]"
            >
              {nitnemEditing ? 'Done' : 'Customize'}
            </button>
            <button
              type="button"
              onClick={() => setNitnemOpen(open => !open)}
              className="min-h-[40px] min-w-[40px] rounded-full section-shell flex items-center justify-center text-gold dark:text-gold-light"
              aria-label={nitnemOpen ? 'Collapse nitnem progress' : 'Expand nitnem progress'}
            >
              {nitnemOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full transition-all duration-500"
            style={{ width: `${nitnemProgressPct}%` }}
          />
        </div>
        {nitnemOpen && (
          <div id="nitnem-progress-panel" className="mt-4 space-y-4">
            {(['Morning', 'Evening', 'Night'] as const).map(time => (
              groupedNitnemOptions[time].length > 0 ? (
                <div key={time}>
                  <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light mb-2">
                    {time}
                  </p>
                  <div className="space-y-2">
                    {groupedNitnemOptions[time].map(option => {
                      const done = isComplete(option.id)
                      return (
                        <div key={option.id} className="section-shell px-3 py-3 flex items-center gap-3">
                          <button
                            onClick={() => done ? unmarkComplete(option.id) : markComplete(option.id)}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              done ? 'bg-saffron border-saffron text-white' : 'border-sand/35 dark:border-dark-text/20 text-transparent'
                            }`}
                            aria-label={done ? `Mark ${option.name} incomplete` : `Mark ${option.name} complete`}
                          >
                            <IconCheck size={14} />
                          </button>
                          <button
                            onClick={() => navigate(buildNitnemStudyPath(option))}
                            className="flex-1 text-left"
                          >
                            <p className={`font-sans text-sm ${done ? 'text-ink/50 dark:text-dark-text/50 line-through' : 'text-ink dark:text-dark-text'}`}>
                              {option.name}
                            </p>
                            <p className="font-sans text-[11px] text-ink/60 dark:text-dark-text/60 mt-1">
                              {getNitnemOptionDetail(option)}
                            </p>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null
            ))}

            {nitnemEditing && (
              <div className="section-shell px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Customize Daily Nitnem</p>
                    <p className="mt-2 font-sans text-sm text-ink/60 dark:text-dark-text/60">
                      Add or remove your daily routes. Length choices for supported banis stay inside the reader.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNitnemReset}
                    className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
                    data-testid="home-nitnem-reset"
                  >
                    {confirmingNitnemReset ? 'Tap again to reset' : 'Reset'}
                  </button>
                </div>

                <div className="space-y-3 mt-4">
                  {(['Morning', 'Evening', 'Night'] as const).map(time => (
                    <div key={`manage-${time}`}>
                      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light mb-2">
                        {time}
                      </p>
                      <div className="space-y-2">
                        {availableNitnemOptions
                          .filter(option => option.time === time)
                          .map(option => {
                            const selected = selectedIds.includes(option.id)
                            return (
                              <button
                                key={`manage-${option.id}`}
                                type="button"
                                onClick={() => toggleSelected(option.id)}
                                className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors duration-300 ${
                                  selected
                                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white border-saffron'
                                    : 'bg-white/70 dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-sans text-sm font-semibold">{option.name}</p>
                                    <p className={`mt-1 font-sans text-xs ${selected ? 'text-white/80' : 'text-ink/55 dark:text-dark-text/55'}`}>
                                      {getNitnemOptionDetail(option)}
                                    </p>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] ${
                                    selected
                                      ? 'bg-white/15 text-white'
                                      : 'bg-gold/10 text-gold dark:text-gold-light'
                                  }`}>
                                    {selected ? 'Shown' : 'Hidden'}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section
        className="section-shell p-4 mb-5 animate-slide-up stagger-4"
        aria-labelledby="home-saved-title"
        data-testid="home-saved-overview"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{homeCopy.savedEyebrow}</p>
            <h3 id="home-saved-title" className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">
              {editorial?.home.savedTitle ?? homeCopy.savedTitle}
            </h3>
          </div>
          <button
            onClick={() => navigate('/library')}
            className="font-sans text-sm text-gold dark:text-gold-light flex items-center gap-1"
          >
            {homeCopy.openSaved} <IconArrowRight size={14} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedWords}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{homeCopy.words}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedPhrases}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{homeCopy.phrases}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{progressItems.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{homeCopy.inProgress}</p>
          </div>
        </div>
      </section>

      {(progressItems.length > 0 || todaysPick || recentlyStudied.length > 0) && (
        <section
          className="section-shell-quiet p-4 animate-slide-up stagger-5"
          aria-labelledby="home-discovery-title"
          data-testid="home-discovery-history"
        >
          <p id="home-discovery-title" className="eyebrow mb-4">{editorial?.home.discoveryEyebrow ?? homeCopy.discoveryHistory}</p>

          {progressItems.length > 0 && (
            <div className="mb-4">
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mb-2">{homeCopy.inProgressBanis}</p>
              <div className="space-y-2">
                {progressItems.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(buildCanonicalBaniStudyPath(p))}
                    className="w-full section-shell px-4 py-3 text-left"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-sans text-sm text-ink dark:text-dark-text">{p.name}</p>
                      <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60">{p.pct}%</p>
                    </div>
                    <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mb-2">{homeCopy.todaysPick}</p>
              {pickLoading ? (
                <div className="section-shell px-4 py-4 animate-pulse">
                  <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-20 mb-3" />
                  <div className="h-6 rounded bg-sand/20 dark:bg-dark-text/10 mb-2" />
                </div>
              ) : todaysPickPreview ? (
                <button
                  onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
                  className="w-full section-shell px-4 py-4 text-left"
                >
                  <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                      {homeCopy.todaysPick} · {todaysPickPreview.scripture} · Ang {todaysPickPreview.ang}
                  </p>
                  <p
                    lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                    className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-xl leading-relaxed text-ink dark:text-dark-text mt-2 line-clamp-2`}
                  >
                    {renderScriptText(todaysPickPreview.gurmukhi, scriptMode)}
                  </p>
                  {meaningLanguage !== 'none' && (
                    <p className={`mt-2 text-sm text-ink/65 dark:text-dark-text/65 line-clamp-2 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                      {getEntryMeaningText(todaysPickPreview, meaningLanguage, englishSource)}
                    </p>
                  )}
                </button>
              ) : (
                <p className="font-sans text-sm text-ink/55 dark:text-dark-text/55">{homeCopy.noVerseAvailable}</p>
              )}
            </div>

            {recentlyStudied.length > 0 && (
              <div>
                <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mb-2">{homeCopy.recentlyStudied}</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {recentlyStudied.map(entry => (
                    <button
                      key={entry.id}
                      className="w-44 flex-shrink-0 section-shell px-4 py-4 text-left sm:w-52"
                      onClick={() => {
                        const parts = entry.id.split('-')
                        if (parts.length >= 2) navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
                      }}
                    >
                      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                        {entry.scripture}
                      </p>
                      <p
                        lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                        className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-sm leading-7 text-ink dark:text-dark-text mt-2 line-clamp-3`}
                      >
                        {renderScriptText(entry.gurmukhi, scriptMode)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
