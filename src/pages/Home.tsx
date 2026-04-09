import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import type { StudiedEntry, UiLocale } from '../types'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import { getLearningLevelLabels } from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'
import { getDailyPickAng } from '../utils/dailyPick'
import { formatUiDate } from '../utils/formatUiDate'
import { buildCanonicalBaniStudyPath } from '../utils/baniRouteResolver'

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

const NITNEM_TIME_ORDER: Record<NitnemRouteOption['time'], number> = {
  Morning: 0,
  Evening: 1,
  Night: 2,
}

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
  const { getProgress } = useReadingProgressStore()
  const vocab = useVocabStore(s => s.vocab)
  const { masteredSymbols, completedLessons, journeys, activeJourneyId } = useLearningStore()
  const {
    learningLevel,
    audience,
    learningGoal,
    openOnboarding,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)
  const commonCopy = copy.common
  const homeCopy = copy.home
  const homeMessages = HOME_MESSAGES[locale]
  const learningLevelLabels = getLearningLevelLabels(locale)
  const [nitnemOpen, setNitnemOpen] = useState(false)
  const [nitnemEditing, setNitnemEditing] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [highlightTodaysPath, setHighlightTodaysPath] = useState(false)
  const todaysPathRef = useRef<HTMLElement | null>(null)
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)

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
      setHighlightTodaysPath(true)
      globalThis.requestAnimationFrame(() => {
        todaysPathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      highlightTimer = window.setTimeout(() => {
        setHighlightTodaysPath(false)
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
  const { data: hukamnama, loading: hukamnamaLoading } = useHukamnama()

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
  const dueReview = vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= Date.now())
  const savedWords = vocab.filter(entry => (entry.kind ?? 'word') === 'word').length
  const savedPhrases = vocab.filter(entry => (entry.kind ?? 'word') === 'phrase').length

  const PROGRESS_BANIS = BANIS.filter(b =>
    ['japji-sahib', 'sukhmani-sahib', 'anand-sahib', 'rehras-sahib', 'jaap-sahib'].includes(b.id)
  )
  const progressItems = PROGRESS_BANIS
    .map(b => ({ ...b, ...getProgress(b.id) }))
    .filter(p => p.done > 0)

  const recentlyStudied = [...studied]
    .sort((a: StudiedEntry, b: StudiedEntry) =>
      new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
    )
    .slice(0, 5)
    .map((s: StudiedEntry) => {
      const entry = getEntryById(s.id)
      return entry ? { ...entry, swipedAt: s.swipedAt } : null
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

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

  const nextStep = useMemo(() => {
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
  }, [activeJourney, dueReview.length, homeCopy, homeMessages, isDailyActionDone, learningLevel, learningLevelLabels, navigate, nextJourneyStep, readAction])

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

  const handleShareProgress = async () => {
    const text = [
      'Nitnem progress update',
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
    <div className="page-shell animate-fade-in">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <p className="font-display text-3xl text-ink dark:text-dark-text leading-none">Nitnem</p>
          <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-1">
            {copy.home.promise}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="section-shell-quiet min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/75 dark:text-dark-text/75 active:scale-95 transition-transform duration-150"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
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

      <section className="hero-surface ornate-top p-6 mb-5 animate-slide-up stagger-1">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="eyebrow">{heroPrimary.eyebrow}</span>
          <span className="chip-pill">{learningLevelLabels[learningLevel]}</span>
        </div>
        <h2 className="font-display text-[2rem] leading-[0.95] text-ink dark:text-dark-text max-w-[12ch]">
          {heroPrimary.title}
        </h2>
        <p className="font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70 mt-3 max-w-[32ch]">
          {heroPrimary.body}
        </p>

        {hukamnamaLoading ? (
          <div className="section-shell-quiet mt-5 p-4 animate-pulse">
            <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-24 mb-3" />
            <div className="h-6 rounded bg-sand/20 dark:bg-dark-text/10 mb-2" />
            <div className="h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
          </div>
        ) : hukamnama ? (
          <div className="section-shell-quiet mt-5 p-4">
            <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
            <p className="font-sans text-[11px] text-ink/50 dark:text-dark-text/50 mb-2">
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
        ) : null}

        <div className="grid grid-cols-1 gap-3 mt-5">
          <button
            onClick={heroPrimary.buttonAction}
            className="min-h-[50px] rounded-full bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold px-5 active:scale-95 transition-transform duration-150"
          >
            {heroPrimary.buttonLabel}
          </button>
          <button
            onClick={heroPrimary.secondaryAction}
            className="min-h-[48px] rounded-full bg-white/70 dark:bg-dark-card/70 text-ink dark:text-dark-text font-sans text-sm font-medium px-5 border border-sand/15 dark:border-dark-text/10 active:scale-95 transition-transform duration-150"
          >
            {heroPrimary.secondaryLabel}
          </button>
        </div>
      </section>

      <button
        onClick={() => navigate('/banis')}
        className="section-shell-quiet w-full flex items-center gap-3 px-4 py-3 mb-5 active:scale-[0.99] transition-transform duration-150"
      >
        <IconSearch size={16} className="text-ink/35 dark:text-dark-text/35" />
        <span className="font-sans text-sm text-ink/45 dark:text-dark-text/45">
          {homeCopy.searchPlaceholder}
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/learn?view=daily')}
        className="section-shell-quiet w-full px-4 py-4 mb-5 text-left active:scale-[0.99] transition-transform duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Today&apos;s Lesson</p>
            <p className="mt-2 font-sans text-base font-semibold text-ink dark:text-dark-text">
              {dailyLesson.completedStepIds.length} of {dailyLesson.steps.length} steps done
            </p>
            <p className="mt-1 font-sans text-sm text-ink/60 dark:text-dark-text/60">
              {dailyLesson.steps[0]?.title ?? 'Open Learn to start today’s lesson.'}
            </p>
          </div>
          <span className="chip-pill">
            {Math.max(1, Math.round(dailyLesson.totalEstimatedSeconds / 60))} min
          </span>
        </div>
      </button>

      <section
        ref={todaysPathRef}
        tabIndex={-1}
        className={`section-shell p-4 mb-5 animate-slide-up stagger-2 transition-[box-shadow,transform,border-color] duration-500 ${
          highlightTodaysPath
            ? 'border-gold/45 shadow-gold-strong ring-2 ring-gold/35 ring-offset-2 ring-offset-parchment dark:ring-offset-dark-bg'
            : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{homeCopy.todaysPath}</p>
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text mt-2">
              {nextStep.title}
            </p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-1">
              {nextStep.body}
            </p>
          </div>
          <button
            onClick={handleShareProgress}
            className="min-h-[40px] min-w-[40px] rounded-full section-shell-quiet flex items-center justify-center text-gold dark:text-gold-light"
            aria-label={homeCopy.shareProgress}
          >
            {showCopied ? <span className="font-sans text-[10px]">{commonCopy.copied}</span> : <IconShare size={16} />}
          </button>
        </div>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full" style={{ width: `${(completedDailyCount / 3) * 100}%` }} />
        </div>
        <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-2">
          {completedDailyCount} / 3 {homeCopy.coreActionsDone}
        </p>
        <button
          onClick={nextStep.onAction}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[48px]"
        >
          {nextStep.actionLabel}
        </button>

        <div className="grid grid-cols-1 gap-3 mt-4">
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
                <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
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
                <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
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
                <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-1">
                  {homeCopy.reviewReady}
                </p>
              </div>
              {isDailyActionDone('review') ? <IconCheck size={16} className="text-saffron dark:text-saffron-light" /> : null}
            </div>
          </button>
        </div>
      </section>

      <section className="section-shell-quiet p-4 mb-5 animate-slide-up stagger-3">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setNitnemOpen(open => !open)}
            className="flex-1 text-left min-h-[44px]"
            aria-label="Nitnem progress"
          >
            <p className="eyebrow">{homeCopy.nitnemProgress}</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-1">
              {nitnemDone} / {selectedNitnemOptions.length} {homeCopy.dailyBanisComplete}
            </p>
            <p className="mt-2 font-sans text-xs text-ink/50 dark:text-dark-text/50">
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
          <div className="mt-4 space-y-4">
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
                            <p className={`font-sans text-sm ${done ? 'text-ink/40 dark:text-dark-text/40 line-through' : 'text-ink dark:text-dark-text'}`}>
                              {option.name}
                            </p>
                            <p className="font-sans text-[11px] text-ink/45 dark:text-dark-text/45 mt-1">
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
                      Add or remove your daily routes. Adjustable STTM length stays inside the reader for supported Sundar Gutka banis.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetSelections}
                    className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
                  >
                    Reset
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

      <section className="section-shell p-4 mb-5 animate-slide-up stagger-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{homeCopy.savedEyebrow}</p>
            <h3 className="font-display text-3xl text-ink dark:text-dark-text leading-none mt-2">{homeCopy.savedTitle}</h3>
          </div>
          <button
            onClick={() => navigate('/library')}
            className="font-sans text-sm text-gold dark:text-gold-light flex items-center gap-1"
          >
            {homeCopy.openSaved} <IconArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedWords}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{homeCopy.words}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedPhrases}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{homeCopy.phrases}</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{progressItems.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">{homeCopy.inProgress}</p>
          </div>
        </div>
      </section>

      {(progressItems.length > 0 || todaysPick || recentlyStudied.length > 0) && (
        <section className="section-shell-quiet p-4 animate-slide-up stagger-5">
          <p className="eyebrow mb-4">{homeCopy.discoveryHistory}</p>

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
                      <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45">{p.pct}%</p>
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
                      className="flex-shrink-0 w-52 section-shell px-4 py-4 text-left"
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
