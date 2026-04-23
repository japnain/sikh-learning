import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconBookmarkFilled,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLibrary,
  IconMoon,
  IconSun,
} from '../components/icons'
import ScriptureSourceBrowser from '../components/ScriptureSourceBrowser'
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
import { buildNitnemStudyPath, compareNitnemOptions, NITNEM_ROUTE_OPTIONS, type NitnemRouteOption, useNitemStore } from '../store/nitnem'
import { useVocabStore } from '../store/vocab'
import { buildVocabFeedbackId, useSavedFeedbackStore, type SavedFeedbackKind } from '../store/savedFeedback'
import type { UiLocale, VocabEntry } from '../types'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
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

type HomeNextAction = {
  eyebrow: string
  title: string
  body: string
  path: string
  actionLabel: string
  meta?: string
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
    detailClassName: 'text-ink/66 dark:text-dark-text/70',
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
    detailClassName: 'text-ink/70 dark:text-dark-text/72',
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
  resumeReading: string
  resumeStudyBody: string
  resumeReadingBody: string
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
    resumeReading: 'Resume Reading',
    resumeStudyBody: 'Return to the last passage you were studying so the context stays intact.',
    resumeReadingBody: 'Open the passage you were already working through.',
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
    nitnemHeroTitle: 'Move through Nitnem one bani at a time.',
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
    resumeReading: 'ਪੜ੍ਹਨਾ ਜਾਰੀ ਰੱਖੋ',
    resumeStudyBody: 'ਜਿੱਥੇ ਤੁਸੀਂ ਅਖੀਰ ਵਾਰ ਅਰਥ ਨਾਲ ਪੜ੍ਹ ਰਹੇ ਸੀ, ਓਥੇ ਹੀ ਵਾਪਸ ਜਾਓ ਤਾਂ ਜੋ ਸੰਦਰਭ ਬਣਾ ਰਹੇ।',
    resumeReadingBody: 'ਉਹੀ ਪੰਕਤੀ ਖੋਲ੍ਹੋ ਜਿਸ ਤੇ ਤੁਸੀਂ ਪਹਿਲਾਂ ਕੰਮ ਕਰ ਰਹੇ ਸੀ।',
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
    nitnemHeroTitle: 'ਨਿਤਨੇਮ ਨੂੰ ਇੱਕ ਵਾਰ ਵਿੱਚ ਇੱਕ ਬਾਣੀ ਨਾਲ ਨੇੜੇ ਰੱਖੋ।',
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
    resumeReading: 'पढ़ना जारी रखें',
    resumeStudyBody: 'जिस अंश को आप अर्थ के साथ पढ़ रहे थे, वहीं लौटें ताकि संदर्भ बना रहे।',
    resumeReadingBody: 'वही अंश खोलें जिस पर आप पहले काम कर रहे थे।',
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
    nitnemHeroTitle: 'नितनेम को एक समय में एक बानी के साथ पास रखें।',
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
  const currentSession = useProgressStore(state => state.currentSession)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const locale = useLocaleStore(s => s.locale)
  const {
    selectedIds,
    markComplete,
    unmarkComplete,
    isComplete,
    toggleSelected,
    resetSelections,
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
  const [nitnemOpen, setNitnemOpen] = useState(false)
  const [activeNitnemIndex, setActiveNitnemIndex] = useState(0)
  const [confirmingNitnemReset, setConfirmingNitnemReset] = useState(false)
  const nitnemCarouselRef = useRef<HTMLDivElement | null>(null)
  const readTodayRef = useRef<HTMLElement | null>(null)
  const nitnemResetConfirmRef = useRef<number | null>(null)
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const now = useCurrentTime()
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
    return () => {
      if (nitnemResetConfirmRef.current !== null) {
        window.clearTimeout(nitnemResetConfirmRef.current)
      }
    }
  }, [])

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
      .sort(compareNitnemOptions)
  }, [selectedIds])
  const availableNitnemOptions = useMemo(() => {
    return [...NITNEM_ROUTE_OPTIONS].sort(compareNitnemOptions)
  }, [])
  const nitnemDone = selectedNitnemOptions.filter(option => isComplete(option.id)).length
  const nitnemRemainingCount = Math.max(0, selectedNitnemOptions.length - nitnemDone)
  const nitnemProgressPct = selectedNitnemOptions.length > 0
    ? (nitnemDone / selectedNitnemOptions.length) * 100
    : 0
  const safeActiveNitnemIndex = selectedNitnemOptions.length > 0
    ? Math.min(activeNitnemIndex, selectedNitnemOptions.length - 1)
    : 0
  const savedLearnItems = useMemo(
    () => (learnCatalog ? getLearnHomeSavedItems(learnCatalog, learnStateSnapshot.savedItemIds) : []),
    [learnCatalog, learnStateSnapshot.savedItemIds]
  )
  const savedBookmarks = bookmarks.length
  const savedFavorites = favorites.length
  const savedReviewItems = vocab.length
  const isDarkTheme = useThemeStore(s => s.dark)
  const toggleTheme = useThemeStore(s => s.toggle)
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
  const hukamnamaMeaningPreview = useMemo(() => {
    if (!hukamnama || meaningLanguage === 'none') return ''
    if (hukamnamaPreviewLine) {
      return getLineMeaningText(hukamnamaPreviewLine, meaningLanguage, englishSource)
    }
    return getEntryMeaningText(hukamnama.entry, meaningLanguage, englishSource)
  }, [englishSource, hukamnama, hukamnamaPreviewLine, meaningLanguage])
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
  const nextBestAction = useMemo<HomeNextAction | null>(() => {
    if (currentSession?.resumePath) {
      return {
        eyebrow: homeMessages.resumeReading,
        title: homeMessages.resumeReading,
        body: homeMessages.resumeReadingBody,
        path: currentSession.resumePath,
        actionLabel: homeMessages.resumeReading,
      }
    }

    if (savedReviewItems > 0) {
      return {
        eyebrow: libraryCopy.reviewBank,
        title: libraryCopy.reviewBank,
        body: homeMessages.reviewDue(savedReviewItems),
        path: '/vocab',
        actionLabel: homeCopy.doReviewStep,
      }
    }

    const savedRevisit = savedPreviewItems.find(item => item.kind !== 'vocab')
    if (savedRevisit) {
      return {
        eyebrow: homeCopy.savedEyebrow,
        title: savedRevisit.title,
        body: savedRevisit.detail,
        path: savedRevisit.path,
        actionLabel: homeCopy.openSaved,
        meta: savedRevisit.meta,
      }
    }

    if (todayGuidance && todayGuidancePath) {
      return {
        eyebrow: homeMessages.todayInLearn,
        title: todayGuidance.title,
        body: todayGuidance.summary,
        path: todayGuidancePath,
        actionLabel: homeMessages.openTodaysGuidance,
        meta: todayGuidance.rotation.theme,
      }
    }

    return null
  }, [
    currentSession?.resumePath,
    homeCopy.doReviewStep,
    homeCopy.openSaved,
    homeCopy.savedEyebrow,
    homeMessages.openTodaysGuidance,
    homeMessages.resumeReading,
    homeMessages.resumeReadingBody,
    homeMessages.reviewDue,
    homeMessages.todayInLearn,
    libraryCopy.reviewBank,
    savedPreviewItems,
    savedReviewItems,
    todayGuidance,
    todayGuidancePath,
  ])
  const showNextBestAction = nextBestAction ? nextBestAction.path !== todayGuidancePath : false
  const visibleNextBestAction = showNextBestAction ? nextBestAction : null

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
  useEffect(() => {
    const container = nitnemCarouselRef.current
    if (!container) return

    const slide = container.children.item(safeActiveNitnemIndex)
    if (slide instanceof HTMLElement && typeof slide.scrollIntoView === 'function') {
      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [safeActiveNitnemIndex])

  const handleNitnemCustomizeToggle = () => {
    setNitnemOpen(open => {
      const nextOpen = !open

      if (!nextOpen) {
        if (nitnemResetConfirmRef.current !== null) {
          window.clearTimeout(nitnemResetConfirmRef.current)
          nitnemResetConfirmRef.current = null
        }
        setConfirmingNitnemReset(false)
      }

      return nextOpen
    })
  }

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

  return (
    <div className="page-shell animate-fade-in" data-testid="page-home" data-page="home" data-ai-surface="home" data-ai-state="ready">
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
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            className="icon-surface interactive-focus touch-target h-12 w-12 text-ink dark:text-dark-text"
            data-testid="home-theme-toggle"
          >
            {isDarkTheme ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <StreakBadge streak={streak} />
        </div>
      </div>

      <div className="mb-4">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light">
          {formatUiDate(locale)}
        </p>
        <h1 className="font-display text-[1.8rem] leading-none text-ink dark:text-dark-text mt-2">
          <span className="block">{copy.home.greetingPrimary}</span>
          <span className="mt-2 block font-sans text-[0.85rem] font-medium uppercase tracking-[0.18em] text-gold dark:text-gold-light">
            {copy.home.greetingSecondary}
          </span>
        </h1>
      </div>

      {visibleNextBestAction ? (
        <section className="section-shell p-5 mb-5 animate-slide-up stagger-1" data-testid="home-next-best-action">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">{visibleNextBestAction.eyebrow}</p>
              <h2 className="mt-2 font-display text-[1.9rem] leading-[1.02] text-ink dark:text-dark-text">
                {visibleNextBestAction.title}
              </h2>
              {visibleNextBestAction.meta ? <span className="chip-pill mt-3 inline-flex">{visibleNextBestAction.meta}</span> : null}
              <p className="mt-3 max-w-[36ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
                {visibleNextBestAction.body}
              </p>
            </div>
            <Link
              to={visibleNextBestAction.path}
              className="interactive-focus interactive-pill-link shrink-0 gap-2 self-start font-sans text-sm font-semibold text-gold dark:text-gold-light"
              data-testid="home-next-best-action-link"
            >
              <span>{visibleNextBestAction.actionLabel}</span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        </section>
      ) : null}

      <section
        className="hero-surface ornate-top p-6 mb-5 animate-slide-up stagger-1"
        aria-labelledby="home-hero-title"
        data-testid="home-hero"
      >
        <h2 id="home-hero-title" className="sr-only">NaamRas Learn</h2>
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="eyebrow">{editorial?.learn.eyebrow ?? 'NaamRas Learn'}</span>
          <span className="chip-pill">{learningLevelLabels[learningLevel]}</span>
        </div>
        <div className="grid gap-4">
          {hukamnamaLoading ? (
            <div className="section-shell-quiet p-5 animate-pulse" data-testid="home-hukamnama-card">
              <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-28 mb-3" />
              <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-40" />
              <div className="mt-4 h-12 rounded bg-sand/20 dark:bg-dark-text/10" />
              <div className="mt-3 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
              <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
            </div>
          ) : hukamnama ? (
            <div
              className="section-shell-quiet p-5"
              data-testid="home-hukamnama-card"
              data-ai-surface="home-hukamnama"
              data-ai-state="ready"
            >
              <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
              <p className="font-sans text-[11px] text-ink/65 dark:text-dark-text/65 mb-2">
                {hukamnama.entry.raag ? `${hukamnama.entry.raag} · ` : ''}
                {hukamnama.entry.scripture} · Ang {hukamnama.ang}
              </p>
              <p
                lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'}
                className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} mt-4 text-[2.2rem] leading-[1.15] text-ink dark:text-dark-text line-clamp-3`}
              >
                {renderScriptText(hukamnamaPreviewLine?.gurmukhi ?? hukamnama.entry.gurmukhi, scriptMode)}
              </p>
              {hukamnamaMeaningPreview && (
                <p className={`mt-4 text-sm leading-6 text-ink/70 dark:text-dark-text/70 line-clamp-3 ${meaningLanguage === 'pa' ? 'font-gurmukhi' : 'font-sans'}`}>
                  {hukamnamaMeaningPreview}
                </p>
              )}
              <Link
                to={`/study?hukamnamaDate=${hukamnama.date}`}
                className="interactive-focus interactive-pill-link mt-5 min-h-[50px] rounded-full bg-gradient-to-r from-saffron to-saffron-light px-5 text-white font-sans text-sm font-semibold active:scale-95 transition-transform duration-150"
                data-testid="home-hero-primary-action"
                data-ai-action="open-hukamnama"
              >
                Open Today&apos;s Hukamnama
              </Link>
            </div>
          ) : (
            <div
              className="section-shell-quiet p-5"
              data-testid="home-hukamnama-error"
              data-ai-surface="home-hukamnama"
              data-ai-state="degraded"
              data-ai-error="study-hukamnama"
            >
              <p className="eyebrow mb-2">{homeCopy.todaysHukamnama}</p>
              <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65">
                Couldn&apos;t load today&apos;s hukamnama right now. You can still continue into Read.
              </p>
              <Link
                to="/banis"
                className="interactive-focus interactive-pill-link mt-4 min-h-[46px] rounded-full border border-sand/15 bg-parchment-card/82 px-4 text-ink font-sans text-sm font-medium dark:border-dark-text/10 dark:bg-dark-card/70 dark:text-dark-text"
                data-ai-action="browse-read"
              >
                Browse Read
              </Link>
            </div>
          )}

          <div
            className="section-shell-quiet p-5"
            data-testid="home-guidance-hero"
            data-ai-surface="home-guidance"
            data-ai-state={learnCatalogLoading ? 'loading' : learnCatalogError ? 'degraded' : todayGuidance && todayGuidancePath ? 'ready' : 'empty'}
            data-ai-error={learnCatalogError ? 'learn-catalog' : undefined}
          >
            {learnCatalogLoading ? (
              <div className="animate-pulse" data-testid="home-guidance-skeleton">
                <div className="h-3 rounded bg-sand/20 dark:bg-dark-text/10 w-28" />
                <div className="mt-4 h-10 rounded bg-sand/20 dark:bg-dark-text/10" />
                <div className="mt-3 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-4/5" />
                <div className="mt-2 h-4 rounded bg-sand/20 dark:bg-dark-text/10 w-3/5" />
              </div>
            ) : todayGuidance && todayGuidancePath ? (
              <>
                <p className="eyebrow">Today&apos;s Guidance</p>
                <h3 className="mt-3 font-display text-[2rem] leading-[0.98] text-ink dark:text-dark-text max-w-[18ch]">
                  {todayGuidance.title}
                </h3>
                <p className="mt-4 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
                  {todayGuidance.summary || editorial?.learn.compactGuidanceBody || 'Open today’s Learn doorway and move into the exact guide chosen for the day.'}
                </p>
                <Link
                  to={todayGuidancePath}
                  className="interactive-focus interactive-pill-link mt-4 min-h-[42px] gap-2 font-sans text-sm font-semibold text-gold dark:text-gold-light"
                  data-testid="home-hero-guidance-action"
                  data-ai-action="open-todays-guidance"
                >
                  <span>Open Today&apos;s Guidance</span>
                  <IconArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className="eyebrow">Today&apos;s Guidance</p>
                <h3 className="mt-3 font-display text-[2rem] leading-[0.98] text-ink dark:text-dark-text max-w-[18ch]">
                  {learnCatalogError ? 'Today’s Learn guidance could not be loaded.' : 'Today’s guidance is preparing the next doorway.'}
                </h3>
                <p className="mt-4 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
                  {learnCatalogError
                    ? 'Home is staying grounded in the hukamnama-led path until the Learn archive is available again.'
                    : editorial?.learn.compactGuidanceBody || 'A short doorway into the day, anchored in a real line and written for return rather than skimming.'}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section
        className="surface-spotlight mb-5 px-5 py-6 animate-slide-up stagger-3 dark:border-dark-text/10"
        aria-labelledby="home-nitnem-title"
        data-testid="home-nitnem-spotlight"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p
            id="home-nitnem-title"
            className="font-sans text-[11px] uppercase tracking-[0.24em] text-gold dark:text-gold-light"
          >
            {homeMessages.dailyNitnem}
          </p>
          <span className="shrink-0 rounded-full border border-sand/16 bg-parchment-card/78 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/62 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/62">
            {selectedNitnemOptions.length > 0
              ? nitnemRemainingCount > 0
                ? homeMessages.nitnemRemaining(nitnemRemainingCount)
                : homeMessages.nitnemCompleteToday
              : homeMessages.customizeNitnem}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-end">
          <h2 className="max-w-[12ch] font-display text-[2rem] leading-[0.92] tracking-[-0.02em] text-ink dark:text-dark-text sm:max-w-[14ch] sm:text-[2.15rem] md:max-w-none">
            {homeMessages.nitnemHeroTitle}
          </h2>
          <p className="max-w-[34ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70 md:justify-self-end">
            {homeMessages.nitnemHeroBody}
          </p>
        </div>

        <div className="mt-5">
          <div className="h-px overflow-hidden bg-[rgba(105,75,31,0.16)] dark:bg-[rgba(255,248,225,0.14)]">
            <div
              className="h-full bg-[linear-gradient(90deg,rgba(158,111,41,0.9),rgba(232,196,104,0.7))] transition-all duration-500"
              style={{ width: `${nitnemProgressPct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/52 dark:text-dark-text/56">
              {selectedNitnemOptions.length > 0
                ? `${nitnemDone} / ${selectedNitnemOptions.length} ${homeCopy.dailyBanisComplete}`
                : homeMessages.chooseNitnemBody}
            </p>
            {selectedNitnemOptions.length > 0 ? (
              <p className="font-sans text-[11px] uppercase tracking-[0.12em] text-ink/46 dark:text-dark-text/50">
                {homeMessages.nitnemCarouselLabel(safeActiveNitnemIndex + 1, selectedNitnemOptions.length)}
              </p>
            ) : null}
          </div>
        </div>

        {selectedNitnemOptions.length > 0 ? (
          <>
            <div
              ref={nitnemCarouselRef}
              className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]"
              data-testid="home-nitnem-carousel"
              onScroll={(event) => {
                const { clientWidth, scrollLeft } = event.currentTarget
                if (clientWidth < 1) return
                const nextIndex = Math.max(
                  0,
                  Math.min(selectedNitnemOptions.length - 1, Math.round(scrollLeft / clientWidth))
                )
                if (nextIndex !== safeActiveNitnemIndex) {
                  setActiveNitnemIndex(nextIndex)
                }
              }}
            >
              {selectedNitnemOptions.map((option, index) => {
                const done = isComplete(option.id)
                const isActive = index === safeActiveNitnemIndex

                return (
                  <article
                    key={option.id}
                    className={`relative min-w-full snap-center overflow-hidden rounded-[30px] border px-5 py-5 transition-all duration-300 ${
                      isActive
                        ? 'border-gold/22 bg-[linear-gradient(180deg,rgba(255,254,250,0.97),rgba(248,241,230,0.9))] shadow-[0_18px_34px_rgba(77,53,19,0.08)] dark:border-gold/20 dark:bg-[linear-gradient(180deg,rgba(35,28,46,0.98),rgba(24,19,34,0.94))]'
                        : 'border-sand/12 bg-[rgba(255,249,238,0.86)] opacity-92 dark:border-dark-text/8 dark:bg-[rgba(28,22,37,0.8)]'
                    }`}
                    aria-label={homeMessages.nitnemCarouselLabel(index + 1, selectedNitnemOptions.length)}
                    data-testid={isActive ? 'home-nitnem-active-card' : undefined}
                  >
                    <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_center,rgba(232,196,104,0.18),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(232,196,104,0.12),transparent_72%)]" />
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(158,111,41,0.58),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(232,196,104,0.42),transparent)]" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-gold dark:text-gold-light">
                            Today&apos;s Bani
                          </p>
                          <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.2em] text-ink/42 dark:text-dark-text/52">
                            {option.group}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-sand/16 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-ink/52 dark:border-dark-text/10 dark:text-dark-text/58">
                          {index + 1}/{selectedNitnemOptions.length}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start">
                        <div className="min-w-0">
                          <p lang="pa-Guru" className="font-gurmukhi text-[2.05rem] leading-[1.04] text-ink dark:text-dark-text sm:text-[2.2rem]">
                            {option.gurmukhiTitle}
                          </p>
                          <p className="mt-3 font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/72 dark:text-dark-text/76">
                            {option.romanizedTitle}
                          </p>
                        </div>

                        <div className="rounded-[20px] border border-sand/14 bg-parchment-card/62 px-4 py-4 dark:border-dark-text/10 dark:bg-white/5">
                          <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-gold dark:text-gold-light">
                            Ritual Note
                          </p>
                          <p className="mt-2 font-sans text-sm leading-6 text-ink/64 dark:text-dark-text/68">
                            {getNitnemOptionDetail(option)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-sand/12 pt-3 dark:border-dark-text/10">
                        <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/42 dark:text-dark-text/50">
                          Swipe through the full order
                        </p>
                        <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(105,75,31,0.18),transparent)] dark:bg-[linear-gradient(90deg,rgba(255,248,225,0.16),transparent)]" />
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Link
                          to={buildNitnemStudyPath(option)}
                          className="interactive-focus interactive-pill-link min-h-[50px] flex-1 rounded-full bg-ink px-5 font-sans text-sm font-semibold text-parchment dark:bg-parchment dark:text-dark-bg"
                          data-testid={index === safeActiveNitnemIndex ? 'home-nitnem-primary-action' : undefined}
                        >
                          {nitnemDone > 0 ? homeMessages.continueNitnem : homeMessages.beginNitnem}
                        </Link>
                        <button
                          type="button"
                          onClick={() => done ? unmarkComplete(option.id) : markComplete(option.id)}
                          className={`min-h-[50px] rounded-full border px-5 font-sans text-sm font-medium transition-colors duration-300 ${
                            done
                              ? 'border-gold/18 bg-gold/10 text-gold dark:border-gold/24 dark:bg-gold/12 dark:text-gold-light'
                              : 'border-sand/16 bg-parchment-card/72 text-ink/82 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/78'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <IconCheck size={14} className={done ? '' : 'text-saffron dark:text-gold-light'} />
                            {done ? homeMessages.markNitnemIncomplete : homeMessages.completeNitnemStep}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {selectedNitnemOptions.map((option, index) => (
                <button
                  key={`${option.id}-dot`}
                  type="button"
                  onClick={() => setActiveNitnemIndex(index)}
                  aria-label={homeMessages.nitnemCarouselLabel(index + 1, selectedNitnemOptions.length)}
                  aria-pressed={index === safeActiveNitnemIndex}
                  className={`rounded-full border transition-all duration-300 ${
                    index === safeActiveNitnemIndex
                      ? 'h-2.5 w-7 border-gold/18 bg-gold/72 dark:border-gold/24 dark:bg-gold-light'
                      : 'h-2 w-2 border-sand/18 bg-sand/22 dark:border-dark-text/14 dark:bg-dark-text/14'
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-sand/18 px-5 py-6 dark:border-dark-text/10">
            <p className="font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/68">
              {homeMessages.chooseNitnemBody}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-sand/12 pt-4 dark:border-dark-text/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-gold dark:text-gold-light">
                {homeMessages.customizeNitnem}
              </p>
              <p className="mt-2 max-w-[42ch] font-sans text-sm leading-6 text-ink/62 dark:text-dark-text/68">
                {homeMessages.chooseNitnemBody}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNitnemCustomizeToggle}
              className="flex shrink-0 items-center gap-2 rounded-full border border-sand/16 bg-parchment-card/70 px-3 py-2 text-ink/72 transition-colors duration-300 dark:border-dark-text/10 dark:bg-white/5 dark:text-dark-text/74"
              aria-expanded={nitnemOpen}
              aria-controls="home-nitnem-panel"
            >
              <span className="font-sans text-xs font-semibold">
                {nitnemOpen ? homeMessages.hideNitnemCustomize : homeMessages.customizeNitnem}
              </span>
              <span className="inline-flex items-center justify-center text-gold dark:text-gold-light">
                {nitnemOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </span>
            </button>
          </div>

          {nitnemOpen ? (
            <div
              id="home-nitnem-panel"
              className="mt-4 space-y-4 rounded-[24px] border border-sand/12 bg-parchment-card/56 px-4 py-4 dark:border-dark-text/10 dark:bg-white/4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-xs text-ink/55 dark:text-dark-text/58">
                  Length choices for supported banis stay inside the reader.
                </p>
                <button
                  type="button"
                  onClick={handleNitnemReset}
                  className="font-sans text-xs text-gold dark:text-gold-light underline underline-offset-2"
                  data-testid="home-nitnem-reset"
                >
                  {confirmingNitnemReset ? 'Tap again to reset' : 'Reset'}
                </button>
              </div>

              {(['Morning', 'Evening', 'Night', 'Additional'] as const).map(group => (
                <div key={`manage-${group}`}>
                  <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-ink/48 dark:text-dark-text/52">
                    {group}
                  </p>
                  <div className="space-y-2">
                    {availableNitnemOptions
                      .filter(option => option.group === group)
                      .map(option => {
                        const selected = selectedIds.includes(option.id)

                        return (
                          <button
                            key={`manage-${option.id}`}
                            type="button"
                            onClick={() => toggleSelected(option.id)}
                            className={`w-full rounded-[22px] border px-3 py-3 text-left transition-colors duration-300 ${
                              selected
                                ? 'border-gold/24 bg-[linear-gradient(180deg,rgba(250,241,222,0.9),rgba(246,235,214,0.82))] text-ink dark:border-gold/26 dark:bg-[linear-gradient(180deg,rgba(54,41,63,0.96),rgba(38,29,47,0.92))] dark:text-dark-text'
                                : 'border-sand/15 bg-parchment-card/72 text-ink dark:border-dark-text/10 dark:bg-dark-card/72 dark:text-dark-text'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p lang="pa-Guru" className="font-gurmukhi text-lg leading-relaxed">
                                  {option.gurmukhiTitle}
                                </p>
                                <p className={`mt-1 font-sans text-xs font-semibold ${selected ? 'text-ink/76 dark:text-dark-text/78' : 'text-ink/72 dark:text-dark-text/76'}`}>
                                  {option.romanizedTitle}
                                </p>
                                <p className={`mt-1 font-sans text-xs ${selected ? 'text-ink/58 dark:text-dark-text/62' : 'text-ink/55 dark:text-dark-text/55'}`}>
                                  {getNitnemOptionDetail(option)}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] ${
                                selected
                                  ? 'bg-ink/6 text-ink dark:bg-white/10 dark:text-dark-text'
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
          ) : null}
        </div>
      </section>

      <section
        ref={readTodayRef}
        tabIndex={-1}
        className="section-shell p-5 mb-5 animate-slide-up stagger-4 transition-[box-shadow,transform,border-color] duration-500"
        aria-labelledby="home-read-today-title"
        data-testid="home-read-today"
      >
        <p id="home-read-today-title" className="eyebrow">{homeMessages.readTodayEyebrow}</p>
        <h2 className="mt-2 font-display text-[1.7rem] leading-[0.98] text-ink dark:text-dark-text">
          {homeMessages.readTodayTitle}
        </h2>
        <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/72">
          {homeMessages.readTodayBody}
        </p>
        <div className="mt-4 grid gap-4">
          <div className="section-shell-quiet p-5">
            <p className="eyebrow">{homeCopy.read}</p>
            <h3 className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">
              {devotionalReadAction.title}
            </h3>
            <p className="mt-3 max-w-[34ch] font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">
              {devotionalReadAction.body}
            </p>
            <Link
              to={devotionalReadAction.path}
              className="interactive-focus interactive-pill-link mt-5 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 font-sans text-sm font-semibold text-white"
              data-testid="home-read-today-action"
            >
              {devotionalReadAction.title}
            </Link>
          </div>

          <div className="grid gap-3">
            <div
              className="section-shell-quiet p-4"
              data-testid="home-read-today-featured-shabad"
            >
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
                      <p className="mt-2 font-sans text-sm font-semibold text-ink/70 dark:text-dark-text/74">
                        {featuredShabadSupport.summary}
                      </p>
                    </div>
                    <span className="chip-pill">{featuredShabadSupport.meta}</span>
                  </div>

                  <p className="mt-3 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/68">
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
                  <p className="mt-2 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/68">
                    {featuredShabadSupport.body}
                  </p>
                </>
              )}
            </div>

            <div
              className="section-shell-quiet p-4"
              data-testid="home-read-today-source-browser-shell"
              data-ai-surface="home-read-today-source-browser"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">{libraryCopy.sourceBrowsing}</p>
                  <p className="mt-2 max-w-[32ch] font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/68">
                    {libraryCopy.sourceBrowsingBody}
                  </p>
                </div>
                <span className="chip-pill shrink-0">{homeCopy.read}</span>
              </div>

              <div className="mt-4">
                <ScriptureSourceBrowser
                  dataTestId="home-read-today-source-browser"
                  sectionClassName="surface-primary px-4 py-4"
                />
              </div>
            </div>
          </div>
        </div>
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
          <Link
            to="/library"
            className="interactive-focus inline-flex items-center gap-1 font-sans text-sm text-gold dark:text-gold-light"
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
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'learn' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{learnStateSnapshot.savedItemIds.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.learnSaves}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'bookmark' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedBookmarks}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.bookmarks}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'favorite' ? 'saved-feedback-highlight' : ''}`}>
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{savedFavorites}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/60 dark:text-dark-text/60 mt-1">{libraryCopy.favorites}</p>
          </div>
          <div className={`section-shell-quiet px-3 py-3 transition-all duration-300 ${lastSaved?.kind === 'review' ? 'saved-feedback-highlight' : ''}`}>
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
            <div className="section-shell-quiet px-4 py-4">
              <p className="eyebrow">Saved Preview</p>
              <p className="mt-2 font-sans text-sm leading-6 text-ink/66 dark:text-dark-text/70">
                Learn saves, bookmarked passages, favorites, and review items will appear here once you start keeping pieces close.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
