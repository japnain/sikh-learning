import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconBanis,
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconHeart,
  IconLibrary,
  IconLayers,
  IconLeaf,
  IconMoon,
  IconSun,
} from '../components/icons'
import NaamRasLogoMark from '../components/NaamRasLogoMark'
import StreakBadge from '../components/StreakBadge'
import { useHukamnama } from '../hooks/useHukamnama'
import useLearnHomeCatalog from '../hooks/useLearnHomeCatalog'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLearningStore } from '../store/learning'
import { useLocaleStore } from '../store/locale'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { buildNitnemStudyPath, NITNEM_ROUTE_OPTIONS, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import { buildVocabFeedbackId, useSavedFeedbackStore, type SavedFeedbackKind } from '../store/savedFeedback'
import type { UiLocale, VocabEntry } from '../types'
import { isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { getSundarGutkaLengthDetail, isSundarGutkaLengthSupportedBaniId } from '../utils/sundarGutkaLength'
import { getLearningLevelLabels } from '../utils/translations'
import { getUiCopy } from '../utils/uiCopy'
import { formatUiDate } from '../utils/formatUiDate'
import { toLocalDayStamp } from '../utils/learnDates'
import { getLearnItemLabel } from '../utils/learnExperience'
import { getLearnHomeSavedItems, getTodayLearnHomeSurface } from '../utils/learnHomeExperience'
import { buildLearnDetailPath } from '../utils/learnRails'
import { buildSavedStudyPath } from '../utils/savedStudyPath'
import { getEditorialCopy } from '../content/editorialCopy'
import featuredInstrumentSrc from '../assets/home-calm/featured-instrument.webp'
import ardaasHukamnamaPixelMotifSrc from '../assets/home-calm/ardaas-hukamnama-pixel-motif.webp'
import guidancePixelMotifSrc from '../assets/home-calm/guidance-pixel-motif.webp'
import nitnemPixelMotifSrc from '../assets/home-calm/nitnem-pixel-motif.webp'

const READ_TODAY_HIGHLIGHT_CLASSES = [
  'border-gold/45',
  'shadow-gold-strong',
  'ring-2',
  'ring-gold/35',
  'ring-offset-2',
  'ring-offset-parchment',
  'dark:ring-offset-dark-bg',
]

const SOURCE_SHORT_NAME: Record<string, string> = {
  G: 'SGGS',
  D: 'DG',
  B: 'BGV',
  A: 'AK',
}

type HomeSavedPreviewItem = {
  id: string
  kind: 'learn' | 'passage' | 'vocab'
  feedbackKind: SavedFeedbackKind
  label: string
  title: string
  detail: string
  path: string
  meta?: string
}

type HomeHeroRevealStyle = CSSProperties & {
  '--home-hero-reveal': string
  '--home-hero-pointer-x': string
  '--home-hero-pointer-y': string
  '--home-hero-parallax-x': string
  '--home-hero-landscape-offset': string
  '--home-hero-content-offset': string
  '--home-hero-image-lock': string
  '--home-hero-image-scale': string
  '--home-hero-image-y': string
}

const HOME_HERO_CONTENT_OFFSET_REM = 8.5
const HOME_HERO_REVEAL_DISTANCE_PX = 380

function useHomeHeroReveal() {
  const rootRef = useRef<HTMLElement | null>(null)
  const landscapeRef = useRef<HTMLSpanElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const valuesRef = useRef({ reveal: 0, pointerX: 0, pointerY: 0 })
  const [style, setStyle] = useState<HomeHeroRevealStyle>({
    '--home-hero-reveal': '0',
    '--home-hero-pointer-x': '0',
    '--home-hero-pointer-y': '0',
    '--home-hero-parallax-x': '0rem',
    '--home-hero-landscape-offset': '0.4rem',
    '--home-hero-content-offset': `${HOME_HERO_CONTENT_OFFSET_REM}rem`,
    '--home-hero-image-lock': '0px',
    '--home-hero-image-scale': '1',
    '--home-hero-image-y': '0rem',
  })

  const applyStyle = useCallback(() => {
    frameRef.current = null
    const inverseReveal = 1 - valuesRef.current.reveal
    const scrollY = window.scrollY
    const imageLock = scrollY * (0.62 + valuesRef.current.reveal * 0.38)
    const next: HomeHeroRevealStyle = {
      '--home-hero-reveal': valuesRef.current.reveal.toFixed(3),
      '--home-hero-pointer-x': valuesRef.current.pointerX.toFixed(3),
      '--home-hero-pointer-y': valuesRef.current.pointerY.toFixed(3),
      '--home-hero-parallax-x': `${(-valuesRef.current.pointerX * 0.42).toFixed(3)}rem`,
      '--home-hero-landscape-offset': '0.4rem',
      '--home-hero-content-offset': `${(inverseReveal * HOME_HERO_CONTENT_OFFSET_REM).toFixed(3)}rem`,
      '--home-hero-image-lock': `${imageLock.toFixed(1)}px`,
      '--home-hero-image-scale': `${(1 + valuesRef.current.reveal * 0.12).toFixed(3)}`,
      '--home-hero-image-y': '0rem',
    }
    setStyle(current => (
      current['--home-hero-reveal'] === next['--home-hero-reveal']
      && current['--home-hero-pointer-x'] === next['--home-hero-pointer-x']
      && current['--home-hero-pointer-y'] === next['--home-hero-pointer-y']
      && current['--home-hero-parallax-x'] === next['--home-hero-parallax-x']
      && current['--home-hero-landscape-offset'] === next['--home-hero-landscape-offset']
      && current['--home-hero-content-offset'] === next['--home-hero-content-offset']
      && current['--home-hero-image-lock'] === next['--home-hero-image-lock']
      && current['--home-hero-image-scale'] === next['--home-hero-image-scale']
      && current['--home-hero-image-y'] === next['--home-hero-image-y']
        ? current
        : next
    ))
  }, [])

  const scheduleStyle = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = window.requestAnimationFrame(applyStyle)
  }, [applyStyle])

  const updateReveal = useCallback(() => {
    const root = rootRef.current
    const rootTop = root?.getBoundingClientRect().top ?? 0
    const rawReveal = Math.max(0, Math.min(1, -rootTop / HOME_HERO_REVEAL_DISTANCE_PX))
    valuesRef.current.reveal = 1 - Math.pow(1 - rawReveal, 1.45)
    scheduleStyle()
  }, [scheduleStyle])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) {
      valuesRef.current.reveal = 1
      valuesRef.current.pointerX = 0
      valuesRef.current.pointerY = 0
      scheduleStyle()
      return undefined
    }

    updateReveal()
    const handleResize = () => updateReveal()
    window.addEventListener('scroll', updateReveal, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', updateReveal)
      window.removeEventListener('resize', handleResize)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [scheduleStyle, updateReveal])

  const updatePointer = useCallback((clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect()
    valuesRef.current.pointerX = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2))
    valuesRef.current.pointerY = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.5) * 2))
    scheduleStyle()
  }, [scheduleStyle])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    updatePointer(event.clientX, event.clientY, event.currentTarget)
  }, [updatePointer])

  const handlePointerLeave = useCallback(() => {
    valuesRef.current.pointerX = 0
    valuesRef.current.pointerY = 0
    scheduleStyle()
  }, [scheduleStyle])

  const handleTouchMove = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    updatePointer(touch.clientX, touch.clientY, event.currentTarget)
  }, [updatePointer])

  return {
    rootRef,
    landscapeRef,
    style,
    handlePointerMove,
    handlePointerLeave,
    handleTouchMove,
  }
}

const HOME_SAVED_PREVIEW_APPEARANCE: Record<
  HomeSavedPreviewItem['kind'],
  {
    icon: typeof IconLibrary
    badgeClassName: string
    surfaceClassName: string
    detailClassName: string
  }
> = {
  learn: {
    icon: IconLibrary,
    badgeClassName: 'bg-gold/12 text-gold dark:bg-gold/14 dark:text-gold-light',
    surfaceClassName: 'border-gold/16 bg-[linear-gradient(180deg,rgba(255,250,241,0.94),rgba(244,230,205,0.84))] dark:border-gold/16 dark:bg-[linear-gradient(180deg,rgba(42,31,57,0.96),rgba(28,21,40,0.92))]',
    detailClassName: 'text-ink/65 dark:text-dark-text/70',
  },
  passage: {
    icon: IconBookmarkFilled,
    badgeClassName: 'bg-saffron/12 text-saffron dark:bg-saffron/12 dark:text-saffron-light',
    surfaceClassName: 'border-saffron/14 bg-[linear-gradient(180deg,rgba(255,249,238,0.96),rgba(246,232,208,0.84))] dark:border-saffron/18 dark:bg-[linear-gradient(180deg,rgba(40,29,55,0.96),rgba(24,19,36,0.92))]',
    detailClassName: 'text-saffron dark:text-saffron-light',
  },
  vocab: {
    icon: IconCheck,
    badgeClassName: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/14 dark:text-emerald-300',
    surfaceClassName: 'border-emerald-500/14 bg-[linear-gradient(180deg,rgba(249,252,246,0.96),rgba(238,245,236,0.86))] dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(31,39,42,0.96),rgba(20,28,30,0.92))]',
    detailClassName: 'text-ink/70 dark:text-dark-text/70',
  },
}

function formatSavedPassageReference(source: string, ang: number, verseId?: number): string {
  const sourceLabel = SOURCE_SHORT_NAME[source] ?? source.toUpperCase()
  return verseId ? `${sourceLabel} · Ang ${ang} · Verse ${verseId}` : `${sourceLabel} · Ang ${ang}`
}

function compareSavedAtDesc(
  left: { savedAt: string },
  right: { savedAt: string }
): number {
  return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime()
}

function getVocabPreviewDetail(entry: VocabEntry, locale: UiLocale): string {
  if (locale === 'pa' && entry.meaning_pa.trim()) return entry.meaning_pa
  if (locale === 'hi' && entry.meaning_hi.trim()) return entry.meaning_hi
  if (entry.meaning_en.trim()) return entry.meaning_en
  if (entry.transliteration.trim()) return entry.transliteration
  return entry.scripture
}

const HOME_MESSAGES: Record<UiLocale, {
  resumeStudyBody: string
  openTodaysHukamnama: string
  todaysMeaningBody: string
  todaysReadingBody: string
  browseReadBody: string
  buildHabitTitle: string
  learnScriptTitle: string
  buildConfidenceTitle: string
  childLearnBody: string
  adultLearnBody: string
  pickUpPausedTitle: string
  nitnemImmediateBody: string
  dailyNitnem: string
  nitnemHeroTitle: string
  nitnemHeroBody: string
  nitnemRemaining: (count: number) => string
  nitnemCompleteToday: string
  nitnemCarouselLabel: (index: number, total: number) => string
  beginNitnem: string
  continueNitnem: string
  completeNitnemStep: string
  markNitnemIncomplete: string
  customizeNitnem: string
  hideNitnemCustomize: string
  chooseNitnemBody: string
  readTodayEyebrow: string
  readTodayTitle: string
  readTodayBody: string
  beginTodayTitle: string
  beginTodayMeaningTitle: string
  beginTodayMeaningBody: string
  beginTodayBody: string
  nextActionsBody: string
  openTodaysGuidance: string
  todayInLearn: string
  todayInLearnBody: string
  openLearnToday: string
  continueInLearn: string
  featuredShabad: string
  openFeaturedShabad: string
  featuredShabadUnavailable: string
  featuredShabadUnavailableBody: string
  topicGuideMeta: string
  learnFallbackTitle: string
  learnFallbackBody: string
  browseRead: string
  trackSuffix: string
  reviewDue: (count: number) => string
}> = {
  en: {
    resumeStudyBody: 'Return to the last passage you were studying so the context stays intact.',
    openTodaysHukamnama: 'Open Today’s Hukamnama',
    todaysMeaningBody: 'Start with the daily hukamnama and keep the meaning close.',
    todaysReadingBody: 'Start with the daily hukamnama and stay in a steady daily rhythm.',
    browseReadBody: 'Open the reading surfaces that are already live in the app without restarting from today’s hukamnama.',
    buildHabitTitle: 'Build a reading habit before adding more weight.',
    learnScriptTitle: 'Learn the script before chasing too much meaning.',
    buildConfidenceTitle: 'Build reading confidence before the overwhelm.',
    childLearnBody: 'Keep the next step simple: guided letters, short drills, then one real line at a time.',
    adultLearnBody: 'Start with guided letters, practice recognition, then move into live pankti when you are ready.',
    pickUpPausedTitle: 'Pick up exactly where you paused.',
    nitnemImmediateBody: 'Nitnem should feel immediate. Resume your last reading without hunting through the library.',
    dailyNitnem: 'Daily Nitnem',
    nitnemHeroTitle: 'Anchor the day in Nitnem.',
    nitnemHeroBody: 'A calm ritual card for the next bani that matters now, with the rest tucked behind it until you need it.',
    nitnemRemaining: (count) => `${count} remaining today`,
    nitnemCompleteToday: 'Complete for today',
    nitnemCarouselLabel: (index, total) => `Nitnem card ${index} of ${total}`,
    beginNitnem: 'Begin Nitnem',
    continueNitnem: 'Continue Nitnem',
    completeNitnemStep: 'Mark as complete',
    markNitnemIncomplete: 'Mark as incomplete',
    customizeNitnem: 'Customize Daily Nitnem',
    hideNitnemCustomize: 'Hide Nitnem options',
    chooseNitnemBody: 'Choose the banis that should appear in your daily Nitnem ritual.',
    readTodayEyebrow: 'Read Today',
    readTodayTitle: 'Start with Ardaas, then keep the next doorway close.',
    readTodayBody: 'Open the devotional flow first, follow the featured shabad when it lands, or browse scripture by source when you already know where to go.',
    beginTodayTitle: 'Begin with today’s hukamnama.',
    beginTodayMeaningTitle: 'Begin with today’s hukamnama and keep the meaning close.',
    beginTodayMeaningBody: 'A calm first step for daily reading, with meaning controls and guided support built into the reader.',
    beginTodayBody: 'A calm first step for daily reading, with meaning controls and a cleaner mobile reader built in.',
    nextActionsBody: 'Keep the next step explicit: open today’s guidance, continue into Read, or return to what you saved.',
    openTodaysGuidance: 'Open Today’s Guidance',
    todayInLearn: 'Today in Learn',
    todayInLearnBody: 'Keep the learning side of the app grounded in one real next step, not placeholder prompts.',
    openLearnToday: 'Open Learn Today',
    continueInLearn: 'Continue in Learn',
    featuredShabad: 'Featured Shabad',
    openFeaturedShabad: 'Open Featured Shabad',
    featuredShabadUnavailable: 'Featured shabad is temporarily unavailable.',
    featuredShabadUnavailableBody: 'Today’s guidance is still ready above, and browsing by source stays open below while the shabad preview catches up.',
    topicGuideMeta: 'Topic guide',
    learnFallbackTitle: 'Open Learn',
    learnFallbackBody: 'Browse the guided surfaces that are already live in the app.',
    browseRead: 'Browse Read',
    trackSuffix: 'track',
    reviewDue: (count) => `${count} review item${count === 1 ? '' : 's'} due`,
  },
  pa: {
    resumeStudyBody: 'ਜਿੱਥੇ ਤੁਸੀਂ ਅਖੀਰ ਵਾਰ ਅਰਥ ਨਾਲ ਪੜ੍ਹ ਰਹੇ ਸੀ, ਓਥੇ ਹੀ ਵਾਪਸ ਜਾਓ ਤਾਂ ਜੋ ਸੰਦਰਭ ਬਣਾ ਰਹੇ।',
    openTodaysHukamnama: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ ਖੋਲ੍ਹੋ',
    todaysMeaningBody: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਅਰਥ ਨੂੰ ਨੇੜੇ ਰੱਖੋ।',
    todaysReadingBody: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਪਾਠ ਦੀ ਲਯ ਬਣਾਈ ਰੱਖੋ।',
    browseReadBody: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨੂੰ ਦੁਹਰਾਉਣ ਤੋਂ ਬਿਨਾਂ ਐਪ ਵਿੱਚ ਮੌਜੂਦ ਪੜ੍ਹਨ ਵਾਲੀਆਂ ਸਤਹਾਂ ਖੋਲ੍ਹੋ।',
    buildHabitTitle: 'ਹੋਰ ਭਾਰ ਜੋੜਨ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਦੀ ਆਦਤ ਬਣਾਓ।',
    learnScriptTitle: 'ਬਹੁਤ ਅਰਥ ਦੇ ਪਿੱਛੇ ਦੌੜਨ ਤੋਂ ਪਹਿਲਾਂ ਲਿਪੀ ਸਿੱਖੋ।',
    buildConfidenceTitle: 'ਘਬਰਾਹਟ ਤੋਂ ਪਹਿਲਾਂ ਪੜ੍ਹਨ ਦਾ ਵਿਸ਼ਵਾਸ ਬਣਾਓ।',
    childLearnBody: 'ਅਗਲਾ ਕਦਮ ਸੌਖਾ ਰੱਖੋ: ਮਾਰਗਦਰਸ਼ਿਤ ਅੱਖਰ, ਛੋਟੇ ਅਭਿਆਸ, ਫਿਰ ਇੱਕ ਅਸਲੀ ਲਾਈਨ।',
    adultLearnBody: 'ਮਾਰਗਦਰਸ਼ਿਤ ਅੱਖਰਾਂ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ, ਪਛਾਣ ਦਾ ਅਭਿਆਸ ਕਰੋ, ਫਿਰ ਜਦੋਂ ਤਿਆਰ ਹੋਵੋ ਤਾਂ ਜੀਵੰਤ ਪੰਕਤੀ ਵੱਲ ਵਧੋ।',
    pickUpPausedTitle: 'ਜਿੱਥੇ ਰੁਕੇ ਸੀ ਓਥੇ ਹੀ ਤੋਂ ਚੁੱਕੋ।',
    nitnemImmediateBody: 'ਨਿਤਨੇਮ ਤੁਰੰਤ ਮਹਿਸੂਸ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ। ਲਾਇਬ੍ਰੇਰੀ ਵਿੱਚ ਲੱਭਣ ਤੋਂ ਬਿਨਾਂ ਆਪਣਾ ਪਿਛਲਾ ਪਾਠ ਜਾਰੀ ਰੱਖੋ।',
    dailyNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ',
    nitnemHeroTitle: 'ਨਿਤਨੇਮ ਨਾਲ ਦਿਨ ਨੂੰ ਅਡੋਲ ਕਰੋ।',
    nitnemHeroBody: 'ਅਗਲੀ ਜ਼ਰੂਰੀ ਬਾਣੀ ਪਹਿਲਾਂ ਦਿਖੇ, ਬਾਕੀ ਚੋਣਾਂ ਸਿਰਫ਼ ਲੋੜ ਪੈਣ ਤੇ ਖੁੱਲਣ।',
    nitnemRemaining: (count) => `ਅੱਜ ਲਈ ${count} ਬਾਕੀ`,
    nitnemCompleteToday: 'ਅੱਜ ਲਈ ਪੂਰਾ',
    nitnemCarouselLabel: (index, total) => `ਨਿਤਨੇਮ ਕਾਰਡ ${index} / ${total}`,
    beginNitnem: 'ਨਿਤਨੇਮ ਸ਼ੁਰੂ ਕਰੋ',
    continueNitnem: 'ਨਿਤਨੇਮ ਜਾਰੀ ਰੱਖੋ',
    completeNitnemStep: 'ਪੂਰਾ ਚਿੰਨ੍ਹਿਤ ਕਰੋ',
    markNitnemIncomplete: 'ਅਧੂਰਾ ਚਿੰਨ੍ਹਿਤ ਕਰੋ',
    customizeNitnem: 'ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਸੰਵਾਰੋ',
    hideNitnemCustomize: 'ਨਿਤਨੇਮ ਚੋਣਾਂ ਲੁਕਾਓ',
    chooseNitnemBody: 'ਉਹ ਬਾਣੀਆਂ ਚੁਣੋ ਜੋ ਤੁਹਾਡੇ ਰੋਜ਼ਾਨਾ ਨਿਤਨੇਮ ਵਿੱਚ ਦਿਸਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ।',
    readTodayEyebrow: 'ਅੱਜ ਪੜ੍ਹੋ',
    readTodayTitle: 'ਅਰਦਾਸ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ, ਫਿਰ ਅਗਲਾ ਦਰਵਾਜ਼ਾ ਨੇੜੇ ਰੱਖੋ।',
    readTodayBody: 'ਪਹਿਲਾਂ ਅਰਦਾਸ + ਹੁਕਮਨਾਮਾ ਖੋਲ੍ਹੋ, ਫਿਰ ਖਾਸ ਸ਼ਬਦ ਨਾਲ ਰਹੋ ਜਾਂ ਜਦੋਂ ਲੋੜ ਹੋਵੇ ਤਾਂ ਸਰੋਤ ਅਨੁਸਾਰ ਸਿੱਧਾ ਪਾਠ ਖੋਲ੍ਹੋ।',
    beginTodayTitle: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।',
    beginTodayMeaningTitle: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਅਰਥ ਨੂੰ ਨੇੜੇ ਰੱਖੋ।',
    beginTodayMeaningBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ ਲਈ ਇੱਕ ਸ਼ਾਂਤ ਪਹਿਲਾ ਕਦਮ, ਜਿਸ ਵਿੱਚ ਅਰਥ ਨਿਯੰਤਰਣ ਅਤੇ ਮਾਰਗਦਰਸ਼ਿਤ ਸਹਾਇਤਾ ਬਣੀ ਹੋਈ ਹੈ।',
    beginTodayBody: 'ਰੋਜ਼ਾਨਾ ਪਾਠ ਲਈ ਇੱਕ ਸ਼ਾਂਤ ਪਹਿਲਾ ਕਦਮ, ਜਿਸ ਵਿੱਚ ਅਰਥ ਨਿਯੰਤਰਣ ਅਤੇ ਹੋਰ ਸਾਫ਼ ਮੋਬਾਈਲ ਪਾਠਕ ਸ਼ਾਮਲ ਹੈ।',
    nextActionsBody: 'ਅਗਲਾ ਕਦਮ ਸਾਫ਼ ਰੱਖੋ: ਅੱਜ ਦੀ ਮਾਰਗਦਰਸ਼ਨਾ ਖੋਲ੍ਹੋ, Read ਵਿੱਚ ਜਾਓ, ਜਾਂ ਆਪਣੀ ਸੰਭਾਲੀ ਚੀਜ਼ਾਂ ਵੱਲ ਵਾਪਸ ਜਾਓ।',
    openTodaysGuidance: 'ਅੱਜ ਦੀ ਮਾਰਗਦਰਸ਼ਨਾ ਖੋਲ੍ਹੋ',
    todayInLearn: 'ਅੱਜ Learn ਵਿੱਚ',
    todayInLearnBody: 'ਸਿੱਖਣ ਵਾਲੀ ਸਤਹ ਨੂੰ ਇੱਕ ਅਸਲੀ ਅਗਲੇ ਕਦਮ ਨਾਲ ਜੁੜਿਆ ਰੱਖੋ।',
    openLearnToday: 'ਅੱਜ ਦਾ Learn ਖੋਲ੍ਹੋ',
    continueInLearn: 'Learn ਵਿੱਚ ਜਾਰੀ ਰੱਖੋ',
    featuredShabad: 'ਖਾਸ ਸ਼ਬਦ',
    openFeaturedShabad: 'ਖਾਸ ਸ਼ਬਦ ਖੋਲ੍ਹੋ',
    featuredShabadUnavailable: 'ਖਾਸ ਸ਼ਬਦ ਅਜੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
    featuredShabadUnavailableBody: 'ਅੱਜ ਦੀ ਮਾਰਗਦਰਸ਼ਨਾ ਉੱਪਰ ਹੀ ਤਿਆਰ ਹੈ, ਅਤੇ ਹੇਠਾਂ ਸਰੋਤ ਅਨੁਸਾਰ ਬ੍ਰਾਊਜ਼ਿੰਗ ਖੁੱਲੀ ਰਹਿੰਦੀ ਹੈ ਜਦੋਂ ਤੱਕ ਸ਼ਬਦ ਝਲਕ ਮੁੜ ਨਹੀਂ ਆ ਜਾਂਦੀ।',
    topicGuideMeta: 'ਵਿਸ਼ਾ ਮਾਰਗਦਰਸ਼ਕ',
    learnFallbackTitle: 'Learn ਖੋਲ੍ਹੋ',
    learnFallbackBody: 'ਐਪ ਦੇ ਮਾਰਗਦਰਸ਼ਿਤ ਅਤੇ ਜੀਵੰਤ ਸਤਹਾਂ ਵਿੱਚ ਦਾਖ਼ਲ ਹੋਵੋ।',
    browseRead: 'ਪੜ੍ਹੋ ਬ੍ਰਾਊਜ਼ ਕਰੋ',
    trackSuffix: 'ਮਾਰਗ',
    reviewDue: (count) => `${count} ਦੁਹਰਾਈ ਆਇਟਮ ਬਾਕੀ`,
  },
  hi: {
    resumeStudyBody: 'जिस अंश को आप अर्थ के साथ पढ़ रहे थे, वहीं लौटें ताकि संदर्भ बना रहे।',
    openTodaysHukamnama: 'आज का हुकमनामा खोलें',
    todaysMeaningBody: 'दैनिक हुकमनामे से शुरू करें और अर्थ को पास रखें।',
    todaysReadingBody: 'दैनिक हुकमनामे से शुरू करें और पढ़ने की लय बनाए रखें।',
    browseReadBody: 'आज के हुकमनामे को दोहराए बिना ऐप के भीतर मौजूद रीड सतहों को खोलें।',
    buildHabitTitle: 'और भार जोड़ने से पहले पढ़ने की आदत बनाइए।',
    learnScriptTitle: 'बहुत अर्थ पकड़ने से पहले लिपि सीखिए।',
    buildConfidenceTitle: 'घबराहट से पहले पढ़ने का आत्मविश्वास बनाइए।',
    childLearnBody: 'अगला कदम सरल रखें: मार्गदर्शित अक्षर, छोटे अभ्यास, फिर एक वास्तविक पंक्ति।',
    adultLearnBody: 'मार्गदर्शित अक्षरों से शुरू करें, पहचान का अभ्यास करें, फिर तैयार होने पर जीवंत पंक्ति में जाएँ।',
    pickUpPausedTitle: 'जहाँ रुके थे, वहीं से आगे बढ़ें।',
    nitnemImmediateBody: 'नितनेम तुरंत उपलब्ध लगना चाहिए। लाइब्रेरी में खोजे बिना अपना पिछला पाठ जारी रखें।',
    dailyNitnem: 'दैनिक नितनेम',
    nitnemHeroTitle: 'नितनेम से दिन को स्थिर करो।',
    nitnemHeroBody: 'अगली ज़रूरी बानी सामने रहे, बाकी विकल्प तभी खुलें जब आप उन्हें सच में चाहें।',
    nitnemRemaining: (count) => `आज ${count} बाकी`,
    nitnemCompleteToday: 'आज के लिए पूरा',
    nitnemCarouselLabel: (index, total) => `नितनेम कार्ड ${index} / ${total}`,
    beginNitnem: 'नितनेम शुरू करें',
    continueNitnem: 'नितनेम जारी रखें',
    completeNitnemStep: 'पूरा चिन्हित करें',
    markNitnemIncomplete: 'अधूरा चिन्हित करें',
    customizeNitnem: 'दैनिक नितनेम बदलें',
    hideNitnemCustomize: 'नितनेम विकल्प छिपाएँ',
    chooseNitnemBody: 'वे बानियाँ चुनें जो आपके दैनिक नितनेम में दिखाई दें।',
    readTodayEyebrow: 'आज पढ़ें',
    readTodayTitle: 'अरदास से शुरू करें, फिर अगला दरवाज़ा पास रखें।',
    readTodayBody: 'पहले अरदास + हुकमनामा खोलें, फिर विशेष शबद के साथ रहें या जब ज़रूरत हो तो स्रोत के हिसाब से सीधे पाठ खोलें।',
    beginTodayTitle: 'आज के हुकमनामे से शुरू करें।',
    beginTodayMeaningTitle: 'आज के हुकमनामे से शुरू करें और अर्थ को पास रखें।',
    beginTodayMeaningBody: 'दैनिक पाठ के लिए एक शांत पहला कदम, जिसमें अर्थ नियंत्रण और मार्गदर्शित सहायता पहले से जुड़ी हो।',
    beginTodayBody: 'दैनिक पाठ के लिए एक शांत पहला कदम, जिसमें अर्थ नियंत्रण और एक अधिक साफ़ मोबाइल रीडर शामिल है।',
    nextActionsBody: 'अगला कदम साफ़ रखें: आज की guidance खोलें, Read में जाएँ, या अपनी saved shelf पर लौटें।',
    openTodaysGuidance: 'आज की guidance खोलें',
    todayInLearn: 'आज Learn में',
    todayInLearnBody: 'सीखने वाली सतह को एक वास्तविक अगले कदम से जोड़े रखें।',
    openLearnToday: 'आज का Learn खोलें',
    continueInLearn: 'Learn में जारी रखें',
    featuredShabad: 'विशेष शबद',
    openFeaturedShabad: 'विशेष शबद खोलें',
    featuredShabadUnavailable: 'विशेष शबद अभी उपलब्ध नहीं है।',
    featuredShabadUnavailableBody: 'आज की guidance ऊपर तैयार है, और नीचे source browsing खुली रहती है जब तक शबद preview वापस नहीं आता।',
    topicGuideMeta: 'विषय मार्गदर्शिका',
    learnFallbackTitle: 'Learn खोलें',
    learnFallbackBody: 'ऐप के भीतर मौजूद वास्तविक guided surfaces में जाएँ।',
    browseRead: 'रीड ब्राउज़ करें',
    trackSuffix: 'मार्ग',
    reviewDue: (count) => `${count} रिव्यू आइटम बाकी`,
  },
}

export default function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const streak = useProgressStore(state => state.streak)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const locale = useLocaleStore(s => s.locale)
  const {
    selectedIds,
    resetIfNewDay,
  } = useNitemStore()
  const bookmarks = useBookmarksStore(state => state.bookmarks)
  const favorites = useFavoritesStore(state => state.favorites)
  const vocab = useVocabStore(s => s.vocab)
  const lastSaved = useSavedFeedbackStore(state => state.lastSaved)
  const learnStateSnapshot = useLearningStore(state => state.learnState)
  const {
    learningLevel,
    openOnboarding,
  } = useOnboardingStore()
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const homeCopy = copy.home
  const libraryCopy = copy.library
  const homeMessages = HOME_MESSAGES[locale]
  const learningLevelLabels = getLearningLevelLabels(locale)
  const readTodayRef = useRef<HTMLElement | null>(null)
  const nitnemCarouselRef = useRef<HTMLDivElement | null>(null)
  const nitnemScrollTimeoutRef = useRef<number | null>(null)
  const nitnemMomentSyncedRef = useRef(false)
  const nitnemUserScrollRef = useRef(false)
  const nitnemSwipeRef = useRef<{ pointerId: number; startX: number; startY: number; handled: boolean } | null>(null)
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
  const homeNow = useMemo(() => new Date(now), [now])
  const homeDateLabel = useMemo(() => formatUiDate(locale, homeNow), [homeNow, locale])
  const homeTimeLabel = useMemo(() => {
    const localeCode = locale === 'pa' ? 'pa-IN' : locale === 'hi' ? 'hi-IN' : 'en-US'
    return new Intl.DateTimeFormat(localeCode, { hour: 'numeric', minute: '2-digit' }).format(homeNow)
  }, [homeNow, locale])
  const {
    catalog: learnCatalog,
    loading: learnCatalogLoading,
    error: learnCatalogError,
  } = useLearnHomeCatalog()
  const learnDayStamp = toLocalDayStamp(new Date(now))

  const getNitnemOptionDetail = (option: NitnemRouteOption) => (
    option.supportsLengthAdjustment && isSundarGutkaLengthSupportedBaniId(option.baseBaniId)
      ? getSundarGutkaLengthDetail(sundarGutkaLengths[option.baseBaniId])
      : option.detail
  )

  useEffect(() => {
    resetIfNewDay()
  }, [resetIfNewDay])

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
        readTodayRef.current?.classList.add(...READ_TODAY_HIGHLIGHT_CLASSES)
        readTodayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      highlightTimer = window.setTimeout(() => {
        readTodayRef.current?.classList.remove(...READ_TODAY_HIGHLIGHT_CLASSES)
      }, 2600)
    }

    navigate(location.pathname, { replace: true, state: null })

    return () => {
      if (highlightTimer !== null) {
        window.clearTimeout(highlightTimer)
      }
    }
  }, [location.pathname, location.state, navigate, openOnboarding])

  const { data: hukamnama, loading: hukamnamaLoading } = useHukamnama()
  const todayLearnSurface = useMemo(
    () => (learnCatalog ? getTodayLearnHomeSurface(learnCatalog, learnDayStamp, learnStateSnapshot) : null),
    [learnCatalog, learnDayStamp, learnStateSnapshot]
  )
  const todayGuidance = todayLearnSurface?.dailyGuidance.item ?? null
  const todayGuidancePath = todayGuidance
    ? buildLearnDetailPath('daily-guidance', todayGuidance.id, 'today')
    : null
  const featuredShabad = todayLearnSurface?.featuredShabad.item ?? null
  const featuredShabadPath = featuredShabad
    ? buildLearnDetailPath('shabad-deep-dive', featuredShabad.id, 'today')
    : null

  const selectedNitnemOptions = useMemo(() => {
    return selectedIds
      .map(optionId => NITNEM_ROUTE_OPTIONS.find(option => option.id === optionId) ?? null)
      .filter((option): option is NitnemRouteOption => option !== null)
  }, [selectedIds])
  const nitnemMoment = useMemo<NitnemRouteOption['group']>(() => {
    const hour = new Date(now).getHours()
    if (hour >= 21) return 'Night'
    if (hour >= 16) return 'Evening'
    return 'Morning'
  }, [now])
  const preferredNitnemIndex = useMemo(() => {
    const momentIndex = selectedNitnemOptions.findIndex(option => option.group === nitnemMoment)
    return momentIndex >= 0 ? momentIndex : 0
  }, [nitnemMoment, selectedNitnemOptions])
  const [activeNitnemIndex, setActiveNitnemIndex] = useState(preferredNitnemIndex)
  const safeNitnemIndex = selectedNitnemOptions.length > 0
    ? Math.max(0, Math.min(activeNitnemIndex, selectedNitnemOptions.length - 1))
    : 0
  const activeNitnemOption = selectedNitnemOptions[safeNitnemIndex]
    ?? selectedNitnemOptions[preferredNitnemIndex]
    ?? selectedNitnemOptions[0]
    ?? null
  const nitnemHasCarousel = selectedNitnemOptions.length > 1

  useEffect(() => {
    if (selectedNitnemOptions.length === 0) return

    setActiveNitnemIndex(currentIndex => {
      if (!nitnemMomentSyncedRef.current) {
        nitnemMomentSyncedRef.current = true
        return preferredNitnemIndex
      }

      return Math.max(0, Math.min(currentIndex, selectedNitnemOptions.length - 1))
    })
  }, [preferredNitnemIndex, selectedNitnemOptions.length])

  const scrollNitnemCarouselTo = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    const carousel = nitnemCarouselRef.current
    const target = carousel?.querySelector<HTMLElement>(`[data-nitnem-index="${index}"]`)
    if (!carousel || !target) return
    const left = target.offsetLeft
    if (typeof carousel.scrollTo === 'function') {
      carousel.scrollTo({ left, behavior })
      return
    }
    carousel.scrollLeft = left
  }, [])

  const setNitnemCarouselIndex = useCallback((index: number) => {
    if (selectedNitnemOptions.length === 0) return
    const boundedIndex = ((index % selectedNitnemOptions.length) + selectedNitnemOptions.length) % selectedNitnemOptions.length
    if (boundedIndex === safeNitnemIndex) {
      window.requestAnimationFrame(() => scrollNitnemCarouselTo(boundedIndex, 'smooth'))
      return
    }
    nitnemUserScrollRef.current = true
    setActiveNitnemIndex(boundedIndex)
  }, [safeNitnemIndex, scrollNitnemCarouselTo, selectedNitnemOptions.length])

  useEffect(() => {
    if (!nitnemHasCarousel) return undefined
    const behavior: ScrollBehavior = nitnemUserScrollRef.current ? 'smooth' : 'auto'
    nitnemUserScrollRef.current = false
    const frame = window.requestAnimationFrame(() => scrollNitnemCarouselTo(safeNitnemIndex, behavior))
    return () => window.cancelAnimationFrame(frame)
  }, [nitnemHasCarousel, safeNitnemIndex, scrollNitnemCarouselTo])

  useEffect(() => {
    return () => {
      if (nitnemScrollTimeoutRef.current) {
        window.clearTimeout(nitnemScrollTimeoutRef.current)
      }
    }
  }, [])

  const handleNitnemCarouselScroll = () => {
    const carousel = nitnemCarouselRef.current
    if (!carousel || !nitnemHasCarousel) return

    if (nitnemScrollTimeoutRef.current) {
      window.clearTimeout(nitnemScrollTimeoutRef.current)
    }

    nitnemScrollTimeoutRef.current = window.setTimeout(() => {
      const cards = Array.from(carousel.querySelectorAll<HTMLElement>('[data-nitnem-index]'))
      const nearestCard = cards.reduce<HTMLElement | null>((nearest, card) => {
        if (!nearest) return card
        return Math.abs(card.offsetLeft - carousel.scrollLeft) < Math.abs(nearest.offsetLeft - carousel.scrollLeft)
          ? card
          : nearest
      }, null)
      const nextIndex = Number(nearestCard?.dataset.nitnemIndex ?? 0)
      setActiveNitnemIndex(Math.max(0, Math.min(nextIndex, selectedNitnemOptions.length - 1)))
    }, 80)
  }

  const handleNitnemPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!nitnemHasCarousel) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    nitnemSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handled: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [nitnemHasCarousel])

  const completeNitnemSwipeFromPoint = useCallback((clientX: number, clientY: number) => {
    const swipe = nitnemSwipeRef.current
    if (!swipe || swipe.handled) return false

    const deltaX = clientX - swipe.startX
    const deltaY = clientY - swipe.startY
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return false

    swipe.handled = true
    setNitnemCarouselIndex(safeNitnemIndex + (deltaX < 0 ? 1 : -1))
    return true
  }, [safeNitnemIndex, setNitnemCarouselIndex])

  const handleNitnemPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = nitnemSwipeRef.current
    if (!swipe || swipe.pointerId !== event.pointerId) return
    if (completeNitnemSwipeFromPoint(event.clientX, event.clientY)) {
      event.preventDefault()
    }
  }, [completeNitnemSwipeFromPoint])

  const handleNitnemPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = nitnemSwipeRef.current
    if (swipe?.pointerId === event.pointerId && completeNitnemSwipeFromPoint(event.clientX, event.clientY)) {
      event.preventDefault()
    }
    if (nitnemSwipeRef.current?.pointerId === event.pointerId) {
      nitnemSwipeRef.current = null
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
  }, [completeNitnemSwipeFromPoint])

  const handleNitnemPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = nitnemSwipeRef.current
    if (swipe?.pointerId === event.pointerId) {
      nitnemSwipeRef.current = null
    }
  }, [])

  const handleNitnemTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (!nitnemHasCarousel) return
    const touch = event.touches[0]
    if (!touch) return
    nitnemSwipeRef.current = {
      pointerId: -1,
      startX: touch.clientX,
      startY: touch.clientY,
      handled: false,
    }
  }, [nitnemHasCarousel])

  const handleNitnemTouchMove = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch || nitnemSwipeRef.current?.pointerId !== -1) return
    if (completeNitnemSwipeFromPoint(touch.clientX, touch.clientY)) {
      event.preventDefault()
    }
  }, [completeNitnemSwipeFromPoint])

  const handleNitnemTouchEnd = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    if (touch && nitnemSwipeRef.current?.pointerId === -1 && completeNitnemSwipeFromPoint(touch.clientX, touch.clientY)) {
      event.preventDefault()
    }
    if (nitnemSwipeRef.current?.pointerId === -1) {
      nitnemSwipeRef.current = null
    }
  }, [completeNitnemSwipeFromPoint])
  const savedLearnItems = useMemo(
    () => (learnCatalog ? getLearnHomeSavedItems(learnCatalog, learnStateSnapshot.savedItemIds) : []),
    [learnCatalog, learnStateSnapshot.savedItemIds]
  )
  const savedBookmarks = bookmarks.length
  const savedFavorites = favorites.length
  const savedReviewItems = vocab.length
  const isDarkTheme = useThemeStore(s => s.dark)
  const toggleTheme = useThemeStore(s => s.toggle)
  const homeHeroReveal = useHomeHeroReveal()
  const savedShelfNotice = useMemo(() => {
    switch (lastSaved?.kind) {
      case 'learn':
        return 'Learn save added to the shelf.'
      case 'bookmark':
        return 'Bookmarked passage added to the shelf.'
      case 'favorite':
        return 'Favorite added to the shelf.'
      case 'review':
        return 'Review Bank updated.'
      default:
        return null
    }
  }, [lastSaved?.kind])

  const devotionalReadAction = useMemo(() => ({
    title: 'Ardaas + Hukamnama',
    body: editorial?.read.featuredFlowBody ?? 'Do Ardaas, then take a random Hukamnama from Sri Guru Granth Sahib Ji.',
    path: '/study?baniDbId=24&bani=Ardaas&flow=ardaas-hukamnama',
  }), [editorial?.read.featuredFlowBody])
  const hukamnamaPreviewLine = useMemo(() => {
    if (!hukamnama) return null
    return hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))
      ?? hukamnama.entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim())
      ?? hukamnama.entry.lines?.find(line => line.gurmukhi.trim())
      ?? null
  }, [hukamnama])
  const hukamnamaTransliterationPreview = useMemo(() => {
    if (!hukamnama) return ''
    return hukamnamaPreviewLine?.transliteration || hukamnama.entry.transliteration
  }, [hukamnama, hukamnamaPreviewLine?.transliteration])
  const savedPreviewItems = useMemo<HomeSavedPreviewItem[]>(() => {
    const previewItems: HomeSavedPreviewItem[] = []
    const latestLearnSave = savedLearnItems[0]

    if (latestLearnSave) {
      previewItems.push({
        id: latestLearnSave.id,
        kind: 'learn',
        feedbackKind: 'learn',
        label: getLearnItemLabel(latestLearnSave.kind),
        title: latestLearnSave.title,
        detail: latestLearnSave.detail,
        path: buildLearnDetailPath(latestLearnSave.kind, latestLearnSave.id, 'saved'),
        meta: latestLearnSave.theme,
      })
    }

    const latestSavedPassage = [
      ...bookmarks.map(item => ({ item, feedbackKind: 'bookmark' as const, label: libraryCopy.bookmarks })),
      ...favorites.map(item => ({ item, feedbackKind: 'favorite' as const, label: libraryCopy.favorites })),
    ].sort((left, right) => compareSavedAtDesc(left.item, right.item))[0]
    if (latestSavedPassage) {
      previewItems.push({
        id: latestSavedPassage.item.id,
        kind: 'passage',
        feedbackKind: latestSavedPassage.feedbackKind,
        label: latestSavedPassage.label,
        title: latestSavedPassage.item.title,
        detail: formatSavedPassageReference(
          latestSavedPassage.item.source,
          latestSavedPassage.item.ang,
          'verseId' in latestSavedPassage.item ? latestSavedPassage.item.verseId : undefined
        ),
        path: buildSavedStudyPath(latestSavedPassage.item),
      })
    }

    const latestVocab = [...vocab].sort(compareSavedAtDesc)[0]
    if (latestVocab) {
      previewItems.push({
        id: buildVocabFeedbackId(latestVocab),
        kind: 'vocab',
        feedbackKind: 'review',
        label: libraryCopy.reviewBank,
        title: latestVocab.word,
        detail: getVocabPreviewDetail(latestVocab, locale),
        path: '/vocab',
        meta: (latestVocab.kind ?? 'word') === 'phrase' ? homeCopy.phrases : homeCopy.words,
      })
    }

    return previewItems.slice(0, 3)
  }, [bookmarks, favorites, homeCopy.phrases, homeCopy.words, libraryCopy.bookmarks, libraryCopy.favorites, libraryCopy.reviewBank, locale, savedLearnItems, vocab])
  const featuredShabadSupport = useMemo(() => {
    if (learnCatalogLoading) {
      return { state: 'loading' as const }
    }

    if (featuredShabad && featuredShabadPath) {
      return {
        state: 'ready' as const,
        eyebrow: homeMessages.featuredShabad,
        title: featuredShabad.title,
        summary: featuredShabad.subtitle || featuredShabad.summary,
        body: editorial?.learn.compactShabadBody ?? featuredShabad.whyItMatters,
        meta: featuredShabad.rotation.theme,
        actionLabel: homeMessages.openFeaturedShabad,
        path: featuredShabadPath,
      }
    }

    return {
      state: 'unavailable' as const,
      eyebrow: homeMessages.featuredShabad,
      title: homeMessages.featuredShabadUnavailable,
      body: homeMessages.featuredShabadUnavailableBody,
    }
  }, [
    editorial?.learn.compactShabadBody,
    featuredShabad,
    featuredShabadPath,
    homeMessages.featuredShabad,
    homeMessages.featuredShabadUnavailable,
    homeMessages.featuredShabadUnavailableBody,
    homeMessages.openFeaturedShabad,
    learnCatalogLoading,
  ])
  return (
    <div className="home-stack page-shell animate-fade-in" data-testid="page-home" data-page="home" data-ai-surface="home" data-ai-state="ready">
      <section
        ref={homeHeroReveal.rootRef}
        style={homeHeroReveal.style}
        onPointerMove={homeHeroReveal.handlePointerMove}
        onPointerLeave={homeHeroReveal.handlePointerLeave}
        className="home-door-shell mb-3 px-5 py-4 animate-slide-up stagger-1"
        aria-labelledby="home-hero-title"
        data-testid="home-hero"
        data-ai-surface="daily-reading-room"
      >
        <header className="flex items-center justify-between gap-4" data-testid="home-brand-header">
          <div className="flex min-w-0 items-center gap-3">
            <NaamRasLogoMark
              size={50}
              className="shrink-0 drop-shadow-[0_8px_14px_rgba(122,84,32,0.18)]"
              testId="home-brand-mark"
            />
            <div className="min-w-0">
              <p className="font-display text-[2.05rem] leading-none text-ink dark:text-dark-text">
                {editorial?.brand.name ?? 'NaamRas'}
              </p>
              <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark/70 dark:text-gold-light">
                Daily · Divine · You
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/library"
              aria-label="Open saved library"
              className="home-door-icon-button"
              data-testid="home-header-saved"
            >
              <IconBookmark size={19} />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
              className="home-door-icon-button"
              data-testid="home-theme-toggle"
            >
              {isDarkTheme ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </header>

        <div className="mt-3 border-y border-sand/20 py-2.5 dark:border-dark-text/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-[1.05rem] leading-none text-ink/78 dark:text-dark-text/82">
              {homeDateLabel}
            </p>
            <div className="flex items-center gap-2">
              <span className="chip-pill">{learningLevelLabels[learningLevel]}</span>
              <StreakBadge streak={streak} />
            </div>
          </div>
        </div>

        <div className="home-door-frame" aria-label="Daily reading room">
          <span ref={homeHeroReveal.landscapeRef} className="home-landscape-reveal" aria-hidden="true" />
          <h1 id="home-hero-title" className="sr-only">
            NaamRas home
          </h1>

          <div className="home-door-content" data-testid="home-daily-reading-room">
            {hukamnamaLoading ? (
              <div className="home-hukam-card animate-pulse px-3.5 py-3.5" data-testid="home-hukamnama-card">
                <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-32 mb-4" />
                <div className="h-16 rounded bg-sand/20 dark:bg-dark-text/10" />
                <div className="mt-4 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
                <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
                <div className="mt-4 h-12 rounded bg-sand/20 dark:bg-dark-text/10" />
              </div>
            ) : hukamnama ? (
              <div
                className="home-hukam-card px-3.5 py-3.5"
                data-testid="home-hukamnama-card"
                data-ai-surface="home-hukamnama"
                data-ai-state="ready"
              >
                <div className="home-card-heading-row">
                  <p className="home-section-label">
                    {homeCopy.todaysHukamnama}
                  </p>
                  <span className="home-soft-pill home-raag-pill">
                      {renderScriptText(hukamnama.entry.raag || 'Sri Darbar Sahib', scriptMode)}
</span>
                </div>
                <p
                  lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                  className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} home-hukam-line`}
                >
                  {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
                </p>
                <div className="home-hukam-meta-row">
                  {hukamnamaTransliterationPreview ? (
                    <p className="home-hukam-transliteration">
                      {hukamnamaTransliterationPreview}
                    </p>
                  ) : <span />}
                  <span className="home-hukam-time">
                    <IconSun size={15} />
                    {homeTimeLabel}
                  </span>
                </div>
                <Link
                  to={`/study?hukamnamaDate=${hukamnama.date}`}
                  className="home-primary-action interactive-focus interactive-pill-link"
                  data-testid="home-hero-primary-action"
                  data-ai-action="open-hukamnama"
                >
                  <IconLibrary size={20} />
                  <span>Read Hukamnama</span>
                </Link>
              </div>
            ) : (
              <div
                className="home-hukam-card px-3.5 py-3.5"
                data-testid="home-hukamnama-error"
                data-ai-surface="home-hukamnama"
                data-ai-state="degraded"
                data-ai-error="study-hukamnama"
              >
                <p className="home-section-label">{homeCopy.todaysHukamnama}</p>
                <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                  Couldn&apos;t load today&apos;s hukamnama right now. You can still continue into Read.
                </p>
                <Link
                  to="/banis"
                  className="home-primary-action interactive-focus interactive-pill-link mt-4"
                  data-ai-action="browse-read"
                >
                  Browse Read
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="home-guidance-note mb-4 py-4 pl-10 pr-4 animate-slide-up stagger-2"
        aria-label="Today's Guidance"
        data-testid="home-guidance-hero"
        data-ai-surface="home-guidance"
        data-ai-state={learnCatalogLoading ? 'loading' : learnCatalogError ? 'degraded' : todayGuidance && todayGuidancePath ? 'ready' : 'empty'}
        data-ai-error={learnCatalogError ? 'learn-catalog' : undefined}
      >
        <span className="home-note-pin" aria-hidden="true" />
        <span className="home-sprig" aria-hidden="true" />
        <img
          src={guidancePixelMotifSrc}
          alt=""
          aria-hidden="true"
          className="home-guidance-motif"
        />
        {learnCatalogLoading ? (
          <div className="animate-pulse" data-testid="home-guidance-skeleton">
            <div className="h-3 w-28 rounded bg-sand/20 dark:bg-dark-text/10" />
            <div className="mt-3 h-8 rounded bg-sand/20 dark:bg-dark-text/10" />
            <div className="mt-3 h-4 w-4/5 rounded bg-sand/20 dark:bg-dark-text/10" />
          </div>
        ) : todayGuidance && todayGuidancePath ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Today&apos;s Guidance</p>
              <h2 className="mt-2 font-display text-[1.55rem] leading-[1.02] text-ink dark:text-dark-text">
                {todayGuidance.title}
              </h2>
              <p className="mt-2 line-clamp-2 font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70">
                {todayGuidance.summary || editorial?.learn.compactGuidanceBody || 'Open today’s Learn doorway and move into the exact guide chosen for the day.'}
              </p>
            </div>
            <Link
              to={todayGuidancePath}
              className="interactive-focus interactive-pill-link shrink-0 gap-1 rounded-lg border border-gold/20 bg-parchment-card/72 px-3 py-2 font-sans text-xs font-semibold text-gold-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] dark:border-gold/20 dark:bg-white/[0.045] dark:text-gold-light"
              data-testid="home-hero-guidance-action"
              data-ai-action="open-todays-guidance"
            >
              <span>Open</span>
              <IconArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <>
            <p className="eyebrow">Today&apos;s Guidance</p>
            <h2 className="mt-2 font-display text-[1.55rem] leading-[1.02] text-ink dark:text-dark-text">
              {learnCatalogError ? 'Today’s Learn guidance could not be loaded.' : 'Today’s guidance is preparing the next doorway.'}
            </h2>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70">
              {learnCatalogError
                ? 'Home is staying grounded in the hukamnama-led path until the Learn archive is available again.'
                : editorial?.learn.compactGuidanceBody || 'A short doorway into the day, anchored in a real line and written for return rather than skimming.'}
            </p>
          </>
        )}
      </section>

      <section
        className="home-nitnem-tray mb-4 px-4 py-4 animate-slide-up stagger-3"
        aria-labelledby="home-nitnem-title"
        data-testid="home-nitnem-spotlight"
      >
        <img
          src={nitnemPixelMotifSrc}
          alt=""
          aria-hidden="true"
          className="home-nitnem-motif"
        />
        <span className="home-tray-emblem" aria-hidden="true">
          <IconBanis size={28} />
        </span>
        <span className="home-tray-corner home-tray-corner-left" aria-hidden="true" />
        <span className="home-tray-corner home-tray-corner-right" aria-hidden="true" />
        <div className="home-nitnem-heading flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              id="home-nitnem-title"
              className="font-sans text-[11px] uppercase tracking-[0.24em] text-gold dark:text-gold-light"
            >
              {homeMessages.dailyNitnem}
            </p>
            <h2 className="mt-2 max-w-[18ch] font-display text-[1.75rem] leading-[0.98] text-ink dark:text-dark-text sm:max-w-none">
              {homeMessages.nitnemHeroTitle}
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-sand/16 bg-parchment-card/78 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/60">
            {activeNitnemOption?.group ?? homeMessages.dailyNitnem}
          </span>
        </div>

        <div className="mt-4">
          {activeNitnemOption ? (
            <>
              <div
                ref={nitnemCarouselRef}
                onScroll={handleNitnemCarouselScroll}
                onPointerDown={handleNitnemPointerDown}
                onPointerMove={handleNitnemPointerMove}
                onPointerUp={handleNitnemPointerUp}
                onPointerCancel={handleNitnemPointerCancel}
                onTouchStart={handleNitnemTouchStart}
                onTouchMove={handleNitnemTouchMove}
                onTouchEnd={handleNitnemTouchEnd}
                className="home-nitnem-carousel"
                data-testid="home-nitnem-carousel"
                aria-label="Daily Nitnem selected banis"
              >
                {selectedNitnemOptions.map((option, index) => {
                  const active = index === safeNitnemIndex
                  return (
                    <article
                      key={`home-nitnem-card-${option.id}`}
                      data-nitnem-index={index}
                      data-testid={active ? 'home-nitnem-active-card' : undefined}
                      aria-label={homeMessages.nitnemCarouselLabel(index + 1, selectedNitnemOptions.length)}
                      aria-current={active ? 'true' : undefined}
                      className="home-nitnem-card"
                    >
                      <div className="home-nitnem-card-grid">
                        <p className="home-section-label">Today&apos;s Bani</p>
                        <p lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'} className={scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'}>
                          {renderScriptText(option.gurmukhiTitle, scriptMode)}
                        </p>
                        <p>{option.romanizedTitle}</p>
                        <div className="home-ritual-note">
                          {getNitnemOptionDetail(option)}
                        </div>
                      </div>

                      <Link
                        to={buildNitnemStudyPath(option)}
                        className="home-primary-action interactive-focus interactive-pill-link"
                        data-testid={active ? 'home-nitnem-primary-action' : undefined}
                        tabIndex={active ? undefined : -1}
                      >
                        {homeMessages.beginNitnem}
                      </Link>
                    </article>
                  )
                })}
              </div>

              {nitnemHasCarousel ? (
                <div className="mt-3 flex items-center justify-between gap-3" data-testid="home-nitnem-carousel-controls">
                  <button
                    type="button"
                    onClick={() => setNitnemCarouselIndex(safeNitnemIndex - 1)}
                    className="interactive-focus icon-surface h-10 w-10 disabled:opacity-40"
                    aria-label="Previous Nitnem bani"
                  >
                    <IconArrowRight size={16} className="rotate-180" />
                  </button>
                  <div className="flex flex-wrap justify-center gap-2" aria-label="Daily Nitnem carousel pages">
                    {selectedNitnemOptions.map((option, index) => (
                      <button
                        key={`home-nitnem-dot-${option.id}`}
                        type="button"
                        onClick={() => setNitnemCarouselIndex(index)}
                        aria-label={`Show ${option.romanizedTitle}`}
                        aria-current={index === safeNitnemIndex ? 'true' : undefined}
                        className={`h-2.5 rounded-full transition-all duration-200 ${
                          index === safeNitnemIndex
                            ? 'w-7 bg-gold dark:bg-gold-light'
                            : 'w-2.5 bg-sand/28 dark:bg-dark-text/20'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNitnemCarouselIndex(safeNitnemIndex + 1)}
                    className="interactive-focus icon-surface h-10 w-10 disabled:opacity-40"
                    aria-label="Next Nitnem bani"
                  >
                    <IconArrowRight size={16} />
                  </button>
                </div>
              ) : null}

              <Link
                to="/nitnem/customize"
                className="home-outline-action interactive-focus interactive-pill-link mt-3 min-h-[48px] w-full rounded-lg border border-sand/16 bg-transparent px-5 font-sans text-sm font-medium text-ink/65 dark:border-dark-text/10 dark:text-dark-text/70"
                data-testid="home-nitnem-manage"
              >
                {homeMessages.customizeNitnem}
              </Link>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-sand/18 px-4 py-5 dark:border-dark-text/10">
              <p className="font-sans text-sm leading-6 text-ink/60 dark:text-dark-text/70">
                {homeMessages.chooseNitnemBody}
              </p>
              <Link
                to="/nitnem/customize"
                className="interactive-focus interactive-pill-link mt-4 min-h-[48px] rounded-lg bg-ink px-5 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
                data-testid="home-nitnem-manage"
              >
                {homeMessages.customizeNitnem}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        ref={readTodayRef}
        tabIndex={-1}
        className="home-read-sheet mb-4 px-4 py-4 animate-slide-up stagger-4 transition-[box-shadow,transform,border-color] duration-500"
        aria-labelledby="home-read-today-title"
        data-testid="home-read-today"
      >
        <span className="home-book-mark" aria-hidden="true" />
        <img
          src={ardaasHukamnamaPixelMotifSrc}
          alt=""
          aria-hidden="true"
          className="home-read-motif"
        />
        <p id="home-read-today-title" className="eyebrow">{homeMessages.readTodayEyebrow}</p>
        <h2 className="mt-2 font-display text-[1.7rem] leading-[0.98] text-ink dark:text-dark-text">
          {homeMessages.readTodayTitle}
        </h2>
        <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/70">
          {homeMessages.readTodayBody}
        </p>
        <div className="home-read-grid mt-4 grid gap-3">
          <div className="home-read-action-card home-quiet-card p-4">
            <p className="eyebrow">{homeCopy.read}</p>
            <h3 className="mt-2 font-display text-[1.72rem] leading-none text-ink dark:text-dark-text">
              {devotionalReadAction.title}
            </h3>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/70 dark:text-dark-text/75">
              {devotionalReadAction.body}
            </p>
            <Link
              to={devotionalReadAction.path}
              className="home-outline-action interactive-focus interactive-pill-link mt-4 min-h-[48px] w-full rounded-lg border border-saffron/20 bg-saffron/8 px-4 font-sans text-sm font-semibold text-saffron dark:border-gold/18 dark:bg-gold/10 dark:text-gold-light"
              data-testid="home-read-today-action"
            >
              {devotionalReadAction.title}
            </Link>
          </div>
        </div>
      </section>

      <section
        className="home-featured-slip home-quiet-card mb-4 p-4 animate-slide-up stagger-4"
        data-testid="home-read-today-featured-shabad"
      >
        <img
          src={featuredInstrumentSrc}
          alt=""
          aria-hidden="true"
          data-testid="home-featured-instrument"
          className="home-featured-instrument"
        />
        {featuredShabadSupport.state === 'loading' ? (
          <div className="animate-pulse" data-testid="home-read-today-featured-shabad-loading">
            <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-28" />
            <div className="mt-4 h-8 rounded bg-sand/20 dark:bg-dark-text/10" />
            <div className="mt-3 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
            <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
          </div>
        ) : featuredShabadSupport.state === 'ready' ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">{featuredShabadSupport.eyebrow}</p>
                <h3 className="mt-2 font-display text-[1.5rem] leading-[1.02] text-ink dark:text-dark-text">
                  {featuredShabadSupport.title}
                </h3>
                <p className="mt-2 font-sans text-sm font-semibold text-ink/70 dark:text-dark-text/75">
                  {featuredShabadSupport.summary}
                </p>
              </div>
              <span className="chip-pill">{featuredShabadSupport.meta}</span>
            </div>

            <p className="mt-3 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
              {featuredShabadSupport.body}
            </p>
            <Link
              to={featuredShabadSupport.path}
              className="interactive-focus interactive-pill-link mt-4 min-h-[42px] gap-2 font-sans text-sm font-semibold text-gold dark:text-gold-light"
              data-testid="home-open-featured-shabad"
            >
              <span>{featuredShabadSupport.actionLabel}</span>
              <IconArrowRight size={14} />
            </Link>
          </>
        ) : (
          <>
            <p className="eyebrow">{featuredShabadSupport.eyebrow}</p>
            <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
              {featuredShabadSupport.title}
            </p>
            <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
              {featuredShabadSupport.body}
            </p>
          </>
        )}
      </section>

      <section
        className="home-saved-cabinet p-4 mb-5 animate-slide-up stagger-4"
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
          <Link
            to="/library"
            className="interactive-focus inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-sans text-sm text-gold dark:text-gold-light"
          >
            {homeCopy.openSaved} <IconArrowRight size={14} />
          </Link>
        </div>
        {savedShelfNotice ? (
          <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
            <p role="status" className="inline-flex rounded-full bg-gold/10 px-3 py-1.5 font-sans text-xs font-medium text-gold-dark dark:bg-gold/12 dark:text-gold-light">
              {savedShelfNotice}
            </p>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="home-saved-metrics">
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'learn' ? 'saved-feedback-highlight' : ''}`}>
            <IconLeaf className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{learnStateSnapshot.savedItemIds.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.learnSaves}</p>
          </div>
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'bookmark' ? 'saved-feedback-highlight' : ''}`}>
            <IconLibrary className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedBookmarks}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.bookmarks}</p>
          </div>
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'favorite' ? 'saved-feedback-highlight' : ''}`}>
            <IconHeart className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedFavorites}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.favorites}</p>
          </div>
          <div className={`home-quiet-card px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}>
            <IconLayers className="home-saved-metric-icon" size={20} />
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedReviewItems}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.reviewBank}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2" data-testid="home-saved-preview-list">
          {savedPreviewItems.length > 0 ? (
            savedPreviewItems.map(item => {
              const appearance = HOME_SAVED_PREVIEW_APPEARANCE[item.kind]
              const SavedPreviewIcon = appearance.icon
              const isHighlighted = lastSaved?.kind === item.feedbackKind && lastSaved.targetId === item.id

              return (
              <Link
                key={item.id}
                to={item.path}
                className={`section-shell-quiet interactive-focus interactive-card-link flex w-full items-start gap-3 px-4 py-4 text-left transition-colors duration-300 hover:border-gold/18 dark:hover:border-gold/20 ${appearance.surfaceClassName} ${isHighlighted ? 'saved-feedback-highlight' : ''}`}
                data-testid={`home-saved-preview-${item.kind}`}
              >
                <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${appearance.badgeClassName}`}>
                  <SavedPreviewIcon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="eyebrow">{item.label}</p>
                    {item.meta ? <span className="chip-pill">{item.meta}</span> : null}
                    {isHighlighted ? <span className="chip-pill">Saved just now</span> : null}
                  </div>
                  <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                    {item.title}
                  </p>
                  {item.kind === 'passage' ? (
                    <p className={`mt-2 font-sans text-[11px] uppercase tracking-[0.18em] ${appearance.detailClassName}`}>
                      {item.detail}
                    </p>
                  ) : (
                    <p className={`mt-1.5 font-sans text-sm leading-6 ${appearance.detailClassName}`}>
                      {item.detail}
                    </p>
                  )}
                </div>
                <span className="mt-1 shrink-0 text-gold dark:text-gold-light">
                  <IconArrowRight size={16} />
                </span>
              </Link>
            )})
          ) : (
            <div className="home-quiet-card home-saved-empty-preview px-4 py-4">
              <p className="eyebrow">Saved Preview</p>
              <p className="mt-2 font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/70">
                Learn saves, bookmarked passages, favorites, and review items will appear here once you start keeping pieces close.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
